/**
 * VisualizationShowcase
 *
 * A premium fixed-stage carousel showcasing the application's analytical
 * visualizations. The surrounding layout NEVER moves — only the content
 * inside the stage transitions between items.
 *
 * Design principles:
 *  - Direction-aware AnimatePresence transitions (left/right)
 *  - Staggered text animation choreography
 *  - Zero layout shift (fixed-height containers throughout)
 *  - Keyboard accessible (ArrowLeft / ArrowRight when section is focused)
 *  - Reduced-motion support via useReducedMotion()
 *  - Preloads adjacent images for instant transitions
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
  BarChart2,
  PieChart,
  GitBranch,
  LineChart,
  TrendingUp,
  Activity,
  Shield,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   VISUALIZATION DATA
   Each entry maps directly to existing chart images in /public/showcase/.
───────────────────────────────────────────────────────────────────────── */

interface VisualizationItem {
  id: string;
  category: string;
  categoryLabel: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  accentColor: string;
  accentGlow: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  insight: string;
  analyticalMethod: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metricLabel: string;
  metricValue: string;
  image: string;
}

const RISK_COLORS: Record<string, { color: string; bg: string }> = {
  LOW:      { color: '#15803D', bg: 'rgba(22,163,74,0.10)'   },
  MEDIUM:   { color: '#D97706', bg: 'rgba(217,119,6,0.10)'   },
  HIGH:     { color: '#DC2626', bg: 'rgba(220,38,38,0.10)'   },
  CRITICAL: { color: '#7C3AED', bg: 'rgba(124,58,237,0.10)'  },
};

