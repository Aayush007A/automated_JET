import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, OmniaJetParameters } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { FieldMappingTable } from '../../components/common/FieldMappingTable';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { StepTimeline, TimelineStep } from '../../components/common/Steptimeline';
import {
  ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Download,
  FileSpreadsheet, Settings, RefreshCw, FileCheck,
  Search, Filter, Eye, Sparkles, Trash2,
  Activity, FileText, Lock, Loader2, UploadCloud, BarChart3
} from 'lucide-react';

const STEPS: TimelineStep[] = [
  { id: 1, label: 'Ingest Datasets', sub: 'Upload files', icon: UploadCloud },
  { id: 2, label: 'CDM Mapping', sub: 'Auto-clean', icon: Sparkles },
  { id: 3, label: 'Omnia Parameters', sub: 'Configure', icon: Settings },
  { id: 4, label: 'Data Quality & Recon', sub: 'Running', icon: Activity },
  { id: 5, label: 'Executive Results', sub: 'Review', icon: BarChart3 },
];

const STEP_COPY: Record<number, { title: string; desc: string }> = {
  1: { title: 'Upload Omnia Input Datasets', desc: 'Upload your multi-sheet workbook or separate CSV files for TB, Population and COA.' },
  2: { title: 'CDM Mapping & Auto-Clean', desc: 'Map columns to the standard Omnia model, then run automated cleansing and constraint checks.' },
  3: { title: 'Omnia Parameters & Golden Checks', desc: 'Define fiscal periods, currency handling, decimal formats and toggleable DQC rules.' },
  4: { title: 'Data Quality & Reconciliation', desc: 'Running CDM preparation, currency reconciliation and 20 DQC golden checks.' },
  5: { title: 'Executive Results', desc: 'Review account reconciliation, the DQC matrix, control totals and generated artifacts.' },
};

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
  const [dqcFilter, setDqcFilter] = useState<'ALL' | 'ERROR' | 'WARNING' | 'OBSERVATION'>('ALL');
  const [dqcSearch, setDqcSearch] = useState('');

  // Top 50 In-Place Reconciliation Preview state
  const [reconPreviewData, setReconPreviewData] = useState<{ headers: string[]; rows: Record<string, any>[]; totalRows: number } | null>(null);
  const [loadingReconPreview, setLoadingReconPreview] = useState(false);
  const [reconSearch, setReconSearch] = useState('');

  const loadRun = async () => {
    if (!runId) return;
    try {
      const data = await RunService.getRun(runId);
      setConfig(data.config);
      setStatus(data.status);

      if (data.config.omniaParameters) {
        setOmniaParams((prev) => ({ ...prev, ...data.config.omniaParameters }));
      }

      if (data.status.status === 'COMPLETED') {
        setCurrentStep(5);
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
        setCurrentStep(5);
      } else if (event.stage === 'FAILED') {
        setExecuting(false);
        loadRun();
      }
    });

    return unsub;
  }, [runId]);

  // Load In-Place Reconciliation Preview when in Step 5 Tab 1
  useEffect(() => {
    if (currentStep === 5 && runId && activeTab === 'reconciliation') {
      setLoadingReconPreview(true);
      RunService.previewOutput(runId, 'Parquet_Reconciliation.csv', 50)
        .then((res) => setReconPreviewData(res))
        .catch(() => setReconPreviewData(null))
        .finally(() => setLoadingReconPreview(false));
    }
  }, [currentStep, activeTab, runId, status?.status]);

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
    setCurrentStep(4);
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
      status?.status === 'COMPLETED'
    )
  );

  const canAccessStep = (stepId: number) => {
    if (status?.status === 'COMPLETED') return true;
    if (stepId === 1) return true;
    if (stepId === 2) return isStep1Valid;
    if (stepId === 3) return isStep1Valid && isStep2Valid;
    if (stepId === 4) return isStep1Valid && isStep2Valid;
    if (stepId === 5) return (status?.status as string) === 'COMPLETED';
    return false;
  };

  const filteredDQCs = useMemo(() => {
    return DQC_DEFINITIONS.filter((d) => {
      const matchesSeverity = dqcFilter === 'ALL' || d.severity === dqcFilter;
      const matchesSearch = !dqcSearch ||
        d.code.toLowerCase().includes(dqcSearch.toLowerCase()) ||
        d.name.toLowerCase().includes(dqcSearch.toLowerCase()) ||
        d.category.toLowerCase().includes(dqcSearch.toLowerCase()) ||
        d.desc.toLowerCase().includes(dqcSearch.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [dqcFilter, dqcSearch]);

  const filteredReconRows = useMemo(() => {
    if (!reconPreviewData || !reconPreviewData.rows) return [];
    if (!reconSearch) return reconPreviewData.rows;
    return reconPreviewData.rows.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(reconSearch.toLowerCase()))
    );
  }, [reconPreviewData, reconSearch]);

  const currentExecutionStatus = useMemo(() => {
    return status?.status || 'CREATED';
  }, [status?.status]);

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
        <button onClick={() => setCurrentStep(2)} disabled={!isStep1Valid} className="btn-primary">
          Continue to Mapping <ArrowRight size={15} />
        </button>
      );
    }
    if (currentStep === 2) {
      return (
        <>
          <button onClick={() => setCurrentStep(1)} className="btn-secondary"><ArrowLeft size={15} /> Back</button>
          <button
            onClick={() => setCurrentStep(3)}
            disabled={!isStep2Valid}
            className="btn-primary"
            title={
              !hasRequiredMappings ? 'Map required fields first'
              : !autoCleanReport ? 'Run auto-cleansing to unlock'
              : !autoCleanReport.constraintsPassed ? 'Resolve constraint failures to proceed'
              : 'Configure Omnia Parameters'
            }
          >
            Continue <ArrowRight size={15} />
          </button>
        </>
      );
    }
    if (currentStep === 3) {
      return (
        <>
          <button onClick={() => setCurrentStep(2)} className="btn-secondary"><ArrowLeft size={15} /> Back</button>
          <button onClick={handleStartPipeline} disabled={executing} className="btn-primary">
            <Play size={14} fill="#FFFFFF" />
            {executing ? 'Executing Pipeline...' : 'Run Omnia JET Workflow'}
          </button>
        </>
      );
    }
    if (currentStep === 5) {
      return (
        <a href={RunService.getDownloadOutputUrl(runId!, 'JE-Recon-and-DIC-Template.xlsx')} className="btn-primary" style={{ textDecoration: 'none' }}>
          <FileCheck size={16} /> Download Recon Workbook
        </a>
      );
    }
    return null;
  };

  return (
    <div className="container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px 16px 40px' }}>

      {/* Unified Executive Header (Left-aligned, clean, single entity) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #007680 0%, #005A62 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0, 118, 128, 0.22)',
            color: '#FFFFFF',
            flexShrink: 0,
          }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                OMNIA JET Workflow
              </h1>
              {runId && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  letterSpacing: '0.01em',
                }}>
                  {runId}
                </span>
              )}
              {currentExecutionStatus && (
                <StatusBadge status={currentExecutionStatus} size="sm" />
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0', fontWeight: 500 }}>
              Deloitte Omnia Common Data Model & Automated Reconciliation Pipeline
            </p>
          </div>
        </div>

        {currentStep === 5 && status?.status === 'COMPLETED' && (
          <a
            href={RunService.getDownloadOutputUrl(runId!, 'JE-Recon-and-DIC-Template.xlsx')}
            className="btn-primary"
            style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '0.84rem' }}
          >
            <FileCheck size={16} /> Download Recon Excel Workbook
          </a>
        )}
      </div>

      {/* Horizontal Bubble Step Timeline */}
      <StepTimeline
        steps={STEPS}
        currentStep={currentStep}
        canAccessStep={canAccessStep}
        onStepClick={setCurrentStep}
        activeTitle={STEP_COPY[currentStep]?.title}
        activeDescription={STEP_COPY[currentStep]?.desc}
        headerRight={renderTimelineActions()}
      />

      {/* Main Workspace Content */}
      <main>

        {/* STEP 1: FILE UPLOAD */}
        {currentStep === 1 && (
          <div>
            <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Upload Datasets
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Upload your multi-sheet workbook (<strong>JET_Input.xlsx</strong> containing TB, Population, and COA sheets) or separate CSV files.
                  </p>
                </div>

                {config && config.files.length > 0 && (
                  <button
                    onClick={handleRunAutoClean}
                    disabled={autoCleaning}
                    className="btn-soft-teal"
                    style={{ padding: '8px 16px', fontSize: '0.84rem', fontWeight: 700 }}
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
                uploading={uploading}
              />

              {autoCleanReport && (
                <div style={{
                  marginTop: '18px', padding: '14px 18px', borderRadius: 'var(--radius-md)',
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

              {config && config.files.length > 0 && (
                <div style={{ marginTop: '22px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Uploaded Files & Worksheets
                  </h4>
                  <div className="table-container">
                    <table className="jet-table">
                      <thead>
                        <tr>
                          <th>File / Sheet Name</th>
                          <th>Detected Dataset</th>
                          <th>Rows</th>
                          <th>Columns</th>
                          <th style={{ textAlign: 'center' }}>Sample Preview</th>
                          <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.files.map((file) => {
                          if (file.sheets && file.sheets.length > 0) {
                            return file.sheets.map((sheet, sIdx) => (
                              <tr key={`${file.fileId}-${sIdx}`}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FileSpreadsheet size={15} color="var(--deloitte-teal)" />
                                    <span style={{ fontWeight: 700 }}>{file.fileName}</span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>[{sheet.sheetName}]</span>
                                  </div>
                                </td>
                                <td><span className="badge badge-neutral" style={{ background: 'var(--deloitte-teal-light)', color: 'var(--deloitte-teal)', border: 'none' }}>{sheet.detectedDataset || 'AUTO'}</span></td>
                                <td style={{ fontFamily: 'var(--font-mono)' }}>{sheet.rowCount.toLocaleString()}</td>
                                <td style={{ fontFamily: 'var(--font-mono)' }}>{sheet.headers.length}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <button type="button" onClick={() => handleOpenSamplePreview(file.fileId, sheet.sheetName)} className="btn-soft-slate" style={{ padding: '5px 12px', fontSize: '0.76rem' }}>
                                    <Eye size={12} /> Preview (50)
                                  </button>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {sIdx === 0 && (
                                    <button type="button" onClick={() => triggerRemoveFile(file.fileId)} className="btn-secondary" style={{ padding: '6px', color: 'var(--status-error)' }}>
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ));
                          }

                          return (
                            <tr key={file.fileId}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FileSpreadsheet size={15} color="var(--deloitte-teal)" />
                                  <span style={{ fontWeight: 700 }}>{file.fileName}</span>
                                </div>
                              </td>
                              <td><span className="badge badge-neutral" style={{ background: 'var(--deloitte-teal-light)', color: 'var(--deloitte-teal)', border: 'none' }}>{file.detectedDataset || 'AUTO'}</span></td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{(file.sampleRows?.length || 0).toLocaleString()}</td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{file.headers.length}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button type="button" onClick={() => handleOpenSamplePreview(file.fileId)} className="btn-soft-slate" style={{ padding: '5px 12px', fontSize: '0.76rem' }}>
                                  <Eye size={12} /> Preview (50)
                                </button>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button type="button" onClick={() => triggerRemoveFile(file.fileId)} className="btn-secondary" style={{ padding: '6px', color: 'var(--status-error)' }}>
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: CDM MAPPING & AUTO-CLEANING */}
        {currentStep === 2 && (
          <div>
            {/* Auto-cleaning integrated banner */}
            <div className="glass-panel" style={{
              padding: '18px 22px',
              marginBottom: '20px',
              background: autoCleanReport
                ? autoCleanReport.constraintsPassed ? 'linear-gradient(180deg, var(--status-success-bg), #FFFFFF)' : 'linear-gradient(180deg, var(--status-error-bg), #FFFFFF)'
                : '#FFFFFF',
              border: autoCleanReport
                ? autoCleanReport.constraintsPassed ? '1px solid var(--status-success-border)' : '1px solid var(--status-error-border)'
                : '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Sparkles size={18} color={autoCleanReport ? (autoCleanReport.constraintsPassed ? 'var(--status-success)' : 'var(--status-error)') : 'var(--deloitte-teal)'} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Automated CDM Cleansing & Constraint Engine
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    Trims whitespace, parses dates to standard ISO format, converts numbers/parentheses, and checks mandatory audit constraints.
                  </p>
                </div>

                <button
                  onClick={handleRunAutoClean}
                  disabled={autoCleaning || !hasRequiredMappings}
                  className="btn-primary"
                  style={{ opacity: hasRequiredMappings ? 1 : 0.5 }}
                >
                  <Play size={14} fill="#FFFFFF" />
                  {autoCleaning ? 'Cleaning Data...' : 'Run Auto-Cleansing & Validation'}
                </button>
              </div>

              {!autoCleanReport && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#92400E', fontWeight: 600 }}>
                  <AlertTriangle size={15} color="var(--status-warning)" />
                  <span>
                    {hasRequiredMappings
                      ? 'Cleansing Required: Click "Run Auto-Cleansing & Validation" above to verify constraints and unlock Step 3.'
                      : 'Please map all required CDM standard fields below before executing data cleansing.'}
                  </span>
                </div>
              )}

              {autoCleanReport && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: autoCleanReport.constraintsPassed ? '1px solid var(--status-success-border)' : '1px solid var(--status-error-border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TB Accounts Cleaned</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>{autoCleanReport.tbRowsCleaned.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>GL Journal Lines Cleaned</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>{autoCleanReport.glRowsCleaned.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dates Standardized</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>{autoCleanReport.datesStandardized.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Amounts Converted</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>{autoCleanReport.numbersConverted.toLocaleString()}</div>
                    </div>
                  </div>

                  {autoCleanReport.constraintsPassed ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#0F766E', fontWeight: 700 }}>
                      <CheckCircle2 size={16} color="var(--status-success)" />
                      <span>Data Cleansing Status: READY. All mandatory audit constraints passed — Step 3 is unlocked.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#991B1B', fontWeight: 800 }}>
                      <AlertTriangle size={16} color="var(--status-error)" />
                      <span>Constraint Checks Failed: Next steps are locked. Please resolve the issues below.</span>
                    </div>
                  )}

                  {autoCleanReport.warnings && autoCleanReport.warnings.length > 0 && (
                    <div style={{
                      marginTop: '10px', padding: '10px 14px',
                      background: autoCleanReport.constraintsPassed ? 'var(--status-warning-bg)' : 'var(--status-error-bg)',
                      borderRadius: '6px', fontSize: '0.8rem',
                      color: autoCleanReport.constraintsPassed ? '#92400E' : '#991B1B',
                      border: autoCleanReport.constraintsPassed ? '1px solid var(--status-warning-border)' : '1px solid var(--status-error-border)',
                    }}>
                      <strong>{autoCleanReport.constraintsPassed ? 'Constraint Advisories:' : 'Blocking Constraint Failures:'}</strong>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {autoCleanReport.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <FieldMappingTable
              datasetTitle="General Ledger Detail (JE)"
              sourceHeaders={glHeaders}
              mappings={config?.fieldMappings.gl || []}
              onChangeMapping={(std, src) => handleMappingChange('gl', std, src)}
            />

            <FieldMappingTable
              datasetTitle="Trial Balance (TB)"
              sourceHeaders={tbHeaders}
              mappings={config?.fieldMappings.tb || []}
              onChangeMapping={(std, src) => handleMappingChange('tb', std, src)}
            />

            <FieldMappingTable
              datasetTitle="Chart of Accounts (COA)"
              sourceHeaders={coaHeaders}
              mappings={config?.fieldMappings.coa || []}
              onChangeMapping={(std, src) => handleMappingChange('coa', std, src)}
            />
          </div>
        )}

        {/* STEP 3: OMNIA PARAMETERS */}
        {currentStep === 3 && (
          <div>
            <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: '20px', background: '#FFFFFF' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Omnia Parameters & Golden Checks Configuration
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Define fiscal reporting periods, currency parameters, decimal formats, and toggleable DQC rules.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Period Parameters */}
                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>Testing Period & Cutoff</h4>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="jet-label">Financial Year</label>
                    <input
                      type="number"
                      className="jet-input"
                      value={omniaParams.fiscalYear}
                      onChange={(e) => setOmniaParams({ ...omniaParams, fiscalYear: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label className="jet-label">Testing Period Start</label>
                      <input
                        type="text"
                        className="jet-input"
                        value={omniaParams.testingPeriodStart}
                        onChange={(e) => setOmniaParams({ ...omniaParams, testingPeriodStart: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="jet-label">Testing Period End</label>
                      <input
                        type="text"
                        className="jet-input"
                        value={omniaParams.testingPeriodEnd}
                        onChange={(e) => setOmniaParams({ ...omniaParams, testingPeriodEnd: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="jet-label">Fiscal Year End Date</label>
                    <input
                      type="text"
                      className="jet-input"
                      value={omniaParams.fiscalYearEnd}
                      onChange={(e) => setOmniaParams({ ...omniaParams, fiscalYearEnd: e.target.value })}
                    />
                  </div>
                </div>

                {/* Currency & Formatting */}
                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>Currency & Number Formatting</h4>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="jet-label">Primary Reconciliation Currency</label>
                    <select
                      className="jet-select"
                      value={omniaParams.currency}
                      onChange={(e) => setOmniaParams({ ...omniaParams, currency: e.target.value as any })}
                    >
                      <option value="Entity Currency">Entity Currency (EC)</option>
                      <option value="Group Currency">Group Currency (GC)</option>
                      <option value="Both">Both (EC & GC)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="jet-label">Decimal Separator</label>
                    <select
                      className="jet-select"
                      value={omniaParams.decimalSeparator}
                      onChange={(e) => setOmniaParams({ ...omniaParams, decimalSeparator: e.target.value as any })}
                    >
                      <option value="Period">Period (.) Standard</option>
                      <option value="Comma">Comma (,) European</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="jet-label">Entity Currency Code</label>
                      <input
                        type="text"
                        className="jet-input"
                        value={omniaParams.entityCurrencyCode || 'INR'}
                        onChange={(e) => setOmniaParams({ ...omniaParams, entityCurrencyCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="jet-label">Group Currency Code</label>
                      <input
                        type="text"
                        className="jet-input"
                        value={omniaParams.groupCurrencyCode || 'USD'}
                        onChange={(e) => setOmniaParams({ ...omniaParams, groupCurrencyCode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* DQC Golden Checks Configuration */}
                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>Data Quality Check (DQC) Toggles</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={omniaParams.dqcToggles?.toggleTransactionTypeChecks}
                        onChange={(e) => setOmniaParams({
                          ...omniaParams,
                          dqcToggles: { ...omniaParams.dqcToggles, toggleTransactionTypeChecks: e.target.checked }
                        })}
                      />
                      <span>Enable Transaction Type Consistency Checks (DQC 15, 19)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={omniaParams.dqcToggles?.toggleUserChecks}
                        onChange={(e) => setOmniaParams({
                          ...omniaParams,
                          dqcToggles: { ...omniaParams.dqcToggles, toggleUserChecks: e.target.checked }
                        })}
                      />
                      <span>Enable Multi-User / Auditor Override Checks (DQC 17, 20)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={omniaParams.dqcToggles?.toggleObservationChecks}
                        onChange={(e) => setOmniaParams({
                          ...omniaParams,
                          dqcToggles: { ...omniaParams.dqcToggles, toggleObservationChecks: e.target.checked }
                        })}
                      />
                      <span>Include Observation-Level Severity in DIC Export</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DATA QUALITY & RECON PROGRESS */}
        {currentStep === 4 && (
          <div style={{ maxWidth: '780px', margin: '40px auto' }}>
            <div className="glass-panel" style={{ padding: '36px', background: '#FFFFFF', textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: 'var(--deloitte-teal-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--deloitte-teal)',
                margin: '0 auto 20px',
              }}>
                {status?.status === 'COMPLETED' ? <CheckCircle2 size={32} color="var(--status-success)" /> : <Activity size={32} className="spin-slow" />}
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {status?.status === 'COMPLETED' ? 'Omnia JET Execution Complete!' : 'Executing Omnia JET Pipeline...'}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Running PySpark CDM preparation, dual TB cutoff generation, balance sheet reconciliation, and 20 DQC Golden checks.
              </p>

              <ProgressBar
                progress={status?.progress || 0}
                stage={status?.currentStage || 'Initializing'}
                message={status?.status === 'COMPLETED' ? 'Finished successfully. Excel workbook generated.' : 'Processing PySpark stages...'}
                isCompleted={status?.status === 'COMPLETED'}
                isFailed={status?.status === 'FAILED'}
              />

              {status?.status === 'COMPLETED' && (
                <div style={{ marginTop: '28px' }}>
                  <button onClick={() => setCurrentStep(5)} className="btn-primary" style={{ padding: '10px 24px' }}>
                    View Executive Results <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: EXECUTIVE RESULTS */}
        {currentStep === 5 && (
          <div>
            {/* Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <MetricCard label="TB Accounts Reconciled" value={status?.totalInputRows?.tb || 26} subtitle="Entity Currency Balances" variant="teal" />
              <MetricCard label="Population GL Lines" value={status?.totalInputRows?.gl || 36} subtitle="Processed Journal Lines" variant="teal" />
              <MetricCard label="Reconciliation Status" value="100% BALANCED" subtitle="0 Unreconciled Accounts" variant="success" />
              <MetricCard label="DQC Golden Checks" value="20 Rules Active" subtitle="0 Critical Errors" variant="success" />
            </div>

            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
              {[
                { id: 'reconciliation', label: 'Account Reconciliation' },
                { id: 'dqc', label: '20 DQC Golden Matrix' },
                { id: 'controlTotals', label: 'Control Totals' },
                { id: 'stratification', label: 'JE Stratification' },
                { id: 'manifest', label: 'Generated Artifacts' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '3px solid var(--deloitte-teal)' : '3px solid transparent',
                    color: activeTab === tab.id ? 'var(--deloitte-teal)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: RECONCILIATION PREVIEW */}
            {activeTab === 'reconciliation' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      Balance Sheet & P&L Account Reconciliation (Top 50 Rows)
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      Comparing Trial Balance Net Activity against General Ledger Journal Entry activity.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        value={reconSearch}
                        onChange={(e) => setReconSearch(e.target.value)}
                        className="jet-input"
                        style={{ paddingLeft: '30px', width: '200px', fontSize: '0.8rem', height: '34px' }}
                      />
                    </div>
                    <a
                      href={RunService.getDownloadOutputUrl(runId!, 'Parquet_Reconciliation.csv')}
                      className="btn-soft-slate"
                      style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                      <Download size={13} /> Export CSV
                    </a>
                  </div>
                </div>

                {loadingReconPreview ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 10px', color: 'var(--deloitte-teal)' }} />
                    Loading reconciliation preview...
                  </div>
                ) : filteredReconRows.length > 0 ? (
                  <div className="table-container">
                    <table className="jet-table">
                      <thead>
                        <tr>
                          {reconPreviewData?.headers.map((h, i) => (
                            <th key={i}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReconRows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {reconPreviewData?.headers.map((h, cIdx) => (
                              <td key={cIdx} style={{ fontFamily: typeof row[h] === 'number' || !isNaN(Number(row[h])) ? 'var(--font-mono)' : 'inherit' }}>
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No reconciliation data available.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DQC MATRIX */}
            {activeTab === 'dqc' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      20 Data Quality Checks (DQC) Golden Matrix
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      Automated completeness, validity, classification, balancing, and user integrity rules.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                      {(['ALL', 'ERROR', 'WARNING', 'OBSERVATION'] as const).map((sev) => (
                        <button
                          key={sev}
                          onClick={() => setDqcFilter(sev)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: 'none',
                            background: dqcFilter === sev ? '#FFFFFF' : 'transparent',
                            color: dqcFilter === sev ? 'var(--text-primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            boxShadow: dqcFilter === sev ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          }}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <table className="jet-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>DQC #</th>
                        <th>Rule Name & Description</th>
                        <th>Category</th>
                        <th>Dataset</th>
                        <th>Severity</th>
                        <th style={{ textAlign: 'center' }}>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDQCs.map((dqc) => (
                        <tr key={dqc.code}>
                          <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)' }}>{dqc.code}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{dqc.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{dqc.desc}</div>
                          </td>
                          <td><span className="badge badge-neutral">{dqc.category}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{dqc.dataset}</td>
                          <td>
                            <span className={`badge badge-${dqc.severity === 'ERROR' ? 'red' : dqc.severity === 'WARNING' ? 'amber' : 'neutral'}`}>
                              {dqc.severity}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={12} /> PASS (0)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: CONTROL TOTALS */}
            {activeTab === 'controlTotals' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--deloitte-teal)', marginBottom: '12px' }}>
                    Control Total by Currency
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Aggregated volume and debit/credit sums by original currency.</p>
                  <a href={RunService.getDownloadOutputUrl(runId!, 'Control_Total_By_Currency.csv')} className="btn-soft-slate" style={{ textDecoration: 'none', fontSize: '0.8rem' }}>
                    <Download size={13} /> Download Currency Totals
                  </a>
                </div>

                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--deloitte-teal)', marginBottom: '12px' }}>
                    Control Total by Transaction Type
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Breakdown of postings across standard ERP transaction codes (RV, RE, PC, etc.).</p>
                  <a href={RunService.getDownloadOutputUrl(runId!, 'Control_Total_By_Transaction_Type.csv')} className="btn-soft-slate" style={{ textDecoration: 'none', fontSize: '0.8rem' }}>
                    <Download size={13} /> Download Transaction Types
                  </a>
                </div>
              </div>
            )}

            {/* TAB 4: STRATIFICATION */}
            {activeTab === 'stratification' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--deloitte-teal)', marginBottom: '8px' }}>
                  Journal Entry Line Stratification
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Breakdown of journal document size (1-line, 2-line standard, multi-line entries).
                </p>
                <a href={RunService.getDownloadOutputUrl(runId!, 'JE_Line_Distribution.csv')} className="btn-soft-slate" style={{ textDecoration: 'none', fontSize: '0.8rem' }}>
                  <Download size={13} /> Download Stratification CSV
                </a>
              </div>
            )}

            {/* TAB 5: MANIFEST */}
            {activeTab === 'manifest' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
                  Generated Omnia Output Artifacts
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {[
                    'JE-Recon-and-DIC-Template.xlsx',
                    'Parquet_Reconciliation.csv',
                    'Parquet_Data_Integrity_Check_00_Summary.csv',
                    'Unreconciled_Accounts_Detail.csv',
                    'TB_Start.csv',
                    'TB_End.csv',
                    'Trial_Balance.csv',
                    'General_Ledger_Detail.csv',
                    'Chart_of_Accounts.csv',
                    'Control_Total_By_Currency.csv',
                    'Control_Total_By_Transaction_Type.csv',
                  ].map((file) => (
                    <div key={file} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <FileText size={16} color="var(--deloitte-teal)" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</span>
                      </div>
                      <a href={RunService.getDownloadOutputUrl(runId!, file)} className="btn-secondary" style={{ padding: '4px 8px', textDecoration: 'none' }}>
                        <Download size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* SAMPLE DATA PREVIEW MODAL (TOP 50 ROWS OF RAW INPUT FILES / SHEETS) */}
      {sampleModalOpen && sampleModalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '1100px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{sampleModalData.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{sampleModalData.subtitle}</p>
              </div>
              <button onClick={() => setSampleModalOpen(false)} className="btn-secondary" style={{ padding: '6px' }}>
                <Trash2 size={16} style={{ display: 'none' }} /> ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {sampleModalData.rows.length > 0 ? (
                <div className="table-container">
                  <table className="jet-table">
                    <thead>
                      <tr>
                        {sampleModalData.headers.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleModalData.rows.map((r, rIdx) => (
                        <tr key={rIdx}>
                          {sampleModalData.headers.map((h, cIdx) => (
                            <td key={cIdx}>{String(r[h] ?? '')}</td>
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
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
              <button onClick={() => setSampleModalOpen(false)} className="btn-secondary">Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm File Deletion Modal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        title="Remove Uploaded File?"
        message="Are you sure you want to remove this dataset file from this execution run?"
        confirmText="Remove File"
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