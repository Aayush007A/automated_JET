export type WorkflowType = 'JET' | 'SPARK_JET' | 'OMNIA_JET';
export type PipelineEngine = 'PYTHON' | 'PYSPARK' | 'SCALA_SPARK';
export type RunStatus = 'CREATED' | 'UPLOADING' | 'DETECTED' | 'MAPPING' | 'CONFIGURED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'WARNING';

export interface RoutingDiagnostic {
  detectedProfile: 'CSV_DUAL_STREAM' | 'EXCEL_MULTISHEET' | 'HYBRID_INGESTION' | 'UNKNOWN';
  inferredPipeline: 'SPARK_JET' | 'OMNIA_JET';
  confidence: number;
  reasoning: string;
  detectedSheets?: string[];
  detectedFilesSummary: {
    tbFound: boolean;
    glFound: boolean;
    coaFound: boolean;
    totalFiles: number;
    totalSheets: number;
  };
  capabilities: string[];
}

export type DatasetClassification = 
  | 'TRIAL_BALANCE'
  | 'GENERAL_LEDGER'
  | 'POPULATION'
  | 'COA'
  | 'FISCAL_CALENDAR'
  | 'INPUT_PARAMETERS'
  | 'UNKNOWN';

export type MatchType = 'EXACT' | 'NORMALIZED' | 'ALIAS' | 'FUZZY' | 'MANUAL';

export interface FieldMappingItem {
  standardField: string;
  sourceField: string;
  matchType: MatchType;
  confidence: number;
  status: 'MATCHED' | 'UNMATCHED' | 'OPTIONAL' | 'OVERRIDDEN';
  required: boolean;
  requirementLevel?: 'Required' | 'Optional';
  fieldType?: 'Text' | 'Numeric' | 'Date/Time';
  description?: string;
  guidance?: string;
}

export interface DetectedFileSheet {
  sheetName: string;
  rowCount: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  detectedDataset: DatasetClassification;
  confidence: number;
  mappings: FieldMappingItem[];
}

export interface UploadedFileInfo {
  fileId: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extension: string;
  detectedDataset: DatasetClassification;
  confidence: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  sheets?: DetectedFileSheet[];
  status: 'READY' | 'PROCESSING' | 'ERROR';
  errorMessage?: string;
}

export interface SparkJetParameters {
  fiscalYear?: number;
  startDate?: string;
  endDate?: string;
  financialYearEnd?: string;
  engagementName?: string;
  currencyCode?: string;
  materiality?: number;
  performanceMateriality?: number;
  clearlyTrivialThreshold?: number;
  
  selectedExceptions?: number[];
  runControlSamples?: boolean;

  ex1UnusualAccounts?: string[];
  ex2SeldomAccounts?: string[];
  ex3RevenueAccounts?: string[];
  ex3RevenueDebitsThreshold?: number;
  ex3QuarterStartDate?: string;
  ex3QuarterEndDate?: string;
  ex4FewPostingsUserThreshold?: number;
  ex5UsersOfInterest?: string[];
  ex6ClosingEntriesBeforeDays?: number;
  ex6ClosingEntriesAfterDays?: number;
  ex6ClosingDate?: string;
  ex6Frequency?: string;
  ex7DatesOfInterest?: string[];
  ex8RoundDigits?: string[];
  ex9DuplicateCountThreshold?: number;
  ex9DuplicateAmountThreshold?: number;
  ex10Keywords?: string[];
  ex11Frequency?: string;
  ex11ClosingDate?: string;
  ex11DaysAfterClosing?: number;
  ex12UnrelatedRules?: Array<{ debit: string; credit: string; debitFSLine?: string; creditFSLine?: string }>;
  controlSampleCount?: number;
}

export interface OmniaExclusions {
  excludeZeroLines?: boolean;
  systemEntryTypes?: string[];
  excludedAccounts?: string[];
  excludedEntryTypes?: string[];
  excludedUsers?: string[];
  rationales?: Record<string, string>;
}

