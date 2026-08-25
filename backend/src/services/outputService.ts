import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Response } from 'express';
import { ENV } from '../config/env';
import { OutputItem } from '../types';
import { RunManager } from './runManager';
import { LogService } from './logService';

import { FastPreviewReader } from '../utils/fastPreviewReader';

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
        // Fast byte estimate for list endpoints to avoid loading megabytes into memory
        if (stats.size < 500 * 1024) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
            rowCount = Math.max(0, lines.length - 1);
          } catch {
            rowCount = undefined;
          }
        } else {
          // Large file estimate based on 100 bytes/row
          rowCount = Math.max(1, Math.round(stats.size / 100));
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

  public static async previewOutputFile(
    runId: string,
    fileName: string,
    maxRows: number = 50
  ): Promise<{ headers: string[]; rows: Record<string, any>[]; totalRows: number } | null> {
    const safeFileName = path.basename(fileName);
    const filePath = path.join(ENV.RUN_DIR, runId, 'output', safeFileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.xlsx' || ext === '.xls') {
        return FastPreviewReader.previewExcel(filePath, null, maxRows);
      }
      return await FastPreviewReader.previewCsv(filePath, maxRows);
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
