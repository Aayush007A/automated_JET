import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: string;
  runId: string;
  level: LogLevel;
  component: string;
  message: string;
  raw?: string;
}

export class LogService {
  private static formatTimestamp(d = new Date()): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }

  private static getGlobalLogFilePath(): string {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const fileName = `application-${yyyy}-${mm}-${dd}.txt`;
    return path.join(ENV.LOG_DIR, fileName);
  }

  public static log(level: LogLevel, component: string, message: string, runId: string = 'SYSTEM'): void {
    const timestamp = this.formatTimestamp();
    const line = `${timestamp} | ${runId} | ${level.padEnd(5)} | ${component.padEnd(15)} | ${message}\n`;

    // 1. Log to console in development
    if (level === 'ERROR') {
      console.error(line.trim());
    } else if (level === 'WARN') {
      console.warn(line.trim());
    } else {
      console.log(line.trim());
    }

    // 2. Append to daily application log
    try {
      const globalPath = this.getGlobalLogFilePath();
      fs.appendFileSync(globalPath, line, { encoding: 'utf-8' });
    } catch (err) {
      console.error('Failed to write to global log:', err);
    }

    // 3. If runId is provided and valid, append to run-specific log
    if (runId && runId !== 'SYSTEM') {
      try {
        const runLogDir = path.join(ENV.RUN_DIR, runId, 'logs');
        if (!fs.existsSync(runLogDir)) {
          fs.mkdirSync(runLogDir, { recursive: true });
        }
        const executionLogPath = path.join(runLogDir, 'execution.txt');
        fs.appendFileSync(executionLogPath, line, { encoding: 'utf-8' });

        if (level === 'ERROR') {
          const errorsLogPath = path.join(runLogDir, 'errors.txt');
          fs.appendFileSync(errorsLogPath, line, { encoding: 'utf-8' });
        }
      } catch (err) {
        console.error(`Failed to write to run log for ${runId}:`, err);
      }
    }
  }

  public static appendPipelineStdout(runId: string, text: string): void {
    try {
      const runLogDir = path.join(ENV.RUN_DIR, runId, 'logs');
      if (!fs.existsSync(runLogDir)) {
        fs.mkdirSync(runLogDir, { recursive: true });
      }
      fs.appendFileSync(path.join(runLogDir, 'pipeline_stdout.txt'), text, { encoding: 'utf-8' });
    } catch (err) {
      console.error('Error appending stdout:', err);
    }
  }

  public static appendPipelineStderr(runId: string, text: string): void {
    try {
      const runLogDir = path.join(ENV.RUN_DIR, runId, 'logs');
      if (!fs.existsSync(runLogDir)) {
        fs.mkdirSync(runLogDir, { recursive: true });
      }
      fs.appendFileSync(path.join(runLogDir, 'pipeline_stderr.txt'), text, { encoding: 'utf-8' });
      this.log('ERROR', 'PIPELINE_STDERR', text.trim(), runId);
    } catch (err) {
      console.error('Error appending stderr:', err);
    }
  }

  public static getLogs(runId?: string, level?: LogLevel, search?: string, limit = 500): LogEntry[] {
    let logContent = '';

    if (runId && runId !== 'SYSTEM') {
      const runLogPath = path.join(ENV.RUN_DIR, runId, 'logs', 'execution.txt');
      if (fs.existsSync(runLogPath)) {
        logContent = fs.readFileSync(runLogPath, 'utf-8');
      }
    } else {
      const globalLogPath = this.getGlobalLogFilePath();
      if (fs.existsSync(globalLogPath)) {
        logContent = fs.readFileSync(globalLogPath, 'utf-8');
      }
    }

    if (!logContent) return [];

    const lines = logContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsedEntries: LogEntry[] = [];

    for (const rawLine of lines) {
      const parts = rawLine.split('|').map((p) => p.trim());
      if (parts.length >= 5) {
        const entry: LogEntry = {
          timestamp: parts[0],
          runId: parts[1],
          level: parts[2] as LogLevel,
          component: parts[3],
          message: parts.slice(4).join('|'),
          raw: rawLine,
        };

        if (level && entry.level !== level) continue;
        if (search) {
          const s = search.toLowerCase();
          if (
            !entry.message.toLowerCase().includes(s) &&
            !entry.component.toLowerCase().includes(s) &&
            !entry.runId.toLowerCase().includes(s)
          ) {
            continue;
          }
        }
        parsedEntries.push(entry);
      }
    }

    return parsedEntries.slice(-limit);
  }

  public static getRawLogFile(runId: string, logType: 'execution' | 'stdout' | 'stderr' | 'errors' = 'execution'): string {
    const runLogDir = path.join(ENV.RUN_DIR, runId, 'logs');
    const fileMap: Record<string, string> = {
      execution: 'execution.txt',
      stdout: 'pipeline_stdout.txt',
      stderr: 'pipeline_stderr.txt',
      errors: 'errors.txt',
    };
    const targetFile = path.join(runLogDir, fileMap[logType] || 'execution.txt');
    if (fs.existsSync(targetFile)) {
      return fs.readFileSync(targetFile, 'utf-8');
    }
    return '';
  }
}
