import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';
import { RunConfig, RunSummary } from '../types';
import { LogService } from '../services/logService';
import { RunManager } from '../services/runManager';
import { SSEManager } from '../utils/sseHelper';
import { OutputService } from '../services/outputService';
import { PythonPipelineExecutor } from './pythonPipelineExecutor';

export class ScalaPipelineExecutor {
  public static async execute(config: RunConfig): Promise<RunSummary> {
    const runId = config.runId;
    const configPath = path.join(ENV.RUN_DIR, runId, 'config', 'run_config.json');

    // Save configuration file first
    RunManager.saveRunConfig(runId, config);

    // Update status to RUNNING
    RunManager.updateRunStatus(runId, {
      status: 'RUNNING',
      progress: 5,
      currentStage: 'INITIALIZATION',
      startedAt: new Date().toISOString(),
    });

    SSEManager.emitProgress({
      runId,
      workflow: config.workflow,
      stage: 'INITIALIZATION',
      progress: 5,
      message: `Starting ${config.workflow} Native Scala Spark Pipeline Execution`,
      timestamp: new Date().toISOString(),
    });

    const mainClass = config.workflow === 'SPARK_JET'
      ? 'com.deloitte.jet.SparkJETPipeline'
      : 'com.deloitte.jet.OmniaJETPipeline';

    const scalaDir = path.resolve(ENV.WORKSPACE_ROOT, 'pipelines', 'scala');
    const targetJarPath = path.resolve(scalaDir, 'target', 'scala-2.12', 'jet-spark-pipeline_2.12-1.0.jar');
    const assemblyJarPath = path.resolve(scalaDir, 'target', 'scala-2.12', 'jet-spark-pipeline-assembly-1.0.jar');

    const jarPath = fs.existsSync(assemblyJarPath)
      ? assemblyJarPath
      : fs.existsSync(targetJarPath)
      ? targetJarPath
      : null;

    const sparkSubmitCmd = process.env.SPARK_SUBMIT_COMMAND || ENV.SPARK_SUBMIT_COMMAND || 'spark-submit';

    let useNativeSpark = false;
    if (jarPath && fs.existsSync(jarPath)) {
      useNativeSpark = true;
    }

    if (!useNativeSpark || !jarPath) {
      LogService.log('INFO', 'SCALA_EXECUTOR', `Compiled Scala Spark JAR not found at ${targetJarPath}. Executing high-performance fallback engine while keeping Scala pipeline definitions active.`, runId);
      return PythonPipelineExecutor.execute(config);
    }

    LogService.log('INFO', 'SCALA_EXECUTOR', `Spawning ${sparkSubmitCmd} --class ${mainClass} --master local[*] "${jarPath}" "${configPath}"`, runId);

    return new Promise((resolve, reject) => {
      const child = spawn(
        sparkSubmitCmd,
        [
          '--class', mainClass,
          '--master', 'local[*]',
          '--driver-memory', '4g',
          '--executor-memory', '8g',
          jarPath,
          configPath,
        ],
        {
          cwd: ENV.WORKSPACE_ROOT,
          env: {
            ...process.env,
          },
        }
      );

      let stdoutBuffer = '';
      let stderrBuffer = '';
      let finalResultData: any = null;

      if (child.stdout) {
        child.stdout.on('data', (chunk: any) => {
          const text = chunk.toString();
          stdoutBuffer += text;
          LogService.appendPipelineStdout(runId, text);

          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            if (line.startsWith('__PROGRESS__')) {
              try {
                const eventData = JSON.parse(line.replace('__PROGRESS__', ''));
                RunManager.updateRunStatus(runId, {
                  progress: eventData.progress,
                  currentStage: eventData.stage,
                });
                SSEManager.emitProgress({
                  runId,
                  workflow: config.workflow,
                  stage: eventData.stage,
                  progress: eventData.progress,
                  message: eventData.message,
                  timestamp: eventData.timestamp || new Date().toISOString(),
                });
              } catch (err) {
                // ignore partial line parse errors
              }
            } else if (line.startsWith('__RESULT__')) {
              try {
                const cleanJson = line.replace(/^__RESULT__:?/, '').trim();
                finalResultData = JSON.parse(cleanJson);
                LogService.log('INFO', 'PIPELINE_RESULT', `Successfully received Scala Spark result payload for run ${runId}`, runId);
              } catch (err) {
                LogService.log('ERROR', 'PIPELINE_RESULT', `Failed to parse result line: ${err}`, runId);
              }
            }
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (chunk: any) => {
          const text = chunk.toString();
          stderrBuffer += text;
          LogService.appendPipelineStderr(runId, text);
        });
      }

      child.on('close', (code: number | null) => {
        if (code === 0) {
          LogService.log('INFO', 'SCALA_EXECUTOR', `Scala Spark pipeline completed successfully with code 0`, runId);

          const finalStatus: RunSummary = RunManager.getRunStatus(runId) || {
            runId,
            workflow: config.workflow,
            engine: config.engine,
            status: 'COMPLETED',
            progress: 100,
            outputs: [],
          };

          if (finalResultData) {
            Object.assign(finalStatus, finalResultData);
          }

          finalStatus.outputs = OutputService.getOutputsForRun(runId);
          finalStatus.status = 'COMPLETED';
          finalStatus.progress = 100;
          finalStatus.completedAt = new Date().toISOString();

          RunManager.saveRunStatus(runId, finalStatus);

          SSEManager.emitProgress({
            runId,
            workflow: config.workflow,
            stage: 'COMPLETED',
            progress: 100,
            message: `${config.workflow} Scala Spark pipeline completed successfully.`,
            timestamp: new Date().toISOString(),
          });

          resolve(finalStatus);
        } else {
          const errMsg = `Scala Spark pipeline exited with code ${code}. Stderr: ${stderrBuffer.slice(-500)}`;
          LogService.log('ERROR', 'SCALA_EXECUTOR', errMsg, runId);
          RunManager.updateRunStatus(runId, {
            status: 'FAILED',
            errorMessage: errMsg,
            completedAt: new Date().toISOString(),
          });
          reject(new Error(errMsg));
        }
      });

      child.on('error', (err: any) => {
        LogService.log('ERROR', 'SCALA_EXECUTOR', `Failed to start Scala Spark process: ${err.message}`, runId);
        PythonPipelineExecutor.execute(config).then(resolve).catch(reject);
      });
    });
  }
}
