import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Response } from 'express';
import { ENV } from '../config/env';
import { OutputItem } from '../types';
import { RunManager } from './runManager';
import { LogService } from './logService';

export class OutputService {
  public static getOutputsForRun(runId: string): OutputItem[] {
    const outputDir = path.join(ENV.RUN_DIR, runId, 'output');
    if (!fs.existsSync(outputDir)) return [];

    const files = fs.readdirSync(outputDir);
    const outputs: OutputItem[] = [];

    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      const ext = path.extname(file).toLowerCase().replace('.', '') as any;

      let rowCount: number | undefined = undefined;
      if (ext === 'csv' || ext === 'txt') {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
          rowCount = Math.max(0, lines.length - 1);
        } catch {
          // ignore
        }
      }

      outputs.push({
        id: file.replace(/[^a-zA-Z0-9]/g, '_'),
        name: file,
        type: ext,
        category: file.includes('IR_') ? 'INTEGRITY' : file.includes('Parameter_') ? 'PARAMETER' : file.includes('DQC') ? 'DQC' : file.includes('Control_') ? 'CONTROL_TOTAL' : 'MASTER',
        sizeBytes: stats.size,
        path: filePath,
        relativePath: `runs/${runId}/output/${file}`,
        downloadUrl: `/api/runs/${runId}/output/${encodeURIComponent(file)}`,
        description: file,
        rowCount,
      });
    }

    return outputs;
  }

  public static previewOutputFile(
    runId: string,
    fileName: string,
    maxRows: number = 50
  ): { headers: string[]; rows: Record<string, any>[]; totalRows: number } | null {
    const safeFileName = path.basename(fileName);
    const filePath = path.join(ENV.RUN_DIR, runId, 'output', safeFileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };

      // Parse CSV header
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
        const line = lines[i];
        // Handle basic quoted comma parsing
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = '';

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim().replace(/^["']|["']$/g, ''));
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim().replace(/^["']|["']$/g, ''));

        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] !== undefined ? values[idx] : '';
        });
        rows.push(rowObj);
      }

      return {
        headers,
        rows,
        totalRows: lines.length - 1,
      };
    } catch (err) {
      LogService.log('ERROR', 'OUTPUT_PREVIEW', `Error parsing preview for ${safeFileName}: ${err}`, runId);
      return null;
    }
  }

  public static downloadOutputFile(runId: string, fileName: string, res: Response): void {
    const safeFileName = path.basename(fileName);
    const filePath = path.join(ENV.RUN_DIR, runId, 'output', safeFileName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: `Output file "${safeFileName}" not found.` });
      return;
    }

    LogService.log('INFO', 'OUTPUT_DOWNLOAD', `User downloading output file: ${safeFileName}`, runId);
    res.download(filePath, safeFileName);
  }

  public static downloadAllOutputsZip(runId: string, res: Response): void {
    const outputDir = path.join(ENV.RUN_DIR, runId, 'output');
    if (!fs.existsSync(outputDir)) {
      res.status(404).json({ success: false, message: 'No output directory found for this run.' });
      return;
    }

    const zipFileName = `${runId}_Outputs.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    archive.directory(outputDir, false);

    const execLogPath = path.join(ENV.RUN_DIR, runId, 'logs', 'execution.txt');
    if (fs.existsSync(execLogPath)) {
      archive.file(execLogPath, { name: 'execution.txt' });
    }

    archive.finalize();
    LogService.log('INFO', 'OUTPUT_DOWNLOAD', `Generating ZIP archive for run ${runId}`, runId);
  }
}
