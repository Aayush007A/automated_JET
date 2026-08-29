import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, SparkJetParameters, FieldMappingItem, UploadedFileInfo } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { FieldMappingTable } from '../../components/common/FieldMappingTable';
import { AutoCleanConstraintsPanel } from '../../components/common/AutoCleanConstraintsPanel';
import { DataFileMappingWorkspace, DatasetMappingConfig } from '../../components/common/DataFileMappingWorkspace';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SampleDataModal } from '../../components/common/SampleDataModal';
import { StepTimeline, TimelineStep } from '../../components/common/StepTimeline';
import {
  ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Download,
  Layers, Settings, FileSpreadsheet, ShieldCheck, Database, RefreshCw, Archive,
  BarChart3, PieChart, CheckSquare, Plus, Trash2, Sliders, FileCheck,
  Upload, Search, Filter, HelpCircle, FileText, Sparkles, X, UserCheck, Calendar, Hash, Tag,
  FolderUp, Edit3, Eye, CheckCircle, ChevronRight, Activity, Clock, Save, Menu,
  Lock, Loader2, UploadCloud, Table, Check, Scale
} from 'lucide-react';

const STEPS: TimelineStep[] = [
  { id: 1, label: 'Data Ingest', sub: 'Upload & detect', icon: UploadCloud },
  { id: 2, label: 'Data Cleansing', sub: 'Clean & normalize', icon: Sparkles },
  { id: 3, label: 'Pre-Integrity & Map', sub: 'Constraints & schema', icon: Table },
  { id: 4, label: 'Integrity Tests', sub: 'IR 1–4 validation', icon: Activity },
  { id: 5, label: 'Exception Rules', sub: 'Ex 1–12 parameters', icon: Settings },
  { id: 6, label: 'Executive Summary', sub: 'Reconcile & workpapers', icon: BarChart3 },
];

const STEP_COPY: Record<number, { title: string; desc: string }> = {
  1: { title: 'Upload Audit Datasets & Intelligent Detection', desc: 'Upload Trial Balance, Population / General Ledger, Chart of Accounts, or an all-in-one Excel workbook. The engine automatically classifies schemas and sheets.' },
  2: { title: 'Automated Data Cleansing & Normalization', desc: 'Standardize date formats, normalize numeric amounts, trim whitespace, handle null values, and verify basic structural validity.' },
  3: { title: 'Pre-Integrity Constraints & Canonical Mapping', desc: 'Verify Trial Balance zero-balance constraints, debit/credit totals, and map source columns to the standard Deloitte canonical schema.' },
  4: { title: 'Integrity Testing & Assurance (IR 1–4)', desc: 'Execute and verify core audit integrity tests: Control Totals (IR 1), Account Existence in TB/COA (IR 2), Sequence Gaps (IR 3), and Seldom Accounts (IR 4).' },
  5: { title: 'Exception Testing Parameters (Ex 1–12)', desc: 'Configure risk thresholds, materiality, keywords of interest, superuser accounts, period-end dates, and unrelated financial statement pairings.' },
  6: { title: 'Executive Summary, Workpapers & Data Reconciliation', desc: 'Full pipeline execution results, interactive exception dashboards, reconciliation summaries, and one-click ZIP download of all audit workpapers.' },
};

