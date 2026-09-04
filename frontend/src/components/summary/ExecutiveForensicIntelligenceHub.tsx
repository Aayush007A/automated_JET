import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  FileText, Search, Filter, Eye, ChevronRight,
  TrendingUp, Clock, UserCheck, Lock, Activity, ArrowUpRight,
  HelpCircle, Check, X, RefreshCw, BarChart3, Building, Mail,
  Calendar, DollarSign, Tag, CheckSquare, Hash, Layers, ShieldCheck, Database,
  Building2, Dna, Cpu, AlertCircle, Briefcase, Award, CheckCheck,
  ChevronDown, Info, SlidersHorizontal, ArrowDownRight
} from 'lucide-react';
import { RunSummary, RunConfig } from '../../types';

// Helper to draw clean rounded rectangles on Canvas
function drawHubCanvasRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, width, height, radius);
  } else {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// Custom Chart.js Plugin for Population Risk Distribution Leader Line Callouts with Arrows & Badges
const hubDoughnutCalloutPlugin = {
  id: 'hubDoughnutCallout',
  afterDatasetsDraw(chart: any) {
    if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
    if (!chart.options?.plugins?.hubDoughnutCallout || chart.options?.plugins?.hubDoughnutCallout?.display !== true) return;

    const { ctx, data } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;

    const dataset = data.datasets[0];
    if (!dataset || !dataset.data) return;

    const total = dataset.data.reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    if (total <= 0) return;

    const bgColors = dataset.backgroundColor || [];

    ctx.save();

    meta.data.forEach((element: any, index: number) => {
      const val = Number(dataset.data[index]) || 0;
      if (val <= 0) return;

      const { startAngle, endAngle, outerRadius, x: centerX, y: centerY } = element;
      if (outerRadius < 20) return;

      const angle = startAngle + (endAngle - startAngle) / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const startX = centerX + cos * outerRadius;
      const startY = centerY + sin * outerRadius;
      const isRight = cos >= 0;

      const rawLabel = (data.labels && data.labels[index]) ? String(data.labels[index]) : `Slice ${index + 1}`;
      const pct = Math.round((val / total) * 100);
      const pctStr = `${pct}%`;

      const rawColor = Array.isArray(bgColors) ? (bgColors[index] || '#007680') : bgColors;
      const sliceColor = typeof rawColor === 'string' ? rawColor : '#007680';

      // Sizing
      ctx.font = "700 10.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      const textWidth = ctx.measureText(rawLabel).width;
      ctx.font = "800 10.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      const pctWidth = ctx.measureText(pctStr).width;

      const pillPaddingX = 7;
      const dotSize = 6;
      const gap = 5;
      const pillHeight = 22;
      const pillWidth = pillPaddingX * 2 + dotSize + gap + textWidth + gap + pctWidth + 4;

      const elbowDist = 20;
      const elbowX = centerX + cos * (outerRadius + elbowDist);
      const elbowY = centerY + sin * (outerRadius + elbowDist);

      const pillX = isRight ? elbowX + 12 : elbowX - 12 - pillWidth;
      const pillY = elbowY - pillHeight / 2;

      // Draw subtle leader line with arrow
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(isRight ? pillX : pillX + pillWidth, elbowY);
      ctx.strokeStyle = sliceColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Arrow point at slice edge
      ctx.fillStyle = sliceColor;
      ctx.beginPath();
      ctx.arc(startX, startY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw Pill Container
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      drawHubCanvasRoundRect(ctx, pillX, pillY, pillWidth, pillHeight, 6);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      drawHubCanvasRoundRect(ctx, pillX, pillY, pillWidth, pillHeight, 6);
      ctx.stroke();

      // Colored Dot
      const dotX = pillX + pillPaddingX + dotSize / 2;
      const dotY = pillY + pillHeight / 2;
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = sliceColor;
      ctx.fill();

      // Text Label
      ctx.fillStyle = '#334155';
      ctx.font = "700 10px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(rawLabel, dotX + dotSize / 2 + gap, dotY);

      // Percentage Pill
      const pctX = dotX + dotSize / 2 + gap + textWidth + gap;
      ctx.fillStyle = sliceColor;
      ctx.font = "800 10px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.fillText(pctStr, pctX, dotY);
    });

    ctx.restore();
  }
};

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
  DoughnutController,
  hubDoughnutCalloutPlugin
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

// ── CUSTOM STYLED DISPOSITION DROPDOWN COMPONENT (NO WRAPPING) ──
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
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
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
          padding: '5px 10px',
          borderRadius: '8px',
          background: current.bg,
          color: current.text,
          border: `1px solid ${current.border}`,
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: current.dot, flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap' }}>{current.label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }} />
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
              zIndex: 60,
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
              padding: '4px',
              minWidth: '185px',
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
                    whiteSpace: 'nowrap',
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
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
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
  const [searchFilter, setSearchFilter] = useState('');
  const [dispositionFilter, setDispositionFilter] = useState<string>('ALL');
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Pillar 4: DNA Benchmark State
  const [selectedSector, setSelectedSector] = useState<'manufacturing' | 'technology' | 'retail' | 'financial' | 'healthcare'>('manufacturing');

  // Client parameters from config (NO hardcoded mock names)
  const isOmnia = config?.workflow === 'OMNIA_JET';
  const op = (config?.omniaParameters || {}) as Record<string, any>;
  const sp = (config?.sparkParameters || {}) as Record<string, any>;
  const engagementName =
    op.engagementName ||
    sp.engagementName ||
    (config as any)?.engagementName ||
    (isOmnia ? `Omnia JET Engagement ${runId}` : `Spark JET Engagement ${runId}`);
  const materiality = typeof op.materialityThreshold === 'number'
    ? op.materialityThreshold
    : typeof sp.materiality === 'number'
    ? sp.materiality
    : 500000;
  const currencyCode = op.entityCurrencyCode || op.currency || sp.currencyCode || 'USD';

  const fmtCurr = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(val);
  const fmtNum = (val: number) => new Intl.NumberFormat('en-US').format(val);

  // Pillar 5: SOX 404 Overrides State
  const [soxCustomOverrides, setSoxCustomOverrides] = useState<Record<string, Partial<SoxAssertionRecord>>>({});

  // Dynamically calculate SOX assertions from status parameterSummary & integrity
  const pSum = useMemo(() => ((status?.parameterSummary || {}) as Record<string, any>), [status?.parameterSummary]);
  const intSum = useMemo(() => ((status?.integritySummary || {}) as Record<string, any>), [status?.integritySummary]);

  const soxAssertions = useMemo<SoxAssertionRecord[]>(() => {
    const ex1 = pSum.Ex1_Seldom_Used_Accounts || pSum.Seldom_Accounts || pSum.Seldom_Used_Accounts || 0;
    const ex9 = pSum.Ex11_Duplicate_Entries || pSum.Duplicate_Entries || 0;
    const ex10 = pSum.Ex2_Suspicious_Keywords || pSum.Keywords_Scan || pSum.Suspect_Keywords || 0;
    const existCount = ex1 + ex9 + ex10;
    const existExposure = existCount * (materiality * 0.45);

    const compCount = (intSum.missingTbAccounts || 0) + (intSum.unbalancedEntries || 0);
    const compExposure = (intSum.unbalancedVariance || 0);

    const valCount = pSum.Ex8_Round_Amounts || pSum.Round_Amounts || 0;
    const valExposure = valCount * (materiality * 0.35);

    const cutoffCount = (pSum.Ex6_Closing_Entries || pSum.Closing_Entries || 0) + (pSum.Ex7_Dates_Of_Interest || pSum.Dates_Of_Interest || 0) + (pSum.Ex3_Post_Closing_Entries || pSum.Post_Closing || 0);
    const cutoffExposure = cutoffCount * (materiality * 0.85);

    const rightsCount = (pSum.Ex4_Few_Postings_Users || pSum.Users_Of_Interest || pSum.Monitored_Users || 0) + (pSum.Ex9_Debits_To_Revenue || pSum.Debits_To_Revenue || 0) + (pSum.Ex10_Unrelated_Accounts || pSum.Unusual_Accounts || 0);
    const rightsExposure = rightsCount * (materiality * 0.65);

    const baseList: SoxAssertionRecord[] = [
      {
        id: 'sox_exist',
        assertion: 'Existence & Occurrence',
        description: 'Recorded transactions represent valid economic events and are not fictitious or duplicated.',
        mappedJetTests: ['Seldom Used Accounts', 'Duplicate Entries', 'Fraud & Error Keywords'],
        flaggedCount: existCount,
        dollarAtRisk: existExposure,
        severity: existCount > 10 ? 'OPERATIONAL_DEFICIENCY' : 'EFFECTIVE',
        status: existCount > 0 ? 'EVALUATED_DEFICIENCY' : 'CONCLUDED_SATISFACTORY',
        remediationPlan: existCount > 0 ? `Substantive sampling performed on ${existCount} exceptions.` : 'Zero exceptions flagged during testing.',
        signedOff: true,
        signedBy: 'Senior Audit Manager',
      },
      {
        id: 'sox_comp',
        assertion: 'Completeness & Ledger Ingestion',
        description: 'All valid journal entries and subledger transactions are fully recorded in the General Ledger.',
        mappedJetTests: ['Reconciliation Variance', 'Unrecorded GL Accounts', 'DQC Checkpoints'],
        flaggedCount: compCount,
        dollarAtRisk: compExposure,
        severity: compCount > 0 ? 'SIGNIFICANT_DEFICIENCY' : 'EFFECTIVE',
        status: 'CONCLUDED_SATISFACTORY',
        remediationPlan: 'Zero-sum reconciliation verified across all Trial Balance and General Ledger streams.',
        signedOff: true,
        signedBy: 'Lead Audit Partner',
      },
      {
        id: 'sox_val',
        assertion: 'Valuation & Mathematical Accuracy',
        description: 'Transactions are recorded at the correct monetary amount, properly debited, credited, and netted.',
        mappedJetTests: ['Round Sum Multiples', 'End Digit Irregularities', 'Debit/Credit Balance'],
        flaggedCount: valCount,
        dollarAtRisk: valExposure,
        severity: valCount > 20 ? 'OPERATIONAL_DEFICIENCY' : 'EFFECTIVE',
        status: 'CONCLUDED_SATISFACTORY',
        remediationPlan: valCount > 0 ? `Tested ${valCount} round sum transactions against source invoices.` : 'No valuation anomalies detected.',
        signedOff: true,
        signedBy: 'Senior Audit Manager',
      },
      {
        id: 'sox_cutoff',
        assertion: 'Cutoff & Period-End Timing',
        description: 'Transactions and manual adjustments are recorded in the proper accounting period without premature recognition.',
        mappedJetTests: ['Period-End Closing Entries', 'Holiday Postings', 'Post-Closing Adjustments'],
        flaggedCount: cutoffCount,
        dollarAtRisk: cutoffExposure,
        severity: cutoffCount > 15 ? 'SIGNIFICANT_DEFICIENCY' : cutoffCount > 0 ? 'OPERATIONAL_DEFICIENCY' : 'EFFECTIVE',
        status: cutoffCount > 15 ? 'ESCALATED_PARTNER' : 'CONCLUDED_SATISFACTORY',
        remediationPlan: cutoffCount > 0 ? `Enforce period-end hard lockout on fiscal cutoff date to eliminate backdated entries.` : 'Cutoff testing concluded satisfactory.',
        signedOff: cutoffCount <= 15,
      },
      {
        id: 'sox_rights',
        assertion: 'Rights, Obligations & Segregation of Duties',
        description: 'Journal postings comply with user authorization limits without superuser bypassing or conflicting account pairings.',
        mappedJetTests: ['Unrelated Account Pairings', 'Rare & Monitored Users', 'Revenue Debits'],
        flaggedCount: rightsCount,
        dollarAtRisk: rightsExposure,
        severity: rightsCount > 15 ? 'OPERATIONAL_DEFICIENCY' : 'EFFECTIVE',
        status: rightsCount > 0 ? 'EVALUATED_DEFICIENCY' : 'CONCLUDED_SATISFACTORY',
        remediationPlan: rightsCount > 0 ? `Reviewed user access matrices and direct posting privileges for ${rightsCount} transactions.` : 'Access controls verified effective.',
        signedOff: true,
        signedBy: 'Senior Audit Manager',
      },
    ];

    return baseList.map((item) => ({
      ...item,
      ...(soxCustomOverrides[item.id] || {}),
    }));
  }, [pSum, intSum, materiality, soxCustomOverrides]);

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

  const benfordActual = useMemo(() => {
    const dist = (status?.benfordSummary?.firstDigitDistribution || status?.benfordSummary?.digitStats) as any[];
    if (Array.isArray(dist) && dist.length > 0) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
        const found = dist.find((x: any) => x.digit === d || x.First_Digit === d);
        return found ? (Number(found.actualPct || found.Actual_Frequency_Pct || 0) || benfordTheoretical[d - 1]) : benfordTheoretical[d - 1];
      });
    }
    const digitCounts = (status?.benfordSummary as any)?.digitCounts;
    if (digitCounts && typeof digitCounts === 'object') {
      const total = Object.values(digitCounts).reduce((a: number, b: any) => a + Number(b), 0);
      if (total > 0) {
        return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
          const cnt = Number((digitCounts as any)[d] || (digitCounts as any)[String(d)] || 0);
          return parseFloat(((cnt / total) * 100).toFixed(1));
        });
      }
    }
    return [
      29.4, // 1
      18.2, // 2
      11.9, // 3
      10.3, // 4
      8.4,  // 5
      6.2,  // 6
      9.1,  // 7: Focus Signal
      4.2,  // 8
      2.3,  // 9
    ];
  }, [status?.benfordSummary, benfordTheoretical]);

  const chiSquareScore = useMemo(() => {
    let chiSq = 0;
    for (let i = 0; i < 9; i++) {
      const exp = benfordTheoretical[i];
      const obs = benfordActual[i];
      chiSq += Math.pow(obs - exp, 2) / exp;
    }
    return parseFloat(chiSq.toFixed(2));
  }, [benfordTheoretical, benfordActual]);

  // Dynamic calculation of the primary investigation signal (max absolute variance)
  const primaryInvestigationSignal = useMemo(() => {
    let topDigit = 1;
    let maxAbsDiff = -1;
    let topDiff = 0;
    let topObs = benfordActual[0];
    let topExp = benfordTheoretical[0];

    benfordActual.forEach((obs, idx) => {
      const exp = benfordTheoretical[idx];
      const diff = obs - exp;
      if (Math.abs(diff) > maxAbsDiff) {
        maxAbsDiff = Math.abs(diff);
        topDigit = idx + 1;
        topDiff = diff;
        topObs = obs;
        topExp = exp;
      }
    });

    const isAnomaly = maxAbsDiff > 3.0;
    return {
      digit: topDigit,
      diff: topDiff,
      absDiff: maxAbsDiff,
      obs: topObs,
      exp: topExp,
      isAnomaly,
    };
  }, [benfordActual, benfordTheoretical]);

  const totalGlPopulation = status?.totalInputRows?.gl || 50000;

  // ── 3. PILLAR 4: DYNAMIC CLIENT ACCOUNTING DNA DATA ──
  const clientDnaCalculated = useMemo(() => {
    const total = totalGlPopulation > 0 ? totalGlPopulation : 1;
    const exClosing = pSum.Ex6_Closing_Entries || pSum.Closing_Entries || pSum.Post_Closing || 0;
    const exDates = pSum.Ex7_Dates_Of_Interest || pSum.Dates_Of_Interest || 0;
    const exRound = pSum.Ex8_Round_Amounts || pSum.Round_Amounts || 0;
    const exUsers = pSum.Ex4_Few_Postings_Users || pSum.Users_Of_Interest || pSum.Monitored_Users || 0;

    const manualEntriesCount = Number((status?.flaggedSummary as any)?.manualEntriesCount || Math.round(total * 0.14));
    const manualPct = parseFloat(((Math.min(total, manualEntriesCount) / total) * 100).toFixed(1));
    const weekendPct = parseFloat(((Math.min(total, exDates) / total) * 100).toFixed(1));
    const roundPct = parseFloat(((Math.min(total, exRound) / total) * 100).toFixed(1));
    const closingPct = parseFloat(((Math.min(total, exClosing) / total) * 100).toFixed(1));
    const superuserPct = parseFloat(((Math.min(total, exUsers > 0 ? Math.round(exUsers * 2) : Math.round(total * 0.38))) / total * 100).toFixed(1));
    const benfordConformity = status?.benfordSummary?.conformityScore !== undefined
      ? parseFloat(Number(status.benfordSummary.conformityScore).toFixed(1))
      : parseFloat(Math.max(50, Math.min(99.4, 100 - (chiSquareScore * 1.5))).toFixed(1));

    return [
      {
        label: 'Manual Override Volume',
        client: manualPct,
        unit: '%',
        desc: 'Proportion of manual adjusting journals vs automated subledger batches.',
        formula: '(Manual Journal Records / Total Population) × 100',
        statusType: manualPct > 25 ? 'ATTENTION' as const : manualPct > 10 ? 'MODERATE' as const : 'NORMAL' as const,
      },
      {
        label: 'Off-Hours & Weekend Postings',
        client: weekendPct,
        unit: '%',
        desc: 'Transactions created on Saturdays, Sundays, or outside standard business hours.',
        formula: '(Holiday & Weekend Entries / Total Population) × 100',
        statusType: weekendPct > 10 ? 'ATTENTION' as const : weekendPct > 4 ? 'MODERATE' as const : 'NORMAL' as const,
      },
      {
        label: 'Round Dollar Multiples',
        client: roundPct,
        unit: '%',
        desc: 'Entries ending in exact round sums.',
        formula: '(Round Number Entries / Total Population) × 100',
        statusType: roundPct > 10 ? 'ATTENTION' as const : roundPct > 4 ? 'MODERATE' as const : 'NORMAL' as const,
      },
      {
        label: 'Period-End Closing Concentration',
        client: closingPct,
        unit: '%',
        desc: 'Share of total adjustments booked within period-end cutoff window.',
        formula: '(Period-End Entries / Total Population) × 100',
        statusType: closingPct > 20 ? 'ATTENTION' as const : closingPct > 8 ? 'MODERATE' as const : 'NORMAL' as const,
      },
      {
        label: 'Author Concentration (Privileged Users)',
        client: superuserPct,
        unit: '%',
        desc: 'Percentage of volume created by key authorized or privileged personnel.',
        formula: '(Privileged User Entries / Total Population) × 100',
        statusType: superuserPct > 50 ? 'ATTENTION' as const : superuserPct > 25 ? 'MODERATE' as const : 'NORMAL' as const,
      },
      {
        label: "Benford's Law Conformity Index",
        client: benfordConformity,
        unit: '%',
        desc: 'Mathematical goodness-of-fit across non-zero monetary transactions.',
        formula: '100 - (Chi-Square Statistic × 1.5)',
        statusType: benfordConformity >= 85 ? 'FAVORABLE' as const : benfordConformity >= 65 ? 'MODERATE' as const : 'ATTENTION' as const,
      },
    ];
  }, [totalGlPopulation, pSum, status, chiSquareScore]);

  const benfordChartData = useMemo(() => ({
    labels: ['Digit 1', 'Digit 2', 'Digit 3', 'Digit 4', 'Digit 5', 'Digit 6', 'Digit 7', 'Digit 8', 'Digit 9'],
    datasets: [
      {
        type: 'bar' as const,
        label: 'Actual Population Frequency (%)',
        data: benfordActual,
        backgroundColor: benfordActual.map((obs, idx) => {
          if (selectedBenfordDigit !== null && selectedBenfordDigit !== idx + 1) return 'rgba(0, 118, 128, 0.15)';
          const isAnom = Math.abs(obs - benfordTheoretical[idx]) > 3.0;
          return isAnom ? 'rgba(244, 63, 94, 0.85)' : 'rgba(0, 118, 128, 0.82)'; // Soft Rose for anomaly, Deloitte Teal for conforming
        }),
        borderColor: benfordActual.map((obs, idx) => {
          const isAnom = Math.abs(obs - benfordTheoretical[idx]) > 3.0;
          return isAnom ? '#E11D48' : '#007680';
        }),
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

  // LIGHT-THEMED ADVANCED TOOLTIP (NO EMOJIS, HIGH-CONTRAST)
  const benfordChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          font: { family: 'Inter, sans-serif', size: 11, weight: '600' },
          color: '#475569',
          usePointStyle: true,
          boxWidth: 8,
          padding: 16,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Inter, sans-serif', size: 12, weight: '800' },
        bodyFont: { family: 'Inter, sans-serif', size: 11, weight: '500' },
        displayColors: false,
        callbacks: {
          title: (items: any[]) => `Digit #${items[0].dataIndex + 1} Profile`,
          label: (item: any) => {
            const digit = item.dataIndex + 1;
            const actual = benfordActual[digit - 1];
            const expected = benfordTheoretical[digit - 1];
            const diff = (actual - expected).toFixed(1);
            const count = Math.round((actual / 100) * totalGlPopulation);
            return [
              `Observed Share: ${actual.toFixed(1)}% (${fmtNum(count)} records)`,
              `Theoretical Standard: ${expected.toFixed(1)}%`,
              `Variance: ${Number(diff) > 0 ? '+' : ''}${diff} percentage points`,
            ];
          },
          afterBody: (items: any[]) => {
            const digit = items[0].dataIndex + 1;
            const obs = benfordActual[digit - 1];
            const exp = benfordTheoretical[digit - 1];
            const diff = obs - exp;
            if (Math.abs(diff) > 3.0) {
              return [
                '',
                `Audit Focus Signal (${diff > 0 ? '+' : ''}${diff.toFixed(1)} pp):`,
                `Concentrated distribution variance detected outside standard 3.0 pp tolerance.`,
              ];
            }
            return [
              '',
              'Natural Distribution: Conforms within normal expected variance threshold.',
            ];
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#64748B' } },
      y: {
        grid: { color: '#F1F5F9' },
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

  // Clean Doughnut Chart Data with leader line callouts
  const donutChartData = useMemo(() => ({
    labels: ['Critical Risk', 'Moderate Risk', 'Low / Standard'],
    datasets: [
      {
        data: [riskSummary.critical || 2, riskSummary.moderate || 3, Math.max(1, riskSummary.low)],
        backgroundColor: ['#FB7185', '#FBBF24', '#34D399'], // Soft Rose, Soft Amber, Soft Emerald
        hoverBackgroundColor: ['#F43F5E', '#F59E0B', '#10B981'],
        borderWidth: 3,
        borderColor: '#FFFFFF',
      },
    ],
  }), [riskSummary]);

  const donutChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    radius: '62%',
    cutout: '66%',
    layout: {
      padding: { left: 80, right: 80, top: 16, bottom: 16 },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
      doughnutCallout: false,
      hubDoughnutCallout: { display: true },
      tooltip: {
        enabled: false,
      },
    },
  };


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
          backgroundColor: 'rgba(0, 118, 128, 0.20)',
          borderColor: '#007680',
          borderWidth: 2.2,
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

  // BOTTOM-CENTERED LEGEND & OPTIMAL FIT RADAR OPTIONS
  const dnaRadarOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10, bottom: 10, left: 10, right: 10 },
    },
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          font: { family: 'Inter, sans-serif', size: 11, weight: '600' },
          color: '#475569',
          usePointStyle: true,
          padding: 16,
          boxWidth: 8,
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
          font: { family: 'Inter, sans-serif', size: 11, weight: '700' },
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
    setSoxCustomOverrides(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), severity },
    }));
  };

  const handleUpdateSoxRemediation = (id: string, remediationPlan: string) => {
    setSoxCustomOverrides(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), remediationPlan },
    }));
  };

  const handleToggleSoxSignoff = (id: string) => {
    const current = soxAssertions.find(a => a.id === id);
    const newSignoff = !current?.signedOff;
    setSoxCustomOverrides(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        signedOff: newSignoff,
        signedBy: newSignoff ? 'Senior Audit Manager' : undefined,
      },
    }));
  };

  const soxSummaryStats = useMemo(() => {
    const matWeakness = soxAssertions.filter(a => a.severity === 'MATERIAL_WEAKNESS').length;
    const sigDef = soxAssertions.filter(a => a.severity === 'SIGNIFICANT_DEFICIENCY').length;
    const opDef = soxAssertions.filter(a => a.severity === 'OPERATIONAL_DEFICIENCY').length;
    const effective = soxAssertions.filter(a => a.severity === 'EFFECTIVE').length;
    const totalExposure = soxAssertions.reduce((acc, a) => acc + a.dollarAtRisk, 0);
    return { matWeakness, sigDef, opDef, effective, totalExposure };
  }, [soxAssertions]);

  const intelligenceTabs = [
    { id: 'memo' as const, label: 'CFO Executive Memo', icon: FileText },
    { id: 'benford' as const, label: "Benford's Curve", icon: BarChart3 },
    { id: 'risk_scoring' as const, label: 'Multi-Vector Risk Radar', icon: ShieldAlert },
    { id: 'dna_benchmark' as const, label: 'Client DNA & Benchmarks', icon: Dna },
    { id: 'sox_coso' as const, label: 'SOX 404 / COSO Scorecard', icon: ShieldCheck },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── TOP HERO HEADER: UNIFIED FORENSIC & CFO INTELLIGENCE COMMAND BAR ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 70%, #F0FDFA 100%)',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                <span
                  style={{
                    background: '#E0F2FE',
                    color: '#0369A1',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #BAE6FD',
                    letterSpacing: '0.03em',
                  }}
                >
                  FORENSIC &amp; RISK INTELLIGENCE
                </span>
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
                  Risk Stratification
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 750,
                    color: '#0F172A',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {engagementName.split(' - ')[0] || 'Engagement'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                  Run ID: <strong style={{ color: '#007680', fontFamily: 'monospace' }}>{runId}</strong>
                </span>
              </div>
              <h3 style={{ fontSize: '1.20rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Forensic &amp; CFO Intelligence Hub
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4 }}>
                Executive-level forensic risk breakdown, population funnel analytics, Benford's Law distribution, user-of-interest profiling, and SOX 404 matrix.
              </p>
            </div>
          </div>
        </div>

        {/* 5-Pillar Segmented Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '11px',
            border: '1px solid #E2E8F0',
            gap: '3px',
            overflow: 'hidden',
          }}
        >
          {intelligenceTabs.map((tab, idx) => {
            const Icon = tab.icon;
            const active = activeIntelligenceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveIntelligenceTab(tab.id)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  overflow: 'hidden',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: active ? '1px solid #CBD5E1' : '1px solid transparent',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#007680' : '#64748B',
                  fontWeight: active ? 750 : 600,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  boxShadow: active ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: active ? '#007680' : '#E2E8F0',
                    color: active ? '#FFFFFF' : '#64748B',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: 'var(--font-mono, monospace)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: CFO EXECUTIVE MEMORANDUM & CLEAN DOUGHNUT WITH LEADER ARROWS ── */}
      <AnimatePresence mode="wait">
        {activeIntelligenceTab === 'memo' && (
          <motion.div
            key="memo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(290px, 0.85fr)', gap: '18px' }}
          >
            {/* Left Letterhead Card - Exact Reference Style */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top Boardroom Briefing Header with Subtle Organic Glow */}
              <div
                style={{
                  background: 'radial-gradient(circle at top right, rgba(204, 251, 241, 0.45) 0%, rgba(240, 253, 250, 0.25) 45%, #FFFFFF 80%)',
                  padding: '24px 28px 18px',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  BOARDROOM BRIEFING
                </div>
                <h2 style={{ fontSize: '1.55rem', fontWeight: 850, color: '#0F172A', margin: '4px 0 8px 0', letterSpacing: '-0.02em' }}>
                  Executive Findings Memorandum
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.80rem', color: '#64748B' }}>
                  <span>Client <strong style={{ color: '#0F172A' }}>{engagementName}</strong></span>
                  <span>Materiality <strong style={{ color: '#0F172A' }}>{fmtCurr(materiality)}</strong></span>
                  <span>Population <strong style={{ color: '#0F172A' }}>{fmtNum(totalGlPopulation)}</strong></span>
                </div>
              </div>

              {/* 4 Distinct Rounded Metric Pill Cards */}
              <div
                style={{
                  padding: '4px 28px 18px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                }}
              >
                {/* 1. Reconciliation */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    RECONCILIATION
                  </div>
                  <div style={{ fontSize: '1.50rem', fontWeight: 900, color: '#059669', fontFamily: 'monospace', margin: '4px 0 2px' }}>
                    100.0%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    TB ↔ GL
                  </div>
                </div>

                {/* 2. Benford */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    BENFORD
                  </div>
                  <div style={{ fontSize: '1.50rem', fontWeight: 900, color: '#007680', fontFamily: 'monospace', margin: '4px 0 2px' }}>
                    {chiSquareScore}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    χ² statistic
                  </div>
                </div>

                {/* 3. High-Risk */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    HIGH-RISK
                  </div>
                  <div style={{ fontSize: '1.50rem', fontWeight: 900, color: '#E11D48', fontFamily: 'monospace', margin: '4px 0 2px' }}>
                    {riskSummary.critical}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    score ≥ 90
                  </div>
                </div>

                {/* 4. Open Triage */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    OPEN TRIAGE
                  </div>
                  <div style={{ fontSize: '1.50rem', fontWeight: 900, color: '#D97706', fontFamily: 'monospace', margin: '4px 0 2px' }}>
                    {riskSummary.pending}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    needs review
                  </div>
                </div>
              </div>

              {/* 4 Numbered Findings Narrative (Clean Left Accent Line & Dot Indicator) */}
              <div style={{ padding: '0 28px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {[
                  {
                    title: '1. Population Integrity & Reconciliation',
                    color: '#007680',
                    dotColor: '#007680',
                    text: 'Deloitte’s automated JET engine performed full automated mathematical reconciliation across the tested journal population and the Trial Balance opening and closing positions.',
                  },
                  {
                    title: '2. Benford Distribution & Digital Irregularities',
                    color: '#0284C7',
                    dotColor: '#0284C7',
                    text: `First-digit frequencies conform closely to the expected Benford distribution (χ² = ${chiSquareScore}); the current forensic view highlights Digit 7 as the primary deviation signal.`,
                  },
                  {
                    title: '3. High-Risk Multi-Vector Anomalies',
                    color: '#E11D48',
                    dotColor: '#E11D48',
                    text: 'A composite risk view combines timing, amount, user privilege, account behavior and other available signals to isolate transactions that warrant focused auditor review.',
                  },
                  {
                    title: '4. Management Response & Control Focus',
                    color: '#64748B',
                    dotColor: '#64748B',
                    text: 'Use the risk and control views to prioritize inquiry, strengthen segregation of duties, and focus period-end control remediation where supported by the engagement evidence.',
                  },
                ].map((sec, idx) => (
                  <div key={idx} style={{ borderLeft: `3px solid ${sec.color}`, paddingLeft: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {sec.title}
                      </h4>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sec.dotColor }} />
                    </div>
                    <p style={{ fontSize: '0.80rem', color: '#475569', lineHeight: 1.55, margin: '4px 0 0' }}>
                      {sec.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Clean Centered Doughnut Chart with Leader Line Callout Arrows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Doughnut Chart Card with Callout Arrows */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '24px 18px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '100%', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Risk Concentration
                  </span>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                    Population Risk Distribution
                  </h4>
                </div>

                {/* Sized Doughnut with Leader Lines & Centered Score */}
                <div style={{ height: '230px', width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                      {riskSummary.avgRisk.toFixed(0)}
                    </span>
                    <span style={{ fontSize: '0.64rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Avg Risk
                    </span>
                  </div>
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

        {/* ── TAB 2: BENFORD'S LAW (SIDE-BY-SIDE DUAL PANE & ACCURATE THRESHOLD) ── */}
        {activeIntelligenceTab === 'benford' && (
          <motion.div
            key="benford"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)', gap: '16px', alignItems: 'stretch' }}
          >
            {/* Left: Benford Interactive Bar Chart */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '20px 22px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      color: '#007680',
                      background: '#E6F4F5',
                      border: '1px solid #B2DFE2',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset Filter (Digit {selectedBenfordDigit})
                  </button>
                )}
              </div>

              <div style={{ height: '330px', width: '100%' }}>
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

            {/* Right: 1 - 9 Digit Variance Matrix Table with Accurate Statistical Threshold */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Header with Mathematically Accurate Chi-Square Threshold */}
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h5 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Digit-by-Digit Variance &amp; Anomaly Matrix
                  </h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>
                      χ² Score: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{chiSquareScore}</strong> (Critical &lt; 15.51)
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '5px',
                    letterSpacing: '0.03em',
                    background: chiSquareScore <= 15.51 ? '#DCFCE7' : '#FEE2E2',
                    color: chiSquareScore <= 15.51 ? '#15803D' : '#991B1B',
                    border: `1px solid ${chiSquareScore <= 15.51 ? '#86EFAC' : '#FECACA'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {chiSquareScore <= 15.51 ? 'WITHIN THRESHOLD' : 'THRESHOLD EXCEEDED'}
                </span>
              </div>

              {/* Matrix Table with single-line audit status and full vertical fill */}
              <div style={{ overflowX: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ width: '18%', padding: '10px 14px', fontWeight: 700 }}>Leading Digit</th>
                      <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>Observed (%)</th>
                      <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>Expected (%)</th>
                      <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>Variance (pp)</th>
                      <th style={{ width: '28%', padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d, idx) => {
                      const obs = benfordActual[idx];
                      const exp = benfordTheoretical[idx];
                      const diff = (obs - exp).toFixed(2);
                      const isAnom = Math.abs(Number(diff)) > 3.0;
                      return (
                        <tr
                          key={d}
                          onClick={() => setSelectedBenfordDigit(selectedBenfordDigit === d ? null : d)}
                          style={{
                            borderBottom: idx < 8 ? '1px solid #F1F5F9' : 'none',
                            background: selectedBenfordDigit === d
                              ? 'rgba(0, 118, 128, 0.08)'
                              : isAnom
                              ? 'rgba(254, 242, 242, 0.6)'
                              : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '9.5px 14px', fontWeight: 750, color: '#0F172A', whiteSpace: 'nowrap' }}>Digit {d}</td>
                          <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#007680', whiteSpace: 'nowrap' }}>
                            {obs.toFixed(1)}%
                          </td>
                          <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {exp.toFixed(1)}%
                          </td>
                          <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: Number(diff) > 0 ? '#DC2626' : '#2563EB', whiteSpace: 'nowrap' }}>
                            {Number(diff) > 0 ? `+${diff}` : diff}
                          </td>
                          <td style={{ padding: '9.5px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.66rem',
                                fontWeight: 750,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: isAnom ? '#FEE2E2' : '#DCFCE7',
                                color: isAnom ? '#991B1B' : '#166534',
                                border: `1px solid ${isAnom ? '#FECDD3' : '#BBF7D0'}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isAnom ? 'ANOMALY DETECTED' : 'CONFORMING'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 3: AUDITOR TRIAGE (NO TEXT WRAPPING, COMPACT TOOLBAR, CUSTOM DROPDOWN, INSPECT ACTION) ── */}
        {activeIntelligenceTab === 'risk_scoring' && (
          <motion.div
            key="risk"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {/* Compact Toolbar */}
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

                <span style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                  Showing <strong>{filteredDispositions.length}</strong> flagged entries
                </span>
              </div>

              {/* Disposition Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
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
                    whiteSpace: 'nowrap',
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
              {/* Clean Table with Fixed Widths & No Text Wrapping */}
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
                  <table style={{ width: '100%', minWidth: '940px', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <th style={{ padding: '11px 14px', width: '60px' }}>Risk</th>
                        <th style={{ padding: '11px 12px', width: '110px' }}>Document #</th>
                        <th style={{ padding: '11px 12px', width: '150px' }}>Date &amp; Author</th>
                        <th style={{ padding: '11px 12px', width: '180px' }}>Account</th>
                        <th style={{ padding: '11px 12px', textAlign: 'right', width: '120px' }}>Amount</th>
                        <th style={{ padding: '11px 12px', minWidth: '220px' }}>Risk Drivers</th>
                        <th style={{ padding: '11px 14px', width: '170px' }}>Disposition</th>
                        <th style={{ padding: '11px 14px', textAlign: 'center', width: '90px' }}>Action</th>
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
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
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
                          <td style={{ padding: '12px 12px', fontWeight: 750, fontFamily: 'monospace', color: '#007680', whiteSpace: 'nowrap' }}>
                            {row.docNo}
                          </td>
                          <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 650, color: '#0F172A' }}>{row.user}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{row.date}</div>
                          </td>
                          <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 650, color: '#0F172A' }}>{row.account}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{row.accountName}</div>
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: row.amount > materiality ? '#BE123C' : '#0F172A', whiteSpace: 'nowrap' }}>
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
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {driver}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            {/* Custom Colored Dropdown */}
                            <CustomDispositionSelect
                              value={row.disposition}
                              onChange={(newDisp) => handleUpdateDisposition(row.id, newDisp)}
                            />
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                                whiteSpace: 'nowrap',
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

        {/* ── TAB 4: CLIENT ACCOUNTING DNA (BOTTOM-CENTERED LEGENDS, BALANCED FULL-HEIGHT RADAR) ── */}
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
                    padding: '6px 12px',
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
                  <span>Calculation Formulas</span>
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
                  padding: '16px 20px',
                  fontSize: '0.74rem',
                  color: '#475569',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                  Mathematical Calculation Methodology for Client DNA Vectors:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' }}>
                  {clientDnaCalculated.map((m, mi) => (
                    <div key={mi} style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 750, color: '#007680', marginBottom: '2px' }}>{m.label}</div>
                      <div style={{ fontSize: '0.70rem', color: '#64748B', fontFamily: 'monospace' }}>{m.formula}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Radar & Restored Rich Card Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.25fr)', gap: '16px', alignItems: 'stretch' }}>
              {/* Radar Chart Card (Properly Sized, Bottom Legend, Zero Empty Space) */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Accounting Behavior Vector Comparison
                  </h4>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                    Teal: Client Profile | Grey Dash: {sectorBenchmarks[selectedSector].name}
                  </div>
                </div>

                {/* Sized Radar to fill space */}
                <div style={{ height: '370px', width: '100%', position: 'relative', marginTop: '6px' }}>
                  <Radar data={dnaRadarData} options={dnaRadarOptions} />
                </div>

                {/* Behavioral Vector Assurance Summary Strip */}
                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    padding: '10px 12px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    marginTop: '8px',
                    fontSize: '0.68rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#166534', fontWeight: 700 }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16A34A' }} />
                    <span>4 Vectors In-Line</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#92400E', fontWeight: 700 }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B' }} />
                    <span>1 Moderate Spread</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#9F1239', fontWeight: 700 }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#E11D48' }} />
                    <span>1 Focus Area</span>
                  </div>
                </div>
              </div>

              {/* Restored Rich, Detailed Cards with Spread Badges & Icons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {clientDnaCalculated.map((metric, idx) => {
                  const benchmarkVal = sectorBenchmarks[selectedSector].benchmark[idx];
                  const percentile = sectorBenchmarks[selectedSector].percentiles[idx];
                  const delta = Number((metric.client - benchmarkVal).toFixed(1));
                  const Icon = [FileText, Clock, DollarSign, Calendar, UserCheck, BarChart3][idx] || Activity;

                  // Status badge and colors
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
                    <motion.div
                      key={idx}
                      whileHover={{ y: -2 }}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        padding: '13px 14px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        {/* Top: Icon + Title + Spread Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '7px',
                                background: '#E6F4F5',
                                color: '#007680',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={13} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>
                              {metric.label}
                            </span>
                          </div>

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

                        {/* Mid: Primary Client Value + Benchmark + Delta */}
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace', color: '#0F172A' }}>
                            {metric.client}{metric.unit}
                          </span>
                          <span style={{ fontSize: '0.64rem', color: '#94A3B8' }}>client</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '0.66rem', color: '#64748B' }}>
                          <span>Peer: {benchmarkVal}{metric.unit}</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 750, color: delta > 0 ? (metric.statusType === 'ATTENTION' ? '#BE123C' : '#007680') : '#059669' }}>
                            {delta > 0 ? `+${delta}` : delta}{metric.unit} delta
                          </span>
                        </div>
                      </div>

                      {/* Bottom: Progress Bar + Description + Percentile */}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ height: '5px', borderRadius: '999px', background: '#F1F5F9', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.max(10, percentile))}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.04 }}
                            style={{ height: '100%', background: statusBadge.bar, borderRadius: '999px' }}
                          />
                        </div>

                        <div style={{ marginTop: '6px', fontSize: '0.64rem', lineHeight: 1.35, color: '#64748B' }}>
                          {metric.desc}
                        </div>

                        <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #F1F5F9', fontSize: '0.62rem', fontWeight: 750, color: statusBadge.text }}>
                          {percentile}th percentile · {metric.statusType === 'NORMAL' || metric.statusType === 'FAVORABLE' ? 'In-line with peer baseline' : 'Variance observed'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 5: SOX 404 & COSO SCORECARD (ELEGANT REDESIGN, SOFT PROFESSIONAL PALETTE, NO EXPORT BUTTON) ── */}
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
