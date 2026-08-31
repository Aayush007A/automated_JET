import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  TrendingUp,
  Shield,
  ShieldCheck,
  BarChart3,
  GitBranch,
  PieChart,
  Activity,
  Users,
  Lock,
  Calendar,
  DollarSign,
  Copy,
  FileText,
  AlertTriangle,
  Grid,
  TrendingDown,
  Sparkles,
  Play,
  Pause,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   ANIMATED COUNT-UP NUMBER COMPONENT
───────────────────────────────────────────────────────────────────────── */

const AnimatedNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  animKey: number;
}> = ({ value, prefix = '', suffix = '', decimals = 0, animKey }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 850;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setDisplay(value * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplay(value);
      }
    };

    const frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, animKey]);

  return (
    <span>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   12 ANALYTICAL CATEGORIES METADATA
───────────────────────────────────────────────────────────────────────── */

export interface VisualizationCategory {
  id: string;
  num: string;
  category: string;
  shortLabel: string;
  badge: string;
  icon: React.ElementType;
  title: string;
  whatItShows: string;
  description: string;
  insight: string;
  analyticalMethod: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metricLabel: string;
  metricValue: string;
}

const CATEGORIES: VisualizationCategory[] = [
  {
    id: '01_account_wise',
    num: '01',
    category: 'Account Wise Analysis',
    shortLabel: '01. Account Wise',
    badge: 'Summary 1 · Ex 01 Exception',
    icon: Layers,
    title: 'Account Activity Distribution & Line Debit Exposure',
    whatItShows: 'Dual visualization: Standard vs. Non-Standard lines per GL account paired with Financial Statement Line Debit Exposure donut.',
    description: 'Classifies all journal lines by GL account to separate standard ERP subledger batches from non-standard manual adjustments across critical balance sheet segments.',
    insight: 'Accounts with over 15% non-standard volume in liquid asset segments indicate override risk and are prioritized for substantive testing.',
    analyticalMethod: 'Standard vs Non-Standard Line Classification',
    riskLevel: 'HIGH',
    metricLabel: 'Debit Coverage',
    metricValue: '6 GL Segments',
  },
  {
    id: '02_revenue_debits',
    num: '02',
    category: 'Large Debits to Revenue',
    shortLabel: '02. Revenue Debits',
    badge: 'Summary 2 · Ex 03 Exception',
    icon: TrendingDown,
    title: 'Unusual Revenue Debit Outliers & Top Account Impact',
    whatItShows: 'Monetary debit ranking across revenue accounts vs. materiality threshold with variance clustering.',
    description: 'Screens the revenue cycle for irregular debit postings that directly reduce recognized gross revenue, identifying potential unauthorized write-offs or rebate manipulations.',
    insight: 'Debit entries booked to Top-line Sales accounts within 5 days of quarter-end exceeding $250k require mandatory contract confirmation.',
    analyticalMethod: 'Revenue Debit Threshold Stratification',
    riskLevel: 'CRITICAL',
    metricLabel: 'Materiality Cut',
    metricValue: '>$250,000 Threshold',
  },
  {
    id: '03_user_wise',
    num: '03',
    category: 'User Wise Analysis',
    shortLabel: '03. User Wise',
    badge: 'Summary 3 · Ex 04 Exception',
    icon: Users,
    title: 'User Posting Value Distribution & Segregation of Duties',
    whatItShows: 'Monetary posting distribution across user profiles + risk classification (Admin/Temp vs Operations vs Batch).',
    description: 'Analyzes preparer and approver identities across the journal population to isolate administrative super-users and temporary external accounts posting high-value entries.',
    insight: '17% of total monetary value posted by USR_SYS_ADMIN and USR_TEMP_AUDIT without documented secondary approval indicates SOD deficiency.',
    analyticalMethod: 'User Role & Authorization Profiling',
    riskLevel: 'HIGH',
    metricLabel: 'Risk Exposure',
    metricValue: '17% Admin/Temp Postings',
  },
  {
    id: '04_closing_entries',
    num: '04',
    category: 'Closing Entries Analysis',
    shortLabel: '04. Closing Entries',
    badge: 'Summary 4 · Ex 06 Exception',
    icon: Lock,
    title: 'Period-End Closing Adjustments & Financial Statement Impact',
    whatItShows: 'Financial Statement effect breakdown (Increase in Expense 45%, Assets 23%, Liab 17%) + Post-period timing trajectory.',
    description: 'Isolates entries booked during the critical fiscal closing window (Day -1 to +8) and evaluates their net P&L and balance sheet reallocation magnitude.',
    insight: 'Late closing adjustments shifting $8.4M into Expense accounts booked with weak descriptions represent high risk for earnings smoothing.',
    analyticalMethod: 'Fiscal Cut-Off Window Stratification',
    riskLevel: 'HIGH',
    metricLabel: 'Closing Impact',
    metricValue: '4 Financial Lines',
  },
  {
    id: '05_dates_interest',
    num: '05',
    category: 'Dates of Interest & Holidays',
    shortLabel: '05. Dates of Interest',
    badge: 'Summary 5 · Ex 07 Exception',
    icon: Calendar,
    title: 'Off-Hours, Weekend & Public Holiday Posting Velocity',
    whatItShows: 'Time-series volume velocity curve mapping weekend and holiday postings against standard business day baseline.',
    description: 'Monitors transactions recorded on non-working days, statutory holidays, and off-hour periods when supervision and automated controls are reduced.',
    insight: 'A spike of 382 journal entries posted on Sunday midnight preceding fiscal cut-off warrants targeted forensic authorization verification.',
    analyticalMethod: 'Non-Business Calendar Temporal Screening',
    riskLevel: 'MEDIUM',
    metricLabel: 'Off-Hours Volume',
    metricValue: '382 Flagged Entries',
  },
  {
    id: '06_amount_analysis',
    num: '06',
    category: 'Amount & Round Dollar Analysis',
    shortLabel: '06. Amount Analysis',
    badge: 'Summary 6 · Ex 08 Exception',
    icon: DollarSign,
    title: 'Benford’s Law Digit Conformance & Round Dollar Multiples',
    whatItShows: 'Benford’s Law 1–9 first-digit logarithmic curve vs. actuals + round dollar clustering ($1k, $5k, $10k, $100k).',
    description: 'Tests mathematical naturalness of the journal population using Benford’s Law first-digit analysis alongside exact round dollar threshold screening.',
    insight: 'Benford’s Law conformity index of 96% confirms natural transaction spread, with minor clustering observed in $50k round sum provisions.',
    analyticalMethod: 'Benford First-Digit & Round Density',
    riskLevel: 'LOW',
    metricLabel: 'Benford Score',
    metricValue: '96% (Grade A)',
  },
  {
    id: '07_duplicate_entries',
    num: '07',
    category: 'Duplicate Journal Entries',
    shortLabel: '07. Duplicate Analysis',
    badge: 'Summary 7 · Ex 09 Exception',
    icon: Copy,
    title: 'Exact & Near-Duplicate Transaction Clusters',
    whatItShows: 'Density distribution of duplicate postings matched on identical Amount, Account, Date, and Description parameters.',
    description: 'Identifies potential double-counting, accidental re-postings, or deliberate duplicate entries designed to circumvent approval limits.',
    insight: '214 duplicate entry pairs identified with identical debit/credit sums posted within 48 hours of original subledger batches.',
    analyticalMethod: 'Multi-Parameter Near-Exact Matching',
    riskLevel: 'HIGH',
    metricLabel: 'Duplicate Count',
    metricValue: '214 Matched Pairs',
  },
  {
    id: '08_word_count',
    num: '08',
    category: 'High-Risk Word Count',
    shortLabel: '08. Word Count',
    badge: 'Summary 8 · Ex 10 Exception',
    icon: FileText,
    title: 'Sensitive Keyword Density & Risk Severity Stratification',
    whatItShows: 'Monitored keyword frequency ("Manual", "Adjust", "Override", "Fraud", "Plug", "Suspense") + Risk Severity Donut.',
    description: 'Scans journal header narrations and line descriptions against Deloitte’s forensic dictionary to detect subjective or high-risk terminology.',
    insight: 'Keywords categorized as High Risk ("Fraud", "Plug", "Override") represent 7% of flagged entries totaling $6.98M in debit volume.',
    analyticalMethod: 'Forensic Lexical Pattern Scanning',
    riskLevel: 'CRITICAL',
    metricLabel: 'High-Risk Keywords',
    metricValue: '7 Flagged Terms',
  },
  {
    id: '09_post_closing',
    num: '09',
    category: 'After Closing Entries',
    shortLabel: '09. After Closing',
    badge: 'Summary 9 · Ex 11 Exception',
    icon: AlertTriangle,
    title: 'Post-Cutoff Journal Entry Velocity & Audit Cutoff Integrity',
    whatItShows: 'Timeline distribution of late adjustments recorded after initial ledger freeze date.',
    description: 'Evaluates entries booked subsequent to the official trial balance freeze date to detect late unapproved adjustments affecting audited financial balances.',
    insight: '98,724 post-closing lines detected with significant concentration in period-end tax and inventory revaluation accounts.',
    analyticalMethod: 'Post-Close Timestamp Boundary Analysis',
    riskLevel: 'HIGH',
    metricLabel: 'Post-Close Lines',
    metricValue: '98.7k Entries',
  },
  {
    id: '10_unrelated_accounts',
    num: '10',
    category: 'Unrelated Account Combinations',
    shortLabel: '10. Unrelated Accounts',
    badge: 'Summary 10 · Ex 12 Exception',
    icon: Grid,
    title: 'Atypical Cross-Ledger Postings & Account Matrix Anomalies',
    whatItShows: 'Matrix of unusual debit/credit pairings bridging disparate financial statement categories (e.g. Cash vs Equity).',
    description: 'Detects unusual journal lines that cross unrelated chart of account boundaries that have no legitimate operational business nexus.',
    insight: '128 entries linking Cash directly to Non-Operating Equity without intermediary clearing accounts flagged for substantive substantiation.',
    analyticalMethod: 'Account Association Heatmap Matrix',
    riskLevel: 'HIGH',
    metricLabel: 'Anomalous Pairs',
    metricValue: '128 Flagged Postings',
  },
  {
    id: '11_population_stats',
    num: '11',
    category: 'Population Statistics',
    shortLabel: '11. Population Stats',
    badge: 'Summary 11 · Period Analysis',
    icon: Activity,
    title: 'Period-Wise Monetary Trajectory & Monthly Volume Breakdown',
    whatItShows: 'Smooth P1–P12 Local Currency Activity Trajectory line + Monthly Standard vs Non-Standard volume grouped bars.',
    description: 'Visualizes the 12-month baseline operational tempo across the entire general ledger population, exposing seasonality and period-end processing spikes.',
    insight: 'Sharp upward spike in P12 non-standard entries exceeding $8.3M demonstrates high fiscal year-end pressure entries requiring focused review.',
    analyticalMethod: 'Longitudinal Fiscal Trend Analysis',
    riskLevel: 'HIGH',
    metricLabel: 'Temporal Scope',
    metricValue: '12 Fiscal Periods',
  },
  {
    id: '12_forensic_radar',
    num: '12',
    category: 'Forensic Intelligence Vectors',
    shortLabel: '12. Forensic Radar',
    badge: 'Executive Risk DNA · Multi-Vector',
    icon: TrendingUp,
    title: 'Accounting Behavior Vector Comparison & Forensic Radar',
    whatItShows: '6-axis Radar chart comparing Client Risk DNA vs. Industry Peer Median across 6 behavioral dimensions.',
    description: 'Multi-dimensional evaluation benchmarking the client against Manufacturing & Industrial peer medians across Manual Overrides, Off-Hours, Closing Rush, and Benford conformity.',
    insight: 'Closing Concentration at 40.2% (+25.7% delta vs peer median) flagged as Primary Focus Area, while Benford Conformity confirms natural data spread.',
    analyticalMethod: 'Multi-Vector Behavioral Benchmarking',
    riskLevel: 'HIGH',
    metricLabel: 'Behavioral Vectors',
    metricValue: '6 Forensic Axes',
  },
];

const RISK_BADGES: Record<string, { color: string; bg: string; border: string }> = {
  LOW:      { color: '#007680', bg: '#E6F4F5', border: '#99D5D9' },
  MEDIUM:   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  HIGH:     { color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' },
  CRITICAL: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

/* ─────────────────────────────────────────────────────────────────────────
   ANIMATED SVG CHART COMPONENTS (BUILDS FROM 0 ON EVERY SLIDE CHANGE)
───────────────────────────────────────────────────────────────────────── */

/**
 * Animated SVG Bar Chart:
 * Starts at 0 height and animates each column upwards in sequence!
 */
const AnimatedBarChart: React.FC<{
  labels: string[];
  datasets: { label?: string; data: number[]; color: string }[];
  maxVal?: number;
  animKey: number;
  yFormat?: (v: number) => string;
}> = ({ labels, datasets, maxVal, animKey, yFormat }) => {
  const calculatedMax = maxVal || Math.max(...datasets.flatMap((d) => d.data)) * 1.15 || 100;
  const numBars = labels.length;
  const numSeries = datasets.length;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Grid Lines */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>
        {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${frac * 100}%`,
              borderBottom: '1px dashed #F1F5F9',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Bars Container */}
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', zIndex: 2 }}>
          {labels.map((_, colIdx) => (
            <div key={colIdx} style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '100%', flex: 1, justifyContent: 'center' }}>
              {datasets.map((series, sIdx) => {
                const val = series.data[colIdx] || 0;
                const heightPercent = Math.min((val / calculatedMax) * 100, 100);
                return (
                  <div key={sIdx} style={{ height: '100%', display: 'flex', alignItems: 'flex-end', width: numSeries > 1 ? '38%' : '52%', maxWidth: '28px' }}>
                    <motion.div
                      key={`bar-${animKey}-${colIdx}-${sIdx}`}
                      initial={{ height: '0%' }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{
                        duration: 0.75,
                        delay: colIdx * 0.07 + sIdx * 0.12,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: series.color,
                        borderTopLeftRadius: '3px',
                        borderTopRightRadius: '3px',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* X-Axis Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '6px', overflow: 'hidden' }}>
        {labels.map((lbl, idx) => (
          <span key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '0.62rem', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', padding: '0 2px' }}>
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Animated SVG Line Chart:
 * Starts at 0 and traces/draws the line from left to right with points popping in!
 */
const AnimatedLineChart: React.FC<{
  labels: string[];
  data: number[];
  color: string;
  fillColor?: string;
  animKey: number;
  secondaryData?: { data: number[]; color: string; label?: string };
}> = ({ labels, data, color, fillColor = 'rgba(0, 118, 128, 0.12)', animKey, secondaryData }) => {
  const maxVal = Math.max(...data, ...(secondaryData?.data || [])) * 1.15 || 100;
  const minVal = 0;
  const width = 340;
  const height = 140;
  const paddingX = 18;
  const paddingY = 12;

  const getPoints = (arr: number[]) => {
    const stepX = (width - paddingX * 2) / (arr.length - 1);
    return arr.map((val, i) => {
      const x = paddingX + i * stepX;
      const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - paddingY * 2);
      return { x, y };
    });
  };

  const points = getPoints(data);
  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const secPoints = secondaryData ? getPoints(secondaryData.data) : null;
  const secPathD = secPoints ? secPoints.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '') : null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Grid Lines */}
          {[0.25, 0.5, 0.75].map((frac, idx) => (
            <line
              key={idx}
              x1={paddingX}
              y1={paddingY + (height - paddingY * 2) * frac}
              x2={width - paddingX}
              y2={paddingY + (height - paddingY * 2) * frac}
              stroke="#F1F5F9"
              strokeDasharray="3,3"
            />
          ))}

          {/* Area Fill Reveal */}
          <motion.path
            key={`area-${animKey}`}
            d={areaD}
            fill={fillColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          />

          {/* Secondary Line (if any) */}
          {secPathD && secondaryData && (
            <motion.path
              key={`line-sec-${animKey}`}
              d={secPathD}
              fill="none"
              stroke={secondaryData.color}
              strokeWidth="2"
              strokeDasharray="4,3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            />
          )}

          {/* Primary Line Drawing Animation (Left to Right) */}
          <motion.path
            key={`line-main-${animKey}`}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Data Points Pop-In */}
          {points.map((p, i) => (
            <motion.circle
              key={`pt-${animKey}-${i}`}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + (i / points.length) * 0.8, duration: 0.3 }}
            />
          ))}
        </svg>
      </div>

      {/* X-Axis Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', paddingTop: '4px' }}>
        {labels.map((lbl, idx) => (
          <span key={idx} style={{ fontSize: '0.60rem', color: '#64748B', fontWeight: 600 }}>
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Animated SVG Doughnut Chart:
 * Starts at 0° and sweeps clockwise to build the full circle slice by slice!
 */
const AnimatedDoughnutChart: React.FC<{
  slices: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: number;
  centerPrefix?: string;
  centerSuffix?: string;
  centerDecimals?: number;
  animKey: number;
}> = ({ slices, centerLabel, centerValue, centerPrefix = '', centerSuffix = '', centerDecimals = 0, animKey }) => {
  const size = 130;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;

  let accumulatedPercent = 0;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {/* Background Track */}
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />

          {/* Slices Building Radially */}
          {slices.map((slice, i) => {
            const percent = slice.value / total;
            const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
            const strokeDashoffset = -circumference * accumulatedPercent;
            accumulatedPercent += percent;

            return (
              <motion.circle
                key={`slice-${animKey}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: strokeDashoffset }}
                transition={{
                  duration: 0.95,
                  delay: i * 0.14,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            );
          })}
        </svg>

        {/* Center Animated Metric */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600 }}>{centerLabel}</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
            <AnimatedNumber
              value={centerValue}
              prefix={centerPrefix}
              suffix={centerSuffix}
              decimals={centerDecimals}
              animKey={animKey}
            />
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Animated SVG Radar Chart:
 * Forensic DNA polygon blooms and expands outwards from center!
 */
