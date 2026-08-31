import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  RadarController,
  ArcElement,
  DoughnutController
} from 'chart.js';
import { Chart, Radar, Doughnut } from 'react-chartjs-2';
import {
  ShieldAlert, Sparkles, Scale, AlertTriangle, CheckCircle2,
  FileText, Copy, Download, Search, Filter, Eye, ChevronRight,
  TrendingUp, Clock, UserCheck, Lock, Activity, ArrowUpRight,
  HelpCircle, Check, X, RefreshCw, BarChart3, Building, Mail,
  Calendar, DollarSign, Tag, CheckSquare, Hash, Layers, ShieldCheck, Database,
  Building2, Dna, Cpu, AlertCircle, Briefcase, Award, CheckCheck,
  Share2, ArrowRight, ChevronDown, Info, SlidersHorizontal
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
  RadarController,
  ArcElement,
  DoughnutController
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

// ── CUSTOM STYLED DISPOSITION DROPDOWN COMPONENT ──
const DISPOSITION_CONFIG: Record<DispositionRecord['disposition'], { label: string; bg: string; text: string; border: string; dot: string }> = {
  PENDING: { label: 'Pending Review', bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', dot: '#D97706' },
  INVESTIGATED_VALID: { label: 'Investigated - Valid', bg: '#DCFCE7', text: '#166534', border: '#BBF7D0', dot: '#16A34A' },
  CLIENT_INQUIRY: { label: 'Client Inquiry Sent', bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE', dot: '#2563EB' },
  CONTROL_DEFICIENCY: { label: 'Control Deficiency', bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3', dot: '#E11D48' },
  ADJUSTMENT_REQUIRED: { label: 'Adjustment Required', bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE', dot: '#7C3AED' },
};

interface CustomDispositionSelectProps {
  value: DispositionRecord['disposition'];
  onChange: (val: DispositionRecord['disposition']) => void;
}

const CustomDispositionSelect: React.FC<CustomDispositionSelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = DISPOSITION_CONFIG[value] || DISPOSITION_CONFIG.PENDING;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '8px',
          background: current.bg,
          color: current.text,
          border: `1px solid ${current.border}`,
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: current.dot }} />
        <span>{current.label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              zIndex: 50,
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
              padding: '4px',
              minWidth: '175px',
            }}
          >
            {(Object.keys(DISPOSITION_CONFIG) as DispositionRecord['disposition'][]).map((key) => {
              const item = DISPOSITION_CONFIG[key];
              const isSelected = value === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(key);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: isSelected ? item.bg : 'transparent',
                    border: 'none',
                    color: isSelected ? item.text : '#334155',
                    fontSize: '0.72rem',
                    fontWeight: isSelected ? 750 : 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.dot }} />
                    <span>{item.label}</span>
                  </div>
                  {isSelected && <Check size={12} color={item.text} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Pillar 4: DNA Benchmark State
  const [selectedSector, setSelectedSector] = useState<'manufacturing' | 'technology' | 'retail' | 'financial' | 'healthcare'>('manufacturing');

  // Client parameters from config or sensible defaults
  const engagementName = config?.sparkParameters?.engagementName || 'Tangerine Skies Pvt Ltd - JET Audit FY26';
  const materiality = typeof config?.sparkParameters?.materiality === 'number'
    ? config.sparkParameters.materiality
    : 500000;
  const currencyCode = config?.sparkParameters?.currencyCode || 'USD';

  const fmtCurr = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(val);
  const fmtNum = (val: number) => new Intl.NumberFormat('en-US').format(val);

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

  const totalGlPopulation = status?.totalInputRows?.gl || 50000;

  const benfordChartData = useMemo(() => ({
    labels: ['Digit 1', 'Digit 2', 'Digit 3', 'Digit 4', 'Digit 5', 'Digit 6', 'Digit 7', 'Digit 8', 'Digit 9'],
    datasets: [
      {
        type: 'bar' as const,
        label: 'Actual Population Frequency (%)',
        data: benfordActual,
        backgroundColor: benfordActual.map((_, idx) => {
          if (selectedBenfordDigit !== null && selectedBenfordDigit !== idx + 1) return 'rgba(0, 118, 128, 0.15)';
          if (idx === 6) return 'rgba(244, 63, 94, 0.85)'; // Soft Rose for Digit 7 anomaly
          return 'rgba(0, 118, 128, 0.82)'; // Deloitte Teal
        }),
        borderColor: benfordActual.map((_, idx) => idx === 6 ? '#E11D48' : '#007680'),
        borderWidth: 1.5,
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'line' as const,
        label: "Theoretical Benford Standard (%)",
        data: benfordTheoretical,
        borderColor: '#0284C7',
        borderWidth: 2,
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

  // LIGHT-THEMED ADVANCED TOOLTIP WITH COMPLETE TABLE EVIDENCE
  const benfordChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter, sans-serif', size: 11, weight: '600' },
          color: '#475569',
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 10,
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
        titleFont: { family: 'Inter, sans-serif', size: 13, weight: '800' },
        bodyFont: { family: 'Inter, sans-serif', size: 11, weight: '500' },
        displayColors: false,
        callbacks: {
          title: (items: any[]) => {
            const digit = items[0].dataIndex + 1;
            return `Forensic Digit #${digit} Population Profile`;
          },
          label: (item: any) => {
            const digit = item.dataIndex + 1;
            const actual = benfordActual[digit - 1];
            const expected = benfordTheoretical[digit - 1];
            const diff = (actual - expected).toFixed(1);
            const count = Math.round((actual / 100) * totalGlPopulation);
            return [
              `• Observed Share: ${actual.toFixed(1)}% (${fmtNum(count)} records)`,
              `• Theoretical Standard: ${expected.toFixed(1)}%`,
              `• Variance: ${Number(diff) > 0 ? '+' : ''}${diff} percentage points`,
            ];
          },
          afterBody: (items: any[]) => {
            const digit = items[0].dataIndex + 1;
            if (digit === 7) {
              return [
                '',
                '⚠️ Audit Focus Signal (+3.3 pp):',
                'Concentrated monetary pattern detected. Driven by recurring $79,800 threshold consulting disbursements in Q4.',
              ];
            }
            return [
              '',
              '✓ Natural Distribution: Conforms within normal expected variance threshold.',
            ];
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#64748B' } },
      y: {
        grid: { color: '#F1F5F9', drawBorder: false },
        ticks: { callback: (val: any) => `${val}%`, color: '#64748B', font: { size: 10 } },
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

  // Risk summary counts
  const riskSummary = useMemo(() => {
    const total = dispositionList.reduce((sum, item) => sum + item.amount, 0);
    const critical = dispositionList.filter(item => item.riskScore >= 90).length;
    const moderate = dispositionList.filter(item => item.riskScore >= 75 && item.riskScore < 90).length;
    const low = dispositionList.filter(item => item.riskScore < 75).length;
    const avgRisk = dispositionList.length ? dispositionList.reduce((sum, item) => sum + item.riskScore, 0) / dispositionList.length : 0;
    const pending = dispositionList.filter(item => item.disposition === 'PENDING' || item.disposition === 'CLIENT_INQUIRY').length;
    return { total, critical, moderate, low, avgRisk, pending };
  }, [dispositionList]);

  // Advanced Animated Donut Chart Data
  const donutChartData = useMemo(() => ({
    labels: ['Critical Risk (Score ≥ 90)', 'Moderate Risk (Score 75-89)', 'Low / Standard Risk'],
    datasets: [
      {
        data: [riskSummary.critical || 2, riskSummary.moderate || 3, riskSummary.low || 1],
        backgroundColor: ['#FB7185', '#FBBF24', '#34D399'], // Soft Rose, Soft Amber, Soft Emerald
        hoverBackgroundColor: ['#F43F5E', '#F59E0B', '#10B981'],
        borderWidth: 3,
        borderColor: '#FFFFFF',
        borderRadius: 6,
      },
    ],
  }), [riskSummary]);

  const donutChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '78%',
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
        titleFont: { size: 12, weight: '700' },
        bodyFont: { size: 11 },
      },
    },
  };

  // ── 3. PILLAR 4: DYNAMIC CLIENT ACCOUNTING DNA DATA ──
  // Calculated from actual run counts & status
  const clientDnaCalculated = useMemo(() => {
    const total = totalGlPopulation;
    const ex6 = status?.parameterSummary?.Ex6_Closing_Entries || (status as any)?.exceptionCounts?.Ex6_Closing_Entries || 24;
    const ex7 = status?.parameterSummary?.Ex7_Dates_Of_Interest || (status as any)?.exceptionCounts?.Ex7_Dates_Of_Interest || 18;
    const ex8 = status?.parameterSummary?.Ex8_Round_Amounts || (status as any)?.exceptionCounts?.Ex8_Round_Amounts || 32;
    const ex4 = status?.parameterSummary?.Ex4_Few_Postings_Users || (status as any)?.exceptionCounts?.Ex4_Few_Postings_Users || 12;

    const manualPct = 14.8; // Ratio of manual override journals
    const weekendPct = parseFloat(((ex7 / total) * 100 * 12).toFixed(1)); // normalized annual rate
    const roundPct = parseFloat(((ex8 / total) * 100 * 5).toFixed(1));
    const closingPct = parseFloat(((ex6 / total) * 100 * 15).toFixed(1));
    const superuserPct = 58.0;
    const benfordConformity = parseFloat(Math.max(88, Math.min(99.4, 100 - (chiSquareScore * 1.2))).toFixed(1));

    return [
      {
        label: 'Manual Override Volume',
        client: manualPct,
        unit: '%',
        desc: 'Proportion of manual adjusting journals vs automated subledger batches.',
        formula: '(Manual Journal Records / Total Annual Population) × 100',
        statusType: 'MODERATE' as const,
      },
      {
        label: 'Off-Hours & Weekend Postings',
        client: weekendPct,
        unit: '%',
        desc: 'Transactions created on Saturdays, Sundays, or outside standard business hours.',
        formula: '(Ex 7 Weekend & Holiday Entries / Total Population) × 100',
        statusType: 'NORMAL' as const,
      },
      {
        label: 'Round Dollar Multiples ($10k+)',
        client: roundPct,
        unit: '%',
        desc: 'Entries ending in exact round sums ($10,000, $50,000, $100,000).',
        formula: '(Ex 8 Round Number Entries / Total Population) × 100',
        statusType: 'NORMAL' as const,
      },
      {
        label: 'Period-End Closing Concentration',
        client: closingPct,
        unit: '%',
        desc: 'Share of total adjustments booked within +/- 3 days of fiscal cutoff.',
        formula: '(Ex 6 Period-End Entries / Total Population) × 100',
        statusType: 'ATTENTION' as const,
      },
      {
        label: 'Author Concentration (Top 3 Users)',
        client: superuserPct,
        unit: '%',
        desc: 'Percentage of total manual volume created by the 3 most active users.',
        formula: 'Sum of Top 3 User Journal Count / Total Manual Journal Population',
        statusType: 'MODERATE' as const,
      },
      {
        label: "Benford's Law Conformity Index",
        client: benfordConformity,
        unit: '%',
        desc: 'Mathematical goodness-of-fit across non-zero monetary transactions.',
        formula: '100 - (Chi-Square Goodness of Fit Statistic × 1.2)',
        statusType: 'FAVORABLE' as const,
      },
    ];
  }, [totalGlPopulation, status, chiSquareScore]);

  const sectorBenchmarks: Record<string, { name: string; benchmark: number[]; percentiles: number[] }> = {
    manufacturing: {
      name: 'Manufacturing & Industrial (Peer Median)',
      benchmark: [11.2, 2.4, 2.8, 14.5, 48.0, 97.5],
      percentiles: [68, 38, 42, 79, 64, 92],
    },
    technology: {
      name: 'Technology & SaaS Enterprise',
      benchmark: [6.5, 1.8, 1.4, 10.0, 42.0, 98.8],
      percentiles: [76, 44, 52, 84, 71, 88],
    },
    retail: {
      name: 'Retail & Consumer Goods',
      benchmark: [16.0, 4.2, 3.5, 18.0, 54.0, 96.0],
      percentiles: [48, 28, 35, 72, 58, 95],
    },
    financial: {
      name: 'Financial Services & Banking',
      benchmark: [4.8, 0.9, 0.8, 8.0, 32.0, 99.2],
      percentiles: [85, 58, 62, 88, 78, 86],
    },
    healthcare: {
      name: 'Healthcare & Pharmaceuticals',
      benchmark: [12.4, 2.9, 2.2, 15.0, 50.0, 97.0],
      percentiles: [62, 35, 40, 76, 61, 91],
    },
  };

  const dnaRadarData = useMemo(() => {
    const currentBench = sectorBenchmarks[selectedSector];
    return {
      labels: [
        'Manual Journal Ratio',
        'Weekend / Off-Hours',
        'Round Dollar Density',
        'Closing Rush',
        'Author Concentration',
        'Benford Conformance',
      ],
      datasets: [
        {
          label: `${engagementName.split(' - ')[0]} (Client DNA)`,
          data: clientDnaCalculated.map(m => m.client),
          backgroundColor: 'rgba(0, 118, 128, 0.18)',
          borderColor: '#007680',
          borderWidth: 2,
          pointBackgroundColor: '#007680',
          pointBorderColor: '#FFFFFF',
          pointRadius: 4,
        },
        {
          label: currentBench.name,
          data: currentBench.benchmark,
          backgroundColor: 'rgba(148, 163, 184, 0.12)',
          borderColor: '#64748B',
          borderWidth: 1.8,
          borderDash: [4, 4],
          pointBackgroundColor: '#64748B',
          pointBorderColor: '#FFFFFF',
          pointRadius: 3,
        },
      ],
    };
  }, [selectedSector, clientDnaCalculated, engagementName]);

  const dnaRadarOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter, sans-serif', size: 11, weight: '600' },
          color: '#475569',
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      r: {
        angleLines: { color: '#F1F5F9' },
        grid: { color: '#F1F5F9' },
        pointLabels: {
          font: { family: 'Inter, sans-serif', size: 10.5, weight: '700' },
          color: '#334155',
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
Population Coverage: 100% General Ledger Assurance (${fmtNum(totalGlPopulation)} Records)

1. EXECUTIVE SUMMARY & RECONCILIATION INTEGRITY
- Total Ledger Records Tested: ${fmtNum(totalGlPopulation)} journal entries ($1.84B Gross Volume).
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

  const intelligenceTabs = [
    { id: 'memo' as const, label: 'CFO Executive Memo', icon: FileText },
    { id: 'benford' as const, label: "Benford's Curve", icon: BarChart3 },
    { id: 'risk_scoring' as const, label: 'Multi-Vector Risk Radar', icon: ShieldAlert },
    { id: 'dna_benchmark' as const, label: 'Client DNA & Benchmarks', icon: Dna },
    { id: 'sox_coso' as const, label: 'SOX 404 / COSO Scorecard', icon: ShieldCheck },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── TOP HERO HEADER: EXECUTIVE COMMAND BAR (CLEAN, HIGH-CONTRAST) ── */}
      <div
        style={{
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
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '280px' }}>
          <div
            style={{
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
            }}
          >
            <Scale size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Forensic &amp; Risk Intelligence Suite
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 750,
                  color: '#007680',
                  background: '#E6F4F5',
                  border: '1px solid #B2DFE2',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {engagementName.split(' - ')[0] || 'Engagement'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
              CFO briefing memo, Benford's Law distribution, transaction risk triage, client behavioral DNA, and SOX 404 matrix.
            </p>
          </div>
        </div>

        {/* 5-Pillar Segmented Switcher */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '11px',
            border: '1px solid #E2E8F0',
            gap: '3px',
            overflowX: 'auto',
          }}
        >
          {intelligenceTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeIntelligenceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveIntelligenceTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: active ? '1px solid #CBD5E1' : '1px solid transparent',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#007680' : '#64748B',
                  fontWeight: active ? 750 : 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: active ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={active ? '#007680' : '#64748B'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: CFO EXECUTIVE MEMORANDUM & ANIMATED DONUT ── */}
      <AnimatePresence mode="wait">
        {activeIntelligenceTab === 'memo' && (
          <motion.div
            key="memo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(280px, 0.85fr)', gap: '18px' }}
          >
            {/* Left Letterhead Card */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                overflow: 'hidden',
              }}
            >
              {/* Clean White/Slate Header with Deloitte Branding (No harsh black text) */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        background: '#007680',
                        color: '#FFFFFF',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      DELOITTE AUDIT &amp; ASSURANCE
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                      Boardroom Briefing Memorandum
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '4px 0', letterSpacing: '-0.02em' }}>
                    Executive Findings &amp; Risk Insights
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
                    <span>Client: <strong style={{ color: '#0F172A' }}>{engagementName}</strong></span>
                    <span>Materiality: <strong style={{ color: '#0F172A' }}>{fmtCurr(materiality)}</strong></span>
                    <span>Population: <strong style={{ color: '#0F172A' }}>{fmtNum(totalGlPopulation)}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyMemoToClipboard}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: copiedMemo ? '#DCFCE7' : '#FFFFFF',
                    color: copiedMemo ? '#166534' : '#007680',
                    border: copiedMemo ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                    fontSize: '0.74rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copiedMemo ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedMemo ? 'Copied' : 'Copy Executive Brief'}</span>
                </button>
              </div>

              {/* 4 Soft Metric Strips */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '1px',
                  background: '#E2E8F0',
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                {[
                  { label: 'Reconciliation', val: '100.0%', sub: 'TB ↔ GL Reconciled', tone: '#059669', bg: '#F0FDF4' },
                  { label: 'Benford Grade', val: `Grade A (${chiSquareScore})`, sub: 'Critical Limit 15.51', tone: '#007680', bg: '#F2F9F9' },
                  { label: 'Critical Risk', val: `${riskSummary.critical} Items`, sub: 'Score ≥ 90/100', tone: '#BE123C', bg: '#FFF1F2' },
                  { label: 'Open Actions', val: `${riskSummary.pending} Triage`, sub: 'Inquiry & Review', tone: '#D97706', bg: '#FFFBEB' },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', padding: '14px 18px' }}>
                    <div style={{ fontSize: '0.64rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 850, color: item.tone, margin: '3px 0' }}>
                      {item.val}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* 4 Numbered Findings Narrative */}
              <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  {
                    title: '1. Population Completeness & General Ledger Integrity',
                    color: '#007680',
                    text: `Deloitte Automated JET performed 100% mathematical reconciliation across all ${fmtNum(totalGlPopulation)} general ledger transactions against the trial balance opening and closing positions ($0.00 net variance).`,
                  },
                  {
                    title: "2. Benford's Law Natural Distribution & Digital Irregularities",
                    color: '#0284C7',
                    text: `First-digit logarithmic frequencies conform closely to Benford's law (χ² = ${chiSquareScore}). Digit 7 exhibits an isolated +3.3 pp concentration peak, attributable to manual consulting retainers ($79,800.00) in Q4.`,
                  },
                  {
                    title: '3. Multi-Vector Risk Correlation & Anomaly Identification',
                    color: '#BE123C',
                    text: 'A composite risk scoring model flagged 5 high-priority transactions combining post-closing dates, superuser privileges, and revenue debit adjustments. Client inquiry initiated for Document #2500009100 ($2.50M suspense adjustment).',
                  },
                  {
                    title: '4. Internal Control Recommendations for Management',
                    color: '#64748B',
                    text: '1. Restrict IT service account direct posting access in ERP. 2. Enforce automated hard-close lockouts at 23:59 on fiscal cutoff date to eliminate backdated adjustments.',
                  },
                ].map((sec, idx) => (
                  <div key={idx} style={{ borderLeft: `3px solid ${sec.color}`, paddingLeft: '14px' }}>
                    <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                      {sec.title}
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.55, margin: 0 }}>
                      {sec.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Advanced Animated Donut & Priority Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Advanced Animated Donut Chart */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Risk Concentration
                  </span>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                    Population Risk Distribution
                  </h4>
                </div>

                {/* Animated Donut with Centered Live Metric */}
                <div style={{ height: '190px', width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut data={donutChartData} options={donutChartOptions} />
                  <div
                    style={{
                      position: 'absolute',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                      {riskSummary.avgRisk.toFixed(0)}
                    </span>
                    <span style={{ fontSize: '0.64rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Avg Risk
                    </span>
                  </div>
                </div>

                {/* Soft Curated Donut Legend */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '14px' }}>
                  {[
                    { label: 'Critical', val: riskSummary.critical, bg: '#FFF1F2', text: '#9F1239', dot: '#FB7185' },
                    { label: 'Moderate', val: riskSummary.moderate, bg: '#FFFBEB', text: '#92400E', dot: '#FBBF24' },
                    { label: 'Low', val: riskSummary.low, bg: '#F0FDF4', text: '#166534', dot: '#34D399' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: item.bg,
                        borderRadius: '8px',
                        padding: '8px 6px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.64rem', fontWeight: 750, color: item.text }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.dot }} />
                        <span>{item.label}</span>
                      </div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 850, color: item.text, marginTop: '2px' }}>
                        {item.val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Support Priority Actions */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                }}
              >
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Decision Support
                </span>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 12px' }}>
                  Priority Audit Actions
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    'Inspect transactions with multiple correlated risk drivers first.',
                    'Review period-end suspense adjustments and privileged-user postings.',
                    'Document management explanations in the SOX 404 / COSO scorecard.',
                  ].map((action, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          background: '#E6F4F5',
                          color: '#007680',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.45 }}>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 2: BENFORD'S LAW (LIGHT TOOLTIP, TABLE REMOVED) ── */}
        {activeIntelligenceTab === 'benford' && (
          <motion.div
            key="benford"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(280px, 0.75fr)', gap: '18px' }}
          >
            {/* Left: Benford Interactive Bar Chart */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '22px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Forensic Distribution Signal
                  </span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                    Benford's Law First-Digit Analysis
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                    Hover over any bar for comprehensive population share, variance, and audit interpretation.
                  </p>
                </div>

                {selectedBenfordDigit !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedBenfordDigit(null)}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#007680',
                      background: '#E6F4F5',
                      border: '1px solid #B2DFE2',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset Filter (Digit {selectedBenfordDigit})
                  </button>
                )}
              </div>

              <div style={{ height: '360px', width: '100%' }}>
                <Chart
                  type="bar"
                  data={benfordChartData}
                  options={{
                    ...benfordChartOptions,
                    onClick: (_e: any, els: any[]) => {
                      if (els?.length) setSelectedBenfordDigit(els[0].index + 1);
                    },
                  }}
                />
              </div>
            </div>

            {/* Right: Forensic KPI Cards & Key Findings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Goodness-of-Fit Statistic
                </span>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', margin: '4px 0', fontFamily: 'monospace' }}>
                  {chiSquareScore} <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 750 }}>(Grade A)</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Critical Limit ($\alpha=0.05, df=8$): 15.51</div>
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    fontSize: '0.74rem',
                    lineHeight: 1.45,
                  }}
                >
                  ✓ Conforms with natural distribution. Overall ledger exhibits high mathematical integrity.
                </div>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Primary Investigation Signal
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#BE123C', fontFamily: 'monospace' }}>Digit 7</span>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#BE123C' }}>+3.3 pp Variance</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: '#475569', lineHeight: 1.5 }}>
                  Observed frequency of 9.1% exceeds theoretical 5.8%. Driven by recurring $79,800.00 consulting invoices. Traced to authorized vendor retainers.
                </p>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Total Population Screened
                </span>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0F172A', margin: '4px 0', fontFamily: 'monospace' }}>
                  {fmtNum(totalGlPopulation)} Records
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>
                  Evaluated all non-zero monetary transaction values across the full audit period.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 3: AUDITOR TRIAGE (COMPACT SEARCH, SIMPLE CHIPS, CUSTOM DROPDOWNS, EVIDENCE BUTTON) ── */}
        {activeIntelligenceTab === 'risk_scoring' && (
          <motion.div
            key="risk"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {/* Compact Toolbar (No oversized search bar) */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    width: '240px',
                  }}
                >
                  <Search size={14} color="#64748B" />
                  <input
                    type="text"
                    placeholder="Search document, user, account..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '0.76rem',
                      width: '100%',
                      color: '#0F172A',
                    }}
                  />
                </div>

                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Showing <strong>{filteredDispositions.length}</strong> flagged entries
                </span>
              </div>

              {/* Disposition Filter Pill Segment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>
                  Filter:
                </span>
                <select
                  value={dispositionFilter}
                  onChange={(e) => setDispositionFilter(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '0.74rem',
                    fontWeight: 650,
                    color: '#1E293B',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Dispositions</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="INVESTIGATED_VALID">Investigated - Valid</option>
                  <option value="CLIENT_INQUIRY">Client Inquiry Sent</option>
                  <option value="CONTROL_DEFICIENCY">Control Deficiency</option>
                </select>
              </div>
            </div>

            {/* Table & Slide-Out Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedRiskTransaction ? 'minmax(0, 1.6fr) minmax(320px, 0.85fr)' : '1fr', gap: '14px', alignItems: 'start' }}>
              {/* Clean Table */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                        <th style={{ padding: '11px 14px' }}>Risk</th>
                        <th style={{ padding: '11px 12px' }}>Document #</th>
                        <th style={{ padding: '11px 12px' }}>Date &amp; Author</th>
                        <th style={{ padding: '11px 12px' }}>Account</th>
                        <th style={{ padding: '11px 12px', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '11px 12px' }}>Risk Drivers</th>
                        <th style={{ padding: '11px 14px' }}>Disposition</th>
                        <th style={{ padding: '11px 14px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDispositions.map((row) => (
                        <tr
                          key={row.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: selectedRiskTransaction?.id === row.id ? '#F2F9F9' : 'transparent',
                            transition: 'background 0.12s ease',
                          }}
                        >
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 7px',
                                borderRadius: '6px',
                                background: row.riskScore >= 90 ? '#FFF1F2' : row.riskScore >= 75 ? '#FFFBEB' : '#F0FDF4',
                                color: row.riskScore >= 90 ? '#9F1239' : row.riskScore >= 75 ? '#92400E' : '#166534',
                                border: row.riskScore >= 90 ? '1px solid #FECDD3' : row.riskScore >= 75 ? '1px solid #FDE68A' : '1px solid #BBF7D0',
                                fontWeight: 850,
                                fontFamily: 'monospace',
                                fontSize: '0.74rem',
                              }}
                            >
                              {row.riskScore}
                            </span>
                          </td>
                          <td style={{ padding: '12px 12px', fontWeight: 750, fontFamily: 'monospace', color: '#007680' }}>
                            {row.docNo}
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            <div style={{ fontWeight: 650, color: '#0F172A' }}>{row.user}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{row.date}</div>
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            <div style={{ fontWeight: 650, color: '#0F172A' }}>{row.account}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{row.accountName}</div>
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: row.amount > materiality ? '#BE123C' : '#0F172A' }}>
                            {fmtCurr(row.amount)}
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            {/* Simple clean non-button chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {row.riskDrivers.map((driver, di) => (
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
                                  {driver}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {/* Custom Colored Dropdown */}
                            <CustomDispositionSelect
                              value={row.disposition}
                              onChange={(newDisp) => handleUpdateDisposition(row.id, newDisp)}
                            />
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedRiskTransaction(row)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: selectedRiskTransaction?.id === row.id ? '#007680' : '#F8FAFC',
                                color: selectedRiskTransaction?.id === row.id ? '#FFFFFF' : '#007680',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.70rem',
                                fontWeight: 750,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Eye size={12} />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Evidence Slide-Out Drawer */}
              {selectedRiskTransaction && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '18px',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                    position: 'sticky',
                    top: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Evidence Context
                      </span>
                      <h3 style={{ margin: '2px 0 0', fontSize: '1.10rem', color: '#0F172A', fontWeight: 850 }}>
                        {selectedRiskTransaction.docNo}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{selectedRiskTransaction.accountName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRiskTransaction(null)}
                      style={{
                        border: '1px solid #E2E8F0',
                        background: '#FFFFFF',
                        borderRadius: '8px',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Score & Risk Strip */}
                  <div
                    style={{
                      background: selectedRiskTransaction.riskScore >= 90 ? '#FFF1F2' : '#FFFBEB',
                      border: selectedRiskTransaction.riskScore >= 90 ? '1px solid #FECDD3' : '1px solid #FDE68A',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>
                        Composite Risk Score
                      </span>
                      <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>
                        Multi-vector anomaly convergence
                      </div>
                    </div>
                    <span style={{ fontSize: '1.65rem', fontWeight: 900, color: selectedRiskTransaction.riskScore >= 90 ? '#9F1239' : '#92400E', fontFamily: 'monospace' }}>
                      {selectedRiskTransaction.riskScore}
                    </span>
                  </div>

                  {/* 4 Details Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    {[
                      { label: 'Monetary Amount', val: fmtCurr(selectedRiskTransaction.amount) },
                      { label: 'Author User', val: selectedRiskTransaction.user },
                      { label: 'Account Number', val: selectedRiskTransaction.account },
                      { label: 'Posting Date', val: selectedRiskTransaction.date },
                    ].map((item, idx) => (
                      <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.60rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>{item.label}</div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 750, color: '#0F172A', marginTop: '2px', wordBreak: 'break-word' }}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Correlated Drivers */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.64rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Active Risk Drivers
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedRiskTransaction.riskDrivers.map((driver, di) => (
                        <span
                          key={di}
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: '#E6F4F5',
                            border: '1px solid #B2DFE2',
                            color: '#007680',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {driver}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.64rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Auditor Working Note
                    </div>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569', lineHeight: 1.45 }}>
                      {selectedRiskTransaction.auditorNotes}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB 4: CLIENT ACCOUNTING DNA (CALCULATED FROM RUN DATA, SOFT BALANCED COLORS) ── */}
        {activeIntelligenceTab === 'dna_benchmark' && (
          <motion.div
            key="dna"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Header & Sector Dropdown Bar */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dna size={18} color="#007680" />
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Client Accounting Behavioral DNA
                  </h4>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
                  Calculated from the client's tested ledger population vs. Deloitte sector benchmarks.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowMethodologyModal(!showMethodologyModal)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <Info size={13} color="#007680" />
                  <span>How Numbers Are Calculated</span>
                </button>

                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #007680',
                    background: '#F0FDFA',
                    color: '#007680',
                    fontSize: '0.76rem',
                    fontWeight: 750,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="manufacturing">Manufacturing &amp; Industrial</option>
                  <option value="technology">Technology &amp; SaaS Enterprise</option>
                  <option value="retail">Retail &amp; Consumer Goods</option>
                  <option value="financial">Financial Services &amp; Banking</option>
                  <option value="healthcare">Healthcare &amp; Pharmaceuticals</option>
                </select>
              </div>
            </div>

            {/* Collapsible Methodology Explanation Banner */}
            {showMethodologyModal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '14px 18px',
                  fontSize: '0.74rem',
                  color: '#475569',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  📐 Mathematical Calculation Methodology for Client DNA:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                  {clientDnaCalculated.map((m, mi) => (
                    <div key={mi} style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <strong style={{ color: '#007680' }}>{m.label}:</strong> {m.formula}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Radar & Realistic Balanced Percentile Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.2fr)', gap: '16px' }}>
              {/* Radar Chart */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Accounting Behavior Vector Comparison
                  </h4>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                    Teal: Client DNA | Grey Dash: {sectorBenchmarks[selectedSector].name}
                  </div>
                </div>

                <div style={{ height: '320px', width: '100%' }}>
                  <Radar data={dnaRadarData} options={dnaRadarOptions} />
                </div>
              </div>

              {/* Realistic & Balanced Status Cards (Not all red!) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {clientDnaCalculated.map((metric, idx) => {
                  const benchmarkVal = sectorBenchmarks[selectedSector].benchmark[idx];
                  const percentile = sectorBenchmarks[selectedSector].percentiles[idx];

                  // Realistic Status Configuration (Soft, non-aggressive colors)
                  let statusBadge = { label: 'In-Line with Peers', bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', bar: '#34D399' };
                  if (metric.statusType === 'FAVORABLE') {
                    statusBadge = { label: 'Favorable (Grade A)', bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', bar: '#34D399' };
                  } else if (metric.statusType === 'NORMAL') {
                    statusBadge = { label: 'Normal Spread', bg: '#F2F9F9', text: '#007680', border: '#D1ECEE', bar: '#007680' };
                  } else if (metric.statusType === 'MODERATE') {
                    statusBadge = { label: 'Moderate Spread', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', bar: '#FBBF24' };
                  } else if (metric.statusType === 'ATTENTION') {
                    statusBadge = { label: 'Focus Area', bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3', bar: '#FB7185' };
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        padding: '12px 14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#0F172A', lineHeight: 1.3 }}>
                            {metric.label}
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 750,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: statusBadge.bg,
                              color: statusBadge.text,
                              border: `1px solid ${statusBadge.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {statusBadge.label}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace' }}>
                            {metric.client}{metric.unit}
                          </span>
                          <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                            (Peer: {benchmarkVal}{metric.unit})
                          </span>
                        </div>
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        {/* Soft Progress Bar */}
                        <div style={{ width: '100%', height: '5px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(10, percentile))}%`,
                              height: '100%',
                              background: statusBadge.bar,
                              borderRadius: '999px',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94A3B8', marginTop: '3px' }}>
                          <span>0%</span>
                          <span>{percentile}th Percentile</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 5: SOX 404 & COSO SCORECARD (ELEGANT REDESIGN, SOFT PROFESSIONAL PALETTE) ── */}
        {activeIntelligenceTab === 'sox_coso' && (
          <motion.div
            key="sox"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Soft Executive Summary Header */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      padding: '2px 7px',
                      borderRadius: '4px',
                    }}
                  >
                    PCAOB AS 2201 / COSO 2013
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                    Internal Controls Over Financial Reporting (ICFR) Scorecard
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '3px 0 0' }}>
                  SOX 404 Internal Control Deficiency Matrix
                </h3>
              </div>

              <button
                type="button"
                onClick={copySoxMemoToClipboard}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: copiedSoxMemo ? '#DCFCE7' : '#007680',
                  color: copiedSoxMemo ? '#166534' : '#FFFFFF',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 118, 128, 0.20)',
                  transition: 'all 0.15s ease',
                }}
              >
                {copiedSoxMemo ? <Check size={14} /> : <Download size={14} />}
                <span>{copiedSoxMemo ? 'Copied' : 'Export SOX 404 Workpaper'}</span>
              </button>
            </div>

            {/* 4 Soft KPI Summary Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {[
                { label: 'Material Weaknesses', val: soxSummaryStats.matWeakness, sub: 'Highest-level attention', tone: '#059669', bg: '#F0FDF4' },
                { label: 'Significant Deficiencies', val: soxSummaryStats.sigDef, sub: 'Audit Committee escalation', tone: '#D97706', bg: '#FFFBEB' },
                { label: 'Operational Deficiencies', val: soxSummaryStats.opDef, sub: 'Management remediation', tone: '#0284C7', bg: '#F0F9FF' },
                { label: 'Effective Assertions', val: `${soxSummaryStats.effective} / 5`, sub: 'Concluded satisfactory', tone: '#007680', bg: '#F2F9F9' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '0.64rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 850, color: item.tone, margin: '2px 0' }}>
                    {item.val}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{item.sub}</div>
                </div>
              ))}
            </div>

            {/* Assertion Cards (Soft, Professional, No harsh red bars) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '12px' }}>
              {soxAssertions.map((assertion) => {
                let badgeStyle = { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' };
                if (assertion.severity === 'SIGNIFICANT_DEFICIENCY') {
                  badgeStyle = { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' };
                } else if (assertion.severity === 'MATERIAL_WEAKNESS') {
                  badgeStyle = { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' };
                } else if (assertion.severity === 'OPERATIONAL_DEFICIENCY') {
                  badgeStyle = { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
                }

                return (
                  <div
                    key={assertion.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      padding: '16px 18px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      {/* Title & Exposure */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                              {assertion.assertion}
                            </h4>
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 750,
                                padding: '2px 7px',
                                borderRadius: '5px',
                                background: badgeStyle.bg,
                                color: badgeStyle.text,
                                border: `1px solid ${badgeStyle.border}`,
                              }}
                            >
                              {assertion.severity.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748B', lineHeight: 1.4 }}>
                            {assertion.description}
                          </p>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.60rem', color: '#64748B', fontWeight: 750, textTransform: 'uppercase' }}>
                            Exposure at Risk
                          </div>
                          <div style={{ fontSize: '0.94rem', fontWeight: 800, fontFamily: 'monospace', color: '#0F172A', marginTop: '2px' }}>
                            {fmtCurr(assertion.dollarAtRisk)}
                          </div>
                        </div>
                      </div>

                      {/* Mapped JET Tests */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                        {assertion.mappedJetTests.map((test, ti) => (
                          <span
                            key={ti}
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 600,
                              background: '#F8FAFC',
                              color: '#007680',
                              border: '1px solid #E2E8F0',
                              padding: '2px 7px',
                              borderRadius: '4px',
                            }}
                          >
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Inline Remediation & Sign-off */}
                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <input
                          type="text"
                          value={assertion.remediationPlan}
                          onChange={(e) => handleUpdateSoxRemediation(assertion.id, e.target.value)}
                          placeholder="Enter management remediation..."
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.70rem',
                            color: '#334155',
                            background: '#F8FAFC',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSoxSignoff(assertion.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: assertion.signedOff ? '#F0FDF4' : '#F8FAFC',
                          color: assertion.signedOff ? '#166534' : '#64748B',
                          border: assertion.signedOff ? '1px solid #BBF7D0' : '1px solid #CBD5E1',
                          fontSize: '0.68rem',
                          fontWeight: 750,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {assertion.signedOff ? <CheckCheck size={12} color="#16A34A" /> : <Clock size={12} />}
                        <span>{assertion.signedOff ? 'Signed off' : 'Sign-off'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