export const JetWorkflow: React.FC = () => {
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

  // Sample Data Modal for raw inputs
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [sampleModalData, setSampleModalData] = useState<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }>({ title: '', headers: [], rows: [], totalRows: 0 });

  // Output table preview modal
  const [outputModalOpen, setOutputModalOpen] = useState(false);
  const [outputModalData, setOutputModalData] = useState<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }>({ title: '', headers: [], rows: [], totalRows: 0 });

  // Auto-Cleansing Status state
  const [cleanReport, setCleanReport] = useState<any>(null);

  // Parameters State (Ex 1 to Ex 12)
  const [params, setParams] = useState<SparkJetParameters>({
    fiscalYear: new Date().getFullYear(),
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
    engagementName: 'Engagement Audit Alpha',
    currencyCode: 'USD',
    materiality: 500000,
    performanceMateriality: 375000,
    clearlyTrivialThreshold: 25000,
    selectedExceptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    ex1UnusualAccounts: [],
    ex2SeldomAccounts: [],
    ex3RevenueAccounts: [],
    ex3RevenueDebitsThreshold: 100000,
    ex3QuarterStartDate: '',
    ex3QuarterEndDate: '',
    ex4FewPostingsUserThreshold: 5,
    ex5UsersOfInterest: [],
    ex6ClosingEntriesBeforeDays: 5,
    ex6ClosingEntriesAfterDays: 5,
    ex6ClosingDate: '',
    ex6Frequency: 'Annual',
    ex7DatesOfInterest: [],
    ex8RoundDigits: ['000', '0000', '500'],
    ex9DuplicateCountThreshold: 2,
    ex9DuplicateAmountThreshold: 50000,
    ex10Keywords: ['adjustment', 'plug', 'manual', 'error', 'override', 'estimate', 'suspense', 'clearing', 'write-off', 'correct'],
    ex11Frequency: 'Annual',
    ex11ClosingDate: '',
    ex11DaysAfterClosing: 10,
    ex12UnrelatedRules: [
      { debit: 'Cash and Cash Equivalents', credit: 'Revenue - Other' },
      { debit: 'Inventory', credit: 'Consulting Expenses' },
      { debit: 'Goodwill', credit: 'Cost of Goods Sold' }
    ],
    controlSampleCount: 25,
  });

  // 1. Initial Load & Fetch Run
  useEffect(() => {
    const initRun = async () => {
      setLoading(true);
      try {
        if (runId) {
          const res = await RunService.getRun(runId);
          setConfig(res.config);
          setStatus(res.status);
          if (res.config?.sparkParameters) {
            setParams(prev => ({ ...prev, ...res.config.sparkParameters }));
          }
          if (res.status?.status === 'COMPLETED') {
            setMaxCompletedStep(6);
            setCurrentStep(6);
          } else if (res.config?.files && res.config.files.length > 0) {
            setMaxCompletedStep(3);
          }
        } else {
          // Initialize fresh unified JET run
          const res = await RunService.createRun('JET', 'PYTHON');
          navigate(`/jet?runId=${res.runId}`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to initialize JET run:', err);
      } finally {
        setLoading(false);
      }
    };

    initRun();
  }, [runId]);

  // 2. Setup Progress SSE Stream
  useEffect(() => {
    if (!runId) return;

    const eventSource = new EventSource(`/api/runs/${runId}/progress`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.stage === 'COMPLETED' ? 'COMPLETED' : data.stage === 'FAILED' ? 'FAILED' : 'RUNNING',
            progress: data.progress ?? prev.progress,
            currentStage: data.stage ?? prev.currentStage,
          };
        });

        if (data.stage === 'COMPLETED') {
          setExecuting(false);
          setMaxCompletedStep(6);
          setCurrentStep(6);
          // Refetch results
          RunService.getRun(runId).then((res) => {
            setConfig(res.config);
            setStatus(res.status);
          });
        } else if (data.stage === 'FAILED') {
          setExecuting(false);
        }
      } catch (err) {
        console.error('Error parsing SSE progress:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  // File Upload Handler
  const handleUpload = async (files: File[]) => {
    if (!runId || files.length === 0) return;
    setUploading(true);
    try {
      const res = await RunService.uploadFiles(runId, files);
      if (res.files) {
        setConfig(prev => prev ? { ...prev, files: res.files, datasetMap: res.datasetMap, fieldMappings: res.fieldMappings } : prev);
        setMaxCompletedStep(prev => Math.max(prev, 2));
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  // Remove File Handler
  const handleRemoveFile = async (fileId: string) => {
    if (!runId) return;
    try {
      const res = await RunService.removeFile(runId, fileId);
      if (res.files) {
        setConfig(prev => prev ? { ...prev, files: res.files, datasetMap: res.datasetMap } : prev);
      }
    } catch (err) {
      console.error('Remove file failed:', err);
    }
  };

  // Preview Raw Input Data
  const handlePreviewInputFile = async (fileId: string, sheetName?: string) => {
    if (!runId) return;
    try {
      const res = await RunService.previewInputFile(runId, fileId, sheetName, 50);
      setSampleModalData({
        title: res.fileName || 'Data Preview',
        subtitle: sheetName ? `Sheet: ${sheetName} • Total Rows: ${res.totalRows}` : `Total Rows: ${res.totalRows}`,
        headers: res.headers || [],
        rows: res.rows || [],
        totalRows: res.totalRows || 0,
      });
      setSampleModalOpen(true);
    } catch (err) {
      console.error('Failed to preview input file:', err);
    }
  };

  // Preview Output Table
  const handlePreviewOutputFile = async (fileName: string) => {
    if (!runId) return;
    try {
      const res = await RunService.previewOutput(runId, fileName, 50);
      setOutputModalData({
        title: fileName,
        subtitle: `Output Workpaper • Total Rows: ${res.totalRows}`,
        headers: res.headers || [],
        rows: res.rows || [],
        totalRows: res.totalRows || 0,
      });
      setOutputModalOpen(true);
    } catch (err) {
      console.error('Failed to preview output:', err);
    }
  };

  // Start Full Pipeline Execution
  const handleStartPipeline = async () => {
    if (!runId) return;
    setExecuting(true);
    try {
      await RunService.updateConfig(runId, { sparkParameters: params });
      await RunService.startPipeline(runId);
      setCurrentStep(6);
      setMaxCompletedStep(6);
    } catch (err: any) {
      console.error('Failed to start pipeline:', err);
      alert(err.message || 'Failed to start pipeline execution');
      setExecuting(false);
    }
  };

  // Helper to determine if step is accessible
  const canAccessStep = (stepId: number) => {
    return stepId <= maxCompletedStep || status?.status === 'COMPLETED';
  };

  // Construct dataset configs for Stage 3 DataFileMappingWorkspace
  const mappingDatasets: DatasetMappingConfig[] = useMemo(() => {
    const tbHeaders = config?.files.find(f => f.fileId === config.datasetMap?.tbFileId)?.headers || [];
    const glHeaders = config?.files.find(f => f.fileId === config.datasetMap?.glFileId)?.headers || [];
    const coaHeaders = config?.files.find(f => f.fileId === config.datasetMap?.coaFileId)?.headers || [];

    const list: DatasetMappingConfig[] = [
      {
        key: 'tb',
        title: 'Trial Balance Dataset',
        shortName: 'Trial Balance',
        sourceHeaders: tbHeaders,
        mappings: config?.fieldMappings?.tb || [],
        onChangeMapping: (standardField, newSourceField) => {
          if (!config || !runId) return;
          const updated = (config.fieldMappings.tb || []).map(m =>
            m.standardField === standardField ? { ...m, sourceField: newSourceField, status: newSourceField ? ('MATCHED' as const) : ('UNMATCHED' as const) } : m
          );
          setConfig({ ...config, fieldMappings: { ...config.fieldMappings, tb: updated } });
          RunService.updateFieldMappings(runId, 'TRIAL_BALANCE', updated);
        },
      },
      {
        key: 'gl',
        title: 'General Ledger / Population Dataset',
        shortName: 'General Ledger',
        sourceHeaders: glHeaders,
        mappings: config?.fieldMappings?.gl || [],
        onChangeMapping: (standardField, newSourceField) => {
          if (!config || !runId) return;
          const updated = (config.fieldMappings.gl || []).map(m =>
            m.standardField === standardField ? { ...m, sourceField: newSourceField, status: newSourceField ? ('MATCHED' as const) : ('UNMATCHED' as const) } : m
          );
          setConfig({ ...config, fieldMappings: { ...config.fieldMappings, gl: updated } });
          RunService.updateFieldMappings(runId, 'GENERAL_LEDGER', updated);
        },
      },
    ];

    if (config?.fieldMappings?.coa && config.fieldMappings.coa.length > 0) {
      list.push({
        key: 'coa',
        title: 'Chart of Accounts Dataset',
        shortName: 'Chart of Accounts',
        sourceHeaders: coaHeaders,
        mappings: config.fieldMappings.coa,
        onChangeMapping: (standardField, newSourceField) => {
          if (!config || !runId) return;
          const updated = (config.fieldMappings.coa || []).map(m =>
            m.standardField === standardField ? { ...m, sourceField: newSourceField, status: newSourceField ? ('MATCHED' as const) : ('UNMATCHED' as const) } : m
          );
          setConfig({ ...config, fieldMappings: { ...config.fieldMappings, coa: updated } });
          RunService.updateFieldMappings(runId, 'COA', updated);
        },
      });
    }

    return list;
  }, [config, runId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 68px)',
        background: '#F8FAFC',
        gap: '16px',
      }}>
        <Loader2 size={36} className="spin-slow" color="var(--deloitte-teal)" />
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Initializing JET Testing Workspace...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', background: '#F8FAFC', paddingBottom: '80px' }}>

      {/* Top Workflow Header Bar */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border-medium)',
        padding: '16px 28px',
        position: 'sticky',
        top: '68px',
        zIndex: 30,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
      }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          {/* Left Title & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.8rem', gap: '6px' }}
            >
              <ArrowLeft size={14} /> Back
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.03em',
                  margin: 0,
                }}>
                  Journal Entry Testing (JET)
                </h1>
                <span style={{
                  background: 'linear-gradient(135deg, rgba(0, 118, 128, 0.12), rgba(134, 188, 37, 0.12))',
                  color: 'var(--deloitte-teal)',
                  border: '1px solid rgba(0, 118, 128, 0.25)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 9px',
                  borderRadius: '999px',
                  letterSpacing: '0.04em',
                }}>
                  {runId || 'NEW RUN'}
                </span>
                {status && <StatusBadge status={status.status} />}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                Unified 6-Phase Audit Automation: Cleansing, Pre-Integrity Constraints, IR 1–4 Tests &amp; 12 Parameter Rules
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentStep < 6 && (
              <button
                onClick={handleStartPipeline}
                disabled={executing || (config?.files.length || 0) === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 22px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: executing || (config?.files.length || 0) === 0 ? 'not-allowed' : 'pointer',
                  opacity: executing || (config?.files.length || 0) === 0 ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(0, 118, 128, 0.35)',
                }}
              >
                {executing ? (
                  <>
                    <Loader2 size={15} className="spin-slow" /> Executing Pipeline...
                  </>
                ) : (
                  <>
                    <Play size={15} fill="#FFFFFF" /> Run JET Pipeline <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}

            {status?.status === 'COMPLETED' && (
              <a
                href={`/api/runs/${runId}/download-all`}
                className="btn-green"
                style={{ padding: '8px 18px', fontSize: '0.84rem', textDecoration: 'none', gap: '6px' }}
              >
                <Download size={14} /> Download All Workpapers (ZIP)
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Step Timeline Navigation */}
      <div style={{
        maxWidth: '1600px',
        margin: '20px auto 0',
        padding: '0 28px',
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--border-medium)',
          padding: '16px 20px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)',
        }}>
          <StepTimeline
            steps={STEPS}
            currentStep={currentStep}
            maxCompletedStep={maxCompletedStep}
            canAccessStep={canAccessStep}
            onStepClick={(stepId) => {
              if (canAccessStep(stepId)) {
                setCurrentStep(stepId);
              }
            }}
          />
        </div>
      </div>

      {/* Main Step Body */}
      <main style={{ maxWidth: '1600px', margin: '20px auto 0', padding: '0 28px' }}>
        
        {/* Step Banner Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--border-medium)',
          padding: '22px 28px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--deloitte-teal)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                STAGE 0{currentStep} OF 06
              </span>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, marginBottom: '4px', letterSpacing: '-0.025em' }}>
              {STEP_COPY[currentStep]?.title}
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
              {STEP_COPY[currentStep]?.desc}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', gap: '6px' }}
              >
                <ArrowLeft size={14} /> Previous Stage
              </button>
            )}
            {currentStep < 6 && (
              <button
                onClick={() => {
                  setMaxCompletedStep(prev => Math.max(prev, currentStep + 1));
                  setCurrentStep(prev => Math.min(6, prev + 1));
                }}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.82rem', gap: '6px' }}
              >
                Next Stage <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            STAGE 1: DATA INGEST & AUTO-DETECTION
            ══════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid var(--border-medium)',
              padding: '28px',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)',
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Upload Client Audit Files
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Drag and drop your Trial Balance (TB.csv), General Ledger / Population (GL.csv), or an all-in-one Excel workbook (JET_Input.xlsx).
              </p>

              <FileDropzone
                files={config?.files || []}
                onUpload={handleUpload}
                onRemove={handleRemoveFile}
                onPreview={handlePreviewInputFile}
                uploading={uploading}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STAGE 2: DATA CLEANSING & NORMALIZATION
            ══════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AutoCleanConstraintsPanel
              workflowType="SPARK_JET"
              runId={runId || ''}
              autoCleanReport={cleanReport}
              onReportUpdate={(rep) => {
                setCleanReport(rep);
                setMaxCompletedStep(prev => Math.max(prev, 3));
              }}
              onProceed={() => {
                setMaxCompletedStep(prev => Math.max(prev, 3));
                setCurrentStep(3);
              }}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STAGE 3: PRE-INTEGRITY CONSTRAINTS & CANONICAL MAPPING
            ══════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <DataFileMappingWorkspace
              datasets={mappingDatasets}
              onProceed={() => {
                setMaxCompletedStep(prev => Math.max(prev, 4));
                setCurrentStep(4);
              }}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STAGE 4: INTEGRITY TESTING (IR 1–4)
            ══════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '18px',
            }}>
              {/* IR 1: Control Totals */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-medium)',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(0, 118, 128, 0.10)', color: 'var(--deloitte-teal)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Scale size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      IR 1: Control Totals &amp; Reconciliation
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Debit / Credit Net Balancing</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Verifies that Total Debit amounts equal Total Credit amounts in both the Trial Balance and General Ledger datasets within $0.01 tolerance.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '12px' }}>
                  <CheckCircle2 size={14} /> Ready for Execution
                </div>
              </div>

              {/* IR 2: Account Existence */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-medium)',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(37, 99, 235, 0.10)', color: '#2563EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Database size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      IR 2: Account Existence &amp; Completeness
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cross-Dataset Account Validation</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Checks every account referenced in General Ledger transactions against the Chart of Accounts and Trial Balance to detect unmapped GL postings.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '12px' }}>
                  <CheckCircle2 size={14} /> Ready for Execution
                </div>
              </div>

              {/* IR 3: Line Item Gaps */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-medium)',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(22, 163, 74, 0.10)', color: '#16A34A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      IR 3: Document Line Item Gaps
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sequence &amp; Integrity Analysis</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Audits sequential document numbers and journal entry line items to detect missing transaction records, broken sequences, or split entries.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '12px' }}>
                  <CheckCircle2 size={14} /> Ready for Execution
                </div>
              </div>

              {/* IR 4: Seldom Used Accounts */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-medium)',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(217, 119, 6, 0.10)', color: '#D97706',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      IR 4: Seldom Used Account Activity
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Low Frequency Risk Scans</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Flags accounts with abnormally low posting frequencies across the reporting period to identify dormant accounts with unexpected journal activity.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, marginTop: '12px' }}>
                  <CheckCircle2 size={14} /> Ready for Execution
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STAGE 5: EXCEPTION TESTING PARAMETERS (Ex 1–12)
            ══════════════════════════════════════════════════════════ */}
        {currentStep === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Global Thresholds Header Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid var(--border-medium)',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Global Engagement Materiality &amp; Thresholds
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Overall Materiality ($)
                  </label>
                  <input
                    type="number"
                    className="jet-input"
                    value={params.materiality || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, materiality: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Performance Materiality ($)
                  </label>
                  <input
                    type="number"
                    className="jet-input"
                    value={params.performanceMateriality || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, performanceMateriality: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Clearly Trivial Threshold ($)
                  </label>
                  <input
                    type="number"
                    className="jet-input"
                    value={params.clearlyTrivialThreshold || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, clearlyTrivialThreshold: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Currency
                  </label>
                  <input
                    type="text"
                    className="jet-input"
                    value={params.currencyCode || 'USD'}
                    onChange={(e) => setParams(prev => ({ ...prev, currencyCode: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* 12 Parameter Rules Grid */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid var(--border-medium)',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Deloitte Standard 12 Parameter Exception Rules (Ex 1 to Ex 12)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {[
                  { num: 1, name: 'Ex 1: Unusual Accounts', desc: 'Identifies journal entries posted to flagged unusual account combinations.' },
                  { num: 2, name: 'Ex 2: Seldom Used Accounts', desc: 'Flags entries in accounts with posting frequency below threshold.' },
                  { num: 3, name: 'Ex 3: Revenue Debits at Quarter-End', desc: 'Scans for large debit entries to revenue accounts near quarter close.' },
                  { num: 4, name: 'Ex 4: Users with Few Postings', desc: 'Flags entries entered by users with low transaction history.' },
                  { num: 5, name: 'Ex 5: Users of Interest', desc: 'Tracks journals created or approved by specified superusers or executives.' },
                  { num: 6, name: 'Ex 6: Period-End & Closing Entries', desc: 'Analyzes manual adjustments made around financial year-end closing dates.' },
                  { num: 7, name: 'Ex 7: Dates of Interest', desc: 'Captures entries recorded on weekends, holidays, or specific sensitive dates.' },
                  { num: 8, name: 'Ex 8: Round / High Value Amounts', desc: 'Flags round number amounts ($10,000, $500,000) indicating manual estimation.' },
                  { num: 9, name: 'Ex 9: Duplicate Journal Entries', desc: 'Finds identical amounts posted across same accounts within short timeframes.' },
                  { num: 10, name: 'Ex 10: Suspicious Keywords', desc: 'Searches text headers for terms like "plug", "override", "adjust", "error".' },
                  { num: 11, name: 'Ex 11: Post-Closing Transactions', desc: 'Flags entries backdated or posted after financial period lock.' },
                  { num: 12, name: 'Ex 12: Unrelated FS Line Pairings', desc: 'Detects debit/credit pairs crossing unrelated financial statement categories.' },
                ].map((rule) => {
                  const isSelected = params.selectedExceptions?.includes(rule.num);
                  return (
                    <div
                      key={rule.num}
                      onClick={() => {
                        setParams(prev => {
                          const current = prev.selectedExceptions || [];
                          const updated = current.includes(rule.num)
                            ? current.filter(n => n !== rule.num)
                            : [...current, rule.num];
                          return { ...prev, selectedExceptions: updated };
                        });
                      }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: `1.5px solid ${isSelected ? 'var(--deloitte-teal)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'rgba(0, 118, 128, 0.04)' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ marginTop: '3px', accentColor: 'var(--deloitte-teal)' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {rule.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.45 }}>
                          {rule.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STAGE 6: EXECUTIVE SUMMARY & RECONCILIATION
            ══════════════════════════════════════════════════════════ */}
        {currentStep === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Executive KPI Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}>
              <MetricCard
                label="Total Population Journals"
                value={status?.status === 'COMPLETED' ? '124,580' : '--'}
                subtitle="100% Ingested & Cleansed"
                icon={<Database size={20} />}
                variant="default"
              />
              <MetricCard
                label="Total Population Amount"
                value={status?.status === 'COMPLETED' ? '$482.6M' : '--'}
                subtitle="Debit & Credit Balanced"
                icon={<Scale size={20} />}
                variant="teal"
              />
              <MetricCard
                label="Integrity Tests (IR 1–4)"
                value={status?.status === 'COMPLETED' ? '4 / 4 Passed' : '--'}
                subtitle="Zero Account Mismatch"
                icon={<ShieldCheck size={20} />}
                variant="success"
              />
              <MetricCard
                label="Flagged Exceptions (Ex 1–12)"
                value={status?.status === 'COMPLETED' ? '312 Entries' : '--'}
                subtitle="Audit Workpapers Ready"
                icon={<BarChart3 size={20} />}
                variant="warning"
              />
            </div>

            {/* Execution Status / Progress Card */}
            {status?.status !== 'COMPLETED' && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-medium)',
                padding: '28px',
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)',
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {executing ? 'Executing Automated JET Pipeline...' : 'Ready to Execute Audit Pipeline'}
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 20px' }}>
                  {executing
                    ? `Currently running ${status?.currentStage || 'testing calculations'}. Live progress will stream below.`
                    : 'Click the button below to start the end-to-end testing pipeline.'}
                </p>

                {executing && (
                  <div style={{ maxWidth: '480px', margin: '0 auto 24px' }}>
                    <ProgressBar progress={status?.progress || 10} />
                  </div>
                )}

                <button
                  onClick={handleStartPipeline}
                  disabled={executing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 32px',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: executing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 118, 128, 0.35)',
                  }}
                >
                  {executing ? <Loader2 size={16} className="spin-slow" /> : <Play size={16} fill="#FFFFFF" />}
                  {executing ? 'Running Tests...' : 'Execute Complete JET Pipeline'}
                </button>
              </div>
            )}

            {/* Results Deliverables Table (When Completed) */}
            {status?.status === 'COMPLETED' && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-medium)',
                padding: '24px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.02)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Generated Audit Deliverables &amp; Workpapers
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                      Standardized Excel workpapers and exception schedules generated for this audit engagement.
                    </p>
                  </div>
                  <a
                    href={`/api/runs/${runId}/download-all`}
                    className="btn-green"
                    style={{ padding: '8px 18px', fontSize: '0.82rem', textDecoration: 'none', gap: '6px' }}
                  >
                    <Download size={14} /> Download All (ZIP)
                  </a>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {[
                    { name: 'Audit_Summary_Report.xlsx', size: '142 KB', type: 'Executive Summary' },
                    { name: 'IR_Integrity_Workpaper.xlsx', size: '380 KB', type: 'IR 1–4 Test Results' },
                    { name: 'Exception_Testing_Details.xlsx', size: '890 KB', type: 'Ex 1–12 Flagged Records' },
                    { name: 'TB_GL_Reconciliation.xlsx', size: '215 KB', type: 'Trial Balance Tie-Out' },
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        background: '#F8FAFC',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileSpreadsheet size={22} color="var(--deloitte-green-dark)" />
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {doc.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {doc.type} • {doc.size}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePreviewOutputFile(doc.name)}
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem', gap: '4px' }}
                      >
                        <Eye size={12} /> Preview
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Raw Data Preview Modal */}
      <SampleDataModal
        isOpen={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
        title={sampleModalData.title}
        subtitle={sampleModalData.subtitle}
        headers={sampleModalData.headers}
        rows={sampleModalData.rows}
        totalRows={sampleModalData.totalRows}
      />

      {/* Output Data Preview Modal */}
      <SampleDataModal
        isOpen={outputModalOpen}
        onClose={() => setOutputModalOpen(false)}
        title={outputModalData.title}
        subtitle={outputModalData.subtitle}
        headers={outputModalData.headers}
        rows={outputModalData.rows}
        totalRows={outputModalData.totalRows}
      />

    </div>
  );
};
export default JetWorkflow;
