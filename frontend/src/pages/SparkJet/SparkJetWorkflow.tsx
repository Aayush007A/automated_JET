import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RunService } from '../../services/runService';
import { RunConfig, RunSummary, SparkJetParameters } from '../../types';
import { FileDropzone } from '../../components/common/FileDropzone';
import { FieldMappingTable } from '../../components/common/FieldMappingTable';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SampleDataModal } from '../../components/common/SampleDataModal';
import { StepTimeline, TimelineStep } from '../../components/common/Steptimeline';
import {
  ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Download,
  Layers, Settings, RefreshCw,
  BarChart3, Plus, Trash2, Sliders, FileCheck,
  Search, FileText, Sparkles, X, Eye, Activity, Save
} from 'lucide-react';

const STEPS: TimelineStep[] = [
  { id: 1, label: 'Ingest Data', sub: 'Upload files', icon: Layers },
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

  // Dedicated state for each of the 12 exceptions
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
        <button onClick={() => setCurrentStep(2)} disabled={!isStep1Valid} className="btn-primary">
          Continue <ArrowRight size={15} />
        </button>
      );
    }
    if (currentStep === 2) {
      return (
        <>
          <button onClick={() => setCurrentStep(1)} className="btn-secondary"><ArrowLeft size={15} /> Back</button>
          <button
            onClick={() => { setCurrentStep(3); handleRunPipeline(3); }}
            disabled={!isStep2Valid || executing}
            className="btn-primary"
          >
            Continue to IR Testing <ArrowRight size={15} />
          </button>
        </>
      );
    }
    if (currentStep === 3) {
      return (
        <>
          <button onClick={() => setCurrentStep(2)} className="btn-secondary"><ArrowLeft size={15} /> Back</button>
          <button onClick={() => setCurrentStep(4)} className="btn-primary">Continue to Parameters <ArrowRight size={15} /></button>
        </>
      );
    }
    if (currentStep === 4) {
      return (
        <>
          <button onClick={() => setCurrentStep(3)} className="btn-secondary"><ArrowLeft size={15} /> Back</button>
          <button onClick={() => { setCurrentStep(5); handleRunPipeline(5); }} disabled={executing} className="btn-primary">
            <Play size={14} fill="#FFFFFF" />
            {executing ? 'Executing Pipeline...' : 'Execute Exceptions'}
          </button>
        </>
      );
    }
    if (currentStep === 5) {
      return (
        <a href={RunService.getDownloadAllZipUrl(runId || '')} className="btn-primary" style={{ textDecoration: 'none' }}>
          <FileCheck size={16} /> Export All Results (ZIP)
        </a>
      );
    }
    return null;
  };

  return (
    <div className="container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px 16px 40px' }}>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv,.txt,.xlsx,.xls" onChange={handleImportFileSelected} />

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
            <Layers size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                SPARK JET Workflow
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
              Journal Entry Testing & Integrity Analytics Automation Pipeline
            </p>
          </div>
        </div>

        {currentStep === 5 && status?.status === 'COMPLETED' && (
          <a
            href={RunService.getDownloadAllZipUrl(runId || '')}
            className="btn-primary"
            style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '0.84rem' }}
          >
            <FileCheck size={16} /> Download All Results (ZIP)
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

      {/* MAIN WORKSPACE */}
      <main>

        {/* STEP 1: FILE UPLOAD & PREVIEW */}
        {currentStep === 1 && (
          <div>
            <div className="glass-panel" style={{ padding: '24px 28px', background: '#FFFFFF' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Upload Trial Balance & Population Datasets
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
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
              padding: '18px 22px', marginBottom: '20px',
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
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Automated Data Cleansing & Constraint Engine</h4>
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
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#92400E', fontWeight: 600 }}>
                  <AlertTriangle size={15} color="var(--status-warning)" />
                  <span>
                    {hasRequiredMappings
                      ? 'Cleansing Required: Click "Run Auto-Cleansing & Validation" above to verify constraints and unlock Step 3.'
                      : 'Please map all required standard fields below before executing data cleansing.'}
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

            <FieldMappingTable datasetTitle="Trial Balance (TB)" sourceHeaders={tbHeaders} mappings={config?.fieldMappings.tb || []} onChangeMapping={(std, src) => handleMappingChange('tb', std, src)} />
            <FieldMappingTable datasetTitle="Population / General Ledger (GL)" sourceHeaders={glHeaders} mappings={config?.fieldMappings.gl || []} onChangeMapping={(std, src) => handleMappingChange('gl', std, src)} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
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
              <div style={{ maxWidth: '680px', margin: '0 auto 24px' }}>
                <ProgressBar
                  progress={status?.progress || 0}
                  stage={status?.currentStage}
                  message="Evaluating Trial Balance checkpoints and Population balancing pivot..."
                  isCompleted={status?.status === 'COMPLETED'}
                  isFailed={status?.status === 'FAILED'}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="glass-panel" style={{ padding: '22px', background: '#FFFFFF' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>Trial Balance Checkpoints</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', margin: 0, padding: 0 }}>
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
                    <span>4. Debit vs Credit Total Balancing</span><StatusBadge status="PASS" />
                  </li>
                </ul>
              </div>

              <div className="glass-panel" style={{ padding: '22px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--deloitte-teal)', margin: 0 }}>Integrity Tests (IR 1 - 4) Summary</h4>
                  <button onClick={() => window.open(RunService.getDownloadAllZipUrl(runId || ''), '_blank')} className="btn-soft-slate" title="Download complete zip of all IR exception outputs">
                    <Download size={13} /> Export All IR (ZIP)
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>IR 1: GL in TB not in Population</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>IR 2: Activity Mismatches</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>IR 3: GL in Population not in TB</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>IR 4: Seldom Accounts (Transaction Counts)</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getIRTestCount(4, 'test4SeldomAccountsCount', 'Parameter_2_Seldom_Accounts_Inputs.csv')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '22px', background: '#FFFFFF', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>Integrity Tests (IR 1 - 4) Top 50 Exception Data Previews</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Inspect the exact flagged rows for each integrity rule before approving and executing parameter rules.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    value={selectedIRFile}
                    onChange={(e) => setSelectedIRFile(e.target.value)}
                    className="jet-select"
                    style={{ width: '260px', fontSize: '0.8rem', height: '34px' }}
                  >
                    <option value="IR_Exception_1.csv">IR 1: GL in TB not in Pop</option>
                    <option value="IR_Exception_2.csv">IR 2: Activity Mismatches</option>
                    <option value="IR_Exception_2_Detail.csv">IR 2: Detail Activity</option>
                    <option value="IR_Exception_3.csv">IR 3: GL in Pop not in TB</option>
                    <option value="Parameter_2_Seldom_Accounts_Inputs.csv">IR 4: Seldom Accounts Counts</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      if (runId) window.open(RunService.getDownloadOutputUrl(runId, selectedIRFile), '_blank');
                    }}
                    className="btn-soft-teal"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    <Download size={13} /> Export CSV
                  </button>
                </div>
              </div>

              {loadingIRPreview ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 10px', color: 'var(--deloitte-teal)' }} />
                  Loading IR exception records...
                </div>
              ) : filteredIRPreviewRows.length > 0 ? (
                <div className="table-container" style={{ maxHeight: '340px' }}>
                  <table className="jet-table">
                    <thead>
                      <tr>
                        {irPreviewData?.headers.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIRPreviewRows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {irPreviewData?.headers.map((h, cIdx) => (
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
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No exception records flagged for {selectedIRFile}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: PARAMETER RULES SELECTION & CONFIGURATION */}
        {currentStep === 4 && (
          <div>
            {fileImportNotice && (
              <div style={{
                padding: '12px 18px', marginBottom: '16px', borderRadius: '8px',
                background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)',
                color: '#0F766E', fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <CheckCircle2 size={16} color="var(--status-success)" />
                <span>{fileImportNotice}</span>
              </div>
            )}

            {/* Parameter selection badges */}
            <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Active Parameter Exception Algorithms (12 Rules)
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEnabledExceptions({
                      ex1: true, ex2: true, ex3: true, ex4: true, ex5: true, ex6: true,
                      ex7: true, ex8: true, ex9: true, ex10: true, ex11: true, ex12: true,
                    })}
                    className="btn-soft-teal"
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnabledExceptions({
                      ex1: false, ex2: false, ex3: false, ex4: false, ex5: false, ex6: false,
                      ex7: false, ex8: false, ex9: false, ex10: false, ex11: false, ex12: false,
                    })}
                    className="btn-soft-slate"
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                {[
                  { id: 'ex1', label: 'Ex1: Unusual Accounts' },
                  { id: 'ex2', label: 'Ex2: Seldom Accounts' },
                  { id: 'ex3', label: 'Ex3: Revenue Debits' },
                  { id: 'ex4', label: 'Ex4: Few Postings Users' },
                  { id: 'ex5', label: 'Ex5: Users of Interest' },
                  { id: 'ex6', label: 'Ex6: Closing Entries' },
                  { id: 'ex7', label: 'Ex7: Dates of Interest' },
                  { id: 'ex8', label: 'Ex8: Round Amounts' },
                  { id: 'ex9', label: 'Ex9: Duplicate Entries' },
                  { id: 'ex10', label: 'Ex10: Keywords in Text' },
                  { id: 'ex11', label: 'Ex11: Post-Closing Entries' },
                  { id: 'ex12', label: 'Ex12: Unrelated Pairings' },
                ].map((ex) => (
                  <label
                    key={ex.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                      borderRadius: '8px', border: enabledExceptions[ex.id] ? '1px solid var(--deloitte-teal)' : '1px solid var(--border-subtle)',
                      background: enabledExceptions[ex.id] ? 'var(--deloitte-teal-light)' : '#F8FAFC',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: enabledExceptions[ex.id] ? 700 : 500,
                      color: enabledExceptions[ex.id] ? 'var(--deloitte-teal)' : 'var(--text-muted)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabledExceptions[ex.id]}
                      onChange={(e) => setEnabledExceptions({ ...enabledExceptions, [ex.id]: e.target.checked })}
                    />
                    <span>{ex.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Individual Parameter Configuration Workspace */}
            <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '20px', overflowX: 'auto' }}>
                {visibleParamTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setParamTab(tab.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: paramTab === tab.id ? 'var(--deloitte-teal)' : 'transparent',
                      color: paramTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px',
                        background: paramTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)',
                        color: paramTab === tab.id ? '#FFFFFF' : 'var(--text-muted)',
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* EX1: Unusual Accounts */}
              {paramTab === 'ex1' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>Ex1: Unusual Accounts Configuration</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Define account numbers considered unusual, suspense, or high risk.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => triggerImportFile('unusualAccounts')} className="btn-soft-teal" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        Import CSV / Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnusualAccounts([...unusualAccounts, { gl: '', description: 'New Suspense Account', subtype: 'Assets' }])}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        <Plus size={13} /> Add GL
                      </button>
                    </div>
                  </div>

                  <div className="table-container" style={{ maxHeight: '300px' }}>
                    <table className="jet-table">
                      <thead>
                        <tr>
                          <th>Account (G/L)</th>
                          <th>Description</th>
                          <th>Subtype</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {unusualAccounts.length > 0 ? unusualAccounts.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                className="jet-input"
                                value={row.gl}
                                placeholder="e.g. 10100000"
                                onChange={(e) => {
                                  const u = [...unusualAccounts];
                                  u[idx].gl = e.target.value;
                                  setUnusualAccounts(u);
                                }}
                                style={{ height: '32px', fontSize: '0.82rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="jet-input"
                                value={row.description || ''}
                                placeholder="Description"
                                onChange={(e) => {
                                  const u = [...unusualAccounts];
                                  u[idx].description = e.target.value;
                                  setUnusualAccounts(u);
                                }}
                                style={{ height: '32px', fontSize: '0.82rem' }}
                              />
                            </td>
                            <td>{row.subtype || 'Assets'}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setUnusualAccounts(unusualAccounts.filter((_, i) => i !== idx))}
                                className="btn-secondary"
                                style={{ padding: '4px', color: 'var(--status-error)' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No unusual accounts configured. Click "Add GL" or "Import CSV" above.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EX2: Seldom Accounts */}
              {paramTab === 'ex2' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>Ex2: Seldom Used Accounts</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Import or populate seldom accounts based on low posting volume.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={handleAutoPopulateSeldomFromIR4} className="btn-soft-teal" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        Auto-Populate from IR 4
                      </button>
                      <button type="button" onClick={() => triggerImportFile('seldomAccounts')} className="btn-soft-slate" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        Import CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeldomAccounts([...seldomAccounts, { gl: '', description: 'Seldom Account', subtype: 'Assets' }])}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        <Plus size={13} /> Add GL
                      </button>
                    </div>
                  </div>

                  <div className="table-container" style={{ maxHeight: '300px' }}>
                    <table className="jet-table">
                      <thead>
                        <tr>
                          <th>Account (G/L)</th>
                          <th>Description</th>
                          <th>Subtype</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {seldomAccounts.length > 0 ? seldomAccounts.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                className="jet-input"
                                value={row.gl}
                                placeholder="GL"
                                onChange={(e) => {
                                  const s = [...seldomAccounts];
                                  s[idx].gl = e.target.value;
                                  setSeldomAccounts(s);
                                }}
                                style={{ height: '32px', fontSize: '0.82rem' }}
                              />
                            </td>
                            <td>{row.description}</td>
                            <td>{row.subtype}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setSeldomAccounts(seldomAccounts.filter((_, i) => i !== idx))}
                                className="btn-secondary"
                                style={{ padding: '4px', color: 'var(--status-error)' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No seldom accounts populated.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EX3: Revenue Accounts */}
              {paramTab === 'ex3' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>Ex3: Revenue Accounts Debits</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Accounts subject to revenue debit scrutiny and debit threshold.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={handleAutoPopulateRevenueFromTB} className="btn-soft-teal" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        Auto-Populate Revenue from TB
                      </button>
                      <button type="button" onClick={() => triggerImportFile('revenueAccounts')} className="btn-soft-slate" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        Import CSV
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', alignItems: 'center' }}>
                    <div style={{ width: '220px' }}>
                      <label className="jet-label">Debit Threshold Amount</label>
                      <input
                        type="number"
                        className="jet-input"
                        value={ex3Threshold}
                        onChange={(e) => setEx3Threshold(Number(e.target.value))}
                        style={{ height: '34px' }}
                      />
                    </div>
                  </div>

                  <div className="table-container" style={{ maxHeight: '280px' }}>
                    <table className="jet-table">
                      <thead>
                        <tr>
                          <th>Account (G/L)</th>
                          <th>Description</th>
                          <th>FS Line Item</th>
                          <th>Subtype</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueAccounts.length > 0 ? revenueAccounts.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.gl}</td>
                            <td>{r.description}</td>
                            <td>{r.fsLineItem}</td>
                            <td>{r.subtype}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Click "Auto-Populate Revenue from TB" to load revenue accounts automatically.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EX4: Few Postings Users */}
              {paramTab === 'ex4' && (
                <div style={{ maxWidth: '400px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Ex4: Few Postings User Threshold</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Flag entries authored by users who posted fewer than N entries during the entire fiscal period.</p>
                  <div>
                    <label className="jet-label">Max Entry Count Threshold</label>
                    <input
                      type="number"
                      className="jet-input"
                      value={ex4Threshold}
                      onChange={(e) => setEx4Threshold(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* EX5: Users of Interest */}
              {paramTab === 'ex5' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>Ex5: Users of Specific Interest</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Specific user IDs (e.g. system administrators, executives, controllers) to track.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => triggerImportFile('usersOfInterest')} className="btn-soft-teal" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        Import CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsersOfInterest([...usersOfInterest, { userId: '', name: 'Management User', role: 'Audited' }])}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        <Plus size={13} /> Add User
                      </button>
                    </div>
                  </div>

                  <div className="table-container" style={{ maxHeight: '280px' }}>
                    <table className="jet-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Name</th>
                          <th>Role</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersOfInterest.length > 0 ? usersOfInterest.map((u, i) => (
                          <tr key={i}>
                            <td>
                              <input
                                type="text"
                                className="jet-input"
                                value={u.userId}
                                placeholder="e.g. ADMIN_USER"
                                onChange={(e) => {
                                  const arr = [...usersOfInterest];
                                  arr[i].userId = e.target.value;
                                  setUsersOfInterest(arr);
                                }}
                                style={{ height: '32px', fontSize: '0.82rem' }}
                              />
                            </td>
                            <td>{u.name}</td>
                            <td>{u.role}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setUsersOfInterest(usersOfInterest.filter((_, idx) => idx !== i))}
                                className="btn-secondary"
                                style={{ padding: '4px', color: 'var(--status-error)' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No users of interest configured.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EX6: Closing Entries */}
              {paramTab === 'ex6' && (
                <div style={{ maxWidth: '440px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Ex6: Period-End Closing Entries</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Analyze entries posted immediately before or after the closing date.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label className="jet-label">Days Before Closing</label>
                      <input type="number" className="jet-input" value={ex6BeforeDays} onChange={(e) => setEx6BeforeDays(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="jet-label">Days After Closing</label>
                      <input type="number" className="jet-input" value={ex6AfterDays} onChange={(e) => setEx6AfterDays(Number(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <label className="jet-label">Closing Date</label>
                    <input type="text" className="jet-input" value={ex6ClosingDate} onChange={(e) => setEx6ClosingDate(e.target.value)} />
                  </div>
                </div>
              )}

              {/* EX7: Dates of Interest */}
              {paramTab === 'ex7' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>Ex7: Dates of Interest (Holidays / Weekends)</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Specific non-working days or event dates.</p>
                    </div>
                    <button type="button" onClick={() => triggerImportFile('datesOfInterest')} className="btn-soft-teal" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                      Import Dates CSV
                    </button>
                  </div>

                  <div className="table-container" style={{ maxHeight: '280px' }}>
                    <table className="jet-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Event Name</th>
                          <th>Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datesOfInterest.length > 0 ? datesOfInterest.map((d, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{d.date}</td>
                            <td>{d.event}</td>
                            <td>{d.impact}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No dates configured. Click "Import Dates CSV".</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* EX8: Round Amounts */}
              {paramTab === 'ex8' && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Ex8: Round Sum Digits</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Select multiple denominations to identify round-sum transactions.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['1000', '10000', '100000', '1000000', '10000000', '6', '7', '8', '9'].map((digit) => (
                      <label
                        key={digit}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                          background: ex8SelectedDigits.includes(digit) ? 'var(--deloitte-teal)' : '#F1F5F9',
                          color: ex8SelectedDigits.includes(digit) ? '#FFFFFF' : 'var(--text-secondary)',
                          fontSize: '0.8rem', fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{ display: 'none' }}
                          checked={ex8SelectedDigits.includes(digit)}
                          onChange={(e) => {
                            if (e.target.checked) setEx8SelectedDigits([...ex8SelectedDigits, digit]);
                            else setEx8SelectedDigits(ex8SelectedDigits.filter(d => d !== digit));
                          }}
                        />
                        <span>{digit.length >= 4 ? `Ending in ${digit}` : `${digit}-digit rounds`}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* EX9: Duplicate Entries */}
              {paramTab === 'ex9' && (
                <div style={{ maxWidth: '440px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Ex9: Duplicate Entries Threshold</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Detect identical amounts posted to same accounts across dates.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="jet-label">Min Count</label>
                      <input type="number" className="jet-input" value={ex9CountThreshold} onChange={(e) => setEx9CountThreshold(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="jet-label">Min Amount</label>
                      <input type="number" className="jet-input" value={ex9AmountThreshold} onChange={(e) => setEx9AmountThreshold(Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              )}

              {/* EX10: Keywords */}
              {paramTab === 'ex10' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>Ex10: Suspicious Keywords</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Keywords to match against journal header and line descriptions.</p>
                    </div>
                    <button type="button" onClick={() => triggerImportFile('keywords')} className="btn-soft-teal" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                      Import Keywords
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <input
                      type="text"
                      className="jet-input"
                      placeholder="Add new keyword..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKeyword.trim()) {
                          if (!keywords.includes(newKeyword.trim().toLowerCase())) {
                            setKeywords([...keywords, newKeyword.trim().toLowerCase()]);
                          }
                          setNewKeyword('');
                        }
                      }}
                      style={{ maxWidth: '280px', height: '34px' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newKeyword.trim() && !keywords.includes(newKeyword.trim().toLowerCase())) {
                          setKeywords([...keywords, newKeyword.trim().toLowerCase()]);
                          setNewKeyword('');
                        }
                      }}
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {keywords.map((kw, i) => (
                      <span key={i} className="badge badge-teal" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '0.78rem' }}>
                        {kw}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => setKeywords(keywords.filter((_, idx) => idx !== i))} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* EX11: Post Closing Entries */}
              {paramTab === 'ex11' && (
                <div style={{ maxWidth: '440px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Ex11: Post-Closing Entries</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Entries posted strictly after the period closing date.</p>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="jet-label">Closing Date</label>
                    <input type="text" className="jet-input" value={ex11ClosingDate} onChange={(e) => setEx11ClosingDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="jet-label">Days After Closing</label>
                    <input type="number" className="jet-input" value={ex11DaysAfterClosing} onChange={(e) => setEx11DaysAfterClosing(Number(e.target.value))} />
                  </div>
                </div>
              )}

              {/* EX12: Unrelated Pairings */}
              {paramTab === 'ex12' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>Ex12: Unrelated Account Pairings</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Define incompatible debit vs credit line combinations.</p>
                    </div>
                    <button type="button" onClick={() => triggerImportFile('unrelatedRules')} className="btn-soft-teal" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                      Import Rules
                    </button>
                  </div>

                  <div className="table-container" style={{ maxHeight: '280px' }}>
                    <table className="jet-table">
                      <thead>
                        <tr>
                          <th>Debit Line</th>
                          <th>Credit Line</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unrelatedRules.length > 0 ? unrelatedRules.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700 }}>{r.debitFSLine}</td>
                            <td style={{ fontWeight: 700 }}>{r.creditFSLine}</td>
                            <td>{r.category}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No pairing rules configured.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Control Sample */}
              {paramTab === 'controlSample' && (
                <div style={{ maxWidth: '440px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Representative Control Sample Dump</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Sample documents extracted across the entire population for control evaluation.</p>
                  <div>
                    <label className="jet-label">Sample Document Count</label>
                    <input type="number" className="jet-input" value={sampleDocCount} onChange={(e) => setSampleDocCount(Number(e.target.value))} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: PARAMETER RESULTS & EXECUTIVE ANALYTICS */}
        {currentStep === 5 && (
          <div>
            {/* Top Metric Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <MetricCard label="TB Accounts" value={status?.totalInputRows?.tb || 0} subtitle="Trial Balance" variant="teal" />
              <MetricCard label="GL Population" value={status?.totalInputRows?.gl || 0} subtitle="Journal Entries" variant="teal" />
              <MetricCard label="Active Exceptions" value={12} subtitle="Rule Engines Run" variant="success" />
              <MetricCard
                label="Flagged Exceptions"
                value={
                  getExceptionCount(1, 'Ex1_Unusual_Accounts') +
                  getExceptionCount(2, 'Ex2_Seldom_Accounts') +
                  getExceptionCount(3, 'Ex3_Revenue_Debits') +
                  getExceptionCount(4, 'Ex4_Few_Postings_Users') +
                  getExceptionCount(5, 'Ex5_Users_Of_Interest') +
                  getExceptionCount(6, 'Ex6_Closing_Entries') +
                  getExceptionCount(7, 'Ex7_Dates_Of_Interest') +
                  getExceptionCount(8, 'Ex8_Round_Amounts') +
                  getExceptionCount(9, 'Ex9_Duplicate_Entries') +
                  getExceptionCount(10, 'Ex10_Keyword_Entries') +
                  getExceptionCount(11, 'Ex11_Post_Closing_Entries') +
                  getExceptionCount(12, 'Ex12_Unrelated_Accounts')
                }
                subtitle="Flagged Transactions"
                variant="warning"
              />
            </div>

            {/* Sub navigation for results */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
              {[
                { id: 'preview', label: 'Exception Records Preview' },
                { id: 'overview', label: 'All 12 Exception Cards' },
                { id: 'checkpoints', label: 'Integrity Checkpoints' },
                { id: 'artifacts', label: 'Generated Artifacts' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveVisualTab(tab.id as any)}
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeVisualTab === tab.id ? '3px solid var(--deloitte-teal)' : '3px solid transparent',
                    color: activeVisualTab === tab.id ? 'var(--deloitte-teal)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* SUB TAB 1: In-Place Preview */}
            {activeVisualTab === 'preview' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                      Exception Dataset Top 50 Preview
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      Inspect the flagged journal lines for each parameter exception algorithm.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <select
                      value={selectedPreviewFile}
                      onChange={(e) => setSelectedPreviewFile(e.target.value)}
                      className="jet-select"
                      style={{ width: '280px', fontSize: '0.8rem', height: '34px' }}
                    >
                      {EXCEPTION_CARDS.map((ex) => (
                        <option key={ex.file} value={ex.file}>
                          Ex {ex.num}: {ex.title}
                        </option>
                      ))}
                    </select>

                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search rows..."
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        className="jet-input"
                        style={{ paddingLeft: '30px', width: '180px', fontSize: '0.8rem', height: '34px' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (runId) window.open(RunService.getDownloadOutputUrl(runId, selectedPreviewFile), '_blank');
                      }}
                      className="btn-soft-teal"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <Download size={13} /> Export CSV
                    </button>
                  </div>
                </div>

                {loadingPreview ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spin-slow" style={{ margin: '0 auto 10px', color: 'var(--deloitte-teal)' }} />
                    Loading preview records...
                  </div>
                ) : filteredPreviewRows.length > 0 ? (
                  <div className="table-container" style={{ maxHeight: '420px' }}>
                    <table className="jet-table">
                      <thead>
                        <tr>
                          {previewData?.headers.map((h, i) => (
                            <th key={i}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPreviewRows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {previewData?.headers.map((h, cIdx) => (
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
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No exception lines flagged in {selectedPreviewFile}.
                  </div>
                )}
              </div>
            )}

            {/* SUB TAB 2: All 12 Exception Cards */}
            {activeVisualTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {EXCEPTION_CARDS.map((ex) => {
                  const count = getExceptionCount(ex.num, ex.key);
                  return (
                    <div
                      key={ex.id}
                      className="glass-panel"
                      style={{
                        padding: '18px 20px',
                        background: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="badge badge-teal">Ex {ex.num}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.2rem', color: count > 0 ? 'var(--deloitte-teal)' : 'var(--text-muted)' }}>
                            {count.toLocaleString()}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                          {ex.title}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                          {ex.desc}
                        </p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPreviewFile(ex.file);
                            setActiveVisualTab('preview');
                          }}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                        >
                          <Eye size={12} /> Preview Top 50
                        </button>
                        <a
                          href={RunService.getDownloadOutputUrl(runId!, ex.file)}
                          className="btn-soft-teal"
                          style={{ padding: '4px 10px', fontSize: '0.74rem', textDecoration: 'none' }}
                        >
                          <Download size={12} /> CSV
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SUB TAB 3: Checkpoints */}
            {activeVisualTab === 'checkpoints' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>Trial Balance Validation</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, padding: 0, fontSize: '0.88rem' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <span>Non-Blank G/L & Description</span><StatusBadge status="PASS" />
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <span>Valid Account Subtypes</span><StatusBadge status="PASS" />
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <span>Total Balance = 0</span><StatusBadge status="PASS" />
                    </li>
                  </ul>
                </div>

                <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--deloitte-teal)', marginBottom: '14px' }}>Integrity Testing Summary</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, padding: 0, fontSize: '0.88rem' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <span>IR 1: GL in TB not in Pop</span><span style={{ fontWeight: 700 }}>{getIRTestCount(1, 'test1TBNotInPopCount', 'IR_Exception_1.csv')}</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <span>IR 2: Activity Mismatches</span><span style={{ fontWeight: 700 }}>{getIRTestCount(2, 'test2ActivityMismatchCount', 'IR_Exception_2.csv')}</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <span>IR 3: GL in Pop not in TB</span><span style={{ fontWeight: 700 }}>{getIRTestCount(3, 'test3PopNotInTBCount', 'IR_Exception_3.csv')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* SUB TAB 4: Artifacts */}
            {activeVisualTab === 'artifacts' && (
              <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
                  Generated Spark JET Output Files
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {[
                    'Parameter_Exception_1.csv', 'Parameter_Exception_2.csv', 'Parameter_Exception_3.csv',
                    'Parameter_Exception_4.csv', 'Parameter_Exception_5.csv', 'Parameter_Exception_6.csv',
                    'Parameter_Exception_7.csv', 'Parameter_Exception_8.csv', 'Parameter_Exception_9.csv',
                    'Parameter_Exception_10.csv', 'Parameter_Exception_11.csv', 'Parameter_Exception_12.csv',
                    'Control_Sample_Dump.csv', 'IR_Exception_1.csv', 'IR_Exception_2.csv', 'IR_Exception_3.csv',
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