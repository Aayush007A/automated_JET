import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  BarController,
  LineController,
  RadarController
} from 'chart.js';
import { Chart, Radar } from 'react-chartjs-2';
import {
  ShieldAlert, Sparkles, Scale, AlertTriangle, CheckCircle2,
  FileText, Copy, Download, Search, Filter, Eye, ChevronRight,
  TrendingUp, Clock, UserCheck, Lock, Activity, ArrowUpRight,
  HelpCircle, Check, X, RefreshCw, BarChart3, Building, Mail,
  Calendar, DollarSign, Tag, CheckSquare, Hash, Layers, ShieldCheck,
  Building2, Dna, Cpu, AlertCircle, Briefcase, Award, CheckCheck,
  Share2, ArrowRight
} from 'lucide-react';
import { RunSummary, RunConfig } from '../../types';

// Register Chart.js Modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  BarController,
  LineController,
  RadarController
);

interface ExecutiveForensicIntelligenceHubProps {
  runId?: string;
  status: RunSummary | null;
  config: RunConfig | null;
}

interface DispositionRecord {
  id: string;
  docNo: string;
  date: string;
  user: string;
  account: string;
  accountName: string;
  amount: number;
  riskScore: number;
  riskDrivers: string[];
  disposition: 'PENDING' | 'INVESTIGATED_VALID' | 'CLIENT_INQUIRY' | 'CONTROL_DEFICIENCY' | 'ADJUSTMENT_REQUIRED';
  auditorNotes: string;
}

interface SoxAssertionRecord {
  id: string;
  assertion: string;
  description: string;
  mappedJetTests: string[];
  flaggedCount: number;
  dollarAtRisk: number;
  severity: 'EFFECTIVE' | 'OPERATIONAL_DEFICIENCY' | 'SIGNIFICANT_DEFICIENCY' | 'MATERIAL_WEAKNESS';
  status: 'PENDING_REVIEW' | 'EVALUATED_DEFICIENCY' | 'CONCLUDED_SATISFACTORY' | 'ESCALATED_PARTNER';
  remediationPlan: string;
  signedOff: boolean;
  signedBy?: string;
}

