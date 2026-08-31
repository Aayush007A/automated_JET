/**
 * VisualizationShowcase
 *
 * A premium fixed-stage presentation showcasing all 12 client-facing
 * analytical categories and visualizations produced by the JET audit engine.
 *
 * Key features:
 *  - Real application UI screenshots (light theme, high-definition audit outputs)
 *  - 12 comprehensive categories matching client deliverables
 *  - Scroll-reveal entrance animation matching other dashboard sections
 *  - Interactive quick-jump category strip + Previous/Next navigation
 *  - Standardized Deloitte button colors (teal gradient #007680 -> #004D54)
 *  - Fixed visualization viewport (app-chrome monitor frame with zero layout shift)
 *  - Direction-aware Framer Motion transitions (enter/exit sliding)
 *  - Keyboard navigation (ArrowLeft / ArrowRight) & reduced-motion support
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
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
  FileSpreadsheet,
  Cpu,
  FileCheck2,
  Sparkles,
  Eye,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   12 REAL APPLICATION VISUALIZATION CATEGORIES
───────────────────────────────────────────────────────────────────────── */

export interface VisualizationItem {
  id: string;
  num: string;
  category: string;
  shortLabel: string;
  badge: string;
  icon: React.ReactNode;
  title: string;
  whatItShows: string;
  description: string;
  insight: string;
  analyticalMethod: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metricLabel: string;
  metricValue: string;
  image: string;
}

