import { spawn } from 'child_process';
import path from 'path';
import { ENV } from '../config/env';
import { RunConfig, RunSummary } from '../types';
import { LogService } from '../services/logService';
import { RunManager } from '../services/runManager';
import { SSEManager } from '../utils/sseHelper';

export class ScalaPipelineExecutor {
  public static async execute(config: RunConfig): Promise<RunSummary> {
    const runId = config.runId;
    const configPath = path.join(ENV.RUN_DIR, runId, 'config', 'run_config.json');

    RunManager.saveRunConfig(runId, config);
    RunManager.updateRunStatus(runId, {
      status: 'RUNNING',
      progress: 5,
      currentStage: 'SUBMITTING_SPARK_JOB',
      startedAt: new Date().toISOString(),
    });

    SSEManager.emitProgress({
      runId,
      workflow: config.workflow,
      stage: 'SUBMITTING_SPARK_JOB',
      progress: 5,
      message: `Submitting Scala Spark job via ${ENV.SPARK_SUBMIT_COMMAND}`,
      timestamp: new Date().toISOString(),
    });

    const jarPath = ENV.SCALA_SPARK_JAR;
    const mainClass = config.workflow === 'SPARK_JET' ? 'com.deloitte.jet.SparkJETPipeline' : 'com.deloitte.jet.OmniaJETPipeline';

    LogService.log('INFO', 'SCALA_EXECUTOR', `Submitting spark-submit --class ${mainClass} "${jarPath}" "${configPath}"`, runId);

    return new Promise((resolve, reject) => {
      const child = spawn(ENV.SPARK_SUBMIT_COMMAND, ['--class', mainClass, jarPath, configPath], {
        cwd: ENV.WORKSPACE_ROOT,
        shell: true,
      });

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        LogService.appendPipelineStdout(runId, text);
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        LogService.appendPipelineStderr(runId, text);
      });

      child.on('error', (err) => {
        LogService.log('ERROR', 'SCALA_EXECUTOR', `Spark submit error: ${err.message}`, runId);
        RunManager.updateRunStatus(runId, {
          status: 'FAILED',
          errorMessage: err.message,
        });
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          const status = RunManager.getRunStatus(runId)!;
          status.status = 'COMPLETED';
          status.progress = 100;
          RunManager.saveRunStatus(runId, status);
          resolve(status);
        } else {
          const errMsg = `Scala Spark pipeline exited with code ${code}`;
          RunManager.updateRunStatus(runId, { status: 'FAILED', errorMessage: errMsg });
          reject(new Error(errMsg));
        }
      });
    });
  }
}
