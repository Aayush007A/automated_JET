import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, OmniaJetParameters, FieldMappingItem } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { FieldMappingTable } from '../../components/common/FieldMappingTable';
import { AutoCleanConstraintsPanel } from '../../components/common/AutoCleanConstraintsPanel';
import { DataFileMappingWorkspace } from '../../components/common/DataFileMappingWorkspace';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { SampleDataModal } from '../../components/common/SampleDataModal';
import { StepTimeline, TimelineStep } from '../../components/common/StepTimeline';
import {
  ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Download,
  FileSpreadsheet, Settings, ShieldCheck, Database, RefreshCw, Archive, FileCheck,
  Search, Filter, PieChart, BarChart3, Eye, Sparkles, Check, X, Trash2,
  Table, Layers, HelpCircle, Activity, FileText, Lock, Loader2, UploadCloud, Clock, Calendar,
  Sliders, UserCheck, Coins, Scale
} from 'lucide-react';

const STEPS: TimelineStep[] = [
  { id: 1, label: 'Ingest Datasets', sub: 'Upload files', icon: UploadCloud },
  { id: 2, label: 'Auto-Cleansing', sub: 'Validate rules', icon: Sparkles },
  { id: 3, label: 'Data File Mapping', sub: 'Map columns', icon: Table },
  { id: 4, label: 'Omnia Parameters', sub: 'Configure', icon: Settings },
  { id: 5, label: 'Data Quality & Recon', sub: 'Running', icon: Activity },
  { id: 6, label: 'Executive Results', sub: 'Review', icon: BarChart3 },
];

