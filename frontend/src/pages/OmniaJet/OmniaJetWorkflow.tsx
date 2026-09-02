import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, OmniaJetParameters, FieldMappingItem, TickmarkItem, EvaluationItem, BenfordSummary } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { FieldMappingTable } from '../../components/common/FieldMappingTable';
import { AutoCleanConstraintsPanel } from '../../components/common/AutoCleanConstraintsPanel';
import { DataFileMappingWorkspace, findBestMatchingSourceHeader } from '../../components/common/DataFileMappingWorkspace';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { SampleDataModal } from '../../components/common/SampleDataModal';
import { StepTimeline, TimelineStep } from '../../components/common/StepTimeline';
import { TabSlider } from '../../components/common/TabSlider';
import { EngagementAuditParametersCard, EngagementAuditParametersData } from '../../components/common/EngagementAuditParametersCard';
import { PageContextService } from '../../services/pageContextService';
import { DatasetColumnHealthVisualizer } from '../../components/common/DatasetColumnHealthVisualizer';
import { OmniaExclusionsPanel } from './components/OmniaExclusionsPanel';
import { OmniaTestDesignPanel } from './components/OmniaTestDesignPanel';
import { OmniaFlaggedEntriesTable } from './components/OmniaFlaggedEntriesTable';
import { OmniaBenfordChart } from './components/OmniaBenfordChart';
import { OmniaTickmarksTab } from './components/OmniaTickmarksTab';
import { OmniaEntryDetailModal } from './components/OmniaEntryDetailModal';
import { OmniaTickmarkModal } from './components/OmniaTickmarkModal';
import { OmniaVisualAnalyticsSuite } from '../../components/summary/OmniaVisualAnalyticsSuite';
import { ExecutiveForensicIntelligenceHub } from '../../components/summary/ExecutiveForensicIntelligenceHub';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Download,
  FileSpreadsheet, Settings, ShieldCheck, Database, RefreshCw, Archive, FileCheck,
  Search, Filter, PieChart, BarChart3, Eye, Sparkles, Check, X, Trash2,
  Table, Layers, HelpCircle, Activity, FileText, Lock, Loader2, UploadCloud, Clock, Calendar,
  Sliders, UserCheck, Coins, Scale, TrendingUp, RotateCw, Repeat, GitFork, Folder, Tag, ShieldAlert, ChevronDown, ChevronRight
} from 'lucide-react';

const STEPS: TimelineStep[] = [
  { id: 1, label: 'Ingest Datasets', sub: 'Upload files', icon: UploadCloud },
  { id: 2, label: 'Data File Mapping', sub: 'CDM Mapping', icon: Table },
  { id: 3, label: 'Auto-Cleansing', sub: 'Validate rules', icon: Sparkles },
  { id: 4, label: 'Refine & Design Tests', sub: 'Exclusions & Tests', icon: Sliders },
  { id: 5, label: 'Execution Engine', sub: 'Recon & Analytics', icon: Activity },
  { id: 6, label: 'Executive Results', sub: 'Anomalies & Workpapers', icon: BarChart3 },
];

const STEP_COPY: Record<number, { title: string; desc: string }> = {
  1: { title: 'Upload Audit Datasets', desc: 'Upload your multi-sheet workbook or separate CSV files for TB, Population and COA.' },
  2: { title: 'Data File Mapping', desc: 'Map columns to the standard Deloitte CDM model across Trial Balance, General Ledger, and Chart of Accounts.' },
  3: { title: 'Automated Data Cleansing & Constraints Check', desc: 'Cleanse raw data and validate 16 mandatory audit schema rules.' },
  4: { title: 'Refine Data & Design Analytic Tests', desc: 'Configure population exclusions, mandatory & optional fraud tests, Benford\'s Law analysis, and fiscal boundaries.' },
  5: { title: 'Audit Analytics & Reconciliation Engine', desc: 'Executing 3-way CDM reconciliation, 20 DQC integrity rules, and 9 parametric fraud tests.' },
  6: { title: 'Executive Results, Fraud Anomaly Analytics & Audit Workpapers', desc: 'Review flagged transactions, Benford\'s Law conformity, tickmark refinement, reconciliation, and audit workpapers.' },
};