export interface OmniaTestItemConfig {
  enabled: boolean;
  threshold?: number;
  rationale?: string;
  [key: string]: any;
}

export interface OmniaTestsConfig {
  seldomAccounts?: OmniaTestItemConfig & { thresholdCount?: number; customAccounts?: string[] };
  keywords?: OmniaTestItemConfig & { keywordList?: string[] };
  closingEntries?: OmniaTestItemConfig & { closingDate?: string; daysAfter?: number; daysBefore?: number };
  unusualAccounts?: OmniaTestItemConfig & { thresholdCount?: number };
  roundAmounts?: OmniaTestItemConfig & { roundMultiples?: string[]; recurringDigits?: string[] };
  duplicateEntries?: OmniaTestItemConfig & { countThreshold?: number; amountThreshold?: number };
  datesOfInterest?: OmniaTestItemConfig & { dates?: string[]; checkWeekends?: boolean };
  debitsToRevenue?: OmniaTestItemConfig & { revenueAccounts?: string[] };
  usersOfInterest?: OmniaTestItemConfig & { userList?: string[]; fewPostingsThreshold?: number };
  benfordAnalysis?: OmniaTestItemConfig;
  controlSample?: OmniaTestItemConfig & { sampleCount?: number };
}

export interface TickmarkItem {
  id: string;
  code?: string;
  title: string;
  explanation?: string;
  rationale?: string;
  entryIds?: string[];
  appliedEntryIds?: string[];
  sendForEvaluation: boolean;
  createdAt?: string;
  createdDate?: string;
  createdBy?: string;
}

export interface EvaluationItem {
  id?: string;
  entryId: string;
  documentNo?: string;
  additionalEvidenceNeeded?: boolean;
  additionalEvidenceRequired?: boolean;
  evidenceDescription?: string;
  conclusion: 'APPROPRIATE' | 'INAPPROPRIATE' | 'EXPLAINED' | 'PENDING';
  auditorNotes?: string;
  conclusionNotes?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface BenfordDigitStat {
  digit: number;
  count: number;
  actualPct: number;
  expectedPct: number;
  variancePct?: number;
  diffPct?: number;
  isAnomaly: boolean;
}

export interface BenfordSummary {
  conformityScore: number;
  conformityLevel?: 'HIGH' | 'ACCEPTABLE' | 'NON_CONFORMING';
  totalTransactionsTested?: number;
  totalAnalyzed?: number;
  madScore?: number;
  digitStats?: BenfordDigitStat[];
  firstDigitDistribution?: BenfordDigitStat[];
}

export interface OmniaJetParameters {
  engagementName?: string;
  fiscalYear: number;
  fiscalYearEnd: string;
  periodEndDateFormat?: string;
  testingPeriodStart: string;
  testingPeriodEnd: string;
  currency: 'Entity Currency' | 'Group Currency' | 'Both';
  entityCurrencyCode?: string;
  groupCurrencyCode?: string;
  materiality?: number;
  excludeZeroLines?: boolean;
  decimalSeparator?: 'Period' | 'Comma' | 'None';
  isStandardFormula?: string;
  financialStatementCategoryFormula?: string;
  dqcToggles?: {
    toggleTransactionTypeChecks?: boolean;
    toggleUserChecks?: boolean;
    toggleObservationChecks?: boolean;
  };
  exclusions?: OmniaExclusions;
  testsConfig?: OmniaTestsConfig;
  tickmarks?: TickmarkItem[];
  evaluations?: EvaluationItem[];
  controlSampleCount?: number;
}

export interface RunConfig {
  runId: string;
  workflow: WorkflowType;
  engine: PipelineEngine;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
  files: UploadedFileInfo[];
  datasetMap: {
    tbFileId?: string;
    tbSheetName?: string;
    glFileId?: string;
    glSheetName?: string;
    coaFileId?: string;
    coaSheetName?: string;
    calendarFileId?: string;
    parametersFileId?: string;
  };
  fieldMappings: {
    tb?: FieldMappingItem[];
    gl?: FieldMappingItem[];
    coa?: FieldMappingItem[];
  };
  sparkParameters?: SparkJetParameters;
  omniaParameters?: OmniaJetParameters;
}

export interface OutputItem {
  id: string;
  name: string;
  type: 'csv' | 'parquet' | 'xlsx' | 'txt' | 'zip' | 'json';
  category: 'CHECKPOINT' | 'INTEGRITY' | 'PARAMETER' | 'RECONCILIATION' | 'DQC' | 'CONTROL_TOTAL' | 'CONTROL_SAMPLE' | 'MASTER' | 'LOG';
  sizeBytes: number;
  path: string;
  relativePath: string;
  downloadUrl: string;
  description: string;
  rowCount?: number;
}

export interface RunSummary {
  runId: string;
  workflow: WorkflowType;
  engine: PipelineEngine;
  status: RunStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  durationMs?: number;
  progress: number;
  currentStage?: string;
  errorMessage?: string;
  config?: RunConfig;
  engagementName?: string;
  