const RISK_BADGES: Record<string, { color: string; bg: string; border: string }> = {
  LOW:      { color: '#007680', bg: '#E6F4F5', border: '#99D5D9' },
  MEDIUM:   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  HIGH:     { color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' },
  CRITICAL: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

const VISUALIZATIONS: VisualizationItem[] = [
  {
    id: '01_account_wise',
    num: '01',
    category: 'Account Wise Analysis',
    shortLabel: '01. Account Wise',
    badge: 'Summary 1 · Ex 01 Exception',
    icon: <Layers size={14} strokeWidth={2.2} />,
    title: 'Account Activity Distribution & Financial Statement Debit Exposure',
    whatItShows: 'Grouped bar chart of Standard vs. Non-Standard lines per GL account paired with a donut chart showing Financial Statement Line Debit Exposure by balance sheet segment.',
    description:
      'Aggregates journal entries across all General Ledger accounts to classify routine operational postings versus non-standard manual adjustments. The interactive donut chart decomposes gross debit exposure across critical balance sheet and P&L lines including Cash Holdings (20%), Trade Receivables (40%), Finished Goods (28%), and Accrued Liabilities (12%).',
    insight:
      'Accounts with a disproportionately high non-standard ratio in high-value asset segments signal potential management override risk. The JET engine automatically prioritizes these accounts for substantive substantive sampling.',
    analyticalMethod: 'Standard vs Non-Standard Line Classification',
    riskLevel: 'HIGH',
    metricLabel: 'Debit Exposure Coverage',
    metricValue: '6 Account Segments',
    image: '/showcase/summary_01_account_wise.png',
  },
  {
    id: '02_dqc_golden_checks',
    num: '02',
    category: '20 Golden DQC Checks',
    shortLabel: '02. Golden DQC',
    badge: 'Data Quality & Schema Suite',
    icon: <ShieldCheck size={14} strokeWidth={2.2} />,
    title: '20 Golden Data Quality Checks (DQC 01a–20) Matrix',
    whatItShows: 'Comprehensive validation scorecard evaluating schema compliance, zero-sum balancing, mandatory fields, currency formatting, and debit/credit consistency.',
    description:
      'Evaluates 20 automated forensic data quality rules against the uploaded General Ledger and Trial Balance. Highlights critical errors, warnings, and informational observations before exception tests execute, ensuring mathematically pristine input data.',
    insight:
      'Pre-flight verification ensures that flawed data does not pollute the exception scoring engine, eliminating false positives and guaranteeing audit workpapers reflect true underlying accounting anomalies.',
    analyticalMethod: 'Rule-Based Automated Pre-Flight Validation',
    riskLevel: 'CRITICAL',
    metricLabel: 'Golden Checks Suite',
    metricValue: '20 DQC Rules',
    image: '/showcase/summary_dqc_golden_checks.png',
  },
  {
    id: '03_user_wise',
    num: '03',
    category: 'User Wise Analysis',
    shortLabel: '03. User Wise',
    badge: 'Summary 3 · Ex 04 Exception',
    icon: <Users size={14} strokeWidth={2.2} />,
    title: 'User Posting Value Distribution & Segregation of Duties Exposure',
    whatItShows: 'Bar chart of total posting monetary value by user profile + Donut chart categorizing volume into High-Risk Admin/Temp, Standard Operations, and Automated Feeds.',
    description:
      'Analyzes preparer and approver identities across the journal population. Isolates super-users, administrative profiles (USR_SYS_ADMIN), and temporary external accounts (USR_TEMP_AUDIT) posting high-value entries that bypass standard workflow controls.',
    insight:
      '17% of total monetary value ($12.6M+) posted by administrative and temporary accounts without documented dual authorization represents a critical segregation of duties vulnerability requiring partner review.',
    analyticalMethod: 'User Role & Authorization Profiling',
    riskLevel: 'HIGH',
    metricLabel: 'Monitored User Profiles',
    metricValue: '5 Risk Profiles',
    image: '/showcase/summary_03_user_wise.png',
  },
  {
    id: '04_closing_entries',
    num: '04',
    category: 'Closing Entries Analysis',
    shortLabel: '04. Closing Entries',
    badge: 'Summary 4 · Ex 06 Exception',
    icon: <Lock size={14} strokeWidth={2.2} />,
    title: 'Period-End Closing Adjustments & Financial Statement Impact',
    whatItShows: 'Donut chart of Financial Statement effect (Increase in Exp 45%, Assets 23%, Decrease in Liab 17%) + Post-period timing profile bar chart.',
    description:
      'Isolates journal entries recorded during the critical period-end closing window (Day -1 to +8). Categorizes each closing entry by financial statement impact to detect late topside adjustments that disproportionately affect reported net income.',
    insight:
      'Entries recorded with limited descriptions within 3 days of fiscal year-end that shift expense into asset accounts require mandatory corroboration against source vendor documentation.',
    analyticalMethod: 'Fiscal Cut-Off Window Stratification',
    riskLevel: 'HIGH',
    metricLabel: 'Closing Impact Categories',
    metricValue: '4 Financial Lines',
    image: '/showcase/summary_04_closing_entries.png',
  },
  {
    id: '05_cdm_mapping',
    num: '05',
    category: 'Data File Mapping & CDM',
    shortLabel: '05. Data Mapping',
    badge: 'Pipeline Step 2 · CDM Engine',
    icon: <Cpu size={14} strokeWidth={2.2} />,
    title: 'Intelligent Schema Mapping & Common Data Model Normalization',
    whatItShows: 'Interactive column-mapping interface reconciling client trial balance and general ledger headers to standardized Deloitte audit attributes.',
    description:
      'Automated fuzzy-string matching engine that aligns proprietary ERP column names (SAP, Oracle, NetSuite, Dynamics) to canonical CDM fields with real-time confidence scores, type inference, and sample data preview.',
    insight:
      'Automated field normalization ensures cross-client consistency and eliminates manual mapping errors while establishing an immutable audit provenance trail.',
    analyticalMethod: 'Fuzzy Canonical Field Harmonization',
    riskLevel: 'LOW',
    metricLabel: 'CDM Standardization',
    metricValue: '100% Conformance',
    image: '/showcase/summary_cdm_mapping.png',
  },
  {
    id: '06_auto_cleansing',
    num: '06',
    category: 'Auto-Cleansing Engine',
    shortLabel: '06. Auto-Cleansing',
    badge: 'Pipeline Step 3 · Cleansing Engine',
    icon: <FileCheck2 size={14} strokeWidth={2.2} />,
    title: 'Multi-Stage Data Cleansing, Encoding & Format Sanitization',
    whatItShows: 'Real-time validation progress across whitespace trimming, numeric parsing, date format standardisation, and currency sanitization.',
    description:
      'Applies deterministic sanitization algorithms to eliminate corrupt strings, trailing delimiters, incompatible decimal formats, and invalid UTF-8 characters across multi-million row datasets.',
    insight:
      'Deterministic pre-processing guarantees exact floating-point precision during debit/credit zero-sum verification and high-volume reconciliation.',
    analyticalMethod: 'Deterministic ETL Sanitization',
    riskLevel: 'MEDIUM',
    metricLabel: 'Sanitization Rules',
    metricValue: '12 Cleansing Passes',
    image: '/showcase/summary_auto_cleansing.png',
  },
  {
    id: '07_tb_je_recon',
    num: '07',
    category: 'TB vs JE Reconciliation',
    shortLabel: '07. Account Recon',
    badge: 'Integrity Suite · TB vs GL',
    icon: <GitBranch size={14} strokeWidth={2.2} />,
    title: 'Account-Level Mathematical Reconciliation & Zero-Sum Verification',
    whatItShows: 'Account-by-account variance scorecard calculating: Variance = Ending Balance - Beginning Balance - JE Activity (Tolerance: ≤ 1.0).',
    description:
      'Cross-examines the Trial Balance beginning/ending positions directly against General Ledger line-by-line transactions. Discrepancies exceeding mathematical tolerance are flagged instantly.',
    insight:
      'An un-reconciled account indicates unrecorded transactions, missing subledger feeds, or timing disconnects that compromise the trial balance foundation.',
    analyticalMethod: 'Mathematical Zero-Sum Cross-Reconciliation',
    riskLevel: 'CRITICAL',
    metricLabel: 'Tolerance Threshold',
    metricValue: '≤ 1.0 Variance',
    image: '/showcase/summary_tb_je_recon.png',
  },
  {
    id: '08_word_count',
    num: '08',
    category: 'High-Risk Word Count',
    shortLabel: '08. Word Count',
    badge: 'Summary 8 · Ex 10 Exception',
    icon: <BarChart3 size={14} strokeWidth={2.2} />,
    title: 'Sensitive Keyword Density & Risk Severity Stratification',
    whatItShows: 'Bar chart of monitored keyword frequency ("Manual", "Adjust", "Override", "Fraud", "Plug", "Suspense") + Donut chart of severity stratification.',
    description:
      'Scans journal line descriptions and header narrations against Deloitte proprietary forensic dictionary. Flags subjective or high-risk terminology such as "plug", "override", "reclass", and "urgently required".',
    insight:
      'Keywords categorized as High Risk ("Fraud", "Plug", "Override") represent 7% of flagged entries totaling over $6.98M in aggregated debit value, requiring 100% substantive sample testing.',
    analyticalMethod: 'Forensic Lexical Pattern Scanning',
    riskLevel: 'CRITICAL',
    metricLabel: 'Monitored Lexicon',
    metricValue: '7 Target Keywords',
    image: '/showcase/summary_08_word_count.png',
  },
  {
    id: '09_line_stratification',
    num: '09',
    category: 'JE Line Stratification',
    shortLabel: '09. Stratification',
    badge: 'Population Profiling Suite',
    icon: <PieChart size={14} strokeWidth={2.2} />,
    title: 'Journal Entry Line-Count Bucket & Volume Stratification',
    whatItShows: 'Distribution across single-line entries, 2–20 lines (standard journals), 21–100 lines (batch postings), and >1,000 lines (system migrations).',
    description:
      'Stratifies the journal population by entry complexity. Highlights anomalous single-sided adjustments and unusually complex mega-entries that may conceal fragmented transactions.',
    insight:
      'Single-line postings often bypass automated balance validation controls and must be evaluated for corresponding offsetting subledger entries.',
    analyticalMethod: 'Entry Complexity & Line-Bucket Stratification',
    riskLevel: 'MEDIUM',
    metricLabel: 'Complexity Buckets',
    metricValue: '4 Line Buckets',
    image: '/showcase/summary_line_stratification.png',
  },
  {
    id: '10_dataset_ingestion',
    num: '10',
    category: 'Dataset Ingestion',
    shortLabel: '10. Ingestion',
    badge: 'Pipeline Step 1 · File Intake',
    icon: <FileSpreadsheet size={14} strokeWidth={2.2} />,
    title: 'Multi-Format Dataset Intake, Pre-Flight Telemetry & Health Checks',
    whatItShows: 'File ingestion dashboard tracking Trial Balance (TB), General Ledger (JE), and Chart of Accounts (COA) upload progress and validation state.',
    description:
      'High-throughput intake engine supporting multi-sheet Excel, delimited CSV, TXT, and Parquet formats. Provides instant schema validation and pre-flight health telemetry.',
    insight:
      'Immediate pre-flight validation alerts the audit team to missing periods or mismatched fiscal years before resource-intensive calculations begin.',
    analyticalMethod: 'Multi-Stream Asynchronous Data Ingestion',
    riskLevel: 'LOW',
    metricLabel: 'Supported Formats',
    metricValue: 'Excel / CSV / Parquet',
    image: '/showcase/summary_dataset_ingestion.png',
  },
  {
    id: '11_population_stats',
    num: '11',
    category: 'Population Statistics',
    shortLabel: '11. Population Stats',
    badge: 'Summary 11 · Period Analysis',
    icon: <Activity size={14} strokeWidth={2.2} />,
    title: 'Period-Wise Activity Trajectory & Monthly Volume Distribution',
    whatItShows: 'Line chart of Total Amount in Local Currency across P1–P12 + Monthly Standard vs Non-Standard Volume Distribution grouped bar chart.',
    description:
      'Tracks transaction activity and monetary value across all 12 fiscal periods. Visualizes baseline operating tempo and exposes seasonal spikes or year-end processing surges.',
    insight:
      'A dramatic surge in P12 non-standard entries (over $8.3M and 2,000+ non-standard lines) demonstrates intense fiscal year-end closing activity requiring focused cut-off procedures.',
    analyticalMethod: 'Longitudinal Fiscal Period Trend Analysis',
    riskLevel: 'HIGH',
    metricLabel: 'Temporal Scope',
    metricValue: '12 Fiscal Periods (P1–P12)',
    image: '/showcase/summary_11_population_stats.png',
  },
  {
    id: '12_forensic_radar',
    num: '12',
    category: 'Forensic Intelligence Vectors',
    shortLabel: '12. Forensic Vectors',
    badge: 'Executive Risk DNA · Multi-Vector',
    icon: <TrendingUp size={14} strokeWidth={2.2} />,
    title: 'Accounting Behavior Vector Comparison & Forensic Benchmark Radar',
    whatItShows: '6-axis Radar chart comparing client DNA against industry peer medians + 6 benchmark metric cards (Manual Override, Off-Hours, Round Dollars, Closing Rush, Author Concentration, Benford Conformance).',
    description:
      'Multi-dimensional forensic evaluation establishing the client accounting risk profile across six behavioral dimensions compared against peer benchmarks for Manufacturing & Industrial sectors.',
    insight:
      'Closing Concentration at 40.2% (+25.7% delta vs. peer median) is flagged as a Primary Focus Area, while Benford Law conformity (96%, Grade A) confirms mathematical naturalness across routine transactions.',
    analyticalMethod: 'Multi-Vector Forensic Behavioral Benchmarking',
    riskLevel: 'HIGH',
    metricLabel: 'Forensic Vectors',
    metricValue: '6 Behavioral Dimensions',
    image: '/showcase/summary_12_forensic_radar.png',
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   ANIMATION VARIANTS
───────────────────────────────────────────────────────────────────────── */

const imageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x:       { type: 'spring' as const, stiffness: 290, damping: 30 },
      opacity: { duration: 0.30, ease: 'easeOut' as const },
      scale:   { duration: 0.35, ease: 'easeOut' as const },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    scale: 0.98,
    transition: {
      x:       { type: 'spring' as const, stiffness: 290, damping: 30 },
      opacity: { duration: 0.20, ease: 'easeIn' as const },
      scale:   { duration: 0.22, ease: 'easeIn' as const },
    },
  }),
};

const textContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
  exit:    { transition: { staggerChildren: 0.02 } },
};