const VISUALIZATIONS: VisualizationItem[] = [
  {
    id: 'chart-donut',
    category: 'Exception Distribution',
    categoryLabel: 'ANALYTICS · CATEGORY 01',
    badge: 'Exception Analysis',
    badgeColor: '#007680',
    badgeBg: 'rgba(0,118,128,0.10)',
    accentColor: '#007680',
    accentGlow: 'rgba(0,118,128,0.18)',
    icon: <PieChart size={15} strokeWidth={2.2} />,
    title: 'Exception Distribution by Category',
    description:
      'The donut chart provides a proportional breakdown of all 12 parameter exceptions ' +
      'identified across the General Ledger population. Each arc segment represents a ' +
      'distinct exception category (Ex 1–12), allowing auditors to immediately identify ' +
      'which exception types are most prevalent in the dataset.',
    insight:
      'High concentration in any single segment signals a systemic control weakness ' +
      'requiring targeted investigation rather than a broad-sweep review.',
    analyticalMethod: 'Proportional Distribution',
    riskLevel: 'HIGH',
    metricLabel: 'Coverage',
    metricValue: '12 Categories',
    image: '/showcase/chart_donut.jpg',
  },
  {
    id: 'chart-dqc',
    category: 'Data Quality Checks',
    categoryLabel: 'ANALYTICS · CATEGORY 02',
    badge: 'DQC Validation',
    badgeColor: '#2563EB',
    badgeBg: 'rgba(37,99,235,0.10)',
    accentColor: '#2563EB',
    accentGlow: 'rgba(37,99,235,0.18)',
    icon: <BarChart2 size={15} strokeWidth={2.2} />,
    title: '20 Golden DQC — Data Quality Scorecard',
    description:
      'The horizontal bar chart visualizes pass/fail outcomes for all 20 Golden Data ' +
      'Quality Checks (DQCs). Each bar represents an individual DQC rule applied to the ' +
      'trial balance and general ledger datasets. Color coding distinguishes passed checks, ' +
      'warnings, and critical failures at a glance.',
    insight:
      'A cluster of failures in sequential DQC rules often indicates a data preparation ' +
      'issue upstream — such as encoding errors, date format mismatches, or missing ' +
      'mandatory fields — rather than individual entry-level anomalies.',
    analyticalMethod: 'Rule-Based Scorecard',
    riskLevel: 'MEDIUM',
    metricLabel: 'Validation Rules',
    metricValue: '20 DQC Rules',
    image: '/showcase/chart_dqc.jpg',
  },
  {
    id: 'chart-integrity',
    category: 'Integrity Reference Tests',
    categoryLabel: 'ANALYTICS · CATEGORY 03',
    badge: 'IR Integrity',
    badgeColor: '#16A34A',
    badgeBg: 'rgba(22,163,74,0.10)',
    accentColor: '#16A34A',
    accentGlow: 'rgba(22,163,74,0.18)',
    icon: <GitBranch size={15} strokeWidth={2.2} />,
    title: 'Integrity Reference (IR) Test Results',
    description:
      'This multi-panel visualization presents outcomes for all four Integrity Reference ' +
      'tests (IR 1–4), which cross-validate the trial balance against the general ledger. ' +
      'IR 1 verifies TB accounts exist in the GL population. IR 2 checks total activity ' +
      'alignment. IR 3 validates movement balances. IR 4 reconciles closing balances.',
    insight:
      'Any IR failure directly undermines mathematical integrity of the audit dataset. ' +
      'IR mismatches above 0.1% of total balance value are flagged for mandatory escalation ' +
      'to the engagement partner before exceptions testing proceeds.',
    analyticalMethod: 'Cross-Dataset Reconciliation',
    riskLevel: 'CRITICAL',
    metricLabel: 'Test Suite',
    metricValue: 'IR 1 – IR 4',
    image: '/showcase/chart_integrity.jpg',
  },
  {
    id: 'chart-tb-gl',
    category: 'Trial Balance & GL',
    categoryLabel: 'ANALYTICS · CATEGORY 04',
    badge: 'TB / GL Analysis',
    badgeColor: '#D97706',
    badgeBg: 'rgba(217,119,6,0.10)',
    accentColor: '#D97706',
    accentGlow: 'rgba(217,119,6,0.18)',
    icon: <LineChart size={15} strokeWidth={2.2} />,
    title: 'Trial Balance & General Ledger Comparative',
    description:
      'The comparative chart overlays trial balance checkpoint results alongside general ' +
      'ledger zero-sum verification outcomes. The left axis tracks absolute debit/credit ' +
      'totals; the right axis shows net variance as a percentage of gross activity, ' +
      'plotted over account segments.',
    insight:
      'When the net variance line crosses the 0.05% materiality threshold for any account ' +
      'segment, JET automatically generates a Priority 1 exception flag and includes the ' +
      'account cluster in the workpaper attachment for auditor review.',
    analyticalMethod: 'Zero-Sum Variance Decomp.',
    riskLevel: 'HIGH',
    metricLabel: 'Scope',
    metricValue: 'TB + GL Unified',
    image: '/showcase/chart_tb_gl.jpg',
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   ANIMATION VARIANTS
───────────────────────────────────────────────────────────────────────── */

const imageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 55 : -55,
    opacity: 0,
    scale: 0.97,
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
    x: dir > 0 ? -55 : 55,
    opacity: 0,
    scale: 0.97,
    transition: {
      x:       { type: 'spring' as const, stiffness: 290, damping: 30 },
      opacity: { duration: 0.20, ease: 'easeIn' as const },
      scale:   { duration: 0.22, ease: 'easeIn' as const },
    },
  }),
};

const textContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.07 } },
  exit:    { transition: { staggerChildren: 0.025 } },
};

const textItemVariants = {
  hidden:  (dir: number) => ({ opacity: 0, y: dir > 0 ? 14 : -14 }),
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, y: 0, transition: { duration: 0.16, ease: 'easeIn' as const } },
};

/* Minimal fade for prefers-reduced-motion */
const reducedFade = {
  enter:  { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18 } },
  exit:   { opacity: 0, transition: { duration: 0.12 } },
};

/* ─────────────────────────────────────────────────────────────────────────
   PROGRESS BAR INDICATOR
───────────────────────────────────────────────────────────────────────── */

