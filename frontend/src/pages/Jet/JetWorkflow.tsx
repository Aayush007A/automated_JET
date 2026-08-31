import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, SparkJetParameters, OmniaJetParameters, FieldMappingItem, RoutingDiagnostic } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { AutoCleanConstraintsPanel } from '../../components/common/AutoCleanConstraintsPanel';
import { DataFileMappingWorkspace, DatasetMappingConfig } from '../../components/common/DataFileMappingWorkspace';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SampleDataModal } from '../../components/common/SampleDataModal';
import { StepTimeline, TimelineStep } from '../../components/common/StepTimeline';
import { JetSummaryReportSuite } from '../../components/summary/JetSummaryReportSuite';
import { EngagementAuditParametersCard, EngagementAuditParametersData } from '../../components/common/EngagementAuditParametersCard';
import {
  ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Download,
  Layers, Settings, FileSpreadsheet, ShieldCheck, Database, RefreshCw, Archive,
  BarChart3, PieChart, CheckSquare, Plus, Trash2, Sliders, FileCheck,
  Upload, Search, Filter, HelpCircle, FileText, Sparkles, X, UserCheck, Calendar, Hash, Tag,
  FolderUp, Edit3, Eye, CheckCircle, ChevronRight, Activity, Clock, Save, Menu,
  Lock, Loader2, UploadCloud, Table, Check, Cpu, Zap, Shield, ChevronDown, ExternalLink
} from 'lucide-react';

const STEPS: TimelineStep[] = [
  { id: 1, label: 'Data Upload', sub: 'Smart Ingestion', icon: UploadCloud },
  { id: 2, label: 'File Preparation', sub: 'Sheets & Previews', icon: Table },
  { id: 3, label: 'File Cleaning', sub: 'Auto-Cleansing', icon: Sparkles },
  { id: 4, label: 'Pre-Integrity Checks', sub: 'Field Mapping', icon: Sliders },
  { id: 5, label: 'Integrity Testing', sub: 'Execute Pipeline', icon: Activity },
  { id: 6, label: 'Summary & Recon', sub: 'Exceptions & Workpapers', icon: BarChart3 },
];

