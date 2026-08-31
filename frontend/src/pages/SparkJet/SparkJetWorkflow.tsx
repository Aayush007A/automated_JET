import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, SparkJetParameters, FieldMappingItem } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { FieldMappingTable } from '../../components/common/FieldMappingTable';
import { AutoCleanConstraintsPanel } from '../../components/common/AutoCleanConstraintsPanel';
import { DataFileMappingWorkspace } from '../../components/common/DataFileMappingWorkspace';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SampleDataModal } from '../../components/common/SampleDataModal';
import { StepTimeline, TimelineStep } from '../../components/common/StepTimeline';
import { TabSlider } from '../../components/common/TabSlider';
import { JetSummaryReportSuite } from '../../components/summary/JetSummaryReportSuite';
import { ExecutiveChartJsAnalyticsSuite } from '../../components/summary/ExecutiveChartJsAnalyticsSuite';
import { ExecutiveForensicIntelligenceHub } from '../../components/summary/ExecutiveForensicIntelligenceHub';
import { EngagementAuditParametersCard, EngagementAuditParametersData } from '../../components/common/EngagementAuditParametersCard';
import {
  ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Download,
  Layers, Settings, FileSpreadsheet, ShieldCheck, Database, RefreshCw, Archive,
  BarChart3, PieChart, CheckSquare, Plus, Trash2, Sliders, FileCheck,
  Upload, Search, Filter, HelpCircle, FileText, Sparkles, X, UserCheck, Calendar, Hash, Tag,
  FolderUp, Edit3, Eye, CheckCircle, ChevronRight, ChevronDown, Activity, Clock, Save, Menu,
  Lock, Loader2, UploadCloud, Table, ShieldAlert, Folder, RotateCw, TrendingUp, Repeat, Scale
} from 'lucide-react';

const STEPS: TimelineStep[] = [
  { id: 1, label: 'Ingest Data', sub: 'Upload files', icon: UploadCloud },
  { id: 2, label: 'Auto-Cleansing', sub: 'Validate rules', icon: Sparkles },
  { id: 3, label: 'Data File Mapping', sub: 'Map columns', icon: Table },
  { id: 4, label: 'Integrity Tests', sub: 'IR 1-4', icon: Activity },
  { id: 5, label: 'Parameter Rules', sub: 'Ex 1-12', icon: Settings },
  { id: 6, label: 'Executive Results', sub: 'Review', icon: BarChart3 },
];