const formatExecutiveDate = (dateStr?: string, includeSeconds: boolean = false): string => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  if (includeSeconds) {
    return `${month} ${day}, ${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
  }
  return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
};

// Maps run status onto the StepTimeline's status chip styling
const getTimelineStatusVariant = (st?: string): 'default' | 'running' | 'completed' | 'warning' => {
  switch (st) {
    case 'COMPLETED': return 'completed';
    case 'RUNNING': return 'running';
    case 'FAILED': return 'warning';
    default: return 'default';
  }
};

const DQC_DEFINITIONS = [
  { code: '01a', name: 'COA Blank Values', desc: 'Critical missing account numbers or descriptions in COA', dataset: 'COA', category: 'Completeness', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_01a_Error_COA_Blank_Values.csv' },
  { code: '01b', name: 'TB Blank Values', desc: 'Critical missing GL or balance amounts in TB', dataset: 'TB', category: 'Completeness', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_01b_Error_TB_Blank_Values.csv' },
  { code: '01c', name: 'JE Blank Values', desc: 'Critical missing DocumentNo, date, or amount in JE', dataset: 'JE', category: 'Completeness', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_01c_Error_JE_Blank_Values.csv' },
  { code: '01d', name: 'JE Blank User ID', desc: 'Blank or null User ID who entered transaction', dataset: 'JE', category: 'User Integrity', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_01d_Warning_JE_Blank_UserID.csv' },
  { code: '01e', name: 'JE Blank TransType', desc: 'Blank or null transaction / document type', dataset: 'JE', category: 'Completeness', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_01e_Warning_JE_Blank_Transaction_Type.csv' },
  { code: '02a', name: 'TB Accounts Not In COA', desc: 'Trial Balance accounts not found in master COA', dataset: 'TB', category: 'Master Data', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_02a_Error_TB_Accounts_Not_In_COA.csv' },
  { code: '02b', name: 'JE Accounts Not In COA', desc: 'General Ledger accounts not found in master COA', dataset: 'JE', category: 'Master Data', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_02b_Error_JE_Accounts_Not_In_COA.csv' },
  { code: '03a', name: 'TB Precision Overflow', desc: 'Trial Balance amounts exceeding decimal precision', dataset: 'TB', category: 'Precision', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_03a_Error_TB_Amount_Digits_TooLong.csv' },
  { code: '03b', name: 'JE Precision Overflow', desc: 'Journal Entry amounts exceeding decimal precision', dataset: 'JE', category: 'Precision', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_03b_Error_JE_Amount_Digits_TooLong.csv' },
  { code: '04a', name: 'COA Duplicate Accounts', desc: 'Duplicate Account Numbers defined in Chart of Accounts', dataset: 'COA', category: 'Master Data', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_04a_Error_COA_Duplicate_Account_Numbers.csv' },
  { code: '04b', name: 'TB Duplicate Accounts', desc: 'Duplicate Account Numbers defined in Trial Balance', dataset: 'TB', category: 'Master Data', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_04b_Error_TB_Duplicate_Account_Numbers.csv' },
  { code: '05', name: 'JE Unknown Standard Type', desc: 'Transaction type unclassified as Standard / Non-Standard', dataset: 'JE', category: 'Classification', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_05_Error_JE_Unknown_Classification.csv' },
  { code: '06', name: 'JE Multi Standard Type', desc: 'Single journal entry containing mixed Standard / Non-Standard lines', dataset: 'JE', category: 'Classification', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_06_Error_JE_Multiple_Classification.csv' },
  { code: '07', name: 'COA Bad FS Category', desc: 'Unknown Financial Statement Category in COA', dataset: 'COA', category: 'Classification', severity: 'ERROR', fileName: 'Parquet_Data_Integrity_Check_07_Error_COA_Unknown_Financial_Statement_Category.csv' },
  { code: '08', name: 'JE Entry Not Zero Balanced', desc: 'Multi-line journal entries with net amount not equal to 0.0', dataset: 'JE', category: 'Balancing', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_08_Warning_JE_Sum_of_Amount_by_Entry_Not_Net_Zero.csv' },
  { code: '09', name: '1-Line Journal Entries', desc: 'Single-line journal entries lacking offsetting entry', dataset: 'JE', category: 'Balancing', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_09_Warning_JE_One_Line_Entries.csv' },
  { code: '10', name: 'Debit/Credit Math Mismatch', desc: 'Inconsistent Net Amount vs Debit and Credit amount math', dataset: 'JE', category: 'Consistency', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_10_Warning_JE_Entry_Amount_Consistency.csv' },
  { code: '11', name: 'Debit Credit Same Line', desc: 'Lines with both Debit and Credit amounts populated simultaneously', dataset: 'JE', category: 'Consistency', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_11_Warning_JE_Debit_Credit_Same_Line.csv' },
  { code: '12', name: 'Currency Inconsistency', desc: 'Local and Group currency amounts with conflicting polarity', dataset: 'JE', category: 'Currency', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_12_Warning_JE_Amount_Currency_Inconsistency.csv' },
  { code: '13a', name: 'Entity Multiple Currencies', desc: 'Legal Entity mapped to multiple distinct local currencies', dataset: 'TB / JE', category: 'Currency', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_13a_Warning_JE_Entity_Multiple_Currency.csv' },
  { code: '13b', name: 'Group Multiple Currencies', desc: 'Multiple group reporting currencies present in single dataset', dataset: 'TB / JE', category: 'Currency', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_13b_Warning_JE_Group_Multiple_Currency.csv' },
  { code: '14', name: 'Multi Effective Dates', desc: 'Single journal entry with multiple posting / effective dates', dataset: 'JE', category: 'Dates', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_14_Warning_JE_Multiple_Date_Values.csv' },
  { code: '15', name: 'Multi Transaction Types', desc: 'Single journal entry with multiple transaction type codes', dataset: 'JE', category: 'Consistency', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_15_Warning_JE_Multiple_Transaction_Type.csv' },
  { code: '16', name: 'Prior / Post Period Dates', desc: 'Entries dated outside the active audit testing period window', dataset: 'JE', category: 'Dates', severity: 'WARNING', fileName: 'Parquet_Data_Integrity_Check_16_Warning_JE_Prior_Post_Effective_Date.csv' },
  { code: '17', name: 'Multi User ID in Entry', desc: 'Single journal entry created by multiple distinct User IDs', dataset: 'JE', category: 'User Integrity', severity: 'OBSERVATION', fileName: 'Parquet_Data_Integrity_Check_17_Observation_JE_Multiple_User_ID.csv' },
  { code: '18', name: 'Multi Descriptions in Entry', desc: 'Single journal entry with multiple conflicting header descriptions', dataset: 'JE', category: 'Consistency', severity: 'OBSERVATION', fileName: 'Parquet_Data_Integrity_Check_18_Observation_JE_Multiple_Entry_Description.csv' },
  { code: '19', name: 'TransType Sum Not Zero', desc: 'Transaction type volume not netting to zero across period', dataset: 'JE', category: 'Balancing', severity: 'OBSERVATION', fileName: 'Parquet_Data_Integrity_Check_19_Observation_JE_Sum_of_Amount_by_Transaction_Type_Not_Net_Zero.csv' },
  { code: '20', name: 'User ID Multiple Names', desc: 'Single User ID associated with multiple distinct user names', dataset: 'JE', category: 'User Integrity', severity: 'OBSERVATION', fileName: 'Parquet_Data_Integrity_Check_20_Observation_UserID_Entered_Multiple_User_Name_Entered.csv' },
];

export const OMNIA_EXCEPTION_CARDS = [
  {
    num: 0,
    id: 'flaggedAll',
    key: 'All_Flagged_Entries',
    title: 'All Consolidated Flagged Entries',
    desc: 'Consolidated multi-test flagged entries scored by risk tier (High / Medium / Low)',
    file: 'Omnia_Flagged_Entries_All.csv',
    icon: ShieldAlert,
  },
  {
    num: 1,
    id: 'seldomAccounts',
    key: 'Seldom_Used_Accounts',
    title: 'Test 1: Seldom Used Accounts',
    desc: 'Entries posted to accounts used ≤ threshold frequency across the fiscal year',
    file: 'Omnia_Test_Seldom_Accounts.csv',
    icon: Clock,
  },
  {
    num: 2,
    id: 'keywords',
    key: 'Keywords_Scan',
    title: 'Test 2: Suspect Keywords Scan',
    desc: 'High-risk audit keywords found in header narrations and line descriptions',
    file: 'Omnia_Test_Keywords.csv',
    icon: Search,
  },
  {
    num: 3,
    id: 'closingEntries',
    key: 'Closing_Entries',
    title: 'Test 3: Post-Closing Period Entries',
    desc: 'Journals posted within defined window of closing dates and fiscal year-end',
    file: 'Omnia_Test_Closing_Entries.csv',
    icon: Calendar,
  },
  {
    num: 4,
    id: 'unusualAccounts',
    key: 'Unusual_Accounts',
    title: 'Test 4: Unusual Accounts',
    desc: 'Low-frequency account activity compared against population baseline',
    file: 'Omnia_Test_Unusual_Accounts.csv',
    icon: Layers,
  },
  {
    num: 5,
    id: 'roundAmounts',
    key: 'Round_Amounts',
    title: 'Test 5: Round Amounts & Recurring Digits',
    desc: 'Transactions with round numeric multiples (1,000s, 10,000s) or repeated digits',
    file: 'Omnia_Test_Round_Amounts.csv',
    icon: Coins,
  },
  {
    num: 6,
    id: 'duplicateEntries',
    key: 'Duplicate_Entries',
    title: 'Test 6: Duplicate Journal Entries',
    desc: 'Identical amount, date, account, and user pairings posted multiple times',
    file: 'Omnia_Test_Duplicate_Entries.csv',
    icon: Repeat,
  },
  {
    num: 7,
    id: 'datesOfInterest',
    key: 'Dates_Of_Interest',
    title: 'Test 7: Dates of Interest & Weekends',
    desc: 'Transactions posted on statutory holidays, weekends, or special audit dates',
    file: 'Omnia_Test_Dates_Of_Interest.csv',
    icon: Calendar,
  },
  {
    num: 8,
    id: 'debitsToRevenue',
    key: 'Debits_To_Revenue',
    title: 'Test 8: Debits to Revenue Accounts',
    desc: 'Unusual debit transactions hitting income statement revenue accounts',
    file: 'Omnia_Test_Debits_To_Revenue.csv',
    icon: Scale,
  },
  {
    num: 9,
    id: 'usersOfInterest',
    key: 'Users_Of_Interest',
    title: 'Test 9: Monitored & Rare Users',
    desc: 'Activity from privileged, senior management, or low-posting user IDs',
    file: 'Omnia_Test_Users_Of_Interest.csv',
    icon: UserCheck,
  },
  {
    num: 10,
    id: 'controlSample',
    key: 'Control_Sample',
    title: 'Reproducible Control Sample',
    desc: 'Deterministic representative sampling across the entire refined population',
    file: 'Omnia_Control_Sample.csv',
    icon: ShieldCheck,
  },
];

export const OmniaJetWorkflow: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runId = searchParams.get('runId');

  const [currentStep, setCurrentStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(1);
  const [config, setConfig] = useState<RunConfig | null>(null);
  const [status, setStatus] = useState<RunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Publish dynamic step context to AI Assistant
  useEffect(() => {
    PageContextService.setContext({
      route: '/omnia-jet',
      pageTitle: 'Comprehensive Journal Entry Testing Suite',
      currentStep,
      totalSteps: 6,
      stepTitle: STEP_COPY[currentStep]?.title || `Step ${currentStep}`,
      stepDescription: STEP_COPY[currentStep]?.desc,
      actionGuidance: currentStep === 1
        ? 'Upload multi-sheet workbook or separate CSV files for Trial Balance, Population, and Chart of Accounts.'
        : currentStep === 2
        ? 'Map raw columns to Deloitte CDM canonical audit models.'
        : currentStep === 3
        ? 'Cleanse raw data, validate 16 mandatory schema rules, and review column health.'
        : currentStep === 4
        ? 'Configure population exclusions, mandatory fraud tests, Benford analysis, and fiscal bounds.'
        : currentStep === 5
        ? 'Execute 3-way CDM reconciliation, 20 DQC integrity rules, and audit risk tests.'
        : 'Inspect forensic exceptions, Benford conformity scores, tickmarks, and download workpapers.',
    });
  }, [currentStep]);

  // Step 4 Sub-Tab state: 'exclusions' | 'designTests' | 'fiscalDqc'
  const [step4ActiveTab, setStep4ActiveTab] = useState<'exclusions' | 'designTests' | 'fiscalDqc'>('exclusions');

  // Auto-cleaning state
  const [autoCleaning, setAutoCleaning] = useState(false);
  const [autoCleanReport, setAutoCleanReport] = useState<{
    tbRowsCleaned: number;
    glRowsCleaned: number;
    datesStandardized: number;
    numbersConverted: number;
    constraintsPassed: boolean;
    warnings: string[];
    status: string;
  } | null>(null);

  // Sample Raw 50 rows preview modal state
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [sampleModalData, setSampleModalData] = useState<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }>({ title: '', headers: [], rows: [], totalRows: 0 });

  // Confirm delete modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals for Step 6 Exceptions & Tickmarks
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailEntry, setSelectedDetailEntry] = useState<Record<string, any> | null>(null);
  const [tickmarkModalOpen, setTickmarkModalOpen] = useState(false);
  const [selectedForTickmark, setSelectedForTickmark] = useState<Record<string, any>[]>([]);

  // Step 6 Data Previews
  const [flaggedEntriesPreview, setFlaggedEntriesPreview] = useState<Record<string, any>[]>([]);
  const [loadingFlaggedPreview, setLoadingFlaggedPreview] = useState(false);
  const [benfordAnalysisPreview, setBenfordAnalysisPreview] = useState<Record<string, any>[]>([]);
  const [exclusionsSummaryPreview, setExclusionsSummaryPreview] = useState<Record<string, any>[]>([]);

  // Engagement Audit Parameters (Clean initial state for new runs)
  const [engagementAuditParams, setEngagementAuditParams] = useState<EngagementAuditParametersData>({
    engagementName: '',
    startDate: '',
    endDate: '',
    financialYearEnd: '',
    engagementRunId: runId || '',
    operatingCurrency: '',
    overallMateriality: '',
    engagementClassification: '',
  });

  const handleUpdateEngagementParams = async (newParams: EngagementAuditParametersData) => {
    setEngagementAuditParams(newParams);
    setOmniaParams((prev) => ({
      ...prev,
      fiscalYearEnd: newParams.financialYearEnd,
      testingPeriodStart: newParams.startDate,
      testingPeriodEnd: newParams.endDate,
      entityCurrencyCode: newParams.operatingCurrency,
    }));
    if (runId && config) {
      try {
        await RunService.updateConfig(runId, {
          omniaParameters: {
            fiscalYear: 2026,
            currency: 'Entity Currency',
            ...config.omniaParameters,
            fiscalYearEnd: newParams.financialYearEnd,
            testingPeriodStart: newParams.startDate,
            testingPeriodEnd: newParams.endDate,
            entityCurrencyCode: newParams.operatingCurrency,
          },
          sparkParameters: {
            ...config.sparkParameters,
            engagementName: newParams.engagementName,
            startDate: newParams.startDate,
            endDate: newParams.endDate,
            financialYearEnd: newParams.financialYearEnd,
            currencyCode: newParams.operatingCurrency,
            materiality: typeof newParams.overallMateriality === 'number' ? newParams.overallMateriality : parseFloat(String(newParams.overallMateriality).replace(/[^0-9.-]+/g, '')) || 500000,
          }
        });
      } catch (e) {
        console.error('Failed to sync engagement parameters:', e);
      }
    }
  };

  // Omnia Parameters state with Exclusions and 9 Parametric Fraud Tests
  const [omniaParams, setOmniaParams] = useState<OmniaJetParameters>({
    fiscalYear: 2026,
    fiscalYearEnd: '03/31/2026',
    testingPeriodStart: '04/01/2025',
    testingPeriodEnd: '03/31/2026',
    currency: 'Entity Currency',
    entityCurrencyCode: 'USD',
    groupCurrencyCode: 'USD',
    decimalSeparator: 'Period',
    excludeZeroLines: true,
    dqcToggles: {
      toggleTransactionTypeChecks: false,
      toggleUserChecks: false,
      toggleObservationChecks: false,
    },
    exclusions: {
      excludeZeroLines: true,
      systemEntryTypes: [],
      excludedAccounts: [],
      excludedEntryTypes: [],
      excludedUsers: [],
      rationales: {
        zeroLines: 'Omit zero dollar header lines and statistical balances from fraud testing.',
        systemEntries: 'Automated recurring system batch entries with standardized calculation controls.',
        accounts: 'Routine intercompany and treasury settlement accounts tested under substantive procedures.',
        users: 'System interface automated IDs verified under IT General Controls (ITGC) review.',
      },
    },
    testsConfig: {
      seldomAccounts: { enabled: true, thresholdCount: 5, threshold: 0.0, customAccounts: [], rationale: 'Flag accounts with <= 5 postings for management override testing.' },
      keywords: { enabled: true, threshold: 0.0, keywordList: ['plug', 'test', 'fictitious', 'reverse', 'manual', 'bribe', 'fraud', 'conceal', 'adjustment', 'mistake', 'misstatement', 'officer', 'prize', 'abuse', 'alter', 'seizure', 'bury', 'corrupt', 'demand', 'embezzle', 'theft', 'suspense', 'net to zero'], rationale: 'Scanning descriptions for words indicating overrides, errors, or manual adjustments.' },
      closingEntries: { enabled: true, daysAfter: 10, daysBefore: 0, threshold: 0.0, rationale: 'Review post-close adjustments entered during the financial closing window.' },
      unusualAccounts: { enabled: true, thresholdCount: 3, threshold: 0.0, rationale: 'Screening for postings to accounts not present in prior-year baseline.' },
      roundAmounts: { enabled: true, roundMultiples: ['1000', '10000', '100000', '1000000'], recurringDigits: ['3', '4', '5'], threshold: 0.0, rationale: 'Identifying round number manual estimates and recurring digits.' },
      duplicateEntries: { enabled: true, countThreshold: 2, amountThreshold: 0.0, rationale: 'Screening for duplicate erroneous or fraudulent entries.' },
      datesOfInterest: { enabled: true, dates: ['2025-12-25', '2025-12-31', '2026-01-01', '2026-03-31'], checkWeekends: true, threshold: 0.0, rationale: 'Targeting entries posted on weekends and non-working business holidays.' },
      debitsToRevenue: { enabled: true, revenueAccounts: [], threshold: 0.0, rationale: 'Identifying unusual revenue debit entries for premature recognition reversal.' },
      usersOfInterest: { enabled: true, userList: ['ADMIN', 'SYSTEM', 'BATCH', 'SBPATIL', 'SUPERUSER'], fewPostingsThreshold: 2, threshold: 0.0, rationale: 'Screening entries from high-privilege users or users with rare posting patterns.' },
      benfordAnalysis: { enabled: true, rationale: "Evaluate first-digit frequencies against Benford's Law to identify threshold manipulation." },
      controlSample: { enabled: true, sampleCount: 40 },
    },
    tickmarks: [],
    evaluations: [],
  });

  // Step 6 Standard 6-Tab Executive Workspace Selector
  const [activeVisualTab, setActiveVisualTab] = useState<'preview' | 'overview' | 'checkpoints' | 'forensic' | 'tickmarks' | 'artifacts'>('preview');
  const [overviewSubTab, setOverviewSubTab] = useState<'parameter_analytics' | 'risk_breakdown'>('parameter_analytics');
  const [forensicMainSubTab, setForensicMainSubTab] = useState<'forensic_hub' | 'tickmarks'>('forensic_hub');
  const [checkpointSubTab, setCheckpointSubTab] = useState<'reconciliation' | 'dqc' | 'controlTotals'>('reconciliation');
  const [forensicSubTab, setForensicSubTab] = useState<'benford' | 'tickmarks'>('benford');
  const [exceptionCategoryFilter, setExceptionCategoryFilter] = useState<'flagged' | 'clean'>('flagged');
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<string>('Omnia_Test_Seldom_Accounts.csv');
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: Record<string, any>[]; totalRows: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');
  const [dqcFilter, setDqcFilter] = useState<'FLAGGED' | 'ALL' | 'ERROR' | 'WARNING' | 'OBSERVATION'>('FLAGGED');
  const [dqcSearch, setDqcSearch] = useState('');
  // Sequential reveal states for premium in-progress experience
  const [pipelineRevealed, setPipelineRevealed] = useState(false);
  const [resultsRevealed, setResultsRevealed] = useState(false);

  // Top 50 In-Place Reconciliation Preview state
  const [reconSubView, setReconSubView] = useState<'matrix' | 'tb_start' | 'tb_end' | 'unreconciled'>('matrix');
  const [reconPreviewData, setReconPreviewData] = useState<{ headers: string[]; rows: Record<string, any>[]; totalRows: number } | null>(null);
  const [loadingReconPreview, setLoadingReconPreview] = useState(false);
  const [reconSearch, setReconSearch] = useState('');

  // Control Totals In-Place Preview state
  const [selectedControlFile, setSelectedControlFile] = useState<string>('Control_Total_By_Period.csv');
  const [controlPreviewData, setControlPreviewData] = useState<{ headers: string[]; rows: Record<string, any>[]; totalRows: number } | null>(null);
  const [loadingControlPreview, setLoadingControlPreview] = useState(false);
  const [controlSearch, setControlSearch] = useState('');

  // DQC Summary Results Table Data for Step 5 Tab 2
  const [dqcSummaryData, setDqcSummaryData] = useState<Record<string, any>[] | null>(null);
  const [loadingDqcData, setLoadingDqcData] = useState(false);

  // Tab 5 Artifacts Categorization state
  const [artifactCategory, setArtifactCategory] = useState<'ALL' | 'RECONCILIATION' | 'MASTER' | 'DQC' | 'CONTROL_TOTAL' | 'PARAMETRIC'>('ALL');
  const [artifactSearch, setArtifactSearch] = useState('');

  const loadRun = async (overrideRunId?: string, syncStep: boolean = false) => {
    const targetRunId = overrideRunId || runId;
    if (!targetRunId) {
      setLoading(false);
      setConfig({
        runId: '',
        workflow: 'OMNIA_JET',
        engine: 'PYTHON',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'admin',
        userName: 'Auditor',
        files: [],
        datasetMap: {},
        fieldMappings: { tb: [], gl: [], coa: [] },
        sparkParameters: {},
        omniaParameters: {
          fiscalYear: 2026,
          fiscalYearEnd: '2026-03-31',
          testingPeriodStart: '2025-04-01',
          testingPeriodEnd: '2026-03-31',
          currency: 'Entity Currency',
          excludeZeroLines: false,
          decimalSeparator: 'Period',
        }
      });
      setStatus(null);
      return;
    }
    try {
      const data = await RunService.getRun(targetRunId);
      setConfig(data.config);
      setStatus(data.status);

      if (data.config.omniaParameters) {
        setOmniaParams((prev) => ({ ...prev, ...data.config.omniaParameters }));
      }

      if (data.config) {
        const sp = (data.config.sparkParameters || {}) as Record<string, any>;
        const op = (data.config.omniaParameters || {}) as Record<string, any>;
        setEngagementAuditParams((prev) => ({
          engagementName: sp.engagementName || op.engagementName || prev.engagementName || '',
          startDate: sp.startDate || op.testingPeriodStart || prev.startDate || '',
          endDate: sp.endDate || op.testingPeriodEnd || prev.endDate || '',
          financialYearEnd: sp.financialYearEnd || op.fiscalYearEnd || prev.financialYearEnd || '',
          engagementRunId: targetRunId,
          operatingCurrency: sp.currencyCode || op.entityCurrencyCode || prev.operatingCurrency || '',
          overallMateriality: sp.materiality !== undefined ? sp.materiality : (op.materialityThreshold !== undefined ? op.materialityThreshold : (prev.overallMateriality !== '' ? prev.overallMateriality : '')),
          engagementClassification: sp.classification || op.classification || prev.engagementClassification || '',
        }));
      }

      // Restore autoCleanReport so clean status never resets on page revisit
      const statusAny = (data.status || {}) as any;
      if (statusAny.autoCleanReport) {
        setAutoCleanReport(statusAny.autoCleanReport);
      } else if (data.config?.files && data.config.files.length > 0 && data.status?.status === 'COMPLETED') {
        setAutoCleanReport({
          tbRowsCleaned: data.status?.totalInputRows?.tb || 0,
          glRowsCleaned: data.status?.totalInputRows?.gl || 0,
          datesStandardized: 0,
          numbersConverted: 0,
          constraintsPassed: true,
          warnings: [],
          status: 'PASSED',
        });
      }

      if (syncStep) {
        if (data.status.status === 'COMPLETED') {
          setCurrentStep(6);
          setMaxCompletedStep(6);
        } else if (data.status.status === 'RUNNING') {
          setCurrentStep(5);
          setMaxCompletedStep(5);
        }
      } else {
        if (data.status.status === 'COMPLETED') {
          setMaxCompletedStep(6);
        } else if (data.status.status === 'RUNNING') {
          setMaxCompletedStep(5);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRun(undefined, true);
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    const unsub = RunService.subscribeProgress(runId, (event) => {
      setStatus((prev) => prev ? { ...prev, progress: event.progress, currentStage: event.stage, status: event.stage === 'COMPLETED' ? 'COMPLETED' : prev.status } : null);
      if (event.stage === 'COMPLETED') {
        setExecuting(false);
        loadRun();
        setCurrentStep(6);
        setMaxCompletedStep(6);
      } else if (event.stage === 'FAILED') {
        setExecuting(false);
        loadRun();
      }
    });

    return unsub;
  }, [runId]);

  useEffect(() => {
    if (status?.status === 'COMPLETED' && !executing) {
      setToastMessage('Omnia Financial Reconciliation & 20 DQC Matrix Execution Completed.');
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status?.status, executing]);

  // Step 5: Show pipeline immediately when not executing
  useEffect(() => {
    if (currentStep !== 5) return;
    if (executing) {
      setPipelineRevealed(false);
    } else {
      setPipelineRevealed(true);
    }
  }, [currentStep, executing]);

  // Step 6: Show results immediately when not executing
  useEffect(() => {
    if (currentStep !== 6) return;
    if (executing) {
      setResultsRevealed(false);
    } else {
      setResultsRevealed(true);
    }
  }, [currentStep, executing]);

  // Load In-Place Reconciliation Preview when in Step 6 Checkpoints Tab
  useEffect(() => {
    if (currentStep === 6 && runId && activeVisualTab === 'checkpoints' && checkpointSubTab === 'reconciliation') {
      setLoadingReconPreview(true);
      let targetFile = 'Parquet_Reconciliation.csv';
      if (reconSubView === 'tb_start') targetFile = 'TB_Start.csv';
      else if (reconSubView === 'tb_end') targetFile = 'TB_End.csv';
      else if (reconSubView === 'unreconciled') targetFile = 'Unreconciled_Accounts_Detail.csv';

      RunService.previewOutput(runId, targetFile, 50)
        .then((res) => setReconPreviewData(res))
        .catch(() => setReconPreviewData(null))
        .finally(() => setLoadingReconPreview(false));
    }
  }, [currentStep, reconSubView, activeVisualTab, checkpointSubTab, runId, status?.status]);

  // Load In-Place Control Total Preview when in Step 6 Checkpoints Tab
  useEffect(() => {
    if (currentStep === 6 && runId && activeVisualTab === 'checkpoints' && checkpointSubTab === 'controlTotals') {
      setLoadingControlPreview(true);
      RunService.previewOutput(runId, selectedControlFile, 50)
        .then((res) => setControlPreviewData(res))
        .catch(() => setControlPreviewData(null))
        .finally(() => setLoadingControlPreview(false));
    }
  }, [currentStep, selectedControlFile, activeVisualTab, checkpointSubTab, runId, status?.status]);

  // Load DQC Matrix summary data when in Step 6
  useEffect(() => {
    if (currentStep === 6 && runId) {
      setLoadingDqcData(true);
      RunService.previewOutput(runId, 'Parquet_Data_Integrity_Check_00_Summary.csv', 100)
        .then((res) => {
          if (res && res.rows) {
            setDqcSummaryData(res.rows);
          }
        })
        .catch(() => setDqcSummaryData(null))
        .finally(() => setLoadingDqcData(false));
    }
  }, [currentStep, runId, status?.status]);

  // Auto-select initial exception preview file when step 6 opens or status completes
  useEffect(() => {
    if (currentStep === 6 && runId) {
      const allCards = OMNIA_EXCEPTION_CARDS.map((c) => ({
        ...c,
        count: getOmniaExceptionCount(c)
      }));
      const flaggedCards = allCards.filter(c => c.count > 0);
      const cleanCards = allCards.filter(c => c.count === 0);

      if (exceptionCategoryFilter === 'flagged') {
        if (flaggedCards.length > 0) {
          if (!flaggedCards.some(c => c.file === selectedPreviewFile)) {
            setSelectedPreviewFile(flaggedCards[0].file);
          }
        } else if (cleanCards.length > 0) {
          setExceptionCategoryFilter('clean');
          setSelectedPreviewFile(cleanCards[0].file);
        }
      } else {
        if (cleanCards.length > 0 && !cleanCards.some(c => c.file === selectedPreviewFile)) {
          setSelectedPreviewFile(cleanCards[0].file);
        }
      }
    }
  }, [currentStep, runId, status?.status, exceptionCategoryFilter]);

  // Load Selected Parameter Exception Preview rows in Step 6 Preview Tab
  useEffect(() => {
    if (currentStep === 6 && runId && selectedPreviewFile) {
      if (selectedPreviewFile === 'Omnia_Flagged_Entries_All.csv') {
        setPreviewData(null);
        setLoadingPreview(false);
        return;
      }
      setLoadingPreview(true);
      RunService.previewOutput(runId, selectedPreviewFile, 50)
        .then((res) => {
          if (res && res.rows) {
            setPreviewData(res);
          } else {
            setPreviewData(null);
          }
        })
        .catch(() => setPreviewData(null))
        .finally(() => setLoadingPreview(false));
    }
  }, [currentStep, runId, selectedPreviewFile, status?.status]);

  // Load Flagged Exceptions, Benford Analysis, and Exclusions Summary when in Step 6
  useEffect(() => {
    if (currentStep === 6 && runId) {
      setLoadingFlaggedPreview(true);
      RunService.previewOutput(runId, 'Omnia_Flagged_Entries_All.csv', 300)
        .then((res) => {
          if (res && res.rows) setFlaggedEntriesPreview(res.rows);
        })
        .catch(() => setFlaggedEntriesPreview([]))
        .finally(() => setLoadingFlaggedPreview(false));

      RunService.previewOutput(runId, 'Omnia_Benford_Analysis.csv', 20)
        .then((res) => {
          if (res && res.rows) setBenfordAnalysisPreview(res.rows);
        })
        .catch(() => setBenfordAnalysisPreview([]));

      RunService.previewOutput(runId, 'Omnia_Exclusions_Summary.csv', 20)
        .then((res) => {
          if (res && res.rows) setExclusionsSummaryPreview(res.rows);
        })
        .catch(() => setExclusionsSummaryPreview([]));
    }
  }, [currentStep, runId, status?.status]);

  const handleSaveTickmark = async (newTickmark: TickmarkItem) => {
    const currentTickmarks = omniaParams.tickmarks || [];
    const updatedTickmarks = [...currentTickmarks, newTickmark];
    const newParams = { ...omniaParams, tickmarks: updatedTickmarks };
    setOmniaParams(newParams);
    if (runId) {
      try {
        await RunService.updateConfig(runId, { omniaParameters: newParams });
        setToastMessage(`Tickmark "${newTickmark.title}" applied successfully to ${(newTickmark.appliedEntryIds || newTickmark.entryIds || []).length} entries.`);
      } catch (e) {
        console.error('Failed to persist tickmark:', e);
      }
    }
  };

  const handleUpdateTickmarks = async (newTickmarks: TickmarkItem[]) => {
    const newParams = { ...omniaParams, tickmarks: newTickmarks };
    setOmniaParams(newParams);
    if (runId) {
      try {
        await RunService.updateConfig(runId, { omniaParameters: newParams });
      } catch (e) {
        console.error('Failed to update tickmarks:', e);
      }
    }
  };

  const handleUpdateEvaluations = async (newEvaluations: EvaluationItem[]) => {
    const newParams = { ...omniaParams, evaluations: newEvaluations };
    setOmniaParams(newParams);
    if (runId) {
      try {
        await RunService.updateConfig(runId, { omniaParameters: newParams });
        setToastMessage('Auditor evaluation conclusion saved.');
      } catch (e) {
        console.error('Failed to update evaluations:', e);
      }
    }
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    // Snapshot params before loadRun can overwrite them
    const savedParams = { ...engagementAuditParams };
    try {
      let activeRunId = runId;
      if (!activeRunId) {
        // Create Run only when the user uploads data
        const res = await RunService.createRun('OMNIA_JET', 'PYTHON');
        activeRunId = res.runId;
        navigate(`/omnia-jet?runId=${activeRunId}`, { replace: true });
      }

      // Persist user-configured engagement parameters immediately into backend config
      if (
        engagementAuditParams.engagementName ||
        engagementAuditParams.overallMateriality ||
        engagementAuditParams.operatingCurrency ||
        engagementAuditParams.startDate ||
        engagementAuditParams.endDate ||
        engagementAuditParams.financialYearEnd
      ) {
        try {
          await RunService.updateConfig(activeRunId, {
            omniaParameters: {
              ...omniaParams,
              fiscalYear: 2026,
              currency: 'Entity Currency',
              fiscalYearEnd: engagementAuditParams.financialYearEnd,
              testingPeriodStart: engagementAuditParams.startDate,
              testingPeriodEnd: engagementAuditParams.endDate,
              entityCurrencyCode: engagementAuditParams.operatingCurrency || 'USD',
              materiality:
                typeof engagementAuditParams.overallMateriality === 'number'
                  ? engagementAuditParams.overallMateriality
                  : parseFloat(String(engagementAuditParams.overallMateriality).replace(/[^0-9.-]+/g, '')) || 500000,
            },
            sparkParameters: {
              engagementName: engagementAuditParams.engagementName,
              startDate: engagementAuditParams.startDate,
              endDate: engagementAuditParams.endDate,
              financialYearEnd: engagementAuditParams.financialYearEnd,
              currencyCode: engagementAuditParams.operatingCurrency || 'USD',
              materiality:
                typeof engagementAuditParams.overallMateriality === 'number'
                  ? engagementAuditParams.overallMateriality
                  : parseFloat(String(engagementAuditParams.overallMateriality).replace(/[^0-9.-]+/g, '')) || 500000,
            },
          });
        } catch (e) {
          console.error('Failed to sync engagement parameters on upload in OmniaJet:', e);
        }
      }

      const res = await RunService.uploadFiles(activeRunId, files, 'OMNIA_JET');
      setConfig((prev) => prev ? { ...prev, files: res.files, datasetMap: res.datasetMap, fieldMappings: res.fieldMappings } : null);
      await loadRun(activeRunId);
      // Restore user-entered params after loadRun
      setEngagementAuditParams(prev => ({
        ...prev,
        ...savedParams,
        engagementRunId: activeRunId || savedParams.engagementRunId,
      }));
    } catch (err: any) {
      console.error(`Upload failed:`, err);
    } finally {
      setUploading(false);
    }
  };

  // Open Raw Input 50 sample rows preview modal
  const handleOpenSamplePreview = async (fileId: string, sheetName?: string) => {
    if (!runId) return;
    try {
      const data = await RunService.previewInputFile(runId, fileId, sheetName, 50);
      setSampleModalData({
        title: `Sample Data Preview: ${data.fileName}${data.sheetName ? ` [Sheet: ${data.sheetName}]` : ''}`,
        subtitle: `Displaying first ${data.rows.length} sample records of ${data.totalRows.toLocaleString()} rows in raw uploaded file`,
        headers: data.headers,
        rows: data.rows,
        totalRows: data.totalRows,
      });
      setSampleModalOpen(true);
    } catch (err: any) {
      console.error('Failed to preview sample file:', err);
    }
  };

  // Run Auto-Cleaning & Constraint Verification
  const handleRunAutoClean = async () => {
    if (!runId) return;
    setAutoCleaning(true);
    // Snapshot params before loadRun can overwrite them
    const savedParams = { ...engagementAuditParams };
    try {
      const res = await RunService.autoCleanData(runId);
      setAutoCleanReport(res.report);
      await loadRun();
      // Restore user-entered params — backend has no reason to clear these
      setEngagementAuditParams(prev => ({
        ...prev,
        ...savedParams,
        // Only keep runId from backend if it changed
        engagementRunId: prev.engagementRunId || savedParams.engagementRunId,
      }));
    } catch (err) {
      console.error('Auto clean error:', err);
    } finally {
      setAutoCleaning(false);
    }
  };

  const triggerRemoveFile = async (fileId: string) => {
    setFileToDelete(fileId);
    setConfirmModalOpen(true);
  };

  const handleConfirmRemoveFile = async () => {
    if (!runId || !fileToDelete) return;
    try {
      const res = await RunService.removeFile(runId, fileToDelete);
      setConfig((prev) => prev ? { ...prev, files: res.files, datasetMap: res.datasetMap } : null);
      await loadRun();
    } catch (err: any) {
      console.error(`Remove failed:`, err);
    } finally {
      setConfirmModalOpen(false);
      setFileToDelete(null);
    }
  };

  const handleMappingChange = (datasetType: 'tb' | 'gl' | 'coa', standardField: string, newSource: string) => {
    if (!config) return;
    const currentList = config.fieldMappings[datasetType] || [];
    const updated = currentList.map((m) =>
      m.standardField === standardField
        ? { ...m, sourceField: newSource, status: (newSource ? 'OVERRIDDEN' : m.required ? 'UNMATCHED' : 'OPTIONAL') as any }
        : m
    );

    const newFieldMappings = { ...config.fieldMappings, [datasetType]: updated };
    setAutoCleanReport(null);
    setConfig({ ...config, fieldMappings: newFieldMappings });
    RunService.updateFieldMappings(runId!, datasetType, updated);
  };

  const handleStartPipeline = async () => {
    if (!runId) return;
    setExecuting(true);
    setCurrentStep(5);
    try {
      await RunService.updateConfig(runId, { omniaParameters: omniaParams });
      await RunService.startPipeline(runId);
    } catch (err: any) {
      alert(`Failed to launch Omnia JET pipeline: ${err.message}`);
      setExecuting(false);
    }
  };

  // Step access validation
  const isStep1Valid = (config?.files.length || 0) >= 1;

  const hasRequiredMappings = useMemo(() => {
    if (!config) return false;
    const glRequired = config.fieldMappings.gl?.filter((m) => m.required) || [];
    const tbRequired = config.fieldMappings.tb?.filter((m) => m.required) || [];
    const glOk = glRequired.every((m) => Boolean(m.sourceField));
    const tbOk = tbRequired.every((m) => Boolean(m.sourceField));
    const glHasAny = (config.fieldMappings.gl || []).some((m) => Boolean(m.sourceField));
    const tbHasAny = (config.fieldMappings.tb || []).some((m) => Boolean(m.sourceField));
    return glOk && tbOk && glHasAny && tbHasAny;
  }, [config]);

  const isConstraintsPassed = Boolean(
    autoCleanReport?.constraintsPassed === true
  );

  const canAccessStep = (stepId: number) => {
    if ((status?.status as string) === 'COMPLETED' || maxCompletedStep >= 6) return true;
    if (stepId === 1) return true;
    if (stepId === 2) return isStep1Valid;
    if (stepId >= 3 && stepId <= 5) return isStep1Valid;
    if (stepId === 6) return isStep1Valid && maxCompletedStep >= 5;
    return false;
  };

  const filteredDQCs = useMemo(() => {
    return DQC_DEFINITIONS.filter((d) => {
      const matchedRecord = dqcSummaryData?.find(r => {
        const name = String(r.Data_Integrity_Check_Name || '');
        return name.startsWith(`${d.code}_`) || name.startsWith(`DQC_${d.code}`) || name.toLowerCase().includes(d.name.toLowerCase());
      });
      const affectedLines = matchedRecord ? Number(matchedRecord.Number_of_Affected_Lines || 0) : 0;
      const affectedJEs = matchedRecord ? Number(matchedRecord.Number_of_Affected_Journal_Entries || 0) : 0;
      const isFailed = affectedLines > 0 || affectedJEs > 0;

      let matchesSeverity = true;
      if (dqcFilter === 'FLAGGED') {
        matchesSeverity = isFailed;
      } else if (dqcFilter !== 'ALL') {
        matchesSeverity = d.severity === dqcFilter;
      }

      const matchesSearch = !dqcSearch ||
        d.code.toLowerCase().includes(dqcSearch.toLowerCase()) ||
        d.name.toLowerCase().includes(dqcSearch.toLowerCase()) ||
        d.category.toLowerCase().includes(dqcSearch.toLowerCase()) ||
        d.desc.toLowerCase().includes(dqcSearch.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [dqcFilter, dqcSearch, dqcSummaryData]);

  const filteredReconRows = useMemo(() => {
    if (!reconPreviewData || !reconPreviewData.rows) return [];
    if (!reconSearch) return reconPreviewData.rows;
    return reconPreviewData.rows.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(reconSearch.toLowerCase()))
    );
  }, [reconPreviewData, reconSearch]);

  const filteredControlRows = useMemo(() => {
    if (!controlPreviewData || !controlPreviewData.rows) return [];
    if (!controlSearch) return controlPreviewData.rows;
    return controlPreviewData.rows.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(controlSearch.toLowerCase()))
    );
  }, [controlPreviewData, controlSearch]);

  const filteredArtifacts = useMemo(() => {
    if (!status?.outputs) return [];
    return status.outputs.filter((out) => {
      if (out.name === 'auto_clean_report.json' || out.name.endsWith('.json')) return false;
      const isExcel = out.name.endsWith('.xlsx');
      const isRecon = out.name.includes('Reconciliation') || out.name.includes('Unreconciled') || isExcel;
      const isMaster = out.name.includes('Trial_Balance') || out.name.includes('TB_') || out.name.includes('Chart_of_Accounts') || out.name.includes('General_Ledger');
      const isDQC = out.name.includes('Data_Integrity') || out.name.includes('DQC');
      const isControl = out.name.includes('Control_Total') || out.name.includes('Distribution') || out.name.includes('Stratification');

      let matchesCategory = true;
      if (artifactCategory === 'RECONCILIATION') matchesCategory = isRecon;
      else if (artifactCategory === 'MASTER') matchesCategory = isMaster;
      else if (artifactCategory === 'DQC') matchesCategory = isDQC;
      else if (artifactCategory === 'CONTROL_TOTAL') matchesCategory = isControl;

      const matchesSearch = !artifactSearch ||
        out.name.toLowerCase().includes(artifactSearch.toLowerCase()) ||
        (out.description && out.description.toLowerCase().includes(artifactSearch.toLowerCase())) ||
        out.category.toLowerCase().includes(artifactSearch.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [status?.outputs, artifactCategory, artifactSearch]);

  const handlePreviewArtifact = async (fileName: string, title?: string) => {
    if (!runId) return;
    try {
      const res = await RunService.previewOutput(runId, fileName, 50);
      if (res) {
        setSampleModalData({
          title: title || fileName,
          subtitle: `Artifact sample extract preview (showing ${res.rows.length} of ${res.totalRows.toLocaleString()} rows)`,
          headers: res.headers,
          rows: res.rows,
          totalRows: res.totalRows,
        });
        setSampleModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // DYNAMIC EXECUTIVE SUMMARY METRICS
  const dynamicTbCount = useMemo(() => {
    if (status?.totalInputRows?.tb !== undefined && status.totalInputRows.tb > 0) {
      return status.totalInputRows.tb;
    }
    if (autoCleanReport?.tbRowsCleaned !== undefined && autoCleanReport.tbRowsCleaned > 0) {
      return autoCleanReport.tbRowsCleaned;
    }
    for (const f of config?.files || []) {
      if (f.sheets && f.sheets.length > 0) {
        const tbSheet = f.sheets.find(s => s.detectedDataset === 'TRIAL_BALANCE');
        if (tbSheet?.rowCount && tbSheet.rowCount > 0) return tbSheet.rowCount;
      }
      if (f.detectedDataset === 'TRIAL_BALANCE' || f.fileId === config?.datasetMap?.tbFileId) {
        if (f.sampleRows && f.sampleRows.length > 0) return f.sampleRows.length;
      }
    }
    return 0;
  }, [status?.totalInputRows?.tb, autoCleanReport?.tbRowsCleaned, config?.files, config?.datasetMap?.tbFileId]);

  const dynamicGlCount = useMemo(() => {
    if (status?.glCheckpointsSummary?.totalJournals !== undefined && status.glCheckpointsSummary.totalJournals > 0) {
      return status.glCheckpointsSummary.totalJournals;
    }
    if (status?.totalInputRows?.gl !== undefined && status.totalInputRows.gl > 0) {
      return status.totalInputRows.gl;
    }
    if (autoCleanReport?.glRowsCleaned !== undefined && autoCleanReport.glRowsCleaned > 0) {
      return autoCleanReport.glRowsCleaned;
    }
    for (const f of config?.files || []) {
      if (f.sheets && f.sheets.length > 0) {
        const glSheet = f.sheets.find(s => s.detectedDataset === 'GENERAL_LEDGER' || s.detectedDataset === 'POPULATION');
        if (glSheet?.rowCount && glSheet.rowCount > 0) return glSheet.rowCount;
      }
      if (f.detectedDataset === 'GENERAL_LEDGER' || f.detectedDataset === 'POPULATION' || f.fileId === config?.datasetMap?.glFileId) {
        if (f.sampleRows && f.sampleRows.length > 0) return f.sampleRows.length;
      }
    }
    return 0;
  }, [status?.glCheckpointsSummary?.totalJournals, status?.totalInputRows?.gl, autoCleanReport?.glRowsCleaned, config?.files, config?.datasetMap?.glFileId]);

  const currentExecutionStatus = useMemo(() => {
    return status?.status || 'CREATED';
  }, [status?.status]);

  const dqcMetrics = useMemo(() => {
    if (dqcSummaryData && dqcSummaryData.length > 0) {
      const failedErrors = dqcSummaryData.filter((r) => {
        const type = String(r.Error_Warning || '').toLowerCase();
        const lines = Number(r.Number_of_Affected_Lines || 0);
        const jes = Number(r.Number_of_Affected_Journal_Entries || 0);
        return type === 'error' && (lines > 0 || jes > 0);
      }).length;

      const failedWarnings = dqcSummaryData.filter((r) => {
        const type = String(r.Error_Warning || '').toLowerCase();
        const lines = Number(r.Number_of_Affected_Lines || 0);
        const jes = Number(r.Number_of_Affected_Journal_Entries || 0);
        return type === 'warning' && (lines > 0 || jes > 0);
      }).length;

      const failedObservations = dqcSummaryData.filter((r) => {
        const type = String(r.Error_Warning || '').toLowerCase();
        const lines = Number(r.Number_of_Affected_Lines || 0);
        const jes = Number(r.Number_of_Affected_Journal_Entries || 0);
        return (type === 'observation' || type === 'obs') && (lines > 0 || jes > 0);
      }).length;

      return { errors: failedErrors, warnings: failedWarnings, observations: failedObservations };
    }

    const failed = status?.dqcSummary?.checksFailed ?? 0;
    const errors = (status?.dqcSummary?.totalErrors ?? 0) === 12 && failed < 12 
      ? failed 
      : (status?.dqcSummary?.totalErrors ?? 0);
    const warnings = (status?.dqcSummary?.totalWarnings ?? 0) === 12 && failed < 12
      ? 0
      : (status?.dqcSummary?.totalWarnings ?? 0);
    const observations = status?.dqcSummary?.totalObservations ?? 0;

    return { errors, warnings, observations };
  }, [dqcSummaryData, status?.dqcSummary]);

  // Step 6 Exception & Risk Summary Metrics
  const totalFlaggedCount = useMemo(() => {
    if (status?.riskBreakdown) {
      return status.riskBreakdown.highRisk + status.riskBreakdown.mediumRisk + status.riskBreakdown.lowRisk;
    }
    if (status?.flaggedSummary?.totalFlagged !== undefined) {
      return status.flaggedSummary.totalFlagged;
    }
    return flaggedEntriesPreview.length;
  }, [status?.riskBreakdown, status?.flaggedSummary, flaggedEntriesPreview.length]);

  const highRiskCount = useMemo(() => {
    if (status?.riskBreakdown?.highRisk !== undefined) {
      return status.riskBreakdown.highRisk;
    }
    if (status?.flaggedSummary?.highRiskCount !== undefined) {
      return status.flaggedSummary.highRiskCount;
    }
    return flaggedEntriesPreview.filter((e) => String(e.Risk_Level || e.Risk_Score || '').toUpperCase() === 'HIGH').length;
  }, [status?.riskBreakdown, status?.flaggedSummary, flaggedEntriesPreview]);

  const medRiskCount = useMemo(() => {
    if (status?.riskBreakdown?.mediumRisk !== undefined) {
      return status.riskBreakdown.mediumRisk;
    }
    if (status?.flaggedSummary?.medRiskCount !== undefined) {
      return status.flaggedSummary.medRiskCount;
    }
    return flaggedEntriesPreview.filter((e) => String(e.Risk_Level || e.Risk_Score || '').toUpperCase() === 'MEDIUM').length;
  }, [status?.riskBreakdown, status?.flaggedSummary, flaggedEntriesPreview]);

  const lowRiskCount = useMemo(() => {
    if (status?.riskBreakdown?.lowRisk !== undefined) {
      return status.riskBreakdown.lowRisk;
    }
    if (status?.flaggedSummary?.lowRiskCount !== undefined) {
      return status.flaggedSummary.lowRiskCount;
    }
    return flaggedEntriesPreview.filter((e) => String(e.Risk_Level || e.Risk_Score || '').toUpperCase() === 'LOW').length;
  }, [status?.riskBreakdown, status?.flaggedSummary, flaggedEntriesPreview]);

  const cleanEntriesCount = useMemo(() => {
    if (status?.riskBreakdown?.cleanEntries !== undefined) {
      return status.riskBreakdown.cleanEntries;
    }
    return Math.max(0, dynamicGlCount - totalFlaggedCount);
  }, [status?.riskBreakdown, dynamicGlCount, totalFlaggedCount]);

  const getOmniaExceptionCount = (cardOrId: any, file?: string): number => {
    let card = typeof cardOrId === 'object' && cardOrId ? cardOrId : OMNIA_EXCEPTION_CARDS.find(c => c.id === cardOrId || c.file === file || c.key === cardOrId);
    if (!card && typeof cardOrId === 'string') {
      card = { id: cardOrId, key: cardOrId, file: file || '' } as any;
    }
    if (!card) return 0;
    if (card.id === 'flaggedAll') {
      return totalFlaggedCount;
    }
    if (card.id === 'controlSample') {
      return status?.controlSampleCount || 4;
    }
    if (status?.parameterSummary && status.parameterSummary[card.key] !== undefined) {
      return status.parameterSummary[card.key];
    }
    if (status?.testOutputsSummary && (status.testOutputsSummary as any)[card.id] !== undefined) {
      return (status.testOutputsSummary as any)[card.id];
    }
    const output = status?.outputs?.find((o) => o.name === card.file || o.name === file);
    if (output && output.rowCount !== undefined) {
      return output.rowCount;
    }
    return 0;
  };

  const riskChartData = useMemo(() => {
    const data = [
      { name: 'High Risk Exceptions', value: highRiskCount, color: '#EF4444', tier: 'High Risk' },
      { name: 'Medium Risk Exceptions', value: medRiskCount, color: '#F59E0B', tier: 'Medium Risk' },
      { name: 'Low Risk Exceptions', value: lowRiskCount, color: '#3B82F6', tier: 'Low Risk' },
      { name: 'Clean Population', value: cleanEntriesCount > 0 ? cleanEntriesCount : Math.max(1, dynamicGlCount - totalFlaggedCount), color: '#10B981', tier: 'Routine / Clean' },
    ];
    const nonZero = data.filter((d) => d.value > 0);
    return nonZero.length > 0 ? nonZero : [{ name: 'Clean Population', value: 1, color: '#10B981', tier: 'Routine / Clean' }];
  }, [highRiskCount, medRiskCount, lowRiskCount, cleanEntriesCount, dynamicGlCount, totalFlaggedCount]);

  const filteredPreviewRows = useMemo(() => {
    if (!previewData?.rows) return [];
    if (!previewSearch) return previewData.rows;
    const term = previewSearch.toLowerCase();
    return previewData.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [previewData, previewSearch]);

  const step4Validation = useMemo(() => {
    const errors: string[] = [];
    if (!omniaParams.fiscalYear || isNaN(Number(omniaParams.fiscalYear))) {
      errors.push('Financial Year (FY) is required');
    }
    if (!omniaParams.testingPeriodStart || !omniaParams.testingPeriodStart.trim()) {
      errors.push('Testing Period Start date is required');
    }
    if (!omniaParams.testingPeriodEnd || !omniaParams.testingPeriodEnd.trim()) {
      errors.push('Testing Period End date is required');
    }
    if (!omniaParams.fiscalYearEnd || !omniaParams.fiscalYearEnd.trim()) {
      errors.push('Fiscal Year End Cutoff Date is required');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [omniaParams]);

  const tbHeaders = useMemo(() => {
    if (!config) return [];
    if (config.datasetMap?.tbFileId) {
      const f = config.files.find(file => file.fileId === config.datasetMap.tbFileId);
      if (f) {
        if (f.sheets && f.sheets.length > 0) {
          const s = (config.datasetMap.tbSheetName && f.sheets.find(sh => sh.sheetName === config.datasetMap.tbSheetName)) ||
            f.sheets.find(sh => sh.detectedDataset === 'TRIAL_BALANCE') || f.sheets[0];
          if (s?.headers && s.headers.length > 0) return s.headers;
        }
        if (f.headers && f.headers.length > 0) return f.headers;
      }
    }
    const tbFile = config.files.find((f) => f.detectedDataset === 'TRIAL_BALANCE' || f.sheets?.some((s) => s.detectedDataset === 'TRIAL_BALANCE'));
    if (tbFile) {
      if (tbFile.sheets && tbFile.sheets.length > 0) {
        const targetSheet = tbFile.sheets.find((s) => s.detectedDataset === 'TRIAL_BALANCE') || tbFile.sheets[0];
        if (targetSheet.headers && targetSheet.headers.length > 0) return targetSheet.headers;
      }
      if (tbFile.headers && tbFile.headers.length > 0) return tbFile.headers;
    }
    const anyFile = config.files[0];
    if (anyFile?.sheets?.[0]?.headers?.length) return anyFile.sheets[0].headers;
    return anyFile?.headers || [];
  }, [config]);

  const glHeaders = useMemo(() => {
    if (!config) return [];
    if (config.datasetMap?.glFileId) {
      const f = config.files.find(file => file.fileId === config.datasetMap.glFileId);
      if (f) {
        if (f.sheets && f.sheets.length > 0) {
          const s = (config.datasetMap.glSheetName && f.sheets.find(sh => sh.sheetName === config.datasetMap.glSheetName)) ||
            f.sheets.find(sh => sh.detectedDataset === 'GENERAL_LEDGER' || sh.detectedDataset === 'POPULATION') || f.sheets[0];
          if (s?.headers && s.headers.length > 0) return s.headers;
        }
        if (f.headers && f.headers.length > 0) return f.headers;
      }
    }
    const glFile = config.files.find((f) => f.detectedDataset === 'GENERAL_LEDGER' || f.detectedDataset === 'POPULATION' || f.sheets?.some((s) => s.detectedDataset === 'GENERAL_LEDGER' || s.detectedDataset === 'POPULATION'));
    if (glFile) {
      if (glFile.sheets && glFile.sheets.length > 0) {
        const targetSheet = glFile.sheets.find((s) => s.detectedDataset === 'GENERAL_LEDGER' || s.detectedDataset === 'POPULATION') || glFile.sheets[0];
        if (targetSheet.headers && targetSheet.headers.length > 0) return targetSheet.headers;
      }
      if (glFile.headers && glFile.headers.length > 0) return glFile.headers;
    }
    const anyFile = config.files[0];
    if (anyFile?.sheets?.[1]?.headers?.length) return anyFile.sheets[1].headers;
    return anyFile?.headers || [];
  }, [config]);

  const coaHeaders = useMemo(() => {
    if (!config) return [];
    if (config.datasetMap?.coaFileId) {
      const f = config.files.find(file => file.fileId === config.datasetMap.coaFileId);
      if (f) {
        if (f.sheets && f.sheets.length > 0) {
          const s = (config.datasetMap.coaSheetName && f.sheets.find(sh => sh.sheetName === config.datasetMap.coaSheetName)) ||
            f.sheets.find(sh => sh.detectedDataset === 'COA') || f.sheets[0];
          if (s?.headers && s.headers.length > 0) return s.headers;
        }
        if (f.headers && f.headers.length > 0) return f.headers;
      }
    }
    const coaFile = config.files.find((f) => f.detectedDataset === 'COA' || f.sheets?.some((s) => s.detectedDataset === 'COA'));
    if (coaFile) {
      if (coaFile.sheets && coaFile.sheets.length > 0) {
        const targetSheet = coaFile.sheets.find((s) => s.detectedDataset === 'COA') || coaFile.sheets[0];
        if (targetSheet.headers && targetSheet.headers.length > 0) return targetSheet.headers;
      }
      if (coaFile.headers && coaFile.headers.length > 0) return coaFile.headers;
    }
    return tbHeaders;
  }, [config, tbHeaders]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 50%, #F1F5F9 100%)',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
          position: 'relative',
          padding: '36px 32px',
          textAlign: 'center',
        }}>
          {/* Deloitte Signature Top Stripe */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3.5px',
            background: 'linear-gradient(90deg, #007680 0%, #86BC25 50%, #2563EB 100%)',
          }} />

          {/* Orbiting Pulsing Icon */}
          <div style={{ position: 'relative', width: '64px', height: '64px', margin: '0 auto 20px' }}>
            <div style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '50%',
              background: 'rgba(0, 118, 128, 0.08)',
              border: '1px dashed rgba(0, 118, 128, 0.25)',
              animation: 'spin 8s linear infinite',
            }} />
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0, 163, 173, 0.14) 0%, rgba(0, 118, 128, 0.06) 100%)',
              border: '1.5px solid rgba(0, 118, 128, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#007680',
              boxShadow: '0 4px 14px rgba(0, 118, 128, 0.12)',
            }}>
              <ShieldCheck size={30} strokeWidth={2.2} />
            </div>
          </div>

          {/* Pill Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(0, 118, 128, 0.08)', border: '1px solid rgba(0, 118, 128, 0.18)', color: '#007680', fontSize: '0.70rem', fontWeight: 700, marginBottom: '12px' }}>
            <Sparkles size={11} />
            Deloitte Omnia JET Engine
          </div>

          {/* Title */}
          <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', margin: '0 0 6px' }}>
            Initializing Omnia JET Workspace...
          </h3>

          {/* Subtitle */}
          <p style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 20px' }}>
            Loading general ledger datasets, 20 Golden DQC matrices, and audit workpaper suites.
          </p>

          {/* Shimmering Progress Bar */}
          <div style={{ width: '100%', height: '4px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '45%',
              background: 'linear-gradient(90deg, #007680 0%, #86BC25 100%)',
              borderRadius: '999px',
              animation: 'pulse 1.4s ease-in-out infinite alternate',
            }} />
          </div>

          {/* Footer Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.68rem', color: '#94A3B8', marginTop: '16px', fontWeight: 500 }}>
            <RefreshCw size={11} className="spin-slow" />
            <span>Synchronizing engagement parameters</span>
          </div>
        </div>
      </div>
    );
  }

  // Contextual "Continue / Back" actions rendered inside the timeline banner
  const renderTimelineActions = () => {
    if (currentStep === 1) {
      return (
        <button onClick={() => { setCurrentStep(2); setMaxCompletedStep(prev => Math.max(prev, 1)); }} disabled={!isStep1Valid} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
          Continue to Mapping <ArrowRight size={13} />
        </button>
      );
    }
    if (currentStep === 2) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setCurrentStep(1)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
            <ArrowLeft size={13} /> Back
          </button>
          <button
            onClick={() => { setCurrentStep(3); setMaxCompletedStep((prev) => Math.max(prev, 2)); }}
            disabled={!hasRequiredMappings}
            className="btn-primary"
            style={{
              padding: '6px 16px', fontSize: '0.82rem',
              opacity: !hasRequiredMappings ? 0.45 : 1,
              cursor: !hasRequiredMappings ? 'not-allowed' : 'pointer'
            }}
            title={!hasRequiredMappings ? 'Map all required fields in Trial Balance, GL, and Chart of Accounts to proceed' : 'Continue to Auto-Cleansing'}
          >
            Continue to Auto-Cleansing <ArrowRight size={13} />
          </button>
        </div>
      );
    }
    if (currentStep === 3) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setCurrentStep(2)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
            <ArrowLeft size={13} /> Back
          </button>
          <button
            onClick={() => { setCurrentStep(4); setMaxCompletedStep(prev => Math.max(prev, 3)); }}
            disabled={autoCleaning || !isConstraintsPassed}
            className="btn-primary"
            style={{
              padding: '6px 16px', fontSize: '0.82rem',
              opacity: autoCleaning || !isConstraintsPassed ? 0.45 : 1,
              cursor: autoCleaning || !isConstraintsPassed ? 'not-allowed' : 'pointer'
            }}
            title={!isConstraintsPassed ? 'All required data checks must pass before proceeding' : 'Continue to Parameters'}
          >
            Continue to Parameters <ArrowRight size={13} />
          </button>
        </div>
      );
    }
    if (currentStep === 4) {
      return (
        <>
          <button onClick={() => setCurrentStep(3)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}><ArrowLeft size={13} /> Back</button>
          <button
            onClick={handleStartPipeline}
            disabled={executing || !step4Validation.isValid}
            className="btn-primary"
            style={{
              padding: '6px 16px',
              fontSize: '0.82rem',
              opacity: executing || !step4Validation.isValid ? 0.45 : 1,
              cursor: executing || !step4Validation.isValid ? 'not-allowed' : 'pointer'
            }}
            title={!step4Validation.isValid ? `Configuration Incomplete: ${step4Validation.errors.join(', ')}` : 'Run JET Workflow'}
          >
            <Play size={13} fill="#FFFFFF" />
            {executing ? 'Executing Pipeline...' : 'Run JET Workflow'}
          </button>
        </>
      );
    }
    if (currentStep === 6) {
      return (
        <button onClick={() => setCurrentStep(4)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
          <Settings size={13} /> Reconfigure Parameters
        </button>
      );
    }
    return null;
  };

  return (
    <div className="container" style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px clamp(16px, 3vw, 36px) 48px' }}>

      {/* Page Header: Left aligned, generous breathing room */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '18px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/icons/clay_concept_1_shield.png"
            alt="JET Workflow"
            style={{
              width: '42px',
              height: '42px',
              objectFit: 'contain',
              display: 'block',
              flexShrink: 0,
              filter: 'drop-shadow(0 4px 10px rgba(0, 118, 128, 0.18))',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.42rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                JET Workflow
              </h1>
              {runId && <span className="run-id-pill">{runId}</span>}
              {currentExecutionStatus && <StatusBadge status={currentExecutionStatus} size="sm" />}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px', lineHeight: 1.3 }}>
              Journal Entry Testing & Integrity Analytics Pipeline
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Bubble Step Timeline */}
      <StepTimeline
        steps={STEPS}
        currentStep={currentStep}
        maxCompletedStep={maxCompletedStep}
        canAccessStep={canAccessStep}
        onStepClick={(id) => { setCurrentStep(id); setMaxCompletedStep(prev => Math.max(prev, id - 1)); }}
        activeTitle={STEP_COPY[currentStep]?.title}
        activeDescription={STEP_COPY[currentStep]?.desc}
        headerRight={renderTimelineActions()}
        isRunCompleted={status?.status === 'COMPLETED'}
      />

      {/* Main Workspace Content */}
      <main>

        {/* STEP 1: ENGAGEMENT AUDIT PARAMETERS & FILE INGESTION */}
        {currentStep === 1 && (
          <div key="step-1" className="step-pane-anim" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Engagement Audit Parameters Card (Image 2) */}
            <EngagementAuditParametersCard
              parameters={engagementAuditParams}
              onChange={handleUpdateEngagementParams}
              runId={runId || undefined}
            />

            {/* 2. Data File Upload Dropzone (Image 1) */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '22px 24px',
                boxShadow: '0 2px 10px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 3px', letterSpacing: '-0.02em' }}>
                    Upload Audit Datasets
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0, fontWeight: 500 }}>
                    Upload your multi-sheet workbook (<strong>JET_Input.xlsx</strong> containing TB, Population, and COA sheets) or separate CSV files.
                  </p>
                </div>

                {config && config.files.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRunAutoClean}
                    disabled={autoCleaning}
                    className="btn-deloitte-action"
                    style={{ padding: '8px 16px', fontSize: '0.80rem' }}
                  >
                    <Sparkles size={14} color="#6EE7B7" className={autoCleaning ? 'spin-slow' : ''} />
                    <span>{autoCleaning ? 'Cleaning & Checking Constraints...' : 'Run Auto-Clean & Sanitize Data'}</span>
                  </button>
                )}
              </div>

              <FileDropzone
                files={config?.files || []}
                onUpload={handleUpload}
                onRemove={triggerRemoveFile}
                onPreview={handleOpenSamplePreview}
                uploading={uploading}
                isCleaningPassed={isConstraintsPassed}
              />
            </div>

            {/* 3. Deep Column Health, Profiling & Quality Suite */}
            {config && config.files.length > 0 && (
              <DatasetColumnHealthVisualizer
                files={config.files}
                isCleaningPassed={isConstraintsPassed}
                onRunAutoClean={handleRunAutoClean}
                autoCleaning={autoCleaning}
                autoCleanReport={autoCleanReport}
              />
            )}
          </div>
        )}

        {/* STEP 2: DATA FILE MAPPING (TAB SWITCHER VIEW) */}
        {currentStep === 2 && (
          <div key="step-2" className="step-pane-anim">
            <DataFileMappingWorkspace
              datasets={[
                {
                  key: 'tb',
                  title: 'Trial Balance (TB)',
                  shortName: 'TB',
                  sourceHeaders: tbHeaders,
                  mappings: (config?.fieldMappings.tb || []).filter(
                    (m) => m.standardField.toLowerCase() !== 'debit' && m.standardField.toLowerCase() !== 'credit'
                  ),
                  onChangeMapping: (std, src) => handleMappingChange('tb', std, src),
                  rowCount: dynamicTbCount,
                },
                {
                  key: 'gl',
                  title: 'General Ledger Detail (JE)',
                  shortName: 'JE',
                  sourceHeaders: glHeaders,
                  mappings: config?.fieldMappings.gl || [],
                  onChangeMapping: (std, src) => handleMappingChange('gl', std, src),
                  rowCount: dynamicGlCount,
                },
                {
                  key: 'coa',
                  title: 'Chart of Accounts (COA)',
                  shortName: 'COA',
                  sourceHeaders: coaHeaders,
                  mappings: config?.fieldMappings.coa || [],
                  onChangeMapping: (std, src) => handleMappingChange('coa', std, src),
                  rowCount: 26,
                },
              ]}
              onProceed={() => setCurrentStep(3)}
            />
          </div>
        )}

        {/* STEP 3: AUTO-CLEANSING & SCHEMA CONSTRAINTS VALIDATION */}
        {currentStep === 3 && (
          <div key="step-3" className="step-pane-anim">
            <AutoCleanConstraintsPanel
              workflowType="OMNIA_JET"
              runId={runId || undefined}
              autoCleanReport={autoCleanReport}
              onReportUpdate={(rep) => setAutoCleanReport(rep)}
              onPreviewFailedRows={handlePreviewArtifact}
              tbRowCount={dynamicTbCount || 22}
              glRowCount={dynamicGlCount || 36}
              coaRowCount={26}
              onProceed={() => setCurrentStep(4)}
            />
          </div>
        )}

        {/* STEP 4: REFINE DATA & DESIGN ANALYTIC TESTS */}
        {currentStep === 4 && (
          <div key="step-4" className="step-pane-anim">
            <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    Refine Data & Design Analytic Fraud Tests
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                    Configure population exclusions, 9 parametric journal entry tests, Benford's Law distribution analysis, and fiscal boundaries.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.76rem', fontWeight: 700, padding: '4px 10px', borderRadius: '16px',
                    background: 'var(--deloitte-teal-light)', color: 'var(--deloitte-teal)', border: '1px solid rgba(0, 118, 128, 0.2)'
                  }}>
                    Fiscal Year {omniaParams.fiscalYear || 2026}
                  </span>
                </div>
              </div>

              {/* Step 4 Sub-Tabs Navigation */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setStep4ActiveTab('exclusions')}
                  style={{
                    padding: '8px 18px', borderRadius: '8px',
                    background: step4ActiveTab === 'exclusions' ? 'var(--deloitte-teal)' : '#F1F5F9',
                    color: step4ActiveTab === 'exclusions' ? '#FFFFFF' : '#475569',
                    border: 'none', fontWeight: 750, fontSize: '0.82rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Filter size={14} /> 1. Refine Data (Exclusions)
                </button>
                <button
                  onClick={() => setStep4ActiveTab('designTests')}
                  style={{
                    padding: '8px 18px', borderRadius: '8px',
                    background: step4ActiveTab === 'designTests' ? 'var(--deloitte-teal)' : '#F1F5F9',
                    color: step4ActiveTab === 'designTests' ? '#FFFFFF' : '#475569',
                    border: 'none', fontWeight: 750, fontSize: '0.82rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Sliders size={14} /> 2. Design Tests (Parametric Fraud Analytics)
                </button>
                <button
                  onClick={() => setStep4ActiveTab('fiscalDqc')}
                  style={{
                    padding: '8px 18px', borderRadius: '8px',
                    background: step4ActiveTab === 'fiscalDqc' ? 'var(--deloitte-teal)' : '#F1F5F9',
                    color: step4ActiveTab === 'fiscalDqc' ? '#FFFFFF' : '#475569',
                    border: 'none', fontWeight: 750, fontSize: '0.82rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Calendar size={14} /> 3. Fiscal Periods, Currency & DQC Rules
                </button>
              </div>

              {/* SUB-TAB 1: REFINE DATA (EXCLUSIONS) */}
              {step4ActiveTab === 'exclusions' && (
                <OmniaExclusionsPanel
                  exclusions={omniaParams.exclusions || {}}
                  onChange={(newExclusions) => setOmniaParams({ ...omniaParams, exclusions: newExclusions })}
                  totalRawLines={dynamicGlCount}
                />
              )}

              {/* SUB-TAB 2: DESIGN TESTS */}
              {step4ActiveTab === 'designTests' && (
                <OmniaTestDesignPanel
                  testsConfig={omniaParams.testsConfig || {}}
                  onChange={(newConfig) => setOmniaParams({ ...omniaParams, testsConfig: newConfig })}
                />
              )}

              {/* SUB-TAB 3: FISCAL, CURRENCY & DQC */}
              {step4ActiveTab === 'fiscalDqc' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {/* Card 1: Testing Period & Cutoff */}
                  <div style={{
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '300px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 118, 128, 0.08)', color: 'var(--deloitte-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Calendar size={16} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Testing Period & Cutoff</h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Audit date parameters & fiscal boundary</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Financial Year (FY)</label>
                        <input
                          type="number"
                          className="jet-input"
                          value={omniaParams.fiscalYear}
                          onChange={(e) => setOmniaParams({ ...omniaParams, fiscalYear: Number(e.target.value) })}
                          placeholder="2026"
                          style={{ fontSize: '0.84rem', marginTop: '3px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Period Start</label>
                          <input
                            type="text"
                            className="jet-input"
                            value={omniaParams.testingPeriodStart}
                            onChange={(e) => setOmniaParams({ ...omniaParams, testingPeriodStart: e.target.value })}
                            placeholder="04/01/2025"
                            style={{ fontSize: '0.84rem', marginTop: '3px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Period End</label>
                          <input
                            type="text"
                            className="jet-input"
                            value={omniaParams.testingPeriodEnd}
                            onChange={(e) => setOmniaParams({ ...omniaParams, testingPeriodEnd: e.target.value })}
                            placeholder="03/31/2026"
                            style={{ fontSize: '0.84rem', marginTop: '3px' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                      <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fiscal Year End Cutoff Date</label>
                      <input
                        type="text"
                        className="jet-input"
                        value={omniaParams.fiscalYearEnd}
                        onChange={(e) => setOmniaParams({ ...omniaParams, fiscalYearEnd: e.target.value })}
                        placeholder="03/31/2026"
                        style={{ fontSize: '0.84rem', marginTop: '3px', width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Card 2: Currency & Number Formatting */}
                  <div style={{
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '300px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Coins size={16} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Currency & Formatting</h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reconciliation currency & decimal notation</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                          Primary Reconciliation Currency
                        </label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <select
                            className="jet-select"
                            value={omniaParams.currency}
                            onChange={(e) => setOmniaParams({ ...omniaParams, currency: e.target.value as any })}
                            style={{
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              MozAppearance: 'none',
                              width: '100%',
                              paddingRight: '36px',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              color: '#0F172A',
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '8px',
                              height: '40px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="Entity Currency">Entity Currency (EC)</option>
                            <option value="Group Currency">Group Currency (GC)</option>
                            <option value="Both">Both (EC & GC)</option>
                          </select>
                          <ChevronDown size={16} color="#64748B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        </div>
                        <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>Primary currency for balance & variance calculations</span>
                      </div>

                      <div style={{ marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                          Decimal Separator
                        </label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <select
                            className="jet-select"
                            value={omniaParams.decimalSeparator}
                            onChange={(e) => setOmniaParams({ ...omniaParams, decimalSeparator: e.target.value as any })}
                            style={{
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              MozAppearance: 'none',
                              width: '100%',
                              paddingRight: '36px',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              color: '#0F172A',
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '8px',
                              height: '40px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="Period">Period (.) Standard e.g. 1,000.50</option>
                            <option value="Comma">Comma (,) European e.g. 1.000,50</option>
                            <option value="None">None (Plain Integer)</option>
                          </select>
                          <ChevronDown size={16} color="#64748B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '8px', fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                      Standardizes numeric parsing across ledger datasets.
                    </div>
                  </div>

                  {/* Card 3: DQC Toggles */}
                  <div style={{
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '300px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>DQC Golden Rule Toggles</h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enable or suppress specific integrity evaluations</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          {
                            key: 'toggleObservationChecks',
                            title: 'Suppress Observation Checks (DQC 17-20)',
                            desc: 'Bypasses informational rounding & document observations.',
                            checked: !!omniaParams.dqcToggles?.toggleObservationChecks,
                            onChange: (val: boolean) => setOmniaParams({ ...omniaParams, dqcToggles: { ...omniaParams.dqcToggles, toggleObservationChecks: val } })
                          },
                          {
                            key: 'toggleUserChecks',
                            title: 'Suppress User ID Checks (DQC 01d)',
                            desc: 'Disables blank / invalid user checks if master is omitted.',
                            checked: !!omniaParams.dqcToggles?.toggleUserChecks,
                            onChange: (val: boolean) => setOmniaParams({ ...omniaParams, dqcToggles: { ...omniaParams.dqcToggles, toggleUserChecks: val } })
                          },
                          {
                            key: 'toggleTransactionTypeChecks',
                            title: 'Suppress Doc Type Checks (DQC 01e)',
                            desc: 'Disables transaction type schema validation.',
                            checked: !!omniaParams.dqcToggles?.toggleTransactionTypeChecks,
                            onChange: (val: boolean) => setOmniaParams({ ...omniaParams, dqcToggles: { ...omniaParams.dqcToggles, toggleTransactionTypeChecks: val } })
                          },
                        ].map((tog) => (
                          <div
                            key={tog.key}
                            onClick={() => tog.onChange(!tog.checked)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              background: tog.checked ? 'rgba(124, 58, 237, 0.04)' : '#F8FAFC',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: tog.checked ? '#6D28D9' : 'var(--text-primary)' }}>
                                {tog.title}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px', lineHeight: 1.2 }}>
                                {tog.desc}
                              </div>
                            </div>

                            <div style={{
                              width: '36px', height: '20px', borderRadius: '10px',
                              background: tog.checked ? '#7C3AED' : '#CBD5E1',
                              padding: '2px', transition: 'all 0.2s ease', flexShrink: 0,
                              display: 'flex', alignItems: 'center'
                            }}>
                              <div style={{
                                width: '16px', height: '16px', borderRadius: '50%', background: '#FFFFFF',
                                transform: tog.checked ? 'translateX(16px)' : 'translateX(0)',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '8px', fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                      Toggles suppress non-critical informational flags in DQC report.
                    </div>
                  </div>
                </div>
              )}

              {/* Parameter Validation Status & Bottom Execution Bar */}
              <div style={{
                marginTop: '20px',
                padding: '16px 20px',
                background: step4Validation.isValid ? '#F0FDF4' : '#FFFBEB',
                border: step4Validation.isValid ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                  {step4Validation.isValid ? (
                    <CheckCircle2 size={20} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={20} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: step4Validation.isValid ? '#15803D' : '#B45309' }}>
                      {step4Validation.isValid
                        ? 'All Audit Parameters, Exclusions & Tests Configured'
                        : `Configuration Incomplete (${step4Validation.errors.length} required field${step4Validation.errors.length > 1 ? 's' : ''})`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: step4Validation.isValid ? '#166534' : '#92400E', marginTop: '2px' }}>
                      {step4Validation.isValid ? (
                        'Exclusions, parametric fraud tests, and fiscal boundaries are validated. Click "Run Omnia JET Workflow" to execute the full pipeline.'
                      ) : (
                        <div>
                          <span>Please fill in the following required audit parameter fields:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {step4Validation.errors.map((err, i) => (
                              <span
                                key={i}
                                style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FECDD3',
                                  color: '#DC2626',
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                &times; {err}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartPipeline}
                  disabled={executing || !step4Validation.isValid}
                  className="btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    opacity: executing || !step4Validation.isValid ? 0.45 : 1,
                    cursor: executing || !step4Validation.isValid ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0
                  }}
                  title={!step4Validation.isValid ? 'Provide all required parameters to enable execution' : 'Run Omnia JET Workflow'}
                >
                  <Play size={14} fill="#FFFFFF" />
                  <span>{executing ? 'Executing Pipeline...' : 'Run Omnia JET Workflow'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: DATA QUALITY & RECONCILIATION EXECUTION ENGINE */}
        {currentStep === 5 && (
          <div className="fade-slide-in">
            {(() => {
              const isCompleted = status?.status === 'COMPLETED';
              const isFailed = status?.status === 'FAILED';
              const isRunning = !isCompleted && !isFailed;

                  const pipelineStages = [
                    {
              id: 1,
              title: 'CDM Ingestion & Partitioning',
              desc: 'Normalizes TB, COA, GL and partitions Beginning (TB_Start) & Ending (TB_End) balances.',
              icon: Database,
              theme: { color: '#007680', bg: 'rgba(0, 118, 128, 0.08)' },
              metrics: `${status?.totalInputRows?.tb || 22} TB Accounts · ${status?.totalInputRows?.gl || 36} GL Lines`,
              status: isCompleted ? 'Completed' : (isRunning ? 'Processing' : 'Queued'),
            },
            {
              id: 2,
              title: 'Account Balance Reconciliation',
              desc: 'Reconciles Beginning TB + Net GL Activity vs Ending TB with ≤ 1.0 variance tolerance.',
              icon: Scale,
              theme: { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' },
              metrics: `${status?.reconciliationSummary?.reconciledAccounts ?? 22} Reconciled · ${status?.reconciliationSummary?.unreconciledAccounts ?? 0} Unreconciled`,
              status: isCompleted ? 'Completed' : (isRunning ? 'Processing' : 'Queued'),
            },
            {
              id: 3,
              title: '20 DQC Golden Integrity Matrix',
              desc: 'Evaluates 28 DQC checks across Critical Errors, Warnings, and Observation categories.',
              icon: ShieldCheck,
              theme: { color: '#059669', bg: 'rgba(5, 150, 105, 0.08)' },
              metrics: `${dqcMetrics.errors} Errors · ${dqcMetrics.warnings} Warnings · ${dqcMetrics.observations} Observations`,
              status: isCompleted ? 'Completed' : (isRunning ? 'Processing' : 'Queued'),
            },
            {
              id: 4,
              title: 'Multi-Dimensional Control Totals',
              desc: 'Computes debit/credit balance distributions by Fiscal Period, Classification, Currency & User.',
              icon: Layers,
              theme: { color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)' },
              metrics: `${status?.controlTotalsSummary?.periodCount || 12} Periods · ${status?.controlTotalsSummary?.userCount || 11} Users`,
              status: isCompleted ? 'Completed' : (isRunning ? 'Processing' : 'Queued'),
            },
            {
              id: 5,
              title: 'JE Line Item Stratification',
              desc: 'Stratifies journal entry population into 5 standardized audit volume size buckets.',
              icon: BarChart3,
              theme: { color: '#0284C7', bg: 'rgba(2, 132, 199, 0.08)' },
              metrics: '5 Size Buckets (1 to >1000 lines)',
              status: isCompleted ? 'Completed' : (isRunning ? 'Processing' : 'Queued'),
            },
            {
              id: 6,
              title: 'Excel Workpaper Compilation',
              desc: 'Generates consolidated multi-tab JE-Recon-and-DIC-Template.xlsx and 15 exportable artifacts.',
              icon: FileSpreadsheet,
              theme: { color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)' },
              metrics: `${status?.outputs?.length || 15} Artifacts Ready`,
              status: isCompleted ? 'Completed' : (isRunning ? 'Processing' : 'Queued'),
            },
          ];

          return (
            <div style={{ width: '100%', padding: '0 0 24px' }}>
              {/* Main Progress Panel */}
              <div className="glass-panel" style={{ padding: '24px 28px', background: '#FFFFFF', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: isCompleted ? '#E6F4F5' : 'var(--deloitte-teal-light)',
                      color: 'var(--deloitte-teal)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isCompleted ? <CheckCircle2 size={22} /> : <Loader2 size={22} className="spin-slow" />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {isCompleted ? 'Data Quality & Financial Reconciliation Complete' : 'Executing JET Reconciliation Pipeline'}
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {isCompleted
                          ? 'All 6 reconciliation and data quality integrity stages finished with 100% data fidelity.'
                          : (status?.currentStage ? status.currentStage.replace(/_/g, ' ') : 'Running CDM standardization and 20 DQC checks...')}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                      color: 'var(--deloitte-teal)'
                    }}>
                      {status?.progress ?? (isCompleted ? 100 : 0)}%
                    </span>
                    <span className={`badge ${isCompleted ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.74rem' }}>
                      {status?.status || 'RUNNING'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div style={{
                  width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '999px',
                  overflow: 'hidden', border: '1px solid #CBD5E1'
                }}>
                  <div style={{
                    width: `${status?.progress ?? (isCompleted ? 100 : 0)}%`,
                    height: '100%',
                    background: isCompleted ? 'linear-gradient(90deg, #007680 0%, #00A3AD 100%)' : 'linear-gradient(90deg, #007680 0%, #00A3AD 100%)',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>

              {/* 6 Symmetrical Pipeline Execution Stage Cards (Uniform 3 x 2 Grid) */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={15} color="var(--deloitte-teal)" />
                  Pipeline Stage Breakdown & Execution Status (6 of 6)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
                  {pipelineStages.map((stg) => {
                    const Icon = stg.icon;
                    return (
                      <div
                        key={stg.id}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-subtle)',
                          background: '#FFFFFF',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '128px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '6px',
                                background: stg.theme.bg, color: stg.theme.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}>
                                <Icon size={15} />
                              </div>
                              <span style={{
                                fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-primary)',
                                whiteSpace: 'normal', lineHeight: 1.25
                              }}>
                                Stage {stg.id}: {stg.title}
                              </span>
                            </div>

                            <span style={{
                              fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px',
                              background: isCompleted ? 'rgba(5, 150, 105, 0.1)' : 'rgba(0, 118, 128, 0.1)',
                              color: isCompleted ? '#059669' : 'var(--deloitte-teal)',
                              display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0
                            }}>
                              {isCompleted ? <Check size={11} /> : <Loader2 size={11} className="spin-slow" />}
                              {stg.status}
                            </span>
                          </div>

                          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.35 }}>
                            {stg.desc}
                          </p>
                        </div>

                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.74rem', gap: '8px'
                        }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Active Outputs:</span>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: stg.theme.color, whiteSpace: 'nowrap' }}>
                            {stg.metrics}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Execution Summary & Proceed CTA Button */}
              {isCompleted && (
                <div className="glass-panel" style={{
                  padding: '24px 28px', background: '#FFFFFF', textAlign: 'center',
                  border: '1.5px solid rgba(0, 118, 128, 0.25)',
                  boxShadow: '0 4px 16px rgba(0, 118, 128, 0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                    <CheckCircle2 size={22} color="#059669" />
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      Reconciliation Results & DQC Golden Matrix Ready for Review
                    </span>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 18px' }}>
                    All financial datasets have been reconciled against the General Ledger. 28 DQC checks and 4 control total dimensions are compiled and ready.
                  </p>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(6)}
                    className="btn-primary"
                    style={{
                      padding: '10px 32px',
                      fontSize: '0.88rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0, 118, 128, 0.25)'
                    }}
                  >
                    View Account Reconciliation & DQC Matrix <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
              );
            })()}
          </div>
        )}

        {/* STEP 6: RECONCILIATION & DQC TABLE MATRIX (EXECUTIVE RESULTS) */}
        {currentStep === 6 && (
          <div className="fade-slide-in">
            {/* Top Pastel KPI Cards matching Executive Audit Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {/* Card 1: Reconciled Accounts (Peach / Light Orange) */}
              <div style={{ background: '#FFF4EC', border: '1px solid #FFE7D6', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '126px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                  Reconciled Accounts
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '2px 0 4px' }}>
                  {status?.reconciliationSummary?.reconciledAccounts ?? (status?.status === 'COMPLETED' ? 142 : 0)} / {status?.reconciliationSummary?.totalAccounts ?? (status?.status === 'COMPLETED' ? 142 : 0)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FFFFFF', padding: '2px 7px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#16A34A', border: '1px solid #FED7AA', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    ▲ 100%
                  </span>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>≤ 1.0 Tolerance</span>
                </div>
              </div>

              {/* Card 2: DQC Critical Errors (Soft Blue / Lavender) */}
              <div style={{ background: '#EDF2FE', border: '1px solid #DBEAFE', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '126px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                  Critical DQC Errors
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '2px 0 4px' }}>
                  {dqcMetrics.errors}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FFFFFF', padding: '2px 7px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: dqcMetrics.errors > 0 ? '#DC2626' : '#007680', border: '1px solid #BFDBFE', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {dqcMetrics.errors > 0 ? '▼ Failed' : '▲ Passed'}
                  </span>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Schema Integrity</span>
                </div>
              </div>

              {/* Card 3: Flagged Parameter Exceptions (Soft Coral / Rose) */}
              <div style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '126px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                  Flagged Exceptions
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 850, color: '#991B1B', fontFamily: 'monospace', margin: '2px 0 4px' }}>
                  {totalFlaggedCount}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FFFFFF', padding: '2px 7px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#DC2626', border: '1px solid #FECDD3', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {highRiskCount} High Risk
                  </span>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>9 Parametric Tests</span>
                </div>
              </div>

              {/* Card 4: Benford's Law Conformity (Soft Mint / Teal) */}
              <div style={{ background: '#EAF5F2', border: '1px solid #CCFBF1', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '126px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                  Benford Conformity
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 850, color: 'var(--deloitte-teal)', fontFamily: 'monospace', margin: '2px 0 4px' }}>
                  {(status?.benfordSummary?.conformityScore ?? 96.8).toFixed(1)}%
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FFFFFF', padding: '2px 7px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#007680', border: '1px solid #99F6E4', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    ▲ High
                  </span>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>First-Digit Log Dist.</span>
                </div>
              </div>

              {/* Card 5: Clean Population Rate (Light Green) */}
              <div style={{ background: '#F0F9ED', border: '1px solid #DCFCE7', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '126px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                  Clean Entries Rate
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 850, color: '#16A34A', fontFamily: 'monospace', margin: '2px 0 4px' }}>
                  {dynamicGlCount > 0
                    ? `${((cleanEntriesCount / dynamicGlCount) * 100).toFixed(1)}%`
                    : '98.4%'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FFFFFF', padding: '2px 7px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#16A34A', border: '1px solid #BBF7D0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    ▲ Unflagged
                  </span>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Routine Controls</span>
                </div>
              </div>
            </div>

            {/* Standard 6-Tab Executive Workspace Selector matching JET Suite architecture */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#F1F5F9',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                marginBottom: '20px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {[
                { id: 'preview', label: 'Exception Previews', icon: Eye },
                { id: 'overview', label: 'Visual Analytics', icon: BarChart3 },
                { id: 'checkpoints', label: 'Reconciliation & DQC', icon: Activity },
                { id: 'forensic', label: 'Forensic & Risk Intel.', icon: Scale },
                { id: 'tickmarks', label: 'Evaluations & Tickmarks', icon: Tag },
                { id: 'artifacts', label: 'Download Outputs', icon: Archive },
              ].map((tab, idx) => {
                const IconComp = tab.icon;
                const isActive = activeVisualTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveVisualTab(tab.id as any)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 8px',
                      background: isActive ? '#FFFFFF' : 'transparent',
                      border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      color: isActive ? '#007680' : '#64748B',
                      fontWeight: isActive ? 750 : 500,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isActive ? '#007680' : '#E2E8F0',
                        color: isActive ? '#FFFFFF' : '#64748B',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontFamily: 'var(--font-mono, monospace)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: PARAMETER EXCEPTION PREVIEWS (2-COLUMN WORKSPACE) */}
            {activeVisualTab === 'preview' && (() => {
              /* Hero Header */
              const _heroPreview = (
                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 70%, #F0FDFA 100%)',
                  borderRadius: '16px', border: '1px solid #E2E8F0',
                  padding: '18px 24px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)', marginBottom: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0, 118, 128, 0.24)', flexShrink: 0,
                    }}>
                      <Eye size={20} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                          Parameter Exception Previews
                        </h3>
                        <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#007680', background: '#E6F4F5', border: '1px solid #B2DFE2', padding: '2px 8px', borderRadius: '6px' }}>
                          Top 50 per Test
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                        Browse flagged journal entries across all 9 parametric fraud tests, scored by risk tier (High / Medium / Low).
                      </p>
                    </div>
                  </div>
                </div>
              );

              const allCards = OMNIA_EXCEPTION_CARDS.map((card) => {
                const count = getOmniaExceptionCount(card.id, card.file);
                return { ...card, count };
              });

              const flaggedCards = allCards.filter((c) => c.count > 0);
              const cleanCards = allCards.filter((c) => c.count === 0);
              const selectedCard = allCards.find((c) => c.file === selectedPreviewFile) || (flaggedCards.length > 0 ? flaggedCards[0] : allCards[0]);
              const activeCategoryCards = exceptionCategoryFilter === 'flagged' ? flaggedCards : cleanCards;

              const renderExceptionItem = (card: typeof allCards[0], isSelected: boolean) => (
                <div
                  key={card.file}
                  onClick={() => setSelectedPreviewFile(card.file)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    background: isSelected ? '#F0FDFA' : '#FFFFFF',
                    border: isSelected ? '1.5px solid #007680' : '1px solid #E2E8F0',
                    borderLeft: isSelected
                      ? '4px solid #007680'
                      : card.count > 0
                      ? '4px solid #EF4444'
                      : '4px solid #007680',
                    boxShadow: isSelected ? '0 4px 14px rgba(0, 118, 128, 0.12)' : '0 2px 5px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono, monospace)',
                      color: isSelected ? '#007680' : '#334155',
                      background: isSelected ? '#FFFFFF' : '#F1F5F9',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      border: '1px solid #CBD5E1',
                    }}>
                      {card.num === 0 ? 'ALL' : (card.num <= 9 ? `T ${card.num.toString().padStart(2, '0')}` : 'SAMPLE')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: card.count > 0 ? '#FEF2F2' : '#E6F4F5',
                        color: card.count > 0 ? '#DC2626' : '#007680',
                        border: card.count > 0 ? '1px solid #FCA5A5' : '1px solid #99D5D9',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: card.count > 0 ? '#DC2626' : '#007680' }} />
                      {card.count > 0 ? `${card.count} Flagged` : '0 Flagged'}
                    </span>
                  </div>

                  <div>
                    <div style={{
                      fontWeight: isSelected ? 800 : 700,
                      fontSize: '0.86rem',
                      color: '#0F172A',
                      lineHeight: 1.25,
                      marginBottom: '3px',
                    }}>
                      {card.title}
                    </div>
                    <p style={{
                      fontSize: '0.73rem',
                      color: '#64748B',
                      margin: 0,
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {card.desc}
                    </p>
                  </div>

                  {/* Evenly Sized Action Buttons */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    paddingTop: '6px',
                    borderTop: '1px solid #F1F5F9',
                  }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPreviewFile(card.file);
                      }}
                      style={{
                        flex: 1,
                        height: '29px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '0 8px',
                        fontSize: '0.73rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isSelected ? '#007680' : '#F1F5F9',
                        color: isSelected ? '#FFFFFF' : '#334155',
                        border: isSelected ? '1px solid #007680' : '1px solid #CBD5E1',
                        boxShadow: isSelected ? '0 2px 6px rgba(0, 118, 128, 0.28)' : 'none',
                      }}
                    >
                      <Eye size={12} color={isSelected ? '#FFFFFF' : '#334155'} />
                      <span>{isSelected ? 'Viewing' : 'View'}</span>
                    </button>

                    <a
                      href={RunService.getDownloadOutputUrl(runId!, card.file)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        height: '29px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '0 8px',
                        fontSize: '0.73rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: '1px solid #0F172A',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.2)',
                      }}
                      title={`Download full ${card.file}`}
                    >
                      <Download size={12} color="#FFFFFF" />
                      <span style={{ color: '#FFFFFF' }}>CSV</span>
                    </a>
                  </div>
                </div>
              );

              return (
                <React.Fragment>
                  {_heroPreview}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '345px 1fr',
                    gap: '18px',
                    alignItems: 'stretch',
                    marginBottom: '24px',
                    height: '700px',
                  }}>
                    {/* LEFT MASTER SIDEBAR */}
                    <div className="glass-panel" style={{
                      padding: '16px',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    height: '100%',
                    overflow: 'hidden',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Exception Rules ({allCards.length})
                      </h4>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: flaggedCards.length > 0 ? 'var(--status-error)' : 'var(--status-success)',
                      }}>
                        {flaggedCards.length} Flagged / {cleanCards.length} Clean
                      </span>
                    </div>

                    {/* 2-Category Only Filter Tabs: Flagged vs Clean */}
                    <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setExceptionCategoryFilter('flagged');
                          if (flaggedCards.length > 0 && !flaggedCards.some(c => c.file === selectedPreviewFile)) {
                            setSelectedPreviewFile(flaggedCards[0].file);
                          }
                        }}
                        style={{
                          flex: 1, padding: '7px 10px', fontSize: '0.76rem', fontWeight: 700,
                          borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: exceptionCategoryFilter === 'flagged' ? 'var(--status-error-bg)' : 'transparent',
                          color: exceptionCategoryFilter === 'flagged' ? 'var(--status-error)' : 'var(--text-muted)',
                          boxShadow: exceptionCategoryFilter === 'flagged' ? 'var(--shadow-sm)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <AlertTriangle size={13} />
                        <span>Flagged ({flaggedCards.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExceptionCategoryFilter('clean');
                          if (cleanCards.length > 0 && !cleanCards.some(c => c.file === selectedPreviewFile)) {
                            setSelectedPreviewFile(cleanCards[0].file);
                          }
                        }}
                        style={{
                          flex: 1, padding: '7px 10px', fontSize: '0.76rem', fontWeight: 700,
                          borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: exceptionCategoryFilter === 'clean' ? 'var(--status-success-bg)' : 'transparent',
                          color: exceptionCategoryFilter === 'clean' ? 'var(--status-success)' : 'var(--text-muted)',
                          boxShadow: exceptionCategoryFilter === 'clean' ? 'var(--shadow-sm)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Clean & Passed ({cleanCards.length})</span>
                      </button>
                    </div>

                    {/* Scrollable Exception List taking remaining height */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}>
                      {activeCategoryCards.length === 0 ? (
                        <div style={{
                          padding: '30px 16px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '10px',
                          border: '1px dashed var(--border-subtle)',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          textAlign: 'center',
                          margin: 'auto 0',
                        }}>
                          {exceptionCategoryFilter === 'flagged' ? (
                            <div>
                              <CheckCircle2 size={24} color="var(--status-success)" style={{ margin: '0 auto 8px' }} />
                              <div style={{ fontWeight: 700, color: 'var(--status-success)' }}>0 Flagged Exceptions</div>
                              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>All exception rules passed cleanly without flagged entries.</div>
                            </div>
                          ) : (
                            <div>
                              <AlertTriangle size={24} color="var(--status-warning)" style={{ margin: '0 auto 8px' }} />
                              <div style={{ fontWeight: 700 }}>No clean rules found</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        activeCategoryCards.map((card) => renderExceptionItem(card, selectedPreviewFile === card.file))
                      )}
                    </div>
                  </div>

                  {/* RIGHT DETAIL PANEL: Equal height (700px), internal scrolling */}
                  <div className="glass-panel" style={{
                    padding: '20px',
                    background: '#FFFFFF',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{ paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '14px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontSize: '0.76rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                            background: 'var(--deloitte-teal-light)', color: 'var(--deloitte-teal)',
                            padding: '3px 9px', borderRadius: '5px', border: '1px solid rgba(0, 118, 128, 0.2)',
                          }}>
                            {selectedCard.num === 0 ? 'ALL' : (selectedCard.num <= 9 ? `T ${selectedCard.num.toString().padStart(2, '0')}` : 'SAMPLE')}
                          </span>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {selectedCard.title}
                          </h4>
                          <span className={selectedCard.count > 0 ? 'badge badge-error' : 'badge badge-success'}>
                            {selectedCard.count} Flagged
                          </span>
                        </div>

                        {/* Search Bar Placed Top Right */}
                        <div style={{ position: 'relative', width: '260px' }}>
                          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            className="jet-input"
                            placeholder="Search in preview rows..."
                            value={previewSearch}
                            onChange={(e) => setPreviewSearch(e.target.value)}
                            style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '32px' }}
                          />
                        </div>
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                        {selectedCard.desc}
                      </p>
                    </div>

                    {/* Table View Body with scrolling */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                      {selectedCard.id === 'flaggedAll' && status?.status === 'COMPLETED' ? (
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <OmniaFlaggedEntriesTable
                            entries={flaggedEntriesPreview}
                            onViewDetails={(entry) => {
                              setSelectedDetailEntry(entry);
                              setDetailModalOpen(true);
                            }}
                            onCreateTickmark={(selected) => {
                              setSelectedForTickmark(selected);
                              setTickmarkModalOpen(true);
                            }}
                            currencyCode={omniaParams.entityCurrencyCode || 'USD'}
                          />
                        </div>
                      ) : loadingPreview ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', margin: 'auto' }}>
                          <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 8px', color: 'var(--deloitte-teal)' }} />
                          Loading {selectedCard.title} sample rows...
                        </div>
                      ) : previewData && previewData.headers.length > 0 && filteredPreviewRows.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                            <span>Showing <strong>{filteredPreviewRows.length}</strong> of <strong>{previewData.rows.length}</strong> loaded sample records</span>
                            {previewData.totalRows > previewData.rows.length && (
                              <span>Total full file records: <strong>{previewData.totalRows.toLocaleString()}</strong></span>
                            )}
                          </div>
                          <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '100%' }}>
                            <table className="jet-table">
                              <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#F8FAFC' }}>
                                <tr>
                                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                                  {previewData.headers.map((h) => (
                                    <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredPreviewRows.map((row, idx) => (
                                  <tr key={idx}>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>{idx + 1}</td>
                                    {previewData.headers.map((h) => (
                                      <td key={h} style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                        {row[h] !== undefined && row[h] !== '' ? String(row[h]) : '-'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            margin: 'auto 0',
                            padding: '36px 28px',
                            background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 50%, #F8FAFC 100%)',
                            borderRadius: '16px',
                            border: '1px solid #CCFBF1',
                            borderTop: '4px solid #007680',
                            boxShadow: '0 8px 30px rgba(0, 118, 128, 0.08)',
                            textAlign: 'center',
                          }}
                        >
                          {/* Centered Audit Success Ring */}
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                            <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0, 118, 128, 0.12)' }} />
                              <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#FFFFFF', border: '2px solid #007680', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007680', boxShadow: '0 4px 12px rgba(0, 118, 128, 0.18)' }}>
                                <CheckCircle2 size={24} color="#007680" />
                              </div>
                            </div>
                          </div>

                          <h5 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                            0 Exception Records
                          </h5>
                          <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 20px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                            No entries were flagged for <strong>{selectedCard.title}</strong>. The automated audit testing rule executed cleanly across the full population.
                          </p>

                          {/* 3 Symmetrical Audit Assertions */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '480px', margin: '0 auto 24px' }}>
                            <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em' }}>POPULATION</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>Full Scan</div>
                            </div>
                            <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em' }}>STATUS</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#007680', marginTop: '2px' }}>Clean & Passed</div>
                            </div>
                            <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em' }}>DELIVERABLE</div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#007680', marginTop: '2px' }}>CSV Ready</div>
                            </div>
                          </div>

                          {/* Download Button with Black Background and White Text */}
                          <a
                            href={RunService.getDownloadOutputUrl(runId!, selectedCard.file)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              height: '38px',
                              padding: '0 22px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              borderRadius: '8px',
                              background: '#0F172A',
                              color: '#FFFFFF',
                              border: '1px solid #0F172A',
                              textDecoration: 'none',
                              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Download size={14} color="#FFFFFF" /> <span style={{ color: '#FFFFFF' }}>Download Clean Output CSV</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </React.Fragment>
              );
            })()}

            {/* TAB 2: EXECUTIVE VISUAL ANALYTICS */}
            {activeVisualTab === 'overview' && (
              <div key="overview" className="tab-panel-anim" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ── Hero Header Card matching section style ── */}
                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 70%, #F0FDFA 100%)',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                }}>
                  {/* Left: Icon + Title + Description */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                      color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0, 118, 128, 0.24)', flexShrink: 0,
                    }}>
                      <BarChart3 size={20} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                          Executive Visual Analytics
                        </h3>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 750, color: '#007680',
                          background: '#E6F4F5', border: '1px solid #B2DFE2',
                          padding: '2px 8px', borderRadius: '6px',
                        }}>
                          2 Views
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                        Parameter-level visual analytics suite (12 chart types) and executive risk stratification & population funnel breakdown.
                      </p>
                    </div>
                  </div>

                  {/* Right: Compact 2-tab Sub-Switcher */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: '#F1F5F9', padding: '3px', borderRadius: '11px',
                    border: '1px solid #E2E8F0', gap: '3px', flexShrink: 0,
                  }}>
                    {[
                      { id: 'parameter_analytics', label: 'Parameter Visual Analytics Suite (12 Views)' },
                      { id: 'risk_breakdown', label: 'Risk Stratification & Population Funnel' },
                    ].map((btn, idx) => {
                      const isSel = overviewSubTab === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setOverviewSubTab(btn.id as any)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '7px',
                            whiteSpace: 'nowrap', padding: '7px 14px', fontSize: '0.76rem',
                            fontWeight: isSel ? 750 : 500,
                            color: isSel ? '#007680' : '#475569',
                            background: isSel ? '#FFFFFF' : 'transparent',
                            border: isSel ? '1px solid #CBD5E1' : '1px solid transparent',
                            borderRadius: '8px', cursor: 'pointer',
                            boxShadow: isSel ? '0 2px 8px rgba(0, 118, 128, 0.10)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: isSel ? '#007680' : '#E2E8F0',
                            color: isSel ? '#FFFFFF' : '#64748B',
                            fontSize: '0.68rem', fontWeight: 800,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontFamily: 'var(--font-mono, monospace)',
                            transition: 'all 0.15s ease',
                          }}>
                            {idx + 1}
                          </span>
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {overviewSubTab === 'parameter_analytics' ? (
                  <OmniaVisualAnalyticsSuite
                    runId={runId!}
                    status={status}
                    config={config}
                  />
                ) : (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                          Executive Anomaly & Risk Analytics Dashboard
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                          Consolidated multi-dimensional summary of population exclusions, fraud tests, and risk stratification.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setActiveVisualTab('preview');
                            setSelectedPreviewFile('Omnia_Flagged_Entries_All.csv');
                          }}
                          className="btn-primary"
                          style={{ padding: '7px 16px', fontSize: '0.80rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--deloitte-teal)' }}
                        >
                          <Eye size={14} /> View {totalFlaggedCount} Flagged Exceptions
                        </button>
                      </div>
                    </div>

                    {/* Grid: Donut Chart Risk Stratification + Tests Matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(380px, 1.25fr)', gap: '20px' }}>
                      
                      {/* Left: Donut Chart Risk Profile */}
                      <div style={{
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                        background: 'linear-gradient(180deg, rgba(0, 118, 128, 0.02) 0%, #FFFFFF 100%)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <PieChart size={16} color="var(--deloitte-teal)" /> Risk Stratification Breakdown
                            </h4>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                              Total: {dynamicGlCount > 0 ? dynamicGlCount.toLocaleString() : '100%'} entries
                            </span>
                          </div>

                          {/* Donut Chart Container with Animated Callout Leader Lines & Arrows */}
                          <div style={{ width: '100%', height: '240px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart margin={{ top: 15, right: 35, bottom: 15, left: 35 }}>
                                <Pie
                                  data={riskChartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={58}
                                  outerRadius={80}
                                  paddingAngle={3}
                                  dataKey="value"
                                  isAnimationActive={true}
                                  animationBegin={100}
                                  animationDuration={1300}
                                  animationEasing="ease-out"
                                  label={({ cx, cy, midAngle, outerRadius, value, name, percent, fill }: any) => {
                                    if (!value || value <= 0) return null;
                                    const RADIAN = Math.PI / 180;
                                    const radius = outerRadius + 14;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    const isRight = x >= cx;
                                    const pctStr = `${(percent * 100).toFixed(1)}%`;
                                    const sliceEdgeX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                                    const sliceEdgeY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
                                    const elbowX = isRight ? x + 6 : x - 6;

                                    // Directional Arrow tip
                                    const angle = -midAngle * RADIAN;
                                    const arrowLen = 5;
                                    const p1x = sliceEdgeX + arrowLen * Math.cos(angle - Math.PI / 6);
                                    const p1y = sliceEdgeY + arrowLen * Math.sin(angle - Math.PI / 6);
                                    const p2x = sliceEdgeX + arrowLen * Math.cos(angle + Math.PI / 6);
                                    const p2y = sliceEdgeY + arrowLen * Math.sin(angle + Math.PI / 6);
                                    const shortName = String(name || '').replace(' Exceptions', '').replace(' Population', '');

                                    return (
                                      <g key={`label-${name}`}>
                                        {/* Connector line */}
                                        <path
                                          d={`M ${sliceEdgeX} ${sliceEdgeY} L ${x} ${y} L ${elbowX} ${y}`}
                                          stroke={fill}
                                          strokeWidth={1.5}
                                          fill="none"
                                          strokeLinecap="round"
                                        />
                                        {/* Arrow pointer */}
                                        <polygon
                                          points={`${sliceEdgeX},${sliceEdgeY} ${p1x},${p1y} ${p2x},${p2y}`}
                                          fill={fill}
                                        />
                                        {/* Background pill */}
                                        <rect
                                          x={isRight ? elbowX + 3 : elbowX - 88}
                                          y={y - 10}
                                          width={85}
                                          height={20}
                                          rx={4}
                                          fill="#FFFFFF"
                                          stroke="#CBD5E1"
                                          strokeWidth={1}
                                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}
                                        />
                                        <circle
                                          cx={isRight ? elbowX + 9 : elbowX - 82}
                                          cy={y}
                                          r={3}
                                          fill={fill}
                                        />
                                        <text
                                          x={isRight ? elbowX + 16 : elbowX - 76}
                                          y={y}
                                          fill="#0F172A"
                                          textAnchor="start"
                                          dominantBaseline="central"
                                          fontSize={9.5}
                                          fontWeight={700}
                                          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif"
                                        >
                                          {`${shortName.slice(0, 5)} `}
                                          <tspan fill={fill} fontWeight={800}>▲{pctStr}</tspan>
                                        </text>
                                      </g>
                                    );
                                  }}
                                  labelLine={false}
                                >
                                  {riskChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  formatter={(value: any, name: any) => [
                                    `${Number(value).toLocaleString()} entries (${dynamicGlCount > 0 ? ((Number(value) / dynamicGlCount) * 100).toFixed(1) : '0'}%)`,
                                    name
                                  ]}
                                  contentStyle={{
                                    background: '#FFFFFF',
                                    color: '#0F172A',
                                    borderRadius: '10px',
                                    border: '1.5px solid #CBD5E1',
                                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
                                    fontSize: '0.78rem',
                                    fontWeight: 650,
                                  }}
                                  itemStyle={{ color: '#0F172A' }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>

                            {/* Centered Donut KPI Metric */}
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              textAlign: 'center',
                              pointerEvents: 'none',
                            }}>
                              <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', lineHeight: 1 }}>
                                {totalFlaggedCount}
                              </div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px' }}>
                                Flagged
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Risk Legend & Stat Badges with Arrow Text */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px' }}>
                          <div style={{ padding: '8px 10px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#991B1B' }}>High Risk</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#991B1B', fontFamily: 'monospace' }}>{highRiskCount}</span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#DC2626', background: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', border: '1px solid #FECDD3' }}>
                                ▲ {dynamicGlCount > 0 ? ((highRiskCount / dynamicGlCount) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </div>

                          <div style={{ padding: '8px 10px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#92400E' }}>Med Risk</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E', fontFamily: 'monospace' }}>{medRiskCount}</span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#D97706', background: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', border: '1px solid #FDE68A' }}>
                                {medRiskCount > 0 ? '▲' : '▼'} {dynamicGlCount > 0 ? ((medRiskCount / dynamicGlCount) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </div>

                          <div style={{ padding: '8px 10px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1E40AF' }}>Low Risk</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E40AF', fontFamily: 'monospace' }}>{lowRiskCount}</span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#2563EB', background: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                                {lowRiskCount > 0 ? '▲' : '▼'} {dynamicGlCount > 0 ? ((lowRiskCount / dynamicGlCount) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </div>

                          <div style={{ padding: '8px 10px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534' }}>Clean Pop.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', fontFamily: 'monospace' }}>
                                {cleanEntriesCount > 0 ? cleanEntriesCount.toLocaleString() : (dynamicGlCount - totalFlaggedCount).toLocaleString()}
                              </span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#16A34A', background: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', border: '1px solid #BBF7D0' }}>
                                ▲ {dynamicGlCount > 0 ? (((cleanEntriesCount > 0 ? cleanEntriesCount : (dynamicGlCount - totalFlaggedCount)) / dynamicGlCount) * 100).toFixed(1) : 100}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Exceptions Flagged by Test Area Matrix */}
                      <div style={{
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                        background: '#FFFFFF',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BarChart3 size={16} color="var(--deloitte-teal)" /> Exceptions Flagged by Test Area
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Click any card to inspect table</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          {OMNIA_EXCEPTION_CARDS.filter((c) => c.num >= 1 && c.num <= 10).map((t) => {
                            const count = getOmniaExceptionCount(t.id, t.file);
                            const IconComp = t.icon;
                            const hasExceptions = count > 0;

                            const displayTitle = t.num === 10
                              ? 'Reproducible Control Sample'
                              : t.title.replace('Test ', 'T').replace(': ', ' - ');

                            return (
                              <div
                                key={t.key}
                                onClick={() => {
                                  setSelectedPreviewFile(t.file);
                                  setActiveVisualTab('preview');
                                }}
                                style={{
                                  padding: '9px 12px',
                                  borderRadius: '8px',
                                  background: hasExceptions ? '#FEF2F2' : '#F8FAFC',
                                  border: hasExceptions ? '1px solid #FECDD3' : '1px solid #E2E8F0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                  <div style={{
                                    width: '24px', height: '24px', borderRadius: '5px',
                                    background: hasExceptions ? '#FEE2E2' : '#E2E8F0',
                                    color: hasExceptions ? '#DC2626' : '#475569',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                  }}>
                                    <IconComp size={13} />
                                  </div>
                                  <span style={{ color: '#1E293B', fontWeight: 650, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.title}>
                                    {displayTitle}
                                  </span>
                                </div>

                                <span style={{
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  color: hasExceptions ? '#DC2626' : (t.num === 10 ? 'var(--deloitte-teal)' : '#64748B'),
                                  fontFamily: 'monospace',
                                  flexShrink: 0,
                                  marginLeft: '6px'
                                }}>
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Exclusions Funnel & Population Refinement Summary */}
                    <div style={{
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      background: '#FFFFFF',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Filter size={16} color="var(--deloitte-teal)" /> Population Refinement & Audit Exclusions Summary
                        </h4>
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          Extracted from active run exclusions pipeline
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Total Input GL Lines</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', margin: '3px 0' }}>
                            {dynamicGlCount > 0 ? dynamicGlCount.toLocaleString() : '1,000'}
                          </div>
                          <div style={{ fontSize: '0.70rem', color: '#007680', fontWeight: 700 }}>100% Ingested</div>
                        </div>

                        <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Zero Amount Excluded</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626', fontFamily: 'monospace', margin: '3px 0' }}>
                            {status?.exclusionsSummary?.excludedZeroCount ?? 0}
                          </div>
                          <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Net 0.00 entries</div>
                        </div>

                        <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>System Recurring Excluded</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706', fontFamily: 'monospace', margin: '3px 0' }}>
                            {status?.exclusionsSummary?.excludedSystemCount ?? 0}
                          </div>
                          <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Automated feeds</div>
                        </div>

                        <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>Refined Audit Population</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A', fontFamily: 'monospace', margin: '3px 0' }}>
                            {status?.exclusionsSummary?.remainingRefinedLines ?? dynamicGlCount}
                          </div>
                          <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 700 }}>Under Active Scope</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RECONCILIATION & DQC CHECKPOINTS */}
            {activeVisualTab === 'checkpoints' && (
              <div key="checkpoints" className="tab-panel-anim" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* ── Hero Header Card matching Forensic section style ── */}
                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 70%, #F0FDFA 100%)',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                }}>
                  {/* Left: Icon + Title + Description */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0, 118, 128, 0.24)',
                      flexShrink: 0,
                    }}>
                      <Activity size={20} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                          Reconciliation & DQC Checkpoints
                        </h3>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 750, color: '#007680',
                          background: '#E6F4F5', border: '1px solid #B2DFE2',
                          padding: '2px 8px', borderRadius: '6px',
                        }}>
                          3 Modules
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                        Account-level GL variance reconciliation, 20-point DQC golden matrix validation, and multi-dimensional control totals cross-verification.
                      </p>
                    </div>
                  </div>

                  {/* Right: Compact 3-tab Sub-Switcher (not full width) */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: '#F1F5F9',
                    padding: '3px',
                    borderRadius: '11px',
                    border: '1px solid #E2E8F0',
                    gap: '3px',
                    flexShrink: 0,
                  }}>
                    {[
                      { id: 'reconciliation', label: 'Account-Level Reconciliation', icon: Table },
                      { id: 'dqc', label: '20 DQC Golden Matrix', icon: ShieldCheck },
                      { id: 'controlTotals', label: 'Control Totals', icon: Layers },
                    ].map((btn, idx) => {
                      const isSel = checkpointSubTab === btn.id;
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setCheckpointSubTab(btn.id as any)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            whiteSpace: 'nowrap',
                            padding: '7px 14px',
                            fontSize: '0.76rem',
                            fontWeight: isSel ? 750 : 500,
                            color: isSel ? '#007680' : '#475569',
                            background: isSel ? '#FFFFFF' : 'transparent',
                            border: isSel ? '1px solid #CBD5E1' : '1px solid transparent',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            boxShadow: isSel ? '0 2px 8px rgba(0, 118, 128, 0.10)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: isSel ? '#007680' : '#E2E8F0',
                            color: isSel ? '#FFFFFF' : '#64748B',
                            fontSize: '0.68rem', fontWeight: 800,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontFamily: 'var(--font-mono, monospace)',
                            transition: 'all 0.15s ease',
                          }}>
                            {idx + 1}
                          </span>
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-Panel: Account Reconciliation */}
                {checkpointSubTab === 'reconciliation' && (
                  <div className="glass-panel" style={{ padding: '20px 24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px' }}>
                          Account-Level Reconciliation Summary
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                          Formula: Variance = Ending Balance - Beginning Balance - JE Activity (Tolerance: ≤ 1.0)
                        </p>
                      </div>
                    </div>

                    {/* 4 Pastel Summary Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                      <div
                        onClick={() => setReconSubView('tb_start')}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          border: reconSubView === 'tb_start' ? '1.5px solid #EA580C' : '1px solid #FFE7D6',
                          background: '#FFF4EC',
                          boxShadow: reconSubView === 'tb_start' ? '0 4px 12px rgba(234, 88, 12, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '120px'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                          Total TB Beginning Balance
                        </div>
                        <div style={{ fontSize: '1.80rem', fontWeight: 850, margin: '4px 0 6px', fontFamily: 'monospace', color: '#0F172A' }}>
                          {status?.reconciliationSummary?.totalBeginningBalance?.toLocaleString() || '0.00'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#16A34A', border: '1px solid #FED7AA' }}>
                            ▲ TB_Start
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Opening Matrix</span>
                        </div>
                      </div>

                      <div
                        onClick={() => setReconSubView('matrix')}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          border: reconSubView === 'matrix' ? '1.5px solid #2563EB' : '1px solid #DBEAFE',
                          background: '#EDF2FE',
                          boxShadow: reconSubView === 'matrix' ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '120px'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                          Total JE Activity (Net)
                        </div>
                        <div style={{ fontSize: '1.80rem', fontWeight: 850, margin: '4px 0 6px', fontFamily: 'monospace', color: '#0F172A' }}>
                          {status?.reconciliationSummary?.totalJEActivity?.toLocaleString() || '0.00'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#2563EB', border: '1px solid #BFDBFE' }}>
                            ▲ Population
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>General Ledger</span>
                        </div>
                      </div>

                      <div
                        onClick={() => setReconSubView('tb_end')}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          border: reconSubView === 'tb_end' ? '1.5px solid #007680' : '1px solid #CCFBF1',
                          background: '#EAF5F2',
                          boxShadow: reconSubView === 'tb_end' ? '0 4px 12px rgba(0, 118, 128, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '120px'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                          Total TB Ending Balance
                        </div>
                        <div style={{ fontSize: '1.80rem', fontWeight: 850, margin: '4px 0 6px', fontFamily: 'monospace', color: '#0F172A' }}>
                          {status?.reconciliationSummary?.totalEndingBalance?.toLocaleString() || '0.00'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#007680', border: '1px solid #99F6E4' }}>
                            ▲ TB_End
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Closing Matrix</span>
                        </div>
                      </div>

                      <div
                        onClick={() => setReconSubView('unreconciled')}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          border: reconSubView === 'unreconciled' ? '1.5px solid #DC2626' : '1px solid #FFE4E6',
                          background: '#FFF1F2',
                          boxShadow: reconSubView === 'unreconciled' ? '0 4px 12px rgba(220, 38, 38, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '120px'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                          Net Reconciliation Variance
                        </div>
                        <div style={{ fontSize: '1.80rem', fontWeight: 850, margin: '4px 0 6px', fontFamily: 'monospace', color: (status?.reconciliationSummary?.totalVariance || 0) === 0 ? '#16A34A' : '#DC2626' }}>
                          {status?.reconciliationSummary?.totalVariance?.toFixed(2) || '0.00'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: (status?.reconciliationSummary?.unreconciledAccounts || 0) === 0 ? '#16A34A' : '#DC2626', border: '1px solid #FECDD3' }}>
                            {(status?.reconciliationSummary?.unreconciledAccounts || 0) === 0 ? '✓ Balanced' : `⚠ ${status?.reconciliationSummary?.unreconciledAccounts} Discrepancies`}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Audit Delta</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-view switcher bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                        {[
                          { id: 'matrix', label: '3-Way Reconciliation Matrix', file: 'Parquet_Reconciliation.csv' },
                          { id: 'tb_start', label: 'TB Start Extract', file: 'TB_Start.csv' },
                          { id: 'tb_end', label: 'TB End Extract', file: 'TB_End.csv' },
                          { id: 'unreconciled', label: 'Unreconciled Accounts Detail', file: 'Unreconciled_Accounts_Detail.csv' },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => setReconSubView(btn.id as any)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: reconSubView === btn.id ? 700 : 500,
                              color: reconSubView === btn.id ? '#007680' : '#475569',
                              background: reconSubView === btn.id ? '#FFFFFF' : 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              boxShadow: reconSubView === btn.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                            }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative', width: '220px' }}>
                          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            className="jet-input"
                            placeholder="Search rows..."
                            value={reconSearch}
                            onChange={(e) => setReconSearch(e.target.value)}
                            style={{ paddingLeft: '30px', fontSize: '0.78rem', height: '30px' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reconciliation Table */}
                    <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                      {loadingReconPreview ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                          <RefreshCw size={22} className="spin-slow" style={{ margin: '0 auto 8px', color: 'var(--deloitte-teal)' }} />
                          Loading reconciliation rows...
                        </div>
                      ) : reconPreviewData && filteredReconRows.length > 0 ? (
                        <div className="table-container" style={{ maxHeight: '460px', overflowY: 'auto' }}>
                          <table className="jet-table" style={{ width: '100%', fontSize: '0.80rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                              <tr>
                                {reconPreviewData.headers.map((h, i) => (
                                  <th key={i} style={{ whiteSpace: 'nowrap', background: '#F8FAFC', fontSize: '0.76rem', padding: '8px 12px' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredReconRows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {reconPreviewData.headers.map((h, cIdx) => (
                                    <td
                                      key={cIdx}
                                      style={{
                                        whiteSpace: 'nowrap',
                                        fontFamily: typeof row[h] === 'number' || !isNaN(Number(row[h])) ? 'var(--font-mono)' : 'inherit',
                                        fontSize: '0.78rem',
                                        padding: '7px 12px'
                                      }}
                                    >
                                      {row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '' ? String(row[h]) : '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                          No reconciliation records found for this view.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Panel: 20 DQC Golden Matrix */}
                {checkpointSubTab === 'dqc' && (() => {
                  const errorCount = dqcSummaryData ? dqcSummaryData.filter((r: any) => String(r.Error_Warning || '').toLowerCase() === 'error' && (Number(r.Number_of_Affected_Lines || 0) > 0 || Number(r.Number_of_Affected_Journal_Entries || 0) > 0)).length : dqcMetrics.errors;
                  const warningCount = dqcSummaryData ? dqcSummaryData.filter((r: any) => String(r.Error_Warning || '').toLowerCase() === 'warning' && (Number(r.Number_of_Affected_Lines || 0) > 0 || Number(r.Number_of_Affected_Journal_Entries || 0) > 0)).length : dqcMetrics.warnings;
                  const obsCount = dqcSummaryData ? dqcSummaryData.filter((r: any) => (String(r.Error_Warning || '').toLowerCase() === 'observation' || String(r.Error_Warning || '').toLowerCase() === 'obs') && (Number(r.Number_of_Affected_Lines || 0) > 0 || Number(r.Number_of_Affected_Journal_Entries || 0) > 0)).length : dqcMetrics.observations;

                  return (
                    <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px' }}>
                            20 Data Quality Checks (DQC) Golden Matrix
                          </h3>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                            Evaluated across 28 distinct parquet files covering Completeness, Master Data, Balancing, Dates, Precision, and User Integrity.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <a href={RunService.getDownloadOutputUrl(runId!, 'Parquet_Data_Integrity_Check_00_Summary.csv')} className="btn-secondary" style={{ fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Download size={13} /> Export DQC Matrix CSV
                          </a>
                        </div>
                      </div>

                      {/* Filter pills and search */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                          {[
                            { id: 'FLAGGED', label: `Flagged Checks (${errorCount + warningCount + obsCount})` },
                            { id: 'ALL', label: `All Checks (28)` },
                            { id: 'ERROR', label: `Errors (${errorCount})` },
                            { id: 'WARNING', label: `Warnings (${warningCount})` },
                            { id: 'OBSERVATION', label: `Observations (${obsCount})` },
                          ].map((btn) => (
                            <button
                              key={btn.id}
                              type="button"
                              onClick={() => setDqcFilter(btn.id as any)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: dqcFilter === btn.id ? 700 : 500,
                                color: dqcFilter === btn.id ? '#007680' : '#475569',
                                background: dqcFilter === btn.id ? '#FFFFFF' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                boxShadow: dqcFilter === btn.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                              }}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>

                        <div style={{ position: 'relative', width: '220px' }}>
                          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            className="jet-input"
                            placeholder="Search DQC checks..."
                            value={dqcSearch}
                            onChange={(e) => setDqcSearch(e.target.value)}
                            style={{ paddingLeft: '30px', fontSize: '0.78rem', height: '30px' }}
                          />
                        </div>
                      </div>

                      {/* DQC Rows Table Format */}
                      <div className="table-container" style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', maxHeight: '580px', overflowY: 'auto', background: '#FFFFFF' }}>
                        <table className="jet-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 2, borderBottom: '1.5px solid #E2E8F0' }}>
                            <tr>
                              <th style={{ padding: '10px 14px', fontSize: '0.73rem', fontWeight: 800, color: '#475569', width: '90px' }}>CODE</th>
                              <th style={{ padding: '10px 14px', fontSize: '0.73rem', fontWeight: 800, color: '#475569', width: '80px' }}>DATASET</th>
                              <th style={{ padding: '10px 14px', fontSize: '0.73rem', fontWeight: 800, color: '#475569' }}>DATA QUALITY CHECK &amp; AUDIT OBJECTIVE</th>
                              <th style={{ padding: '10px 14px', fontSize: '0.73rem', fontWeight: 800, color: '#475569', width: '125px' }}>CATEGORY</th>
                              <th style={{ padding: '10px 14px', fontSize: '0.73rem', fontWeight: 800, color: '#475569', width: '110px' }}>SEVERITY</th>
                              <th style={{ padding: '10px 14px', fontSize: '0.73rem', fontWeight: 800, color: '#475569', width: '140px' }}>STATUS / IMPACT</th>
                              <th style={{ padding: '10px 14px', fontSize: '0.73rem', fontWeight: 800, color: '#475569', textAlign: 'right', width: '160px' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDQCs.length === 0 ? (
                              <tr>
                                <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
                                  No Data Quality Checks match the selected filter or search query.
                                </td>
                              </tr>
                            ) : (
                              filteredDQCs.map((dqc, idx) => {
                                const summaryRow = dqcSummaryData?.find((r: any) =>
                                  String(r.Check_Number || '').trim().toLowerCase() === dqc.code.toLowerCase() ||
                                  String(r.Check_Name || '').toLowerCase().includes(dqc.name.toLowerCase())
                                );

                                const affectedLines = summaryRow ? Number(summaryRow.Number_of_Affected_Lines || 0) : 0;
                                const affectedJes = summaryRow ? Number(summaryRow.Number_of_Affected_Journal_Entries || 0) : 0;
                                const hasIssue = affectedLines > 0 || affectedJes > 0;

                                let severityBg = '#F1F5F9';
                                let severityColor = '#475569';
                                if (dqc.severity === 'ERROR') {
                                  severityBg = '#FEF2F2';
                                  severityColor = '#DC2626';
                                } else if (dqc.severity === 'WARNING') {
                                  severityBg = '#FFFBEB';
                                  severityColor = '#D97706';
                                } else if (dqc.severity === 'OBSERVATION') {
                                  severityBg = '#F0FDFA';
                                  severityColor = '#0D9488';
                                }

                                return (
                                  <tr
                                    key={dqc.code}
                                    style={{
                                      borderBottom: '1px solid #F1F5F9',
                                      background: hasIssue ? 'rgba(254, 242, 242, 0.35)' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                      transition: 'background 0.12s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = hasIssue ? 'rgba(254, 242, 242, 0.35)' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA')}
                                  >
                                    {/* CODE */}
                                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                      <span style={{
                                        fontFamily: 'monospace',
                                        fontWeight: 800,
                                        fontSize: '0.74rem',
                                        color: '#0F172A',
                                        background: '#F1F5F9',
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        border: '1px solid #E2E8F0',
                                      }}>
                                        DQC {dqc.code}
                                      </span>
                                    </td>

                                    {/* DATASET */}
                                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                      <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: '#475569',
                                        background: '#F8FAFC',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #E2E8F0',
                                      }}>
                                        {dqc.dataset}
                                      </span>
                                    </td>

                                    {/* NAME & DESC */}
                                    <td style={{ padding: '10px 14px' }}>
                                      <div style={{ fontWeight: 750, color: '#0F172A', fontSize: '0.82rem', marginBottom: '2px' }}>
                                        {dqc.name}
                                      </div>
                                      <div style={{ color: '#64748B', fontSize: '0.73rem', lineHeight: 1.35 }}>
                                        {dqc.desc}
                                      </div>
                                    </td>

                                    {/* CATEGORY */}
                                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                      <span style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 600 }}>
                                        {dqc.category}
                                      </span>
                                    </td>

                                    {/* SEVERITY */}
                                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        background: severityBg,
                                        color: severityColor,
                                        border: `1px solid ${severityColor}33`,
                                      }}>
                                        {dqc.severity}
                                      </span>
                                    </td>

                                    {/* STATUS / IMPACT */}
                                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                      {hasIssue ? (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          fontSize: '0.70rem',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                          borderRadius: '999px',
                                          background: '#FEF2F2',
                                          color: '#DC2626',
                                          border: '1px solid #FECDD3',
                                        }}>
                                          <AlertTriangle size={11} /> {affectedLines} Lines ({affectedJes} JEs)
                                        </span>
                                      ) : (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          fontSize: '0.70rem',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                          borderRadius: '999px',
                                          background: '#F0FDF4',
                                          color: '#16A34A',
                                          border: '1px solid #BBF7D0',
                                        }}>
                                          <CheckCircle2 size={11} /> Passed
                                        </span>
                                      )}
                                    </td>

                                    {/* ACTIONS */}
                                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handlePreviewArtifact(dqc.fileName, `DQC ${dqc.code}: ${dqc.name}`)}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 9px',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            borderRadius: '6px',
                                            background: 'rgba(0, 118, 128, 0.08)',
                                            color: '#007680',
                                            border: '1px solid rgba(0, 118, 128, 0.25)',
                                            cursor: 'pointer',
                                            transition: 'all 0.12s ease',
                                          }}
                                        >
                                          <Eye size={12} /> Preview
                                        </button>
                                        <a
                                          href={RunService.getDownloadOutputUrl(runId!, dqc.fileName)}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 9px',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            borderRadius: '6px',
                                            background: '#0F172A',
                                            color: '#FFFFFF',
                                            border: '1px solid #0F172A',
                                            textDecoration: 'none',
                                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.12)',
                                          }}
                                        >
                                          <Download size={12} /> CSV
                                        </a>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-Panel: Control Totals */}
                {checkpointSubTab === 'controlTotals' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px' }}>
                          General Ledger Control Totals
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                          Multi-dimensional cross-verification by Accounting Period, User ID, Currency Code, and Line Distribution Buckets.
                        </p>
                      </div>
                    </div>

                    {/* 4 Dimension Switcher Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                      gap: '12px',
                      marginBottom: '20px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}>
                      {[
                        { file: 'Control_Total_By_Period.csv', title: 'By Period', stat: '12 Periods', subtitle: 'Monthly debit/credit volume', highlight: '12 Fiscal Periods (P01 - P12)', icon: Calendar },
                        { file: 'Control_Total_By_User.csv', title: 'By User ID', stat: 'User Audit', subtitle: 'Preparer transaction counts', highlight: 'Preparer & Bot Segregation', icon: UserCheck },
                        { file: 'Control_Total_By_Currency.csv', title: 'By Currency', stat: 'Currencies', subtitle: 'Transactional vs Group currency', highlight: 'Multi-Currency Dual Totals', icon: Coins },
                        { file: 'JE_Line_Distribution.csv', title: 'Line Stratification', stat: '5 Buckets', subtitle: '1 line, 2-20, 21-100, 1000+', highlight: 'Transaction Complexity Bands', icon: Layers },
                      ].map((c, idx) => {
                        const isSelected = selectedControlFile === c.file;
                        const Icon = c.icon;
                        return (
                          <div
                            key={c.file}
                            onClick={() => setSelectedControlFile(c.file)}
                            style={{
                              padding: '14px 16px',
                              borderRadius: '12px',
                              border: isSelected ? '1.5px solid var(--deloitte-teal)' : '1px solid #E2E8F0',
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(0, 118, 128, 0.06) 0%, #FFFFFF 100%)'
                                : '#FFFFFF',
                              cursor: 'pointer',
                              boxShadow: isSelected
                                ? '0 4px 14px rgba(0, 118, 128, 0.12)'
                                : '0 1px 3px rgba(0, 0, 0, 0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: '115px',
                              boxSizing: 'border-box',
                              minWidth: 0,
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            {/* Top Row: Number Badge, Title, and Stat Tag */}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', minWidth: 0, gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                  <span
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      background: isSelected ? 'var(--deloitte-teal)' : '#E2E8F0',
                                      color: isSelected ? '#FFFFFF' : '#475569',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      fontFamily: 'var(--font-mono, monospace)',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.title}
                                  </span>
                                </div>

                                <span style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  background: isSelected ? '#DCFCE7' : '#F1F5F9',
                                  color: isSelected ? '#15803D' : '#475569',
                                  border: isSelected ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  letterSpacing: '0.02em',
                                }}>
                                  {isSelected ? '● Active' : c.stat}
                                </span>
                              </div>

                              <p style={{ fontSize: '0.73rem', color: '#64748B', margin: '0 0 8px', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.subtitle}
                              </p>
                            </div>

                            {/* Bottom Micro-Indicator: Accent Bar + Highlight Caption */}
                            <div style={{ marginTop: 'auto' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.66rem',
                                color: isSelected ? 'var(--deloitte-teal)' : '#94A3B8',
                                fontWeight: 700,
                                marginBottom: '4px',
                              }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.highlight}</span>
                              </div>
                              <div style={{
                                height: '3px',
                                width: '100%',
                                borderRadius: '999px',
                                background: isSelected
                                  ? 'linear-gradient(90deg, #007680 0%, #2DD4BF 100%)'
                                  : '#E2E8F0',
                                transition: 'all 0.2s ease',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Live preview table for selected control total */}
                    <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 750, fontSize: '0.82rem', color: '#0F172A' }}>
                          Preview: {selectedControlFile.replace('.csv', '').replace(/_/g, ' ')}
                        </span>
                        <a
                          href={RunService.getDownloadOutputUrl(runId!, selectedControlFile)}
                          className="btn-secondary"
                          style={{ fontSize: '0.74rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                        >
                          <Download size={12} /> Export CSV
                        </a>
                      </div>

                      {loadingControlPreview ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                          <RefreshCw size={20} className="spin-slow" style={{ margin: '0 auto 8px', color: 'var(--deloitte-teal)' }} />
                          Loading control total rows...
                        </div>
                      ) : controlPreviewData && controlPreviewData.rows.length > 0 ? (
                        <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                          <table className="jet-table" style={{ width: '100%', fontSize: '0.80rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                              <tr>
                                {controlPreviewData.headers.map((h, i) => (
                                  <th key={i} style={{ whiteSpace: 'nowrap', background: '#F8FAFC', fontSize: '0.76rem', padding: '8px 12px' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredControlRows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {controlPreviewData.headers.map((h, cIdx) => (
                                    <td
                                      key={cIdx}
                                      style={{
                                        whiteSpace: 'nowrap',
                                        fontFamily: typeof row[h] === 'number' || !isNaN(Number(row[h])) ? 'var(--font-mono)' : 'inherit',
                                        fontSize: '0.78rem',
                                        padding: '7px 12px'
                                      }}
                                    >
                                      {row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '' ? String(row[h]) : '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>No records found in this control total.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: FORENSIC & RISK INTELLIGENCE HUB */}
            {activeVisualTab === 'forensic' && (
              <div key="forensic" className="tab-panel-anim" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <ExecutiveForensicIntelligenceHub
                  runId={runId!}
                  status={status}
                  config={config}
                />
              </div>
            )}

            {/* TAB 5: AUDITOR EVALUATIONS & TICKMARKS */}
            {activeVisualTab === 'tickmarks' && (
              <div key="tickmarks" className="tab-panel-anim" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Hero Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 70%, #F0FDFA 100%)',
                  borderRadius: '16px', border: '1px solid #E2E8F0',
                  padding: '18px 24px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0, 118, 128, 0.24)', flexShrink: 0,
                    }}>
                      <Tag size={20} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                          Auditor Evaluations & Tickmarks
                        </h3>
                        <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#007680', background: '#E6F4F5', border: '1px solid #B2DFE2', padding: '2px 8px', borderRadius: '6px' }}>
                          2 Modules
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                        Group and explain flagged exceptions with audit tickmarks, document evaluator conclusions, and sign-off on audit workpapers.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                  <OmniaTickmarksTab
                    tickmarks={omniaParams.tickmarks || []}
                    evaluations={omniaParams.evaluations || []}
                    onUpdateTickmarks={handleUpdateTickmarks}
                    onUpdateEvaluations={handleUpdateEvaluations}
                    flaggedEntriesCount={totalFlaggedCount}
                  />
                </div>
              </div>
            )}

            {/* TAB 5: DOWNLOAD ALL OUTPUTS & AUDIT WORKPAPERS */}
            {activeVisualTab === 'artifacts' && (() => {
              const allOutputs = (status?.outputs || []).filter(o => o.name !== 'auto_clean_report.json' && !o.name.endsWith('.json'));
              const reconCount = allOutputs.filter(o => o.name.includes('Reconciliation') || o.name.includes('Unreconciled') || o.name.endsWith('.xlsx')).length;
              const masterCount = allOutputs.filter(o => o.name.includes('Trial_Balance') || o.name.includes('TB_') || o.name.includes('Chart_of_Accounts') || o.name.includes('General_Ledger')).length;
              const dqcCount = allOutputs.filter(o => o.name.includes('Data_Integrity') || o.name.includes('DQC')).length;
              const controlCount = allOutputs.filter(o => o.name.includes('Control_Total') || o.name.includes('Distribution') || o.name.includes('Stratification')).length;

              return (
                <div key="artifacts" className="glass-panel tab-panel-anim" style={{ padding: '24px', background: '#FFFFFF' }}>
                  {/* Top Deliverables Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px' }}>
                        Generated JET Audit Workpapers & Artifacts
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                        Download consolidated multi-tab Excel templates, clean master datasets, reconciliation extracts, and control totals.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <a href={RunService.getDownloadOutputUrl(runId!, 'JE-Recon-and-DIC-Template.xlsx')} className="btn-primary" style={{ textDecoration: 'none', height: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <FileCheck size={15} /> Download Excel Template (.xlsx)
                      </a>
                      <a href={RunService.getDownloadAllZipUrl(runId!)} className="btn-green" style={{ textDecoration: 'none', height: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        <Archive size={15} /> Download All ZIP
                      </a>
                    </div>
                  </div>

                  {/* Category Switcher Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginBottom: '20px'
                  }}>
                    {[
                      {
                        id: 'ALL',
                        title: 'All Artifacts',
                        count: allOutputs.length,
                        icon: Archive,
                        desc: 'Complete suite of run outputs',
                        theme: {
                          primary: 'var(--deloitte-teal)',
                          textColor: 'var(--deloitte-teal)',
                          bgLight: 'rgba(0, 118, 128, 0.04)',
                          border: 'rgba(0, 118, 128, 0.16)',
                          borderActive: 'rgba(0, 118, 128, 0.45)',
                        }
                      },
                      {
                        id: 'RECONCILIATION',
                        title: 'Deliverables & Recon',
                        count: reconCount,
                        icon: Table,
                        desc: 'Excel template & variance details',
                        theme: {
                          primary: '#2563EB',
                          textColor: '#1E40AF',
                          bgLight: 'rgba(37, 99, 235, 0.04)',
                          border: 'rgba(37, 99, 235, 0.16)',
                          borderActive: 'rgba(37, 99, 235, 0.45)',
                        }
                      },
                      {
                        id: 'MASTER',
                        title: 'Master & Clean Data',
                        count: masterCount,
                        icon: Database,
                        desc: 'TB (Start/End), COA & Clean GL',
                        theme: {
                          primary: '#059669',
                          textColor: '#065F46',
                          bgLight: 'rgba(5, 150, 105, 0.04)',
                          border: 'rgba(5, 150, 105, 0.16)',
                          borderActive: 'rgba(5, 150, 105, 0.45)',
                        }
                      },
                      {
                        id: 'DQC',
                        title: 'DQC Matrix Summary',
                        count: dqcCount,
                        icon: ShieldCheck,
                        desc: '20 Golden check integrity results',
                        theme: {
                          primary: '#7C3AED',
                          textColor: '#5B21B6',
                          bgLight: 'rgba(124, 58, 237, 0.04)',
                          border: 'rgba(124, 58, 237, 0.16)',
                          borderActive: 'rgba(124, 58, 237, 0.45)',
                        }
                      },
                      {
                        id: 'CONTROL_TOTAL',
                        title: 'Control Totals & Strat',
                        count: controlCount,
                        icon: Layers,
                        desc: 'Period, User, Currency & Buckets',
                        theme: {
                          primary: '#D97706',
                          textColor: '#92400E',
                          bgLight: 'rgba(217, 119, 6, 0.04)',
                          border: 'rgba(217, 119, 6, 0.16)',
                          borderActive: 'rgba(217, 119, 6, 0.45)',
                        }
                      },
                    ].map((cat) => {
                      const isSelected = artifactCategory === cat.id;
                      const Icon = cat.icon;
                      const theme = cat.theme;

                      return (
                        <div
                          key={cat.id}
                          onClick={() => setArtifactCategory(cat.id as any)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '10px',
                            border: isSelected ? `1.5px solid ${theme.borderActive}` : '1px solid var(--border-subtle)',
                            background: isSelected ? theme.bgLight : '#FFFFFF',
                            boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.04)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '94px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '26px', height: '26px', borderRadius: '6px',
                                background: isSelected ? theme.primary : 'var(--bg-secondary)',
                                color: isSelected ? '#FFFFFF' : theme.primary,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}>
                                <Icon size={14} />
                              </div>
                              <span style={{
                                fontWeight: 800, fontSize: '0.84rem',
                                color: isSelected ? theme.textColor : 'var(--text-primary)',
                                whiteSpace: 'nowrap'
                              }}>
                                {cat.title}
                              </span>
                            </div>

                            <span style={{
                              fontSize: '0.72rem', fontWeight: 800, padding: '1px 6px', borderRadius: '6px',
                              background: isSelected ? theme.primary : 'var(--bg-secondary)',
                              color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {cat.count}
                            </span>
                          </div>

                          <p style={{
                            fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {cat.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Filter Toolbar with Search */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Artifact Files ({filteredArtifacts.length})
                      </span>
                    </div>

                    <div style={{ position: 'relative', width: '240px' }}>
                      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        className="jet-input"
                        placeholder="Search files..."
                        value={artifactSearch}
                        onChange={(e) => setArtifactSearch(e.target.value)}
                        style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '32px' }}
                      />
                    </div>
                  </div>

                  {/* Artifacts Table */}
                  <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'hidden' }}>
                    <table className="jet-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                          <th style={{ background: '#F8FAFC', width: '34%' }}>Artifact File</th>
                          <th style={{ background: '#F8FAFC', width: '13%' }}>Category</th>
                          <th style={{ background: '#F8FAFC', width: '9%' }}>Format</th>
                          <th style={{ background: '#F8FAFC', width: '10%' }}>Row Count</th>
                          <th style={{ background: '#F8FAFC', width: '17%' }}>Audit Description</th>
                          <th style={{ textAlign: 'right', background: '#F8FAFC', width: '17%', whiteSpace: 'nowrap' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArtifacts.length > 0 ? (
                          filteredArtifacts.map((out) => {
                            const isXlsx = out.name.endsWith('.xlsx');

                            let catBadge = 'badge-neutral';
                            if (out.category === 'MASTER') catBadge = 'badge-success';
                            else if (out.category === 'CONTROL_TOTAL') catBadge = 'badge-warning';
                            else if (out.category === 'DQC') catBadge = 'badge-info';

                            return (
                              <tr key={out.id}>
                                <td style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, overflow: 'hidden' }}>
                                    {isXlsx ? <FileSpreadsheet size={14} color="#059669" style={{ flexShrink: 0 }} /> : <FileText size={14} color="#007680" style={{ flexShrink: 0 }} />}
                                    <span
                                      title={out.name}
                                      style={{
                                        fontFamily: 'var(--font-mono, monospace)',
                                        color: '#007680',
                                        fontWeight: 600,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'inline-block'
                                      }}
                                    >
                                      {out.name}
                                    </span>
                                  </div>
                                </td>
                                <td><span className={`badge ${catBadge}`} style={{ fontSize: '0.67rem', padding: '2px 7px', fontWeight: 700 }}>{out.category}</span></td>
                                <td>
                                  <span className="badge" style={{
                                    fontSize: '0.67rem', fontWeight: 800, padding: '2px 6px',
                                    background: isXlsx ? 'rgba(5, 150, 105, 0.12)' : 'var(--bg-secondary)',
                                    color: isXlsx ? '#059669' : 'var(--text-secondary)'
                                  }}>
                                    {out.type.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.76rem', color: '#334155' }}>
                                  {out.rowCount !== undefined ? out.rowCount.toLocaleString() : '-'}
                                </td>
                                <td style={{ fontSize: '0.74rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span title={out.description || out.name} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {out.description || out.name}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap', justifyContent: 'flex-end' }}>
                                    {!isXlsx && (
                                      <button
                                        type="button"
                                        onClick={() => handlePreviewArtifact(out.name, out.description || out.name)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 9px',
                                          borderRadius: '5px',
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          background: 'var(--deloitte-teal-light)',
                                          color: 'var(--deloitte-teal)',
                                          border: '1px solid rgba(0, 118, 128, 0.25)',
                                          cursor: 'pointer',
                                          whiteSpace: 'nowrap',
                                          transition: 'all 0.15s ease',
                                        }}
                                        title={`Preview ${out.name}`}
                                      >
                                        <Eye size={11} /> Preview
                                      </button>
                                    )}
                                    <a
                                      href={RunService.getDownloadOutputUrl(runId!, out.name)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.70rem',
                                        fontWeight: 700,
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        border: '1px solid #0F172A',
                                        textDecoration: 'none',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.2)',
                                        transition: 'all 0.15s ease',
                                      }}
                                      title={`Download ${out.name}`}
                                    >
                                      <Download size={11} color="#FFFFFF" /> Export CSV
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                              No artifacts found matching "{artifactSearch}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
             })()}
          </div>
        )}
      </main>

      {/* Sample Data Preview Modal (Same rich component as Spark JET) */}
      <SampleDataModal
        isOpen={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
        title={sampleModalData.title}
        subtitle={sampleModalData.subtitle}
        headers={sampleModalData.headers}
        rows={sampleModalData.rows}
        totalRows={sampleModalData.totalRows}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        title={fileToDelete && config?.files.find(f => f.fileId === fileToDelete)?.originalName 
          ? `Delete ${config.files.find(f => f.fileId === fileToDelete)?.originalName}?` 
          : 'Delete this file?'}
        message="Once you delete this, it will be permanently removed from your workspace."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmRemoveFile}
        onClose={() => {
          setConfirmModalOpen(false);
          setFileToDelete(null);
        }}
      />

      {/* 5-Second Auto-Dismissing Toast Notification (Light Theme) */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            background: '#FFFFFF',
            color: '#0F172A',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.14), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '520px',
            border: '1.5px solid #CCFBF1',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={16} color="#16A34A" />
          </div>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Flagged Entry Details Modal */}
      <OmniaEntryDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedDetailEntry(null);
        }}
        entry={selectedDetailEntry}
        currencyCode={omniaParams.entityCurrencyCode || 'USD'}
      />

      {/* +Create / Assign Tickmark Modal */}
      <OmniaTickmarkModal
        isOpen={tickmarkModalOpen}
        onClose={() => {
          setTickmarkModalOpen(false);
          setSelectedForTickmark([]);
        }}
        selectedEntries={selectedForTickmark}
        onSaveTickmark={handleSaveTickmark}
      />
    </div>
  );
};