import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';
import { LogService } from './logService';
import { RunManager } from './runManager';

export interface AutoCleanResult {
  tbRowsCleaned: number;
  glRowsCleaned: number;
  coaRowsCleaned: number;
  datesStandardized: number;
  numbersConverted: number;
  constraintsPassed: boolean;
  constraintResults: Array<{
    id: string;
    dataset: string;
    name: string;
    status: 'PASSED' | 'FAILED';
    severity: 'Required' | 'Warning';
    failedRowsCount: number;
    fileName?: string;
    details: string;
  }>;
  warnings: string[];
  status: string;
}

export class AutoCleanService {
  /**
   * High-Performance Polars SIMD Vector Validation Kernel.
   * Validates multi-million row datasets in milliseconds and writes Parquet cache.
   */
  public static async runAutoClean(runId: string): Promise<AutoCleanResult | null> {
    const config = RunManager.getRunConfig(runId);
    if (!config) return null;

    const configPath = path.join(ENV.RUN_DIR, runId, 'config', 'run_config.json');
    RunManager.saveRunConfig(runId, config);

    const scriptPath = path.resolve(ENV.WORKSPACE_ROOT, 'pipeline', 'auto_clean_engine.py');
    if (!fs.existsSync(scriptPath)) {
      LogService.log('WARN', 'AUTO_CLEAN', `auto_clean_engine.py not found at ${scriptPath}`, runId);
      return null;
    }

    const pythonCmd = ENV.PYSPARK_COMMAND || 'python';
    LogService.log('INFO', 'AUTO_CLEAN', `Spawning multi-threaded Polars validator: ${pythonCmd} "${scriptPath}"`, runId);

    return new Promise((resolve) => {
      let stdoutData = '';
      let stderrData = '';

      const child = spawn(pythonCmd, [scriptPath, '--run-id', runId, '--config', configPath], {
        cwd: ENV.WORKSPACE_ROOT,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          POLARS_MAX_THREADS: '8',
        },
      });

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const startMarker = '___AUTO_CLEAN_RESULT_JSON_START___';
            const endMarker = '___AUTO_CLEAN_RESULT_JSON_END___';
            const sIdx = stdoutData.indexOf(startMarker);
            const eIdx = stdoutData.indexOf(endMarker);

            if (sIdx >= 0 && eIdx > sIdx) {
              const jsonStr = stdoutData.substring(sIdx + startMarker.length, eIdx).trim();
              const result = JSON.parse(jsonStr) as AutoCleanResult;
              LogService.log('INFO', 'AUTO_CLEAN', `Polars validation completed: ${result.constraintsPassed ? 'ALL PASSED' : 'CONSTRAINTS FAILED'} (TB: ${result.tbRowsCleaned}, GL: ${result.glRowsCleaned})`, runId);
              return resolve(result);
            }
          } catch (err: any) {
            LogService.log('ERROR', 'AUTO_CLEAN', `Error parsing Polars output: ${err.message}`, runId);
          }
        } else {
          LogService.log('WARN', 'AUTO_CLEAN', `Polars engine exited with code ${code}: ${stderrData}`, runId);
        }
        resolve(null);
      });

      child.on('error', (err) => {
        LogService.log('WARN', 'AUTO_CLEAN', `Failed to spawn Python auto clean engine: ${err.message}`, runId);
        resolve(null);
      });
    });
  }
}