export const ExecutiveForensicIntelligenceHub: React.FC<ExecutiveForensicIntelligenceHubProps> = ({
  runId,
  status,
  config,
}) => {
  const [activeIntelligenceTab, setActiveIntelligenceTab] = useState<'memo' | 'benford' | 'risk_scoring' | 'dna_benchmark' | 'sox_coso'>('memo');
  const [selectedBenfordDigit, setSelectedBenfordDigit] = useState<number | null>(null);
  const [selectedRiskTransaction, setSelectedRiskTransaction] = useState<DispositionRecord | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedSoxMemo, setCopiedSoxMemo] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [dispositionFilter, setDispositionFilter] = useState<string>('ALL');

  // Pillar 4: DNA Benchmark State
  const [selectedSector, setSelectedSector] = useState<'manufacturing' | 'technology' | 'retail' | 'financial' | 'healthcare'>('manufacturing');

  // Pillar 5: SOX 404 Scorecard State
  const [soxAssertions, setSoxAssertions] = useState<SoxAssertionRecord[]>([
    {
      id: 'sox_exist',
      assertion: 'Existence & Occurrence',
      description: 'Recorded transactions represent valid economic events and are not fictitious or duplicated.',
      mappedJetTests: ['Ex 1 (Unusual Accounts)', 'Ex 9 (Duplicate Entries)', 'Ex 10 (Fraud & Error Keywords)'],
      flaggedCount: 15,
      dollarAtRisk: 1240500,
      severity: 'OPERATIONAL_DEFICIENCY',
      status: 'EVALUATED_DEFICIENCY',
      remediationPlan: 'Implement dual-approval controls on manual clearing account postings over $100k.',
      signedOff: true,
      signedBy: 'A. Upadhyay (Senior Audit Manager)',
    },
    {
      id: 'sox_comp',
      assertion: 'Completeness & Ledger Ingestion',
      description: 'All valid journal entries and subledger transactions are fully recorded in the General Ledger.',
      mappedJetTests: ['IR 1 (Missing TB Accounts)', 'IR 3 (Unrecorded GL Accounts)', 'DQC 01a (Account Integrity)'],
      flaggedCount: 0,
      dollarAtRisk: 0,
      severity: 'EFFECTIVE',
      status: 'CONCLUDED_SATISFACTORY',
      remediationPlan: 'Automated SAP to Parquet pipeline verified 100% complete with 0 variance.',
      signedOff: true,
      signedBy: 'Lead Audit Partner',
    },
    {
      id: 'sox_val',
      assertion: 'Valuation & Mathematical Accuracy',
      description: 'Transactions are recorded at the correct monetary amount, properly debited, credited, and netted.',
      mappedJetTests: ['IR 2 (Net Activity Variance)', 'IR 4 (Unbalanced Journal Entries)', 'Ex 8 (Round Sum Multiples)'],
      flaggedCount: 8,
      dollarAtRisk: 420000,
      severity: 'EFFECTIVE',
      status: 'CONCLUDED_SATISFACTORY',
      remediationPlan: 'Zero balance sheet variance. Round amounts sampled and verified against supplier invoices.',
      signedOff: true,
      signedBy: 'A. Upadhyay (Senior Audit Manager)',
    },
    {
      id: 'sox_cutoff',
      assertion: 'Cutoff & Period-End Timing',
      description: 'Transactions and manual adjustments are recorded in the proper accounting period without premature recognition.',
      mappedJetTests: ['Ex 6 (Closing Entries +/- 10d)', 'Ex 7 (Holiday Postings)', 'Ex 11 (Post-Closing Entries)'],
      flaggedCount: 24,
      dollarAtRisk: 3850000,
      severity: 'SIGNIFICANT_DEFICIENCY',
      status: 'ESCALATED_PARTNER',
      remediationPlan: 'Enforce SAP hard period-end lockout at 23:59 on fiscal cutoff date to eliminate backdated entries.',
      signedOff: false,
    },
    {
      id: 'sox_rights',
      assertion: 'Rights, Obligations & Segregation of Duties',
      description: 'Journal postings comply with user authorization limits without superuser bypassing or conflicting account pairings.',
      mappedJetTests: ['Ex 12 (Unrelated Account Pairings)', 'Ex 4 (Few-Posting Users)', 'Ex 5 (Key Personnel Postings)'],
      flaggedCount: 11,
      dollarAtRisk: 890000,
      severity: 'OPERATIONAL_DEFICIENCY',
      status: 'EVALUATED_DEFICIENCY',
      remediationPlan: 'Revoke direct database posting privileges for IT service accounts and reassign to Finance team.',
      signedOff: true,
      signedBy: 'A. Upadhyay (Senior Audit Manager)',
    },
  ]);

  // Client parameters from config or sensible defaults
  const engagementName = config?.sparkParameters?.engagementName || 'Tangerine Skies Pvt Ltd - JET Audit FY26';
  const materiality = typeof config?.sparkParameters?.materiality === 'number'
    ? config.sparkParameters.materiality
    : 500000;
  const currencyCode = config?.sparkParameters?.currencyCode || 'USD';

  const fmtCurr = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(val);
  const fmtNum = (val: number) => new Intl.NumberFormat('en-US').format(val);

  // ── 1. BENFORD'S LAW FORENSIC ENGINE ──
  const benfordTheoretical = useMemo(() => [
    30.1, // 1
    17.6, // 2
    12.5, // 3
    9.7,  // 4
    7.9,  // 5
    6.7,  // 6
    5.8,  // 7
    5.1,  // 8
    4.6,  // 9
  ], []);

  const benfordActual = useMemo(() => [
    29.4, // 1
    18.2, // 2
    11.9, // 3
    10.3, // 4
    8.4,  // 5
    6.2,  // 6
    9.1,  // 7: Anomalous concentration
    4.2,  // 8
    2.3,  // 9
  ], []);

  const chiSquareScore = useMemo(() => {
    let chiSq = 0;
    for (let i = 0; i < 9; i++) {
      const exp = benfordTheoretical[i];
      const obs = benfordActual[i];
      chiSq += Math.pow(obs - exp, 2) / exp;
    }
    return parseFloat(chiSq.toFixed(2));
  }, [benfordTheoretical, benfordActual]);

  const benfordChartData = useMemo(() => ({
    labels: ['Digit 1', 'Digit 2', 'Digit 3', 'Digit 4', 'Digit 5', 'Digit 6', 'Digit 7', 'Digit 8', 'Digit 9'],
    datasets: [
      {
        type: 'bar' as const,
        label: 'Actual Population Frequency (%)',
        data: benfordActual,
        backgroundColor: benfordActual.map((_, idx) => {
          if (selectedBenfordDigit !== null && selectedBenfordDigit !== idx + 1) return 'rgba(0, 118, 128, 0.2)';
          if (idx === 6) return 'rgba(220, 38, 38, 0.85)'; // Red for Digit 7 anomaly
          return 'rgba(0, 118, 128, 0.85)'; // Deloitte Teal
        }),
        borderColor: benfordActual.map((_, idx) => idx === 6 ? '#B91C1C' : '#007680'),
        borderWidth: 1.5,
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'line' as const,
        label: "Theoretical Benford's Law Standard (%)",
        data: benfordTheoretical,
        borderColor: '#0284C7',
        borderWidth: 2.5,
        borderDash: [5, 5],
        pointBackgroundColor: '#0284C7',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.35,
        order: 1,
      },
    ],
  }), [benfordActual, benfordTheoretical, selectedBenfordDigit]);

  const benfordChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter, sans-serif', size: 12, weight: '600' },
          color: '#334155',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: '700' },
        bodyFont: { size: 12 },
        callbacks: {
          afterBody: (context: any) => {
            const digit = context[0].dataIndex + 1;
            if (digit === 7) {
              return ['⚠️ Anomaly Alert: Significant +3.3% concentration spike vs theoretical standard.'];
            }
            return [];
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { weight: '600' }, color: '#475569' } },
      y: {
        grid: { color: '#E2E8F0', drawBorder: false },
        ticks: { callback: (val: any) => `${val}%`, color: '#64748B' },
        title: { display: true, text: 'Distribution Percentage (%)', color: '#64748B', font: { size: 11, weight: '600' } },
      },
    },
  };

  // ── 2. MULTI-VECTOR RISK RADAR DATA ──
  const [dispositionList, setDispositionList] = useState<DispositionRecord[]>([
    {
      id: 'TRX-10192',
      docNo: '2500007294',
      date: '31-Dec-2025 (23:48)',
      user: 'IT_ADMIN_SERVICE',
      account: '41001400',
      accountName: 'Core Product Sales - Domestic',
      amount: 1339512.0,
      riskScore: 94,
      riskDrivers: ['Post-Closing Window', 'Superuser Author', 'Debit to Revenue', 'High Amount > Materiality'],
      disposition: 'PENDING',
      auditorNotes: 'Escalated to Engagement Partner for mandatory client inquiry.',
    },
    {
      id: 'TRX-10245',
      docNo: '2500008412',
      date: '25-Dec-2025 (Holiday)',
      user: 'CONTROLLER_MGR',
      account: '11401000',
      accountName: 'Trade Receivables Clearing',
      amount: 798689.0,
      riskScore: 88,
      riskDrivers: ['Holiday Posting', 'Manual Override', 'Round Multiplier ($10k)'],
      disposition: 'INVESTIGATED_VALID',
      auditorNotes: 'Sampled for substantive testing. Matched with authorized holiday wire settlement.',
    },
    {
      id: 'TRX-10388',
      docNo: '2500009100',
      date: '31-Dec-2025 (23:59)',
      user: 'TEMP_FINANCE_01',
      account: '99000000',
      accountName: 'Unallocated Suspense Clearing',
      amount: 2500000.0,
      riskScore: 97,
      riskDrivers: ['Suspense Account', 'Post-Closing Adjust', 'User with Few Postings', 'Amount 5x Materiality'],
      disposition: 'CLIENT_INQUIRY',
      auditorNotes: 'Client Inquiry email drafted. Awaiting supporting bank statement.',
    },
    {
      id: 'TRX-10411',
      docNo: '2500010022',
      date: '02-Jan-2026',
      user: 'SATPUTD',
      account: '52002500',
      accountName: 'Seldom Consulting Expenses',
      amount: 450000.0,
      riskScore: 82,
      riskDrivers: ['Seldom Used Account (Count=2)', 'Duplicate Entry Hash Match'],
      disposition: 'CONTROL_DEFICIENCY',
      auditorNotes: 'Lack of automated PO matching detected in vendor procurement module.',
    },
    {
      id: 'TRX-10519',
      docNo: '2500011409',
      date: '28-Dec-2025',
      user: 'SYSTEM_BATCH',
      account: '11202200',
      accountName: 'Deferred Revenue Intercompany',
      amount: 1135180.0,
      riskScore: 76,
      riskDrivers: ['Unrelated Debit/Credit Pairing', 'Unusual Account Subtype'],
      disposition: 'PENDING',
      auditorNotes: 'Under substantive audit review.',
    },
  ]);

  const filteredDispositions = useMemo(() => {
    return dispositionList.filter((item) => {
      const matchSearch = searchFilter === '' ||
        item.docNo.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.user.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.account.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.accountName.toLowerCase().includes(searchFilter.toLowerCase());
      const matchDisp = dispositionFilter === 'ALL' || item.disposition === dispositionFilter;
      return matchSearch && matchDisp;
    });
  }, [dispositionList, searchFilter, dispositionFilter]);

  const handleUpdateDisposition = (id: string, newDisp: DispositionRecord['disposition'], note?: string) => {
    setDispositionList((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, disposition: newDisp, auditorNotes: note !== undefined ? note : item.auditorNotes }
          : item
      )
    );
  };

  // ── 3. PILLAR 4: DIGITAL ACCOUNTING DNA & SECTOR BENCHMARK DATA ──
  const sectorBenchmarks: Record<string, { name: string; benchmark: number[]; percentiles: number[] }> = {
    manufacturing: {
      name: 'Manufacturing & Industrial (Peer Median)',
      benchmark: [7.5, 1.2, 1.5, 12.0, 45.0, 98.5],
      percentiles: [94, 98, 86, 91, 88, 92],
    },
    technology: {
      name: 'Technology & SaaS Enterprise',
      benchmark: [4.2, 0.8, 1.0, 8.5, 38.0, 99.0],
      percentiles: [97, 99, 92, 95, 93, 89],
    },
    retail: {
      name: 'Retail & Consumer Goods',
      benchmark: [12.0, 3.5, 2.8, 15.0, 52.0, 96.0],
      percentiles: [82, 89, 78, 85, 80, 95],
    },
    financial: {
      name: 'Financial Services & Banking',
      benchmark: [3.1, 0.4, 0.6, 6.0, 28.0, 99.5],
      percentiles: [98, 99, 96, 98, 95, 87],
    },
    healthcare: {
      name: 'Healthcare & Pharmaceuticals',
      benchmark: [8.9, 1.8, 1.9, 14.2, 48.0, 97.2],
      percentiles: [90, 95, 88, 89, 84, 94],
    },
  };

  const clientDnaMetrics = useMemo(() => [
    { label: 'Manual Journal Volume (%)', client: 18.4, unit: '%', desc: 'Ratio of manual override journals vs automated ERP system feeds' },
    { label: 'Off-Hours & Weekend Postings (%)', client: 6.8, unit: '%', desc: 'Entries created on Saturdays, Sundays, or outside 07:00-19:00' },
    { label: 'Round Dollar Amount Density (%)', client: 4.2, unit: '%', desc: 'Transactions ending in exact multiples of $10k, $50k, or $100k' },
    { label: 'Year-End Closing Concentration (%)', client: 28.5, unit: '%', desc: 'Share of total annual manual adjustments booked +/- 3 days of period-end' },
    { label: 'Superuser Authorization Concentration (%)', client: 74.0, unit: '%', desc: 'Percentage of all manual entries posted by the top 3 finance users' },
    { label: "Benford's Law Conformity Score (%)", client: 96.2, unit: '%', desc: 'Mathematical first-digit goodness-of-fit (Grade A baseline: >95%)' },
  ], []);

  const dnaRadarData = useMemo(() => {
    const currentBench = sectorBenchmarks[selectedSector];
    return {
      labels: [
        'Manual Journal Ratio',
        'Weekend / Off-Hours',
        'Round Dollar Density',
        'Year-End Closing Rush',
        'Author Concentration',
        'Benford Conformance',
      ],
      datasets: [
        {
          label: `${engagementName.split(' - ')[0]} (Client DNA Profile)`,
          data: clientDnaMetrics.map(m => m.client),
          backgroundColor: 'rgba(0, 118, 128, 0.25)',
          borderColor: '#007680',
          borderWidth: 2.5,
          pointBackgroundColor: '#007680',
          pointBorderColor: '#FFFFFF',
          pointHoverBackgroundColor: '#FFFFFF',
          pointHoverBorderColor: '#007680',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: currentBench.name,
          data: currentBench.benchmark,
          backgroundColor: 'rgba(2, 132, 199, 0.12)',
          borderColor: '#0284C7',
          borderWidth: 2,
          borderDash: [4, 4],
          pointBackgroundColor: '#0284C7',
          pointBorderColor: '#FFFFFF',
          pointHoverBackgroundColor: '#FFFFFF',
          pointHoverBorderColor: '#0284C7',
          pointRadius: 3.5,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [selectedSector, clientDnaMetrics, engagementName]);

  const dnaRadarOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter, sans-serif', size: 12, weight: '600' },
          color: '#334155',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: '700' },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      r: {
        angleLines: { color: '#E2E8F0' },
        grid: { color: '#E2E8F0' },
        pointLabels: {
          font: { family: 'Inter, sans-serif', size: 11, weight: '700' },
          color: '#1E293B',
        },
        ticks: { display: false },
        suggestedMin: 0,
        suggestedMax: 80,
      },
    },
  };

  // ── 4. PILLAR 5: SOX 404 HANDLERS ──
  const handleUpdateSoxSeverity = (id: string, severity: SoxAssertionRecord['severity']) => {
    setSoxAssertions(prev =>
      prev.map(item => item.id === id ? { ...item, severity } : item)
    );
  };

  const handleUpdateSoxRemediation = (id: string, remediationPlan: string) => {
    setSoxAssertions(prev =>
      prev.map(item => item.id === id ? { ...item, remediationPlan } : item)
    );
  };

  const handleToggleSoxSignoff = (id: string) => {
    setSoxAssertions(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              signedOff: !item.signedOff,
              signedBy: !item.signedOff ? 'A. Upadhyay (Senior Audit Manager)' : undefined,
            }
          : item
      )
    );
  };

  const soxSummaryStats = useMemo(() => {
    const matWeakness = soxAssertions.filter(a => a.severity === 'MATERIAL_WEAKNESS').length;
    const sigDef = soxAssertions.filter(a => a.severity === 'SIGNIFICANT_DEFICIENCY').length;
    const opDef = soxAssertions.filter(a => a.severity === 'OPERATIONAL_DEFICIENCY').length;
    const effective = soxAssertions.filter(a => a.severity === 'EFFECTIVE').length;
    const totalExposure = soxAssertions.reduce((acc, a) => acc + a.dollarAtRisk, 0);
    return { matWeakness, sigDef, opDef, effective, totalExposure };
  }, [soxAssertions]);

  const copySoxMemoToClipboard = () => {
    const memoText = `
DELOITTE AUDIT & ASSURANCE | SOX 404 & COSO INTERNAL CONTROL DEFICIENCY MEMORANDUM
Engagement: ${engagementName}
Materiality Benchmark: ${fmtCurr(materiality)}
Evaluation Date: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
PCAOB AS 2201 Control Standard Assessment:

OVERALL CONTROL ENVIRONMENT SUMMARY:
- Material Weaknesses: ${soxSummaryStats.matWeakness}
- Significant Deficiencies: ${soxSummaryStats.sigDef}
- Operational Control Deviations: ${soxSummaryStats.opDef}
- Effective Control Assertions: ${soxSummaryStats.effective}
- Aggregate Flagged Dollar Exposure: ${fmtCurr(soxSummaryStats.totalExposure)}

COSO 2013 ASSERTION ASSESSMENTS:
${soxAssertions.map(a => `
[${a.assertion.toUpperCase()}]
Severity: ${a.severity.replace('_', ' ')}
Flagged JET Exceptions: ${a.flaggedCount} entries (${fmtCurr(a.dollarAtRisk)})
Mapped Tests: ${a.mappedJetTests.join(', ')}
Management Remediation: ${a.remediationPlan}
Sign-off: ${a.signedOff ? `Signed off by ${a.signedBy}` : 'PENDING REVIEW'}
`).join('\n')}

CONFIDENTIAL AUDIT COMMITTEE WORKPAPER
    `.trim();

    navigator.clipboard.writeText(memoText);
    setCopiedSoxMemo(true);
    setTimeout(() => setCopiedSoxMemo(false), 2500);
  };

  const copyMemoToClipboard = () => {
    const memoText = `
DELOITTE AUDIT & ASSURANCE | JET EXECUTIVE FINDINGS & CFO BRIEFING MEMO
Engagement: ${engagementName}
Evaluation Period: FY2026 | Materiality: ${fmtCurr(materiality)}
Population Coverage: 100% General Ledger Assurance (50,000 Records)

1. EXECUTIVE SUMMARY & RECONCILIATION INTEGRITY
- Total Ledger Records Tested: 50,000 journal entries ($1.84B Gross Volume).
- Trial Balance to GL Reconciliation: 100% Mathematically Reconciled ($0.00 Net Variance).
- High-Risk Anomalies Requiring Management Review: 5 Critical Records.

2. FORENSIC FIRST-DIGIT ANALYSIS (BENFORD'S LAW)
- Overall Population Conformance Grade: Grade A (Chi-Square: ${chiSquareScore}, Critical Threshold: 15.51).
- Key Area of Interest: Digit 7 shows an anomalous +3.3% concentration spike, driven by recurring $79,800 threshold transactions.

3. MULTI-VECTOR RISK CORRELATION
- Identified 5 transaction vectors combining post-closing adjustments, superuser privileges, and revenue debits.
- Management inquiry initiated for Document #2500009100 ($2.50M suspense adjustment).

4. AUDIT COMMITTEE & INTERNAL CONTROLS RECOMMENDATION
- Strengthen segregation of duties on IT administrative posting accounts.
- Enforce strict hard period-end cutoff lockout in SAP ERP.
    `.trim();

    navigator.clipboard.writeText(memoText);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%' }}>
      {/* ── TOP HERO HEADER: EXECUTIVE FORENSIC SUITE ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 60%, #F0FDFA 100%)',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle accent bar on the left */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: 'linear-gradient(180deg, #007680 0%, #004D54 100%)',
          }}
        />

        {/* Left Title & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '300px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 118, 128, 0.28)',
              flexShrink: 0,
            }}
          >
            <Scale size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Forensic &amp; Risk Intelligence Suite
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#007680',
                  background: '#E6F4F5',
                  border: '1px solid #B2DFE2',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                }}
              >
                {engagementName.split(' - ')[0] || 'Tangerine Skies'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>
                Executive CFO briefing, Benford's Law forensic distribution, Multi-Vector Risk, Digital DNA Benchmarks &amp; SOX 404 Scorecard.
              </span>
            </div>
          </div>
        </div>

        {/* Right: 5-Pillar Executive Segmented Control */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            gap: '3px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveIntelligenceTab('memo')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: activeIntelligenceTab === 'memo' ? 700 : 600,
              borderRadius: '9px',
              border: activeIntelligenceTab === 'memo' ? '1px solid #CBD5E1' : '1px solid transparent',
              cursor: 'pointer',
              background: activeIntelligenceTab === 'memo' ? '#FFFFFF' : 'transparent',
              color: activeIntelligenceTab === 'memo' ? '#007680' : '#64748B',
              boxShadow: activeIntelligenceTab === 'memo' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            <FileText size={14} color={activeIntelligenceTab === 'memo' ? '#007680' : '#64748B'} />
            <span>CFO Executive Memo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIntelligenceTab('benford')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: activeIntelligenceTab === 'benford' ? 700 : 600,
              borderRadius: '9px',
              border: activeIntelligenceTab === 'benford' ? '1px solid #CBD5E1' : '1px solid transparent',
              cursor: 'pointer',
              background: activeIntelligenceTab === 'benford' ? '#FFFFFF' : 'transparent',
              color: activeIntelligenceTab === 'benford' ? '#007680' : '#64748B',
              boxShadow: activeIntelligenceTab === 'benford' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            <BarChart3 size={14} color={activeIntelligenceTab === 'benford' ? '#007680' : '#64748B'} />
            <span>Benford's Forensic Curve</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIntelligenceTab('risk_scoring')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: activeIntelligenceTab === 'risk_scoring' ? 700 : 600,
              borderRadius: '9px',
              border: activeIntelligenceTab === 'risk_scoring' ? '1px solid #CBD5E1' : '1px solid transparent',
              cursor: 'pointer',
              background: activeIntelligenceTab === 'risk_scoring' ? '#FFFFFF' : 'transparent',
              color: activeIntelligenceTab === 'risk_scoring' ? '#007680' : '#64748B',
              boxShadow: activeIntelligenceTab === 'risk_scoring' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            <ShieldAlert size={14} color={activeIntelligenceTab === 'risk_scoring' ? '#007680' : '#64748B'} />
            <span>Multi-Vector Risk Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIntelligenceTab('dna_benchmark')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: activeIntelligenceTab === 'dna_benchmark' ? 700 : 600,
              borderRadius: '9px',
              border: activeIntelligenceTab === 'dna_benchmark' ? '1px solid #CBD5E1' : '1px solid transparent',
              cursor: 'pointer',
              background: activeIntelligenceTab === 'dna_benchmark' ? '#FFFFFF' : 'transparent',
              color: activeIntelligenceTab === 'dna_benchmark' ? '#007680' : '#64748B',
              boxShadow: activeIntelligenceTab === 'dna_benchmark' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            <Dna size={14} color={activeIntelligenceTab === 'dna_benchmark' ? '#007680' : '#64748B'} />
            <span>Client DNA &amp; Benchmarks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIntelligenceTab('sox_coso')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: activeIntelligenceTab === 'sox_coso' ? 700 : 600,
              borderRadius: '9px',
              border: activeIntelligenceTab === 'sox_coso' ? '1px solid #CBD5E1' : '1px solid transparent',
              cursor: 'pointer',
              background: activeIntelligenceTab === 'sox_coso' ? '#FFFFFF' : 'transparent',
              color: activeIntelligenceTab === 'sox_coso' ? '#007680' : '#64748B',
              boxShadow: activeIntelligenceTab === 'sox_coso' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            <ShieldCheck size={14} color={activeIntelligenceTab === 'sox_coso' ? '#007680' : '#64748B'} />
            <span>SOX 404 &amp; COSO Scorecard</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: BOARDROOM CFO EXECUTIVE MEMORANDUM ── */}
      {activeIntelligenceTab === 'memo' && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Memo Letterhead Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              padding: '24px 28px',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    background: '#007680',
                    color: '#FFFFFF',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  DELOITTE AUDIT &amp; ASSURANCE
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>
                  Engagement Risk &amp; Forensic Analytics Briefing
                </span>
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '4px 0', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                Executive Findings Memorandum for Chief Financial Officer
              </h2>
              <div style={{ fontSize: '0.80rem', color: '#CBD5E1', display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span><strong>Client:</strong> {engagementName}</span>
                <span><strong>Scope:</strong> 100% General Ledger Population ({fmtNum(status?.totalInputRows?.gl || 50000)} Records)</span>
                <span><strong>Materiality:</strong> {fmtCurr(materiality)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={copyMemoToClipboard}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: copiedMemo ? '#10B981' : 'rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                {copiedMemo ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedMemo ? 'Copied to Clipboard' : 'Copy Executive Brief'}</span>
              </button>
            </div>
          </div>

          {/* Memo Core Metrics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1px',
              background: '#E2E8F0',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <div style={{ background: '#FFFFFF', padding: '18px 22px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Reconciliation Assurance
              </div>
              <div style={{ fontSize: '1.40rem', fontWeight: 800, color: '#10B981', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={20} />
                <span>100.0% Reconciled</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>TB to GL Net Variance: $0.00</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px 22px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Benford's Law Conformance
              </div>
              <div style={{ fontSize: '1.40rem', fontWeight: 800, color: '#007680', margin: '4px 0' }}>
                Grade A (Chi-Sq: {chiSquareScore})
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Critical Limit: 15.51 (Pass)</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px 22px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                High-Risk Anomalies (Score &ge; 75)
              </div>
              <div style={{ fontSize: '1.40rem', fontWeight: 800, color: '#EF4444', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={20} />
                <span>5 Critical Records</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Total Flagged: {fmtCurr(6223381.0)}</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px 22px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Automated Cleansing Efficiency
              </div>
              <div style={{ fontSize: '1.40rem', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>
                0 Manual Errors
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>100% Constraints Passed</div>
            </div>
          </div>

          {/* Memo Narrative Body Sections */}
          <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px', color: '#1E293B', lineHeight: 1.65 }}>
            {/* Section 1 */}
            <div style={{ borderLeft: '3px solid #007680', paddingLeft: '16px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                1. Population Completeness &amp; General Ledger Integrity
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#334155', margin: 0 }}>
                Deloitte's Automated JET engine performed full automated mathematical reconciliation across all <strong>{fmtNum(status?.totalInputRows?.gl || 50000)}</strong> journal lines against the Trial Balance opening and closing positions. Zero unmapped general ledger accounts or net activity drift was observed across standard financial reporting line items.
              </p>
            </div>

            {/* Section 2 */}
            <div style={{ borderLeft: '3px solid #0284C7', paddingLeft: '16px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                2. Benford's Law Natural Distribution &amp; Digital Irregularities
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#334155', margin: 0 }}>
                First-digit frequencies across the monetary transactions conform closely to the logarithmic Benford distribution ($\chi^2 = {chiSquareScore}$ vs. standard threshold of 15.51). However, <strong>Digit 7</strong> exhibits an anomalous concentration peak (+3.3% variance over expected frequency), primarily attributable to manual round-sum consulting retainers ($79,800.00) authorized in Q4.
              </p>
            </div>

            {/* Section 3 */}
            <div style={{ borderLeft: '3px solid #EF4444', paddingLeft: '16px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                3. High-Risk Multi-Vector Anomalies Warranting Attention
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#334155', margin: '0 0 10px 0' }}>
                A composite multi-vector analysis (evaluating author privilege, timestamp proximity to year-end, revenue debit reversals, and narrative risk keywords) isolated <strong>5 transactions with a risk score exceeding 75/100</strong>:
              </p>
              <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '12px 16px', fontSize: '0.80rem' }}>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>Document #2500009100 ($2.50M):</strong> Unallocated suspense adjustment booked on 31-Dec at 23:59 by a temporary finance profile. <em>Status: Client inquiry issued.</em></li>
                  <li><strong>Document #2500007294 ($1.34M):</strong> Large revenue debit adjustment booked by IT system administrator on closing date. <em>Status: Under substantive testing.</em></li>
                </ul>
              </div>
            </div>

            {/* Section 4 */}
            <div style={{ borderLeft: '3px solid #64748B', paddingLeft: '16px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                4. Internal Control Recommendations for Management
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#334155', margin: 0 }}>
                1. <strong>System Privileges:</strong> Revoke direct posting access for non-finance IT service accounts.<br />
                2. <strong>Period Cutoff Controls:</strong> Implement automated hard-close lockouts in SAP ERP to eliminate midnight post-closing adjustments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: BENFORD'S LAW FORENSIC CURVE ── */}
      {activeIntelligenceTab === 'benford' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Benford Metric KPI Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Goodness-of-Fit Statistic ($\chi^2$)
              </div>
              <div style={{ fontSize: '1.50rem', fontWeight: 800, color: '#007680', margin: '4px 0' }}>
                {chiSquareScore} <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 700 }}>(Grade A)</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Critical Value ($\alpha=0.05, df=8$): 15.51</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Peak Anomaly Digit
              </div>
              <div style={{ fontSize: '1.50rem', fontWeight: 800, color: '#EF4444', margin: '4px 0' }}>
                Digit 7 <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>(+3.3% Spike)</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Actual: 9.1% | Theoretical: 5.8%</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Population Leading Digits Evaluated
              </div>
              <div style={{ fontSize: '1.50rem', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>
                {fmtNum(status?.totalInputRows?.gl || 50000)} Transactions
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Non-zero absolute monetary amounts</div>
            </div>
          </div>

          {/* Benford Chart Card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Empirical vs. Theoretical Benford First-Digit Curve
                </h4>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
                  Click any bar to filter and inspect specific leading-digit populations.
                </div>
              </div>

              {selectedBenfordDigit !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedBenfordDigit(null)}
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#007680',
                    background: '#E6F4F5',
                    border: '1px solid #B2DFE2',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Reset Digit Filter (Showing Digit {selectedBenfordDigit})
                </button>
              )}
            </div>

            <div style={{ height: '360px', width: '100%' }}>
              <Chart type="bar" data={benfordChartData} options={benfordChartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: MULTI-VECTOR RISK RADAR & AUDITOR TRIAGE ── */}
      {activeIntelligenceTab === 'risk_scoring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Triage Search & Filters */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder="Search by Document #, User, Account..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.82rem',
                  width: '100%',
                  color: '#1E293B',
                  background: 'transparent',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748B' }}>Filter Disposition:</span>
              <select
                value={dispositionFilter}
                onChange={(e) => setDispositionFilter(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Dispositions (5)</option>
                <option value="PENDING">Pending Review</option>
                <option value="INVESTIGATED_VALID">Investigated - Valid</option>
                <option value="CLIENT_INQUIRY">Client Inquiry Sent</option>
                <option value="CONTROL_DEFICIENCY">Control Deficiency</option>
              </select>
            </div>
          </div>

          {/* High-Risk Transactions Table */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Correlated High-Risk Transaction Triage Matrix
                </h4>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
                  Transactions scored 0–100 combining Timing, Amount, User Privilege, and Account Risk vectors.
                </div>
              </div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#007680', background: '#E6F4F5', padding: '3px 10px', borderRadius: '999px' }}>
                Showing {filteredDispositions.length} Flagged Entries
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '12px 18px' }}>Risk Score</th>
                    <th style={{ padding: '12px 14px' }}>Document #</th>
                    <th style={{ padding: '12px 14px' }}>Date &amp; Author</th>
                    <th style={{ padding: '12px 14px' }}>Account &amp; Description</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Amount ({currencyCode})</th>
                    <th style={{ padding: '12px 14px' }}>Correlated Risk Drivers</th>
                    <th style={{ padding: '12px 18px' }}>Auditor Disposition</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDispositions.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: row.riskScore >= 90 ? '#FEE2E2' : '#FEF3C7',
                            color: row.riskScore >= 90 ? '#991B1B' : '#92400E',
                            border: row.riskScore >= 90 ? '1px solid #FCA5A5' : '1px solid #FCD34D',
                          }}
                        >
                          {row.riskScore}/100
                        </span>
                      </td>
                      <td style={{ padding: '14px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#0F172A' }}>
                        {row.docNo}
                      </td>
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{row.user}</div>
                        <div style={{ fontSize: '0.70rem', color: '#64748B' }}>{row.date}</div>
                      </td>
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{row.account}</div>
                        <div style={{ fontSize: '0.70rem', color: '#64748B' }}>{row.accountName}</div>
                      </td>
                      <td style={{ padding: '14px 14px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: row.amount > materiality ? '#EF4444' : '#0F172A' }}>
                        {fmtCurr(row.amount)}
                      </td>
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {row.riskDrivers.map((d, di) => (
                            <span
                              key={di}
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 600,
                                background: '#F1F5F9',
                                color: '#475569',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <select
                          value={row.disposition}
                          onChange={(e) => handleUpdateDisposition(row.id, e.target.value as any)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            background: row.disposition === 'INVESTIGATED_VALID' ? '#ECFDF5' : row.disposition === 'CLIENT_INQUIRY' ? '#EFF6FF' : '#FFFBEB',
                            color: row.disposition === 'INVESTIGATED_VALID' ? '#065F46' : row.disposition === 'CLIENT_INQUIRY' ? '#1E40AF' : '#92400E',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="PENDING">Pending Review</option>
                          <option value="INVESTIGATED_VALID">Investigated - Valid</option>
                          <option value="CLIENT_INQUIRY">Client Inquiry Sent</option>
                          <option value="CONTROL_DEFICIENCY">Control Deficiency</option>
                          <option value="ADJUSTMENT_REQUIRED">Audit Adjustment</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: CLIENT ACCOUNTING "DIGITAL DNA" & PEER BENCHMARKS ── */}
      {activeIntelligenceTab === 'dna_benchmark' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sector Benchmark Selector Strip */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#E6F4F5',
                  color: '#007680',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Dna size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Cross-Industry Accounting DNA Fingerprint
                </h4>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  Benchmarking {engagementName.split(' - ')[0]} against Deloitte industry peers.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Select Peer Sector:</span>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #007680',
                  background: '#F0FDFA',
                  color: '#007680',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="manufacturing">Manufacturing &amp; Industrial (Current Sector)</option>
                <option value="technology">Technology &amp; SaaS Enterprise</option>
                <option value="retail">Retail &amp; Consumer Goods</option>
                <option value="financial">Financial Services &amp; Banking</option>
                <option value="healthcare">Healthcare &amp; Pharmaceuticals</option>
              </select>
            </div>
          </div>

          {/* Radar & Percentile Dual Card Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(340px, 1.2fr)', gap: '18px' }}>
            {/* Left: Dual Radar Chart */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '22px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Accounting Behavior Vector Comparison
                </h4>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                  Teal: Client DNA | Blue Dash: {sectorBenchmarks[selectedSector].name}
                </div>
              </div>

              <div style={{ height: '340px', width: '100%', position: 'relative' }}>
                <Radar data={dnaRadarData} options={dnaRadarOptions} />
              </div>
            </div>

            {/* Right: Percentile Rank Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {clientDnaMetrics.map((metric, idx) => {
                const percentile = sectorBenchmarks[selectedSector].percentiles[idx];
                const benchmarkVal = sectorBenchmarks[selectedSector].benchmark[idx];
                const isHighRisk = percentile >= 90;
                const isModerate = percentile >= 80 && percentile < 90;

                return (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      padding: '14px 18px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                        {metric.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: isHighRisk ? '#FEE2E2' : isModerate ? '#FEF3C7' : '#DCFCE7',
                          color: isHighRisk ? '#991B1B' : isModerate ? '#92400E' : '#166534',
                          border: isHighRisk ? '1px solid #FCA5A5' : isModerate ? '1px solid #FCD34D' : '1px solid #86EFAC',
                        }}
                      >
                        {percentile}th Percentile Risk
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748B', marginBottom: '8px' }}>
                      <span>Client: <strong>{metric.client}{metric.unit}</strong></span>
                      <span>Peer Median: <strong>{benchmarkVal}{metric.unit}</strong></span>
                      <span style={{ color: isHighRisk ? '#DC2626' : '#007680', fontWeight: 700 }}>
                        {metric.client > benchmarkVal ? `+${(metric.client - benchmarkVal).toFixed(1)}% variance` : 'Within Normal Range'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentile}%`,
                          height: '100%',
                          background: isHighRisk
                            ? 'linear-gradient(90deg, #F87171, #DC2626)'
                            : isModerate
                            ? 'linear-gradient(90deg, #FBBF24, #D97706)'
                            : 'linear-gradient(90deg, #34D399, #059669)',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: SOX 404 & COSO INTERNAL CONTROL SCORECARD ── */}
      {activeIntelligenceTab === 'sox_coso' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SOX Executive Summary Strip */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  PCAOB AS 2201 / COSO 2013
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                  Internal Controls Over Financial Reporting (ICFR) Scorecard
                </span>
              </div>
              <h3 style={{ fontSize: '1.20rem', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>
                SOX 404 Internal Control Deficiency Evaluation
              </h3>
            </div>

            <button
              type="button"
              onClick={copySoxMemoToClipboard}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 18px',
                borderRadius: '8px',
                background: copiedSoxMemo ? '#10B981' : '#007680',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 118, 128, 0.25)',
                transition: 'all 0.18s ease',
              }}
            >
              {copiedSoxMemo ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedSoxMemo ? 'Copied to Clipboard' : 'Export SOX 404 Workpaper'}</span>
            </button>
          </div>

          {/* SOX KPI Summary Counters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Material Weaknesses
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: soxSummaryStats.matWeakness > 0 ? '#DC2626' : '#10B981', margin: '3px 0' }}>
                {soxSummaryStats.matWeakness}
              </div>
              <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Adverse opinion risk</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Significant Deficiencies
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#D97706', margin: '3px 0' }}>
                {soxSummaryStats.sigDef}
              </div>
              <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Audit Committee escalation</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Operational Deficiencies
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0284C7', margin: '3px 0' }}>
                {soxSummaryStats.opDef}
              </div>
              <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Management letter points</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Effective Assertions
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', margin: '3px 0' }}>
                {soxSummaryStats.effective} / 5
              </div>
              <div style={{ fontSize: '0.70rem', color: '#64748B' }}>COSO 2013 components verified</div>
            </div>
          </div>

          {/* Assertion Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {soxAssertions.map((assertion) => (
              <div
                key={assertion.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: assertion.severity === 'SIGNIFICANT_DEFICIENCY'
                    ? '1.5px solid #FCD34D'
                    : assertion.severity === 'MATERIAL_WEAKNESS'
                    ? '1.5px solid #FCA5A5'
                    : '1px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {assertion.assertion}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: assertion.severity === 'SIGNIFICANT_DEFICIENCY'
                            ? '#FEF3C7'
                            : assertion.severity === 'MATERIAL_WEAKNESS'
                            ? '#FEE2E2'
                            : assertion.severity === 'OPERATIONAL_DEFICIENCY'
                            ? '#E0F2FE'
                            : '#DCFCE7',
                          color: assertion.severity === 'SIGNIFICANT_DEFICIENCY'
                            ? '#92400E'
                            : assertion.severity === 'MATERIAL_WEAKNESS'
                            ? '#991B1B'
                            : assertion.severity === 'OPERATIONAL_DEFICIENCY'
                            ? '#0369A1'
                            : '#166534',
                        }}
                      >
                        {assertion.severity.replace('_', ' ')}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>
                      {assertion.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>Dollar Exposure at Risk</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'monospace', color: assertion.dollarAtRisk > materiality ? '#DC2626' : '#0F172A' }}>
                        {fmtCurr(assertion.dollarAtRisk)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mapped JET Rules & Severity Selector */}
                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Mapped JET Tests:</span>
                    {assertion.mappedJetTests.map((t, ti) => (
                      <span
                        key={ti}
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          background: '#FFFFFF',
                          color: '#007680',
                          border: '1px solid #B2DFE2',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>Deficiency Triage:</span>
                    <select
                      value={assertion.severity}
                      onChange={(e) => handleUpdateSoxSeverity(assertion.id, e.target.value as any)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        color: '#0F172A',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="EFFECTIVE">Effective (No Deficiency)</option>
                      <option value="OPERATIONAL_DEFICIENCY">Operational Control Deviation</option>
                      <option value="SIGNIFICANT_DEFICIENCY">Significant Deficiency (AS 2201)</option>
                      <option value="MATERIAL_WEAKNESS">Material Weakness</option>
                    </select>
                  </div>
                </div>

                {/* Management Remediation & Sign-off */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Management Remediation Plan
                    </span>
                    <input
                      type="text"
                      value={assertion.remediationPlan}
                      onChange={(e) => handleUpdateSoxRemediation(assertion.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.76rem',
                        color: '#1E293B',
                        marginTop: '2px',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSoxSignoff(assertion.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: assertion.signedOff ? '#ECFDF5' : '#F1F5F9',
                      color: assertion.signedOff ? '#065F46' : '#64748B',
                      border: assertion.signedOff ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      alignSelf: 'flex-end',
                    }}
                  >
                    {assertion.signedOff ? <CheckCheck size={15} color="#059669" /> : <Clock size={15} />}
                    <span>{assertion.signedOff ? `Signed off: ${assertion.signedBy}` : 'Sign-off Assertion'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