const STEP_COPY: Record<number, { title: string; desc: string }> = {
  1: {
    title: 'Data Upload & Intelligent Inspection',
    desc: 'Upload your audit datasets (CSV files or multi-sheet Excel workbooks). The system automatically analyzes file structures, detects schemas, and selects the optimal audit execution path.',
  },
  2: {
    title: 'File Preparation & Raw Data Inspection',
    desc: 'Verify detected sheets and datasets (Trial Balance, General Ledger / Population, Chart of Accounts), and preview raw rows.',
  },
  3: {
    title: 'Automated Data Cleansing & Constraint Validation',
    desc: 'Standardize headers, sanitize delimiters, format dates and numeric values, and execute 16+ core audit constraint validations.',
  },
  4: {
    title: 'Pre-Integrity Checks & Canonical Field Mapping',
    desc: 'Map source columns to the Deloitte standard canonical audit model for Trial Balance, General Ledger, and Chart of Accounts.',
  },
  5: {
    title: 'Integrity Testing & Automated Pipeline Execution',
    desc: 'Execute real-time integrity tests, verify control totals, and observe the live audit execution stream.',
  },
  6: {
    title: 'Executive Summary, Exceptions & Audit Reconciliation',
    desc: 'Review parameter exceptions (Ex 1–12), 20 Golden DQC checks, reconciliation workpapers, and download audit-ready artifacts.',
  },
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

  // Intelligent Routing Diagnostics State
  const [routingDiagnostic, setRoutingDiagnostic] = useState<RoutingDiagnostic | null>(null);
  const [analyzingFiles, setAnalyzingFiles] = useState(false);

  // Sample Data Modal for raw inputs
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [sampleModalData, setSampleModalData] = useState<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }>({ title: '', headers: [], rows: [], totalRows: 0 });

  // Auto-cleaning state & report
  const [autoCleaning, setAutoCleaning] = useState(false);
  const [autoCleanReport, setAutoCleanReport] = useState<any>(null);

  // Engagement Audit Parameters (Matching Executive Overview & History)
  const [engagementAuditParams, setEngagementAuditParams] = useState<EngagementAuditParametersData>({
    engagementName: 'Tangerine Skies Pvt Ltd - JET Audit FY26',
    startDate: '01-Apr-2025',
    endDate: '31-Mar-2026',
    financialYearEnd: '31-Mar',
    engagementRunId: runId || 'JET-20260830-012',
    operatingCurrency: 'USD',
    overallMateriality: 500000,
    engagementClassification: 'Tier 1 Key Audit Engagement',
  });

  const handleUpdateEngagementParams = (newParams: EngagementAuditParametersData) => {
    setEngagementAuditParams(newParams);
  };

  // Results & Outputs State
  const [resultsData, setResultsData] = useState<any>(null);

  // Live SSE stream unsubscribe ref
  const unsubscribeSSERef = useRef<(() => void) | null>(null);

  // ── Initial Load (Forwards to dedicated workflow page if runId exists) ──
  useEffect(() => {
    const initWorkflow = async () => {
      setLoading(true);
      try {
        if (runId) {
          const runData = await RunService.getRun(runId);
          if (runData.config?.workflow === 'OMNIA_JET') {
            navigate(`/omnia-jet?runId=${runId}`, { replace: true });
            return;
          } else if (runData.config?.workflow === 'SPARK_JET') {
            navigate(`/spark-jet?runId=${runId}`, { replace: true });
            return;
          }
          setConfig(runData.config);
          setStatus(runData.status);
        } else {
          setConfig(null);
          setStatus(null);
          setCurrentStep(1);
          setMaxCompletedStep(1);
        }
      } catch (err) {
        console.error('Failed to load run:', err);
      } finally {
        setLoading(false);
      }
    };

    initWorkflow();
  }, [runId, navigate]);

  // ── File Upload & Intelligent Routing ──
  const handleFilesUploaded = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setAnalyzingFiles(true);
    try {
      let activeRunId = runId;
      if (!activeRunId) {
        const newRun = await RunService.createRun('JET');
        activeRunId = newRun.runId;
      }

      const res = await RunService.uploadFiles(activeRunId, files);
      
      // Immediately navigate to the detected dedicated pipeline workflow page
      if (res.workflow === 'OMNIA_JET') {
        navigate(`/omnia-jet?runId=${activeRunId}`, { replace: true });
      } else {
        navigate(`/spark-jet?runId=${activeRunId}`, { replace: true });
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      setAnalyzingFiles(false);
    }
  };

  // ── File Remove ───────────────────────────────────────────────────────────
  const handleRemoveFile = async (fileId: string) => {
    if (!runId) return;
    try {
      await RunService.removeFile(runId, fileId);
      setConfig((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          files: prev.files.filter((f) => f.fileId !== fileId),
        };
      });
    } catch (err) {
      console.error('Failed to remove file:', err);
    }
  };

  // ── Auto-Clean Trigger ───────────────────────────────────────────────────
  const handleRunAutoClean = async () => {
    if (!runId) return;
    setAutoCleaning(true);
    try {
      const res = await RunService.autoCleanData(runId);
      if (res.report) {
        setAutoCleanReport(res.report);
      }
      setMaxCompletedStep((prev) => Math.max(prev, 4));
    } catch (err) {
      console.error('Auto clean failed:', err);
    } finally {
      setAutoCleaning(false);
    }
  };

  // ── Start Pipeline Execution ─────────────────────────────────────────────
  const handleStartPipeline = async () => {
    if (!runId) return;
    setExecuting(true);
    try {
      await RunService.startPipeline(runId);
      setStatus((prev) => (prev ? { ...prev, status: 'RUNNING', progress: 5 } : null));
    } catch (err) {
      console.error('Failed to start pipeline:', err);
      setExecuting(false);
    }
  };

  // ── Preview File Modal Helper ────────────────────────────────────────────
  const handlePreviewFile = async (fileId: string, sheetName?: string) => {
    if (!runId) return;
    const file = config?.files.find((f) => f.fileId === fileId);
    const title = file ? file.originalName : 'Data Preview';
    try {
      const res = await RunService.previewInputFile(runId, fileId, sheetName, 50);
      setSampleModalData({
        title,
        subtitle: sheetName ? `Sheet: ${sheetName} (Top 50 sample rows)` : `Top 50 sample rows`,
        headers: res.headers || [],
        rows: res.rows || [],
        totalRows: res.totalRows || (res.rows ? res.rows.length : 0),
      });
      setSampleModalOpen(true);
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  // ── Mapping Workspace Datasets Definition ─────────────────────────────────
  const mappingDatasets: DatasetMappingConfig[] = useMemo(() => {
    if (!config) return [];

    const tbHeaders = (config.files || []).find((f) => f.fileId === config.datasetMap?.tbFileId)?.headers || [];
    const glHeaders = (config.files || []).find((f) => f.fileId === config.datasetMap?.glFileId)?.headers || [];
    const coaHeaders = (config.files || []).find((f) => f.fileId === config.datasetMap?.coaFileId)?.headers || [];

    const list: DatasetMappingConfig[] = [
      {
        key: 'tb',
        title: 'Trial Balance Dataset',
        shortName: 'Trial Balance',
        sourceHeaders: tbHeaders,
        mappings: config.fieldMappings?.tb || [],
        onChangeMapping: (std, src) => {
          const updated = (config.fieldMappings?.tb || []).map((m) =>
            m.standardField === std ? { ...m, sourceField: src, status: (src ? 'MATCHED' : 'UNMATCHED') as any } : m
          );
          if (runId) RunService.updateFieldMappings(runId, 'TRIAL_BALANCE', updated);
          setConfig((p) => p ? { ...p, fieldMappings: { ...p.fieldMappings, tb: updated } } : null);
        },
      },
      {
        key: 'gl',
        title: 'General Ledger / Population',
        shortName: 'General Ledger',
        sourceHeaders: glHeaders,
        mappings: config.fieldMappings?.gl || [],
        onChangeMapping: (std, src) => {
          const updated = (config.fieldMappings?.gl || []).map((m) =>
            m.standardField === std ? { ...m, sourceField: src, status: (src ? 'MATCHED' : 'UNMATCHED') as any } : m
          );
          if (runId) RunService.updateFieldMappings(runId, 'GENERAL_LEDGER', updated);
          setConfig((p) => p ? { ...p, fieldMappings: { ...p.fieldMappings, gl: updated } } : null);
        },
      },
    ];

    if (config.workflow === 'OMNIA_JET' || config.fieldMappings?.coa) {
      list.push({
        key: 'coa',
        title: 'Chart of Accounts (COA)',
        shortName: 'COA',
        sourceHeaders: coaHeaders,
        mappings: config.fieldMappings?.coa || [],
        onChangeMapping: (std, src) => {
          const updated = (config.fieldMappings?.coa || []).map((m) =>
            m.standardField === std ? { ...m, sourceField: src, status: (src ? 'MATCHED' : 'UNMATCHED') as any } : m
          );
          if (runId) RunService.updateFieldMappings(runId, 'COA', updated);
          setConfig((p) => p ? { ...p, fieldMappings: { ...p.fieldMappings, coa: updated } } : null);
        },
      });
    }

    return list;
  }, [config, runId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <Loader2 size={28} color="var(--deloitte-teal)" className="spin-slow" />
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Initializing Intelligent JET Audit Workspace...
        </span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 28px 80px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              cursor: 'pointer',
              color: '#64748B',
            }}
            title="Return to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>
                Journal Entry Testing Platform
              </h1>
              {config?.files && config.files.length > 0 ? (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3.5px 10px',
                  borderRadius: '999px',
                  background: 'rgba(0, 118, 128, 0.12)',
                  color: '#007680',
                  border: '1px solid rgba(0, 118, 128, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  <Layers size={11} />
                  JET Workflow
                </span>
              ) : (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3.5px 10px',
                  borderRadius: '999px',
                  background: 'rgba(100, 116, 139, 0.10)',
                  color: '#475569',
                  border: '1px solid rgba(100, 116, 139, 0.20)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  <Sparkles size={11} />
                  Intelligent File Ingestion
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Run ID: <strong style={{ color: runId ? '#0F172A' : '#007680', fontFamily: runId ? 'monospace' : 'inherit' }}>{runId || 'Auto-generated on upload'}</strong></span>
              <span>•</span>
              <span>Engine: <strong style={{ color: '#007680' }}>Deloitte JET Execution Engine</strong></span>
              <span>•</span>
              <span>Created: {config?.createdAt ? formatExecutiveDate(config.createdAt) : 'Pending file upload'}</span>
            </div>
          </div>
        </div>

        {/* Status Chip & Next Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {status && <StatusBadge status={status.status} />}
          {status?.status === 'COMPLETED' && (
            <a
              href={RunService.getDownloadAllZipUrl(runId!)}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #007680 0%, #005A62 100%)',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0, 118, 128, 0.25)',
              }}
            >
              <Download size={14} /> Download Audit Deliverables (ZIP)
            </a>
          )}
        </div>
      </div>

      {/* 6-Stage Timeline Stepper */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <StepTimeline
          steps={STEPS}
          currentStep={currentStep}
          maxCompletedStep={maxCompletedStep}
          canAccessStep={(stepId) => stepId <= maxCompletedStep || status?.status === 'COMPLETED'}
          onStepClick={(stepId) => {
            if (stepId <= maxCompletedStep || status?.status === 'COMPLETED') {
              setCurrentStep(stepId);
            }
          }}
          isRunCompleted={status?.status === 'COMPLETED'}
        />
      </div>

      {/* Stage Header Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #F8FAFC 0%, #F0FDF4 100%)',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#007680', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2px' }}>
            Stage {currentStep} of 6
          </div>
          <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            {STEP_COPY[currentStep]?.title}
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '4px 0 0' }}>
            {STEP_COPY[currentStep]?.desc}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep((p) => Math.max(1, p - 1))}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <ArrowLeft size={13} /> Previous Stage
            </button>
          )}
          {currentStep < 6 && (
            <button
              onClick={() => setCurrentStep((p) => Math.min(6, p + 1))}
              disabled={currentStep >= maxCompletedStep && status?.status !== 'COMPLETED'}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.82rem',
                background: '#007680',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                cursor: currentStep < maxCompletedStep || status?.status === 'COMPLETED' ? 'pointer' : 'not-allowed',
                opacity: currentStep < maxCompletedStep || status?.status === 'COMPLETED' ? 1 : 0.6,
              }}
            >
              Next Stage <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          STAGE 1: DATA UPLOAD & INTELLIGENT INSPECTION
          ═════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Engagement Audit Parameters Card (Image 2) */}
          <EngagementAuditParametersCard
            parameters={engagementAuditParams}
            onChange={handleUpdateEngagementParams}
            runId={runId || undefined}
          />

          {/* 2. Universal Dropzone (Image 1) */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '22px 24px', boxShadow: '0 2px 10px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Upload Audit Datasets
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                Upload either <strong>separate data streams (CSV/Excel)</strong> or a <strong>multi-sheet workbook</strong> to launch JET testing.
              </div>
            </div>
            <FileDropzone
              files={config?.files || []}
              onUpload={handleFilesUploaded}
              onRemove={handleRemoveFile}
              onPreview={(fId, sName) => handlePreviewFile(fId, sName)}
              uploading={uploading}
            />
          </div>

          {/* Analyzing Files State Banner */}
          {analyzingFiles && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 118, 128, 0.08) 0%, rgba(134, 188, 37, 0.08) 100%)',
              border: '1.5px solid rgba(0, 118, 128, 0.25)',
              borderRadius: '14px',
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <Loader2 size={24} color="#007680" className="spin-slow" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                  Smart File Inspection Engine Analyzing Uploaded Files...
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                  Inspecting headers, verifying structure, and configuring JET testing parameters.
                </div>
              </div>
            </div>
          )}

          {/* Intelligent Pipeline Selector Card (Visible once files are uploaded) */}
          {config?.files && config.files.length > 0 && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #E2E8F0',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    background: config.workflow === 'OMNIA_JET' ? 'rgba(0, 118, 128, 0.10)' : 'rgba(22, 163, 74, 0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: config.workflow === 'OMNIA_JET' ? '#007680' : '#15803D',
                  }}>
                    {config.workflow === 'OMNIA_JET' ? <Layers size={18} /> : <Zap size={18} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Active Profile: {config.workflow === 'OMNIA_JET' ? 'Multi-Sheet Workbook Reconciliation' : 'Standard Stream Testing'}
                      </h3>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        background: '#DCFCE7',
                        color: '#15803D',
                      }}>
                        ⚡ Auto-Selected from Files
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
                      Engine: <strong style={{ color: '#007680' }}>Deloitte JET Execution Engine</strong>
                    </div>
                  </div>
                </div>

                {/* Pipeline Switcher Toggle for Manual Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <button
                    onClick={async () => {
                      if (runId) {
                        await RunService.updateConfig(runId, { workflow: 'SPARK_JET' });
                      }
                      setConfig((p) => (p ? { ...p, workflow: 'SPARK_JET' } : null));
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '7px',
                      fontSize: '0.77rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: config.workflow === 'SPARK_JET' ? '#FFFFFF' : 'transparent',
                      color: config.workflow === 'SPARK_JET' ? '#15803D' : '#64748B',
                      boxShadow: config.workflow === 'SPARK_JET' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Standard Stream
                  </button>
                  <button
                    onClick={async () => {
                      if (runId) {
                        await RunService.updateConfig(runId, { workflow: 'OMNIA_JET' });
                      }
                      setConfig((p) => (p ? { ...p, workflow: 'OMNIA_JET' } : null));
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '7px',
                      fontSize: '0.77rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: config.workflow === 'OMNIA_JET' ? '#FFFFFF' : 'transparent',
                      color: config.workflow === 'OMNIA_JET' ? '#007680' : '#64748B',
                      boxShadow: config.workflow === 'OMNIA_JET' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Multi-Sheet
                  </button>
                </div>
              </div>

              {/* Inferred Capabilities Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {(config.workflow === 'OMNIA_JET'
                  ? [
                      'Multi-Sheet Workbook Reconciliation',
                      '20 Golden DQC Integrity Rules',
                      'Trial Balance vs Population Alignment',
                      'Standard Audit-Ready Workpapers',
                    ]
                  : [
                      'Automated 4-Phase Field Mapping',
                      'Trial Balance & GL Zero-Sum Balancing',
                      'IR 1-4 Integrity & Gap Testing',
                      '12 Parameter Exception Testing (Ex 1-12)',
                    ]
                ).map((cap, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#334155',
                  }}>
                    <CheckCircle size={14} color={config.workflow === 'OMNIA_JET' ? '#007680' : '#16A34A'} />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="btn-green"
                  style={{ padding: '8px 18px', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  Proceed to File Preparation <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          STAGE 2: FILE PREPARATION & RAW DATA INSPECTION
          ═════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Dataset Structure &amp; Sheet Preparation
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0' }}>
                Verify dataset assignments across Trial Balance, General Ledger / Population, and Chart of Accounts.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(3)}
              className="btn-green"
              style={{ padding: '8px 18px', fontSize: '0.84rem', fontWeight: 700 }}
            >
              Proceed to Auto-Cleansing <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Trial Balance Dataset Card */}
            <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '16px', background: '#FAFBFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <CheckSquare size={16} color="#007680" />
                <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>Trial Balance (TB)</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '12px' }}>
                Mapped File ID: <code style={{ color: '#007680' }}>{config?.datasetMap.tbFileId || 'Auto-Detected'}</code>
                {config?.datasetMap.tbSheetName && <div>Sheet: <strong>{config.datasetMap.tbSheetName}</strong></div>}
              </div>
              <button
                onClick={() => {
                  const fId = config?.datasetMap.tbFileId || config?.files[0]?.fileId;
                  if (fId) handlePreviewFile(fId, config?.datasetMap.tbSheetName);
                }}
                className="btn-secondary"
                style={{ width: '100%', padding: '7px', fontSize: '0.78rem', justifyContent: 'center' }}
              >
                <Eye size={13} /> Preview TB Raw Rows
              </button>
            </div>

            {/* General Ledger / Population Card */}
            <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '16px', background: '#FAFBFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Layers size={16} color="#2563EB" />
                <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>General Ledger / Population (GL)</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '12px' }}>
                Mapped File ID: <code style={{ color: '#2563EB' }}>{config?.datasetMap.glFileId || 'Auto-Detected'}</code>
                {config?.datasetMap.glSheetName && <div>Sheet: <strong>{config.datasetMap.glSheetName}</strong></div>}
              </div>
              <button
                onClick={() => {
                  const fId = config?.datasetMap.glFileId || config?.files[0]?.fileId;
                  if (fId) handlePreviewFile(fId, config?.datasetMap.glSheetName);
                }}
                className="btn-secondary"
                style={{ width: '100%', padding: '7px', fontSize: '0.78rem', justifyContent: 'center' }}
              >
                <Eye size={13} /> Preview GL Raw Rows
              </button>
            </div>

            {/* Chart of Accounts (COA) */}
            <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '16px', background: '#FAFBFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Database size={16} color="#16A34A" />
                <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>Chart of Accounts (COA)</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '12px' }}>
                Status: <strong>{config?.datasetMap.coaFileId ? `Mapped (${config.datasetMap.coaSheetName || 'Direct'})` : 'Optional / Resolved from TB'}</strong>
              </div>
              <button
                onClick={() => {
                  const fId = config?.datasetMap.coaFileId || config?.files[0]?.fileId;
                  if (fId) handlePreviewFile(fId, config?.datasetMap.coaSheetName);
                }}
                disabled={!config?.datasetMap.coaFileId && !config?.files.some(f => f.sheets?.some(s => s.detectedDataset === 'COA'))}
                className="btn-secondary"
                style={{ width: '100%', padding: '7px', fontSize: '0.78rem', justifyContent: 'center' }}
              >
                <Eye size={13} /> Preview COA Raw Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          STAGE 3: FILE CLEANING & AUTOMATED CONSTRAINTS
          ═════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                High-Performance Data Cleansing Engine
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0' }}>
                Trims whitespace, resolves dates into ISO-8601, casts numeric currencies, and verifies audit pre-conditions.
              </p>
            </div>

            <button
              onClick={handleRunAutoClean}
              disabled={autoCleaning}
              className="btn-green"
              style={{ padding: '10px 22px', fontSize: '0.86rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {autoCleaning ? (
                <>
                  <Loader2 size={15} className="spin-slow" /> Cleansing Data...
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Execute Automated Cleansing
                </>
              )}
            </button>
          </div>

          {/* Cleansing Metrics & Constraints Panel */}
          {autoCleanReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <MetricCard
                  label="TB Rows Cleansed"
                  value={autoCleanReport.tbRowsCleaned?.toLocaleString() || '0'}
                  variant="peach"
                  delta="▲ 100%"
                  subtitle="Trial Balance Cleaned"
                  icon={<CheckSquare size={16} />}
                />
                <MetricCard
                  label="GL Rows Cleansed"
                  value={autoCleanReport.glRowsCleaned?.toLocaleString() || '0'}
                  variant="green"
                  delta="▲ Active"
                  subtitle="General Ledger Cleaned"
                  icon={<Layers size={16} />}
                />
                <MetricCard
                  label="Dates Normalized"
                  value={autoCleanReport.datesStandardized?.toLocaleString() || '0'}
                  variant="blue"
                  delta="▲ Standard"
                  subtitle="ISO Calendar Formatted"
                  icon={<Calendar size={16} />}
                />
                <MetricCard
                  label="Constraint Status"
                  value={autoCleanReport.constraintsPassed ? 'PASSED (100%)' : 'WARNINGS'}
                  variant={autoCleanReport.constraintsPassed ? 'teal' : 'pink'}
                  delta={autoCleanReport.constraintsPassed ? '▲ 100%' : '▼ Action'}
                  subtitle="Mandatory Rules Met"
                  icon={<ShieldCheck size={16} />}
                />
              </div>

              {/* Embedded Constraints Panel */}
              <AutoCleanConstraintsPanel
                workflowType={(config?.workflow === 'OMNIA_JET' ? 'OMNIA_JET' : 'SPARK_JET')}
                runId={runId || ''}
                autoCleanReport={autoCleanReport}
                onProceed={() => setCurrentStep(4)}
              />
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          STAGE 4: PRE-INTEGRITY CONSTRAINT CHECKS (FIELD MAPPING)
          ═════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Deloitte Standard Canonical Field Mapping
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0' }}>
                Verify and map source columns to the standard canonical audit model for Trial Balance, General Ledger, and Chart of Accounts.
              </p>
            </div>

            <button
              onClick={() => setCurrentStep(5)}
              className="btn-green"
              style={{ padding: '8px 18px', fontSize: '0.84rem', fontWeight: 700 }}
            >
              Proceed to Integrity Testing <ArrowRight size={14} />
            </button>
          </div>

          <DataFileMappingWorkspace
            datasets={mappingDatasets}
            onProceed={() => setCurrentStep(5)}
          />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          STAGE 5: INTEGRITY TESTING & LIVE PIPELINE EXECUTION
          ═════════════════════════════════════════════════════════════════════ */}
      {currentStep === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Execution Action Banner */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}>
            <div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Integrity &amp; Control Totals Testing Engine
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '3px 0 0' }}>
                Executes balance reconciliation, gap tests, seldom accounts, and 20 Golden DQC checks.
              </p>
            </div>

            <button
              onClick={handleStartPipeline}
              disabled={executing || status?.status === 'RUNNING'}
              className="btn-primary"
              style={{
                padding: '11px 26px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                fontWeight: 800,
                border: 'none',
                cursor: executing || status?.status === 'RUNNING' ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 118, 128, 0.3)',
              }}
            >
              {executing || status?.status === 'RUNNING' ? (
                <>
                  <Loader2 size={16} className="spin-slow" /> Executing Pipeline...
                </>
              ) : (
                <>
                  <Play size={16} /> Launch Audit Execution
                </>
              )}
            </button>
          </div>

          {/* Live Progress Card */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ProgressBar
              progress={status?.progress || 0}
              stage={status?.currentStage || (status?.status === 'COMPLETED' ? 'Pipeline Completed' : 'Ready')}
              message={status?.status === 'RUNNING' ? 'Executing audit tests and streaming logs...' : status?.status === 'COMPLETED' ? 'All tests passed. Results generated.' : 'Click Launch Audit Execution to begin.'}
              isCompleted={status?.status === 'COMPLETED'}
              isFailed={status?.status === 'FAILED'}
            />

            {status?.status === 'COMPLETED' && (
              <div style={{
                marginTop: '10px',
                padding: '14px 18px',
                borderRadius: '10px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '0.86rem' }}>
                  <CheckCircle2 size={18} color="#16A34A" />
                  Audit Execution Completed Successfully!
                </div>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="btn-green"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  View Executive Summary <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          STAGE 6: BIG 4 JET SUMMARY REPORT SUITE & RECONCILIATION
          ═════════════════════════════════════════════════════════════════════ */}
      {currentStep === 6 && (
        <JetSummaryReportSuite
          runId={runId!}
          status={status}
          config={config}
          resultsData={resultsData}
        />
      )}

      {/* Raw Sample Data Modal */}
      <SampleDataModal
        isOpen={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
        title={sampleModalData.title}
        subtitle={sampleModalData.subtitle}
        headers={sampleModalData.headers}
        rows={sampleModalData.rows}
        totalRows={sampleModalData.totalRows}
      />
    </div>
  );
};
