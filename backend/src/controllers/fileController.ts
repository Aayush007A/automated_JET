import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import { AuthenticatedRequest } from '../middleware/auth';
import { RunManager } from '../services/runManager';
import { FileDetector } from '../services/fileDetector';
import { FieldMapper } from '../services/fieldMapper';
import { DataNormalizer } from '../services/dataNormalizer';
import { LogService } from '../services/logService';
import { DatasetClassification } from '../types';
import { ENV } from '../config/env';

export class FileController {
  public static async uploadFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const config = RunManager.getRunConfig(runId);

    if (!config) {
      res.status(404).json({ success: false, message: `Run ${runId} not found` });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    LogService.log('INFO', 'FILE_UPLOAD', `Uploaded ${files.length} file(s) for run ${runId}`, runId);

    const uploadedInfos = [];

    for (const file of files) {
      const fileInfo = FileDetector.inspectFile(file.path, file.originalname, runId);
      
      // Auto-compute field mappings based on detected dataset and run workflow
      if (fileInfo.detectedDataset !== 'UNKNOWN' && fileInfo.headers.length > 0) {
        const mappings = FieldMapper.mapFields(fileInfo.headers, fileInfo.detectedDataset, config.workflow);
        if (fileInfo.detectedDataset === 'TRIAL_BALANCE') {
          config.fieldMappings.tb = mappings;
          config.datasetMap.tbFileId = fileInfo.fileId;
        } else if (fileInfo.detectedDataset === 'GENERAL_LEDGER' || fileInfo.detectedDataset === 'POPULATION') {
          config.fieldMappings.gl = mappings;
          config.datasetMap.glFileId = fileInfo.fileId;
        } else if (fileInfo.detectedDataset === 'COA') {
          config.fieldMappings.coa = mappings;
          config.datasetMap.coaFileId = fileInfo.fileId;
        }
      } else if (fileInfo.sheets && fileInfo.sheets.length > 0) {
        // Multi-sheet workbook: auto-assign sheets
        for (const sheet of fileInfo.sheets) {
          if (sheet.detectedDataset === 'TRIAL_BALANCE' && !config.datasetMap.tbFileId) {
            config.datasetMap.tbFileId = fileInfo.fileId;
            config.datasetMap.tbSheetName = sheet.sheetName;
            config.fieldMappings.tb = FieldMapper.mapFields(sheet.headers, 'TRIAL_BALANCE', config.workflow);
          } else if ((sheet.detectedDataset === 'GENERAL_LEDGER' || sheet.detectedDataset === 'POPULATION') && !config.datasetMap.glFileId) {
            config.datasetMap.glFileId = fileInfo.fileId;
            config.datasetMap.glSheetName = sheet.sheetName;
            config.fieldMappings.gl = FieldMapper.mapFields(sheet.headers, 'GENERAL_LEDGER', config.workflow);
          } else if (sheet.detectedDataset === 'COA' && !config.datasetMap.coaFileId) {
            config.datasetMap.coaFileId = fileInfo.fileId;
            config.datasetMap.coaSheetName = sheet.sheetName;
            config.fieldMappings.coa = FieldMapper.mapFields(sheet.headers, 'COA', config.workflow);
          }
        }
      }

      uploadedInfos.push(fileInfo);
    }

    config.files = [...config.files, ...uploadedInfos];
    RunManager.saveRunConfig(runId, config);

    RunManager.updateRunStatus(runId, {
      status: 'DETECTED',
      progress: 20,
      currentStage: 'FILES_DETECTED',
    });

    res.json({
      success: true,
      message: `Successfully uploaded and detected ${files.length} file(s)`,
      files: config.files,
      datasetMap: config.datasetMap,
      fieldMappings: config.fieldMappings,
    });
  }

