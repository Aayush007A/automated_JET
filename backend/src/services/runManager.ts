import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';
import { RunConfig, RunStatus, RunSummary, WorkflowType, PipelineEngine } from '../types';
import { LogService } from './logService';
import { FieldMapper } from './fieldMapper';

export class RunManager {
  public static generateRunId(): string {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const yyyymmdd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    
    // Check existing runs for today to increment counter
    let counter = 1;
    if (fs.existsSync(ENV.RUN_DIR)) {
      const dirs = fs.readdirSync(ENV.RUN_DIR);
      const prefix = `JET-${yyyymmdd}-`;
      const matching = dirs.filter((name) => name.startsWith(prefix));
      if (matching.length > 0) {
        const indices = matching.map((m) => {
          const numPart = m.replace(prefix, '');
          return parseInt(numPart, 10) || 0;
        });
        counter = Math.max(...indices) + 1;
      }
    }

    const padCounter = counter < 10 ? `00${counter}` : counter < 100 ? `0${counter}` : `${counter}`;
    return `JET-${yyyymmdd}-${padCounter}`;
  }

  public static initializeRun(
    workflow: WorkflowType,
    userId: string,
    userName: string,
    engine: PipelineEngine = 'PYTHON'
  ): { runId: string; config: RunConfig } {
    const runId = this.generateRunId();
    const runDir = path.join(ENV.RUN_DIR, runId);

    // Create subdirectories
    ['input', 'config', 'output', 'logs', 'temp'].forEach((sub) => {
      fs.mkdirSync(path.join(runDir, sub), { recursive: true });
    });

    const now = new Date().toISOString();
    
    // Pre-initialize clean field mappings matching workflow
    const fieldMappings: RunConfig['fieldMappings'] = {
      tb: FieldMapper.mapFields([], 'TRIAL_BALANCE', workflow),
      gl: FieldMapper.mapFields([], 'GENERAL_LEDGER', workflow),
    };
    if (workflow === 'OMNIA_JET') {
      fieldMappings.coa = FieldMapper.mapFields([], 'COA', workflow);
    }

    const config: RunConfig = {
      runId,
      workflow,
      engine,
      createdAt: now,
      updatedAt: now,
      userId,
      userName,
      files: [],
      datasetMap: {},
      fieldMappings,
    };

    const status: RunSummary = {
      runId,
      workflow,
      engine,
      status: 'CREATED',
      startedAt: now,
      progress: 0,
      currentStage: 'INITIALIZED',
      outputs: [],
    };

    this.saveRunConfig(runId, config);
    this.saveRunStatus(runId, status);

    LogService.log('INFO', 'RUN_MANAGER', `Initialized run ${runId} for workflow ${workflow} by ${userName}`, runId);
    return { runId, config };
  }

  public static getRunDir(runId: string): string {
    return path.join(ENV.RUN_DIR, runId);
  }

  public static saveRunConfig(runId: string, config: RunConfig): void {
    config.updatedAt = new Date().toISOString();
    const configPath = path.join(ENV.RUN_DIR, runId, 'config', 'run_config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  public static getRunConfig(runId: string): RunConfig | null {
    const configPath = path.join(ENV.RUN_DIR, runId, 'config', 'run_config.json');
    if (!fs.existsSync(configPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (err) {
      LogService.log('ERROR', 'RUN_MANAGER', `Error reading config for ${runId}: ${err}`, runId);
      return null;
    }
  }

  public static saveRunStatus(runId: string, status: RunSummary): void {
    const statusPath = path.join(ENV.RUN_DIR, runId, 'status.json');
    if (!status.startedAt) {
      if (status.completedAt) {
        status.startedAt = status.completedAt;
      } else {
        status.startedAt = new Date().toISOString();
      }
    }
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf-8');
  }

  public static getRunStatus(runId: string): RunSummary | null {
    const statusPath = path.join(ENV.RUN_DIR, runId, 'status.json');
    if (!fs.existsSync(statusPath)) return null;
    try {
      const summary: RunSummary = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
      if (!summary.startedAt) {
        summary.startedAt = summary.completedAt || summary.createdAt;
      }
      return summary;
    } catch (err) {
      LogService.log('ERROR', 'RUN_MANAGER', `Error reading status for ${runId}: ${err}`, runId);
      return null;
    }
  }

  public static updateRunStatus(
    runId: string,
    updates: Partial<RunSummary>
  ): RunSummary | null {
    const current = this.getRunStatus(runId);
    if (!current) return null;

    // IMMUTABILITY PROTECTION: Once a run is marked COMPLETED, preserve its completed status,
    // 100% progress, timestamps, and outputs from regression unless explicitly restarted.
    if (current.status === 'COMPLETED' && updates.status !== 'RUNNING') {
      updates.status = 'COMPLETED';
      updates.progress = 100;
      if (current.completedAt) {
        updates.completedAt = current.completedAt;
      }
      if (current.outputs && current.outputs.length > 0 && (!updates.outputs || updates.outputs.length === 0)) {
        updates.outputs = current.outputs;
      }
    }

    const updated: RunSummary = {
      ...current,
      ...updates,
    };

    if (!updated.startedAt && current.startedAt) {
      updated.startedAt = current.startedAt;
    }

    this.saveRunStatus(runId, updated);
    return updated;
  }

  public static deleteRun(runId: string): boolean {
    const runDir = path.join(ENV.RUN_DIR, runId);
    if (fs.existsSync(runDir)) {
      try {
        fs.rmSync(runDir, { recursive: true, force: true });
        LogService.log('INFO', 'RUN_MANAGER', `Deleted run ${runId}`, runId);
        return true;
      } catch (err) {
        LogService.log('ERROR', 'RUN_MANAGER', `Failed to delete run directory for ${runId}: ${err}`, runId);
        return false;
      }
    }
    return false;
  }

  public static listAllRuns(): RunSummary[] {
    if (!fs.existsSync(ENV.RUN_DIR)) return [];

    const dirs = fs.readdirSync(ENV.RUN_DIR);
    const summaries: RunSummary[] = [];

    for (const dir of dirs) {
      const statusPath = path.join(ENV.RUN_DIR, dir, 'status.json');
      if (fs.existsSync(statusPath)) {
        try {
          const summary = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
          if (!summary.startedAt) {
            if (summary.completedAt) {
              summary.startedAt = summary.completedAt;
            } else if (summary.createdAt) {
              summary.startedAt = summary.createdAt;
            } else {
              try {
                const stat = fs.statSync(statusPath);
                summary.startedAt = stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString();
              } catch {
                summary.startedAt = new Date().toISOString();
              }
            }
          }
          summaries.push(summary);
        } catch (err) {
          // Skip malformed
        }
      }
    }

    // Sort descending by runId/startedAt
    return summaries.sort((a, b) => b.runId.localeCompare(a.runId));
  }
}
