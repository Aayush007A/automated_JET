import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import { DatasetClassification, DetectedFileSheet, UploadedFileInfo } from '../types';
import { LogService } from './logService';
import { TRIAL_BALANCE_FIELDS, JOURNAL_ENTRY_FIELDS, COA_FIELDS } from '../config/standardSchemas';

export class FileDetector {
  public static normalizeHeader(header: string): string {
    if (!header) return '';
    return header
      .toLowerCase()
      .trim()
      .replace(/[_\s\-\.\/\(\)]+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '')
      .trim();
  }

  public static classifyHeaders(headers: string[]): { classification: DatasetClassification; confidence: number } {
    if (!headers || headers.length === 0) {
      return { classification: 'UNKNOWN', confidence: 0 };
    }

    const normHeaders = headers.map((h) => this.normalizeHeader(h));
    const headerSet = new Set(normHeaders);

    // 1. Signature check for Trial Balance
    const tbSignatures = [
      ['g l', 'gl', 'account number', 'account', 'gl code'],
      ['description', 'account description', 'gl description'],
      ['opening balance', 'beginning balance', 'op balance', 'open bal'],
      ['closing balance', 'ending balance', 'balance', 'close bal'],
      ['account subtype', 'subtype', 'account type'],
      ['fs line item', 'fs line', 'financial statement line'],
      ['debit', 'credit'],
      ['entity id', 'entity code', 'company code', 'cocd']
    ];

    let tbScore = 0;
    tbSignatures.forEach((group) => {
      if (group.some((sig) => headerSet.has(sig) || normHeaders.some((h) => h.includes(sig)))) {
        tbScore++;
      }
    });

    // 2. Signature check for General Ledger / Population
    const glSignatures = [
      ['documentno', 'document number', 'accounting document', 'journal number', 'doc no', 'belnr'],
      ['g l', 'gl', 'account number', 'account', 'gl code'],
      ['amount in local cur', 'amount in local currency', 'net amount ec', 'amount', 'net amount'],
      ['type', 'document type', 'doc type', 'blart', 'transaction type'],
      ['pstng date', 'posting date', 'budat', 'date posted'],
      ['entry date', 'accounting date', 'date effective', 'doc date', 'effective date'],
      ['user name', 'user ud', 'userid entered', 'created by', 'entered by', 'user id'],
      ['document header text', 'text header', 'header description', 'text', 'details']
    ];

    let glScore = 0;
    glSignatures.forEach((group) => {
      if (group.some((sig) => headerSet.has(sig) || normHeaders.some((h) => h.includes(sig)))) {
        glScore++;
      }
    });

    // 3. Signature check for Chart of Accounts (COA)
    const coaSignatures = [
      ['chart of accounts', 'coa', 'ktopl'],
      ['financial statement category', 'fs category', 'category'],
      ['financial statement line', 'fs line', 'fs line item'],
      ['account grouping 1', 'account group', 'grouping'],
      ['account number', 'g l', 'gl', 'account code'],
      ['account description', 'description', 'gl description']
    ];

    let coaScore = 0;
    coaSignatures.forEach((group) => {
      if (group.some((sig) => headerSet.has(sig) || normHeaders.some((h) => h.includes(sig)))) {
        coaScore++;
      }
    });

    // 4. Signature check for Fiscal Calendar
    const calSignatures = [
      ['fiscal year', 'fiscal period'],
      ['fiscal period start', 'fiscal period end'],
      ['fiscal quarter', 'fiscal year identifier']
    ];
    let calScore = 0;
    calSignatures.forEach((group) => {
      if (group.some((sig) => headerSet.has(sig) || normHeaders.some((h) => h.includes(sig)))) {
        calScore++;
      }
    });

    // 5. Signature check for Input Parameters
    const paramSignatures = [
      ['engagement name', 'materiality'],
      ['clearly trivial threshold', 'performance materiality'],
      ['unusual accounts', 'closing entries before', 'digits', 'keywords']
    ];
    let paramScore = 0;
    paramSignatures.forEach((group) => {
      if (group.some((sig) => headerSet.has(sig) || normHeaders.some((h) => h.includes(sig)))) {
        paramScore++;
      }
    });

    const tbConf = Math.min(100, Math.round((tbScore / Math.min(tbSignatures.length, 5)) * 100));
    const glConf = Math.min(100, Math.round((glScore / Math.min(glSignatures.length, 5)) * 100));
    const coaConf = Math.min(100, Math.round((coaScore / Math.min(coaSignatures.length, 4)) * 100));
    const calConf = Math.min(100, Math.round((calScore / 2) * 100));
    const paramConf = Math.min(100, Math.round((paramScore / 2) * 100));

    const scores = [
      { classification: 'TRIAL_BALANCE' as DatasetClassification, confidence: tbConf },
      { classification: 'GENERAL_LEDGER' as DatasetClassification, confidence: glConf },
      { classification: 'COA' as DatasetClassification, confidence: coaConf },
      { classification: 'FISCAL_CALENDAR' as DatasetClassification, confidence: calConf },
      { classification: 'INPUT_PARAMETERS' as DatasetClassification, confidence: paramConf }
    ];

    scores.sort((a, b) => b.confidence - a.confidence);

    if (scores[0].confidence >= 40) {
      return scores[0];
    }

    return { classification: 'UNKNOWN', confidence: scores[0].confidence };
  }