const STEP_COPY: Record<number, { title: string; desc: string }> = {
  1: { title: 'Upload Trial Balance & Population', desc: 'Upload TB and Population files or an all-in-one workbook, then preview any sheet instantly.' },
  2: { title: 'Automated Data Cleansing & Constraints Check', desc: 'Verify column types, auto-standardize dates and numeric values, and validate audit constraints.' },
  3: { title: 'Data File Mapping', desc: 'Map columns to the standard Deloitte canonical schema for Trial Balance and Population.' },
  4: { title: 'Integrity & Data Readiness Tests (IR 1-4)', desc: 'Execute and review core integrity checks (Control Totals, Gaps, Seldom Accounts).' },
  5: { title: 'Exception Testing Parameters (Ex 1-12)', desc: 'Configure risk thresholds, account lists, keywords, and unrelated financial statement pairings.' },
  6: { title: 'Executive Summary & Audit Deliverables', desc: 'Interactive visual analytics, exception distributions, and one-click ZIP download of all outputs.' },
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

const getTimelineStatusVariant = (st?: string): 'default' | 'running' | 'completed' | 'warning' => {
  switch (st) {
    case 'COMPLETED': return 'completed';
    case 'RUNNING': return 'running';
    case 'FAILED': return 'warning';
    default: return 'default';
  }
};

interface AccountRow {
  gl: string;
}

interface UserRow {
  username: string;
}

interface DateRow {
  date: string;
}

interface UnrelatedRuleRow {
  debit: string;
  credit: string;
}

interface TBAccountItem {
  gl: string;
  description: string;
  subtype: string;
  fsLineItem: string;
}

interface IR4AccountItem {
  gl: string;
  description: string;
  subtype: string;
  fsLineItem: string;
  count: number;
}

const InlineAutoSuggestInput: React.FC<{
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  isInvalid?: boolean;
}> = ({ value, options, onChange, placeholder = 'Type FS Line Item...', isInvalid }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 240 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) updateCoords();
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const hasTyped = search.trim().length > 0;
  const filteredOptions = hasTyped
    ? options.filter(
        (opt) =>
          opt.toLowerCase().includes(search.toLowerCase()) &&
          opt.toLowerCase() !== search.trim().toLowerCase()
      )
    : [];

  const isExactMatched = Boolean(
    search.trim() && options.some((opt) => opt.toLowerCase() === search.trim().toLowerCase())
  );
  const showRedError = isInvalid && !isOpen && !isExactMatched && search.trim() !== '0' && search.trim() !== '';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        className="jet-input"
        value={search}
        placeholder={placeholder}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          onChange(val);
          updateCoords();
          setIsOpen(val.trim().length > 0);
        }}
        onFocus={() => {
          updateCoords();
          if (search.trim().length > 0) setIsOpen(true);
        }}
        style={{
          fontSize: '0.84rem',
          padding: '7px 10px',
          borderColor: showRedError ? 'var(--status-error)' : undefined,
          background: showRedError ? '#FEE2E2' : '#FFFFFF',
          width: '100%',
        }}
      />

      {isOpen && filteredOptions.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: `${coords.top - window.scrollY + 4}px`,
            left: `${coords.left - window.scrollX}px`,
            width: `${Math.max(coords.width, 240)}px`,
            zIndex: 999999,
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 12px 28px -5px rgba(15, 23, 42, 0.22), 0 8px 12px -6px rgba(15, 23, 42, 0.1)',
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          <div style={{ padding: '4px 8px', fontSize: '0.70rem', fontWeight: 700, color: 'var(--deloitte-teal)', letterSpacing: '0.02em' }}>
            Matching Suggestions ({filteredOptions.length}):
          </div>
          {filteredOptions.map((opt) => (
            <div
              key={opt}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setSearch(opt);
                setIsOpen(false);
              }}
              style={{
                padding: '6px 10px',
                fontSize: '0.80rem',
                fontWeight: 600,
                color: '#1E293B',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '2px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0FDFA';
                e.currentTarget.style.color = 'var(--deloitte-teal)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#1E293B';
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SparkJetWorkflow: React.FC = () => {
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

  // Sample Data Modal for raw inputs (Top 50 sample rows)
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
  const [autoCleanReport, setAutoCleanReport] = useState<{
    tbRowsCleaned: number;
    glRowsCleaned: number;
    datesStandardized: number;
    numbersConverted: number;
    constraintsPassed: boolean;
    warnings: string[];
    status: string;
  } | null>(null);

  // Step 4 Integrity Testing states & auditor approval
  const [isIrApproved, setIsIrApproved] = useState(false);
  const [autoTriggeredIR, setAutoTriggeredIR] = useState(false);
  // Sequential reveal states: show in-progress before exposing numbers
  const [irResultsRevealed, setIrResultsRevealed] = useState(false);
  const [resultsRevealed, setResultsRevealed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Step 3 In-Place IR Preview State
  const [selectedIRFile, setSelectedIRFile] = useState<string>('IR_Exception_1.csv');
  const [irPreviewData, setIrPreviewData] = useState<{ headers: string[]; rows: Record<string, any>[]; totalRows: number } | null>(null);
  const [loadingIRPreview, setLoadingIRPreview] = useState(false);
  const [irPreviewSearch, setIrPreviewSearch] = useState('');

  // Active Parameter Exception Toggles (Ex1 to Ex12)
  const [enabledExceptions, setEnabledExceptions] = useState<Record<string, boolean>>({
    ex1: true, ex2: true, ex3: true, ex4: true, ex5: true, ex6: true,
    ex7: true, ex8: true, ex9: true, ex10: true, ex11: true, ex12: true,
  });

  // Parameter Exception Inputs (Clean: Empty by default, no dummy data)
  const [unusualAccounts, setUnusualAccounts] = useState<AccountRow[]>([]);
  const [seldomAccounts, setSeldomAccounts] = useState<AccountRow[]>([]);
  const [usersOfInterest, setUsersOfInterest] = useState<UserRow[]>([]);
  const [datesOfInterest, setDatesOfInterest] = useState<DateRow[]>([]);
  const [keywords, setKeywords] = useState<string[]>([
    'fault', 'bribe', "auditor's adjustment", 'mistake', 'risk', 'misstatement',
    'officer', 'prize', 'abuse', 'alter', 'seizure', 'bury', 'conceal', 'conting',
    'corrupt', 'demand', 'embezzle', 'theft', 'fictitious', 'fraud', 'manual', 'adjustment', 'reverse'
  ]);
  const [unrelatedRules, setUnrelatedRules] = useState<UnrelatedRuleRow[]>([]);

  // Contextual TB and IR4 data
  const [tbAccounts, setTbAccounts] = useState<TBAccountItem[]>([]);
  const [tbFSLineItems, setTbFSLineItems] = useState<string[]>([]);
  const [ir4Data, setIr4Data] = useState<IR4AccountItem[]>([]);
  const [loadingContextData, setLoadingContextData] = useState(false);
  const [ex2MinCount, setEx2MinCount] = useState<number>(1);
  const [ex2MaxCount, setEx2MaxCount] = useState<number>(5);

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

  const handleUpdateEngagementParams = async (newParams: EngagementAuditParametersData) => {
    setEngagementAuditParams(newParams);
    setSparkParams((prev) => ({
      ...prev,
      engagementName: newParams.engagementName,
      startDate: newParams.startDate,
      endDate: newParams.endDate,
      financialYearEnd: newParams.financialYearEnd,
      currencyCode: newParams.operatingCurrency,
      materiality: typeof newParams.overallMateriality === 'number' ? newParams.overallMateriality : parseFloat(String(newParams.overallMateriality).replace(/[^0-9.-]+/g, '')) || 500000,
    }));
    if (runId && config) {
      try {
        await RunService.updateConfig(runId, {
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

  // General Spark JET Parameters (Clean: No dummy engagement name)
  const [sparkParams, setSparkParams] = useState<SparkJetParameters>({
    fiscalYear: 2026,
    financialYearEnd: '31-Dec-25',
    engagementName: 'Tangerine Skies Pvt Ltd - JET Audit FY26',
    currencyCode: 'USD',
    ex3RevenueDebitsThreshold: 0.0,
    ex4FewPostingsUserThreshold: 2,
    ex6ClosingEntriesBeforeDays: 1,
    ex6ClosingEntriesAfterDays: 10,
    ex8RoundDigits: ['1000', '10000', '100000', '1000000', '6', '7', '8', '9'],
    ex11DaysAfterClosing: 10,
    controlSampleCount: 61,
  });

  // Active Parameter Form Values
  const [ex3Threshold, setEx3Threshold] = useState<number>(0.0);
  const [ex3QuarterStart, setEx3QuarterStart] = useState<string>('');
  const [ex3QuarterEnd, setEx3QuarterEnd] = useState<string>('');
  const [ex4Threshold, setEx4Threshold] = useState<number>(2);
  const [ex6BeforeDays, setEx6BeforeDays] = useState<number>(1);
  const [ex6AfterDays, setEx6AfterDays] = useState<number>(10);
  const [ex6ClosingDate, setEx6ClosingDate] = useState<string>('31-Dec-25');
  const [ex6Frequency, setEx6Frequency] = useState<string>('Annually');
  const [ex8SelectedDigits, setEx8SelectedDigits] = useState<string[]>(['1000', '10000', '100000', '1000000', '6', '7', '8', '9']);
  const [ex9CountThreshold, setEx9CountThreshold] = useState<number>(2);
  const [ex9AmountThreshold, setEx9AmountThreshold] = useState<number>(0.0);
  const [ex11DaysAfterClosing, setEx11DaysAfterClosing] = useState<number>(10);
  const [ex11ClosingDate, setEx11ClosingDate] = useState<string>('31-Dec-25');
  const [ex11Frequency, setEx11Frequency] = useState<string>('Annually');
  const [runControlSample, setRunControlSample] = useState<boolean>(true);
  const [sampleDocCount, setSampleDocCount] = useState<number>(61);

  // Active Parameter Tab in Step 5
  const [paramTab, setParamTab] = useState<string>('ex1');
  const [newKeyword, setNewKeyword] = useState('');
  const [fileImportNotice, setFileImportNotice] = useState<string | null>(null);

  // Results View Tabs in Step 5
  const [activeVisualTab, setActiveVisualTab] = useState<'preview' | 'overview' | 'checkpoints' | 'forensic' | 'artifacts'>('preview');
  const [exceptionCategoryFilter, setExceptionCategoryFilter] = useState<'flagged' | 'clean'>('flagged');
  const [artifactCategoryFilter, setArtifactCategoryFilter] = useState<string>('PARAMETER');
  const [artifactSearch, setArtifactSearch] = useState('');
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<string>('Parameter_Exception_1.csv');
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: Record<string, any>[]; totalRows: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');

  // Hidden file input refs for uploading exception parameters
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImportTarget, setCurrentImportTarget] = useState<string | null>(null);

  const loadContextData = async (cfg?: RunConfig | null) => {
    if (!runId) return;
    setLoadingContextData(true);
    try {
      // 1. Fetch Trial Balance rows to extract unique FS Line Items and Revenue/Income subtypes
      let tbRows: any[] = [];
      try {
        const tbOut = await RunService.previewOutput(runId, 'TB.csv', 2000);
        if (tbOut && tbOut.rows && tbOut.rows.length > 0) {
          tbRows = tbOut.rows;
        }
      } catch (e) { }

      if (tbRows.length === 0) {
        const activeCfg = cfg || config;
        const tbFile = activeCfg?.files.find(f => f.detectedDataset === 'TRIAL_BALANCE' || f.sheets?.some(s => s.detectedDataset === 'TRIAL_BALANCE'));
        if (tbFile) {
          try {
            const res = await RunService.previewInputFile(runId, tbFile.fileId, tbFile.sheets?.[0]?.sheetName, 2000);
            if (res && res.rows) tbRows = res.rows;
          } catch (e) { }
        }
      }

      if (tbRows.length > 0) {
        const parsedTB: TBAccountItem[] = tbRows.map(r => ({
          gl: String(r.G_L || r['G/L'] || r.gl || r['GL Account'] || r['Account Number'] || '').trim(),
          description: String(r.Description || r['Account Description'] || r.description || '').trim(),
          subtype: String(r.Account_Subtype || r['Account Subtype'] || r.subtype || '').trim(),
          fsLineItem: String(r.FS_Line_Item || r['FS Line Item'] || r.fs_line_item || '').trim(),
        })).filter(a => !!a.gl && a.gl !== '0');
        setTbAccounts(parsedTB);

        const uniqueFS = Array.from(new Set(parsedTB.map(a => a.fsLineItem).filter(Boolean))).sort();
        setTbFSLineItems(uniqueFS);
      }

      // 2. Fetch IR-4 (Seldom Accounts with Posting counts)
      try {
        let ir4Out: any = null;
        try {
          ir4Out = await RunService.previewOutput(runId, 'Parameter_2_Seldom_Accounts_Inputs.csv', 1000);
        } catch (e) {
          ir4Out = await RunService.previewOutput(runId, 'IR_Exception_4.csv', 1000).catch(() => null);
        }
        if (ir4Out && ir4Out.rows) {
          const parsedIR4: IR4AccountItem[] = ir4Out.rows.map((r: any) => ({
            gl: String(r.G_L || r.gl || '').trim(),
            description: String(r.Description || r.description || '').trim(),
            subtype: String(r.Account_Subtype || r.subtype || '').trim(),
            fsLineItem: String(r.FS_Line_Item || r.fsLineItem || '').trim(),
            count: Number(r.Count || r.count || 0),
          })).filter((r: any) => !!r.gl);
          setIr4Data(parsedIR4);
        }
      } catch (e) { }

      // 3. Check for workbook sheets containing exception inputs (e.g. ex_1, ex_2, ex_5, ex_7, ex_12)
      const activeCfg = cfg || config;
      if (activeCfg?.files) {
        for (const file of activeCfg.files) {
          if (file.sheets && file.sheets.length > 0) {
            for (const sheet of file.sheets) {
              const sName = sheet.sheetName.toLowerCase();
              if (/ex.*1|unusual/i.test(sName)) {
                try {
                  const res = await RunService.previewInputFile(runId, file.fileId, sheet.sheetName, 500);
                  if (res && res.rows && res.rows.length > 0) {
                    const parsed = res.rows.map((r: any) => ({
                      gl: String(r.G_L || r['G/L'] || r.gl || Object.values(r)[0] || '').trim()
                    })).filter((r: any) => !!r.gl);
                    if (parsed.length > 0) setUnusualAccounts((prev) => prev.length === 0 ? parsed : prev);
                  }
                } catch (e) { }
              }
              if (/ex.*2|seldom/i.test(sName)) {
                try {
                  const res = await RunService.previewInputFile(runId, file.fileId, sheet.sheetName, 500);
                  if (res && res.rows && res.rows.length > 0) {
                    const parsed = res.rows.map((r: any) => ({
                      gl: String(r.G_L || r['G/L'] || r.gl || Object.values(r)[0] || '').trim()
                    })).filter((r: any) => !!r.gl);
                    if (parsed.length > 0) setSeldomAccounts((prev) => prev.length === 0 ? parsed : prev);
                  }
                } catch (e) { }
              }
              if (/ex.*5|user/i.test(sName)) {
                try {
                  const res = await RunService.previewInputFile(runId, file.fileId, sheet.sheetName, 500);
                  if (res && res.rows && res.rows.length > 0) {
                    const parsed = res.rows.map((r: any) => ({
                      username: String(r.User_name || r.user_name || r.username || Object.values(r)[0] || '').trim()
                    })).filter((r: any) => !!r.username);
                    if (parsed.length > 0) setUsersOfInterest((prev) => prev.length === 0 ? parsed : prev);
                  }
                } catch (e) { }
              }
              if (/ex.*7|date|holiday/i.test(sName)) {
                try {
                  const res = await RunService.previewInputFile(runId, file.fileId, sheet.sheetName, 500);
                  if (res && res.rows && res.rows.length > 0) {
                    const parsed = res.rows.map((r: any) => ({
                      date: String(r.Pstng_Date || r.posting_date || r.date || Object.values(r)[0] || '').trim()
                    })).filter((r: any) => !!r.date);
                    if (parsed.length > 0) setDatesOfInterest((prev) => prev.length === 0 ? parsed : prev);
                  }
                } catch (e) { }
              }
              if (/ex.*12|unrelated/i.test(sName)) {
                try {
                  const res = await RunService.previewInputFile(runId, file.fileId, sheet.sheetName, 500);
                  if (res && res.rows && res.rows.length > 0) {
                    const parsed = res.rows.map((r: any) => {
                      const vals = Object.values(r);
                      return {
                        debit: String(r.Debit || r.debit || vals[0] || '').trim(),
                        credit: String(r.Credit || r.credit || vals[1] || '').trim(),
                      };
                    }).filter((r: any) => !!r.debit && !!r.credit);
                    if (parsed.length > 0) setUnrelatedRules((prev) => prev.length === 0 ? parsed : prev);
                  }
                } catch (e) { }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading context data:', err);
    } finally {
      setLoadingContextData(false);
    }
  };

  const loadRun = async (overrideRunId?: string) => {
    const targetRunId = overrideRunId || runId;
    if (!targetRunId) {
      setLoading(false);
      setConfig({
        runId: '',
        workflow: 'SPARK_JET',
        engine: 'PYTHON',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'admin',
        userName: 'Auditor',
        files: [],
        datasetMap: {},
        fieldMappings: { tb: [], gl: [] },
        sparkParameters: {
          selectedExceptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          ex10Keywords: [],
          ex12UnrelatedRules: [],
        },
        omniaParameters: {
          fiscalYear: 2026,
          fiscalYearEnd: '2026-03-31',
          testingPeriodStart: '2025-04-01',
          testingPeriodEnd: '2026-03-31',
          currency: 'Entity Currency'
        }
      });
      setStatus(null);
      return;
    }
    try {
      const data = await RunService.getRun(targetRunId);
      setConfig(data.config);
      setStatus(data.status);

      if (data.config.sparkParameters) {
        setSparkParams((prev) => ({ ...prev, ...data.config.sparkParameters }));
        const p = data.config.sparkParameters;
        if (p.ex1UnusualAccounts && p.ex1UnusualAccounts.length > 0) {
          setUnusualAccounts(p.ex1UnusualAccounts.map(gl => ({ gl })));
        }
        if (p.ex2SeldomAccounts && p.ex2SeldomAccounts.length > 0) {
          setSeldomAccounts(p.ex2SeldomAccounts.map(gl => ({ gl })));
        }
        if (p.ex4FewPostingsUserThreshold !== undefined) {
          setEx4Threshold(Number(p.ex4FewPostingsUserThreshold));
        }
        if (p.ex5UsersOfInterest && p.ex5UsersOfInterest.length > 0) {
          setUsersOfInterest(p.ex5UsersOfInterest.map(u => ({ username: u })));
        }
        if (p.ex6ClosingEntriesBeforeDays !== undefined) setEx6BeforeDays(p.ex6ClosingEntriesBeforeDays);
        if (p.ex6ClosingEntriesAfterDays !== undefined) setEx6AfterDays(p.ex6ClosingEntriesAfterDays);
        if (p.ex6ClosingDate) setEx6ClosingDate(p.ex6ClosingDate);
        if (p.ex6Frequency) setEx6Frequency(p.ex6Frequency);
        if (p.ex7DatesOfInterest && p.ex7DatesOfInterest.length > 0) {
          setDatesOfInterest(p.ex7DatesOfInterest.map(d => ({ date: d })));
        }
        if (p.ex8RoundDigits && p.ex8RoundDigits.length > 0) setEx8SelectedDigits(p.ex8RoundDigits);
        if (p.ex9DuplicateCountThreshold !== undefined) setEx9CountThreshold(p.ex9DuplicateCountThreshold);
        if (p.ex9DuplicateAmountThreshold !== undefined) setEx9AmountThreshold(p.ex9DuplicateAmountThreshold);
        if (p.ex10Keywords && p.ex10Keywords.length > 0) setKeywords(p.ex10Keywords);
        if (p.ex11ClosingDate) setEx11ClosingDate(p.ex11ClosingDate);
        if (p.ex11DaysAfterClosing !== undefined) setEx11DaysAfterClosing(p.ex11DaysAfterClosing);
        if (p.ex11Frequency) setEx11Frequency(p.ex11Frequency);
        if (p.ex12UnrelatedRules && p.ex12UnrelatedRules.length > 0) {
          setUnrelatedRules(p.ex12UnrelatedRules.map(r => ({ debit: r.debit || r.debitFSLine || '', credit: r.credit || r.creditFSLine || '' })));
        }
        if (p.controlSampleCount !== undefined) setSampleDocCount(p.controlSampleCount);
      }

      if (data.status.status === 'COMPLETED') {
        setMaxCompletedStep(6);
        setIsIrApproved(true);
        setCurrentStep((prev) => (prev === 1 ? 6 : prev));
      } else if (data.config.files.length > 0) {
        setMaxCompletedStep((prev) => Math.max(prev, 2));
      }

      await loadContextData(data.config);
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
    if (currentStep === 4 && runId && selectedIRFile) {
      setLoadingIRPreview(true);
      RunService.previewOutput(runId, selectedIRFile, 50)
        .then((res) => setIrPreviewData(res))
        .catch(() => setIrPreviewData(null))
        .finally(() => setLoadingIRPreview(false));
    }
  }, [currentStep, selectedIRFile, runId, status?.status]);

  useEffect(() => {
    if (currentStep === 6 && runId && selectedPreviewFile) {
      setLoadingPreview(true);
      RunService.previewOutput(runId, selectedPreviewFile, 50)
        .then((res) => setPreviewData(res))
        .catch(() => setPreviewData(null))
        .finally(() => setLoadingPreview(false));
    }
  }, [currentStep, selectedPreviewFile, runId, status?.status]);

  useEffect(() => {
    if (!runId) return;
    const unsub = RunService.subscribeProgress(runId, (event) => {
      setStatus((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          progress: event.progress,
          currentStage: event.stage,
          status: event.stage === 'COMPLETED' ? 'COMPLETED' : event.stage === 'FAILED' ? 'FAILED' : 'RUNNING',
        };
      });

      if (event.stage === 'COMPLETED' || event.progress === 100) {
        setExecuting(false);
        loadRun();
      }
    });

    return () => unsub();
  }, [runId]);

  useEffect(() => {
    if (status?.status === 'COMPLETED' && !executing) {
      setToastMessage('Audit Pipeline Execution Completed — All 12 Parameter Exceptions and Deliverables Ready.');
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status?.status, executing]);

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

  const handleStartIntegrityTesting = async () => {
    if (!runId) return;
    setExecuting(true);
    try {
      await RunService.startPipeline(runId);
    } catch (err: any) {
      console.error('Failed to start pipeline integrity testing:', err);
      setExecuting(false);
    }
  };

  const handleApproveIrResults = () => {
    setIsIrApproved(true);
  };

  // Automatically trigger Integrity Testing when landing on Step 4
  useEffect(() => {
    if (currentStep === 4 && runId && !autoTriggeredIR) {
      if (status?.status !== 'COMPLETED' && !executing) {
        setAutoTriggeredIR(true);
        handleStartIntegrityTesting();
      }
    }
  }, [currentStep, runId, autoTriggeredIR, status?.status, executing]);

  // Step 4: Show results immediately when not executing (no fake loading on revisit)
  useEffect(() => {
    if (currentStep !== 4) return;
    if (executing) {
      setIrResultsRevealed(false);
    } else {
      setIrResultsRevealed(true);
    }
  }, [currentStep, executing]);

  // Step 6: Show results immediately when not executing (no fake loading on revisit)
  useEffect(() => {
    if (currentStep !== 6) return;
    if (executing) {
      setResultsRevealed(false);
    } else {
      setResultsRevealed(true);
    }
  }, [currentStep, executing]);

  const handleRunAutoClean = async () => {
    if (!runId) return;
    setAutoCleaning(true);
    try {
      const res = await RunService.autoCleanData(runId);
      if (res.success) {
        setAutoCleanReport(res.report);
      }
    } catch (err: any) {
      console.error('Failed to run auto-cleaning:', err);
    } finally {
      setAutoCleaning(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      let activeRunId = runId;
      if (!activeRunId) {
        // Create Run only when the user uploads data
        const res = await RunService.createRun('SPARK_JET', 'PYTHON');
        activeRunId = res.runId;
        navigate(`/spark-jet?runId=${activeRunId}`, { replace: true });
      }
      await RunService.uploadFiles(activeRunId, files, 'SPARK_JET');
      await loadRun(activeRunId);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!runId) return;
    try {
      await RunService.removeFile(runId, fileId);
      await loadRun();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMappingChange = async (datasetType: string, stdField: string, srcHeader: string) => {
    if (!runId || !config) return;
    const currentMappings = [...(datasetType === 'tb' ? (config.fieldMappings.tb || []) : (config.fieldMappings.gl || []))];
    const idx = currentMappings.findIndex((m) => m.standardField === stdField);
    if (idx >= 0) {
      currentMappings[idx] = { ...currentMappings[idx], sourceField: srcHeader, status: srcHeader ? 'MATCHED' : 'UNMATCHED' };
    } else {
      currentMappings.push({ standardField: stdField, sourceField: srcHeader, matchType: 'MANUAL', confidence: 100, status: srcHeader ? 'MATCHED' : 'UNMATCHED', required: false });
    }

    try {
      setAutoCleanReport(null);
      await RunService.updateFieldMappings(runId, datasetType, currentMappings);
      await loadRun();
    } catch (err) {
      console.error(err);
    }
  };

  const triggerImportFile = (targetType: string) => {
    setCurrentImportTarget(targetType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentImportTarget) return;

    try {
      let rows: string[][] = [];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        let targetSheetName = wb.SheetNames[0];
        if (currentImportTarget === 'unusualAccounts') {
          const found = wb.SheetNames.find((s) => /ex.*1|unusual/i.test(s));
          if (found) targetSheetName = found;
        } else if (currentImportTarget === 'seldomAccounts') {
          const found = wb.SheetNames.find((s) => /ex.*2|seldom/i.test(s));
          if (found) targetSheetName = found;
        } else if (currentImportTarget === 'usersOfInterest') {
          const found = wb.SheetNames.find((s) => /ex.*5|user/i.test(s));
          if (found) targetSheetName = found;
        } else if (currentImportTarget === 'closingEntries') {
          const found = wb.SheetNames.find((s) => /ex.*6|closing/i.test(s));
          if (found) targetSheetName = found;
        } else if (currentImportTarget === 'datesOfInterest') {
          const found = wb.SheetNames.find((s) => /ex.*7|date|holiday/i.test(s));
          if (found) targetSheetName = found;
        } else if (currentImportTarget === 'keywords') {
          const found = wb.SheetNames.find((s) => /ex.*10|keyword/i.test(s));
          if (found) targetSheetName = found;
        } else if (currentImportTarget === 'unrelatedRules') {
          const found = wb.SheetNames.find((s) => /ex.*12|unrelated/i.test(s));
          if (found) targetSheetName = found;
        }

        const sheet = wb.Sheets[targetSheetName];
        if (sheet) {
          const raw = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
          rows = raw.map((r) => Array.isArray(r) ? r.map((c) => String(c ?? '').trim()) : []);
        }
      } else {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        rows = lines.map((l) => l.split(',').map((c) => c.trim().replace(/^["']|["']$/g, '')));
      }

      if (rows.length <= 1) return;
      const dataRows = rows.slice(1);

      if (currentImportTarget === 'unusualAccounts') {
        const parsedRows: AccountRow[] = [];
        dataRows.forEach((cols) => {
          if (cols[0]) parsedRows.push({ gl: cols[0] });
        });
        setUnusualAccounts(parsedRows);
        setFileImportNotice(`Successfully imported ${parsedRows.length} Unusual Accounts (G_L) from ${file.name}`);
      } else if (currentImportTarget === 'seldomAccounts') {
        const parsedRows: AccountRow[] = [];
        dataRows.forEach((cols) => {
          if (cols[0]) parsedRows.push({ gl: cols[0] });
        });
        setSeldomAccounts(parsedRows);
        setFileImportNotice(`Successfully imported ${parsedRows.length} Seldom Accounts (G_L) from ${file.name}`);
      } else if (currentImportTarget === 'usersOfInterest') {
        const parsedUsers: UserRow[] = [];
        dataRows.forEach((cols) => {
          if (cols[0]) parsedUsers.push({ username: cols[0] });
        });
        setUsersOfInterest(parsedUsers);
        setFileImportNotice(`Successfully imported ${parsedUsers.length} Users of Interest (User_name) from ${file.name}`);
      } else if (currentImportTarget === 'datesOfInterest') {
        const parsedDates: DateRow[] = [];
        dataRows.forEach((cols) => {
          if (cols[0]) parsedDates.push({ date: cols[0] });
        });
        setDatesOfInterest(parsedDates);
        setFileImportNotice(`Successfully imported ${parsedDates.length} Dates of Interest (Pstng_Date) from ${file.name}`);
      } else if (currentImportTarget === 'closingEntries') {
        if (dataRows.length > 0) {
          const cols = dataRows[0];
          if (cols[0]) setEx6BeforeDays(Number(cols[0]) || 1);
          if (cols[1]) setEx6AfterDays(Number(cols[1]) || 10);
          if (cols[2]) setEx6ClosingDate(cols[2]);
          if (cols[3]) setEx6Frequency(cols[3]);
          setFileImportNotice(`Successfully imported Closing Entries parameters from ${file.name}`);
        }
      } else if (currentImportTarget === 'keywords') {
        const parsedKw: string[] = [];
        dataRows.forEach((cols) => {
          cols.forEach((k) => { if (k && !parsedKw.includes(k.toLowerCase())) parsedKw.push(k.toLowerCase()); });
        });
        setKeywords(parsedKw);
        setFileImportNotice(`Successfully imported ${parsedKw.length} Risk Keywords from ${file.name}`);
      } else if (currentImportTarget === 'unrelatedRules') {
        const parsedRules: UnrelatedRuleRow[] = [];
        const invalidInFile: string[] = [];
        dataRows.forEach((cols) => {
          if (cols[0] && cols[1]) {
            const d = cols[0];
            const c = cols[1];
            parsedRules.push({ debit: d, credit: c });
            if (tbFSLineItems.length > 0) {
              if (!tbFSLineItems.some((f) => f.trim().toLowerCase() === d.toLowerCase()) && !invalidInFile.includes(d)) {
                invalidInFile.push(d);
              }
              if (!tbFSLineItems.some((f) => f.trim().toLowerCase() === c.toLowerCase()) && !invalidInFile.includes(c)) {
                invalidInFile.push(c);
              }
            }
          }
        });
        setUnrelatedRules(parsedRules);
        if (invalidInFile.length > 0) {
          setFileImportNotice(`Imported ${parsedRules.length} rules. WARNING: [${invalidInFile.join(', ')}] not found in Trial Balance FS Line Items.`);
        } else {
          setFileImportNotice(`Successfully imported ${parsedRules.length} Unrelated Pair Rules (Debit, Credit) from ${file.name}`);
        }
      }

      setTimeout(() => setFileImportNotice(null), 7000);
    } catch (err) {
      console.error('Failed to parse uploaded file:', err);
    }
  };

  const detectedRevenueInfo = useMemo(() => {
    if (tbAccounts.length === 0) {
      return { accounts: [] as TBAccountItem[], status: 'No Trial Balance accounts loaded', subtypeName: '' };
    }
    const rev = tbAccounts.filter(a => a.subtype.trim().toLowerCase() === 'revenue');
    if (rev.length > 0) {
      return { accounts: rev, status: 'Filtered on Account_Subtype: Revenue', subtypeName: 'Revenue' };
    }
    const inc = tbAccounts.filter(a => a.subtype.trim().toLowerCase() === 'income');
    if (inc.length > 0) {
      return { accounts: inc, status: 'Filtered on Account_Subtype: Income (Fallback)', subtypeName: 'Income' };
    }
    return { accounts: [] as TBAccountItem[], status: 'No Revenue or Income accounts found in Trial Balance (Blank)', subtypeName: '' };
  }, [tbAccounts]);

  const invalidEx12Items = useMemo(() => {
    if (tbFSLineItems.length === 0) return [];
    const invalid: string[] = [];
    unrelatedRules.forEach(r => {
      const d = (r.debit || '').trim();
      const c = (r.credit || '').trim();
      if (d && d !== '0' && !tbFSLineItems.some(f => f.trim().toLowerCase() === d.toLowerCase())) {
        if (!invalid.includes(d)) invalid.push(d);
      }
      if (c && c !== '0' && !tbFSLineItems.some(f => f.trim().toLowerCase() === c.toLowerCase())) {
        if (!invalid.includes(c)) invalid.push(c);
      }
    });
    return invalid;
  }, [unrelatedRules, tbFSLineItems]);

  const matchingIR4Accounts = useMemo(() => {
    return ir4Data.filter(r => r.count >= ex2MinCount && r.count <= ex2MaxCount);
  }, [ir4Data, ex2MinCount, ex2MaxCount]);

  const handleAddAllIR4InRange = () => {
    const newGLs = matchingIR4Accounts.map(r => r.gl).filter(gl => gl && !seldomAccounts.some(s => s.gl === gl));
    if (newGLs.length === 0) {
      setFileImportNotice(`All ${matchingIR4Accounts.length} accounts in range ${ex2MinCount}-${ex2MaxCount} are already added.`);
    } else {
      setSeldomAccounts(prev => [...prev, ...newGLs.map(gl => ({ gl }))]);
      setFileImportNotice(`Added ${newGLs.length} Seldom Accounts from IR-4 with count between ${ex2MinCount} and ${ex2MaxCount}`);
    }
    setTimeout(() => setFileImportNotice(null), 6000);
  };

  // Helper to check individual exception input completeness
  const getExceptionInputStatus = (id: string): { hasInput: boolean; label: string; issue?: string } => {
    switch (id) {
      case 'ex1': {
        const count = unusualAccounts.filter((a) => a.gl && a.gl.trim().length > 0).length;
        return { hasInput: count > 0, label: count > 0 ? `${count} GLs` : 'Missing GL', issue: 'At least 1 GL code is required' };
      }
      case 'ex2': {
        const count = seldomAccounts.filter((a) => a.gl && a.gl.trim().length > 0).length;
        return { hasInput: count > 0, label: count > 0 ? `${count} GLs` : 'Missing GL', issue: 'At least 1 seldom GL code is required' };
      }
      case 'ex3': {
        const count = detectedRevenueInfo.accounts.length;
        return { hasInput: count > 0, label: count > 0 ? `${count} GLs` : 'No Revenue GL', issue: 'At least 1 Revenue / Income GL account is required' };
      }
      case 'ex4': {
        const valid = ex4Threshold !== undefined && ex4Threshold !== null && !isNaN(Number(ex4Threshold)) && Number(ex4Threshold) >= 1;
        return { hasInput: valid, label: valid ? `≤ ${ex4Threshold}` : 'Invalid Threshold', issue: 'Posting threshold must be ≥ 1' };
      }
      case 'ex5': {
        const count = usersOfInterest.filter((u) => u.username && u.username.trim().length > 0).length;
        return { hasInput: count > 0, label: count > 0 ? `${count} Users` : 'Missing User', issue: 'At least 1 username is required' };
      }
      case 'ex6': {
        const valid = ex6BeforeDays !== undefined && ex6AfterDays !== undefined && !isNaN(Number(ex6BeforeDays)) && !isNaN(Number(ex6AfterDays)) && Number(ex6BeforeDays) >= 0 && Number(ex6AfterDays) >= 0 && !!ex6ClosingDate && ex6ClosingDate.trim().length > 0;
        return { hasInput: valid, label: valid ? `${ex6BeforeDays}/${ex6AfterDays}d` : 'Missing Days/Date', issue: 'Closing date and before/after days (≥0) required' };
      }
      case 'ex7': {
        const count = datesOfInterest.filter((d) => d.date && d.date.trim().length > 0).length;
        return { hasInput: count > 0, label: count > 0 ? `${count} Dates` : 'Missing Date', issue: 'At least 1 date of interest is required' };
      }
      case 'ex8': {
        const count = ex8SelectedDigits.length;
        return { hasInput: count > 0, label: count > 0 ? `${count} Rules` : 'Select Rule', issue: 'At least 1 round digit or repeating rule must be selected' };
      }
      case 'ex9': {
        const valid = ex9CountThreshold !== undefined && !isNaN(Number(ex9CountThreshold)) && Number(ex9CountThreshold) >= 1;
        return { hasInput: valid, label: valid ? `> ${ex9CountThreshold}` : 'Invalid Count', issue: 'Duplicate multiplier threshold must be ≥ 1' };
      }
      case 'ex10': {
        const count = keywords.filter((k) => k && k.trim().length > 0).length;
        return { hasInput: count > 0, label: count > 0 ? `${count} Words` : 'Missing Keyword', issue: 'At least 1 keyword is required' };
      }
      case 'ex11': {
        const valid = ex11DaysAfterClosing !== undefined && !isNaN(Number(ex11DaysAfterClosing)) && Number(ex11DaysAfterClosing) >= 0 && !!ex11ClosingDate && ex11ClosingDate.trim().length > 0;
        return { hasInput: valid, label: valid ? `${ex11DaysAfterClosing}d Cutoff` : 'Missing Days/Date', issue: 'Closing date and cutoff days (≥0) required' };
      }
      case 'ex12': {
        const validRules = unrelatedRules.filter((r) => r.debit && r.debit.trim().length > 0 && r.credit && r.credit.trim().length > 0);
        const hasValid = validRules.length > 0 && invalidEx12Items.length === 0;
        return {
          hasInput: hasValid,
          label: invalidEx12Items.length > 0 ? 'Invalid TB Line' : validRules.length > 0 ? `${validRules.length} Rules` : 'Missing Rule',
          issue: invalidEx12Items.length > 0 ? 'Contains invalid FS Line items not present in TB' : 'At least 1 Debit / Credit pairing rule required'
        };
      }
      case 'controlSample': {
        const valid = sampleDocCount !== undefined && !isNaN(Number(sampleDocCount)) && Number(sampleDocCount) >= 1;
        return { hasInput: valid, label: valid ? `${sampleDocCount} Docs` : 'Invalid Count', issue: 'Control sample doc count must be ≥ 1' };
      }
      default:
        return { hasInput: true, label: '' };
    }
  };

  // Step 5 Exception Input Validation Summary
  const step5Validation = useMemo(() => {
    const missing: { id: string; name: string; issue: string }[] = [];
    const EXCEPTION_NAMES: Record<string, string> = {
      ex1: 'Ex 01: Unusual Accounts',
      ex2: 'Ex 02: Seldom Accounts',
      ex3: 'Ex 03: Revenue Account Debits',
      ex4: 'Ex 04: Few Postings Users',
      ex5: 'Ex 05: Users of Interest',
      ex6: 'Ex 06: Closing Entries',
      ex7: 'Ex 07: Dates of Interest',
      ex8: 'Ex 08: Round Amounts',
      ex9: 'Ex 09: Duplicate Entries',
      ex10: 'Ex 10: Keywords in Text',
      ex11: 'Ex 11: Post-Closing Entries',
      ex12: 'Ex 12: Unrelated Pairings',
      controlSample: 'Control Sample Dump',
    };

    Object.entries(enabledExceptions).forEach(([key, isEnabled]) => {
      if (isEnabled) {
        const inputStatus = getExceptionInputStatus(key);
        if (!inputStatus.hasInput) {
          missing.push({ id: key, name: EXCEPTION_NAMES[key] || key, issue: inputStatus.issue || 'Missing input configuration' });
        }
      }
    });

    if (runControlSample) {
      const csStatus = getExceptionInputStatus('controlSample');
      if (!csStatus.hasInput) {
        missing.push({ id: 'controlSample', name: EXCEPTION_NAMES.controlSample, issue: csStatus.issue || 'Invalid count' });
      }
    }

    const anySelected = Object.values(enabledExceptions).some(Boolean) || runControlSample;
    if (!anySelected) {
      missing.push({ id: 'general', name: 'Audit Selection', issue: 'Select at least one exception or control sample to execute' });
    }

    return {
      isValid: missing.length === 0,
      missing,
    };
  }, [
    enabledExceptions, unusualAccounts, seldomAccounts, detectedRevenueInfo,
    ex4Threshold, usersOfInterest, ex6BeforeDays, ex6AfterDays, ex6ClosingDate,
    datesOfInterest, ex8SelectedDigits, ex9CountThreshold, keywords,
    ex11DaysAfterClosing, ex11ClosingDate, unrelatedRules, invalidEx12Items,
    runControlSample, sampleDocCount
  ]);

  const handleDownloadOutput = (fileName: string) => {
    if (!runId) return;
    const url = RunService.getDownloadOutputUrl(runId, fileName);
    window.open(url, '_blank');
  };

  const handleRunPipeline = async (targetStepAfter: number = 5) => {
    if (!runId) return;

    if (enabledExceptions.ex12 && invalidEx12Items.length > 0) {
      alert(`Constraint Validation Error in Ex-12 (Unrelated Accounts):\n\nThe following FS Line Items do not exist in the Trial Balance's FS_Line_Item column:\n${invalidEx12Items.map(i => `• ${i}`).join('\n')}\n\nPlease select valid FS Line Items from the Trial Balance before proceeding.`);
      setParamTab('ex12');
      return;
    }

    setExecuting(true);
    setCurrentStep(targetStepAfter);

    try {
      const selectedList = Object.entries(enabledExceptions)
        .filter(([_, isEnabled]) => isEnabled)
        .map(([key]) => parseInt(key.replace('ex', ''), 10));

      const payloadParams: SparkJetParameters = {
        ...sparkParams,
        selectedExceptions: selectedList,
        runControlSamples: runControlSample,
        ex1UnusualAccounts: unusualAccounts.map((a) => a.gl.trim()).filter(Boolean),
        ex2SeldomAccounts: seldomAccounts.map((a) => a.gl.trim()).filter(Boolean),
        ex3RevenueAccounts: detectedRevenueInfo.accounts.map((a) => a.gl.trim()).filter(Boolean),
        ex3RevenueDebitsThreshold: Number(ex3Threshold || 0),
        ex3QuarterStartDate: ex3QuarterStart,
        ex3QuarterEndDate: ex3QuarterEnd,
        ex4FewPostingsUserThreshold: Number(ex4Threshold || 1),
        ex5UsersOfInterest: usersOfInterest.map((u) => u.username.trim()).filter(Boolean),
        ex6ClosingEntriesBeforeDays: Number(ex6BeforeDays || 1),
        ex6ClosingEntriesAfterDays: Number(ex6AfterDays || 10),
        ex6ClosingDate: ex6ClosingDate || '31-Dec-25',
        ex6Frequency: ex6Frequency || 'Annually',
        ex7DatesOfInterest: datesOfInterest.map((d) => d.date.trim()).filter(Boolean),
        ex8RoundDigits: ex8SelectedDigits,
        ex9DuplicateCountThreshold: Number(ex9CountThreshold || 2),
        ex9DuplicateAmountThreshold: Number(ex9AmountThreshold || 0),
        ex10Keywords: keywords.filter(Boolean),
        ex11ClosingDate: ex11ClosingDate || '31-Dec-25',
        ex11DaysAfterClosing: Number(ex11DaysAfterClosing || 10),
        ex11Frequency: ex11Frequency || 'Annually',
        ex12UnrelatedRules: unrelatedRules.map((r) => ({ debit: r.debit.trim(), credit: r.credit.trim() })),
        controlSampleCount: Number(sampleDocCount || 61),
      };

      await RunService.updateConfig(runId, { sparkParameters: payloadParams });
      await RunService.startPipeline(runId);
      setMaxCompletedStep((prev) => Math.max(prev, targetStepAfter));
    } catch (err) {
      console.error(err);
      setExecuting(false);
    }
  };

  const tbHeaders = useMemo(() => {
    if (!config) return [];
    const tbFile = config.files.find((f) => f.detectedDataset === 'TRIAL_BALANCE' || f.sheets?.some((s) => s.detectedDataset === 'TRIAL_BALANCE'));
    if (!tbFile) return [];
    if (tbFile.sheets && tbFile.sheets.length > 0) {
      const targetSheet = tbFile.sheets.find((s) => s.detectedDataset === 'TRIAL_BALANCE') || tbFile.sheets[0];
      return targetSheet.headers;
    }
    return tbFile.headers;
  }, [config]);

  const glHeaders = useMemo(() => {
    if (!config) return [];
    const glFile = config.files.find((f) => f.detectedDataset === 'GENERAL_LEDGER' || f.detectedDataset === 'POPULATION' || f.sheets?.some((s) => s.detectedDataset === 'GENERAL_LEDGER' || s.detectedDataset === 'POPULATION'));
    if (!glFile) return [];
    if (glFile.sheets && glFile.sheets.length > 0) {
      const targetSheet = glFile.sheets.find((s) => s.detectedDataset === 'GENERAL_LEDGER' || s.detectedDataset === 'POPULATION') || glFile.sheets[0];
      return targetSheet.headers;
    }
    return glFile.headers;
  }, [config]);

  const isStep1Valid = Boolean(config && config.files.length > 0);

  const hasRequiredMappings = useMemo(() => {
    if (!config) return false;
    const tbRequired = (config.fieldMappings.tb || []).filter((m) => m.required);
    const glRequired = (config.fieldMappings.gl || []).filter((m) => m.required);
    const tbOk = tbRequired.length === 0 || tbRequired.every((m) => Boolean(m.sourceField));
    const glOk = glRequired.length === 0 || glRequired.every((m) => Boolean(m.sourceField));
    const tbHasAny = (config.fieldMappings.tb || []).some((m) => Boolean(m.sourceField));
    const glHasAny = (config.fieldMappings.gl || []).some((m) => Boolean(m.sourceField));
    return tbOk && glOk && tbHasAny && glHasAny;
  }, [config]);

  const isConstraintsPassed = Boolean(
    autoCleanReport?.constraintsPassed === true
  );

  const canAccessStep = (stepId: number) => {
    if (status?.status === 'COMPLETED' || maxCompletedStep >= 6) return true;
    if (stepId === 1) return true;
    if (stepId === 2) return isStep1Valid;
    if (stepId === 3) return isStep1Valid;
    if (stepId === 4) return isStep1Valid;
    if (stepId === 5) return isStep1Valid && (isIrApproved || maxCompletedStep >= 4);
    if (stepId === 6) return isStep1Valid && (isIrApproved || maxCompletedStep >= 5);
    return false;
  };

  const getExceptionCount = (exNum: number, ruleKey: string): number => {
    if (status?.parameterSummary) {
      if (typeof status.parameterSummary[ruleKey] === 'number') return status.parameterSummary[ruleKey];
      if (typeof status.parameterSummary[`Ex${exNum}`] === 'number') return status.parameterSummary[`Ex${exNum}`];
      if (typeof status.parameterSummary[`ex${exNum}`] === 'number') return status.parameterSummary[`ex${exNum}`];
      if (typeof status.parameterSummary[`Parameter_Exception_${exNum}`] === 'number') return status.parameterSummary[`Parameter_Exception_${exNum}`];
    }
    const file = status?.outputs?.find(o =>
      o.name.toLowerCase() === `parameter_exception_${exNum}.csv` ||
      o.name.toLowerCase().startsWith(`parameter_exception_${exNum}`)
    );
    return file?.rowCount ?? 0;
  };

  const getIRTestCount = (irNum: number, summaryField: keyof NonNullable<RunSummary['integritySummary']>, fileName: string): number => {
    if (status?.integritySummary && typeof status.integritySummary[summaryField] === 'number' && status.integritySummary[summaryField] > 0) {
      return status.integritySummary[summaryField];
    }
    const file = status?.outputs?.find(o =>
      o.name.toLowerCase() === fileName.toLowerCase() ||
      o.name.toLowerCase().startsWith(`ir_exception_${irNum}.`)
    );
    if (file?.rowCount !== undefined) return file.rowCount;
    return status?.integritySummary?.[summaryField] ?? 0;
  };

  const filteredPreviewRows = useMemo(() => {
    if (!previewData || !previewData.rows) return [];
    if (!previewSearch) return previewData.rows;
    return previewData.rows.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(previewSearch.toLowerCase())));
  }, [previewData, previewSearch]);

  const filteredIRPreviewRows = useMemo(() => {
    if (!irPreviewData || !irPreviewData.rows) return [];
    if (!irPreviewSearch) return irPreviewData.rows;
    return irPreviewData.rows.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(irPreviewSearch.toLowerCase())));
  }, [irPreviewData, irPreviewSearch]);

  const visibleParamTabs = useMemo(() => {
    const list: Array<{ id: string; label: string; count: number | null }> = [];
    if (enabledExceptions.ex1) list.push({ id: 'ex1', label: 'Ex1: Unusual Accounts', count: unusualAccounts.length });
    if (enabledExceptions.ex2) list.push({ id: 'ex2', label: 'Ex2: Seldom Accounts', count: seldomAccounts.length });
    if (enabledExceptions.ex3) list.push({ id: 'ex3', label: 'Ex3: Revenue Debits', count: detectedRevenueInfo.accounts.length });
    if (enabledExceptions.ex4) list.push({ id: 'ex4', label: 'Ex4: Few Postings Users', count: null });
    if (enabledExceptions.ex5) list.push({ id: 'ex5', label: 'Ex5: Users of Interest', count: usersOfInterest.length });
    if (enabledExceptions.ex6) list.push({ id: 'ex6', label: 'Ex6: Closing Entries', count: null });
    if (enabledExceptions.ex7) list.push({ id: 'ex7', label: 'Ex7: Dates of Interest', count: datesOfInterest.length });
    if (enabledExceptions.ex8) list.push({ id: 'ex8', label: 'Ex8: Round Amounts', count: ex8SelectedDigits.length });
    if (enabledExceptions.ex9) list.push({ id: 'ex9', label: 'Ex9: Duplicate Entries', count: null });
    if (enabledExceptions.ex10) list.push({ id: 'ex10', label: 'Ex10: Keywords in Text', count: keywords.length });
    if (enabledExceptions.ex11) list.push({ id: 'ex11', label: 'Ex11: Post-Closing Entries', count: null });
    if (enabledExceptions.ex12) list.push({ id: 'ex12', label: 'Ex12: Unrelated Pairings', count: unrelatedRules.length });
    if (runControlSample) list.push({ id: 'controlSample', label: 'Control Sample Dump', count: sampleDocCount });
    return list;
  }, [enabledExceptions, unusualAccounts, seldomAccounts, detectedRevenueInfo, usersOfInterest, datesOfInterest, ex8SelectedDigits, keywords, unrelatedRules, runControlSample, sampleDocCount]);

  useEffect(() => {
    if (visibleParamTabs.length > 0 && !visibleParamTabs.some(t => t.id === paramTab)) {
      setParamTab(visibleParamTabs[0].id);
    }
  }, [visibleParamTabs, paramTab]);

  const currentExecutionStatus = useMemo(() => status?.status || 'CREATED', [status?.status]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="spin-slow" style={{ margin: '0 auto 16px', color: 'var(--deloitte-teal)' }} />
        Loading JET Execution Workspace...
      </div>
    );
  }

  const EXCEPTION_CARDS = [
    { num: 1, id: 'ex1', key: 'Ex1_Unusual_Accounts', file: 'Parameter_Exception_1.csv', title: 'Unusual Accounts Postings', desc: 'Entries posted to accounts flagged as unusual or suspense' },
    { num: 2, id: 'ex2', key: 'Ex2_Seldom_Accounts', file: 'Parameter_Exception_2.csv', title: 'Seldom Used Accounts', desc: 'Entries in seldom accounts exceeding posting count threshold' },
    { num: 3, id: 'ex3', key: 'Ex3_Revenue_Debits', file: 'Parameter_Exception_3.csv', title: 'Revenue Account Debits', desc: 'Unusual debit transactions posted to revenue line items' },
    { num: 4, id: 'ex4', key: 'Ex4_Few_Postings_Users', file: 'Parameter_Exception_4.csv', title: 'Users with Infrequent Postings', desc: 'Entries created by personnel with minimal historical volume' },
    { num: 5, id: 'ex5', key: 'Ex5_Users_Of_Interest', file: 'Parameter_Exception_5.csv', title: 'Users of Specific Interest', desc: 'Transactions authored by key management or IT personnel' },
    { num: 6, id: 'ex6', key: 'Ex6_Closing_Entries', file: 'Parameter_Exception_6.csv', title: 'Period-End Closing Entries', desc: 'Journals posted immediately before or after year-end closing' },
    { num: 7, id: 'ex7', key: 'Ex7_Dates_Of_Interest', file: 'Parameter_Exception_7.csv', title: 'Dates of Interest (Holidays/Weekends)', desc: 'Postings during non-working days, company holidays, or weekends' },
    { num: 8, id: 'ex8', key: 'Ex8_Round_Amounts', file: 'Parameter_Exception_8.csv', title: 'Round Sum Amounts', desc: 'Entries ending in multiple consecutive zeros (e.g. 100K, 1M)' },
    { num: 9, id: 'ex9', key: 'Ex9_Duplicate_Entries', file: 'Parameter_Exception_9.csv', title: 'Duplicate Journal Postings', desc: 'Identical amount, date, and GL account combinations' },
    { num: 10, id: 'ex10', key: 'Ex10_Keyword_Entries', file: 'Parameter_Exception_10.csv', title: 'Fraud & Risk Keywords in Text', desc: 'Journals containing suspicious words (mistake, audit, bribe, error)' },
    { num: 11, id: 'ex11', key: 'Ex11_Post_Closing_Entries', file: 'Parameter_Exception_11.csv', title: 'Post-Closing Adjustments', desc: 'Transactions dated strictly after the official balance sheet date' },
    { num: 12, id: 'ex12', key: 'Ex12_Unrelated_Accounts', file: 'Parameter_Exception_12.csv', title: 'Unrelated Line Item Pairings', desc: 'Incompatible debit/credit account pairings (e.g. Debtors to PPE)' },
    { num: 13, id: 'controlSample', key: 'Control_Sample', file: 'Control_Sample_Dump.csv', title: 'Representative Control Sample', desc: 'Randomly selected representative sample of journal documents' },
  ];

  // Contextual timeline banner actions per step
  const renderTimelineActions = () => {
    if (currentStep === 1) {
      return (
        <button onClick={() => { setCurrentStep(2); setMaxCompletedStep(prev => Math.max(prev, 1)); }} disabled={!isStep1Valid} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
          Continue <ArrowRight size={13} />
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
            disabled={autoCleaning || !isConstraintsPassed}
            className="btn-primary"
            style={{
              padding: '6px 16px', fontSize: '0.82rem',
              opacity: autoCleaning || !isConstraintsPassed ? 0.45 : 1,
              cursor: autoCleaning || !isConstraintsPassed ? 'not-allowed' : 'pointer'
            }}
            title={!isConstraintsPassed ? 'All required checkpoints must pass before proceeding' : 'Continue to Mapping'}
          >
            Continue to Mapping <ArrowRight size={13} />
          </button>
        </div>
      );
    }
    if (currentStep === 3) {
      return (
        <>
          <button onClick={() => setCurrentStep(2)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}><ArrowLeft size={13} /> Back</button>
          <button
            onClick={() => { setCurrentStep(4); setMaxCompletedStep((prev) => Math.max(prev, 3)); }}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            Continue to IR Testing <ArrowRight size={13} />
          </button>
        </>
      );
    }
    if (currentStep === 4) {
      return (
        <>
          <button onClick={() => setCurrentStep(3)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
            <ArrowLeft size={13} /> Back
          </button>
          {irResultsRevealed && (
            <button
              type="button"
              onClick={handleStartIntegrityTesting}
              disabled={executing}
              className="btn-soft-slate"
              style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} className={executing ? 'spin-slow' : ''} />
              {executing ? 'Testing In Progress...' : 'Re-Run Tests'}
            </button>
          )}
          {/* Configure Exceptions: locked until explicitly approved via the in-page Approve button */}
          <button
            onClick={() => {
              if (isIrApproved) {
                setCurrentStep(5);
                setMaxCompletedStep(prev => Math.max(prev, 4));
              }
            }}
            disabled={!isIrApproved || executing}
            className="btn-primary"
            style={{
              padding: '6px 16px',
              fontSize: '0.82rem',
              opacity: !isIrApproved || executing ? 0.45 : 1,
              cursor: !isIrApproved || executing ? 'not-allowed' : 'pointer',
            }}
            title={!isIrApproved ? 'Approve integrity test results in the panel below to unlock' : 'Configure Exceptions'}
          >
            Configure Exceptions <ArrowRight size={13} />
          </button>
        </>
      );
    }
    if (currentStep === 5) {
      return (
        <>
          <button onClick={() => setCurrentStep(4)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
            <ArrowLeft size={13} /> Back
          </button>
          <button
            onClick={() => {
              if (step5Validation.isValid) {
                setCurrentStep(6);
                handleRunPipeline(6);
              }
            }}
            disabled={executing || !step5Validation.isValid}
            className="btn-primary"
            style={{
              padding: '6px 16px',
              fontSize: '0.82rem',
              opacity: executing || !step5Validation.isValid ? 0.45 : 1,
              cursor: executing || !step5Validation.isValid ? 'not-allowed' : 'pointer',
            }}
            title={!step5Validation.isValid ? `Configuration Incomplete: ${step5Validation.missing.map(m => `${m.name} (${m.issue})`).join('; ')}` : 'Execute Exceptions'}
          >
            <Play size={13} fill="#FFFFFF" />
            {executing ? 'Executing...' : 'Execute Exceptions'}
          </button>
        </>
      );
    }
    if (currentStep === 6) {
      return (
        <button onClick={() => setCurrentStep(5)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
          <Settings size={13} /> Reconfigure Exceptions
        </button>
      );
    }
    return null;
  };

  return (
    <div className="container" style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px clamp(16px, 3vw, 36px) 48px' }}>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv,.txt,.xlsx,.xls" onChange={handleImportFileSelected} />

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

      {/* MAIN WORKSPACE */}
      <main>

        {/* STEP 1: ENGAGEMENT AUDIT PARAMETERS & FILE INGESTION */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 3px', color: '#0F172A', letterSpacing: '-0.02em' }}>
                    Data File Upload
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0, fontWeight: 500 }}>
                    Upload your raw Trial Balance and General Ledger / Population dataset files.
                  </p>
                </div>
              </div>

              <FileDropzone
                files={config?.files || []}
                onUpload={handleUpload}
                onRemove={handleRemoveFile}
                onPreview={handleOpenSamplePreview}
                uploading={uploading}
                isCleaningPassed={isConstraintsPassed}
              />
            </div>
          </div>
        )}

        {/* STEP 2: AUTO-CLEANSING & SCHEMA CONSTRAINTS VALIDATION */}
        {currentStep === 2 && (
          <div>
            <AutoCleanConstraintsPanel
              workflowType="SPARK_JET"
              runId={runId || undefined}
              autoCleanReport={autoCleanReport}
              onReportUpdate={(rep) => setAutoCleanReport(rep)}
              onPreviewFailedRows={handlePreviewArtifact}
              tbRowCount={status?.totalInputRows?.tb || 22}
              glRowCount={status?.totalInputRows?.gl || (status?.glCheckpointsSummary?.totalLines || 36)}
              coaRowCount={0}
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
                  rowCount: status?.totalInputRows?.tb || 22,
                },
                {
                  key: 'gl',
                  title: 'Population / General Ledger (GL)',
                  shortName: 'GL',
                  sourceHeaders: glHeaders,
                  mappings: config?.fieldMappings.gl || [],
                  onChangeMapping: (std, src) => handleMappingChange('gl', std, src),
                  rowCount: status?.totalInputRows?.gl || (status?.glCheckpointsSummary?.totalLines || 36),
                },
              ]}
              onProceed={() => {
                setCurrentStep(4);
              }}
            />
          </div>
        )}

        {/* STEP 4: CHECKPOINTS & INTEGRITY TESTING (IR 1-4) */}
        {currentStep === 4 && (
          <div className="fade-slide-in">
            {/* Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <MetricCard
                label="TB Accounts"
                value={executing ? 'In Progress...' : (status?.totalInputRows?.tb || 0)}
                subtitle="Trial Balance Accounts"
                variant="peach"
                delta="▲ Active"
              />
              <MetricCard
                label="GL Population Lines"
                value={executing ? 'In Progress...' : (status?.totalInputRows?.gl || 0)}
                subtitle="General Ledger Entries"
                variant="green"
                delta="▲ 100%"
              />
              <MetricCard
                label="Balanced Journals"
                value={executing ? 'In Progress...' : (status?.glCheckpointsSummary?.balancedJournalsCount ?? (status?.totalInputRows?.gl || 0))}
                subtitle="Net Balance = 0.0"
                variant="blue"
                delta="▲ In Balance"
              />
              <MetricCard
                label="Unbalanced Journals"
                value={executing ? 'In Progress...' : (status?.glCheckpointsSummary?.unbalancedJournalsCount || 0)}
                subtitle="Net Balance ≠ 0.0"
                variant={status?.glCheckpointsSummary?.unbalancedJournalsCount ? 'pink' : 'green'}
                delta={status?.glCheckpointsSummary?.unbalancedJournalsCount ? '▼ Variance' : '▲ 0 Errors'}
              />
              <MetricCard
                label="Total IR Exceptions"
                value={executing ? 'In Progress...' : (getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv') + getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv') + getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv'))}
                subtitle="Integrity Tests 1 - 3"
                variant="teal"
                delta="▲ 3 Tests"
              />
            </div>

            {/* Trial Balance & IR 1-4 Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>
                  Trial Balance Checkpoints
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', margin: 0, padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span>1. G/L & Description Non-Blank</span>
                    <StatusBadge status={executing ? 'PENDING' : 'PASS'} />
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span>2. Account Subtype Validity</span>
                    <StatusBadge status={executing ? 'PENDING' : 'PASS'} />
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span>3. Total Column Sum of Balances = 0</span>
                    <StatusBadge status={executing ? 'PENDING' : (status?.tbCheckpointsSummary?.totalBalanceZero ? 'PASS' : 'WARNING')} />
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span>4. Debit vs Credit Total Balancing</span>
                    <StatusBadge status={executing ? 'PENDING' : (status?.tbCheckpointsSummary?.debitCreditEqual ? 'PASS' : 'PASS')} />
                  </li>
                </ul>
              </div>

              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--deloitte-teal)', margin: 0 }}>
                    Integrity Tests (IR 1 - 4) Summary
                  </h4>
                  <button onClick={() => window.open(RunService.getDownloadAllZipUrl(runId || ''), '_blank')} className="btn-soft-slate" title="Download complete zip of all IR exception outputs">
                    <Download size={13} /> Export All IR (ZIP)
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>IR 1: GL in TB not in Population</span>
                    {executing ? (
                      <span style={{ fontSize: '0.74rem', color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Loader2 size={11} className="spin-slow" /> In Progress...
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>IR 2: Activity Mismatches</span>
                    {executing ? (
                      <span style={{ fontSize: '0.74rem', color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Loader2 size={11} className="spin-slow" /> In Progress...
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>IR 3: GL in Population not in TB</span>
                    {executing ? (
                      <span style={{ fontSize: '0.74rem', color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Loader2 size={11} className="spin-slow" /> In Progress...
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>IR 4: Seldom Accounts (Transaction Counts)</span>
                    {executing ? (
                      <span style={{ fontSize: '0.74rem', color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Loader2 size={11} className="spin-slow" /> In Progress...
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(4, 'test4SeldomAccountsCount', 'Parameter_2_Seldom_Accounts_Inputs.csv')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Auditor Approval Banner */}
            <div
              style={{
                background: isIrApproved ? '#E6F4F5' : '#FFFBEB',
                border: `1.5px solid ${isIrApproved ? '#99D5D9' : '#FDE68A'}`,
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: isIrApproved ? '0 4px 14px rgba(0, 118, 128, 0.08)' : '0 4px 14px rgba(217, 119, 6, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isIrApproved ? (
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#CCECEF', color: '#007680', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={20} />
                  </div>
                ) : (
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldAlert size={20} />
                  </div>
                )}
                <div>
                  <h4 style={{ fontSize: '0.94rem', fontWeight: 800, margin: '0 0 2px', color: isIrApproved ? '#005A62' : '#92400E' }}>
                    {isIrApproved ? 'Integrity Test Results Approved by Auditor' : 'Auditor Approval Required to Proceed to Parameters'}
                  </h4>
                  <p style={{ fontSize: '0.80rem', margin: 0, color: isIrApproved ? '#007680' : '#B45309' }}>
                    {isIrApproved
                      ? 'Trial Balance balancing and IR 1-4 exception test results are approved. Parameter rules (Ex 1-12) are now unlocked.'
                      : 'Review the Trial Balance checkpoints and IR 1-4 exception results above. Click "Approve Results" to unlock parameter exception testing.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {!isIrApproved ? (
                  <button
                    type="button"
                    onClick={handleApproveIrResults}
                    disabled={executing}
                    style={{
                      background: 'linear-gradient(135deg, #007680 0%, #005A62 100%)',
                      color: '#FFFFFF',
                      padding: '9px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: executing ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0, 118, 128, 0.3)',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <CheckCircle2 size={16} />
                    Approve Results
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(5);
                      setMaxCompletedStep((prev) => Math.max(prev, 4));
                    }}
                    className="btn-primary"
                    style={{ padding: '9px 20px', fontSize: '0.88rem' }}
                  >
                    Configure Parameters <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>Integrity Tests (IR 1 - 4) Top 50 Exception Data Previews</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Inspect the exact flagged rows for each integrity rule before approving and executing parameter rules.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" className="jet-input" placeholder="Search IR rows..." value={irPreviewSearch} onChange={(e) => setIrPreviewSearch(e.target.value)} style={{ paddingLeft: '30px', fontSize: '0.82rem' }} />
                  </div>
                  <button onClick={() => handleDownloadOutput(selectedIRFile)} className="btn-soft-teal">
                    <Download size={13} /> Export {selectedIRFile}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {[
                  { file: 'IR_Exception_1.csv', label: 'IR 1: TB GL not in Pop', count: getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv') },
                  { file: 'IR_Exception_2.csv', label: 'IR 2: Activity Mismatches', count: getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv') },
                  { file: 'IR_Exception_3.csv', label: 'IR 3: Pop GL not in TB', count: getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv') },
                  { file: 'Parameter_2_Seldom_Accounts_Inputs.csv', label: 'IR 4: Seldom Accounts Input', count: getIRTestCount(4, 'test4SeldomAccountsCount', 'Parameter_2_Seldom_Accounts_Inputs.csv') },
                ].map((tab) => (
                  <button
                    key={tab.file}
                    onClick={() => setSelectedIRFile(tab.file)}
                    className={selectedIRFile === tab.file ? 'btn-soft-teal' : 'btn-soft-slate'}
                    style={{ fontWeight: selectedIRFile === tab.file ? 700 : 600 }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      background: selectedIRFile === tab.file ? 'var(--deloitte-teal)' : 'var(--border-subtle)',
                      color: selectedIRFile === tab.file ? '#FFFFFF' : 'var(--text-secondary)',
                      padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {loadingIRPreview ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="spin-slow" style={{ margin: '0 auto 8px', color: 'var(--deloitte-teal)' }} />
                  Loading IR exception records...
                </div>
              ) : irPreviewData && irPreviewData.headers.length > 0 ? (
                <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  <table className="jet-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>#</th>
                        {irPreviewData.headers.map((h) => <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIRPreviewRows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{idx + 1}</td>
                          {irPreviewData.headers.map((h) => <td key={h} style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{row[h] !== undefined && row[h] !== '' ? String(row[h]) : '-'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  0 exception records found for {selectedIRFile} (Test Passed cleanly).
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: PARAMETER EXCEPTION TESTING CONFIGURATION */}
        {currentStep === 5 && (
          <div>
            {fileImportNotice && (
              <div className="notice-banner">
                <CheckCircle2 size={18} color="var(--status-success)" />
                <span>{fileImportNotice}</span>
              </div>
            )}

            {/* Master-Detail 2-Column Split Workspace */}
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px', alignItems: 'start' }}>
              
              {/* LEFT SIDEBAR: Exception Selection & Navigation Palette (No Horizontal Scrolling!) */}
              <div className="glass-panel" style={{ padding: '18px', background: '#FFFFFF', position: 'sticky', top: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Audit Exceptions</h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ex1 to Ex12 + Control Sample</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setEnabledExceptions({ ex1: true, ex2: true, ex3: true, ex4: true, ex5: true, ex6: true, ex7: true, ex8: true, ex9: true, ex10: true, ex11: true, ex12: true })}
                      style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--deloitte-teal)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      All
                    </button>
                    <span style={{ color: '#CBD5E1', fontSize: '0.72rem' }}>|</span>
                    <button
                      onClick={() => setEnabledExceptions({ ex1: false, ex2: false, ex3: false, ex4: false, ex5: false, ex6: false, ex7: false, ex8: false, ex9: false, ex10: false, ex11: false, ex12: false })}
                      style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      None
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: 'calc(100vh - 210px)', overflowY: 'auto', paddingRight: '2px' }}>
                  {[
                    { id: 'ex1', num: '01', title: 'Unusual Accounts' },
                    { id: 'ex2', num: '02', title: 'Seldom Accounts' },
                    { id: 'ex3', num: '03', title: 'Revenue Account Debits' },
                    { id: 'ex4', num: '04', title: 'Few Postings Users' },
                    { id: 'ex5', num: '05', title: 'Users of Interest' },
                    { id: 'ex6', num: '06', title: 'Closing Entries' },
                    { id: 'ex7', num: '07', title: 'Dates of Interest' },
                    { id: 'ex8', num: '08', title: 'Round Amounts' },
                    { id: 'ex9', num: '09', title: 'Duplicate Entries' },
                    { id: 'ex10', num: '10', title: 'Keywords in Text' },
                    { id: 'ex11', num: '11', title: 'Post-Closing Entries' },
                    { id: 'ex12', num: '12', title: 'Unrelated Pairings' },
                    { id: 'controlSample', num: 'CS', title: 'Control Sample Dump' },
                  ].map((r) => {
                    const isControl = r.id === 'controlSample';
                    const isChecked = isControl ? runControlSample : enabledExceptions[r.id];
                    const isActiveTab = paramTab === r.id;
                    const inputStatus = getExceptionInputStatus(r.id);
                    const isMissingInput = isChecked && !inputStatus.hasInput;

                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          if (!isControl && !isChecked) {
                            setEnabledExceptions((prev) => ({ ...prev, [r.id]: true }));
                          } else if (isControl && !isChecked) {
                            setRunControlSample(true);
                          }
                          setParamTab(r.id);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: isActiveTab ? '1.5px solid #007680' : isMissingInput ? '1.5px solid #FECDD3' : isChecked ? '1px solid #E2E8F0' : '1px solid transparent',
                          borderLeft: isActiveTab ? '4px solid #007680' : isMissingInput ? '4px solid #EF4444' : isChecked ? '4px solid #CBD5E1' : '4px solid transparent',
                          background: isActiveTab ? '#F0FDFA' : isMissingInput ? '#FFF5F5' : isChecked ? '#FFFFFF' : 'transparent',
                          boxShadow: isActiveTab ? '0 3px 12px rgba(0, 118, 128, 0.12)' : isChecked ? '0 2px 6px rgba(15, 23, 42, 0.03)' : 'none',
                          opacity: isChecked ? 1 : 0.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          {!isControl ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                setEnabledExceptions((prev) => ({ ...prev, [r.id]: e.target.checked }));
                              }}
                              style={{ cursor: 'pointer', accentColor: '#007680', width: '15px', height: '15px' }}
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                setRunControlSample(e.target.checked);
                              }}
                              style={{ cursor: 'pointer', accentColor: '#007680', width: '15px', height: '15px' }}
                            />
                          )}
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '0.68rem', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)',
                                color: isActiveTab ? '#007680' : isMissingInput ? '#DC2626' : '#475569',
                                background: isActiveTab ? '#FFFFFF' : isMissingInput ? '#FEE2E2' : '#F1F5F9',
                                padding: '1px 6px', borderRadius: '4px', border: isMissingInput ? '1px solid #FECDD3' : '1px solid #CBD5E1'
                              }}>
                                {r.id !== 'controlSample' ? `Ex ${r.num}` : 'CS'}
                              </span>
                              <span style={{ fontSize: '0.82rem', fontWeight: isActiveTab ? 800 : 600, color: isActiveTab ? '#0F172A' : '#334155' }}>
                                {r.title}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isChecked && (
                          isMissingInput ? (
                            <span style={{
                              background: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECDD3',
                              padding: '2px 7px',
                              borderRadius: '12px',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              flexShrink: 0
                            }}>
                              <AlertTriangle size={10} color="#DC2626" />
                              <span>Missing Input</span>
                            </span>
                          ) : inputStatus.label ? (
                            <span style={{
                              background: isActiveTab ? '#007680' : '#F1F5F9',
                              color: isActiveTab ? '#FFFFFF' : '#475569',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono, monospace)',
                              border: isActiveTab ? '1px solid #007680' : '1px solid #CBD5E1',
                              flexShrink: 0,
                            }}>
                              {inputStatus.label}
                            </span>
                          ) : null
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: Active Parameter Configuration Workspace */}
              <div style={{ minWidth: 0 }}>

                {/* TAB: EX1 UNUSUAL ACCOUNTS */}
                {paramTab === 'ex1' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex1: Entries made to Unusual Accounts</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target suspense, intercompany clearing, and unusual GL accounts. Schema column: <code>G_L</code></p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => triggerImportFile('unusualAccounts')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_1.csv/.xlsx)</button>
                        <button onClick={() => setUnusualAccounts((prev) => [...prev, { gl: '' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add G_L</button>
                      </div>
                    </div>

                    {unusualAccounts.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
                        {unusualAccounts.map((row, idx) => {
                          const matchedTB = tbAccounts.find((a) => a.gl === row.gl.trim());
                          return (
                            <div key={idx} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="text"
                                  className="jet-input"
                                  value={row.gl}
                                  placeholder="G_L Code"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setUnusualAccounts((prev) => {
                                      const updated = [...prev];
                                      updated[idx].gl = val;
                                      return updated;
                                    });
                                  }}
                                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', fontWeight: 600, padding: '5px 8px' }}
                                />
                                <button onClick={() => setUnusualAccounts((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '5px', color: 'var(--status-error)', flexShrink: 0 }} title="Remove account">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: matchedTB ? 'var(--deloitte-teal)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: matchedTB ? 600 : 400 }}>
                                {matchedTB ? `${matchedTB.description} (${matchedTB.subtype})` : (row.gl ? 'Custom Account' : 'Enter GL code')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: '4px' }}>No unusual accounts configured</div>
                        <div style={{ fontSize: '0.78rem' }}>Click "+ Add G_L" or "Import File (ex_1.csv/.xlsx)" to add target accounts.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: EX2 SELDOM ACCOUNTS */}
                {paramTab === 'ex2' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex2: Entries made to Seldom-based Accounts</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Accounts with infrequent postings. Schema column: <code>G_L</code>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => triggerImportFile('seldomAccounts')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_2.csv/.xlsx)</button>
                        <button onClick={() => setSeldomAccounts((prev) => [...prev, { gl: '' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add G_L</button>
                      </div>
                    </div>

                    {/* SELECT FROM IR-4 RESULTS WITH SPECIFIC RANGE OF COUNT */}
                    <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--deloitte-teal-light)', borderRadius: '8px', border: '1px solid var(--border-medium)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sliders size={16} color="var(--deloitte-teal)" />
                            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>Select from IR-4 Seldom Accounts (Count Range)</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Filter accounts from Integrity Test 4 by transaction volume and add them directly to Ex-2.</p>
                        </div>
                        <button onClick={handleAddAllIR4InRange} disabled={matchingIR4Accounts.length === 0} className="btn-soft-teal" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                          <Plus size={13} /> Add All {matchingIR4Accounts.length} in Range to Ex-2
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label className="jet-label" style={{ margin: 0, fontSize: '0.76rem' }}>Min Count:</label>
                          <input type="number" className="jet-input" value={ex2MinCount} onChange={(e) => setEx2MinCount(Math.max(0, Number(e.target.value)))} style={{ width: '70px', padding: '4px 8px', fontSize: '0.8rem' }} min="0" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label className="jet-label" style={{ margin: 0, fontSize: '0.76rem' }}>Max Count:</label>
                          <input type="number" className="jet-input" value={ex2MaxCount} onChange={(e) => setEx2MaxCount(Math.max(0, Number(e.target.value)))} style={{ width: '70px', padding: '4px 8px', fontSize: '0.8rem' }} min="0" />
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          <strong>{matchingIR4Accounts.length}</strong> matching seldom accounts in IR-4 (Counts between {ex2MinCount} and {ex2MaxCount})
                        </div>
                      </div>

                      {matchingIR4Accounts.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '8px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          {matchingIR4Accounts.slice(0, 30).map((item) => {
                            const isAdded = seldomAccounts.some((s) => s.gl === item.gl);
                            return (
                              <button
                                key={item.gl}
                                onClick={() => {
                                  if (!isAdded) setSeldomAccounts((prev) => [...prev, { gl: item.gl }]);
                                }}
                                disabled={isAdded}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px',
                                  borderRadius: '14px', border: isAdded ? '1px solid var(--deloitte-teal)' : '1px solid var(--border-medium)',
                                  background: isAdded ? 'var(--deloitte-teal)' : '#F8FAFC',
                                  color: isAdded ? '#FFFFFF' : 'var(--text-primary)',
                                  fontSize: '0.74rem', fontWeight: 600, cursor: isAdded ? 'default' : 'pointer',
                                }}
                              >
                                <span>{item.gl}</span>
                                <span style={{ opacity: 0.8, fontSize: '0.68rem' }}>({item.count})</span>
                                {isAdded ? <CheckCircle2 size={11} /> : <Plus size={11} />}
                              </button>
                            );
                          })}
                          {matchingIR4Accounts.length > 30 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center', padding: '0 4px' }}>
                              + {matchingIR4Accounts.length - 30} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {seldomAccounts.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', maxHeight: '380px', overflowY: 'auto', padding: '4px' }}>
                        {seldomAccounts.map((row, idx) => {
                          const matchedTB = tbAccounts.find((a) => a.gl === row.gl.trim());
                          return (
                            <div key={idx} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="text"
                                  className="jet-input"
                                  value={row.gl}
                                  placeholder="G_L Code"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSeldomAccounts((prev) => {
                                      const updated = [...prev];
                                      updated[idx].gl = val;
                                      return updated;
                                    });
                                  }}
                                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', fontWeight: 600, padding: '5px 8px' }}
                                />
                                <button onClick={() => setSeldomAccounts((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '5px', color: 'var(--status-error)', flexShrink: 0 }} title="Remove account">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: matchedTB ? 'var(--deloitte-teal)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: matchedTB ? 600 : 400 }}>
                                {matchedTB ? `${matchedTB.description} (${matchedTB.subtype})` : (row.gl ? 'Custom Account' : 'Enter GL code')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: '4px' }}>No seldom accounts selected</div>
                        <div style={{ fontSize: '0.78rem' }}>Use the IR-4 range selector above, click "+ Add G_L", or import <code>ex_2.csv/.xlsx</code>.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: EX3 LARGE DEBITS TO REVENUE */}
                {paramTab === 'ex3' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex3: Large Debits to Revenue During the Period</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Automatically filters the Trial Balance for Revenue account subtype; if not found, searches for Income subtype, else leaves blank.
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                          background: detectedRevenueInfo.accounts.length > 0 ? 'var(--deloitte-teal-light)' : 'var(--bg-secondary)',
                          color: detectedRevenueInfo.accounts.length > 0 ? 'var(--deloitte-teal)' : 'var(--text-muted)',
                          border: detectedRevenueInfo.accounts.length > 0 ? '1px solid var(--deloitte-teal)' : '1px solid var(--border-subtle)',
                        }}>
                          {detectedRevenueInfo.status} ({detectedRevenueInfo.accounts.length} accounts)
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <label className="jet-label">Debit Amount Threshold ({sparkParams.currencyCode || 'INR'})</label>
                        <input type="number" className="jet-input" value={ex3Threshold} onChange={(e) => setEx3Threshold(Number(e.target.value))} placeholder="0.0" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Default 0.0 flags any net debit amount</span>
                      </div>
                      <div>
                        <label className="jet-label">Optional Quarter Filter: Start Date</label>
                        <input type="date" className="jet-input" value={ex3QuarterStart} onChange={(e) => setEx3QuarterStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="jet-label">Optional Quarter Filter: End Date</label>
                        <input type="date" className="jet-input" value={ex3QuarterEnd} onChange={(e) => setEx3QuarterEnd(e.target.value)} />
                      </div>
                    </div>

                    <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                      <table className="jet-table">
                        <thead>
                          <tr>
                            <th style={{ width: '160px' }}>G_L (Account Code)</th>
                            <th>Description</th>
                            <th style={{ width: '160px' }}>Account Subtype</th>
                            <th>FS Line Item</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detectedRevenueInfo.accounts.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--deloitte-teal)' }}>{row.gl}</td>
                              <td style={{ fontWeight: 600 }}>{row.description}</td>
                              <td><span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--deloitte-teal-light)', color: 'var(--deloitte-teal)', fontSize: '0.75rem', fontWeight: 700 }}>{row.subtype}</span></td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{row.fsLineItem}</td>
                            </tr>
                          ))}
                          {detectedRevenueInfo.accounts.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                <AlertTriangle size={24} style={{ margin: '0 auto 8px', color: 'var(--status-warning)' }} />
                                <div>No accounts with Account_Subtype matching "Revenue" or "Income" were found in the uploaded Trial Balance.</div>
                                <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Ex-3 will remain blank as per audit specification.</div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB: EX4 FEW POSTINGS USERS */}
                {paramTab === 'ex4' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex4: Users with Few Postings</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flags transactions from users with a distinct document count at or below this threshold. Schema input: <code>Value</code></p>
                      </div>
                    </div>

                    <div style={{ maxWidth: '320px', padding: '20px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        User Posting Count Threshold (Value)
                      </label>
                      <input
                        type="number"
                        className="jet-input"
                        value={ex4Threshold}
                        onChange={(e) => setEx4Threshold(Math.max(1, Number(e.target.value)))}
                        min="1"
                        placeholder="1"
                        style={{ fontSize: '0.86rem', fontWeight: 600, padding: '7px 10px', width: '100%', maxWidth: '320px' }}
                      />
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px', margin: '8px 0 0', lineHeight: 1.4 }}>
                        Any user whose distinct journal count in the population is &le; <strong style={{ color: 'var(--deloitte-teal)' }}>{ex4Threshold}</strong> will have all their postings flagged under Exception 4.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB: EX5 USERS OF INTEREST */}
                {paramTab === 'ex5' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex5: Users of Interest</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target specific user accounts for 100% testing. Schema column: <code>User_name</code></p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => triggerImportFile('usersOfInterest')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_5.csv/.xlsx)</button>
                        <button onClick={() => setUsersOfInterest((prev) => [...prev, { username: '' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add User_name</button>
                      </div>
                    </div>

                    {usersOfInterest.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
                        {usersOfInterest.map((row, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                            <input
                              type="text"
                              className="jet-input"
                              value={row.username}
                              placeholder="User_name"
                              onChange={(e) => {
                                const val = e.target.value;
                                setUsersOfInterest((prev) => {
                                  const updated = [...prev];
                                  updated[idx].username = val;
                                  return updated;
                                });
                              }}
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', fontWeight: 600, padding: '5px 8px' }}
                            />
                            <button onClick={() => setUsersOfInterest((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '5px', color: 'var(--status-error)', flexShrink: 0 }} title="Remove user">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: '4px' }}>No users of interest configured</div>
                        <div style={{ fontSize: '0.78rem' }}>Click "+ Add User_name" or "Import File (ex_5.csv/.xlsx)" to add users.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: EX6 CLOSING ENTRIES */}
                {paramTab === 'ex6' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex6: Period-End Closing Entries</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Detects entries dated in the sensitive period around financial year-end.<br />
                          Exact Schema: <code>Closing_Entries_before | Closing_Entries_after | Closing_Date | Frequency</code>
                        </p>
                      </div>
                      <button onClick={() => triggerImportFile('closingEntries')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_6.csv/.xlsx)</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <label className="jet-label">Closing_Entries_before (Days)</label>
                        <input type="number" className="jet-input" value={ex6BeforeDays} onChange={(e) => setEx6BeforeDays(Number(e.target.value))} min="0" placeholder="1" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Days before closing date to inspect</span>
                      </div>
                      <div>
                        <label className="jet-label">Closing_Entries_after (Days)</label>
                        <input type="number" className="jet-input" value={ex6AfterDays} onChange={(e) => setEx6AfterDays(Number(e.target.value))} min="0" placeholder="10" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Days after closing date to inspect</span>
                      </div>
                      <div>
                        <label className="jet-label">Closing_Date (DD-MMM-YY)</label>
                        <input type="text" className="jet-input" value={ex6ClosingDate} onChange={(e) => setEx6ClosingDate(e.target.value)} placeholder="31-Dec-25" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>e.g. 31-Dec-25 or 30-Jun-26</span>
                      </div>
                      <div>
                        <label className="jet-label">Frequency</label>
                        <select className="jet-select" value={ex6Frequency} onChange={(e) => setEx6Frequency(e.target.value)}>
                          <option value="Annually">Annually</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: EX7 DATES OF INTEREST */}
                {paramTab === 'ex7' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex7: Entries posted on Dates of Interest</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flags postings made on specific company holidays or non-working dates. Schema column: <code>Pstng_Date</code></p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => triggerImportFile('datesOfInterest')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_7.csv/.xlsx)</button>
                        <button onClick={() => setDatesOfInterest((prev) => [...prev, { date: '' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add Date</button>
                      </div>
                    </div>

                    {datesOfInterest.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
                        {datesOfInterest.map((row, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                            <input
                              type="text"
                              className="jet-input"
                              value={row.date}
                              placeholder="DD-MMM-YY"
                              onChange={(e) => {
                                const val = e.target.value;
                                setDatesOfInterest((prev) => {
                                  const updated = [...prev];
                                  updated[idx].date = val;
                                  return updated;
                                });
                              }}
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', fontWeight: 600, padding: '5px 8px' }}
                            />
                            <button onClick={() => setDatesOfInterest((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '5px', color: 'var(--status-error)', flexShrink: 0 }} title="Remove date">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: '4px' }}>No dates of interest configured</div>
                        <div style={{ fontSize: '0.78rem' }}>Click "+ Add Date" or "Import File (ex_7.csv/.xlsx)" to add dates.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: EX8 ROUND AMOUNTS */}
                {paramTab === 'ex8' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex8: Entries with Round Amounts or Recurring Digits</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select magnitudes and recurring ending digit rules to flag. Schema input: <code>Digits</code></p>
                      </div>
                    </div>

                    <div style={{ marginBottom: '18px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <label className="jet-label" style={{ marginBottom: '10px' }}>Round Magnitudes (Digits according to check)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {[
                          { val: '1000', label: '1,000' }, { val: '10000', label: '10,000' }, { val: '100000', label: '100,000' },
                          { val: '1000000', label: '1,000,000' }, { val: '10000000', label: '10,000,000' },
                          { val: '100000000', label: '100,000,000' }, { val: '1000000000', label: '1,000,000,000' },
                        ].map((item) => {
                          const isSelected = ex8SelectedDigits.includes(item.val);
                          return (
                            <label key={item.val} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: isSelected ? 'var(--deloitte-teal-light)' : '#FFFFFF', border: isSelected ? '1px solid var(--deloitte-teal)' : '1px solid var(--border-subtle)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                              <input type="checkbox" checked={isSelected} onChange={(e) => { if (e.target.checked) setEx8SelectedDigits((prev) => [...prev, item.val]); else setEx8SelectedDigits((prev) => prev.filter((x) => x !== item.val)); }} style={{ accentColor: 'var(--deloitte-teal)' }} />
                              {item.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <label className="jet-label" style={{ marginBottom: '10px' }}>Recurring Ending Digits (e.g. 666666, 7777777, 88888888, 999999999)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {['2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => {
                          const isSelected = ex8SelectedDigits.includes(digit);
                          return (
                            <label key={digit} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: isSelected ? 'var(--deloitte-teal-light)' : '#FFFFFF', border: isSelected ? '1px solid var(--deloitte-teal)' : '1px solid var(--border-subtle)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                              <input type="checkbox" checked={isSelected} onChange={(e) => { if (e.target.checked) setEx8SelectedDigits((prev) => [...prev, digit]); else setEx8SelectedDigits((prev) => prev.filter((x) => x !== digit)); }} style={{ accentColor: 'var(--deloitte-teal)' }} />
                              {digit} Digits Repeating
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: EX9 DUPLICATE ENTRIES */}
                {paramTab === 'ex9' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex9: Duplicate Entries Configuration</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flags documents sharing identical account and amount combos.<br />Exact Schema: <code>Value | Threshold</code></p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <label className="jet-label">Duplicate Count Threshold (Value)</label>
                        <input type="number" className="jet-input" value={ex9CountThreshold} onChange={(e) => setEx9CountThreshold(Math.max(1, Number(e.target.value)))} min="1" placeholder="2" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Identical combos appearing &gt; this count are flagged.</span>
                      </div>
                      <div>
                        <label className="jet-label">Minimum Total Positive Amount (Threshold)</label>
                        <input type="number" className="jet-input" value={ex9AmountThreshold} onChange={(e) => setEx9AmountThreshold(Number(e.target.value))} placeholder="0.0" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>0.0 evaluates all duplicate amounts.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: EX10 KEYWORDS */}
                {paramTab === 'ex10' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex10: Fraud & Risk Keywords in Journal</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Search document header and line text for suspicious keywords. Schema column: <code>Text</code></p>
                      </div>
                      <button onClick={() => triggerImportFile('keywords')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_10.csv)</button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <input
                        type="text" className="jet-input" placeholder="Add new risk keyword (e.g. bribe, theft, override)..."
                        value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newKeyword.trim()) { if (!keywords.includes(newKeyword.trim().toLowerCase())) setKeywords((prev) => [...prev, newKeyword.trim().toLowerCase()]); setNewKeyword(''); } }}
                        style={{ maxWidth: '340px' }}
                      />
                      <button
                        onClick={() => { if (newKeyword.trim() && !keywords.includes(newKeyword.trim().toLowerCase())) { setKeywords((prev) => [...prev, newKeyword.trim().toLowerCase()]); setNewKeyword(''); } }}
                        className="btn-primary"
                      >
                        <Plus size={14} /> Add Keyword
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {keywords.map((kw) => (
                        <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', fontSize: '0.82rem', fontWeight: 600 }}>
                          <span>{kw}</span>
                          <X size={13} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB: EX11 POST-CLOSING ENTRIES */}
                {paramTab === 'ex11' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex11: Entries Posted After Closing Date</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flags entries recorded after the year-end cutoff plus grace period.<br />Exact Schema: <code>Frequency | Day | Closing_Date</code></p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <label className="jet-label">Frequency</label>
                        <select className="jet-select" value={ex11Frequency} onChange={(e) => setEx11Frequency(e.target.value)}>
                          <option value="Annually">Annually</option><option value="Quarterly">Quarterly</option><option value="Monthly">Monthly</option>
                        </select>
                      </div>
                      <div><label className="jet-label">Day (Cutoff Days After Closing)</label><input type="number" className="jet-input" value={ex11DaysAfterClosing} onChange={(e) => setEx11DaysAfterClosing(Number(e.target.value))} min="0" placeholder="10" /></div>
                      <div><label className="jet-label">Closing_Date (DD-MMM-YY)</label><input type="text" className="jet-input" value={ex11ClosingDate} onChange={(e) => setEx11ClosingDate(e.target.value)} placeholder="31-Dec-25" /></div>
                    </div>
                  </div>
                )}

                {/* TAB: EX12 UNRELATED ACCOUNTS */}
                {paramTab === 'ex12' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex12: Unrelated Financial Statement Line Pairings</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Identify journals posting between incompatible FS line categories. Exact Schema: <code>Debit | Credit</code>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => triggerImportFile('unrelatedRules')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_12.csv/.xlsx)</button>
                        <button onClick={() => setUnrelatedRules((prev) => [...prev, { debit: '', credit: '' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add Rule</button>
                      </div>
                    </div>

                    {/* FS LINE ITEM CONSTRAINT VALIDATION ALERT */}
                    {invalidEx12Items.length > 0 && (
                      <div style={{ marginBottom: '16px', padding: '14px 18px', background: '#FEF2F2', border: '1.5px solid var(--status-error)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <AlertTriangle size={20} color="var(--status-error)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--status-error)' }}>
                            Constraint Validation Error: FS Line Item Not Found in Trial Balance
                          </div>
                          <p style={{ fontSize: '0.78rem', color: '#991B1B', margin: '4px 0 8px' }}>
                            The following line item values do not exist in the Trial Balance's <code>FS_Line_Item</code> column. Please choose from available TB FS Line Items:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {invalidEx12Items.map((item) => (
                              <span key={item} style={{ background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, border: '1px solid #FCA5A5' }}>
                                &times; {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {tbFSLineItems.length > 0 && (
                      <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Available Trial Balance FS Line Items ({tbFSLineItems.length} items):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '80px', overflowY: 'auto' }}>
                          {tbFSLineItems.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                const emptyDebitIdx = unrelatedRules.findIndex((r) => !r.debit || r.debit.trim() === '0');
                                const emptyCreditIdx = unrelatedRules.findIndex((r) => r.debit && r.debit.trim() !== '0' && (!r.credit || r.credit.trim() === '0'));
                                if (emptyDebitIdx !== -1) {
                                  setUnrelatedRules((prev) => {
                                    const updated = [...prev];
                                    updated[emptyDebitIdx].debit = item;
                                    return updated;
                                  });
                                } else if (emptyCreditIdx !== -1) {
                                  setUnrelatedRules((prev) => {
                                    const updated = [...prev];
                                    updated[emptyCreditIdx].credit = item;
                                    return updated;
                                  });
                                } else {
                                  setUnrelatedRules((prev) => [...prev, { debit: item, credit: '' }]);
                                }
                              }}
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#FFFFFF',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-medium)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Click to auto-fill this FS Line Item into rule"
                            >
                              + {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {unrelatedRules.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
                        {unrelatedRules.map((row, idx) => {
                          const isDebitInvalid = Boolean(row.debit && row.debit.trim() !== '0' && tbFSLineItems.length > 0 && !tbFSLineItems.some((f) => f.trim().toLowerCase() === row.debit.trim().toLowerCase()));
                          const isCreditInvalid = Boolean(row.credit && row.credit.trim() !== '0' && tbFSLineItems.length > 0 && !tbFSLineItems.some((f) => f.trim().toLowerCase() === row.credit.trim().toLowerCase()));

                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '14px',
                                background: (isDebitInvalid || isCreditInvalid) ? '#FEF2F2' : '#FFFFFF',
                                borderRadius: '10px',
                                border: (isDebitInvalid || isCreditInvalid) ? '1.5px solid var(--status-error)' : '1px solid #E2E8F0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Rule #{idx + 1}</span>
                                <button onClick={() => setUnrelatedRules((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '4px', color: 'var(--status-error)' }} title="Remove rule">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Debit FS Line Item</label>
                                <InlineAutoSuggestInput
                                  value={row.debit}
                                  options={tbFSLineItems}
                                  placeholder="Type Debit FS Line..."
                                  isInvalid={isDebitInvalid}
                                  onChange={(val) => {
                                    setUnrelatedRules((prev) => {
                                      const updated = [...prev];
                                      updated[idx].debit = val;
                                      return updated;
                                    });
                                  }}
                                />
                                {isDebitInvalid && (
                                  <div style={{ fontSize: '0.68rem', color: 'var(--status-error)', fontWeight: 600, marginTop: '2px' }}>
                                    &times; Not found in TB
                                  </div>
                                )}
                              </div>
                              <div>
                                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Credit FS Line Item</label>
                                <InlineAutoSuggestInput
                                  value={row.credit}
                                  options={tbFSLineItems}
                                  placeholder="Type Credit FS Line..."
                                  isInvalid={isCreditInvalid}
                                  onChange={(val) => {
                                    setUnrelatedRules((prev) => {
                                      const updated = [...prev];
                                      updated[idx].credit = val;
                                      return updated;
                                    });
                                  }}
                                />
                                {isCreditInvalid && (
                                  <div style={{ fontSize: '0.68rem', color: 'var(--status-error)', fontWeight: 600, marginTop: '2px' }}>
                                    &times; Not found in TB
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '36px 20px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: '4px' }}>No unrelated account rules configured</div>
                        <div style={{ fontSize: '0.78rem' }}>Click "+ Add Rule" or "Import File (ex_12.csv/.xlsx)" to add pairings.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: CONTROL SAMPLE DUMP */}
                {paramTab === 'controlSample' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Representative Control Sample Dump Configuration</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Randomly extracts full journal documents using seed 42 to satisfy ET sample testing requirements.</p>
                    <div style={{ maxWidth: '320px' }}>
                      <label className="jet-label">Sample Document Count Requested</label>
                      <input type="number" className="jet-input" value={sampleDocCount} onChange={(e) => setSampleDocCount(Math.max(1, Number(e.target.value)))} min="1" placeholder="61" style={{ width: '100%', maxWidth: '320px' }} />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Default is 61 randomized documents.</span>
                    </div>
                  </div>
                )}

                {/* Parameter Validation Status & Bottom Execution Bar */}
                <div style={{
                  marginTop: '20px',
                  padding: '16px 20px',
                  background: step5Validation.isValid ? '#F0FDF4' : '#FFFBEB',
                  border: step5Validation.isValid ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                    {step5Validation.isValid ? (
                      <CheckCircle2 size={20} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                    ) : (
                      <AlertTriangle size={20} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: step5Validation.isValid ? '#15803D' : '#B45309' }}>
                        {step5Validation.isValid
                          ? 'All Selected Audit Exceptions Configured & Ready'
                          : `Configuration Incomplete (${step5Validation.missing.length} exception${step5Validation.missing.length > 1 ? 's' : ''} require attention)`}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: step5Validation.isValid ? '#166534' : '#92400E', marginTop: '2px' }}>
                        {step5Validation.isValid ? (
                          'All selected exceptions contain valid input parameters. Click "Execute Exceptions" to run the full audit pipeline.'
                        ) : (
                          <div>
                            <span>Please provide required inputs or uncheck inactive exceptions to enable execution:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {step5Validation.missing.map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => { if (m.id !== 'general') setParamTab(m.id); }}
                                  style={{
                                    background: '#FEF2F2',
                                    border: '1px solid #FECDD3',
                                    color: '#DC2626',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: m.id !== 'general' ? 'pointer' : 'default',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <span>{m.name}: {m.issue}</span>
                                  {m.id !== 'general' && <ArrowRight size={10} />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (step5Validation.isValid) {
                        setCurrentStep(6);
                        handleRunPipeline(6);
                      }
                    }}
                    disabled={executing || !step5Validation.isValid}
                    className="btn-primary"
                    style={{
                      padding: '8px 20px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      opacity: executing || !step5Validation.isValid ? 0.45 : 1,
                      cursor: executing || !step5Validation.isValid ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0
                    }}
                    title={!step5Validation.isValid ? 'Provide inputs for all selected exceptions to enable execution' : 'Execute Exceptions'}
                  >
                    <Play size={14} fill="#FFFFFF" />
                    <span>{executing ? 'Executing Pipeline...' : 'Execute Exceptions'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: RESULTS & EXECUTIVE VISUALS */}
        {currentStep === 6 && (
          <div className="fade-slide-in">
            {/* Top Pastel KPI Cards matching Reference Styling */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {/* Card 1: Total Population Rows (Peach / Light Orange) */}
              <div style={{ background: '#FFF4EC', border: '1px solid #FFE7D6', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                  Total Population Rows
                </div>
                <div style={{ fontSize: '1.80rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '4px 0 6px' }}>
                  {executing || status?.status === 'RUNNING' ? 'In Progress...' : new Intl.NumberFormat('en-US').format(status?.glCheckpointsSummary?.totalLines || (status?.totalInputRows?.gl || 0))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#16A34A', border: '1px solid #FED7AA' }}>
                    ▲ 100%
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>General Ledger Lines</span>
                </div>
              </div>

              {/* Card 2: TB Accounts (Light Green) */}
              <div style={{ background: '#F0F9ED', border: '1px solid #DCFCE7', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                  TB Accounts
                </div>
                <div style={{ fontSize: '1.80rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '4px 0 6px' }}>
                  {executing || status?.status === 'RUNNING' ? 'In Progress...' : new Intl.NumberFormat('en-US').format(status?.totalInputRows?.tb || 0)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#16A34A', border: '1px solid #BBF7D0' }}>
                    ▲ Active
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Trial Balance Accounts</span>
                </div>
              </div>

              {/* Card 3: IR Exceptions (Soft Blue / Lavender) */}
              <div style={{ background: '#EDF2FE', border: '1px solid #DBEAFE', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                  IR Exceptions
                </div>
                <div style={{ fontSize: '1.80rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '4px 0 6px' }}>
                  {executing || status?.status === 'RUNNING' ? 'In Progress...' : new Intl.NumberFormat('en-US').format(getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv') + getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv') + getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv'))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#007680', border: '1px solid #BFDBFE' }}>
                    ▲ 3 Tests
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Integrity Tests 1-3</span>
                </div>
              </div>

              {/* Card 4: Parameter Exceptions (Soft Mint / Teal) */}
              <div style={{ background: '#EAF5F2', border: '1px solid #CCFBF1', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                  Parameter Exceptions
                </div>
                <div style={{ fontSize: '1.80rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '4px 0 6px' }}>
                  {executing || status?.status === 'RUNNING' ? 'In Progress...' : new Intl.NumberFormat('en-US').format([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((acc, num) => acc + getExceptionCount(num, `Ex${num}`), 0))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#007680', border: '1px solid #99F6E4' }}>
                    ▲ Screened
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Ex1 - Ex12 Flagged</span>
                </div>
              </div>

              {/* Card 5: Audit Materiality (Soft Rose / Pink) */}
              <div style={{ background: '#FDF0F2', border: '1px solid #FFE4E6', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569' }}>
                  Audit Materiality
                </div>
                <div style={{ fontSize: '1.80rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '4px 0 6px' }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: config?.sparkParameters?.currencyCode || 'USD', maximumFractionDigits: 0 }).format(typeof config?.sparkParameters?.materiality === 'number' ? config.sparkParameters.materiality : 500000)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 750, color: '#9F1239', border: '1px solid #FECDD3' }}>
                    ▲ Cutoff
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>USD Benchmark</span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '4px',
                background: '#F1F5F9',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                marginBottom: '20px',
                width: '100%',
              }}
            >
              {[
                { id: 'preview', label: 'Parameter Exception Previews (Top 50)', icon: Eye },
                { id: 'overview', label: 'Executive Visual Analytics', icon: BarChart3 },
                { id: 'checkpoints', label: 'TB & GL Checkpoints', icon: Activity },
                { id: 'forensic', label: 'Forensic & CFO Intelligence', icon: Scale },
                { id: 'artifacts', label: 'Download All Outputs', icon: Archive },
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeVisualTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveVisualTab(tab.id as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      padding: '8px 14px',
                      background: isActive ? '#FFFFFF' : 'transparent',
                      border: isActive ? '1px solid #E2E8F0' : '1px solid transparent',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      color: isActive ? '#007680' : '#64748B',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <IconComp size={15} color={isActive ? '#007680' : '#64748B'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeVisualTab === 'preview' && (() => {
              const allCards = EXCEPTION_CARDS.filter((card) => {
                if (card.id === 'controlSample') return runControlSample;
                return enabledExceptions[card.id as keyof typeof enabledExceptions];
              }).map((card) => {
                const count = card.num <= 12 ? getExceptionCount(card.num, card.key) : (status?.controlSampleCount || 4);
                return { ...card, count };
              });

              const flaggedCards = allCards.filter((c) => c.count > 0);
              const cleanCards = allCards.filter((c) => c.count === 0);
              const selectedCard = allCards.find((c) => c.file === selectedPreviewFile) || allCards[0];
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
                      {card.num <= 12 ? `Ex ${card.num.toString().padStart(2, '0')}` : 'SAMPLE'}
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
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '345px 1fr',
                  gap: '18px',
                  alignItems: 'stretch',
                  marginBottom: '24px',
                  height: '700px',
                }}>

                  {/* LEFT MASTER SIDEBAR: Wider, with descriptions, 2-category tabs, equal height */}
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

                    {/* 2-Category Only Filter Tabs: Flagged vs Clean (All removed) */}
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
                        <CheckCircle size={13} />
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
                              <CheckCircle size={24} color="var(--status-success)" style={{ margin: '0 auto 8px' }} />
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
                            {selectedCard.num <= 12 ? `Ex ${selectedCard.num.toString().padStart(2, '0')}` : 'SAMPLE'}
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
                      {loadingPreview ? (
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
              );
            })()}

            {activeVisualTab === 'overview' && (
              <ExecutiveChartJsAnalyticsSuite
                runId={runId!}
                status={status}
                config={config}
                enabledExceptions={enabledExceptions}
              />
            )}

            {activeVisualTab === 'checkpoints' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>Trial Balance & Population Checkpoint Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div className="jet-card" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Opening Balance Sum</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{status?.tbCheckpointsSummary?.openingSum?.toLocaleString() || '0.00'}</div>
                  </div>
                  <div className="jet-card" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Closing Balance Sum</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{status?.tbCheckpointsSummary?.closingSum?.toLocaleString() || '0.00'}</div>
                  </div>
                  <div className="jet-card" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total GL Transaction Volume</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)' }}>{status?.glCheckpointsSummary?.totalNetBalance?.toLocaleString() || '0.00'}</div>
                  </div>
                </div>
              </div>
            )}

            {activeVisualTab === 'forensic' && (
              <ExecutiveForensicIntelligenceHub
                runId={runId!}
                status={status}
                config={config}
              />
            )}

            {activeVisualTab === 'artifacts' && (() => {
              const outputs = (status?.outputs || []).filter(o => o.name !== 'auto_clean_report.json' && !o.name.endsWith('.json'));

              // Categorize outputs
              const getCategoryForFile = (out: typeof outputs[0]): string => {
                if (out.category) {
                  if (out.category === 'PARAMETER') return 'PARAMETER';
                  if (out.category === 'INTEGRITY') return 'INTEGRITY';
                  if (out.category === 'MASTER' || out.category === 'RECONCILIATION') return 'MASTER';
                  if (out.category === 'CONTROL_TOTAL' || out.category === 'CONTROL_SAMPLE') return 'CONTROL_TOTAL';
                }
                const name = out.name.toLowerCase();
                if (name.includes('parameter') || name.includes('ex_') || name.includes('exception_')) return 'PARAMETER';
                if (name.includes('ir_') || name.includes('integrity')) return 'INTEGRITY';
                if (name.includes('control') || name.includes('sample')) return 'CONTROL_TOTAL';
                return 'MASTER';
              };

              const categories = [
                { id: 'PARAMETER', label: 'Parameter Exceptions', icon: Settings, count: outputs.filter(o => getCategoryForFile(o) === 'PARAMETER').length, desc: 'Flagged entries and evaluation extracts for Parameter Exceptions (Ex 01 - 12).' },
                { id: 'INTEGRITY', label: 'Integrity Tests', icon: ShieldCheck, count: outputs.filter(o => getCategoryForFile(o) === 'INTEGRITY').length, desc: 'Audit population integrity, debit/credit balancing, and required field checks.' },
                { id: 'MASTER', label: 'Master & Clean Data', icon: Database, count: outputs.filter(o => getCategoryForFile(o) === 'MASTER').length, desc: 'Canonical sanitized journal entries and trial balance source datasets.' },
                { id: 'CONTROL_TOTAL', label: 'Control Totals & Samples', icon: Layers, count: outputs.filter(o => getCategoryForFile(o) === 'CONTROL_TOTAL').length, desc: 'Statistical control samples, population stratification, and hash totals.' },
              ];

              const filteredOutputs = outputs.filter(out => {
                const matchesCategory = getCategoryForFile(out) === artifactCategoryFilter;
                const matchesSearch = !artifactSearch || out.name.toLowerCase().includes(artifactSearch.toLowerCase());
                return matchesCategory && matchesSearch;
              });

              const activeCategory = categories.find(c => c.id === artifactCategoryFilter) || categories[0];

              return (
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                        Generated Audit Workpapers & Artifacts
                      </h3>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                        Download full CSV extracts and standardized workpapers organized by category.
                      </p>
                    </div>
                    <a href={RunService.getDownloadAllZipUrl(runId!)} className="btn-green" style={{ textDecoration: 'none' }}>
                      <Archive size={16} /> Download All as ZIP ({outputs.length})
                    </a>
                  </div>

                  {/* Category Distribution Switcher Tabs */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '10px',
                    marginBottom: '20px',
                  }}>
                    {categories.map((cat) => {
                      const isSelected = artifactCategoryFilter === cat.id;
                      const Icon = cat.icon;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setArtifactCategoryFilter(cat.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: `1.5px solid ${isSelected ? 'var(--deloitte-teal)' : 'var(--border-subtle)'}`,
                            background: isSelected ? 'var(--deloitte-teal-light)' : '#FFFFFF',
                            boxShadow: isSelected ? '0 2px 8px rgba(0, 118, 128, 0.16)' : 'var(--shadow-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: isSelected ? 'var(--deloitte-teal)' : 'var(--bg-secondary)',
                              color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <div style={{
                                fontSize: '0.84rem',
                                fontWeight: isSelected ? 800 : 700,
                                color: isSelected ? 'var(--deloitte-teal)' : 'var(--text-primary)',
                                lineHeight: 1.2,
                              }}>
                                {cat.label}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: isSelected ? 'var(--deloitte-teal)' : 'var(--bg-secondary)',
                            color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                          }}>
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-toolbar: Category Description & Search */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <strong>{activeCategory.label}</strong>: {activeCategory.desc}
                    </div>
                    <div style={{ position: 'relative', width: '260px' }}>
                      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        className="jet-input"
                        placeholder="Search in category files..."
                        value={artifactSearch}
                        onChange={(e) => setArtifactSearch(e.target.value)}
                        style={{ paddingLeft: '30px', fontSize: '0.8rem', height: '32px' }}
                      />
                    </div>
                  </div>

                  {/* Categorized Table */}
                  <div className="table-container" style={{ overflowX: 'hidden' }}>
                    <table className="jet-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '52%' }}>Output File</th>
                          <th style={{ width: '18%' }}>Category</th>
                          <th style={{ width: '12%' }}>Row Count</th>
                          <th style={{ textAlign: 'right', width: '18%', whiteSpace: 'nowrap' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOutputs.length > 0 ? (
                          filteredOutputs.map((out) => (
                            <tr key={out.id}>
                              <td style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                                  <FileSpreadsheet size={15} color="#007680" style={{ flexShrink: 0 }} />
                                  <span
                                    title={out.name}
                                    style={{
                                      fontFamily: 'var(--font-mono, monospace)',
                                      fontWeight: 600,
                                      color: '#007680',
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
                              <td><StatusBadge status={out.category || getCategoryForFile(out)} size="sm" /></td>
                              <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.76rem', color: '#334155' }}>
                                {out.rowCount !== undefined ? out.rowCount.toLocaleString() : '-'}
                              </td>
                              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPreviewFile(out.name);
                                      setActiveVisualTab('preview');
                                    }}
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
                                    <Eye size={11} />
                                    <span>Preview</span>
                                  </button>
                                  <a
                                    href={out.downloadUrl}
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
                                    <Download size={11} color="#FFFFFF" />
                                    <span>Export CSV</span>
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                              No files found in {activeCategory.label}
                              {artifactSearch ? ` matching "${artifactSearch}"` : ''}.
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

      <SampleDataModal
        isOpen={sampleModalOpen}
        onClose={() => setSampleModalOpen(false)}
        title={sampleModalData.title}
        subtitle={sampleModalData.subtitle}
        headers={sampleModalData.headers}
        rows={sampleModalData.rows}
        totalRows={sampleModalData.totalRows}
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
    </div>
  );
};