import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';
import { RunConfig, RunSummary } from '../types';
import { LogService } from '../services/logService';
import { RunManager } from '../services/runManager';
import { SSEManager } from '../utils/sseHelper';
import { OutputService } from '../services/outputService';

export class PythonPipelineExecutor {
  public static async execute(config: RunConfig): Promise<RunSummary> {
    const runId = config.runId;
    const configPath = path.join(ENV.RUN_DIR, runId, 'config', 'run_config.json');

    // Save configuration file first
    RunManager.saveRunConfig(runId, config);

    // Update status to RUNNING
    RunManager.updateRunStatus(runId, {
      status: 'RUNNING',
      progress: 5,
      currentStage: 'STARTING_PIPELINE',
      startedAt: new Date().toISOString(),
    });

    SSEManager.emitProgress({
      runId,
      workflow: config.workflow,
      stage: 'STARTING_PIPELINE',
      progress: 5,
      message: `Starting ${config.workflow} Python pipeline execution`,
      timestamp: new Date().toISOString(),
    });

    let scriptName = 'spark_jet_pipeline.py';
    if (config.workflow === 'OMNIA_JET') {
      scriptName = 'omnia_jet_pipeline.py';
    } else if (config.workflow === 'SPARK_JET') {
      scriptName = 'spark_jet_pipeline.py';
    } else {
      // Unified JET workflow: auto-detect based on file extensions/sheets
      const hasExcel = config.files.some(f => f.extension === 'xlsx' || f.extension === 'xls' || (f.sheets && f.sheets.length > 0));
      scriptName = hasExcel ? 'omnia_jet_pipeline.py' : 'spark_jet_pipeline.py';
    }
    const scriptPath = path.resolve(ENV.WORKSPACE_ROOT, 'pipelines', 'pyspark', scriptName);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Pipeline script not found: ${scriptPath}`);
    }

    const pythonCmd = ENV.PYSPARK_COMMAND;
    LogService.log('INFO', 'PIPELINE_EXECUTOR', `Spawning ${pythonCmd} "${scriptPath}" --config "${configPath}"`, runId);

    return new Promise((resolve, reject) => {
      const child = spawn(pythonCmd, [scriptPath, '--config', configPath], {
        cwd: ENV.WORKSPACE_ROOT,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8',
        },
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';
      let finalResultData: any = null;

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdoutBuffer += text;
        LogService.appendPipelineStdout(runId, text);

        // Process line by line for progress signals
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
              // ignore parse errors on partial lines
            }
          } else if (line.startsWith('__RESULT__')) {
            try {
              const cleanJson = line.replace(/^__RESULT__:?/, '').trim();
              finalResultData = JSON.parse(cleanJson);
              LogService.log('INFO', 'PIPELINE_RESULT', `Successfully received result payload for run ${runId}`, runId);
            } catch (err) {
              LogService.log('ERROR', 'PIPELINE_RESULT', `Failed to parse result line: ${err}`, runId);
            }
          }
        }
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrBuffer += text;
        LogService.appendPipelineStderr(runId, text);
      });

      child.on('error', (err) => {
        LogService.log('ERROR', 'PIPELINE_EXECUTOR', `Failed to start Python process: ${err.message}`, runId);
        RunManager.updateRunStatus(runId, {
          status: 'FAILED',
          errorMessage: `Pipeline spawn error: ${err.message}`,
        });
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          LogService.log('INFO', 'PIPELINE_EXECUTOR', `Pipeline completed successfully with code 0`, runId);

          const finalStatus = RunManager.getRunStatus(runId) || {
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
            message: `Pipeline run ${runId} completed successfully`,
            timestamp: new Date().toISOString(),
          });

          resolve(finalStatus);
        } else {
          const errMsg = `Pipeline execution failed with exit code ${code}. Error: ${stderrBuffer.slice(-500)}`;
          LogService.log('ERROR', 'PIPELINE_EXECUTOR', errMsg, runId);

          const failedStatus = RunManager.updateRunStatus(runId, {
            status: 'FAILED',
            errorMessage: errMsg,
            completedAt: new Date().toISOString(),
          });

          SSEManager.emitProgress({
            runId,
            workflow: config.workflow,
            stage: 'FAILED',
            progress: 100,
            message: errMsg,
            timestamp: new Date().toISOString(),
          });

          reject(new Error(errMsg));
        }
      });
    });
  }
}