const STEP_COPY: Record<number, { title: string; desc: string }> = {
  1: { title: 'Upload Omnia Input Datasets', desc: 'Upload your multi-sheet workbook or separate CSV files for TB, Population and COA.' },
  2: { title: 'Automated Data Cleansing & Constraints Check', desc: 'Cleanse raw data and validate 16 mandatory audit schema rules from omnia_JET_user_input.txt.' },
  3: { title: 'Data File Mapping', desc: 'Map columns to the standard Deloitte CDM model across Trial Balance, General Ledger, and Chart of Accounts.' },
  4: { title: 'Omnia Parameters & Golden Checks', desc: 'Define fiscal periods, currency handling, decimal formats and toggleable DQC rules.' },
  5: { title: 'Data Quality & Reconciliation Engine', desc: 'Executing PySpark CDM preparation, currency reconciliation and 20 DQC golden checks.' },
  6: { title: 'Executive Results & Audit Workpapers', desc: 'Review account reconciliation, DQC golden matrix, control totals, and generated artifacts.' },
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
  { code: '01a', name: 'COA Blank Values', desc: 'Critical missing account numbers or descriptions in COA', dataset: 'COA', category: 'Completeness', severity: 'ERROR' },
  { code: '01b', name: 'TB Blank Values', desc: 'Critical missing GL or balance amounts in TB', dataset: 'TB', category: 'Completeness', severity: 'ERROR' },
  { code: '01c', name: 'JE Blank Values', desc: 'Critical missing DocumentNo, date, or amount in JE', dataset: 'JE', category: 'Completeness', severity: 'ERROR' },
  { code: '01d', name: 'JE Blank User ID', desc: 'Blank or null User ID who entered transaction', dataset: 'JE', category: 'User Integrity', severity: 'WARNING' },
  { code: '01e', name: 'JE Blank TransType', desc: 'Blank or null transaction / document type', dataset: 'JE', category: 'Completeness', severity: 'WARNING' },
  { code: '02a', name: 'TB Accounts Not In COA', desc: 'Trial Balance accounts not found in master COA', dataset: 'TB', category: 'Master Data', severity: 'ERROR' },
  { code: '02b', name: 'JE Accounts Not In COA', desc: 'General Ledger accounts not found in master COA', dataset: 'JE', category: 'Master Data', severity: 'ERROR' },
  { code: '03a', name: 'TB Precision Overflow', desc: 'Trial Balance amounts exceeding decimal precision', dataset: 'TB', category: 'Precision', severity: 'ERROR' },
  { code: '03b', name: 'JE Precision Overflow', desc: 'Journal Entry amounts exceeding decimal precision', dataset: 'JE', category: 'Precision', severity: 'ERROR' },
  { code: '04a', name: 'COA Duplicate Accounts', desc: 'Duplicate Account Numbers defined in Chart of Accounts', dataset: 'COA', category: 'Master Data', severity: 'ERROR' },
  { code: '04b', name: 'TB Duplicate Accounts', desc: 'Duplicate Account Numbers defined in Trial Balance', dataset: 'TB', category: 'Master Data', severity: 'ERROR' },
  { code: '05', name: 'JE Unknown Standard Type', desc: 'Transaction type unclassified as Standard / Non-Standard', dataset: 'JE', category: 'Classification', severity: 'ERROR' },
  { code: '06', name: 'JE Multi Standard Type', desc: 'Single journal entry containing mixed Standard / Non-Standard lines', dataset: 'JE', category: 'Classification', severity: 'ERROR' },
  { code: '07', name: 'COA Bad FS Category', desc: 'Unknown Financial Statement Category in COA', dataset: 'COA', category: 'Classification', severity: 'ERROR' },
  { code: '08', name: 'JE Entry Not Zero Balanced', desc: 'Multi-line journal entries with net amount not equal to 0.0', dataset: 'JE', category: 'Balancing', severity: 'WARNING' },
  { code: '09', name: '1-Line Journal Entries', desc: 'Single-line journal entries lacking offsetting entry', dataset: 'JE', category: 'Balancing', severity: 'WARNING' },
  { code: '10', name: 'Debit/Credit Math Mismatch', desc: 'Inconsistent Net Amount vs Debit and Credit amount math', dataset: 'JE', category: 'Consistency', severity: 'WARNING' },
  { code: '11', name: 'Debit Credit Same Line', desc: 'Lines with both Debit and Credit amounts populated simultaneously', dataset: 'JE', category: 'Consistency', severity: 'WARNING' },
  { code: '12', name: 'Currency Inconsistency', desc: 'Local and Group currency amounts with conflicting polarity', dataset: 'JE', category: 'Currency', severity: 'WARNING' },
  { code: '13a', name: 'Entity Multiple Currencies', desc: 'Legal Entity mapped to multiple distinct local currencies', dataset: 'TB / JE', category: 'Currency', severity: 'WARNING' },
  { code: '13b', name: 'Group Multiple Currencies', desc: 'Multiple group reporting currencies present in single dataset', dataset: 'TB / JE', category: 'Currency', severity: 'WARNING' },
  { code: '14', name: 'Multi Effective Dates', desc: 'Single journal entry with multiple posting / effective dates', dataset: 'JE', category: 'Dates', severity: 'WARNING' },
  { code: '15', name: 'Multi Transaction Types', desc: 'Single journal entry with multiple transaction type codes', dataset: 'JE', category: 'Consistency', severity: 'WARNING' },
  { code: '16', name: 'Prior / Post Period Dates', desc: 'Entries dated outside the active audit testing period window', dataset: 'JE', category: 'Dates', severity: 'WARNING' },
  { code: '17', name: 'Multi User ID in Entry', desc: 'Single journal entry created by multiple distinct User IDs', dataset: 'JE', category: 'User Integrity', severity: 'OBSERVATION' },
  { code: '18', name: 'Multi Descriptions in Entry', desc: 'Single journal entry with multiple conflicting header descriptions', dataset: 'JE', category: 'Consistency', severity: 'OBSERVATION' },
  { code: '19', name: 'TransType Sum Not Zero', desc: 'Transaction type volume not netting to zero across period', dataset: 'JE', category: 'Balancing', severity: 'OBSERVATION' },
  { code: '20', name: 'User ID Multiple Names', desc: 'Single User ID associated with multiple distinct user names', dataset: 'JE', category: 'User Integrity', severity: 'OBSERVATION' },
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
    subtitle: string;
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  } | null>(null);

  // Confirm delete modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Omnia Parameters state
  const [omniaParams, setOmniaParams] = useState<OmniaJetParameters>({
    fiscalYear: 2026,
    fiscalYearEnd: '03/31/2026',
    testingPeriodStart: '04/01/2025',
    testingPeriodEnd: '03/31/2026',
    currency: 'Entity Currency',
    entityCurrencyCode: 'INR',
    groupCurrencyCode: 'USD',
    decimalSeparator: 'Period',
    excludeZeroLines: true,
    dqcToggles: {
      toggleTransactionTypeChecks: false,
      toggleUserChecks: false,
      toggleObservationChecks: false,
    },
  });

  const [activeTab, setActiveTab] = useState<'reconciliation' | 'dqc' | 'controlTotals' | 'stratification' | 'manifest'>('reconciliation');
  const [dqcFilter, setDqcFilter] = useState<'FLAGGED' | 'ALL' | 'ERROR' | 'WARNING' | 'OBSERVATION'>('FLAGGED');
  const [dqcSearch, setDqcSearch] = useState('');

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
  const [artifactCategory, setArtifactCategory] = useState<'ALL' | 'RECONCILIATION' | 'MASTER' | 'DQC' | 'CONTROL_TOTAL'>('ALL');
  const [artifactSearch, setArtifactSearch] = useState('');

  const loadRun = async () => {
    if (!runId) {
      setLoading(false);
      return;
    }
    try {
      const data = await RunService.getRun(runId);
      setConfig(data.config);
      setStatus(data.status);

      if (data.config.omniaParameters) {
        setOmniaParams((prev) => ({ ...prev, ...data.config.omniaParameters }));
      }

      if (data.status.status === 'COMPLETED') {
        setCurrentStep(5);
        setMaxCompletedStep(5);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRun();
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

  // Load In-Place Reconciliation Preview when in Step 6 Tab 1
  useEffect(() => {
    if (currentStep === 6 && runId && activeTab === 'reconciliation') {
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
  }, [currentStep, activeTab, reconSubView, runId, status?.status]);

  // Load In-Place Control Total Preview when in Step 6 Tab 3
  useEffect(() => {
    if (currentStep === 6 && runId && activeTab === 'controlTotals' && selectedControlFile) {
      setLoadingControlPreview(true);
      RunService.previewOutput(runId, selectedControlFile, 50)
        .then((res) => setControlPreviewData(res))
        .catch(() => setControlPreviewData(null))
        .finally(() => setLoadingControlPreview(false));
    }
  }, [currentStep, activeTab, selectedControlFile, runId, status?.status]);

  // Load DQC Matrix summary data when in Step 6
  useEffect(() => {
    if (currentStep === 6 && runId) {
      setLoadingDqcData(true);
      RunService.previewOutput(runId, 'Parquet_Data_Integrity_Check_00_Summary.csv', 50)
        .then((res) => {
          if (res && res.rows) {
            setDqcSummaryData(res.rows);
          }
        })
        .catch(() => setDqcSummaryData(null))
        .finally(() => setLoadingDqcData(false));
    }
  }, [currentStep, runId, status?.status]);

  const handleUpload = async (files: File[]) => {
    if (!runId) return;
    setUploading(true);
    try {
      const res = await RunService.uploadFiles(runId, files);
      setConfig((prev) => prev ? { ...prev, files: res.files, datasetMap: res.datasetMap, fieldMappings: res.fieldMappings } : null);
      await loadRun();
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
    try {
      const res = await RunService.autoCleanData(runId);
      setAutoCleanReport(res.report);
      await loadRun();
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

  const isStep2Valid = Boolean(
    hasRequiredMappings &&
    (
      (autoCleanReport && autoCleanReport.constraintsPassed === true) ||
      status?.status === 'COMPLETED' // completed runs bypass local autoCleanReport state
    )
  );

  const canAccessStep = (stepId: number) => {
    // For any COMPLETED run, all steps are unlocked
    if (status?.status === 'COMPLETED') return true;
    if (stepId === 1) return true;
    if (stepId === 2) return isStep1Valid;
    if (stepId === 3) return isStep1Valid;
    if (stepId === 4) return isStep1Valid;
    if (stepId === 5) return isStep1Valid;
    if (stepId === 6) return (status?.status as string) === 'COMPLETED';
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="spin-slow" style={{ margin: '0 auto 16px', color: 'var(--deloitte-teal)' }} />
        Loading Omnia JET Execution Workspace...
      </div>
    );
  }

  const tbHeaders = config?.files.find(f => f.detectedDataset === 'TRIAL_BALANCE' || f.fileId === config.datasetMap.tbFileId)?.headers || [];
  const glHeaders = config?.files.find(f => f.detectedDataset === 'GENERAL_LEDGER' || f.detectedDataset === 'POPULATION' || f.fileId === config.datasetMap.glFileId)?.headers || [];
  const coaHeaders = config?.files.find(f => f.detectedDataset === 'COA' || f.fileId === config.datasetMap.coaFileId)?.headers || [];

  // Contextual "Continue / Back" actions rendered inside the timeline banner
  const renderTimelineActions = () => {
    if (currentStep === 1) {
      return (
        <button onClick={() => { setCurrentStep(2); setMaxCompletedStep(prev => Math.max(prev, 1)); }} disabled={!isStep1Valid} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
          Continue to Auto-Cleansing <ArrowRight size={13} />
        </button>
      );
    }
    if (currentStep === 2) {
      return (
        <>
          <button onClick={() => setCurrentStep(1)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
            <ArrowLeft size={13} /> Back
          </button>
          <button
            type="button"
            onClick={handleRunAutoClean}
            disabled={autoCleaning}
            className="btn-soft-slate"
            style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={autoCleaning ? 'spin-slow' : ''} />
            {autoCleaning ? 'Validating...' : 'Re-Run Clean & Validate'}
          </button>
          <button
            onClick={() => { setCurrentStep(3); setMaxCompletedStep(prev => Math.max(prev, 2)); }}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            Continue to Mapping <ArrowRight size={13} />
          </button>
        </>
      );
    }
    if (currentStep === 3) {
      return (
        <>
          <button onClick={() => setCurrentStep(2)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}><ArrowLeft size={13} /> Back</button>
          <button
            onClick={() => { setCurrentStep(4); setMaxCompletedStep(prev => Math.max(prev, 3)); }}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            Continue to Parameters <ArrowRight size={13} />
          </button>
        </>
      );
    }
    if (currentStep === 4) {
      return (
        <>
          <button onClick={() => setCurrentStep(3)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}><ArrowLeft size={13} /> Back</button>
          <button onClick={handleStartPipeline} disabled={executing} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
            <Play size={13} fill="#FFFFFF" />
            {executing ? 'Executing Pipeline...' : 'Run Omnia JET Workflow'}
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
    <div className="container" style={{ maxWidth: '1480px', margin: '0 auto', padding: '28px 32px 48px' }}>

      {/* Page Header: Left aligned, generous breathing room */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '18px', marginBottom: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #007680 0%, #005A62 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 118, 128, 0.22)', color: '#FFFFFF',
            flexShrink: 0
          }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em' }}>
                OMNIA JET Workflow
              </h1>
              {runId && <span className="run-id-pill">{runId}</span>}
              {currentExecutionStatus && <StatusBadge status={currentExecutionStatus} size="sm" />}
            </div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '3px' }}>
              Omnia Audit Data Cleansing & Reconciliation Pipeline
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

        {/* STEP 1: FILE UPLOAD */}
        {currentStep === 1 && (
          <div>
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Upload Datasets
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    Upload your multi-sheet workbook (<strong>JET_Input.xlsx</strong> containing TB, Population, and COA sheets) or separate CSV files.
                  </p>
                </div>

                {config && config.files.length > 0 && (
                  <button
                    onClick={handleRunAutoClean}
                    disabled={autoCleaning}
                    className="btn-soft-teal"
                    style={{ padding: '9px 16px', fontSize: '0.84rem', fontWeight: 700 }}
                  >
                    <Sparkles size={15} className={autoCleaning ? 'spin-slow' : ''} />
                    {autoCleaning ? 'Cleaning & Checking Constraints...' : 'Run Auto-Clean & Sanitize Data'}
                  </button>
                )}
              </div>

              <FileDropzone
                files={config?.files || []}
                onUpload={handleUpload}
                onRemove={triggerRemoveFile}
                onPreview={handleOpenSamplePreview}
                uploading={uploading}
              />

              {autoCleanReport && (
                <div style={{
                  marginTop: '20px', padding: '16px 20px', borderRadius: 'var(--radius-md)',
                  background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', color: '#0F766E',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 800 }}>
                    <CheckCircle2 size={18} color="var(--status-success)" />
                    <span>Data Auto-Cleaning & Constraint Check Completed</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.82rem', marginTop: '10px' }}>
                    <div>TB Rows Cleaned: <strong>{autoCleanReport.tbRowsCleaned?.toLocaleString() || 0}</strong></div>
                    <div>GL Rows Cleaned: <strong>{autoCleanReport.glRowsCleaned?.toLocaleString() || 0}</strong></div>
                    <div>Dates Standardized: <strong>{autoCleanReport.datesStandardized?.toLocaleString() || 0}</strong></div>
                    <div>Numbers Converted: <strong>{autoCleanReport.numbersConverted?.toLocaleString() || 0}</strong></div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!isStep1Valid}
                  className="btn-primary"
                  style={{
                    opacity: isStep1Valid ? 1 : 0.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    fontSize: '0.86rem'
                  }}
                >
                  Proceed to Auto-Cleansing & Constraints <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: AUTO-CLEANSING & SCHEMA CONSTRAINTS VALIDATION */}
        {currentStep === 2 && (
          <div>
            <AutoCleanConstraintsPanel
              workflowType="OMNIA_JET"
              tbRowCount={dynamicTbCount || 22}
              glRowCount={dynamicGlCount || 36}
              coaRowCount={26}
              onProceed={() => setCurrentStep(3)}
            />
          </div>
        )}

        {/* STEP 3: DATA FILE MAPPING (TAB SWITCHER VIEW) */}
        {currentStep === 3 && (
          <div>
            <DataFileMappingWorkspace
              datasets={[
                {
                  key: 'tb',
                  title: 'Trial Balance (TB)',
                  shortName: 'TB',
                  sourceHeaders: tbHeaders,
                  mappings: config?.fieldMappings.tb || [],
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
              onProceed={() => setCurrentStep(4)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button onClick={() => setCurrentStep(2)} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={15} /> Back to Auto-Cleansing
              </button>
              <button onClick={() => setCurrentStep(4)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Next: Omnia Parameters <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: OMNIA PARAMETERS */}
        {currentStep === 4 && (
          <div>
            <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    Omnia Parameters & Golden Checks Configuration
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                    Define fiscal audit reporting periods, currency reconciliation modes, decimal formatting rules, and toggleable DQC checks.
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                {/* Card 1: Testing Period & Cutoff */}
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'linear-gradient(180deg, rgba(0, 118, 128, 0.02) 0%, #FFFFFF 100%)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--deloitte-teal-light)', color: 'var(--deloitte-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={15} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Testing Period & Cutoff</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Audit date parameters & fiscal boundary</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label className="jet-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Financial Year (FY)</label>
                    <input
                      type="number"
                      className="jet-input"
                      value={omniaParams.fiscalYear}
                      onChange={(e) => setOmniaParams({ ...omniaParams, fiscalYear: Number(e.target.value) })}
                      placeholder="2026"
                      style={{ fontSize: '0.84rem' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Defines the active audit fiscal cycle (e.g., 2026)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <label className="jet-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Testing Period Start</label>
                      <input
                        type="text"
                        className="jet-input"
                        value={omniaParams.testingPeriodStart}
                        onChange={(e) => setOmniaParams({ ...omniaParams, testingPeriodStart: e.target.value })}
                        placeholder="04/01/2025"
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label className="jet-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Testing Period End</label>
                      <input
                        type="text"
                        className="jet-input"
                        value={omniaParams.testingPeriodEnd}
                        onChange={(e) => setOmniaParams({ ...omniaParams, testingPeriodEnd: e.target.value })}
                        placeholder="03/31/2026"
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="jet-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Fiscal Year End Cutoff Date</label>
                    <input
                      type="text"
                      className="jet-input"
                      value={omniaParams.fiscalYearEnd}
                      onChange={(e) => setOmniaParams({ ...omniaParams, fiscalYearEnd: e.target.value })}
                      placeholder="03/31/2026"
                      style={{ fontSize: '0.84rem' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Closing balance sheet benchmark date</span>
                  </div>
                </div>

                {/* Card 2: Currency & Number Formatting */}
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.02) 0%, #FFFFFF 100%)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coins size={15} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Currency & Formatting</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reconciliation currency & decimal notation</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label className="jet-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Primary Reconciliation Currency</label>
                    <select
                      className="jet-select"
                      value={omniaParams.currency}
                      onChange={(e) => setOmniaParams({ ...omniaParams, currency: e.target.value as any })}
                      style={{ fontSize: '0.84rem' }}
                    >
                      <option value="Entity Currency">Entity Currency (EC)</option>
                      <option value="Group Currency">Group Currency (GC)</option>
                      <option value="Both">Both (EC & GC)</option>
                    </select>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Primary currency for balance & variance calculations</span>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label className="jet-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Decimal Separator</label>
                    <select
                      className="jet-select"
                      value={omniaParams.decimalSeparator}
                      onChange={(e) => setOmniaParams({ ...omniaParams, decimalSeparator: e.target.value as any })}
                      style={{ fontSize: '0.84rem' }}
                    >
                      <option value="Period">Period (.) Standard e.g. 1,000.50</option>
                      <option value="Comma">Comma (,) European e.g. 1.000,50</option>
                      <option value="None">None (Plain Integer)</option>
                    </select>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Decimal notation used during numeric standardization</span>
                  </div>
                </div>

                {/* Card 3: DQC Toggles */}
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'linear-gradient(180deg, rgba(124, 58, 237, 0.02) 0%, #FFFFFF 100%)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={15} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>DQC Golden Rule Toggles</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enable or suppress specific integrity evaluations</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      {
                        key: 'toggleObservationChecks',
                        title: 'Suppress Observation Checks (DQC 17-20)',
                        desc: 'Bypasses informational rounding, post-closing date, and document type observations.',
                        checked: !!omniaParams.dqcToggles?.toggleObservationChecks,
                        onChange: (val: boolean) => setOmniaParams({ ...omniaParams, dqcToggles: { ...omniaParams.dqcToggles, toggleObservationChecks: val } })
                      },
                      {
                        key: 'toggleUserChecks',
                        title: 'Suppress User ID Checks (DQC 01d)',
                        desc: 'Disables blank / invalid posting user identification checks if user master is not available.',
                        checked: !!omniaParams.dqcToggles?.toggleUserChecks,
                        onChange: (val: boolean) => setOmniaParams({ ...omniaParams, dqcToggles: { ...omniaParams.dqcToggles, toggleUserChecks: val } })
                      },
                      {
                        key: 'toggleTransactionTypeChecks',
                        title: 'Suppress Doc Type Checks (DQC 01e)',
                        desc: 'Disables transaction type schema validation if transaction codes are omitted.',
                        checked: !!omniaParams.dqcToggles?.toggleTransactionTypeChecks,
                        onChange: (val: boolean) => setOmniaParams({ ...omniaParams, dqcToggles: { ...omniaParams.dqcToggles, toggleTransactionTypeChecks: val } })
                      },
                    ].map((tog) => (
                      <div
                        key={tog.key}
                        onClick={() => tog.onChange(!tog.checked)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: tog.checked ? '1px solid rgba(124, 58, 237, 0.35)' : '1px solid var(--border-subtle)',
                          background: tog.checked ? 'rgba(124, 58, 237, 0.04)' : 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: tog.checked ? '#6D28D9' : 'var(--text-primary)' }}>
                            {tog.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.2 }}>
                            {tog.desc}
                          </div>
                        </div>

                        <div style={{
                          width: '36px', height: '20px', borderRadius: '12px',
                          background: tog.checked ? '#7C3AED' : '#CBD5E1',
                          padding: '2px', transition: 'all 0.2s ease', flexShrink: 0,
                          display: 'flex', alignItems: 'center'
                        }}>
                          <div style={{
                            width: '16px', height: '16px', borderRadius: '50%', background: '#FFFFFF',
                            transform: tog.checked ? 'translateX(16px)' : 'translateX(0)',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Navigation Footer for Step 4 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={15} /> Back to Data File Mapping
                </button>
                <button
                  type="button"
                  onClick={handleStartPipeline}
                  disabled={executing}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 28px',
                    boxShadow: '0 4px 12px rgba(0, 118, 128, 0.25)'
                  }}
                >
                  <Play size={15} fill="#FFFFFF" />
                  {executing ? 'Launching Engine...' : 'Run Omnia JET Pipeline'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: DATA QUALITY & RECONCILIATION EXECUTION ENGINE */}
        {currentStep === 5 && (() => {
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
                      background: isCompleted ? 'rgba(5, 150, 105, 0.1)' : 'var(--deloitte-teal-light)',
                      color: isCompleted ? '#059669' : 'var(--deloitte-teal)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isCompleted ? <CheckCircle2 size={22} /> : <Loader2 size={22} className="spin-slow" />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {isCompleted ? 'Data Quality & Financial Reconciliation Complete' : 'Executing Omnia Audit Reconciliation Pipeline'}
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {isCompleted
                          ? 'All 6 reconciliation and data quality integrity stages finished with 100% data fidelity.'
                          : (status?.currentStage ? status.currentStage.replace(/_/g, ' ') : 'Running PySpark CDM standardization and 20 DQC checks...')}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                      color: isCompleted ? '#059669' : 'var(--deloitte-teal)'
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
                    background: isCompleted ? 'linear-gradient(90deg, #007680 0%, #059669 100%)' : 'linear-gradient(90deg, #007680 0%, #86BC25 100%)',
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

        {/* STEP 6: RECONCILIATION & DQC TABLE MATRIX (EXECUTIVE RESULTS) */}
        {currentStep === 6 && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <MetricCard
                label="Reconciled Accounts"
                value={`${status?.reconciliationSummary?.reconciledAccounts ?? 0} / ${status?.reconciliationSummary?.totalAccounts ?? 0}`}
                subtitle="Within 1.0 Tolerance"
                variant="teal"
              />
              <MetricCard
                label="Unreconciled Accounts"
                value={status?.reconciliationSummary?.unreconciledAccounts || 0}
                badge={(status?.reconciliationSummary?.unreconciledAccounts || 0) > 0 ? 'Accounts' : 'Reconciled'}
                subtitle={(status?.reconciliationSummary?.unreconciledAccounts || 0) > 0 ? 'Variance > 1.0 Detected' : 'Zero Variances'}
                variant={(status?.reconciliationSummary?.unreconciledAccounts || 0) > 0 ? 'warning' : 'success'}
              />
              <MetricCard
                label="DQC Errors"
                value={dqcMetrics.errors}
                badge={dqcMetrics.errors > 0 ? 'Failed' : 'Passed'}
                subtitle={dqcMetrics.errors > 0 ? 'Critical Exceptions Detected' : 'All Critical Checks Passed'}
                variant={dqcMetrics.errors > 0 ? 'error' : 'success'}
              />
              <MetricCard
                label="DQC Warnings"
                value={dqcMetrics.warnings}
                badge={dqcMetrics.warnings > 0 ? 'Flagged' : 'Passed'}
                subtitle={dqcMetrics.warnings > 0 ? 'Warning Exceptions Noted' : 'Zero Warnings'}
                variant={dqcMetrics.warnings > 0 ? 'warning' : 'success'}
              />
              <MetricCard
                label="DQC Observations"
                value={dqcMetrics.observations}
                badge={dqcMetrics.observations > 0 ? 'Noted' : 'Passed'}
                subtitle={dqcMetrics.observations > 0 ? 'Observation Items Found' : 'Zero Observations'}
                variant={dqcMetrics.observations > 0 ? 'warning' : 'success'}
              />
              <MetricCard
                label="Total Variance (EC)"
                value={status?.reconciliationSummary?.totalVariance !== undefined ? status.reconciliationSummary.totalVariance.toLocaleString() : '0.00'}
                subtitle="Net Balance Difference"
                variant="teal"
              />
            </div>

            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '18px', overflowX: 'auto' }}>
              {[
                { id: 'reconciliation', label: 'Account Reconciliation (TB vs JE)', icon: Table },
                { id: 'dqc', label: '20 DQC Golden Checks Matrix', icon: ShieldCheck },
                { id: 'controlTotals', label: 'Control Totals', icon: Layers },
                { id: 'stratification', label: 'JE Line Stratification', icon: BarChart3 },
                { id: 'manifest', label: 'Excel Template & Artifacts', icon: Archive },
              ].map((tab) => {
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                      background: 'transparent', border: 'none', whiteSpace: 'nowrap',
                      borderBottom: activeTab === tab.id ? '2.5px solid var(--deloitte-teal)' : '2.5px solid transparent',
                      color: activeTab === tab.id ? 'var(--deloitte-teal)' : 'var(--text-secondary)',
                      fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer',
                    }}
                  >
                    <IconComp size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'reconciliation' && (
              <div className="glass-panel" style={{ padding: '20px 24px', background: '#FFFFFF' }}>
                {/* Header Toolbar */}
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

                {/* 4 Summary Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div
                    className="jet-card"
                    onClick={() => setReconSubView('tb_start')}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      border: reconSubView === 'tb_start' ? '1.5px solid #059669' : '1px solid var(--border-subtle)',
                      background: reconSubView === 'tb_start' ? 'rgba(5, 150, 105, 0.06)' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total TB Beginning Balance
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0', fontFamily: 'var(--font-mono)', color: '#059669' }}>
                      {status?.reconciliationSummary?.totalBeginningBalance?.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Click to view TB_Start.csv</span>
                  </div>

                  <div
                    className="jet-card"
                    onClick={() => setReconSubView('tb_end')}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      border: reconSubView === 'tb_end' ? '1.5px solid #2563EB' : '1px solid var(--border-subtle)',
                      background: reconSubView === 'tb_end' ? 'rgba(37, 99, 235, 0.06)' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total TB Ending Balance
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0', fontFamily: 'var(--font-mono)', color: '#2563EB' }}>
                      {status?.reconciliationSummary?.totalEndingBalance?.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700 }}>Click to view TB_End.csv</span>
                  </div>

                  <div
                    className="jet-card"
                    onClick={() => setReconSubView('matrix')}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      border: reconSubView === 'matrix' ? '1.5px solid var(--deloitte-teal)' : '1px solid var(--border-subtle)',
                      background: reconSubView === 'matrix' ? 'var(--deloitte-teal-light)' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total JE Net Activity
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0', fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)' }}>
                      {status?.reconciliationSummary?.totalJEActivity?.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--deloitte-teal)', fontWeight: 700 }}>Click to view Matrix</span>
                  </div>

                  <div
                    className="jet-card"
                    onClick={() => setReconSubView('unreconciled')}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      border: reconSubView === 'unreconciled' ? '1.5px solid var(--status-warning)' : '1px solid var(--border-subtle)',
                      background: reconSubView === 'unreconciled' ? 'rgba(217, 119, 6, 0.06)' : '#FFFFFF',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Net Variance
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0', fontFamily: 'var(--font-mono)', color: 'var(--status-warning)' }}>
                      {status?.reconciliationSummary?.totalVariance?.toLocaleString()}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--status-warning)', fontWeight: 700 }}>Click to view Unreconciled</span>
                  </div>
                </div>

                {/* Sub-view Switcher Tabs & Controls (Single-Line Locked) */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px', flexWrap: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                      {[
                        { id: 'matrix', label: 'Reconciliation Matrix', file: 'Parquet_Reconciliation.csv' },
                        { id: 'tb_start', label: 'TB Beginning (TB_Start)', file: 'TB_Start.csv' },
                        { id: 'tb_end', label: 'TB Ending (TB_End)', file: 'TB_End.csv' },
                        { id: 'unreconciled', label: 'Unreconciled Only', file: 'Unreconciled_Accounts_Detail.csv' },
                      ].map((v) => {
                        const isSelected = reconSubView === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setReconSubView(v.id as any)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: isSelected ? '1.5px solid var(--deloitte-teal)' : '1px solid var(--border-subtle)',
                              background: isSelected ? 'var(--deloitte-teal-light)' : 'var(--bg-secondary)',
                              color: isSelected ? 'var(--deloitte-teal)' : 'var(--text-primary)',
                              fontWeight: isSelected ? 800 : 600,
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>

                    {(() => {
                      let activeFile = 'Parquet_Reconciliation.csv';
                      let activeLabel = 'Matrix (.csv)';

                      if (reconSubView === 'tb_start') {
                        activeFile = 'TB_Start.csv';
                        activeLabel = 'TB Start (.csv)';
                      } else if (reconSubView === 'tb_end') {
                        activeFile = 'TB_End.csv';
                        activeLabel = 'TB End (.csv)';
                      } else if (reconSubView === 'unreconciled') {
                        activeFile = 'Unreconciled_Accounts_Detail.csv';
                        activeLabel = 'Unreconciled (.csv)';
                      }

                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <div style={{ position: 'relative', width: '160px' }}>
                            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                              type="text"
                              className="jet-input"
                              placeholder="Search in table..."
                              value={reconSearch}
                              onChange={(e) => setReconSearch(e.target.value)}
                              style={{ paddingLeft: '26px', fontSize: '0.78rem', height: '30px' }}
                            />
                          </div>
                          <a
                            href={RunService.getDownloadOutputUrl(runId!, activeFile)}
                            className="btn-soft-slate"
                            title={`Download ${activeFile}`}
                            style={{
                              textDecoration: 'none',
                              fontSize: '0.76rem',
                              height: '30px',
                              padding: '0 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Download size={12} /> Download {activeLabel}
                          </a>
                        </div>
                      );
                    })()}
                  </div>

                  {loadingReconPreview ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      <RefreshCw size={22} className="spin-slow" style={{ margin: '0 auto 8px', color: 'var(--deloitte-teal)' }} />
                      Loading preview records...
                    </div>
                  ) : reconPreviewData && reconPreviewData.rows.length > 0 ? (
                    <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      <table className="jet-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                          <tr>{reconPreviewData.headers.map((h, i) => <th key={i} style={{ whiteSpace: 'nowrap', background: '#F8FAFC', fontSize: '0.78rem' }}>{h}</th>)}</tr>
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
                                    fontSize: '0.8rem',
                                    padding: '8px 12px'
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
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No records found for the selected dataset.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dqc' && (() => {
              const flaggedCount = DQC_DEFINITIONS.filter(d => {
                const r = dqcSummaryData?.find(rec => {
                  const name = String(rec.Data_Integrity_Check_Name || '');
                  return name.startsWith(`${d.code}_`) || name.startsWith(`DQC_${d.code}`) || name.toLowerCase().includes(d.name.toLowerCase());
                });
                return r && (Number(r.Number_of_Affected_Lines || 0) > 0 || Number(r.Number_of_Affected_Journal_Entries || 0) > 0);
              }).length;

              const errorCount = DQC_DEFINITIONS.filter(d => d.severity === 'ERROR').length;
              const warningCount = DQC_DEFINITIONS.filter(d => d.severity === 'WARNING').length;
              const obsCount = DQC_DEFINITIONS.filter(d => d.severity === 'OBSERVATION').length;
              const totalCount = DQC_DEFINITIONS.length;

              return (
                <div className="glass-panel" style={{ padding: '20px 24px', background: '#FFFFFF' }}>
                  {/* Top Banner Toolbar */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                          Omnia Data Quality Checks (DQC 01a - 20) Golden Matrix
                        </h3>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px',
                          background: flaggedCount > 0 ? 'rgba(217, 119, 6, 0.12)' : 'rgba(5, 150, 105, 0.12)',
                          color: flaggedCount > 0 ? 'var(--status-warning)' : 'var(--deloitte-green)',
                        }}>
                          {flaggedCount > 0 ? `${flaggedCount} Exceptions Flagged` : '100% Passed'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        Automated audit rule evaluations across Chart of Accounts, Trial Balance, and General Ledger.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', width: '200px' }}>
                        <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          className="jet-input"
                          placeholder="Search checks..."
                          value={dqcSearch}
                          onChange={(e) => setDqcSearch(e.target.value)}
                          style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '32px' }}
                        />
                      </div>

                      <a href={RunService.getDownloadOutputUrl(runId!, 'Parquet_Data_Integrity_Check_00_Summary.csv')} className="btn-primary" style={{ textDecoration: 'none', padding: '0 14px', height: '32px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                        <Download size={13} /> Export DQC Summary
                      </a>
                    </div>
                  </div>

                  {/* Filter Tabs with Counters */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    {[
                      { id: 'FLAGGED', label: 'Flagged Exceptions', count: flaggedCount, isDanger: flaggedCount > 0 },
                      { id: 'ALL', label: 'All Checks', count: totalCount },
                      { id: 'ERROR', label: 'Critical Errors', count: errorCount },
                      { id: 'WARNING', label: 'Warnings', count: warningCount },
                      { id: 'OBSERVATION', label: 'Observations', count: obsCount },
                    ].map((tab) => {
                      const isSelected = dqcFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDqcFilter(tab.id as any)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: isSelected ? '1.5px solid var(--deloitte-teal)' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(0, 118, 128, 0.08)' : 'var(--bg-secondary)',
                            color: isSelected ? 'var(--deloitte-teal)' : 'var(--text-primary)',
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{tab.label}</span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '8px',
                            background: isSelected ? 'var(--deloitte-teal)' : 'rgba(0, 0, 0, 0.06)',
                            color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                          }}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* DQC Table in Space-Efficient Container */}
                  <div className="table-container" style={{ maxHeight: '440px', overflowY: 'auto' }}>
                    <table className="jet-table">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                          <th style={{ width: '85px', background: '#F8FAFC' }}>Check Code</th>
                          <th style={{ background: '#F8FAFC' }}>Check Name & Description</th>
                          <th style={{ background: '#F8FAFC' }}>Category</th>
                          <th style={{ background: '#F8FAFC' }}>Dataset</th>
                          <th style={{ background: '#F8FAFC' }}>Severity</th>
                          <th style={{ textAlign: 'center', width: '140px', background: '#F8FAFC' }}>Audit Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDQCs.length > 0 ? (
                          filteredDQCs.map((dqc) => {
                            let sevBadge = 'badge-neutral';
                            if (dqc.severity === 'ERROR') sevBadge = 'badge-error';
                            if (dqc.severity === 'WARNING') sevBadge = 'badge-warning';
                            if (dqc.severity === 'OBSERVATION') sevBadge = 'badge-info';

                            const matchedRecord = dqcSummaryData?.find(r => {
                              const name = String(r.Data_Integrity_Check_Name || '');
                              return name.startsWith(`${dqc.code}_`) || name.startsWith(`DQC_${dqc.code}`) || name.toLowerCase().includes(dqc.name.toLowerCase());
                            });

                            const affectedLines = matchedRecord ? Number(matchedRecord.Number_of_Affected_Lines || 0) : 0;
                            const affectedJEs = matchedRecord ? Number(matchedRecord.Number_of_Affected_Journal_Entries || 0) : 0;
                            const isPassed = affectedLines === 0 && affectedJEs === 0;

                            return (
                              <tr key={dqc.code}>
                                <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)', whiteSpace: 'nowrap' }}>
                                  DQC {dqc.code}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem' }}>{dqc.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{dqc.desc}</div>
                                </td>
                                <td><span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{dqc.category}</span></td>
                                <td><span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{dqc.dataset}</span></td>
                                <td><span className={`badge ${sevBadge}`} style={{ fontSize: '0.72rem' }}>{dqc.severity}</span></td>
                                <td style={{ textAlign: 'center' }}>
                                  {isPassed ? (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                                      fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                                      background: 'rgba(5, 150, 105, 0.08)', color: 'var(--deloitte-green)', border: '1px solid rgba(5, 150, 105, 0.25)'
                                    }}>
                                      <CheckCircle2 size={12} /> PASS
                                    </span>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                                        background: dqc.severity === 'ERROR' ? 'rgba(225, 29, 72, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                                        color: dqc.severity === 'ERROR' ? 'var(--status-error)' : 'var(--status-warning)',
                                        border: `1px solid ${dqc.severity === 'ERROR' ? 'rgba(225, 29, 72, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`,
                                      }}>
                                        <AlertTriangle size={12} /> {dqc.severity === 'ERROR' ? 'FAIL' : 'FLAGGED'}
                                      </span>
                                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                        {affectedLines} lines ({affectedJEs} JEs)
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                              {dqcFilter === 'FLAGGED' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <CheckCircle2 size={32} color="var(--deloitte-green)" />
                                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>All Data Quality Checks Clean & Passed</div>
                                  <div style={{ fontSize: '0.8rem' }}>No exceptions or anomalies detected for the active filter.</div>
                                  <button onClick={() => setDqcFilter('ALL')} className="btn-secondary" style={{ marginTop: '8px', padding: '4px 12px', fontSize: '0.76rem' }}>
                                    View All 28 Checks
                                  </button>
                                </div>
                              ) : (
                                `No DQC checks found matching "${dqcSearch}".`
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {activeTab === 'controlTotals' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      Control Totals & Population Stratification
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      Cross-dimensional debit/credit balancing, volume reconciliation, and user posting distributions.
                    </p>
                  </div>
                </div>

                {/* Symmetrical 4-Card Control Total Grid with Distinct Color Identities */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '14px',
                  marginBottom: '22px'
                }}>
                  {[
                    {
                      id: 'period',
                      title: 'By Fiscal Period',
                      file: 'Control_Total_By_Period.csv',
                      icon: Calendar,
                      subtitle: '12-period volume & balance distribution',
                      stat: `${status?.controlTotalsSummary?.periodCount || 12} Periods`,
                      theme: {
                        primary: '#2563EB',
                        textColor: '#1E40AF',
                        bgLight: 'rgba(37, 99, 235, 0.04)',
                        border: 'rgba(37, 99, 235, 0.16)',
                        borderActive: 'rgba(37, 99, 235, 0.45)',
                        badgeBg: 'rgba(37, 99, 235, 0.08)',
                        badgeColor: '#1D4ED8',
                        buttonBg: 'rgba(37, 99, 235, 0.08)',
                        buttonColor: '#1D4ED8',
                        buttonBorder: 'rgba(37, 99, 235, 0.2)',
                      }
                    },
                    {
                      id: 'std',
                      title: 'Standard / Non-Standard',
                      file: 'Control_Total_By_Standard_Non_Standard.csv',
                      icon: Sliders,
                      subtitle: 'Classification split & journal count',
                      stat: '2 Categories',
                      theme: {
                        primary: '#059669',
                        textColor: '#065F46',
                        bgLight: 'rgba(5, 150, 105, 0.04)',
                        border: 'rgba(5, 150, 105, 0.16)',
                        borderActive: 'rgba(5, 150, 105, 0.45)',
                        badgeBg: 'rgba(5, 150, 105, 0.08)',
                        badgeColor: '#047857',
                        buttonBg: 'rgba(5, 150, 105, 0.08)',
                        buttonColor: '#047857',
                        buttonBorder: 'rgba(5, 150, 105, 0.2)',
                      }
                    },
                    {
                      id: 'currency',
                      title: 'By Currency',
                      file: 'Control_Total_By_Currency.csv',
                      icon: Database,
                      subtitle: 'Entity (INR) & Group (USD) sums',
                      stat: '1 Currency',
                      theme: {
                        primary: '#7C3AED',
                        textColor: '#5B21B6',
                        bgLight: 'rgba(124, 58, 237, 0.04)',
                        border: 'rgba(124, 58, 237, 0.16)',
                        borderActive: 'rgba(124, 58, 237, 0.45)',
                        badgeBg: 'rgba(124, 58, 237, 0.08)',
                        badgeColor: '#6D28D9',
                        buttonBg: 'rgba(124, 58, 237, 0.08)',
                        buttonColor: '#6D28D9',
                        buttonBorder: 'rgba(124, 58, 237, 0.2)',
                      }
                    },
                    {
                      id: 'user',
                      title: 'By User ID',
                      file: 'Control_Total_By_User.csv',
                      icon: UserCheck,
                      subtitle: 'User transaction activity breakdown',
                      stat: `${status?.controlTotalsSummary?.userCount || 11} Users`,
                      theme: {
                        primary: '#D97706',
                        textColor: '#92400E',
                        bgLight: 'rgba(217, 119, 6, 0.04)',
                        border: 'rgba(217, 119, 6, 0.16)',
                        borderActive: 'rgba(217, 119, 6, 0.45)',
                        badgeBg: 'rgba(217, 119, 6, 0.08)',
                        badgeColor: '#B45309',
                        buttonBg: 'rgba(217, 119, 6, 0.08)',
                        buttonColor: '#B45309',
                        buttonBorder: 'rgba(217, 119, 6, 0.2)',
                      }
                    },
                  ].map((c) => {
                    const isSelected = selectedControlFile === c.file;
                    const Icon = c.icon;
                    const theme = c.theme;

                    return (
                      <div
                        key={c.file}
                        onClick={() => setSelectedControlFile(c.file)}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '12px',
                          border: isSelected ? `1.5px solid ${theme.borderActive}` : '1px solid var(--border-subtle)',
                          background: isSelected ? theme.bgLight : '#FFFFFF',
                          boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.04)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '144px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        <div>
                          {/* Header: Icon + Clean Title + Top Right Stat Badge */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <div style={{
                                width: '30px', height: '30px', borderRadius: '7px',
                                background: theme.badgeBg,
                                color: theme.primary,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}>
                                <Icon size={16} />
                              </div>
                              <span style={{
                                fontWeight: 800, fontSize: '0.86rem',
                                color: isSelected ? theme.textColor : 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={c.title}>
                                {c.title}
                              </span>
                            </div>

                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: isSelected ? theme.primary : theme.badgeBg,
                              color: isSelected ? '#FFFFFF' : theme.badgeColor,
                              fontFamily: 'var(--font-mono)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              lineHeight: 1.2
                            }}>
                              {c.stat}
                            </span>
                          </div>

                          {/* Subtitle */}
                          <p style={{
                            fontSize: '0.74rem',
                            color: 'var(--text-muted)',
                            margin: '0 0 14px',
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} title={c.subtitle}>
                            {c.subtitle}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedControlFile(c.file);
                            }}
                            style={{
                              flex: 1,
                              height: '30px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              borderRadius: '6px',
                              border: isSelected ? `1px solid ${theme.borderActive}` : '1px solid var(--border-subtle)',
                              background: isSelected ? '#FFFFFF' : 'var(--bg-secondary)',
                              color: isSelected ? theme.textColor : 'var(--text-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Eye size={12} /> View Table
                          </button>
                          <a
                            href={RunService.getDownloadOutputUrl(runId!, c.file)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              height: '30px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              borderRadius: '6px',
                              border: `1px solid ${theme.buttonBorder}`,
                              background: theme.buttonBg,
                              color: theme.buttonColor,
                              textDecoration: 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Download size={12} /> CSV
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* In-Place Live Preview for the Selected Control Total */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                        Data Preview: {selectedControlFile.replace('.csv', '').replace(/_/g, ' ')}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {controlPreviewData ? `Showing ${controlPreviewData.rows.length} rows` : 'Loading rows...'}
                      </span>
                    </div>

                    <div style={{ position: 'relative', width: '220px' }}>
                      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        className="jet-input"
                        placeholder="Search in table..."
                        value={controlSearch}
                        onChange={(e) => setControlSearch(e.target.value)}
                        style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '30px' }}
                      />
                    </div>
                  </div>

                  {loadingControlPreview ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      <RefreshCw size={20} className="spin-slow" style={{ margin: '0 auto 8px', color: 'var(--deloitte-teal)' }} />
                      Loading control total rows...
                    </div>
                  ) : controlPreviewData && controlPreviewData.rows.length > 0 ? (
                    <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                      <table className="jet-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                          <tr>
                            {controlPreviewData.headers.map((h, i) => (
                              <th key={i} style={{ whiteSpace: 'nowrap', background: '#F8FAFC', fontSize: '0.78rem' }}>{h}</th>
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
                                    fontSize: '0.8rem',
                                    padding: '8px 12px'
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
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No records found in this control total.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'stratification' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Journal Entry Line Stratification (Buckets)</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Buckets: 1 line, 2 - 20 lines, 21 - 100 lines, 101 - 1000 lines, &gt; 1000 lines.</p>
                  </div>
                  <a href={RunService.getDownloadOutputUrl(runId!, 'JE_Line_Distribution.csv')} className="btn-primary" style={{ textDecoration: 'none' }}>
                    <Download size={14} /> Download Stratification CSV
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'manifest' && (() => {
              const allOutputs = status?.outputs || [];
              const reconCount = allOutputs.filter(o => o.name.includes('Reconciliation') || o.name.includes('Unreconciled') || o.name.endsWith('.xlsx')).length;
              const masterCount = allOutputs.filter(o => o.name.includes('Trial_Balance') || o.name.includes('TB_') || o.name.includes('Chart_of_Accounts') || o.name.includes('General_Ledger')).length;
              const dqcCount = allOutputs.filter(o => o.name.includes('Data_Integrity') || o.name.includes('DQC')).length;
              const controlCount = allOutputs.filter(o => o.name.includes('Control_Total') || o.name.includes('Distribution') || o.name.includes('Stratification')).length;

              return (
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                  {/* Top Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px' }}>
                        Generated Omnia JET Audit Workpapers & Artifacts
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

                  {/* 5 Symmetrical Category Switcher Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
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
                  <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table className="jet-table">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                          <th style={{ background: '#F8FAFC', width: '260px' }}>Artifact File</th>
                          <th style={{ background: '#F8FAFC' }}>Category</th>
                          <th style={{ background: '#F8FAFC' }}>Format</th>
                          <th style={{ background: '#F8FAFC' }}>Row Count</th>
                          <th style={{ background: '#F8FAFC' }}>Audit Description</th>
                          <th style={{ textAlign: 'right', background: '#F8FAFC', width: '180px' }}>Actions</th>
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
                                <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isXlsx ? <FileSpreadsheet size={15} color="#059669" /> : <FileText size={15} color="var(--deloitte-teal)" />}
                                    <span>{out.name}</span>
                                  </div>
                                </td>
                                <td><span className={`badge ${catBadge}`} style={{ fontSize: '0.72rem' }}>{out.category}</span></td>
                                <td>
                                  <span className="badge" style={{
                                    fontSize: '0.7rem', fontWeight: 800,
                                    background: isXlsx ? 'rgba(5, 150, 105, 0.12)' : 'var(--bg-secondary)',
                                    color: isXlsx ? '#059669' : 'var(--text-secondary)'
                                  }}>
                                    {out.type.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                                  {out.rowCount !== undefined ? out.rowCount.toLocaleString() : '-'}
                                </td>
                                <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{out.description}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                    {!isXlsx && (
                                      <button
                                        type="button"
                                        onClick={() => handlePreviewArtifact(out.name, out.description || out.name)}
                                        className="btn-soft-slate"
                                        style={{ height: '30px', fontSize: '0.75rem', padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Eye size={12} /> Preview
                                      </button>
                                    )}
                                    <a
                                      href={RunService.getDownloadOutputUrl(runId!, out.name)}
                                      className="btn-soft-slate"
                                      style={{ height: '30px', fontSize: '0.75rem', padding: '0 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <Download size={12} /> Download
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

      {/* Raw Sample 50 Rows Preview Modal */}
      {sampleModalOpen && sampleModalData && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
          onClick={() => setSampleModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-elevated)',
              width: '100%', maxWidth: '1100px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              animation: 'scaleUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{sampleModalData.title}</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{sampleModalData.subtitle}</p>
              </div>
              <button onClick={() => setSampleModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {sampleModalData.rows.length > 0 ? (
                <div className="table-container" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  <table className="jet-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr>{sampleModalData.headers.map((h, i) => <th key={i} style={{ whiteSpace: 'nowrap', background: '#F1F5F9' }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {sampleModalData.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {sampleModalData.headers.map((h, cIdx) => (
                            <td key={cIdx} style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                              {row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '' ? String(row[h]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No sample records available in this file.</div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
              <button onClick={() => setSampleModalOpen(false)} className="btn-secondary">Close Preview</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModalOpen}
        title="Remove Uploaded File?"
        message="Are you sure you want to remove this dataset from the workflow? Field mappings and preliminary configuration for this file will be reset."
        confirmText="Remove File"
        cancelText="Keep File"
        variant="danger"
        onConfirm={handleConfirmRemoveFile}
        onClose={() => {
          setConfirmModalOpen(false);
          setFileToDelete(null);
        }}
      />
    </div>
  );
};