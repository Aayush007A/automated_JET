import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import { DatasetClassification, DetectedFileSheet, UploadedFileInfo, WorkflowType, SparkJetParameters } from '../types';
import { LogService } from './logService';
import { DataNormalizer } from './dataNormalizer';

export interface WorkflowRoutingResult {
  workflow: WorkflowType;
  confidence: number;
  reasoning: string;
  sparkScore: number;
  omniaScore: number;
  detectedDatasetsSummary: {
    hasSparkTB: boolean;
    hasSparkGL: boolean;
    hasOmniaTB: boolean;
    hasOmniaGL: boolean;
    hasCOA: boolean;
    hasParameterFiles: boolean;
    totalFiles: number;
    totalSheets: number;
  };
}

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

    // 1. Signature check for Trial Balance (Spark & Omnia)
    const tbSignatures = [
      ['g l', 'gl', 'account number', 'account', 'gl code', 'account code', 'saknr', 'hkont'],
      ['description', 'account description', 'gl description', 'account name'],
      ['opening balance', 'beginning balance', 'op balance', 'open bal', 'beginning balance ec'],
      ['closing balance', 'ending balance', 'balance', 'close bal', 'ending balance ec'],
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
      ['documentno', 'document number', 'accounting document', 'journal number', 'doc no', 'belnr', 'voucher no', 'je number'],
      ['g l', 'gl', 'account number', 'account', 'gl code', 'saknr'],
      ['amount in local cur', 'amount in local currency', 'net amount ec', 'amount', 'net amount', 'dmbtr'],
      ['type', 'document type', 'doc type', 'blart', 'transaction type'],
      ['pstng date', 'posting date', 'budat', 'date posted'],
      ['entry date', 'accounting date', 'date effective', 'doc date', 'effective date', 'bldat'],
      ['user name', 'user ud', 'userid entered', 'created by', 'entered by', 'user id', 'username'],
      ['document header text', 'text header', 'header description', 'text', 'details', 'journal header description']
    ];

    let glScore = 0;
    glSignatures.forEach((group) => {
      if (group.some((sig) => headerSet.has(sig) || normHeaders.some((h) => h.includes(sig)))) {
        glScore++;
      }
    });

    // 3. Signature check for Chart of Accounts (COA - Omnia specific)
    const coaSignatures = [
      ['chart of accounts', 'coa', 'ktopl'],
      ['financial statement category', 'fs category', 'category', 'statement category'],
      ['financial statement line', 'fs line', 'fs line item'],
      ['account grouping 1', 'account group', 'grouping'],
      ['account number', 'g l', 'gl', 'account code', 'saknr'],
      ['account description', 'description', 'gl description']
    ];

    let coaScore = 0;
    coaSignatures.forEach((group) => {
      if (group.some((sig) => headerSet.has(sig) || normHeaders.some((h) => h.includes(sig)))) {
        coaScore++;
      }
    });

    // 4. Signature check for Fiscal Calendar (Omnia specific)
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

    // 5. Signature check for Input Parameters & Parameter Exceptions (Spark specific)
    const paramSignatures = [
      ['engagement name', 'materiality'],
      ['clearly trivial threshold', 'clearly trivial', 'performance materiality'],
      ['unusual accounts', 'unusual gl', 'seldom accounts', 'seldom used'],
      ['users of interest', 'monitored users', 'holiday dates', 'holidays', 'dates of interest'],
      ['unrelated rules', 'unrelated pairs', 'keywords', 'round digits', 'digits', 'debit', 'credit']
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

    if (scores[0].confidence >= 35) {
      return scores[0];
    }

    return { classification: 'UNKNOWN', confidence: scores[0].confidence };
  }

  public static inspectFile(filePath: string, originalName: string, runId: string = 'SYSTEM'): UploadedFileInfo {
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    const fileId = path.basename(filePath);
    const lowerName = originalName.toLowerCase();

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

          // Infer classification by sheet name first
          let sheetClass: DatasetClassification = 'UNKNOWN';
          const lowerSheet = sheetName.toLowerCase().replace(/[\s_-]/g, '');

          if (
            lowerSheet.includes('unusual') ||
            lowerSheet.includes('seldom') ||
            lowerSheet.includes('userofinterest') ||
            lowerSheet.includes('usersofinterest') ||
            lowerSheet.includes('monitoreduser') ||
            lowerSheet.includes('holiday') ||
            lowerSheet.includes('weekend') ||
            lowerSheet.includes('unrelated') ||
            lowerSheet.includes('keyword') ||
            lowerSheet.includes('rounddigit') ||
            lowerSheet.includes('digit') ||
            lowerSheet.includes('param') ||
            lowerSheet.includes('exception') ||
            lowerSheet.includes('inputfile') ||
            lowerSheet.includes('sparkparam')
          ) {
            sheetClass = 'INPUT_PARAMETERS';
          } else if (
            lowerSheet.includes('tbbeg') ||
            lowerSheet.includes('tbend') ||
            lowerSheet === 'beginning' ||
            lowerSheet === 'ending' ||
            lowerSheet.includes('tb') ||
            lowerSheet.includes('trial') ||
            lowerSheet.includes('trialbalance')
          ) {
            sheetClass = 'TRIAL_BALANCE';
          } else if (
            lowerSheet.includes('gl') ||
            lowerSheet.includes('population') ||
            lowerSheet.includes('ledger') ||
            lowerSheet.includes('journal') ||
            lowerSheet.includes('je')
          ) {
            sheetClass = 'GENERAL_LEDGER';
          } else if (lowerSheet.includes('coa') || lowerSheet.includes('chart')) {
            sheetClass = 'COA';
          } else if (lowerSheet.includes('cal') || lowerSheet.includes('fiscal')) {
            sheetClass = 'FISCAL_CALENDAR';
          }

          const headerClass = this.classifyHeaders(headers);
          const finalClass = sheetClass !== 'UNKNOWN' ? sheetClass : headerClass.classification;
          const finalConf = sheetClass !== 'UNKNOWN' ? Math.max(headerClass.confidence, 90) : headerClass.confidence;

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
          // Check if file name indicates a specific dataset
          if (
            lowerName.includes('param') ||
            lowerName.includes('input') ||
            lowerName.includes('exception') ||
            lowerName.includes('unusual') ||
            lowerName.includes('holiday')
          ) {
            info.detectedDataset = 'INPUT_PARAMETERS';
          } else {
            info.detectedDataset = 'UNKNOWN';
          }
          info.confidence = 95;
          info.headers = sheets[0]?.headers || [];
          info.sampleRows = sheets[0]?.sampleRows || [];
        }
      } else if (ext === '.csv' || ext === '.txt') {
        const stat = fs.statSync(filePath);
        // Bounded 64KB chunk read to prevent memory overload on 100MB+ files
        const bufferSize = Math.min(stat.size, 64 * 1024);
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(bufferSize);
        fs.readSync(fd, buffer, 0, bufferSize, 0);
        fs.closeSync(fd);

        let content = buffer.toString('utf-8');
        if (stat.size > bufferSize) {
          const lastNl = Math.max(content.lastIndexOf('\n'), content.lastIndexOf('\r'));
          if (lastNl > 0) content = content.substring(0, lastNl);
        }

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

          // Check filename for parameter files
          let nameClass: DatasetClassification = 'UNKNOWN';
          const cleanFileName = lowerName.replace(/[\s_-]/g, '');
          if (
            cleanFileName.includes('unusual') ||
            cleanFileName.includes('seldom') ||
            cleanFileName.includes('userofinterest') ||
            cleanFileName.includes('usersofinterest') ||
            cleanFileName.includes('monitoreduser') ||
            cleanFileName.includes('holiday') ||
            cleanFileName.includes('weekend') ||
            cleanFileName.includes('unrelated') ||
            cleanFileName.includes('keyword') ||
            cleanFileName.includes('rounddigit') ||
            cleanFileName.includes('param') ||
            cleanFileName.includes('exception') ||
            cleanFileName.includes('inputfile')
          ) {
            nameClass = 'INPUT_PARAMETERS';
          } else if (cleanFileName.includes('tb') || cleanFileName.includes('trialbalance')) {
            nameClass = 'TRIAL_BALANCE';
          } else if (cleanFileName.includes('gl') || cleanFileName.includes('population') || cleanFileName.includes('journal')) {
            nameClass = 'GENERAL_LEDGER';
          } else if (cleanFileName.includes('coa') || cleanFileName.includes('chart')) {
            nameClass = 'COA';
          }

          const detected = this.classifyHeaders(headers);
          info.detectedDataset = nameClass !== 'UNKNOWN' ? nameClass : detected.classification;
          info.confidence = nameClass !== 'UNKNOWN' ? Math.max(detected.confidence, 90) : detected.confidence;
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

  /**
   * Ultra-Intelligent Workflow Auto-Detection Engine.
   * Analyzes all uploaded files, sheets, and headers to accurately distinguish between
   * Spark JET (TB, Population/GL, Parameter Exception Input Files) and
   * Omnia JET (Omnia CDM TB, JE, COA, Fiscal Calendar).
   */
  public static detectWorkflowFamily(
    files: UploadedFileInfo[],
    requestedWorkflow?: WorkflowType
  ): WorkflowRoutingResult {
    let sparkScore = 0;
    let omniaScore = 0;

    const allHeaders: string[] = [];
    const allSheetNames: string[] = [];
    let hasCOASheetOrFile = false;
    let hasSparkTBSheetOrFile = false;
    let hasSparkGLSheetOrFile = false;
    let hasOmniaTBSheetOrFile = false;
    let hasOmniaGLSheetOrFile = false;
    let hasParamSheetOrFile = false;

    // Collect all headers and sheet names
    for (const f of files) {
      const lowerFileName = f.originalName.toLowerCase();

      if (lowerFileName.includes('spark') || lowerFileName.includes('population') || lowerFileName.includes('deloitte_jet')) {
        sparkScore += 30;
      }
      if (lowerFileName.includes('omnia') || lowerFileName.includes('cdm') || lowerFileName.includes('dqc')) {
        omniaScore += 30;
      }

      if (f.sheets && f.sheets.length > 0) {
        for (const s of f.sheets) {
          allSheetNames.push(s.sheetName.toLowerCase());
          allHeaders.push(...s.headers.map((h) => this.normalizeHeader(h)));

          if (s.detectedDataset === 'COA' || s.sheetName.toLowerCase().includes('coa') || s.sheetName.toLowerCase().includes('chart of accounts')) {
            hasCOASheetOrFile = true;
            omniaScore += 45;
          }
          if (s.detectedDataset === 'INPUT_PARAMETERS' || s.sheetName.toLowerCase().includes('unusual') || s.sheetName.toLowerCase().includes('seldom') || s.sheetName.toLowerCase().includes('param') || s.sheetName.toLowerCase().includes('holiday') || s.sheetName.toLowerCase().includes('unrelated')) {
            hasParamSheetOrFile = true;
            sparkScore += 40;
          }
          if (s.detectedDataset === 'TRIAL_BALANCE') {
            const hSet = new Set(s.headers.map((h) => this.normalizeHeader(h)));
            if (hSet.has('entity id') || hSet.has('period end date') || hSet.has('ending balance ec') || hSet.has('group currency gc')) {
              hasOmniaTBSheetOrFile = true;
              omniaScore += 35;
            }
            if (hSet.has('g l') || hSet.has('account subtype') || hSet.has('fs line item') || hSet.has('opening balance') || hSet.has('closing balance')) {
              hasSparkTBSheetOrFile = true;
              sparkScore += 35;
            }
          }
          if (s.detectedDataset === 'GENERAL_LEDGER') {
            const hSet = new Set(s.headers.map((h) => this.normalizeHeader(h)));
            if (hSet.has('entity id') || hSet.has('journal number') || hSet.has('net amount ec') || hSet.has('date effective') || hSet.has('userid entered')) {
              hasOmniaGLSheetOrFile = true;
              omniaScore += 35;
            }
            if (hSet.has('documentno') || hSet.has('amount in local cur') || hSet.has('lcurr') || hSet.has('pstng date') || hSet.has('user name')) {
              hasSparkGLSheetOrFile = true;
              sparkScore += 35;
            }
          }
        }
      } else {
        allHeaders.push(...f.headers.map((h) => this.normalizeHeader(h)));
        if (f.detectedDataset === 'COA') {
          hasCOASheetOrFile = true;
          omniaScore += 45;
        }
        if (f.detectedDataset === 'INPUT_PARAMETERS') {
          hasParamSheetOrFile = true;
          sparkScore += 40;
        }
      }
    }

    const headerSet = new Set(allHeaders);

    // Evaluate Distinctive Spark JET Signatures
    const sparkSignatures = [
      'g l', 'documentno', 'amount in local cur', 'account subtype', 'fs line item',
      'pstng date', 'lcurr', 'user name', 'opening balance', 'closing balance',
      'unusual accounts', 'seldom accounts', 'users of interest', 'unrelated rules'
    ];
    for (const sig of sparkSignatures) {
      if (headerSet.has(sig) || allHeaders.some((h) => h.includes(sig))) {
        sparkScore += 15;
      }
    }

    // Evaluate Distinctive Omnia CDM Signatures
    const omniaSignatures = [
      'entity id', 'journal number', 'journal line number', 'net amount ec',
      'entity currency ec', 'period end date', 'ending balance ec', 'group currency gc',
      'chart of accounts', 'financial statement category', 'financial statement line',
      'date effective', 'userid entered', 'period activity ec'
    ];
    for (const sig of omniaSignatures) {
      if (headerSet.has(sig) || allHeaders.some((h) => h.includes(sig))) {
        omniaScore += 15;
      }
    }

    let resolvedWorkflow: WorkflowType = 'SPARK_JET';
    let confidence = 95;
    let reasoning = '';

    // If explicit requested workflow is passed, prioritize it
    if (requestedWorkflow === 'SPARK_JET' || requestedWorkflow === 'OMNIA_JET') {
      resolvedWorkflow = requestedWorkflow;
      confidence = 99;
      reasoning = requestedWorkflow === 'SPARK_JET'
        ? 'Workflow explicitly designated as Spark JET. Auto-configured for canonical TB/Population schemas and Ex 1-12 parameter exception rules.'
        : 'Workflow explicitly designated as Omnia JET. Auto-configured for 3-file CDM (TB, JE, COA) and 20 Golden DQC integrity rules.';
    } else {
      // Auto-Routing Decision Logic
      if (hasCOASheetOrFile && omniaScore > sparkScore) {
        resolvedWorkflow = 'OMNIA_JET';
        confidence = Math.min(99, Math.max(80, Math.round((omniaScore / (sparkScore + omniaScore || 1)) * 100)));
        reasoning = 'Chart of Accounts dataset and Omnia CDM schema headers detected. Configured for Omnia 3-dataset CDM reconciliation and 20 Golden DQC checks.';
      } else if (hasParamSheetOrFile || sparkScore >= omniaScore) {
        resolvedWorkflow = 'SPARK_JET';
        confidence = Math.min(99, Math.max(80, Math.round((sparkScore / (sparkScore + omniaScore || 1)) * 100)));
        reasoning = 'Spark canonical column headers and parameter exception input structure detected. Configured for 4-phase field mapping, IR 1-4 integrity tests, and 12 parameter exceptions.';
      } else {
        resolvedWorkflow = 'SPARK_JET';
        confidence = 85;
        reasoning = 'Separate Trial Balance and General Ledger datasets detected. Configured for standard Spark JET audit testing.';
      }
    }

    return {
      workflow: resolvedWorkflow,
      confidence,
      reasoning,
      sparkScore,
      omniaScore,
      detectedDatasetsSummary: {
        hasSparkTB: hasSparkTBSheetOrFile,
        hasSparkGL: hasSparkGLSheetOrFile,
        hasOmniaTB: hasOmniaTBSheetOrFile,
        hasOmniaGL: hasOmniaGLSheetOrFile,
        hasCOA: hasCOASheetOrFile,
        hasParameterFiles: hasParamSheetOrFile,
        totalFiles: files.length,
        totalSheets: allSheetNames.length,
      }
    };
  }

  /**
   * Ultra-intelligent Spark Parameter Parser.
   * Scans uploaded files & Excel sheets for parameter exception inputs (Ex 1 - 12)
   * and automatically populates the SparkJetParameters data model.
   */
  public static parseSparkParameters(files: UploadedFileInfo[], existingParams?: SparkJetParameters): SparkJetParameters {
    const params: SparkJetParameters = {
      selectedExceptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      ex1UnusualAccounts: existingParams?.ex1UnusualAccounts || [],
      ex2SeldomAccounts: existingParams?.ex2SeldomAccounts || [],
      ex5UsersOfInterest: existingParams?.ex5UsersOfInterest || [],
      ex7DatesOfInterest: existingParams?.ex7DatesOfInterest || [],
      ex8RoundDigits: existingParams?.ex8RoundDigits || ['00', '000', '0000'],
      ex10Keywords: existingParams?.ex10Keywords || ['plug', 'fudge', 'error', 'round', 'adjust', 'suspense', 'misc', 'reclass'],
      ex12UnrelatedRules: existingParams?.ex12UnrelatedRules || [],
      controlSampleCount: existingParams?.controlSampleCount || 25,
      ...existingParams,
    };

    for (const fileInfo of files) {
      if (!fileInfo.filePath || !fs.existsSync(fileInfo.filePath)) continue;
      const ext = path.extname(fileInfo.filePath).toLowerCase();

      if (ext === '.xlsx' || ext === '.xls') {
        try {
          const workbook = xlsx.readFile(fileInfo.filePath, { cellDates: true, dense: true });
          for (const sheetName of workbook.SheetNames) {
            const lowerSheet = sheetName.toLowerCase().replace(/[\s_-]/g, '');
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
            if (!rows || rows.length === 0) continue;

            // 1. Unusual Accounts (Ex 1)
            if (lowerSheet.includes('unusual') || lowerSheet === 'ex1' || lowerSheet.includes('unusualaccount')) {
              const accounts = new Set<string>(params.ex1UnusualAccounts || []);
              rows.forEach((r) => {
                const val = Object.values(r).find((v) => v !== null && v !== undefined && String(v).trim() !== '');
                if (val) accounts.add(String(val).trim());
              });
              params.ex1UnusualAccounts = Array.from(accounts);
            }

            // 2. Seldom Accounts (Ex 2)
            if (lowerSheet.includes('seldom') || lowerSheet === 'ex2' || lowerSheet.includes('seldomused')) {
              const accounts = new Set<string>(params.ex2SeldomAccounts || []);
              rows.forEach((r) => {
                const val = Object.values(r).find((v) => v !== null && v !== undefined && String(v).trim() !== '');
                if (val) accounts.add(String(val).trim());
              });
              params.ex2SeldomAccounts = Array.from(accounts);
            }

            // 3. Users of Interest (Ex 5)
            if (lowerSheet.includes('user') || lowerSheet === 'ex5' || lowerSheet.includes('userofinterest') || lowerSheet.includes('monitoreduser')) {
              const users = new Set<string>(params.ex5UsersOfInterest || []);
              rows.forEach((r) => {
                const val = Object.values(r).find((v) => v !== null && v !== undefined && String(v).trim() !== '');
                if (val) users.add(String(val).trim());
              });
              params.ex5UsersOfInterest = Array.from(users);
            }

            // 4. Holiday / Dates of Interest (Ex 6 / Ex 7)
            if (lowerSheet.includes('holiday') || lowerSheet.includes('weekend') || lowerSheet === 'ex6' || lowerSheet === 'ex7' || lowerSheet.includes('dateofinterest')) {
              const dates = new Set<string>(params.ex7DatesOfInterest || []);
              rows.forEach((r) => {
                const val = Object.values(r).find((v) => v !== null && v !== undefined && String(v).trim() !== '');
                if (val) {
                  const iso = DataNormalizer.parseDateToISO(String(val).trim());
                  if (iso) dates.add(iso);
                  else dates.add(String(val).trim());
                }
              });
              params.ex7DatesOfInterest = Array.from(dates);
            }

            // 5. Keywords (Ex 10 / Ex 8)
            if (lowerSheet.includes('keyword') || lowerSheet === 'ex10' || lowerSheet === 'ex8keywords') {
              const kwSet = new Set<string>(params.ex10Keywords || []);
              rows.forEach((r) => {
                const val = Object.values(r).find((v) => v !== null && v !== undefined && String(v).trim() !== '');
                if (val) kwSet.add(String(val).trim().toLowerCase());
              });
              params.ex10Keywords = Array.from(kwSet);
            }

            // 6. Round Digits (Ex 8)
            if (lowerSheet.includes('digit') || lowerSheet.includes('rounddigit')) {
              const digitSet = new Set<string>(params.ex8RoundDigits || []);
              rows.forEach((r) => {
                const val = Object.values(r).find((v) => v !== null && v !== undefined && String(v).trim() !== '');
                if (val) digitSet.add(String(val).trim());
              });
              params.ex8RoundDigits = Array.from(digitSet);
            }

            // 7. Unrelated Rules (Ex 12 / Ex 9)
            if (lowerSheet.includes('unrelated') || lowerSheet === 'ex12' || lowerSheet === 'ex9unrelated') {
              const existingRules = params.ex12UnrelatedRules || [];
              const newRules: Array<{ debit: string; credit: string; debitFSLine?: string; creditFSLine?: string }> = [...existingRules];
              rows.forEach((r) => {
                const keys = Object.keys(r);
                const debitKey = keys.find((k) => k.toLowerCase().includes('dr') || k.toLowerCase().includes('debit'));
                const creditKey = keys.find((k) => k.toLowerCase().includes('cr') || k.toLowerCase().includes('credit'));
                if (debitKey && creditKey && r[debitKey] && r[creditKey]) {
                  newRules.push({
                    debit: String(r[debitKey]).trim(),
                    credit: String(r[creditKey]).trim(),
                    debitFSLine: String(r[debitKey]).trim(),
                    creditFSLine: String(r[creditKey]).trim(),
                  });
                }
              });
              params.ex12UnrelatedRules = newRules;
            }
          }
        } catch (err) {
          LogService.log('WARN', 'PARAM_PARSER', `Error parsing Excel parameter file ${fileInfo.originalName}: ${err}`);
        }
      } else if (ext === '.csv' || ext === '.txt') {
        try {
          const content = fs.readFileSync(fileInfo.filePath, 'utf-8');
          const records = parse(content, { skip_empty_lines: true, relax_column_count: true, trim: true });
          if (records && records.length > 1) {
            const headers = (records[0] as string[]).map((h) => h.toLowerCase().trim());
            const lowerName = fileInfo.originalName.toLowerCase();

            if (lowerName.includes('unusual')) {
              const accounts = new Set<string>(params.ex1UnusualAccounts || []);
              for (let i = 1; i < records.length; i++) {
                const rowVal = records[i][0]?.trim();
                if (rowVal) accounts.add(rowVal);
              }
              params.ex1UnusualAccounts = Array.from(accounts);
            } else if (lowerName.includes('seldom')) {
              const accounts = new Set<string>(params.ex2SeldomAccounts || []);
              for (let i = 1; i < records.length; i++) {
                const rowVal = records[i][0]?.trim();
                if (rowVal) accounts.add(rowVal);
              }
              params.ex2SeldomAccounts = Array.from(accounts);
            } else if (lowerName.includes('user')) {
              const users = new Set<string>(params.ex5UsersOfInterest || []);
              for (let i = 1; i < records.length; i++) {
                const rowVal = records[i][0]?.trim();
                if (rowVal) users.add(rowVal);
              }
              params.ex5UsersOfInterest = Array.from(users);
            } else if (lowerName.includes('holiday') || lowerName.includes('date')) {
              const dates = new Set<string>(params.ex7DatesOfInterest || []);
              for (let i = 1; i < records.length; i++) {
                const rowVal = records[i][0]?.trim();
                if (rowVal) {
                  const iso = DataNormalizer.parseDateToISO(rowVal);
                  dates.add(iso || rowVal);
                }
              }
              params.ex7DatesOfInterest = Array.from(dates);
            } else if (lowerName.includes('unrelated')) {
              const existingRules = params.ex12UnrelatedRules || [];
              const newRules = [...existingRules];
              for (let i = 1; i < records.length; i++) {
                const debitVal = records[i][0]?.trim();
                const creditVal = records[i][1]?.trim();
                if (debitVal && creditVal) {
                  newRules.push({ debit: debitVal, credit: creditVal, debitFSLine: debitVal, creditFSLine: creditVal });
                }
              }
              params.ex12UnrelatedRules = newRules;
            }
          }
        } catch (err) {
          LogService.log('WARN', 'PARAM_PARSER', `Error parsing CSV parameter file ${fileInfo.originalName}: ${err}`);
        }
      }
    }

    return params;
  }
}