  public static inspectFile(filePath: string, originalName: string, runId: string = 'SYSTEM'): UploadedFileInfo {
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    const fileId = path.basename(filePath);

    const info: UploadedFileInfo = {
      fileId,
      originalName,
      fileName: path.basename(filePath),
      filePath,
      fileSize: stats.size,
      mimeType: ext === '.xlsx' || ext === '.xls' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
      extension: ext.replace('.', ''),
      detectedDataset: 'UNKNOWN',
      confidence: 0,
      headers: [],
      sampleRows: [],
      status: 'READY'
    };

    try {
      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = xlsx.readFile(filePath, { cellDates: true, dense: true });
        const sheets: DetectedFileSheet[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rawData = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1, defval: '' });

          if (!rawData || rawData.length === 0) continue;

          // Find header row: scan first 10 rows for highest non-empty column count
          let headerRowIndex = 0;
          let maxColCount = 0;
          for (let r = 0; r < Math.min(10, rawData.length); r++) {
            const row = rawData[r] as any[];
            if (Array.isArray(row)) {
              const nonEmp = row.filter((c) => c !== null && c !== undefined && c.toString().trim() !== '').length;
              if (nonEmp > maxColCount) {
                maxColCount = nonEmp;
                headerRowIndex = r;
              }
            }
          }

          const rawHeaders = (rawData[headerRowIndex] as any[] || []).map((h) => (h ? h.toString().trim() : ''));
          const headers = rawHeaders.filter((h) => h.length > 0);

          // Infer by sheet name first
          let sheetClass: DatasetClassification = 'UNKNOWN';
          const lowerSheet = sheetName.toLowerCase();
          if (lowerSheet.includes('tb') || lowerSheet.includes('trial') || lowerSheet.includes('balance')) {
            sheetClass = 'TRIAL_BALANCE';
          } else if (lowerSheet.includes('gl') || lowerSheet.includes('population') || lowerSheet.includes('ledger') || lowerSheet.includes('journal') || lowerSheet.includes('je')) {
            sheetClass = 'GENERAL_LEDGER';
          } else if (lowerSheet.includes('coa') || lowerSheet.includes('chart')) {
            sheetClass = 'COA';
          } else if (lowerSheet.includes('param') || lowerSheet.includes('input')) {
            sheetClass = 'INPUT_PARAMETERS';
          } else if (lowerSheet.includes('cal') || lowerSheet.includes('fiscal')) {
            sheetClass = 'FISCAL_CALENDAR';
          }

          const headerClass = this.classifyHeaders(headers);
          const finalClass = sheetClass !== 'UNKNOWN' && headerClass.confidence < 60 ? sheetClass : headerClass.classification;
          const finalConf = sheetClass !== 'UNKNOWN' ? Math.max(headerClass.confidence, 85) : headerClass.confidence;

          // Parse sample rows
          const rowsWithHeaders = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, {
            range: headerRowIndex,
            defval: ''
          });

          sheets.push({
            sheetName,
            rowCount: rowsWithHeaders.length,
            headers,
            sampleRows: rowsWithHeaders.slice(0, 10),
            detectedDataset: finalClass,
            confidence: finalConf,
            mappings: []
          });
        }

        info.sheets = sheets;

        if (sheets.length === 1) {
          info.headers = sheets[0].headers;
          info.sampleRows = sheets[0].sampleRows;
          info.detectedDataset = sheets[0].detectedDataset;
          info.confidence = sheets[0].confidence;
        } else if (sheets.length > 1) {
          // Multi-sheet workbook
          info.detectedDataset = 'UNKNOWN';
          info.confidence = 100;
          info.headers = sheets[0].headers;
          info.sampleRows = sheets[0].sampleRows;
        }
      } else if (ext === '.csv' || ext === '.txt') {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Detect delimiter: comma, tab, pipe, semicolon
        let delimiter = ',';
        const firstLine = content.split(/\r?\n/)[0] || '';
        if (firstLine.includes('\t') && (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
          delimiter = '\t';
        } else if (firstLine.includes('|') && (firstLine.match(/\|/g) || []).length > (firstLine.match(/,/g) || []).length) {
          delimiter = '|';
        } else if (firstLine.includes(';') && (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
          delimiter = ';';
        }

        const records = parse(content, {
          delimiter,
          skip_empty_lines: true,
          relax_column_count: true,
          trim: true
        });

        if (records && records.length > 0) {
          // Check if row 0 has headers
          let headerIndex = 0;
          const headers = (records[headerIndex] as string[]).map((h) => (h ? h.trim() : ''));
          info.headers = headers;

          const sampleRows: Record<string, any>[] = [];
          for (let i = headerIndex + 1; i < Math.min(records.length, headerIndex + 11); i++) {
            const rowObj: Record<string, any> = {};
            const rowValues = records[i] as string[];
            headers.forEach((h, colIdx) => {
              if (h) rowObj[h] = rowValues[colIdx] || '';
            });
            sampleRows.push(rowObj);
          }
          info.sampleRows = sampleRows;

          const detected = this.classifyHeaders(headers);
          info.detectedDataset = detected.classification;
          info.confidence = detected.confidence;
        }
      }

      LogService.log(
        'INFO',
        'FILE_DETECTOR',
        `Inspected file "${originalName}" -> Detected: ${info.detectedDataset} (${info.confidence}%)`,
        runId
      );
    } catch (err) {
      info.status = 'ERROR';
      info.errorMessage = (err as Error).message;
      LogService.log('ERROR', 'FILE_DETECTOR', `Error inspecting ${originalName}: ${err}`, runId);
    }

    return info;
  }
}