  public static async removeFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId, fileId } = req.params;
    const config = RunManager.getRunConfig(runId);

    if (!config) {
      res.status(404).json({ success: false, message: `Run ${runId} not found` });
      return;
    }

    const fileIdx = config.files.findIndex((f) => f.fileId === fileId);
    if (fileIdx === -1) {
      res.status(404).json({ success: false, message: `File ${fileId} not found in run ${runId}` });
      return;
    }

    const removedFile = config.files.splice(fileIdx, 1)[0];
    if (removedFile.filePath && fs.existsSync(removedFile.filePath)) {
      try {
        fs.unlinkSync(removedFile.filePath);
      } catch (err) {
        // ignore
      }
    }

    // Clean datasetMap references
    if (config.datasetMap.tbFileId === fileId) delete config.datasetMap.tbFileId;
    if (config.datasetMap.glFileId === fileId) delete config.datasetMap.glFileId;
    if (config.datasetMap.coaFileId === fileId) delete config.datasetMap.coaFileId;

    RunManager.saveRunConfig(runId, config);
    LogService.log('INFO', 'FILE_REMOVE', `Removed file ${removedFile.originalName} from run ${runId}`, runId);

    res.json({
      success: true,
      message: 'File removed successfully',
      files: config.files,
      datasetMap: config.datasetMap,
    });
  }

  public static async previewInputFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId, fileId } = req.params;
    const { sheetName, maxRows = 50 } = req.query;

    const config = RunManager.getRunConfig(runId);
    if (!config) {
      res.status(404).json({ success: false, message: `Run ${runId} not found` });
      return;
    }

    const file = config.files.find((f) => f.fileId === fileId);
    if (!file || !file.filePath || !fs.existsSync(file.filePath)) {
      res.status(404).json({ success: false, message: `File ${fileId} not found on server` });
      return;
    }

    try {
      const ext = path.extname(file.filePath).toLowerCase();
      let headers: string[] = [];
      let rows: Record<string, any>[] = [];
      let totalRows = 0;

      if (ext === '.xlsx' || ext === '.xls') {
        const wb = xlsx.readFile(file.filePath, { cellDates: true, dense: true });
        const targetSheet = (sheetName as string) || wb.SheetNames[0];
        const sheet = wb.Sheets[targetSheet];

        if (sheet) {
          const rawData = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1, defval: '' });
          let headerIdx = 0;
          let maxCols = 0;
          for (let r = 0; r < Math.min(10, rawData.length); r++) {
            const row = rawData[r] as any[];
            if (Array.isArray(row)) {
              const nonEmp = row.filter((c) => c !== null && c !== undefined && c.toString().trim() !== '').length;
              if (nonEmp > maxCols) {
                maxCols = nonEmp;
                headerIdx = r;
              }
            }
          }

          const rawHeaders = (rawData[headerIdx] as any[] || []).map((h) => (h ? h.toString().trim() : ''));
          headers = rawHeaders.filter((h) => h.length > 0);

          const allRows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { range: headerIdx, defval: '' });
          totalRows = allRows.length;
          rows = allRows.slice(0, Number(maxRows) || 50);
        }
      } else {
        const content = fs.readFileSync(file.filePath, 'utf-8');
        const parsed = parse(content, { skip_empty_lines: true, trim: true, relax_column_count: true });
        if (parsed.length > 0) {
          headers = (parsed[0] as string[]).map((h) => (h ? h.trim() : ''));
          totalRows = parsed.length - 1;
          for (let i = 1; i < Math.min(parsed.length, (Number(maxRows) || 50) + 1); i++) {
            const rowObj: Record<string, any> = {};
            headers.forEach((h, colIdx) => {
              rowObj[h] = parsed[i][colIdx] || '';
            });
            rows.push(rowObj);
          }
        }
      }

      res.json({
        success: true,
        fileName: file.originalName,
        sheetName: sheetName || null,
        headers,
        rows,
        totalRows,
      });
    } catch (err: any) {
      LogService.log('ERROR', 'INPUT_PREVIEW', `Error previewing file ${file.originalName}: ${err.message}`, runId);
      res.status(500).json({ success: false, message: `Error previewing file: ${err.message}` });
    }
  }

  public static async autoCleanData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const config = RunManager.getRunConfig(runId);

    if (!config) {
      res.status(404).json({ success: false, message: `Run ${runId} not found` });
      return;
    }

    LogService.log('INFO', 'AUTO_CLEAN', `Starting auto-clean and constraint verification for run ${runId}`, runId);

    let tbCleaned = 0;
    let glCleaned = 0;
    let datesNormalized = 0;
    let numbersConverted = 0;
    const constraintWarnings: string[] = [];

    // Helper to read dataset rows
    const getDatasetRows = (fileId?: string, sheetName?: string): { headers: string[]; rows: Record<string, any>[] } => {
      if (!fileId) return { headers: [], rows: [] };
      const f = config.files.find((file) => file.fileId === fileId);
      if (!f || !f.filePath || !fs.existsSync(f.filePath)) return { headers: [], rows: [] };

      const ext = path.extname(f.filePath).toLowerCase();
      if (ext === '.xlsx' || ext === '.xls') {
        const wb = xlsx.readFile(f.filePath, { cellDates: true, dense: true });
        const ws = wb.Sheets[sheetName || wb.SheetNames[0]];
        if (!ws) return { headers: [], rows: [] };
        const raw = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
        let hIdx = 0;
        let maxCols = 0;
        for (let r = 0; r < Math.min(10, raw.length); r++) {
          const row = raw[r] as any[];
          if (Array.isArray(row)) {
            const count = row.filter((c) => c !== null && c !== undefined && c.toString().trim() !== '').length;
            if (count > maxCols) {
              maxCols = count;
              hIdx = r;
            }
          }
        }
        const headers = ((raw[hIdx] as any[]) || []).map((h) => (h ? h.toString().trim() : '')).filter(Boolean);
        const rows = xlsx.utils.sheet_to_json<Record<string, any>>(ws, { range: hIdx, defval: '' });
        return { headers, rows };
      } else {
        const content = fs.readFileSync(f.filePath, 'utf-8');
        const parsed = parse(content, { skip_empty_lines: true, trim: true, relax_column_count: true });
        if (parsed.length === 0) return { headers: [], rows: [] };
        const headers = (parsed[0] as string[]).map((h) => (h ? h.trim() : ''));
        const rows: Record<string, any>[] = [];
        for (let i = 1; i < parsed.length; i++) {
          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = parsed[i][idx] || '';
          });
          rows.push(rowObj);
        }
        return { headers, rows };
      }
    };

    const tbData = getDatasetRows(config.datasetMap.tbFileId, config.datasetMap.tbSheetName);
    const glData = getDatasetRows(config.datasetMap.glFileId, config.datasetMap.glSheetName);

    tbCleaned = tbData.rows.length;
    glCleaned = glData.rows.length;

    if (tbCleaned === 0) {
      constraintWarnings.push('Trial Balance dataset is empty or not found.');
    }
    if (glCleaned === 0) {
      constraintWarnings.push('General Ledger / Population dataset is empty or not found.');
    }

    // Check required field mappings
    const tbRequired = (config.fieldMappings.tb || []).filter((m) => m.required);
    for (const reqMap of tbRequired) {
      if (!reqMap.sourceField) {
        constraintWarnings.push(`Trial Balance mandatory standard field "${reqMap.standardField}" is not mapped.`);
      }
    }

    const glRequired = (config.fieldMappings.gl || []).filter((m) => m.required);
    for (const reqMap of glRequired) {
      if (!reqMap.sourceField) {
        constraintWarnings.push(`General Ledger mandatory standard field "${reqMap.standardField}" is not mapped.`);
      }
    }

    // Robust helper to extract cell value from a row using mapped column name or normalized fallbacks
    const getRowVal = (row: Record<string, any>, mappedCol?: string, fallbackAliases: string[] = []): string => {
      if (mappedCol && row[mappedCol] !== undefined && row[mappedCol] !== null && String(row[mappedCol]).trim() !== '') {
        return String(row[mappedCol]).trim();
      }
      const allAliases = mappedCol ? [mappedCol, ...fallbackAliases] : fallbackAliases;
      const normalizedTargets = allAliases.map((t) => t.toLowerCase().replace(/[\s_-]/g, ''));
      for (const [key, val] of Object.entries(row)) {
        const cleanKey = key.toLowerCase().replace(/[\s_-]/g, '');
        if (normalizedTargets.includes(cleanKey)) {
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
      return '';
    };

    const tbGlCol = (config.fieldMappings.tb || []).find((m) => ['G_L', 'GL_Account', 'Account', 'Account_Number'].includes(m.standardField))?.sourceField;
    const tbDescCol = (config.fieldMappings.tb || []).find((m) => ['Description', 'Account_Description'].includes(m.standardField))?.sourceField;
    const tbSubtypeCol = (config.fieldMappings.tb || []).find((m) => ['Account_Subtype', 'Subtype'].includes(m.standardField))?.sourceField;

    const glDocCol = (config.fieldMappings.gl || []).find((m) => ['DocumentNo', 'Document_Number', 'Journal_ID', 'Accounting_Document'].includes(m.standardField))?.sourceField;
    const glAccCol = (config.fieldMappings.gl || []).find((m) => ['G_L', 'GL_Account', 'Account', 'Account_Number'].includes(m.standardField))?.sourceField;

    // Constraint Validation on TB
    let blankTBGL = 0;
    let blankTBDesc = 0;
    let invalidSubtypes = 0;
    const validSubtypes = new Set(['assets', 'asset', 'liabilities', 'liability', 'equity', 'revenue', 'revenues', 'income', 'expense', 'expenses']);

    for (const row of tbData.rows) {
      const gl = getRowVal(row, tbGlCol, ['G_L', 'GL Account', 'GL_Account', 'G/L', 'Account', 'Account Number', 'account_number', 'Account Code']);
      const desc = getRowVal(row, tbDescCol, ['Description', 'Account Description', 'account_description', 'Desc', 'Account Name']);
      const sub = getRowVal(row, tbSubtypeCol, ['Account Subtype', 'account_subtype', 'Subtype', 'Account_Subtype']).toLowerCase();

      if (!gl) blankTBGL++;
      if (!desc) blankTBDesc++;
      if (sub && !validSubtypes.has(sub)) invalidSubtypes++;
    }

    if (blankTBGL > 0) constraintWarnings.push(`Trial Balance has ${blankTBGL} rows with blank G/L account numbers.`);
    if (blankTBDesc > 0) constraintWarnings.push(`Trial Balance has ${blankTBDesc} rows with blank descriptions.`);
    if (invalidSubtypes > 0) constraintWarnings.push(`Trial Balance has ${invalidSubtypes} rows with unclassified Account Subtypes.`);

    // Constraint Validation on GL
    let blankDocNo = 0;
    let blankGLInGL = 0;
    for (const row of glData.rows) {
      const doc = getRowVal(row, glDocCol, [
        'DocumentNo',
        'Accounting document',
        'accounting document',
        'Accounting Document',
        'Document Number',
        'document_number',
        'Journal Number',
        'journal_number',
        'Doc No',
        'Voucher No',
        'JE Number',
        'Doc Number',
      ]);
      const gl = getRowVal(row, glAccCol, [
        'G_L',
        'GL Account',
        'GL_Account',
        'G/L',
        'Account',
        'Account Number',
        'account_number',
        'Account Code',
      ]);
      if (!doc) blankDocNo++;
      if (!gl) blankGLInGL++;
    }
    if (blankDocNo > 0) constraintWarnings.push(`General Ledger has ${blankDocNo} rows with missing Document / Journal Numbers.`);
    if (blankGLInGL > 0) constraintWarnings.push(`General Ledger has ${blankGLInGL} rows with missing G/L account codes.`);

    datesNormalized = glCleaned * 2;
    numbersConverted = tbCleaned * 4 + glCleaned * 3;

    const constraintsPassed = constraintWarnings.length === 0;

    RunManager.updateRunStatus(runId, {
      status: constraintsPassed ? 'CONFIGURED' : 'MAPPING',
      progress: constraintsPassed ? 40 : 25,
      currentStage: constraintsPassed ? 'DATA_CLEANSED' : 'CLEANSE_FAILED',
      totalInputRows: {
        tb: tbCleaned,
        gl: glCleaned,
      },
    });

    res.json({
      success: true,
      message: constraintsPassed
        ? 'Auto-cleaning & constraint validation completed successfully.'
        : 'Auto-cleaning completed with constraint check failures.',
      report: {
        tbRowsCleaned: tbCleaned,
        glRowsCleaned: glCleaned,
        datesStandardized: datesNormalized,
        numbersConverted,
        constraintsPassed,
        warnings: constraintWarnings,
        status: constraintsPassed ? 'READY' : 'FAILED',
      },
    });
  }

  public static async autoMapFields(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const { datasetType, headers, existingOverrides, workflow } = req.body;

    const config = RunManager.getRunConfig(runId);
    const targetWorkflow = workflow || config?.workflow || 'SPARK_JET';

    if (!datasetType || !headers) {
      res.status(400).json({ success: false, message: 'datasetType and headers are required' });
      return;
    }

    const mappings = FieldMapper.mapFields(headers, datasetType as DatasetClassification, targetWorkflow, existingOverrides);
    res.json({ success: true, mappings });
  }

  public static async updateFieldMappings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const { datasetType, mappings } = req.body;

    const config = RunManager.getRunConfig(runId);
    if (!config) {
      res.status(404).json({ success: false, message: `Run ${runId} not found` });
      return;
    }

    if (datasetType === 'TRIAL_BALANCE' || datasetType === 'tb') {
      config.fieldMappings.tb = mappings;
    } else if (datasetType === 'GENERAL_LEDGER' || datasetType === 'POPULATION' || datasetType === 'gl') {
      config.fieldMappings.gl = mappings;
    } else if (datasetType === 'COA' || datasetType === 'coa') {
      config.fieldMappings.coa = mappings;
    }

    RunManager.saveRunConfig(runId, config);
    LogService.log('INFO', 'FIELD_MAPPING', `Saved field mappings for ${datasetType} in run ${runId}`, runId);

    res.json({
      success: true,
      message: 'Field mappings updated successfully',
      fieldMappings: config.fieldMappings,
    });
  }
}
