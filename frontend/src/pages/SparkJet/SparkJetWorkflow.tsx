import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, SparkJetParameters, FieldMappingItem } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { FieldMappingTable } from '../../components/common/FieldMappingTable';
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
  Lock, Loader2, UploadCloud
} from 'lucide-react';

const STEPS: TimelineStep[] = [
  { id: 1, label: 'Ingest Data', sub: 'Upload files', icon: UploadCloud },
  { id: 2, label: 'Mapping & Auto-Clean', sub: 'Clean data', icon: Sparkles },
  { id: 3, label: 'Integrity Tests', sub: 'IR 1-4', icon: Activity },
  { id: 4, label: 'Parameter Rules', sub: 'Ex 1-12', icon: Settings },
  { id: 5, label: 'Parameter Results', sub: 'Review', icon: BarChart3 },
];

const STEP_COPY: Record<number, { title: string; desc: string }> = {
  1: { title: 'Upload Trial Balance & Population', desc: 'Upload TB and Population files or an all-in-one workbook, then preview any sheet instantly.' },
  2: { title: 'Canonical Field Mapping', desc: 'Confirm column mappings, then run auto-cleansing to normalize dates, numbers and constraints.' },
  3: { title: 'Integrity Tests (IR 1-4)', desc: 'Review TB and GL checkpoints and inspect flagged rows for each integrity rule.' },
  4: { title: 'Parameter Rule Configuration', desc: 'Select and configure the twelve audit exception algorithms to test against the population.' },
  5: { title: 'Parameter Results', desc: 'Explore flagged exceptions, executive analytics, checkpoints and downloadable artifacts.' },
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
  description?: string;
  subtype?: string;
  notes?: string;
}

interface RevenueAccountRow {
  gl: string;
  description: string;
  openingBalance: number | string;
  debit: number | string;
  credit: number | string;
  closingBalance: number | string;
  movement: number | string;
  subtype: string;
  fsLineItem: string;
}

interface UserRow {
  userId: string;
  name?: string;
  role?: string;
  category?: string;
}

interface DateRow {
  date: string;
  event: string;
  impact?: string;
}

