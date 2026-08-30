import { AuthService } from '../services/authService';
import { FileDetector } from '../services/fileDetector';
import { FieldMapper } from '../services/fieldMapper';
import { DataNormalizer } from '../services/dataNormalizer';
import { RunManager } from '../services/runManager';
import { SSEManager } from '../utils/sseHelper';
import { EventEmitter } from 'events';

describe('JET Backend Core Services Unit Tests', () => {
  afterEach(() => {
    SSEManager.reset();
  });

  describe('AuthService', () => {
    it('should authenticate admin with correct credentials', () => {
      const result = AuthService.login('admin', 'Admin2026');
      expect(result).not.toBeNull();
      expect(result?.user.username).toBe('admin');
      expect(result?.user.role).toBe('admin');
      expect(result?.token).toBeDefined();

      const decoded = AuthService.verifyToken(result!.token);
      expect(decoded).not.toBeNull();
      expect(decoded?.username).toBe('admin');
    });

    it('should reject invalid password', () => {
      const result = AuthService.login('admin', 'WrongPass123');
      expect(result).toBeNull();
    });
  });

  describe('FileDetector & Classification', () => {
    it('should accurately classify Trial Balance headers', () => {
      const tbHeaders = ['G/L', 'Description', 'Account Subtype', 'Opening Balance', 'Debit', 'Credit', 'Closing Balance', 'FS Line Item'];
      const result = FileDetector.classifyHeaders(tbHeaders);
      expect(result.classification).toBe('TRIAL_BALANCE');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should accurately classify General Ledger / Population headers', () => {
      const glHeaders = ['G_L', 'DocumentNo', 'Type', 'Entry_Date', 'Pstng_Date', 'Amount_in_local_cur', 'Text', 'User_name'];
      const result = FileDetector.classifyHeaders(glHeaders);
      expect(result.classification).toBe('GENERAL_LEDGER');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should accurately classify Chart of Accounts headers', () => {
      const coaHeaders = ['Chart of Accounts', 'Account Number', 'Description', 'Financial Statement Category', 'FS Line Item'];
      const result = FileDetector.classifyHeaders(coaHeaders);
      expect(result.classification).toBe('COA');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should accurately route dual-stream and multi-sheet Spark JET files to SPARK_JET', () => {
      const mockSparkFiles: any[] = [
        {
          originalName: 'Trial_Balance.csv',
          headers: ['G/L', 'Description', 'Account Subtype', 'Opening Balance', 'Closing Balance'],
          detectedDataset: 'TRIAL_BALANCE'
        },
        {
          originalName: 'Population.csv',
          headers: ['G/L', 'DocumentNo', 'Type', 'Entry Date', 'Pstng Date', 'Amount in local cur.', 'LCurr', 'User name'],
          detectedDataset: 'GENERAL_LEDGER'
        },
        {
          originalName: 'Input_Files.xlsx',
          detectedDataset: 'INPUT_PARAMETERS',
          sheets: [
            { sheetName: 'Unusual Accounts', headers: ['G/L', 'Description'], detectedDataset: 'INPUT_PARAMETERS' },
            { sheetName: 'Users of Interest', headers: ['User name'], detectedDataset: 'INPUT_PARAMETERS' }
          ]
        }
      ];

      const routing = FileDetector.detectWorkflowFamily(mockSparkFiles);
      expect(routing.workflow).toBe('SPARK_JET');
      expect(routing.confidence).toBeGreaterThanOrEqual(90);
    });

    it('should accurately route Omnia CDM workbooks to OMNIA_JET', () => {
      const mockOmniaFiles: any[] = [
        {
          originalName: 'Deloitte_Omnia_Engagement.xlsx',
          sheets: [
            { sheetName: 'Trial Balance', headers: ['entity_id', 'account_number', 'period_end_date', 'ending_balance_ec', 'chart_of_accounts'], detectedDataset: 'TRIAL_BALANCE' },
            { sheetName: 'Journal Entries', headers: ['entity_id', 'journal_number', 'account_number', 'date_effective', 'net_amount_ec', 'userid_entered'], detectedDataset: 'GENERAL_LEDGER' },
            { sheetName: 'COA', headers: ['chart_of_accounts', 'account_number', 'financial_statement_category', 'financial_statement_line'], detectedDataset: 'COA' }
          ]
        }
      ];

      const routing = FileDetector.detectWorkflowFamily(mockOmniaFiles);
      expect(routing.workflow).toBe('OMNIA_JET');
      expect(routing.confidence).toBeGreaterThanOrEqual(85);
    });
  });

  describe('FieldMapper Engine', () => {
    it('should map source aliases and exact matches to standard Spark JET fields', () => {
      const sourceHeaders = ['GL Code', 'DocumentNo', 'Pstng Date', 'Amount in local cur', 'Username'];
      const mappings = FieldMapper.mapFields(sourceHeaders, 'GENERAL_LEDGER', 'SPARK_JET');
      
      const glMap = mappings.find(m => m.standardField === 'G/L');
      expect(glMap).toBeDefined();
      expect(glMap?.sourceField).toBe('GL Code');

      const docMap = mappings.find(m => m.standardField === 'DocumentNo');
      expect(docMap).toBeDefined();
      expect(docMap?.sourceField).toBe('DocumentNo');

      const amtMap = mappings.find(m => m.standardField === 'Amount in local cur.');
      expect(amtMap).toBeDefined();
      expect(amtMap?.sourceField).toBe('Amount in local cur');
    });

    it('should map source aliases for Omnia JET fields', () => {
      const sourceHeaders = ['GL Code', 'DocumentNo', 'Amount in local cur'];
      const mappings = FieldMapper.mapFields(sourceHeaders, 'GENERAL_LEDGER', 'OMNIA_JET');
      const glMap = mappings.find(m => m.standardField === 'account_number');
      expect(glMap).toBeDefined();
      expect(glMap?.sourceField).toBe('GL Code');
    });

    it('should NEVER return COA standard fields for SPARK_JET workflow', () => {
      const coaFields = FieldMapper.getStandardFieldsForDataset('COA', 'SPARK_JET');
      expect(coaFields).toHaveLength(0);
    });
  });

  describe('DataNormalizer Engine', () => {
    it('should correctly parse negative numbers in parentheses and thousands separators', () => {
      expect(DataNormalizer.parseNumber('(6,45,04,072)')).toBe(-64504072);
      expect(DataNormalizer.parseNumber('1,09,52,612.50')).toBe(10952612.5);
      expect(DataNormalizer.parseNumber('-123,456.78')).toBe(-123456.78);
      expect(DataNormalizer.parseNumber('-')).toBe(0.0);
      expect(DataNormalizer.parseNumber('N/A')).toBe(0.0);
    });

    it('should parse various date formats to ISO YYYY-MM-DD', () => {
      expect(DataNormalizer.parseDateToISO('03-Nov-25')).toBe('2025-11-03');
      expect(DataNormalizer.parseDateToISO('31-Dec-2025')).toBe('2025-12-31');
      expect(DataNormalizer.parseDateToISO('20251103')).toBe('2025-11-03');
      expect(DataNormalizer.parseDateToISO('2025-11-03')).toBe('2025-11-03');
    });
  });

  describe('RunManager', () => {
    it('should initialize run, create directory structure and status.json', () => {
      const { runId, config } = RunManager.initializeRun('SPARK_JET', 'usr_test', 'Tester', 'PYTHON');
      expect(runId).toMatch(/^JET-\d{8}-\d{3}$/);
      expect(config.workflow).toBe('SPARK_JET');

      const status = RunManager.getRunStatus(runId);
      expect(status).not.toBeNull();
      expect(status?.status).toBe('CREATED');
    });
  });

  describe('SSEManager', () => {
    it('should register client, emit progress events, and clean up on close', () => {
      const mockRes: any = new EventEmitter();
      mockRes.write = jest.fn();

      const runId = 'JET-20260824-TEST';
      SSEManager.addClient(runId, mockRes);
      expect(SSEManager.getClientCount(runId)).toBe(1);

      SSEManager.emitProgress({
        runId,
        workflow: 'SPARK_JET',
        stage: 'INGESTION',
        progress: 25,
        message: 'Reading TB...',
        timestamp: new Date().toISOString(),
      });

      expect(mockRes.write).toHaveBeenCalled();
      const writtenData = mockRes.write.mock.calls[0][0];
      expect(writtenData).toContain('"stage":"INGESTION"');
      expect(writtenData).toContain('"progress":25');

      // Simulate connection close
      mockRes.emit('close');
      expect(SSEManager.getClientCount(runId)).toBe(0);
    });
  });
});