  totalInputRows?: {
    tb?: number;
    gl?: number;
    coa?: number;
  };
  
  tbCheckpointsSummary?: {
    passed: number;
    failed: number;
    warnings?: number;
    totalBalanceZero: boolean;
    debitCreditEqual: boolean;
    openingSum?: number;
    closingSum?: number;
  };
  glCheckpointsSummary?: {
    totalNetBalance: number;
    balancedJournalsCount: number;
    unbalancedJournalsCount: number;
    totalJournals: number;
    totalLines: number;
  };
  integritySummary?: {
    test1TBNotInPopCount: number;
    test2ActivityMismatchCount: number;
    test3PopNotInTBCount: number;
    test4SeldomAccountsCount: number;
  };
  parameterSummary?: Record<string, number>;
  controlSampleCount?: number;
  
  benfordSummary?: BenfordSummary;
  exclusionsSummary?: {
    totalInputLines: number;
    excludedZeroCount: number;
    excludedSystemCount: number;
    excludedAccountsCount: number;
    excludedUsersCount: number;
    totalExcludedLines: number;
    remainingRefinedLines: number;
  };
  tickmarkSummary?: {
    totalTickmarks: number;
    totalEntriesResolved: number;
    totalEntriesPending: number;
  };
  riskBreakdown?: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    cleanEntries: number;
  };
  flaggedSummary?: {
    totalFlagged?: number;
    highRiskCount?: number;
    medRiskCount?: number;
    lowRiskCount?: number;
  };
  testOutputsSummary?: Record<string, number>;

  reconciliationSummary?: {
    totalAccounts: number;
    reconciledAccounts: number;
    unreconciledAccounts: number;
    totalBeginningBalance: number;
    totalEndingBalance: number;
    totalJEActivity: number;
    totalTrialActivity: number;
    totalVariance: number;
  };
  dqcSummary?: {
    totalErrors: number;
    totalWarnings: number;
    totalObservations: number;
    checksPassed: number;
    checksFailed: number;
  };
  controlTotalsSummary?: {
    totalDebit: number;
    totalCredit: number;
    netAmount: number;
    periodCount: number;
    userCount: number;
  };
  
  outputs: OutputItem[];
}

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'user';
  email: string;
}

export interface LogEntry {
  timestamp: string;
  runId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  component: string;
  message: string;
  raw?: string;
}

export interface SchemaConstraintItem {
  id: string;
  dataset: 'Trial Balance' | 'General Ledger' | 'Chart of Accounts';
  name: string;
  severity: 'Required' | 'Optional';
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'PENDING';
  details: string;
  guidance?: string;
  technicalField?: string;
  failedRowsCount?: number;
  fileName?: string;
}

export interface AutoCleanConstraintsReport {
  cleanedRowsCount: { tb?: number; gl?: number; coa?: number };
  constraintsPassed: boolean;
  totalConstraints: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  constraints: SchemaConstraintItem[];
  warnings: string[];
}