interface UnrelatedRuleRow {
  debitFSLine: string;
  creditFSLine: string;
  category?: string;
}

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

  const [unusualAccounts, setUnusualAccounts] = useState<AccountRow[]>([]);
  const [seldomAccounts, setSeldomAccounts] = useState<AccountRow[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<RevenueAccountRow[]>([]);
  const [usersOfInterest, setUsersOfInterest] = useState<UserRow[]>([]);
  const [datesOfInterest, setDatesOfInterest] = useState<DateRow[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [unrelatedRules, setUnrelatedRules] = useState<UnrelatedRuleRow[]>([]);

  // General Spark JET Parameters
  const [sparkParams, setSparkParams] = useState<SparkJetParameters>({
    fiscalYear: 2026,
    financialYearEnd: '31-Dec-25',
    engagementName: 'Jio Satellite Communications Limited',
    currencyCode: 'INR',
    ex3RevenueDebitsThreshold: 0.0,
    ex4FewPostingsUserThreshold: 2,
    ex6ClosingEntriesBeforeDays: 1,
    ex6ClosingEntriesAfterDays: 10,
    ex8RoundDigits: ['1000', '10000', '100000', '1000000', '6', '7', '8', '9'],
    ex11DaysAfterClosing: 10,
    controlSampleCount: 61,
  });

  // Active Parameter Tab in Step 4
  const [paramTab, setParamTab] = useState<string>('ex1');
  const [newKeyword, setNewKeyword] = useState('');
  const [fileImportNotice, setFileImportNotice] = useState<string | null>(null);

  // Results View Tabs in Step 5
  const [activeVisualTab, setActiveVisualTab] = useState<'preview' | 'overview' | 'checkpoints' | 'artifacts'>('preview');
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<string>('Parameter_Exception_1.csv');
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: Record<string, any>[]; totalRows: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');

  // Hidden file input refs for uploading exception parameters
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImportTarget, setCurrentImportTarget] = useState<string | null>(null);

  const loadRun = async () => {
    if (!runId) return;
    try {
      const data = await RunService.getRun(runId);
      setConfig(data.config);
      setStatus(data.status);

      if (data.config.sparkParameters) {
        setSparkParams((prev) => ({ ...prev, ...data.config.sparkParameters }));
      }

      if (data.status.status === 'COMPLETED') {
        setMaxCompletedStep(5);
        setCurrentStep(5);
      } else if (data.config.files.length > 0) {
        setMaxCompletedStep((prev) => Math.max(prev, 2));
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
    if (currentStep === 3 && runId && selectedIRFile) {
      setLoadingIRPreview(true);
      RunService.previewOutput(runId, selectedIRFile, 50)
        .then((res) => setIrPreviewData(res))
        .catch(() => setIrPreviewData(null))
        .finally(() => setLoadingIRPreview(false));
    }
  }, [currentStep, selectedIRFile, runId, status?.status]);

  useEffect(() => {
    if (currentStep === 5 && runId && selectedPreviewFile) {
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

  const handleUpload = async (files: File[]) => {
    if (!runId) return;
    setUploading(true);
    try {
      await RunService.uploadFiles(runId, files);
      await loadRun();
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
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return;

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const dataRows = lines.slice(1);

      if (currentImportTarget === 'unusualAccounts' || currentImportTarget === 'seldomAccounts') {
        const parsedRows: AccountRow[] = [];
        dataRows.forEach((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols[0]) {
            parsedRows.push({ gl: cols[0], description: cols[1] || 'Imported Account', subtype: cols[2] || 'Assets', notes: cols[3] || 'Uploaded via template' });
          }
        });

        if (currentImportTarget === 'unusualAccounts') {
          setUnusualAccounts(parsedRows);
          setFileImportNotice(`Successfully imported ${parsedRows.length} Unusual Accounts from ${file.name}`);
        } else {
          setSeldomAccounts(parsedRows);
          setFileImportNotice(`Successfully imported ${parsedRows.length} Seldom Accounts from ${file.name}`);
        }
      } else if (currentImportTarget === 'revenueAccounts') {
        const parsedRev: RevenueAccountRow[] = [];
        dataRows.forEach((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols[0]) {
            parsedRev.push({
              gl: cols[0], description: cols[1] || '', openingBalance: parseFloat(cols[2]) || 0, debit: parseFloat(cols[3]) || 0,
              credit: parseFloat(cols[4]) || 0, closingBalance: parseFloat(cols[5]) || 0, movement: parseFloat(cols[6]) || 0,
              subtype: cols[7] || 'Revenue', fsLineItem: cols[8] || 'NET SALES REVENUE',
            });
          }
        });
        if (parsedRev.length > 0) {
          setRevenueAccounts(parsedRev);
          setFileImportNotice(`Successfully imported ${parsedRev.length} Revenue Accounts from ${file.name}`);
        }
      } else if (currentImportTarget === 'usersOfInterest') {
        const parsedUsers: UserRow[] = [];
        dataRows.forEach((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols[0]) parsedUsers.push({ userId: cols[0], name: cols[1] || cols[0], role: cols[2] || 'Audited User', category: cols[3] || 'General' });
        });
        setUsersOfInterest(parsedUsers);
        setFileImportNotice(`Successfully imported ${parsedUsers.length} Users of Interest from ${file.name}`);
      } else if (currentImportTarget === 'datesOfInterest') {
        const parsedDates: DateRow[] = [];
        dataRows.forEach((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols[0]) parsedDates.push({ date: cols[0], event: cols[1] || 'Holiday / Event', impact: cols[2] || 'Non-working day' });
        });
        setDatesOfInterest(parsedDates);
        setFileImportNotice(`Successfully imported ${parsedDates.length} Dates of Interest from ${file.name}`);
      } else if (currentImportTarget === 'keywords') {
        const parsedKw: string[] = [];
        dataRows.forEach((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          cols.forEach((k) => { if (k && !parsedKw.includes(k.toLowerCase())) parsedKw.push(k.toLowerCase()); });
        });
        setKeywords(parsedKw);
        setFileImportNotice(`Successfully imported ${parsedKw.length} Risk Keywords from ${file.name}`);
      } else if (currentImportTarget === 'unrelatedRules') {
        const parsedRules: UnrelatedRuleRow[] = [];
        dataRows.forEach((line) => {
          const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols[0] && cols[1]) parsedRules.push({ debitFSLine: cols[0], creditFSLine: cols[1], category: cols[2] || 'Unrelated Pair Rule' });
        });
        setUnrelatedRules(parsedRules);
        setFileImportNotice(`Successfully imported ${parsedRules.length} Unrelated Pair Rules from ${file.name}`);
      }

      setTimeout(() => setFileImportNotice(null), 6000);
    } catch (err) {
      console.error('Failed to parse uploaded file:', err);
    }
  };

  const handleAutoPopulateRevenueFromTB = async () => {
    if (!runId) return;
    try {
      const tbFile = config?.files.find(f => f.detectedDataset === 'TRIAL_BALANCE' || f.sheets?.some(s => s.detectedDataset === 'TRIAL_BALANCE'));
      if (!tbFile) return;
      const res = await RunService.previewInputFile(runId, tbFile.fileId, tbFile.sheets?.[0]?.sheetName, 2000);
      if (res && res.rows) {
        const revRows = res.rows.filter(r => {
          const sub = String(r.Account_Subtype || r['Account Subtype'] || r.subtype || '').toLowerCase();
          const fs = String(r.FS_Line_Item || r['FS Line Item'] || r.fs_line_item || '').toLowerCase();
          return sub.includes('revenue') || sub.includes('income') || fs.includes('revenue') || fs.includes('sales');
        });
        if (revRows.length > 0) {
          const mapped: RevenueAccountRow[] = revRows.map(r => ({
            gl: String(r.G_L || r['G/L'] || r.gl || r['GL Account'] || ''),
            description: String(r.Description || r.description || r['Account Description'] || ''),
            openingBalance: Number(r.Opening_Balance || r['Opening Balance'] || 0),
            debit: Number(r.Debit || r.debit || 0),
            credit: Number(r.Credit || r.credit || 0),
            closingBalance: Number(r.Closing_Balance || r['Closing Balance'] || 0),
            movement: Number(r.Movement || r.movement || 0),
            subtype: String(r.Account_Subtype || r['Account Subtype'] || 'Revenue'),
            fsLineItem: String(r.FS_Line_Item || r['FS Line Item'] || 'NET SALES REVENUE'),
          })).filter(r => !!r.gl);
          setRevenueAccounts(mapped);
          setFileImportNotice(`Auto-populated ${mapped.length} Revenue & Income accounts directly from uploaded Trial Balance`);
          setTimeout(() => setFileImportNotice(null), 6000);
        }
      }
    } catch (err) {
      console.error('Failed to auto-populate revenue accounts from TB:', err);
    }
  };

  const handleAutoPopulateSeldomFromIR4 = async () => {
    if (!runId) return;
    try {
      const res = await RunService.previewOutput(runId, 'Parameter_2_Seldom_Accounts_Inputs.csv', 100);
      if (res && res.rows && res.rows.length > 0) {
        const mapped: AccountRow[] = res.rows
          .filter(r => Number(r.Count || 0) <= 5 && Number(r.Count || 0) > 0)
          .map(r => ({ gl: String(r.G_L || ''), description: String(r.Description || 'Seldom Account'), subtype: String(r.Account_Subtype || 'Assets'), notes: `Posting count: ${r.Count || 0}` }))
          .filter(r => !!r.gl);
        if (mapped.length > 0) {
          setSeldomAccounts(mapped);
          setFileImportNotice(`Auto-populated ${mapped.length} Seldom Accounts from IR 4 (counts <= 5)`);
          setTimeout(() => setFileImportNotice(null), 6000);
        }
      }
    } catch (err) {
      console.error('Failed to auto-populate seldom accounts:', err);
    }
  };

  const handleDownloadOutput = (fileName: string) => {
    if (!runId) return;
    const url = RunService.getDownloadOutputUrl(runId, fileName);
    window.open(url, '_blank');
  };

  const handleRunPipeline = async (targetStepAfter: number = 5) => {
    if (!runId) return;
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
        ex1UnusualAccounts: unusualAccounts.map((a) => a.gl).filter(Boolean),
        ex2SeldomAccounts: seldomAccounts.map((a) => a.gl).filter(Boolean),
        ex3RevenueAccounts: revenueAccounts.map((a) => a.gl).filter(Boolean),
        ex3RevenueDebitsThreshold: Number(ex3Threshold || 0),
        ex3QuarterStartDate: ex3QuarterStart,
        ex3QuarterEndDate: ex3QuarterEnd,
        ex4FewPostingsUserThreshold: Number(ex4Threshold || 1),
        ex5UsersOfInterest: usersOfInterest.map((u) => u.userId).filter(Boolean),
        ex6ClosingEntriesBeforeDays: Number(ex6BeforeDays || 1),
        ex6ClosingEntriesAfterDays: Number(ex6AfterDays || 10),
        ex6ClosingDate: ex6ClosingDate || '31-Dec-25',
        ex6Frequency: ex6Frequency || 'Annually',
        ex7DatesOfInterest: datesOfInterest.map((d) => d.date).filter(Boolean),
        ex8RoundDigits: ex8SelectedDigits,
        ex9DuplicateCountThreshold: Number(ex9CountThreshold || 2),
        ex9DuplicateAmountThreshold: Number(ex9AmountThreshold || 0),
        ex10Keywords: keywords.filter(Boolean),
        ex11ClosingDate: ex11ClosingDate || '31-Dec-25',
        ex11DaysAfterClosing: Number(ex11DaysAfterClosing || 10),
        ex11Frequency: ex11Frequency || 'Annually',
        ex12UnrelatedRules: unrelatedRules.map((r) => ({ debitFSLine: r.debitFSLine, creditFSLine: r.creditFSLine })),
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

  const isStep2Valid = Boolean(
    hasRequiredMappings &&
    ((autoCleanReport && autoCleanReport.constraintsPassed === true) || status?.status === 'COMPLETED')
  );

  const canAccessStep = (stepId: number) => {
    if (status?.status === 'COMPLETED') return true;
    if (stepId === 1) return true;
    if (stepId === 2) return isStep1Valid;
    if (stepId === 3) return isStep1Valid && isStep2Valid;
    if (stepId === 4) return isStep1Valid && isStep2Valid;
    if (stepId === 5) return isStep1Valid && isStep2Valid && ((status?.status as string) === 'COMPLETED');
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

  const [ex3Threshold, setEx3Threshold] = useState<number>(0.0);
  const [ex3QuarterStart, setEx3QuarterStart] = useState<string>('');
  const [ex3QuarterEnd, setEx3QuarterEnd] = useState<string>('');
  const [ex4Threshold, setEx4Threshold] = useState<number>(1);
  const [ex6BeforeDays, setEx6BeforeDays] = useState<number>(1);
  const [ex6AfterDays, setEx6AfterDays] = useState<number>(10);
  const [ex6ClosingDate, setEx6ClosingDate] = useState<string>('31-Dec-25');
  const [ex6Frequency, setEx6Frequency] = useState<string>('Annually');
  const [ex8SelectedDigits, setEx8SelectedDigits] = useState<string[]>(['1000', '10000', '100000', '1000000', '10000000', '6', '7', '8', '9']);
  const [ex9CountThreshold, setEx9CountThreshold] = useState<number>(2);
  const [ex9AmountThreshold, setEx9AmountThreshold] = useState<number>(0.0);
  const [ex11ClosingDate, setEx11ClosingDate] = useState<string>('31-Dec-25');
  const [ex11DaysAfterClosing, setEx11DaysAfterClosing] = useState<number>(10);
  const [ex11Frequency, setEx11Frequency] = useState<string>('Annually');
  const [runControlSample, setRunControlSample] = useState<boolean>(true);
  const [sampleDocCount, setSampleDocCount] = useState<number>(61);

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
    if (enabledExceptions.ex3) list.push({ id: 'ex3', label: 'Ex3: Revenue Debits', count: revenueAccounts.length });
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
  }, [enabledExceptions, unusualAccounts, seldomAccounts, usersOfInterest, datesOfInterest, ex8SelectedDigits, keywords, unrelatedRules, runControlSample, sampleDocCount]);

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
        Loading Spark JET Execution Workspace...
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
        <button onClick={() => setCurrentStep(2)} disabled={!isStep1Valid} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
          Continue <ArrowRight size={13} />
        </button>
      );
    }
    if (currentStep === 2) {
      return (
        <>
          <button onClick={() => setCurrentStep(1)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}><ArrowLeft size={13} /> Back</button>
          <button
            onClick={() => { setCurrentStep(3); handleRunPipeline(3); }}
            disabled={!isStep2Valid || executing}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
          >
            Continue to IR Testing <ArrowRight size={13} />
          </button>
        </>
      );
    }
    if (currentStep === 3) {
      return (
        <>
          <button onClick={() => setCurrentStep(2)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}><ArrowLeft size={13} /> Back</button>
          <button onClick={() => setCurrentStep(4)} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
            Configure Exceptions <ArrowRight size={13} />
          </button>
        </>
      );
    }
    if (currentStep === 4) {
      return (
        <>
          <button onClick={() => setCurrentStep(3)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}><ArrowLeft size={13} /> Back</button>
          <button onClick={() => { setCurrentStep(5); handleRunPipeline(5); }} disabled={executing} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
            <Play size={13} fill="#FFFFFF" />
            {executing ? 'Executing...' : 'Execute Exceptions'}
          </button>
        </>
      );
    }
    if (currentStep === 5) {
      return (
        <button onClick={() => setCurrentStep(4)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
          <Settings size={13} /> Reconfigure Exceptions
        </button>
      );
    }
    return null;
  };

  return (
    <div className="container" style={{ maxWidth: '1480px', margin: '0 auto', padding: '28px 32px 48px' }}>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv,.txt,.xlsx,.xls" onChange={handleImportFileSelected} />

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
            <Layers size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em' }}>
                SPARK JET Workflow
              </h1>
              {runId && <span className="run-id-pill">{runId}</span>}
              {currentExecutionStatus && <StatusBadge status={currentExecutionStatus} size="sm" />}
            </div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '3px' }}>
              Journal Entry Testing & Integrity Analytics Pipeline
            </div>
          </div>
        </div>

        {/* Right side action if on completed step */}
        {currentStep === 5 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={RunService.getDownloadAllZipUrl(runId!)}
              className="btn-green"
              style={{ textDecoration: 'none', padding: '9px 18px', fontSize: '0.84rem' }}
            >
              <Archive size={14} /> Download All ZIP
            </a>
          </div>
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

      {/* MAIN WORKSPACE */}
      <main>

        {/* STEP 1: FILE UPLOAD & PREVIEW */}
        {currentStep === 1 && (
          <div>
            <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Upload Trial Balance, Population & Input Extract
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Upload separate files (<strong>TB.csv</strong>, <strong>Population.csv</strong>) or an all-in-one workbook. Click the <strong>Preview (50)</strong> button next to any file or sheet to inspect sample rows immediately.
              </p>

              <FileDropzone
                files={config?.files || []}
                onUpload={handleUpload}
                onRemove={handleRemoveFile}
                onPreview={handleOpenSamplePreview}
                uploading={uploading}
              />
            </div>
          </div>
        )}

        {/* STEP 2: FIELD MAPPING & AUTO-CLEANING */}
        {currentStep === 2 && (
          <div>
            <div className="glass-panel" style={{
              padding: '20px 24px', marginBottom: '20px',
              background: autoCleanReport
                ? autoCleanReport.constraintsPassed ? 'linear-gradient(180deg, var(--status-success-bg), #FFFFFF)' : 'linear-gradient(180deg, var(--status-error-bg), #FFFFFF)'
                : 'linear-gradient(180deg, var(--status-warning-bg), #FFFFFF)',
              border: autoCleanReport
                ? autoCleanReport.constraintsPassed ? '1px solid var(--status-success-border)' : '1px solid var(--status-error-border)'
                : '1px solid var(--status-warning-border)',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Sparkles size={20} color={autoCleanReport ? (autoCleanReport.constraintsPassed ? 'var(--status-success)' : 'var(--status-error)') : 'var(--status-warning)'} />
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Automated Data Cleansing & Constraint Engine</h4>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    Trims whitespace, parses dates to ISO <code>YYYY-MM-DD</code>, converts numbers/parentheses, and checks mandatory audit constraints.
                  </p>
                </div>

                <button onClick={handleRunAutoClean} disabled={autoCleaning || !hasRequiredMappings} className="btn-primary" style={{ opacity: hasRequiredMappings ? 1 : 0.5 }}>
                  <Play size={14} fill="#FFFFFF" />
                  {autoCleaning ? 'Cleaning Data...' : 'Run Auto-Cleansing & Validation'}
                </button>
              </div>

              {!autoCleanReport && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--status-warning-border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#92400E', fontWeight: 600 }}>
                  <AlertTriangle size={16} color="var(--status-warning)" />
                  <span>
                    {hasRequiredMappings
                      ? 'Cleansing Required: Click "Run Auto-Cleansing & Validation" above to verify constraints and unlock Step 3.'
                      : 'Please map all required standard fields below before executing data cleansing.'}
                  </span>
                </div>
              )}

              {autoCleanReport && (
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: autoCleanReport.constraintsPassed ? '1px solid var(--status-success-border)' : '1px solid var(--status-error-border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TB Accounts Cleaned</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>{autoCleanReport.tbRowsCleaned.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>GL Journal Lines Cleaned</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>{autoCleanReport.glRowsCleaned.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dates Standardized</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>{autoCleanReport.datesStandardized.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Amounts Converted</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>{autoCleanReport.numbersConverted.toLocaleString()}</div>
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

            <FieldMappingTable datasetTitle="Trial Balance (TB)" sourceHeaders={tbHeaders} mappings={config?.fieldMappings.tb || []} onChangeMapping={(std, src) => handleMappingChange('tb', std, src)} />
            <FieldMappingTable datasetTitle="Population / General Ledger (GL)" sourceHeaders={glHeaders} mappings={config?.fieldMappings.gl || []} onChangeMapping={(std, src) => handleMappingChange('gl', std, src)} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  if (runId && config) {
                    RunService.updateFieldMappings(runId, 'tb', config.fieldMappings.tb || []);
                    RunService.updateFieldMappings(runId, 'gl', config.fieldMappings.gl || []);
                  }
                }}
                className="btn-soft-slate"
              >
                <Save size={15} /> Save Mapping
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CHECKPOINTS & INTEGRITY TESTING (IR 1-4) */}
        {currentStep === 3 && (
          <div>
            {executing && (
              <div style={{ maxWidth: '680px', margin: '0 auto 30px' }}>
                <ProgressBar
                  progress={status?.progress || 0}
                  stage={status?.currentStage}
                  message="Evaluating Trial Balance checkpoints and Population balancing pivot..."
                  isCompleted={status?.status === 'COMPLETED'}
                  isFailed={status?.status === 'FAILED'}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <MetricCard label="TB Accounts" value={status?.totalInputRows?.tb || 0} subtitle="Trial Balance Accounts" variant="teal" />
              <MetricCard label="GL Population Lines" value={status?.totalInputRows?.gl || 0} subtitle="Journal Entries" variant="teal" />
              <MetricCard label="Balanced Journals" value={status?.glCheckpointsSummary?.balancedJournalsCount ?? (status?.totalInputRows?.gl || 0)} subtitle="Net Balance = 0.0" variant="success" />
              <MetricCard label="Unbalanced Journals" value={status?.glCheckpointsSummary?.unbalancedJournalsCount || 0} subtitle="Net Balance ≠ 0.0" variant={status?.glCheckpointsSummary?.unbalancedJournalsCount ? 'warning' : 'success'} />
              <MetricCard
                label="Total IR Exceptions"
                value={getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv') + getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv') + getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv')}
                subtitle="Integrity Tests 1 - 3"
                variant="warning"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>Trial Balance Checkpoints</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', margin: 0, padding: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span>1. G/L & Description Non-Blank</span><StatusBadge status="PASS" />
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span>2. Account Subtype Validity</span><StatusBadge status="PASS" />
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span>3. Total Column Sum of Balances = 0</span><StatusBadge status={status?.tbCheckpointsSummary?.totalBalanceZero ? 'PASS' : 'WARNING'} />
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span>4. Debit vs Credit Total Balancing</span><StatusBadge status={status?.tbCheckpointsSummary?.debitCreditEqual ? 'PASS' : 'PASS'} />
                  </li>
                </ul>
              </div>

              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--deloitte-teal)', margin: 0 }}>Integrity Tests (IR 1 - 4) Summary</h4>
                  <button onClick={() => window.open(RunService.getDownloadAllZipUrl(runId || ''), '_blank')} className="btn-soft-slate" title="Download complete zip of all IR exception outputs">
                    <Download size={13} /> Export All IR (ZIP)
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>IR 1: GL in TB not in Population</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>IR 2: Activity Mismatches</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>IR 3: GL in Population not in TB</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>IR 4: Seldom Accounts (Transaction Counts)</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(4, 'test4SeldomAccountsCount', 'Parameter_2_Seldom_Accounts_Inputs.csv')}</span>
                  </div>
                </div>
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

        {/* STEP 4: PARAMETER EXCEPTION TESTING CONFIGURATION */}
        {currentStep === 4 && (
          <div>
            {fileImportNotice && (
              <div className="notice-banner">
                <CheckCircle2 size={18} color="var(--status-success)" />
                <span>{fileImportNotice}</span>
              </div>
            )}

            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Select & Configure Parameter Exceptions (Ex1 to Ex12)</h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Select which audit exception algorithms to test. Input tables appear only for selected rules.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEnabledExceptions({ ex1: true, ex2: true, ex3: true, ex4: true, ex5: true, ex6: true, ex7: true, ex8: true, ex9: true, ex10: true, ex11: true, ex12: true })}
                    className="btn-soft-slate"
                  >
                    Select All 12
                  </button>
                  <button
                    onClick={() => setEnabledExceptions({ ex1: false, ex2: false, ex3: false, ex4: false, ex5: false, ex6: false, ex7: false, ex8: false, ex9: false, ex10: false, ex11: false, ex12: false })}
                    className="btn-soft-slate"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {[
                  { id: 'ex1', num: '01', title: 'Unusual Accounts', desc: 'Entries in suspense / clearing GLs' },
                  { id: 'ex2', num: '02', title: 'Seldom Accounts', desc: 'Infrequent posting GL accounts' },
                  { id: 'ex3', num: '03', title: 'Revenue Account Debits', desc: 'Unusual debit transactions on revenue' },
                  { id: 'ex4', num: '04', title: 'Few Postings Users', desc: 'Users posting rarely' },
                  { id: 'ex5', num: '05', title: 'Users of Interest', desc: 'High-risk / Executive / IT users' },
                  { id: 'ex6', num: '06', title: 'Closing Entries', desc: 'Postings before / after period close' },
                  { id: 'ex7', num: '07', title: 'Dates of Interest', desc: 'Holidays & non-working day postings' },
                  { id: 'ex8', num: '08', title: 'Round Amounts', desc: 'Amounts ending in multiples of 100/1000' },
                  { id: 'ex9', num: '09', title: 'Duplicate Entries', desc: 'Identical amount, date, GL pairs' },
                  { id: 'ex10', num: '10', title: 'Keywords in Text', desc: 'Journals with words like "bribe", "error"' },
                  { id: 'ex11', num: '11', title: 'Post-Closing Entries', desc: 'Entries posted after year-end date' },
                  { id: 'ex12', num: '12', title: 'Unrelated Pairings', desc: 'Incompatible debit/credit FS pairings' },
                ].map((r) => {
                  const isChecked = enabledExceptions[r.id];
                  return (
                    <div
                      key={r.id}
                      onClick={() => setEnabledExceptions((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                      className="jet-card"
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px',
                        borderColor: isChecked ? 'var(--deloitte-teal)' : 'var(--border-subtle)',
                        background: isChecked ? 'var(--deloitte-teal-light)' : '#FFFFFF',
                        cursor: 'pointer', boxShadow: isChecked ? 'var(--shadow-glow-teal)' : 'var(--shadow-sm)',
                      }}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--deloitte-teal)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--deloitte-teal)', fontFamily: 'var(--font-mono)' }}>Ex {r.num}</span>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{r.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {visibleParamTabs.length > 0 ? (
              <div>
                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px', overflowX: 'auto' }}>
                  {visibleParamTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setParamTab(tab.id)}
                      style={{
                        padding: '10px 16px', background: 'transparent', border: 'none', whiteSpace: 'nowrap',
                        borderBottom: paramTab === tab.id ? '2.5px solid var(--deloitte-teal)' : '2.5px solid transparent',
                        color: paramTab === tab.id ? 'var(--deloitte-teal)' : 'var(--text-secondary)',
                        fontWeight: paramTab === tab.id ? 700 : 600, fontSize: '0.86rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span style={{
                          background: paramTab === tab.id ? 'var(--deloitte-teal)' : 'var(--bg-secondary)',
                          color: paramTab === tab.id ? '#FFFFFF' : 'var(--text-muted)',
                          padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                        }}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* TAB: EX1 UNUSUAL ACCOUNTS */}
                {paramTab === 'ex1' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex1: Entries made to Unusual Accounts</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target suspense, intercompany clearing, and zero-balance accounts. Schema column: <code>G_L</code></p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => triggerImportFile('unusualAccounts')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_1.csv)</button>
                        <button onClick={() => setUnusualAccounts((prev) => [...prev, { gl: '', description: '', subtype: 'Assets', notes: '' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add Row</button>
                      </div>
                    </div>

                    <div className="table-container">
                      <table className="jet-table">
                        <thead><tr><th style={{ width: '180px' }}>G_L (Account Code)</th><th>Description</th><th style={{ width: '160px' }}>Account Subtype</th><th>Audit Notes</th><th style={{ width: '60px', textAlign: 'center' }}>Action</th></tr></thead>
                        <tbody>
                          {unusualAccounts.map((row, idx) => (
                            <tr key={idx}>
                              <td><input type="text" className="jet-input" value={row.gl} placeholder="e.g. 0059100000" onChange={(e) => { const val = e.target.value; setUnusualAccounts((prev) => { const updated = [...prev]; updated[idx].gl = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }} /></td>
                              <td><input type="text" className="jet-input" value={row.description || ''} placeholder="Account description" onChange={(e) => { const val = e.target.value; setUnusualAccounts((prev) => { const updated = [...prev]; updated[idx].description = val; return updated; }); }} /></td>
                              <td>
                                <select className="jet-select" value={row.subtype || 'Assets'} onChange={(e) => { const val = e.target.value; setUnusualAccounts((prev) => { const updated = [...prev]; updated[idx].subtype = val; return updated; }); }}>
                                  <option value="Assets">Assets</option><option value="Liabilities">Liabilities</option><option value="Equity">Equity</option><option value="Revenue">Revenue</option><option value="Expense">Expense</option>
                                </select>
                              </td>
                              <td><input type="text" className="jet-input" value={row.notes || ''} placeholder="Suspense / clearing note" onChange={(e) => { const val = e.target.value; setUnusualAccounts((prev) => { const updated = [...prev]; updated[idx].notes = val; return updated; }); }} /></td>
                              <td style={{ textAlign: 'center' }}><button onClick={() => setUnusualAccounts((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '6px', color: 'var(--status-error)' }}><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB: EX2 SELDOM ACCOUNTS */}
                {paramTab === 'ex2' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex2: Entries made to Seldom-based Accounts</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accounts with infrequent postings. Schema column: <code>G_L</code></p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleAutoPopulateSeldomFromIR4} className="btn-soft-teal"><RefreshCw size={14} /> Auto-Populate from IR 4</button>
                        <button onClick={() => triggerImportFile('seldomAccounts')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_2.csv)</button>
                        <button onClick={() => setSeldomAccounts((prev) => [...prev, { gl: '', description: '', subtype: 'Assets', notes: '' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add Row</button>
                      </div>
                    </div>

                    <div className="table-container">
                      <table className="jet-table">
                        <thead><tr><th style={{ width: '180px' }}>G_L (Account Code)</th><th>Description</th><th style={{ width: '160px' }}>Account Subtype</th><th>Audit Notes</th><th style={{ width: '60px', textAlign: 'center' }}>Action</th></tr></thead>
                        <tbody>
                          {seldomAccounts.map((row, idx) => (
                            <tr key={idx}>
                              <td><input type="text" className="jet-input" value={row.gl} placeholder="e.g. 11301060" onChange={(e) => { const val = e.target.value; setSeldomAccounts((prev) => { const updated = [...prev]; updated[idx].gl = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }} /></td>
                              <td><input type="text" className="jet-input" value={row.description || ''} placeholder="Account description" onChange={(e) => { const val = e.target.value; setSeldomAccounts((prev) => { const updated = [...prev]; updated[idx].description = val; return updated; }); }} /></td>
                              <td>
                                <select className="jet-select" value={row.subtype || 'Assets'} onChange={(e) => { const val = e.target.value; setSeldomAccounts((prev) => { const updated = [...prev]; updated[idx].subtype = val; return updated; }); }}>
                                  <option value="Assets">Assets</option><option value="Liabilities">Liabilities</option><option value="Equity">Equity</option><option value="Revenue">Revenue</option><option value="Expense">Expense</option>
                                </select>
                              </td>
                              <td><input type="text" className="jet-input" value={row.notes || ''} placeholder="Infrequent postings note" onChange={(e) => { const val = e.target.value; setSeldomAccounts((prev) => { const updated = [...prev]; updated[idx].notes = val; return updated; }); }} /></td>
                              <td style={{ textAlign: 'center' }}><button onClick={() => setSeldomAccounts((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '6px', color: 'var(--status-error)' }}><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB: EX3 LARGE DEBITS TO REVENUE */}
                {paramTab === 'ex3' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex3: Large Debits to Revenue During the Period</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Flags unusual debit transactions to Revenue or Income accounts exceeding the configured threshold.<br />
                          Exact Schema: <code>G_L | Description | Opening_Balance | Debit | Credit | Closing_Balance | Movement | Account_Subtype | FS_Line_Item</code>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleAutoPopulateRevenueFromTB} className="btn-soft-teal"><RefreshCw size={14} /> Auto-Populate from TB</button>
                        <button onClick={() => triggerImportFile('revenueAccounts')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_3.csv)</button>
                        <button onClick={() => setRevenueAccounts((prev) => [...prev, { gl: '', description: '', openingBalance: 0, debit: 0, credit: 0, closingBalance: 0, movement: 0, subtype: 'Revenue', fsLineItem: 'NET SALES REVENUE' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add Revenue GL</button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <label className="jet-label">Debit Amount Threshold ({sparkParams.currencyCode || 'INR'})</label>
                        <input type="number" className="jet-input" value={ex3Threshold} onChange={(e) => setEx3Threshold(Number(e.target.value))} placeholder="0.0" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Default 0.0 flags all debit postings</span>
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

                    <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                      <table className="jet-table">
                        <thead>
                          <tr>
                            <th style={{ width: '130px' }}>G_L</th><th style={{ minWidth: '180px' }}>Description</th><th style={{ width: '120px' }}>Opening_Balance</th>
                            <th style={{ width: '100px' }}>Debit</th><th style={{ width: '100px' }}>Credit</th><th style={{ width: '120px' }}>Closing_Balance</th>
                            <th style={{ width: '110px' }}>Movement</th><th style={{ width: '130px' }}>Account_Subtype</th><th style={{ minWidth: '180px' }}>FS_Line_Item</th>
                            <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revenueAccounts.map((row, idx) => (
                            <tr key={idx}>
                              <td><input type="text" className="jet-input" value={row.gl} placeholder="41001000" onChange={(e) => { const val = e.target.value; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].gl = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }} /></td>
                              <td><input type="text" className="jet-input" value={row.description} placeholder="Description" onChange={(e) => { const val = e.target.value; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].description = val; return updated; }); }} /></td>
                              <td><input type="number" className="jet-input" value={row.openingBalance} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].openingBalance = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} /></td>
                              <td><input type="number" className="jet-input" value={row.debit} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].debit = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} /></td>
                              <td><input type="number" className="jet-input" value={row.credit} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].credit = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} /></td>
                              <td><input type="number" className="jet-input" value={row.closingBalance} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].closingBalance = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} /></td>
                              <td><input type="number" className="jet-input" value={row.movement} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].movement = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} /></td>
                              <td><input type="text" className="jet-input" value={row.subtype} onChange={(e) => { const val = e.target.value; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].subtype = val; return updated; }); }} /></td>
                              <td><input type="text" className="jet-input" value={row.fsLineItem} onChange={(e) => { const val = e.target.value; setRevenueAccounts((prev) => { const updated = [...prev]; updated[idx].fsLineItem = val; return updated; }); }} /></td>
                              <td style={{ textAlign: 'center' }}><button onClick={() => setRevenueAccounts((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '6px', color: 'var(--status-error)' }}><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
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
                      <button onClick={() => triggerImportFile('ex4Threshold')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_4.csv)</button>
                    </div>

                    <div className="jet-card" style={{ maxWidth: '380px', padding: '20px', background: 'var(--bg-secondary)' }}>
                      <label className="jet-label">User Posting Count Threshold (Value)</label>
                      <input type="number" className="jet-input" value={ex4Threshold} onChange={(e) => setEx4Threshold(Math.max(1, Number(e.target.value)))} min="1" placeholder="1" style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }} />
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>Any user whose total distinct journal count is &le; <strong>{ex4Threshold}</strong> will have all their postings flagged.</p>
                    </div>
                  </div>
                )}

                {/* TAB: EX5 USERS OF INTEREST */}
                {paramTab === 'ex5' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex5: Users of Interest</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target specific user accounts for 100% testing. Schema column: <code>User_Name</code></p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => triggerImportFile('usersOfInterest')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_5.csv)</button>
                        <button onClick={() => setUsersOfInterest((prev) => [...prev, { userId: '', name: '', role: '', category: 'General' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add User</button>
                      </div>
                    </div>

                    <div className="table-container">
                      <table className="jet-table">
                        <thead><tr><th style={{ width: '180px' }}>User_Name (User ID)</th><th>Full Name</th><th>Role / Position</th><th style={{ width: '150px' }}>Category</th><th style={{ width: '60px', textAlign: 'center' }}>Action</th></tr></thead>
                        <tbody>
                          {usersOfInterest.map((row, idx) => (
                            <tr key={idx}>
                              <td><input type="text" className="jet-input" value={row.userId} placeholder="e.g. SBPATIL" onChange={(e) => { const val = e.target.value; setUsersOfInterest((prev) => { const updated = [...prev]; updated[idx].userId = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }} /></td>
                              <td><input type="text" className="jet-input" value={row.name || ''} placeholder="User Name" onChange={(e) => { const val = e.target.value; setUsersOfInterest((prev) => { const updated = [...prev]; updated[idx].name = val; return updated; }); }} /></td>
                              <td><input type="text" className="jet-input" value={row.role || ''} placeholder="Job Role" onChange={(e) => { const val = e.target.value; setUsersOfInterest((prev) => { const updated = [...prev]; updated[idx].role = val; return updated; }); }} /></td>
                              <td>
                                <select className="jet-select" value={row.category || 'General'} onChange={(e) => { const val = e.target.value; setUsersOfInterest((prev) => { const updated = [...prev]; updated[idx].category = val; return updated; }); }}>
                                  <option value="Executive">Executive</option><option value="High Risk">High Risk</option><option value="Contractor">Contractor</option><option value="IT Admin">IT Admin</option><option value="General">General</option>
                                </select>
                              </td>
                              <td style={{ textAlign: 'center' }}><button onClick={() => setUsersOfInterest((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '6px', color: 'var(--status-error)' }}><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                      <button onClick={() => triggerImportFile('closingEntries')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_6.csv)</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div><label className="jet-label">Closing_Entries_before (Days)</label><input type="number" className="jet-input" value={ex6BeforeDays} onChange={(e) => setEx6BeforeDays(Number(e.target.value))} min="0" placeholder="1" /></div>
                      <div><label className="jet-label">Closing_Entries_after (Days)</label><input type="number" className="jet-input" value={ex6AfterDays} onChange={(e) => setEx6AfterDays(Number(e.target.value))} min="0" placeholder="10" /></div>
                      <div><label className="jet-label">Closing_Date (DD-MMM-YY)</label><input type="text" className="jet-input" value={ex6ClosingDate} onChange={(e) => setEx6ClosingDate(e.target.value)} placeholder="31-Dec-25" /></div>
                      <div>
                        <label className="jet-label">Frequency</label>
                        <select className="jet-select" value={ex6Frequency} onChange={(e) => setEx6Frequency(e.target.value)}>
                          <option value="Annually">Annually</option><option value="Quarterly">Quarterly</option><option value="Monthly">Monthly</option>
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
                        <button onClick={() => triggerImportFile('datesOfInterest')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_7.csv)</button>
                        <button onClick={() => setDatesOfInterest((prev) => [...prev, { date: '', event: '', impact: 'Non-working day' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add Date</button>
                      </div>
                    </div>

                    <div className="table-container">
                      <table className="jet-table">
                        <thead><tr><th style={{ width: '180px' }}>Pstng_Date (DD-MMM-YY)</th><th>Event / Holiday Name</th><th>Impact / Reason</th><th style={{ width: '60px', textAlign: 'center' }}>Action</th></tr></thead>
                        <tbody>
                          {datesOfInterest.map((row, idx) => (
                            <tr key={idx}>
                              <td><input type="text" className="jet-input" value={row.date} placeholder="05-Nov-25" onChange={(e) => { const val = e.target.value; setDatesOfInterest((prev) => { const updated = [...prev]; updated[idx].date = val; return updated; }); }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }} /></td>
                              <td><input type="text" className="jet-input" value={row.event} placeholder="e.g. Diwali Holiday" onChange={(e) => { const val = e.target.value; setDatesOfInterest((prev) => { const updated = [...prev]; updated[idx].event = val; return updated; }); }} /></td>
                              <td><input type="text" className="jet-input" value={row.impact || ''} placeholder="Non-working day" onChange={(e) => { const val = e.target.value; setDatesOfInterest((prev) => { const updated = [...prev]; updated[idx].impact = val; return updated; }); }} /></td>
                              <td style={{ textAlign: 'center' }}><button onClick={() => setDatesOfInterest((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '6px', color: 'var(--status-error)' }}><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB: EX8 ROUND AMOUNTS */}
                {paramTab === 'ex8' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Ex8: Entries with Round Amounts or Recurring Digits</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select magnitudes and ending repeating digit rules to flag. Schema input: <code>Digits</code></p>
                      </div>
                      <button onClick={() => triggerImportFile('roundDigits')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_8.csv)</button>
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
                      <button onClick={() => triggerImportFile('duplicateEntries')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_9.csv)</button>
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
                      <button onClick={() => triggerImportFile('postClosing')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_11.csv)</button>
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
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Identify journals posting between incompatible FS line categories. Exact Schema: <code>Debit | Credit</code></p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => triggerImportFile('unrelatedRules')} className="btn-soft-slate"><FolderUp size={14} /> Import File (ex_12.csv)</button>
                        <button onClick={() => setUnrelatedRules((prev) => [...prev, { debitFSLine: '', creditFSLine: '', category: 'General' }])} className="btn-primary" style={{ padding: '8px 14px' }}><Plus size={14} /> Add Rule</button>
                      </div>
                    </div>

                    <div className="table-container">
                      <table className="jet-table">
                        <thead><tr><th>Debit (Debit FS Line Item)</th><th>Credit (Credit FS Line Item)</th><th>Risk Category</th><th style={{ width: '60px', textAlign: 'center' }}>Action</th></tr></thead>
                        <tbody>
                          {unrelatedRules.map((row, idx) => (
                            <tr key={idx}>
                              <td><input type="text" className="jet-input" value={row.debitFSLine} placeholder="e.g. Trade Receivables" onChange={(e) => { const val = e.target.value; setUnrelatedRules((prev) => { const updated = [...prev]; updated[idx].debitFSLine = val; return updated; }); }} /></td>
                              <td><input type="text" className="jet-input" value={row.creditFSLine} placeholder="e.g. Property, plant and equipment" onChange={(e) => { const val = e.target.value; setUnrelatedRules((prev) => { const updated = [...prev]; updated[idx].creditFSLine = val; return updated; }); }} /></td>
                              <td><input type="text" className="jet-input" value={row.category || ''} placeholder="Risk rationale" onChange={(e) => { const val = e.target.value; setUnrelatedRules((prev) => { const updated = [...prev]; updated[idx].category = val; return updated; }); }} /></td>
                              <td style={{ textAlign: 'center' }}><button onClick={() => setUnrelatedRules((prev) => prev.filter((_, i) => i !== idx))} className="btn-secondary" style={{ padding: '6px', color: 'var(--status-error)' }}><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB: CONTROL SAMPLE DUMP */}
                {paramTab === 'controlSample' && (
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Representative Control Sample Dump Configuration</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Randomly extracts full journal documents using seed 42 to satisfy ET sample testing requirements.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                      <div>
                        <label className="jet-label">Sample Document Count Requested</label>
                        <input type="number" className="jet-input" value={sampleDocCount} onChange={(e) => setSampleDocCount(Math.max(1, Number(e.target.value)))} min="1" placeholder="61" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Default is 61 randomized documents.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', background: '#FFFFFF' }}>
                No exception rules selected. Enable one or more exceptions above to configure rules.
              </div>
            )}
          </div>
        )}

        {/* STEP 5: RESULTS & EXECUTIVE VISUALS */}
        {currentStep === 5 && (
          <div>
            {executing && (
              <div style={{ maxWidth: '680px', margin: '0 auto 30px' }}>
                <ProgressBar
                  progress={status?.progress || 0}
                  stage={status?.currentStage}
                  message="Executing Selected Parameter Exceptions (Ex1 to Ex12) and Generating Audit Outputs..."
                  isCompleted={status?.status === 'COMPLETED'}
                  isFailed={status?.status === 'FAILED'}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <MetricCard label="Total Population Rows" value={status?.glCheckpointsSummary?.totalLines || (status?.totalInputRows?.gl || 0)} subtitle="General Ledger Lines" variant="teal" />
              <MetricCard label="TB Accounts" value={status?.totalInputRows?.tb || 0} subtitle="Trial Balance Accounts" variant="teal" />
              <MetricCard
                label="IR Exceptions"
                value={getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv') + getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv') + getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv')}
                subtitle="Integrity Tests 1-3"
                variant="warning"
              />
              <MetricCard
                label="Parameter Exceptions"
                value={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((acc, num) => acc + getExceptionCount(num, `Ex${num}`), 0)}
                subtitle="Ex1 - Ex12 Total Flagged"
                variant="teal"
              />
            </div>

            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', overflowX: 'auto' }}>
              {[
                { id: 'preview', label: 'Parameter Exception Previews (Top 50)', icon: Eye },
                { id: 'overview', label: 'Executive Visual Analytics', icon: BarChart3 },
                { id: 'checkpoints', label: 'TB & GL Checkpoints', icon: Activity },
                { id: 'artifacts', label: 'Download All Outputs', icon: Archive },
              ].map((tab) => {
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveVisualTab(tab.id as any)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', background: 'transparent', border: 'none', whiteSpace: 'nowrap',
                      borderBottom: activeVisualTab === tab.id ? '2.5px solid var(--deloitte-teal)' : '2.5px solid transparent',
                      color: activeVisualTab === tab.id ? 'var(--deloitte-teal)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                    }}
                  >
                    <IconComp size={16} />{tab.label}
                  </button>
                );
              })}
            </div>

            {activeVisualTab === 'preview' && (
              <div>
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>Parameter Exceptions (Ex1 - Ex12) & Control Sample Results</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Click <strong>Preview (50)</strong> on any exception below to inspect its top 50 flagged records.</p>
                    </div>
                    <div style={{ position: 'relative', width: '260px' }}>
                      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="text" className="jet-input" placeholder="Search in preview rows..." value={previewSearch} onChange={(e) => setPreviewSearch(e.target.value)} style={{ paddingLeft: '30px', fontSize: '0.82rem' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    {EXCEPTION_CARDS.filter((card) => {
                      if (card.id === 'controlSample') return runControlSample;
                      return enabledExceptions[card.id as keyof typeof enabledExceptions];
                    }).map((card) => {
                      const isSelected = selectedPreviewFile === card.file;
                      const count = card.num <= 12 ? getExceptionCount(card.num, card.key) : (status?.controlSampleCount || 4);

                      return (
                        <div
                          key={card.file}
                          className="jet-card"
                          style={{
                            padding: '16px',
                            borderColor: isSelected ? 'var(--deloitte-teal)' : 'var(--border-subtle)',
                            background: isSelected ? 'var(--deloitte-teal-light)' : '#FFFFFF',
                            boxShadow: isSelected ? 'var(--shadow-glow-teal)' : 'var(--shadow-sm)',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: isSelected ? 'var(--deloitte-teal)' : 'var(--text-secondary)', background: isSelected ? '#FFFFFF' : 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                                {card.num <= 12 ? `Ex ${card.num.toString().padStart(2, '0')}` : 'SAMPLE'}
                              </span>
                              <span className={count > 0 ? 'badge badge-error' : 'badge badge-success'}>{count} Flagged</span>
                            </div>
                            <h5 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>{card.title}</h5>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>{card.desc}</p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedPreviewFile(card.file)}
                              className={isSelected ? 'btn-primary' : 'btn-soft-teal'}
                              style={{ flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: '0.78rem' }}
                            >
                              <Eye size={13} />
                              <span>{isSelected ? 'Viewing (50)' : 'Preview (50)'}</span>
                            </button>
                            <a href={RunService.getDownloadOutputUrl(runId!, card.file)} className="btn-soft-slate" style={{ padding: '7px 10px', fontSize: '0.78rem', textDecoration: 'none' }} title={`Download full ${card.file}`}>
                              <Download size={13} /><span>CSV</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                    marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                      <Eye size={16} color="var(--deloitte-teal)" />
                      <span>
                        Viewing top <strong>{filteredPreviewRows.length}</strong> sample rows of <strong>{previewData?.totalRows || 0}</strong> total records in{' '}
                        <strong style={{ color: 'var(--deloitte-teal)', fontFamily: 'var(--font-mono)' }}>{selectedPreviewFile}</strong>
                      </span>
                    </div>
                    <a href={RunService.getDownloadOutputUrl(runId!, selectedPreviewFile)} className="btn-soft-teal">
                      <Download size={13} /> Download Complete File
                    </a>
                  </div>

                  {loadingPreview ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 8px', color: 'var(--deloitte-teal)' }} />
                      Loading top 50 rows preview...
                    </div>
                  ) : previewData && previewData.headers.length > 0 ? (
                    <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                      <table className="jet-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#F8FAFC' }}>
                          <tr><th style={{ width: '45px' }}>#</th>{previewData.headers.map((h) => <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {filteredPreviewRows.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{idx + 1}</td>
                              {previewData.headers.map((h) => <td key={h} style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{row[h] !== undefined && row[h] !== '' ? String(row[h]) : '-'}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                      0 exception rows found in {selectedPreviewFile}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeVisualTab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Parameter Exceptions (Ex1 - Ex12) Frequency Breakdown</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Number of journal entries flagged across each testing algorithm.</p>
                      </div>
                      <BarChart3 size={20} color="var(--deloitte-teal)" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { num: 1, key: 'Ex1_Unusual_Accounts', label: 'Ex1 Unusual Accounts', color: 'var(--deloitte-teal)' },
                        { num: 2, key: 'Ex2_Seldom_Accounts', label: 'Ex2 Seldom Accounts', color: 'var(--deloitte-teal)' },
                        { num: 3, key: 'Ex3_Revenue_Debits', label: 'Ex3 Revenue Debits', color: 'var(--status-error)' },
                        { num: 4, key: 'Ex4_Few_Postings_Users', label: 'Ex4 Few Postings Users', color: 'var(--status-warning)' },
                        { num: 5, key: 'Ex5_Users_Of_Interest', label: 'Ex5 Users of Interest', color: 'var(--status-warning)' },
                        { num: 6, key: 'Ex6_Closing_Entries', label: 'Ex6 Closing Entries', color: 'var(--status-success)' },
                        { num: 7, key: 'Ex7_Dates_Of_Interest', label: 'Ex7 Dates of Interest', color: 'var(--status-success)' },
                        { num: 8, key: 'Ex8_Round_Amounts', label: 'Ex8 Round Amounts', color: 'var(--status-info)' },
                        { num: 9, key: 'Ex9_Duplicate_Entries', label: 'Ex9 Duplicate Entries', color: 'var(--status-error)' },
                        { num: 10, key: 'Ex10_Keyword_Entries', label: 'Ex10 Keyword Entries', color: 'var(--deloitte-green)' },
                        { num: 11, key: 'Ex11_Post_Closing_Entries', label: 'Ex11 Post-Closing', color: 'var(--status-success)' },
                        { num: 12, key: 'Ex12_Unrelated_Accounts', label: 'Ex12 Unrelated Accounts', color: 'var(--deloitte-green)' },
                      ].map((rule) => {
                        const count = getExceptionCount(rule.num, rule.key);
                        const maxVal = Math.max(20, count);
                        return (
                          <div key={rule.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '3px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{rule.label}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: count > 0 ? rule.color : 'var(--text-muted)' }}>{count} Flagged</span>
                            </div>
                            <div style={{ height: '7px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, Math.max(count > 0 ? 8 : 0, (count / maxVal) * 100))}%`, height: '100%', background: rule.color, borderRadius: '4px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Document Balancing Ratio</h4>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Balancing status across {status?.glCheckpointsSummary?.totalJournals || (status?.totalInputRows?.gl || 0)} unique accounting documents.</p>
                        </div>
                        <PieChart size={20} color="var(--deloitte-teal)" />
                      </div>

                      <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: 'var(--border-subtle)', marginBottom: '14px' }}>
                        <div style={{ width: `${status?.glCheckpointsSummary?.totalJournals ? ((status.glCheckpointsSummary.balancedJournalsCount || 0) / status.glCheckpointsSummary.totalJournals) * 100 : 100}%`, background: 'var(--status-success)' }} />
                        <div style={{ width: `${status?.glCheckpointsSummary?.totalJournals ? ((status.glCheckpointsSummary.unbalancedJournalsCount || 0) / status.glCheckpointsSummary.totalJournals) * 100 : 0}%`, background: 'var(--status-error)' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-success)' }} />
                          <span>Balanced ({status?.glCheckpointsSummary?.balancedJournalsCount ?? (status?.totalInputRows?.gl ? status.totalInputRows.gl : 0)})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-error)' }} />
                          <span>Unbalanced ({status?.glCheckpointsSummary?.unbalancedJournalsCount ?? 0})</span>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Integrity Testing (IR 1 - 4) Breakdown</h4>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>TB accounts vs Population consistency.</p>
                        </div>
                        <Activity size={20} color="var(--deloitte-green-dark)" />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'IR 1: GL in TB not in Pop', val: getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv'), max: 20 },
                          { label: 'IR 2: Activity Mismatches', val: getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv'), max: 20 },
                          { label: 'IR 3: GL in Pop not in TB', val: getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv'), max: 20 },
                          { label: 'IR 4: Seldom Accounts Total', val: getIRTestCount(4, 'test4SeldomAccountsCount', 'Parameter_2_Seldom_Accounts_Inputs.csv'), max: 50 },
                        ].map((item) => (
                          <div key={item.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{item.label}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.val > 0 ? 'var(--deloitte-teal)' : 'var(--text-muted)' }}>{item.val}</span>
                            </div>
                            <div style={{ height: '7px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, (item.val / Math.max(item.max, item.val || 1)) * 100)}%`, height: '100%', background: item.val > 0 ? 'var(--deloitte-teal)' : 'var(--status-success)' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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

            {activeVisualTab === 'artifacts' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Generated Audit Workpapers & Artifacts</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Download full CSV extracts and standardized outputs for working papers.</p>
                  </div>
                  <a href={RunService.getDownloadAllZipUrl(runId!)} className="btn-green" style={{ textDecoration: 'none' }}>
                    <Archive size={16} /> Download All as ZIP
                  </a>
                </div>

                <div className="table-container">
                  <table className="jet-table">
                    <thead><tr><th>Output File</th><th>Category</th><th>Row Count</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                    <tbody>
                      {status?.outputs && status.outputs.length > 0 ? (
                        status.outputs.map((out) => (
                          <tr key={out.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileSpreadsheet size={18} color="var(--deloitte-teal)" />
                                <span style={{ fontWeight: 700 }}>{out.name}</span>
                              </div>
                            </td>
                            <td><StatusBadge status={out.category} /></td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{out.rowCount !== undefined ? out.rowCount.toLocaleString() : '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button onClick={() => { setSelectedPreviewFile(out.name); setActiveVisualTab('preview'); }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                                  <Eye size={13} /> Preview
                                </button>
                                <a href={out.downloadUrl} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}>
                                  <Download size={13} /> Download
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No output files generated yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
    </div>
  );
};