const textItemVariants = {
  hidden:  (dir: number) => ({ opacity: 0, y: dir > 0 ? 12 : -12 }),
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, y: 0, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

const reducedFade = {
  enter:  { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18 } },
  exit:   { opacity: 0, transition: { duration: 0.12 } },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────── */

export const VisualizationShowcase: React.FC = () => {
  const [index, setIndex]         = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const shouldReduceMotion        = useReducedMotion();
  const sectionRef                = useRef<HTMLElement>(null);
  const tabListRef                = useRef<HTMLDivElement>(null);

  const current = useMemo(() => VISUALIZATIONS[index], [index]);
  const total   = VISUALIZATIONS.length;

  /* Navigation */
  const goTo = useCallback(
    (targetIndex: number) => {
      if (targetIndex === index || targetIndex < 0 || targetIndex >= total) return;
      setDirection(targetIndex > index ? 1 : -1);
      setIndex(targetIndex);
    },
    [index, total],
  );

  const goNext = useCallback(() => {
    if (index < total - 1) {
      setDirection(1);
      setIndex(index + 1);
    }
  }, [index, total]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex(index - 1);
    }
  }, [index]);

  /* Keyboard Navigation (ArrowLeft / ArrowRight) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        sectionRef.current &&
        document.activeElement &&
        sectionRef.current.contains(document.activeElement)
      ) {
        if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  /* Auto-scroll active tab into view in the top category strip */
  useEffect(() => {
    if (tabListRef.current) {
      const activeBtn = tabListRef.current.querySelector(`[data-index="${index}"]`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [index]);

  /* Preload adjacent images for instant transition */
  useEffect(() => {
    [index - 1, index + 1]
      .filter(i => i >= 0 && i < total)
      .forEach(i => {
        const img = new Image();
        img.src = VISUALIZATIONS[i].image;
      });
  }, [index, total]);

  const imgVars   = shouldReduceMotion ? reducedFade : imageVariants;
  const riskStyle = RISK_BADGES[current.riskLevel];
  const canPrev   = index > 0;
  const canNext   = index < total - 1;

  return (
    <motion.section
      ref={sectionRef}
      id="visualizations-insights-showcase"
      aria-label="Visualizations and Insights showcase"
      tabIndex={-1}
      initial={false}
      whileInView="visible"
      viewport={{ once: true }}
      variants={sectionReveal}
      style={{
        width: '100%',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F5FAF8 40%, #EDF7F5 100%)',
        borderBottom: '1px solid #E2E8F0',
        padding: 'clamp(48px, 5.5vw, 68px) clamp(24px, 4vw, 56px) clamp(56px, 6.5vw, 76px)',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
      }}
    >
      {/* ── Background Decorative Dot Grid ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '420px',
          height: '100%',
          backgroundImage: 'radial-gradient(circle, rgba(0, 163, 173, 0.18) 1.2px, transparent 1.2px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 75% 50%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 75% 50%, black 20%, transparent 80%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: '1520px', margin: '0 auto', position: 'relative', zIndex: 2 }}>

        {/* ── Section Header Row — Balanced 2-Column Alignment ── */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '28px',
        }}>
          <div style={{ maxWidth: '640px' }}>
            {/* Pill Badge */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '999px',
                background: 'rgba(0, 163, 173, 0.10)',
                border: '1px solid rgba(0, 118, 128, 0.18)',
                color: '#007680',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.01em',
              }}>
                <Eye size={14} strokeWidth={2.4} />
                Client-Ready Visualizations &amp; Exception Analytics Showcase
              </span>
            </div>

            {/* 2-line Headline */}
            <h2 style={{
              fontSize: 'clamp(2.1rem, 3.3vw, 2.85rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              margin: 0,
            }}>
              Visualizations &amp; Insights.<br />
              <span style={{ color: '#007680' }}>Understand every audit category.</span>
            </h2>
          </div>

          {/* Right Subtitle Description */}
          <p style={{
            fontSize: 'clamp(0.88rem, 1.05vw, 0.95rem)',
            color: '#64748B',
            lineHeight: 1.65,
            maxWidth: '420px',
            fontWeight: 400,
            margin: 0,
            paddingBottom: '4px',
          }}>
            Explore real interactive visual workpapers generated across all 12 analytical categories, Trial Balance checkpoints, and forensic risk matrices.
          </p>
        </div>

        {/* ── 12-Category Quick-Jump Horizontal Scroll Strip ── */}
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Audit category tabs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '24px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {VISUALIZATIONS.map((item, i) => {
            const isActive = i === index;
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
                  gap: '6px',
                  padding: isActive ? '7px 14px' : '7px 12px',
                  borderRadius: '10px',
                  border: isActive ? '1.5px solid #007680' : '1px solid #E2E8F0',
                  background: isActive ? '#007680' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontSize: '0.76rem',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 4px 12px rgba(0, 118, 128, 0.22)' : '0 1px 2px rgba(0,0,0,0.02)',
                  flexShrink: 0,
                  outline: 'none',
                }}
              >
                <span style={{ color: isActive ? '#FFFFFF' : '#007680' }}>
                  {item.icon}
                </span>
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            FIXED SHOWCASE STAGE
            The stage container NEVER moves or resizes.
            Only internal content transitions between slides.
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '58fr 42fr',
          gap: 'clamp(24px, 3vw, 36px)',
          alignItems: 'stretch',
          minHeight: '520px',
        }}>

          {/* ────────────────────────────────────────────────────────
              LEFT — Visualization Viewport (High-End App Chrome)
          ──────────────────────────────────────────────────────── */}
          <div style={{
            minHeight: '520px',
            borderRadius: '20px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 48px -8px rgba(15, 23, 42, 0.08), 0 4px 12px -4px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}>

            {/* App-Chrome Title Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0,
            }}>
              {/* Traffic Lights */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FC5756' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FDBC40' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34C84A' }} />
              </div>

              {/* Animated Category Label */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id + '-bar'}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#007680',
                    fontFamily: 'var(--font-mono, monospace)',
                    background: '#E6F4F5',
                    padding: '3px 12px',
                    borderRadius: '6px',
                    border: '1px solid #99D5D9',
                  }}
                >
                  <Sparkles size={11} />
                  <span>{current.badge}</span>
                </motion.div>
              </AnimatePresence>

              {/* Counter Pill */}
              <div style={{
                fontSize: '0.70rem',
                fontWeight: 800,
                color: '#64748B',
                fontFamily: 'var(--font-mono, monospace)',
                background: '#F1F5F9',
                padding: '3px 9px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
              }}>
                {current.num} / 12
              </div>
            </div>

            {/* Image Stage Container */}
            <div style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={current.id}
                  custom={direction}
                  variants={imgVars as any}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px',
                  }}
                >
                  <img
                    src={current.image}
                    alt={current.title}
                    loading="eager"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      display: 'block',
                      borderRadius: '10px',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                      border: '1px solid #EAEFF4',
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              RIGHT — Insight Panel (Structured Storytelling)
          ──────────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '520px',
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.04)',
            padding: '28px 28px 24px 28px',
          }}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={current.id + '-text'}
                custom={direction}
                variants={textContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >

                {/* Top Badge & Number Row */}
                <motion.div
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}
                >
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: '#E6F4F5',
                    border: '1px solid #99D5D9',
                    color: '#007680',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}>
                    {current.icon}
                    {current.category}
                  </span>

                  <span style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: '#007680',
                    fontFamily: 'var(--font-mono, monospace)',
                    lineHeight: 1,
                  }}>
                    #{current.num}
                  </span>
                </motion.div>

                {/* Title */}
                <motion.h3
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    fontSize: 'clamp(1.22rem, 1.65vw, 1.45rem)',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.25,
                    margin: '0 0 10px',
                  }}
                >
                  {current.title}
                </motion.h3>

                {/* Accent Underline Bar */}
                <motion.div
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    width: '36px',
                    height: '3px',
                    borderRadius: '2px',
                    background: '#007680',
                    marginBottom: '14px',
                  }}
                />

                {/* What It Shows Pill Callout */}
                <motion.div
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '3px',
                  }}>
                    Visualization Blueprint
                  </div>
                  <p style={{
                    fontSize: '0.80rem',
                    color: '#334155',
                    lineHeight: 1.45,
                    margin: 0,
                    fontWeight: 500,
                  }}>
                    {current.whatItShows}
                  </p>
                </motion.div>

                {/* Description */}
                <motion.p
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    fontSize: '0.835rem',
                    color: '#475569',
                    lineHeight: 1.62,
                    margin: '0 0 14px',
                    fontWeight: 400,
                    minHeight: '64px',
                  }}
                >
                  {current.description}
                </motion.p>

                {/* Key Insight Block */}
                <motion.div
                  custom={direction}
                  variants={textItemVariants}
                  style={{ marginBottom: '16px' }}
                >
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(0, 118, 128, 0.04)',
                    borderLeft: '3px solid #007680',
                    border: '1px solid rgba(0, 118, 128, 0.15)',
                    borderLeftWidth: '3px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <TrendingUp size={12} color="#007680" strokeWidth={2.5} />
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        color: '#007680',
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                      }}>
                        Key Audit Insight
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.80rem',
                      color: '#1E293B',
                      lineHeight: 1.55,
                      margin: 0,
                      fontWeight: 500,
                    }}>
                      {current.insight}
                    </p>
                  </div>
                </motion.div>

                {/* Metadata Chips Row */}
                <motion.div
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginTop: 'auto',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 11px',
                    borderRadius: '8px',
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                  }}>
                    <Shield size={10} color="#64748B" strokeWidth={2.4} />
                    <span style={{ fontSize: '0.70rem', fontWeight: 600, color: '#475569' }}>
                      {current.analyticalMethod}
                    </span>
                  </div>

                  <div style={{
                    padding: '5px 11px',
                    borderRadius: '8px',
                    background: riskStyle.bg,
                    border: `1px solid ${riskStyle.border}`,
                  }}>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: riskStyle.color,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>
                      {current.riskLevel} Risk
                    </span>
                  </div>

                  <div style={{
                    padding: '5px 11px',
                    borderRadius: '8px',
                    background: '#E6F4F5',
                    border: '1px solid #99D5D9',
                  }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#007680' }}>
                      {current.metricLabel}: <strong style={{ fontWeight: 800 }}>{current.metricValue}</strong>
                    </span>
                  </div>
                </motion.div>

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            NAVIGATION BAR
            Standardized Deloitte Button Theme & Centered Progress
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginTop: '28px',
          padding: '0 4px',
        }}>

          {/* Left: Active Index & Category Name */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={index + '-counter'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.20 }}
                style={{
                  fontSize: 'clamp(1.6rem, 2.4vw, 2.0rem)',
                  fontWeight: 900,
                  color: '#0F172A',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
            <span style={{
              fontSize: '0.95rem',
              fontWeight: 500,
              color: '#94A3B8',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              / 12
            </span>

            <AnimatePresence mode="wait">
              <motion.span
                key={index + '-catname'}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, delay: 0.04 }}
                style={{
                  marginLeft: '12px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  color: '#007680',
                  paddingLeft: '12px',
                  borderLeft: '1.5px solid #CBD5E1',
                }}
              >
                {current.category}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Center: 12-Step Progress Pill Indicators */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            role="tablist"
            aria-label="Slide indicators"
          >
            {VISUALIZATIONS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to category ${i + 1}`}
                animate={{
                  width: i === index ? 24 : 6,
                  opacity: i === index ? 1 : 0.35,
                  backgroundColor: i === index ? '#007680' : '#94A3B8',
                }}
                transition={{ duration: 0.30, ease: 'easeInOut' }}
                style={{
                  height: 5,
                  borderRadius: 999,
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  flexShrink: 0,
                  outline: 'none',
                }}
              />
            ))}
          </div>

          {/* Right: Previous & Next Buttons matching Deloitte Design System */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <motion.button
              onClick={goPrev}
              disabled={!canPrev}
              aria-label="Previous visualization"
              whileHover={canPrev ? { x: -2, scale: 1.02 } : {}}
              whileTap={canPrev ? { scale: 0.98 } : {}}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: canPrev ? '#FFFFFF' : '#F8FAFC',
                color: canPrev ? '#0F172A' : '#94A3B8',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: canPrev ? 'pointer' : 'not-allowed',
                boxShadow: canPrev ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              <ChevronLeft size={15} strokeWidth={2.4} />
              Previous
            </motion.button>

            <motion.button
              onClick={goNext}
              disabled={!canNext}
              aria-label="Next visualization"
              whileHover={canNext ? { x: 2, scale: 1.02 } : {}}
              whileTap={canNext ? { scale: 0.98 } : {}}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: canNext
                  ? 'linear-gradient(135deg, #007680 0%, #004D54 100%)'
                  : '#CBD5E1',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: canNext ? 'pointer' : 'not-allowed',
                boxShadow: canNext ? '0 4px 14px rgba(0, 118, 128, 0.28)' : 'none',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              Next
              <ChevronRight size={15} strokeWidth={2.4} />
            </motion.button>
          </div>
        </div>

      </div>
    </motion.section>
  );
};

export default VisualizationShowcase;