const ProgressBar: React.FC<{ current: number; total: number; accentColor: string }> = ({
  current, total, accentColor,
}) => (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: '7px' }}
    role="tablist"
    aria-label="Visualization progress"
  >
    {Array.from({ length: total }, (_, i) => (
      <motion.div
        key={i}
        role="tab"
        aria-selected={i === current}
        aria-label={`Slide ${i + 1}`}
        animate={{
          width:           i === current ? 26 : 6,
          opacity:         i === current ? 1  : 0.28,
          backgroundColor: i === current ? accentColor : '#94A3B8',
        }}
        transition={{ duration: 0.32, ease: 'easeInOut' }}
        style={{ height: 4, borderRadius: 999, flexShrink: 0, cursor: 'default' }}
      />
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────── */

export const VisualizationShowcase: React.FC = () => {
  const [index, setIndex]         = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const shouldReduceMotion        = useReducedMotion();
  const sectionRef                = useRef<HTMLElement>(null);

  const current = useMemo(() => VISUALIZATIONS[index], [index]);
  const total   = VISUALIZATIONS.length;

  /* Navigation */
  const go = useCallback(
    (dir: 1 | -1) => {
      const next = index + dir;
      if (next < 0 || next >= total) return;
      setDirection(dir);
      setIndex(next);
    },
    [index, total],
  );

  const goNext = useCallback(() => go(1),  [go]);
  const goPrev = useCallback(() => go(-1), [go]);

  /* Keyboard navigation (ArrowLeft/Right when section is focused) */
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

  /* Preload adjacent images */
  useEffect(() => {
    [index - 1, index + 1]
      .filter(i => i >= 0 && i < total)
      .forEach(i => { const img = new Image(); img.src = VISUALIZATIONS[i].image; });
  }, [index, total]);

  const imgVars   = shouldReduceMotion ? reducedFade : imageVariants;
  const riskStyle = RISK_COLORS[current.riskLevel];
  const canPrev   = index > 0;
  const canNext   = index < total - 1;

  return (
    <section
      ref={sectionRef}
      aria-label="Visualizations and Insights showcase"
      /* tabIndex so keyboard events work when user clicks into section */
      tabIndex={-1}
      style={{
        width: '100%',
        background: 'linear-gradient(155deg, #EEF5FF 0%, #EFF9FA 30%, #F3F9F3 65%, #FAFCFD 100%)',
        borderTop:    '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
        padding: 'clamp(52px, 5.5vw, 72px) clamp(20px, 3.5vw, 56px)',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
      }}
    >

      {/* ── Background decorative: dot grid ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, right: 0,
          width: '480px', height: '100%',
          backgroundImage: 'radial-gradient(circle, rgba(0,163,173,0.14) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 80% 50%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 80% 50%, black 20%, transparent 80%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      {/* ── Ambient glow blob that tracks accent color transitions ── */}
      <motion.div
        aria-hidden="true"
        animate={{ backgroundColor: current.accentGlow }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '-100px', left: '-60px',
          width: '480px', height: '480px',
          borderRadius: '50%',
          filter: 'blur(72px)',
          pointerEvents: 'none', zIndex: 0,
          opacity: 0.55,
        }}
      />

      {/* ── Main Content ── */}
      <div style={{ maxWidth: '1520px', margin: '0 auto', position: 'relative', zIndex: 2 }}>

        {/* ── Section Header ── */}
        <div style={{ marginBottom: 'clamp(36px, 4vw, 52px)' }}>
          <div style={{ marginBottom: '14px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 14px', borderRadius: '999px',
              background: 'rgba(0,163,173,0.10)',
              border: '1px solid rgba(0,118,128,0.18)',
              color: '#007680', fontSize: '0.77rem', fontWeight: 700, letterSpacing: '0.01em',
            }}>
              <Activity size={13} strokeWidth={2.4} />
              Interactive Visualization Guide
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h2 style={{
                fontSize: 'clamp(2.0rem, 3.0vw, 2.72rem)',
                fontWeight: 800, color: '#0F172A',
                letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
              }}>
                Visualizations &amp; Insights.<br />
                <span style={{ color: '#007680' }}>Understand every category.</span>
              </h2>
            </div>
            <p style={{
              fontSize: 'clamp(0.84rem, 1.0vw, 0.91rem)',
              color: '#64748B', lineHeight: 1.65,
              maxWidth: '400px', fontWeight: 400, margin: 0, paddingBottom: '2px',
            }}>
              Step through each analytical category to see exactly which visualization
              is produced, what it represents, and why it matters for your audit.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            FIXED SHOWCASE STAGE
            The outer container never changes. Only internal content
            transitions between items.
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '55fr 45fr',
          gap: 'clamp(24px, 3vw, 44px)',
          alignItems: 'stretch',
          /* Fixed minimum height prevents any vertical layout shift */
          minHeight: '460px',
        }}>

          {/* ────────────────────────────────────────────────────────
              LEFT — Visualization Viewport (app-chrome frame)
          ──────────────────────────────────────────────────────── */}
          <div style={{
            /* Aspect-ratio lock keeps the viewport stable */
            aspectRatio: '16 / 11',
            maxHeight: '480px',
            borderRadius: '18px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 50px -8px rgba(15,23,42,0.10), 0 4px 14px -4px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}>

            {/* App-chrome title bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 14px',
              background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0,
            }}>
              {/* Traffic lights */}
              <div style={{ display: 'flex', gap: '5px' }}>
                {['#FC5756', '#FDBC40', '#34C84A'].map(c => (
                  <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
                ))}
              </div>

              {/* Animated chart title bar */}
              <AnimatePresence mode="wait">
                <motion.span
                  key={current.id + '-bar'}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    fontSize: '0.68rem', fontWeight: 700, color: '#475569',
                    letterSpacing: '0.05em',
                    fontFamily: 'var(--font-mono, monospace)',
                    background: 'rgba(0,0,0,0.04)', padding: '3px 9px',
                    borderRadius: '5px', border: '1px solid rgba(0,0,0,0.07)',
                  }}
                >
                  {current.categoryLabel}
                </motion.span>
              </AnimatePresence>

              {/* Accent dot */}
              <motion.div
                animate={{ backgroundColor: current.accentColor }}
                transition={{ duration: 0.5 }}
                style={{ width: 7, height: 7, borderRadius: '50%' }}
              />
            </div>

            {/* Image area */}
            <div style={{
              flex: 1, position: 'relative', overflow: 'hidden',
              background: '#F8FAFC',
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
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '10px',
                  }}
                >
                  <img
                    src={current.image}
                    alt={current.title}
                    loading="eager"
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'contain', objectPosition: 'center',
                      display: 'block', borderRadius: '7px',
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              RIGHT — Insight Panel
          ──────────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            /* Matches minimum height of left viewport */
            minHeight: '460px',
            padding: '2px 0',
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

                {/* Category badge */}
                <motion.div custom={direction} variants={textItemVariants} style={{ marginBottom: '14px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 11px', borderRadius: '999px',
                    background: current.badgeBg,
                    border: `1px solid ${current.accentColor}2E`,
                    color: current.badgeColor,
                    fontSize: '0.67rem', fontWeight: 800,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}>
                    {current.icon}
                    {current.badge}
                  </span>
                </motion.div>

                {/* Title */}
                <motion.h3
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    fontSize: 'clamp(1.45rem, 2.0vw, 1.95rem)',
                    fontWeight: 800, color: '#0F172A',
                    letterSpacing: '-0.035em', lineHeight: 1.15,
                    margin: '0 0 10px',
                  }}
                >
                  {current.title}
                </motion.h3>

                {/* Accent underline bar */}
                <motion.div custom={direction} variants={textItemVariants} style={{ marginBottom: '16px' }}>
                  <motion.div
                    animate={{ backgroundColor: current.accentColor }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    style={{ width: 32, height: 3, borderRadius: 2 }}
                  />
                </motion.div>

                {/* Description */}
                <motion.p
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    fontSize: '0.856rem', color: '#475569',
                    lineHeight: 1.68, margin: '0 0 18px', fontWeight: 400,
                    /* Prevent layout shift from variable-length descriptions */
                    minHeight: '88px',
                    overflow: 'hidden',
                  }}
                >
                  {current.description}
                </motion.p>

                {/* Key Insight block */}
                <motion.div custom={direction} variants={textItemVariants} style={{ marginBottom: '18px' }}>
                  <div style={{
                    padding: '13px 15px', borderRadius: '11px',
                    background: `${current.accentColor}08`,
                    borderLeft: `3px solid ${current.accentColor}`,
                    border: `1px solid ${current.accentColor}22`,
                    borderLeftWidth: '3px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <TrendingUp size={12} color={current.accentColor} strokeWidth={2.5} />
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800,
                        color: current.accentColor, letterSpacing: '0.07em', textTransform: 'uppercase',
                      }}>
                        Key Insight
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.82rem', color: '#334155',
                      lineHeight: 1.62, margin: 0, fontWeight: 400,
                      /* Fixed min-height prevents layout shift on short insights */
                      minHeight: '52px',
                    }}>
                      {current.insight}
                    </p>
                  </div>
                </motion.div>

                {/* Metadata chips */}
                <motion.div
                  custom={direction}
                  variants={textItemVariants}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: '8px', flexWrap: 'wrap', marginTop: 'auto',
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 11px', borderRadius: '8px',
                    background: '#F1F5F9', border: '1px solid #E2E8F0',
                  }}>
                    <Shield size={10} color="#64748B" strokeWidth={2.4} />
                    <span style={{ fontSize: '0.70rem', fontWeight: 600, color: '#475569' }}>
                      {current.analyticalMethod}
                    </span>
                  </div>

                  <div style={{
                    padding: '5px 11px', borderRadius: '8px',
                    background: riskStyle.bg,
                    border: `1px solid ${riskStyle.color}33`,
                  }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 800,
                      color: riskStyle.color, letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>
                      {current.riskLevel} Risk
                    </span>
                  </div>

                  <div style={{
                    padding: '5px 11px', borderRadius: '8px',
                    background: current.badgeBg,
                    border: `1px solid ${current.accentColor}33`,
                  }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: 700, color: current.badgeColor }}>
                      {current.metricLabel}:{' '}
                      <strong style={{ fontWeight: 800 }}>{current.metricValue}</strong>
                    </span>
                  </div>
                </motion.div>

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            NAVIGATION BAR
            Completely outside the stage — layout never shifts.
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          marginTop: 'clamp(24px, 3vw, 36px)', padding: '0 2px',
        }}>

          {/* Left: Slide counter + category name */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={index + '-counter'}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.20 }}
                style={{
                  fontSize: 'clamp(1.55rem, 2.4vw, 2.05rem)',
                  fontWeight: 900, color: '#0F172A',
                  letterSpacing: '-0.04em', lineHeight: 1,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
            <span style={{
              fontSize: 'clamp(0.82rem, 1.1vw, 0.97rem)',
              fontWeight: 500, color: '#94A3B8',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              / {String(total).padStart(2, '0')}
            </span>

            <AnimatePresence mode="wait">
              <motion.span
                key={index + '-catname'}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, delay: 0.04 }}
                style={{
                  marginLeft: '12px', fontSize: '0.77rem',
                  fontWeight: 600, color: '#64748B',
                  paddingLeft: '12px', borderLeft: '1px solid #E2E8F0',
                }}
              >
                {current.category}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Center: Progress bar indicators */}
          <ProgressBar current={index} total={total} accentColor={current.accentColor} />

          {/* Right: Previous / Next buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            <motion.button
              onClick={goPrev}
              disabled={!canPrev}
              aria-label="Previous visualization"
              whileHover={canPrev ? { x: -2, scale: 1.03 } : {}}
              whileTap={canPrev ? { scale: 0.95 } : {}}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: canPrev ? '#FFFFFF' : '#F8FAFC',
                color: canPrev ? '#334155' : '#CBD5E1',
                fontSize: '0.81rem', fontWeight: 700,
                cursor: canPrev ? 'pointer' : 'not-allowed',
                boxShadow: canPrev ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                outline: 'none',
              }}
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              Previous
            </motion.button>

            <motion.button
              onClick={goNext}
              disabled={!canNext}
              aria-label="Next visualization"
              whileHover={canNext ? { x: 2, scale: 1.03 } : {}}
              whileTap={canNext ? { scale: 0.95 } : {}}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 20px', borderRadius: '10px', border: 'none',
                background: canNext
                  ? `linear-gradient(135deg, ${current.accentColor} 0%, ${current.accentColor}BB 100%)`
                  : '#CBD5E1',
                color: '#FFFFFF',
                fontSize: '0.81rem', fontWeight: 700,
                cursor: canNext ? 'pointer' : 'not-allowed',
                boxShadow: canNext ? `0 4px 14px ${current.accentColor}44` : 'none',
                transition: 'background 0.45s ease, box-shadow 0.30s ease',
                outline: 'none',
              }}
            >
              Next
              <ChevronRight size={14} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default VisualizationShowcase;