const AnimatedRadarChart: React.FC<{
  labels: string[];
  clientData: number[];
  peerData: number[];
  animKey: number;
}> = ({ labels, clientData, peerData, animKey }) => {
  const size = 180;
  const center = size / 2;
  const maxRadius = 65;
  const numAxes = labels.length;

  const getCoordinates = (value: number, index: number) => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const clientPointsStr = clientData.map((val, i) => {
    const p = getCoordinates(val, i);
    return `${p.x},${p.y}`;
  }).join(' ');

  const peerPointsStr = peerData.map((val, i) => {
    const p = getCoordinates(val, i);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Concentric Web Rings */}
        {[0.33, 0.66, 1.0].map((frac, idx) => {
          const ringPoints = Array.from({ length: numAxes }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
            const r = maxRadius * frac;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return <polygon key={idx} points={ringPoints} fill="none" stroke="#E2E8F0" strokeWidth="1" />;
        })}

        {/* Radial Axis Lines & Labels */}
        {labels.map((lbl, i) => {
          const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
          const endX = center + maxRadius * Math.cos(angle);
          const endY = center + maxRadius * Math.sin(angle);
          const labelX = center + (maxRadius + 14) * Math.cos(angle);
          const labelY = center + (maxRadius + 14) * Math.sin(angle);

          return (
            <g key={i}>
              <line x1={center} y1={center} x2={endX} y2={endY} stroke="#E2E8F0" strokeWidth="1" />
              <text
                x={labelX}
                y={labelY + 3}
                fontSize="7.5"
                fontWeight="600"
                fill="#64748B"
                textAnchor={labelX > center + 5 ? 'start' : labelX < center - 5 ? 'end' : 'middle'}
              >
                {lbl}
              </text>
            </g>
          );
        })}

        {/* Peer Benchmark Polygon (Dashed) */}
        <polygon points={peerPointsStr} fill="rgba(148, 163, 184, 0.12)" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3,3" />

        {/* Client DNA Polygon (Expanding Bloom Animation) */}
        <motion.polygon
          key={`radar-poly-${animKey}`}
          points={clientPointsStr}
          fill="rgba(0, 118, 128, 0.28)"
          stroke="#007680"
          strokeWidth="2.2"
          initial={{ scale: 0, originX: `${center}px`, originY: `${center}px` }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Points */}
        {clientData.map((val, i) => {
          const p = getCoordinates(val, i);
          return (
            <motion.circle
              key={`pt-radar-${animKey}-${i}`}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="#007680"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
            />
          );
        })}
      </svg>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   FULL-POWER ANIMATED VISUAL ENGINE (12 CATEGORIES)
───────────────────────────────────────────────────────────────────────── */

const FullChartEngine: React.FC<{ categoryId: string; animKey: number }> = ({ categoryId, animKey }) => {
  switch (categoryId) {
    case '01_account_wise': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Activity Distribution (Standard vs Non-Std Lines)</span>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.60rem', color: '#64748B', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 7, height: 7, background: '#007680', borderRadius: 2 }} />Standard</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 7, height: 7, background: '#38BDF8', borderRadius: 2 }} />Non-Standard</span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['Cash', 'AR', 'Inventory', 'Accrued', 'Suspense', 'Revenue']}
                datasets={[
                  { label: 'Standard', data: [1420, 2180, 1840, 940, 110, 45], color: '#007680' },
                  { label: 'Non-Standard', data: [310, 540, 410, 280, 410, 650], color: '#38BDF8' },
                ]}
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Debit Line Exposure</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedDoughnutChart
                slices={[
                  { label: 'AR', value: 40, color: '#007680' },
                  { label: 'Inventory', value: 28, color: '#0284C7' },
                  { label: 'Cash', value: 20, color: '#F59E0B' },
                  { label: 'Accrued', value: 12, color: '#10B981' },
                ]}
                centerLabel="Total Value"
                centerValue={42.8}
                centerPrefix="$"
                centerSuffix="M"
                centerDecimals={1}
                animKey={animKey}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', fontSize: '0.58rem', fontWeight: 600, marginTop: '2px' }}>
              <span style={{ color: '#007680' }}>● AR 40%</span>
              <span style={{ color: '#0284C7' }}>● Goods 28%</span>
              <span style={{ color: '#F59E0B' }}>● Cash 20%</span>
              <span style={{ color: '#10B981' }}>● Accrued 12%</span>
            </div>
          </div>
        </div>
      );
    }

    case '02_revenue_debits': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Revenue Debit Reversal Trajectory</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>Quarter Cutoff Spikes</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedLineChart
                labels={['P1', 'P3(Q1)', 'P6(Q2)', 'P9(Q3)', 'P12(Q4)']}
                data={[120, 480, 520, 680, 940]}
                color="#E11D48"
                fillColor="rgba(225, 29, 72, 0.12)"
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>Top Revenue Debit Accounts ($k)</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['Returns', 'Rebates', 'Discounts', 'Scrap', 'Licensing']}
                datasets={[{ data: [1420, 890, 640, 430, 280], color: '#E11D48' }]}
                animKey={animKey}
              />
            </div>
          </div>
        </div>
      );
    }

    case '03_user_wise': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>User Posting Volume ($M)</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>Admin Superusers</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['BATCH', 'ACCT_1', 'ADMIN', 'TEMP', 'CONSULT']}
                datasets={[{ data: [42.8, 18.5, 9.46, 3.15, 1.28], color: '#007680' }]}
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Posting Exposure by Role</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedDoughnutChart
                slices={[
                  { label: 'Auto', value: 58, color: '#007680' },
                  { label: 'Ops', value: 25, color: '#38BDF8' },
                  { label: 'Admin', value: 17, color: '#E11D48' },
                ]}
                centerLabel="Admin/Temp"
                centerValue={17}
                centerSuffix="%"
                centerDecimals={0}
                animKey={animKey}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontWeight: 600, marginTop: '2px' }}>
              <span style={{ color: '#007680' }}>● Auto 58%</span>
              <span style={{ color: '#0284C7' }}>● Ops 25%</span>
              <span style={{ color: '#E11D48' }}>● Admin 17%</span>
            </div>
          </div>
        </div>
      );
    }

    case '04_closing_entries': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '0.85fr 1.25fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Financial Statement Effect</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedDoughnutChart
                slices={[
                  { label: 'Expense', value: 45, color: '#E11D48' },
                  { label: 'Assets', value: 23, color: '#007680' },
                  { label: 'Liab', value: 17, color: '#0284C7' },
                  { label: 'Rev', value: 15, color: '#F59E0B' },
                ]}
                centerLabel="Exp Impact"
                centerValue={45}
                centerSuffix="%"
                centerDecimals={0}
                animKey={animKey}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', fontSize: '0.58rem', fontWeight: 600, marginTop: '2px' }}>
              <span style={{ color: '#E11D48' }}>● Exp 45%</span>
              <span style={{ color: '#007680' }}>● Asset 23%</span>
              <span style={{ color: '#0284C7' }}>● Liab 17%</span>
              <span style={{ color: '#F59E0B' }}>● Rev 15%</span>
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Closing Entry Timing Profile</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>Cutoff Lag</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['Day 0', 'Day +1/+3', 'Day +4/+7', 'Day +8+']}
                datasets={[
                  { label: 'Weak Desc', data: [820, 510, 180, 90], color: '#E11D48' },
                  { label: 'Standard', data: [3100, 1420, 620, 140], color: '#007680' },
                ]}
                animKey={animKey}
              />
            </div>
          </div>
        </div>
      );
    }

    case '05_dates_interest': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>24-Hour Diurnal Posting Velocity</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>Midnight Peak Spike</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedLineChart
                labels={['8 AM', '12 PM', '4 PM', '8 PM', '12 AM', '4 AM']}
                data={[2, 10, 25, 140, 382, 45]}
                color="#E11D48"
                fillColor="rgba(225, 29, 72, 0.12)"
                secondaryData={{ data: [45, 180, 190, 30, 5, 1], color: '#007680' }}
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Day of Week Volume</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>382 Sunday Spike</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                datasets={[{ data: [4200, 4500, 4350, 4600, 4100, 94, 382], color: '#007680' }]}
                animKey={animKey}
              />
            </div>
          </div>
        </div>
      );
    }

    case '06_amount_analysis': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Benford’s Law Conformance (Digits 1–9)</span>
              <span style={{ fontSize: '0.60rem', color: '#16A34A', fontWeight: 700 }}>96% Conformity (Grade A)</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['1', '2', '3', '4', '5', '6', '7', '8', '9']}
                datasets={[
                  { label: 'Client Actual', data: [31.2, 16.9, 13.1, 9.2, 8.4, 6.1, 5.4, 5.0, 4.7], color: '#007680' },
                  { label: 'Benford Expected', data: [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6], color: '#E11D48' },
                ]}
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Round Dollar Density</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedDoughnutChart
                slices={[
                  { label: '$1k', value: 45, color: '#007680' },
                  { label: '$10k', value: 28, color: '#0284C7' },
                  { label: '$50k', value: 18, color: '#F59E0B' },
                  { label: '$100k', value: 9, color: '#E11D48' },
                ]}
                centerLabel="Round Total"
                centerValue={928}
                centerSuffix=" Lines"
                centerDecimals={0}
                animKey={animKey}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', fontSize: '0.58rem', fontWeight: 600, marginTop: '2px' }}>
              <span style={{ color: '#007680' }}>● $1k (45%)</span>
              <span style={{ color: '#0284C7' }}>● $10k (28%)</span>
              <span style={{ color: '#F59E0B' }}>● $50k (18%)</span>
              <span style={{ color: '#E11D48' }}>● $100k (9%)</span>
            </div>
          </div>
        </div>
      );
    }

    case '07_duplicate_entries': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Duplicate Clusters by Value Range</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>214 Flagged Pairs</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['<$10k', '$10k-$50k', '$50k-$100k', '$100k-$500k', '>$500k']}
                datasets={[
                  { label: 'Exact Match', data: [82, 34, 18, 6, 2], color: '#E11D48' },
                  { label: 'Near Match', data: [40, 18, 10, 3, 1], color: '#F59E0B' },
                ]}
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Match Type Profile</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedDoughnutChart
                slices={[
                  { label: 'Exact', value: 66, color: '#E11D48' },
                  { label: 'Near', value: 34, color: '#F59E0B' },
                ]}
                centerLabel="Exposure"
                centerValue={4.20}
                centerPrefix="$"
                centerSuffix="M"
                centerDecimals={2}
                animKey={animKey}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontWeight: 600, marginTop: '2px' }}>
              <span style={{ color: '#E11D48' }}>● Exact 66% (142)</span>
              <span style={{ color: '#F59E0B' }}>● Near 34% (72)</span>
            </div>
          </div>
        </div>
      );
    }

    case '08_word_count': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Monitored Keyword Frequency</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>High Risk: 7% ($6.98M)</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['Manual', 'Adjust', 'Reclass', 'Override', 'Fraud', 'Suspense', 'Plug', 'Reserve']}
                datasets={[{ data: [210, 145, 82, 38, 4, 18, 7, 12], color: '#007680' }]}
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Severity Stratification</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedDoughnutChart
                slices={[
                  { label: 'Info', value: 71, color: '#0284C7' },
                  { label: 'Med', value: 22, color: '#F59E0B' },
                  { label: 'High', value: 7, color: '#E11D48' },
                ]}
                centerLabel="High Risk"
                centerValue={6.98}
                centerPrefix="$"
                centerSuffix="M"
                centerDecimals={2}
                animKey={animKey}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontWeight: 600, marginTop: '2px' }}>
              <span style={{ color: '#0284C7' }}>● Info 71%</span>
              <span style={{ color: '#F59E0B' }}>● Med 22%</span>
              <span style={{ color: '#E11D48' }}>● High 7%</span>
            </div>
          </div>
        </div>
      );
    }

    case '09_post_closing': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Post-Freeze Journal Timeline ($M)</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>98.7k Post-Close Lines</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedLineChart
                labels={['Day 0', 'Day +3', 'Day +7', 'Day +14', 'Day +21', 'Day +30']}
                data={[0, 1.2, 2.8, 7.8, 8.9, 9.8]}
                color="#E11D48"
                fillColor="rgba(225, 29, 72, 0.12)"
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>Top Affected Accounts ($M)</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['Tax', 'Inventory', 'Bonus', 'Legal', 'Bad Debt']}
                datasets={[{ data: [3.8, 2.9, 1.7, 0.9, 0.5], color: '#E11D48' }]}
                animKey={animKey}
              />
            </div>
          </div>
        </div>
      );
    }

    case '10_unrelated_accounts': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Atypical Cross-Ledger Pairings</span>
              <span style={{ fontSize: '0.60rem', color: '#E11D48', fontWeight: 700 }}>128 Outliers</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['Cash↔Eq', 'Rev↔Asset', 'OPEX↔Clr', 'Accr↔Intang', 'Tax↔Debt']}
                datasets={[{ data: [128, 84, 52, 34, 18], color: '#E11D48' }]}
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Association Risk Profile</span>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedDoughnutChart
                slices={[
                  { label: 'Atypical', value: 28, color: '#E11D48' },
                  { label: 'Standard', value: 72, color: '#007680' },
                ]}
                centerLabel="Anomalous"
                centerValue={840}
                centerPrefix="$"
                centerSuffix="k"
                centerDecimals={0}
                animKey={animKey}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontWeight: 600, marginTop: '2px' }}>
              <span style={{ color: '#E11D48' }}>● Atypical 28%</span>
              <span style={{ color: '#007680' }}>● Standard 72%</span>
            </div>
          </div>
        </div>
      );
    }

    case '11_population_stats': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.25fr 0.85fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Population Activity Trajectory ($M)</span>
              <span style={{ fontSize: '0.60rem', color: '#007680', fontWeight: 700 }}>P12 Peak $8.5M</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedLineChart
                labels={['P1', 'P3', 'P6', 'P9', 'P11', 'P12 (Year-End)']}
                data={[4.2, 4.8, 5.2, 6.1, 4.1, 8.5]}
                color="#007680"
                fillColor="rgba(0, 118, 128, 0.12)"
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Standard vs Non-Standard Volume</span>
              <span style={{ fontSize: '0.60rem', color: '#0284C7', fontWeight: 700 }}>P12 Surge: +34%</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedBarChart
                labels={['P1', 'P3', 'P6', 'P9', 'P12']}
                datasets={[
                  { label: 'Standard', data: [3800, 4200, 4600, 5100, 6400], color: '#007680' },
                  { label: 'Non-Standard', data: [400, 580, 610, 980, 2100], color: '#38BDF8' },
                ]}
                animKey={animKey}
              />
            </div>
          </div>
        </div>
      );
    }

    case '12_forensic_radar': {
      return (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', padding: '10px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Accounting Behavior DNA Radar</span>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.58rem', fontWeight: 600 }}>
                <span style={{ color: '#007680' }}>● Client DNA</span>
                <span style={{ color: '#94A3B8' }}>-- Industry Peer</span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AnimatedRadarChart
                labels={['Manual', 'Off-Hours', 'Round $', 'Closing', 'Author', 'Benford']}
                clientData={[78, 42, 65, 92, 85, 96]}
                peerData={[50, 48, 52, 45, 55, 97]}
                animKey={animKey}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', height: '100%' }}>
            {[
              { title: 'Manual Override', numVal: 14.8, suffix: '%', delta: '+3.6% delta', color: '#D97706', bg: '#FFFBEB', decimals: 1 },
              { title: 'Closing Rush', numVal: 40.2, suffix: '%', delta: '+25.7% Focus', color: '#E11D48', bg: '#FFF1F2', decimals: 1 },
              { title: 'Benford Fit', numVal: 96, suffix: '%', delta: 'Grade A', color: '#16A34A', bg: '#F0FDF4', decimals: 0 },
              { title: 'Off-Hours', numVal: 0.4, suffix: '%', delta: '-2.0% delta', color: '#007680', bg: '#E6F4F5', decimals: 1 },
            ].map((kpi, i) => (
              <div key={i} style={{ background: kpi.bg, borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 600 }}>{kpi.title}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                  <AnimatedNumber value={kpi.numVal} suffix={kpi.suffix} decimals={kpi.decimals} animKey={animKey} />
                </span>
                <span style={{ fontSize: '0.56rem', color: kpi.color, fontWeight: 700 }}>{kpi.delta}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   MAIN SHOWCASE COMPONENT
───────────────────────────────────────────────────────────────────────── */

export const VisualizationShowcase: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  const current = useMemo(() => CATEGORIES[index], [index]);
  const total = CATEGORIES.length;

  const goTo = useCallback((targetIndex: number) => {
    if (targetIndex === index || targetIndex < 0 || targetIndex >= total) return;
    setDirection(targetIndex > index ? 1 : -1);
    setIndex(targetIndex);
    setAnimKey((prev) => prev + 1);
  }, [index, total]);

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % total);
    setAnimKey((prev) => prev + 1);
  }, [total]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + total) % total);
    setAnimKey((prev) => prev + 1);
  }, [total]);

  // 7-second auto slideshow rotation (respects isPlaying state)
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % total);
      setAnimKey((prev) => prev + 1);
    }, 7000);
    return () => clearInterval(timer);
  }, [isPlaying, total]);

  // Keyboard navigation & spacebar play/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === ' ' && sectionRef.current && sectionRef.current.contains(document.activeElement)) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (tabListRef.current) {
      const activeBtn = tabListRef.current.querySelector(`[data-index="${index}"]`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [index]);

  const riskStyle = RISK_BADGES[current.riskLevel];
  const IconComponent = current.icon;

  return (
    <motion.section
      ref={sectionRef}
      id="visualizations-insights-showcase"
      aria-label="Visualizations and Insights showcase"
      tabIndex={-1}
      initial={{ opacity: 0, y: 36, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: '100%',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F4FAF8 45%, #EBF6F4 100%)',
        borderBottom: '1px solid #E2E8F0',
        padding: 'clamp(44px, 5vw, 64px) clamp(20px, 3.5vw, 52px) clamp(32px, 4vw, 48px)',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
      }}
    >
      {/* ── BOTANICAL DECOR 1: 3D Potted Plant (Ground-Anchored Bottom-Left) ── */}
      <motion.img
        initial={{ opacity: 0, scale: 0.85, y: 25 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        animate={{ y: [0, -4, 0] }}
        transition={{
          opacity: { duration: 0.8, ease: 'easeOut' },
          scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
          y: { repeat: Infinity, duration: 5.5, ease: 'easeInOut' }
        }}
        src="/decor/potted_plant_clean.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '14px',
          left: '16px',
          width: 'clamp(85px, 7.5vw, 115px)',
          height: 'auto',
          pointerEvents: 'none',
          zIndex: 1,
          filter: 'drop-shadow(0 10px 22px rgba(15, 23, 42, 0.12))',
        }}
      />

      {/* ── BOTANICAL DECOR 2: Luxury Leaf Sprig (Upside-Down Floating Top-Right) ── */}
      <motion.img
        initial={{ opacity: 0, x: 30, rotate: 170 }}
        whileInView={{ opacity: 0.85, x: 0, rotate: 180 }}
        viewport={{ once: true }}
        animate={{ y: [0, -6, 0] }}
        transition={{
          opacity: { duration: 0.8, ease: 'easeOut', delay: 0.15 },
          y: { repeat: Infinity, duration: 6, ease: 'easeInOut' }
        }}
        src="/decor/leaf_left_clean.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-15px',
          right: '-20px',
          transform: 'rotate(180deg)',
          width: 'clamp(90px, 8vw, 135px)',
          height: 'auto',
          pointerEvents: 'none',
          zIndex: 1,
          filter: 'drop-shadow(0 6px 16px rgba(0, 118, 128, 0.08))',
        }}
      />

      <div style={{ maxWidth: '1440px', margin: '0 auto', position: 'relative', zIndex: 2 }}>

        {/* ── Section Header (Unified Typographic Hierarchy) ── */}
        <div style={{ marginBottom: '24px', maxWidth: '820px' }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(0, 163, 173, 0.10)',
              border: '1px solid rgba(0, 118, 128, 0.18)',
              color: '#007680',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}>
              <Sparkles size={13} />
              Client-Ready Visualizations &amp; Exception Analytics Showcase
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.035em',
            lineHeight: 1.18,
            margin: '0 0 8px 0',
          }}>
            Visualizations &amp; Insights.{' '}
            <span style={{ color: '#007680' }}>Understand every audit category.</span>
          </h2>

          <p style={{
            fontSize: '0.88rem',
            color: '#64748B',
            lineHeight: 1.55,
            maxWidth: '680px',
            margin: 0,
          }}>
            Explore real interactive visual workpapers generated across all 12 analytical categories, Trial Balance checkpoints, and forensic risk matrices.
          </p>
        </div>

        {/* ── 12-Category Scrollable Tab Strip with < and > Chevron Buttons ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {/* Left Nav Button */}
          <motion.button
            onClick={goPrev}
            whileHover={{ scale: 1.06, background: '#007680', color: '#FFFFFF', borderColor: '#007680' }}
            whileTap={{ scale: 0.94 }}
            aria-label="Previous Category"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#007680',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0, 118, 128, 0.08)',
              transition: 'all 0.16s ease',
              outline: 'none',
            }}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </motion.button>

          {/* Chips Scroll Strip */}
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Audit category tabs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              padding: '2px 0',
              scrollbarWidth: 'none',
              flex: 1,
            }}
          >
            {CATEGORIES.map((item, i) => {
              const isActive = i === index;
              const TabIcon = item.icon;
              return (
                <button
                  key={item.id}
                  data-index={i}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => goTo(i)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: isActive ? '6px 12px' : '6px 10px',
                    borderRadius: '8px',
                    border: isActive ? '1.5px solid #007680' : '1px solid #E2E8F0',
                    background: isActive ? '#007680' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#475569',
                    fontSize: '0.72rem',
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isActive ? '0 2px 8px rgba(0, 118, 128, 0.22)' : 'none',
                    flexShrink: 0,
                    outline: 'none',
                  }}
                >
                  <TabIcon size={12} color={isActive ? '#FFFFFF' : '#007680'} />
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Right Nav Button */}
          <motion.button
            onClick={goNext}
            whileHover={{ scale: 1.06, background: '#007680', color: '#FFFFFF', borderColor: '#007680' }}
            whileTap={{ scale: 0.94 }}
            aria-label="Next Category"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#007680',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0, 118, 128, 0.08)',
              transition: 'all 0.16s ease',
              outline: 'none',
            }}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            EXPANSIVE 67:33 RATIO FIXED STAGE (Height 340px)
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '67fr 33fr', // Expansive width for charts, tight editorial panel
          gap: '16px',
          alignItems: 'stretch',
          height: '340px',
        }}>

          {/* ────────────────────────────────────────────────────────
              LEFT — High-Precision Expansive Visual Monitor Frame
          ──────────────────────────────────────────────────────── */}
          <div style={{
            height: '100%',
            borderRadius: '14px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 28px -4px rgba(15, 23, 42, 0.07)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Monitor Chrome Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FC5756' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FDBC40' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C84A' }} />
              </div>

              <div style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: '#007680',
                fontFamily: 'monospace',
                background: '#E6F4F5',
                padding: '2px 9px',
                borderRadius: '4px',
                border: '1px solid #99D5D9',
              }}>
                {current.badge}
              </div>

              <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748B', fontFamily: 'monospace' }}>
                {current.num} / 12
              </span>
            </div>

            {/* Live Expansive Chart Canvas Area with Dynamic Plot Building Animations */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#F8FAFC' }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 25 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <FullChartEngine categoryId={current.id} animKey={animKey} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              RIGHT — Compact, Tight Editorial Insight Panel
          ──────────────────────────────────────────────────────── */}
          <div style={{
            height: '100%',
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 6px 18px -4px rgba(15, 23, 42, 0.04)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current.id + '-panel'}
                custom={direction}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  {/* Category Pill + Number */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: '#E6F4F5',
                      border: '1px solid #99D5D9',
                      color: '#007680',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                    }}>
                      <IconComponent size={11} />
                      {current.category}
                    </span>

                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#007680', fontFamily: 'monospace' }}>
                      #{current.num}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '1.04rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    margin: '0 0 6px',
                  }}>
                    {current.title}
                  </h3>

                  {/* Blueprint Summary Box */}
                  <div style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    marginBottom: '6px',
                  }}>
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Visualization Blueprint:
                    </span>
                    <p style={{ fontSize: '0.70rem', color: '#334155', lineHeight: 1.3, margin: '2px 0 0', fontWeight: 500 }}>
                      {current.whatItShows}
                    </p>
                  </div>

                  {/* Insight Callout */}
                  <div style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(0, 118, 128, 0.04)',
                    borderLeft: '3px solid #007680',
                    border: '1px solid rgba(0, 118, 128, 0.15)',
                    borderLeftWidth: '3px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <TrendingUp size={10} color="#007680" strokeWidth={2.5} />
                      <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase' }}>
                        Key Audit Insight
                      </span>
                    </div>
                    <p style={{ fontSize: '0.70rem', color: '#1E293B', lineHeight: 1.35, margin: 0, fontWeight: 500 }}>
                      {current.insight}
                    </p>
                  </div>
                </div>

                {/* Metadata Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', paddingTop: '6px' }}>
                  <div style={{ padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '0.60rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Shield size={8} color="#64748B" />
                    <span>{current.analyticalMethod}</span>
                  </div>

                  <div style={{ padding: '2px 6px', borderRadius: '4px', background: riskStyle.bg, border: `1px solid ${riskStyle.border}`, fontSize: '0.60rem', fontWeight: 800, color: riskStyle.color, textTransform: 'uppercase' }}>
                    {current.riskLevel} Risk
                  </div>

                  <div style={{ padding: '2px 6px', borderRadius: '4px', background: '#E6F4F5', border: '1px solid #99D5D9', fontSize: '0.60rem', fontWeight: 700, color: '#007680' }}>
                    {current.metricLabel}: <strong>{current.metricValue}</strong>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            MINIMALIST FOOTER: COUNTER, SHORTCUTS & PROGRESS PILLS
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginTop: '16px',
          padding: '0 2px',
        }}>
          {/* Left: Counter and Category */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace', lineHeight: 1 }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: '0.80rem', color: '#94A3B8', fontFamily: 'monospace' }}>/ 12</span>
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#007680', paddingLeft: '8px', borderLeft: '1.5px solid #CBD5E1' }}>
              {current.category}
            </span>
          </div>

          {/* Center: Keyboard Navigation Hints */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.64rem',
            color: '#64748B',
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.7)',
            padding: '3px 10px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
          }}>
            <span style={{ padding: '1px 5px', borderRadius: '4px', background: '#FFFFFF', border: '1px solid #CBD5E1', fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>←</span>
            <span style={{ padding: '1px 5px', borderRadius: '4px', background: '#FFFFFF', border: '1px solid #CBD5E1', fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>→</span>
            <span>Navigate</span>
            <span style={{ color: '#CBD5E1', margin: '0 2px' }}>•</span>
            <span style={{ padding: '1px 6px', borderRadius: '4px', background: '#FFFFFF', border: '1px solid #CBD5E1', fontFamily: 'monospace', color: '#0F172A', fontWeight: 700 }}>Space</span>
            <span>{isPlaying ? 'Pause' : 'Resume'}</span>
          </div>

          {/* Right: Play/Pause Toggle and Progress Indicator Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Play/Pause Control Button */}
            <motion.button
              onClick={() => setIsPlaying((prev) => !prev)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: isPlaying ? '#E6F4F5' : '#FFFFFF',
                border: `1px solid ${isPlaying ? '#99D5D9' : '#CBD5E1'}`,
                color: isPlaying ? '#007680' : '#64748B',
                fontSize: '0.66rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.16s ease',
                outline: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {isPlaying ? <Pause size={11} strokeWidth={2.5} /> : <Play size={11} strokeWidth={2.5} />}
              <span>{isPlaying ? 'Auto-Advancing (7s)' : 'Paused'}</span>
            </motion.button>

            {/* Progress Indicator Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {CATEGORIES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to category ${i + 1}`}
                  style={{
                    width: i === index ? 22 : 6,
                    height: 4,
                    borderRadius: 999,
                    border: 'none',
                    padding: 0,
                    backgroundColor: i === index ? '#007680' : '#CBD5E1',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    outline: 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </motion.section>
  );
};

export default VisualizationShowcase;
