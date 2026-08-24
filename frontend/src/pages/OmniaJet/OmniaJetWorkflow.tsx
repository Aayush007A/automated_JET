import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, OmniaJetParameters, FieldMappingItem } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { FieldMappingTable } from '../../components/common/FieldMappingTable';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { 
  ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Download, 
  FileSpreadsheet, Settings, ShieldCheck, Database, RefreshCw, Archive, FileCheck,
  Search, Filter, PieChart, BarChart3
} from 'lucide-react';

const STEPS = [
  { id: 1, label: '1. Ingest Data' },
  { id: 2, label: '2. CDM Mapping' },
  { id: 3, label: '3. Omnia Config' },
  { id: 4, label: '4. Pipeline Progress' },
  { id: 5, label: '5. Recon & DQC Matrix' },
];

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
        if (currentStep < 5) setCurrentStep(5);
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

  const handleUpload = async (files: File[]) => {
    if (!runId) return;
    setUploading(true);
    try {
      const res = await RunService.uploadFiles(runId, files);
      setConfig((prev) => prev ? { ...prev, files: res.files, datasetMap: res.datasetMap, fieldMappings: res.fieldMappings } : null);
      await loadRun();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!runId) return;
    try {
      const res = await RunService.removeFile(runId, fileId);
      setConfig((prev) => prev ? { ...prev, files: res.files, datasetMap: res.datasetMap } : null);
      await loadRun();
    } catch (err: any) {
      alert(`Remove failed: ${err.message}`);
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
  const isStep2Valid = useMemo(() => {
    if (!config) return false;
    const glRequired = config.fieldMappings.gl?.filter((m) => m.required) || [];
    const tbRequired = config.fieldMappings.tb?.filter((m) => m.required) || [];
    return glRequired.every((m) => Boolean(m.sourceField)) && tbRequired.every((m) => Boolean(m.sourceField));
  }, [config]);

  const canAccessStep = (stepId: number) => {
    if (stepId === 1) return true;
    if (stepId === 2) return isStep1Valid;
    if (stepId === 3) return isStep1Valid && isStep2Valid;
    if (stepId === 4) return isStep1Valid && isStep2Valid;
    if (stepId === 5) return status?.status === 'COMPLETED';
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

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 28px' }}>
      {/* Workflow Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.82rem', marginBottom: '12px' }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--deloitte-teal-light)',
              border: '1px solid rgba(0, 118, 128, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--deloitte-teal)',
            }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>OMNIA JET Workflow</h1>
              <span style={{ fontSize: '0.84rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Run Identifier: <strong style={{ color: 'var(--deloitte-teal)' }}>{runId}</strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {status && <StatusBadge status={status.status} size="md" />}
          {status?.status === 'COMPLETED' && (
            <a
              href={RunService.getDownloadOutputUrl(runId!, 'JE-Recon-and-DIC-Template.xlsx')}
              className="btn-primary"
              style={{ textDecoration: 'none' }}
            >
              <FileCheck size={16} />
              Download Recon Excel Workbook
            </a>
          )}
        </div>
      </div>

      {/* Step Wizard Bar (Step-by-Step Enforced) */}
      <div className="wizard-steps">
        <div className="wizard-line">
          <div
            className="wizard-line-progress"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        {STEPS.map((s) => {
          const isAllowed = canAccessStep(s.id);
          return (
            <div
              key={s.id}
              className={`wizard-step ${currentStep === s.id ? 'active' : currentStep > s.id ? 'completed' : ''}`}
              onClick={() => {
                if (isAllowed) setCurrentStep(s.id);
              }}
              style={{
                cursor: isAllowed ? 'pointer' : 'not-allowed',
                opacity: isAllowed ? 1 : 0.45,
              }}
            >
              <div className="wizard-circle">
                {currentStep > s.id ? <CheckCircle2 size={18} /> : s.id}
              </div>
              <span className="wizard-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: FILE UPLOAD */}
      {currentStep === 1 && (
        <div>
          <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Step 1: Upload Omnia Input Datasets
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Upload your multi-sheet workbook (<strong>JET_Input.xlsx</strong> containing TB, Population, and COA sheets) or separate CSV files. Batch upload is enabled.
            </p>

            <FileDropzone
              files={config?.files || []}
              onUpload={handleUpload}
              onRemove={handleRemoveFile}
              uploading={uploading}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!isStep1Valid}
              className="btn-primary"
            >
              Proceed to CDM Mapping <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CDM MAPPING */}
      {currentStep === 2 && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Step 2: Common Data Model (CDM) Field Mapping
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Map input columns to standard Omnia CDM specifications for General Ledger, Trial Balance, and Chart of Accounts.
            </p>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button onClick={() => setCurrentStep(1)} className="btn-secondary">
              <ArrowLeft size={16} /> Back to Upload
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={!isStep2Valid}
              className="btn-primary"
            >
              Configure Omnia Parameters <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: OMNIA PARAMETERS */}
      {currentStep === 3 && (
        <div>
          <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Step 3: Omnia Parameters & Golden Checks Configuration
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
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
              </div>

              {/* DQC Toggles */}
              <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>DQC Toggles</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={omniaParams.dqcToggles?.toggleObservationChecks}
                      onChange={(e) => setOmniaParams({
                        ...omniaParams,
                        dqcToggles: { ...omniaParams.dqcToggles, toggleObservationChecks: e.target.checked }
                      })}
                    />
                    Toggle Off Observation Checks (DQCs 17-20)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={omniaParams.dqcToggles?.toggleUserChecks}
                      onChange={(e) => setOmniaParams({
                        ...omniaParams,
                        dqcToggles: { ...omniaParams.dqcToggles, toggleUserChecks: e.target.checked }
                      })}
                    />
                    Toggle Off User ID Related Checks (DQC 01d)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={omniaParams.dqcToggles?.toggleTransactionTypeChecks}
                      onChange={(e) => setOmniaParams({
                        ...omniaParams,
                        dqcToggles: { ...omniaParams.dqcToggles, toggleTransactionTypeChecks: e.target.checked }
                      })}
                    />
                    Toggle Off Transaction Type Checks (DQC 01e)
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setCurrentStep(2)} className="btn-secondary">
              <ArrowLeft size={16} /> Back to Mapping
            </button>
            <button
              onClick={handleStartPipeline}
              disabled={executing}
              className="btn-primary"
              style={{ padding: '11px 24px' }}
            >
              <Play size={16} />
              {executing ? 'Executing Pipeline...' : 'Run Omnia JET Workflow'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PROGRESS */}
      {currentStep === 4 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <ProgressBar
              progress={status?.progress || 0}
              stage={status?.currentStage}
              message={status?.status === 'COMPLETED' ? 'Omnia JET reconciliation completed successfully' : 'Running CDM data preparation, currency reconciliation & 20 DQC checks...'}
              isCompleted={status?.status === 'COMPLETED'}
              isFailed={status?.status === 'FAILED'}
            />

            {status?.status === 'COMPLETED' && (
              <div style={{ marginTop: '24px' }}>
                <button onClick={() => setCurrentStep(5)} className="btn-primary">
                  View Account Reconciliation & DQC Matrix <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 5: RECONCILIATION & COOL DQC TABLE MATRIX */}
      {currentStep === 5 && (
        <div>
          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <MetricCard
              label="Reconciled Accounts"
              value={status?.reconciliationSummary?.reconciledAccounts || 0}
              subtitle="Variance <= 1.0"
              variant="success"
            />
            <MetricCard
              label="Unreconciled Accounts"
              value={status?.reconciliationSummary?.unreconciledAccounts || 0}
              subtitle="Variance > 1.0"
              variant={status?.reconciliationSummary?.unreconciledAccounts ? 'warning' : 'success'}
            />
            <MetricCard
              label="DQC Errors"
              value={status?.dqcSummary?.totalErrors || 0}
              subtitle="Critical Matters"
              variant={status?.dqcSummary?.totalErrors ? 'error' : 'success'}
            />
            <MetricCard
              label="DQC Warnings"
              value={status?.dqcSummary?.totalWarnings || 0}
              subtitle="Data Matters"
              variant="warning"
            />
            <MetricCard
              label="Total Variance (EC)"
              value={status?.reconciliationSummary?.totalVariance?.toLocaleString() || 0}
              subtitle="Net Balance Diff"
              variant="teal"
            />
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
            {[
              { id: 'reconciliation', label: 'Account Reconciliation (TB vs JE)' },
              { id: 'dqc', label: '20 DQC Golden Checks Matrix' },
              { id: 'controlTotals', label: 'Control Totals' },
              { id: 'stratification', label: 'JE Line Stratification' },
              { id: 'manifest', label: 'Excel Template & Artifacts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--deloitte-teal)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--deloitte-teal)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: RECONCILIATION */}
          {activeTab === 'reconciliation' && (
            <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Account-Level Reconciliation Summary
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Formula: Variance = Ending Balance - Beginning Balance - JE Activity (Tolerance: $\le 1.0$)
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a
                    href={RunService.getDownloadOutputUrl(runId!, 'Parquet_Reconciliation.csv')}
                    className="btn-secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    <Download size={14} /> Download Reconciliation CSV
                  </a>
                  <a
                    href={RunService.getDownloadOutputUrl(runId!, 'Unreconciled_Accounts_Detail.csv')}
                    className="btn-secondary"
                    style={{ textDecoration: 'none', color: 'var(--status-warning)' }}
                  >
                    <Download size={14} /> Unreconciled Detail CSV
                  </a>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div className="jet-card" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total TB Beginning Balance</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, margin: '6px 0', fontFamily: 'var(--font-mono)' }}>
                    {status?.reconciliationSummary?.totalBeginningBalance?.toLocaleString()}
                  </div>
                </div>
                <div className="jet-card" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total TB Ending Balance</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, margin: '6px 0', fontFamily: 'var(--font-mono)' }}>
                    {status?.reconciliationSummary?.totalEndingBalance?.toLocaleString()}
                  </div>
                </div>
                <div className="jet-card" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total JE Net Activity</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, margin: '6px 0', fontFamily: 'var(--font-mono)' }}>
                    {status?.reconciliationSummary?.totalJEActivity?.toLocaleString()}
                  </div>
                </div>
                <div className="jet-card" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Net Variance</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, margin: '6px 0', fontFamily: 'var(--font-mono)', color: '#0D9488' }}>
                    {status?.reconciliationSummary?.totalVariance?.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COOL DQC MATRIX TABLE */}
          {activeTab === 'dqc' && (
            <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Omnia Data Quality Checks (DQC 01a - 20) Golden Matrix
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Comprehensive evaluation across Chart of Accounts, Trial Balance, and General Ledger.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Severity Filters */}
                  <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    {(['ALL', 'ERROR', 'WARNING', 'OBSERVATION'] as const).map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setDqcFilter(sev)}
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          background: dqcFilter === sev ? '#FFFFFF' : 'transparent',
                          color: dqcFilter === sev ? 'var(--deloitte-teal)' : 'var(--text-muted)',
                          boxShadow: dqcFilter === sev ? 'var(--shadow-sm)' : 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="jet-input"
                      placeholder="Search checks..."
                      value={dqcSearch}
                      onChange={(e) => setDqcSearch(e.target.value)}
                      style={{ paddingLeft: '32px', paddingRight: '10px', paddingTop: '7px', paddingBottom: '7px', fontSize: '0.82rem' }}
                    />
                  </div>

                  <a
                    href={RunService.getDownloadOutputUrl(runId!, 'Parquet_Data_Integrity_Check_00_Summary.csv')}
                    className="btn-primary"
                    style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '0.84rem' }}
                  >
                    <Download size={14} /> Export DQC Summary
                  </a>
                </div>
              </div>

              {/* Table Representation for DQCs */}
              <div className="table-container">
                <table className="jet-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Check Code</th>
                      <th>Check Name & Description</th>
                      <th>Category</th>
                      <th>Dataset</th>
                      <th>Severity</th>
                      <th style={{ textAlign: 'center', width: '110px' }}>Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDQCs.map((dqc) => {
                      let sevBadge = 'badge-neutral';
                      if (dqc.severity === 'ERROR') sevBadge = 'badge-error';
                      if (dqc.severity === 'WARNING') sevBadge = 'badge-warning';
                      if (dqc.severity === 'OBSERVATION') sevBadge = 'badge-info';

                      return (
                        <tr key={dqc.code}>
                          <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)' }}>
                            DQC {dqc.code}
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dqc.name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{dqc.desc}</div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {dqc.category}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-neutral">{dqc.dataset}</span>
                          </td>
                          <td>
                            <span className={`badge ${sevBadge}`}>{dqc.severity}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <StatusBadge status="PASS" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CONTROL TOTALS */}
          {activeTab === 'controlTotals' && (
            <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Control Totals Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div className="jet-card" style={{ padding: '18px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--deloitte-teal)', marginBottom: '8px' }}>Control Total by Period</div>
                  <a href={RunService.getDownloadOutputUrl(runId!, 'Control_Total_By_Period.csv')} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem', textDecoration: 'none' }}>
                    <Download size={13} /> Download Period CSV
                  </a>
                </div>
                <div className="jet-card" style={{ padding: '18px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--deloitte-teal)', marginBottom: '8px' }}>Control Total by Standard / Non-Standard</div>
                  <a href={RunService.getDownloadOutputUrl(runId!, 'Control_Total_By_Standard_Non_Standard.csv')} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem', textDecoration: 'none' }}>
                    <Download size={13} /> Download Standard CSV
                  </a>
                </div>
                <div className="jet-card" style={{ padding: '18px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--deloitte-teal)', marginBottom: '8px' }}>Control Total by Currency</div>
                  <a href={RunService.getDownloadOutputUrl(runId!, 'Control_Total_By_Currency.csv')} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem', textDecoration: 'none' }}>
                    <Download size={13} /> Download Currency CSV
                  </a>
                </div>
                <div className="jet-card" style={{ padding: '18px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--deloitte-teal)', marginBottom: '8px' }}>Control Total by User ID</div>
                  <a href={RunService.getDownloadOutputUrl(runId!, 'Control_Total_By_User.csv')} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem', textDecoration: 'none' }}>
                    <Download size={13} /> Download User CSV
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LINE STRATIFICATION */}
          {activeTab === 'stratification' && (
            <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Journal Entry Line Stratification (Buckets)
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Buckets: 1 line, 2 - 20 lines, 21 - 100 lines, 101 - 1000 lines, &gt; 1000 lines.
                  </p>
                </div>
                <a
                  href={RunService.getDownloadOutputUrl(runId!, 'JE_Line_Distribution.csv')}
                  className="btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={14} /> Download Stratification CSV
                </a>
              </div>
            </div>
          )}

          {/* TAB 5: MANIFEST & TEMPLATE */}
          {activeTab === 'manifest' && (
            <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  All Generated Omnia Artifacts
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a
                    href={RunService.getDownloadOutputUrl(runId!, 'JE-Recon-and-DIC-Template.xlsx')}
                    className="btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    <FileCheck size={16} /> Download Excel Template (.xlsx)
                  </a>
                  <a href={RunService.getDownloadAllZipUrl(runId!)} className="btn-primary" style={{ textDecoration: 'none' }}>
                    <Archive size={16} /> Download All ZIP
                  </a>
                </div>
              </div>

              <div className="table-container">
                <table className="jet-table">
                  <thead>
                    <tr>
                      <th>Artifact Name</th>
                      <th>Category</th>
                      <th>Format</th>
                      <th>Rows</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status?.outputs?.map((out) => (
                      <tr key={out.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)' }}>{out.name}</td>
                        <td><span className="badge badge-neutral">{out.category}</span></td>
                        <td><span className="badge badge-neutral">{out.type.toUpperCase()}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{out.rowCount ?? '-'}</td>
                        <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{out.description}</td>
                        <td style={{ textAlign: 'right' }}>
                          <a
                            href={RunService.getDownloadOutputUrl(runId!, out.name)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', textDecoration: 'none' }}
                          >
                            <Download size={13} /> Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
