/**
 * VisualizationShowcase
 *
 * Maps the 4 existing showcase chart images to the correct analytical
 * categories from the application (Ex 01-12 / IR tests / DQC / TB-GL).
 *
 * Design:
 *  - Pure light theme matching the Deloitte JET design system exactly
 *  - Teal (#007680) accent + same CTA gradient as other buttons
 *  - whileInView scroll-reveal matching other dashboard sections
 *  - Direction-aware AnimatePresence slide transitions
 *  - Staggered text choreography
 *  - Zero layout shift (fixed minHeight containers)
 *  - Keyboard accessible (ArrowLeft/ArrowRight)
 *  - Reduced-motion support
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
  BarChart3,
  GitBranch,
  PieChart,
  CheckCircle2,
  Activity,
} from 'lucide-react';

/* =========================================================================
   VISUALIZATION DATA
   Correctly mapped to real application categories (ExecutiveChartJsAnalyticsSuite).
   Images reference the 4 existing files in /public/showcase/.
   chart_donut.jpg     -> Ex 01: Account Wise Analysis (donut + bar)
   chart_dqc.jpg       -> Ex 11: Population Statistics (line + bar period view)
   chart_integrity.jpg -> IR Tests: TB-to-GL cross reconciliation
   chart_tb_gl.jpg     -> TB Checkpoints + GL Zero-Sum verification
========================================================================= */

interface VisualizationItem {
  id: string;
  num: string;
  category: string;
  badge: string;
  icon: React.ReactNode;
  title: string;
  whatItShows: string;
  description: string;
  insight: string;
  analyticalMethod: string;
  image: string;
}

const VISUALIZATIONS: VisualizationItem[] = [
  {
    id: 'ex01-account-wise',
    num: '01',
    category: 'Account Wise Analysis',
    badge: 'Exception · Ex 01 / Summary 1',
    icon: <Layers size={14} strokeWidth={2.2} />,
    title: 'Account Activity Distribution & Financial Statement Exposure',
    whatItShows:
      'Bar chart (Total Standard vs Non-Standard Lines per GL account) paired with a donut chart showing Financial Statement Line Debit Exposure by segment.',
    description:
      'Ex 01 aggregates all journal entries by account and classifies each line as standard ' +
      'or non-standard. The bar chart reveals which accounts carry the highest volume of ' +
      'non-standard activity — a key indicator of potential override risk. The donut chart ' +
      'maps debit exposure across financial statement segments such as Trade Receivables, ' +
      'Cash Holdings, Inventories, and Accrued Liabilities.',
    insight:
      'Accounts with a disproportionately high non-standard ratio — particularly those in ' +
      'high-value segments — should be prioritised for substantive testing. Concentration ' +
      'above 15% in any single segment warrants a targeted account-level review.',
    analyticalMethod: 'Standard vs Non-Standard Line Classification',
    image: '/showcase/chart_donut.jpg',
  },
  {
    id: 'ex11-population-stats',
    num: '11',
    category: 'Population Statistics',
    badge: 'Period Analysis / Summary 11',
    icon: <Activity size={14} strokeWidth={2.2} />,
    title: 'Period-Wise Activity Trajectory & Monthly Volume Distribution',
    whatItShows:
      'Line chart (Total Amount in Local Currency over P1-P12) alongside a grouped bar chart showing Standard vs Non-Standard entry volume per period.',
    description:
      'The Population Statistics panel tracks journal entry behaviour across all 12 fiscal ' +
      'periods. The trajectory line plots total monetary value processed each period in ' +
      'local currency, revealing seasonal patterns, period-end spikes, and unusual mid-year ' +
      'concentrations. The grouped bar chart separates standard from non-standard volume ' +
      'so auditors can spot periods where manual activity was disproportionately high.',
    insight:
      'Sharp upward spikes in late-period non-standard volume (e.g., P11 or P12) are a ' +
      'classic indicator of period-end pressure entries. These periods should receive ' +
      'closer scrutiny under After Closing Entries (Ex 09) and Closing Entries (Ex 04) tests.',
    analyticalMethod: 'Period-Wise Volume & Monetary Trend Analysis',
    image: '/showcase/chart_dqc.jpg',
  },
  {
    id: 'ir-tests',
    num: 'IR',
    category: 'Integrity Reference Tests',
    badge: 'IR 1 - IR 4 / Cross-Dataset',
    icon: <GitBranch size={14} strokeWidth={2.2} />,
    title: 'IR Test Suite: TB-to-GL Cross-Dataset Reconciliation',
    whatItShows:
      'Four sparkline panels (IR-1 through IR-4) each with a status indicator (Action Required / Needs Review), plus a Pass/Fail distribution bar chart across all four tests.',
    description:
      'The four Integrity Reference tests cross-validate the trial balance against the ' +
      'general ledger at different levels of granularity. IR-1 verifies that all TB ' +
      'accounts exist in the GL population. IR-2 checks that total activity sums align. ' +
      'IR-3 validates closing balance gaps are within tolerance. IR-4 confirms no unposted ' +
      'journals remain outstanding at period close.',
    insight:
      'Any IR failure directly breaks the mathematical chain of audit evidence. An IR-1 ' +
      'miss means the TB references accounts not captured in the population — a data ' +
      'completeness risk. IR mismatches above 0.1% of total balance are escalated as ' +
      'Priority 1 findings before exceptions testing proceeds.',
    analyticalMethod: 'Cross-Dataset Reconciliation (TB to GL)',
    image: '/showcase/chart_integrity.jpg',
  },
  {
    id: 'tb-gl-checkpoints',
    num: 'TB',
    category: 'Trial Balance & GL Checkpoints',
    badge: 'TB Checkpoints + GL Zero-Sum',
    icon: <BarChart3 size={14} strokeWidth={2.2} />,
    title: 'Trial Balance Checkpoint Pass/Fail & GL Zero-Sum Verification',
    whatItShows:
      'Vertical bar chart showing Pass/Fail status for each of the 8 TB Checkpoints (CP-01 to CP-08), alongside a summary card confirming GL Zero-Sum verification (Debit = Credit).',
    description:
      'The TB Checkpoints panel systematically validates that the uploaded trial balance ' +
      'passes all mandatory structural checks: debit/credit equality, opening balance ' +
      'completeness, zero-value account filtering, and closing balance reconciliation. ' +
      'The GL Zero-Sum card confirms the general ledger balances to zero across the entire ' +
      'population, meeting the core mathematical integrity requirement.',
    insight:
      'A failed CP-02 or CP-04 checkpoint typically signals a data preparation issue — ' +
      'such as a missing period-end reversal or a corrupted export — rather than an ' +
      'actual accounting error. These must be resolved before exception testing is valid. ' +
      'The Zero-Sum badge (Debit = Credit) is the primary audit readiness signal.',
    analyticalMethod: 'Zero-Sum Integrity & Checkpoint Validation',
    image: '/showcase/chart_tb_gl.jpg',
  },
];

/* =========================================================================
   SCROLL-REVEAL VARIANTS — matching other dashboard sections exactly
========================================================================= */

const sectionReveal = {
  hidden:  { opacity: 0, y: 22 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

/* =========================================================================
   SLIDE TRANSITION VARIANTS — direction-aware
========================================================================= */

const imageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0, scale: 0.98 }),
  center: {
    x: 0, opacity: 1, scale: 1,
    transition: {
      x:       { type: 'spring' as const, stiffness: 300, damping: 32 },
      opacity: { duration: 0.28, ease: 'easeOut' as const },
      scale:   { duration: 0.32, ease: 'easeOut' as const },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48, opacity: 0, scale: 0.98,
    transition: {
      x:       { type: 'spring' as const, stiffness: 300, damping: 32 },
      opacity: { duration: 0.18, ease: 'easeIn' as const },
    },
  }),
};

const textContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
  exit:    { transition: { staggerChildren: 0.02 } },
};

const textItem = {
  hidden:  (dir: number) => ({ opacity: 0, y: dir > 0 ? 12 : -12 }),
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, y: 0, transition: { duration: 0.14 } },
};

const reducedFade = {
  enter:  { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit:   { opacity: 0, transition: { duration: 0.14 } },
};

/* =========================================================================
   PROGRESS PILLS
========================================================================= */

const ProgressPills: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} aria-hidden="true">
    {Array.from({ length: total }, (_, i) => (
      <motion.div
        key={i}
        animate={{
          width:           i === current ? 24 : 6,
          opacity:         i === current ? 1  : 0.25,
          backgroundColor: i === current ? '#007680' : '#CBD5E1',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ height: 4, borderRadius: 999, flexShrink: 0 }}
      />
    ))}
  </div>
);

/* =========================================================================
   MAIN COMPONENT
========================================================================= */

export const VisualizationShowcase: React.FC = () => {
  const [index, setIndex]         = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const shouldReduceMotion        = useReducedMotion();
  const sectionRef                = useRef<HTMLElement>(null);

  const current = useMemo(() => VISUALIZATIONS[index], [index]);
  const total   = VISUALIZATIONS.length;

  const go = useCallback((dir: 1 | -1) => {
    const next = index + dir;
    if (next < 0 || next >= total) return;
    setDirection(dir);
    setIndex(next);
  }, [index, total]);

  const goNext = useCallback(() => go(1),  [go]);
  const goPrev = useCallback(() => go(-1), [go]);

  /* Keyboard navigation */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sectionRef.current?.contains(document.activeElement)) {
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

  const imgVars = shouldReduceMotion ? reducedFade : imageVariants;
  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <motion.section
      ref={sectionRef}
      aria-label="Visualizations and Insights showcase"
      tabIndex={-1}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={sectionReveal}
      style={{
        width: '100%',
        /* Exact same light gradient as the pillars / feature section */
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F5FAF8 40%, #EDF7F5 100%)',
        borderTop:    '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
        padding: 'clamp(48px, 5.5vw, 68px) clamp(24px, 3.5vw, 56px) clamp(56px, 6.5vw, 76px)',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
      }}
    >

      {/* Background: teal dot matrix — right side, matching pillars section */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, right: 0,
          width: '420px', height: '100%',
          backgroundImage: 'radial-gradient(circle, rgba(0,163,173,0.20) 1.2px, transparent 1.2px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 75% 50%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 75% 50%, black 20%, transparent 80%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      {/* Background: wave SVG — matching lifecycle section */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute', top: '50%', left: 0,
          width: '100%', height: '240px',
          pointerEvents: 'none', zIndex: 0,
          transform: 'translateY(-50%)',
        }}
        viewBox="0 0 1600 240"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M -50 180 C 250 50, 600 210, 950 80 C 1200 -10, 1420 160, 1650 70"
          stroke="url(#showcaseRibbon)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.28"
        />
        <defs>
          <linearGradient id="showcaseRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#007680" stopOpacity="0.4" />
            <stop offset="50%"  stopColor="#10B981" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{ maxWidth: '1520px', margin: '0 auto', position: 'relative', zIndex: 2 }}>

        {/* ── Section Header — identical structure to other sections ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', flexWrap: 'wrap',
          gap: '24px', marginBottom: '38px',
        }}>
          <div style={{ maxWidth: '620px' }}>
            <div style={{ marginBottom: '14px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 14px', borderRadius: '999px',
                background: 'rgba(0,163,173,0.10)',
                border: '1px solid rgba(0,118,128,0.18)',
                color: '#007680', fontSize: '0.78rem', fontWeight: 700,
                letterSpacing: '0.01em',
              }}>
                <PieChart size={14} />
                Visual analytics across every exception category
              </span>
            </div>
            <h2 style={{
              fontSize: 'clamp(2.1rem, 3.3vw, 2.85rem)',
              fontWeight: 800, color: '#0F172A',
              letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
            }}>
              Visualizations &amp; Insights.<br />
              <span style={{ color: '#007680' }}>One chart per category.</span>
            </h2>
          </div>

          <p style={{
            fontSize: 'clamp(0.88rem, 1.05vw, 0.95rem)',
            color: '#64748B', lineHeight: 1.65,
            maxWidth: '380px', fontWeight: 400, margin: 0, paddingBottom: '4px',
          }}>
            Navigate through each analytical category to understand what the
            visualization shows, what it tests, and what insight it delivers to
            the audit team.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            FIXED SHOWCASE STAGE — layout never shifts
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '55fr 45fr',
          gap: 'clamp(24px, 3vw, 44px)',
          alignItems: 'stretch',
          minHeight: '460px',
        }}>

          {/* LEFT — Chart Viewport */}
          <div style={{
            aspectRatio: '16 / 11',
            maxHeight: '480px',
            borderRadius: '18px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 32px -4px rgba(15,23,42,0.07), 0 4px 12px -4px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>

            {/* Browser chrome */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px',
              background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['#FC5756', '#FDBC40', '#34C84A'].map(c => (
                  <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.span
                  key={current.id + '-bar'}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.20 }}
                  style={{
                    fontSize: '0.67rem', fontWeight: 700, color: '#475569',
                    letterSpacing: '0.05em', fontFamily: 'var(--font-mono, monospace)',
                    background: 'rgba(0,0,0,0.04)', padding: '3px 9px',
                    borderRadius: '5px', border: '1px solid rgba(0,0,0,0.07)',
                  }}
                >
                  {current.badge}
                </motion.span>
              </AnimatePresence>

              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#007680' }} />
            </div>

            {/* Image area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#F8FAFC' }}>
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

          {/* RIGHT — Insight Panel */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '460px', padding: '2px 0',
          }}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={current.id + '-text'}
                custom={direction}
                variants={textContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                {/* Badge */}
                <motion.div custom={direction} variants={textItem} style={{ marginBottom: '14px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 11px', borderRadius: '999px',
                    background: 'rgba(0,118,128,0.08)',
                    border: '1px solid rgba(0,118,128,0.20)',
                    color: '#007680',
                    fontSize: '0.67rem', fontWeight: 800,
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}>
                    {current.icon}
                    {current.num} · {current.category}
                  </span>
                </motion.div>

                {/* Title */}
                <motion.h3
                  custom={direction}
                  variants={textItem}
                  style={{
                    fontSize: 'clamp(1.3rem, 1.85vw, 1.72rem)',
                    fontWeight: 800, color: '#0F172A',
                    letterSpacing: '-0.03em', lineHeight: 1.18,
                    margin: '0 0 10px',
                  }}
                >
                  {current.title}
                </motion.h3>

                {/* Teal + green underline matching brand */}
                <motion.div custom={direction} variants={textItem} style={{ marginBottom: '16px' }}>
                  <div style={{
                    width: 32, height: 3, borderRadius: 2,
                    background: 'linear-gradient(90deg, #007680, #86BC25)',
                  }} />
                </motion.div>

                {/* What it shows */}
                <motion.div custom={direction} variants={textItem} style={{ marginBottom: '14px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    padding: '10px 13px', borderRadius: '10px',
                    background: 'rgba(0,118,128,0.05)',
                    border: '1px solid rgba(0,118,128,0.12)',
                  }}>
                    <CheckCircle2
                      size={13} color="#007680" strokeWidth={2.4}
                      style={{ flexShrink: 0, marginTop: '2px' }}
                    />
                    <p style={{
                      fontSize: '0.80rem', color: '#334155',
                      lineHeight: 1.58, margin: 0, fontWeight: 400,
                    }}>
                      <strong style={{ color: '#0F172A', fontWeight: 700 }}>What it shows: </strong>
                      {current.whatItShows}
                    </p>
                  </div>
                </motion.div>

                {/* Description */}
                <motion.p
                  custom={direction}
                  variants={textItem}
                  style={{
                    fontSize: '0.84rem', color: '#475569',
                    lineHeight: 1.68, margin: '0 0 16px', fontWeight: 400,
                    minHeight: '72px', overflow: 'hidden',
                  }}
                >
                  {current.description}
                </motion.p>

                {/* Audit Insight callout */}
                <motion.div custom={direction} variants={textItem} style={{ marginBottom: '18px' }}>
                  <div style={{
                    padding: '12px 15px', borderRadius: '11px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderLeftWidth: '3px',
                    borderLeftColor: '#007680',
                    boxShadow: '0 2px 8px -2px rgba(15,23,42,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                      <TrendingUp size={12} color="#007680" strokeWidth={2.5} />
                      <span style={{
                        fontSize: '0.64rem', fontWeight: 800,
                        color: '#007680', letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                      }}>
                        Audit Insight
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.81rem', color: '#334155',
                      lineHeight: 1.60, margin: 0, fontWeight: 400,
                      minHeight: '44px',
                    }}>
                      {current.insight}
                    </p>
                  </div>
                </motion.div>

                {/* Method chip */}
                <motion.div
                  custom={direction}
                  variants={textItem}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}
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
                </motion.div>

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* NAVIGATION BAR */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          marginTop: 'clamp(24px, 3vw, 36px)',
        }}>

          {/* Left: counter */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={index + '-n'}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.18 }}
                style={{
                  fontSize: 'clamp(1.5rem, 2.3vw, 2.0rem)',
                  fontWeight: 900, color: '#0F172A',
                  letterSpacing: '-0.04em', lineHeight: 1,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
            <span style={{
              fontSize: '0.90rem', fontWeight: 500, color: '#94A3B8',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              / {String(total).padStart(2, '0')}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={index + '-cat'}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.20, delay: 0.03 }}
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

          {/* Center: progress pills */}
          <ProgressPills current={index} total={total} />

          {/* Right: Previous / Next — teal matching all other CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button
              onClick={goPrev}
              disabled={!canPrev}
              aria-label="Previous visualization"
              whileHover={canPrev ? { scale: 1.03 } : {}}
              whileTap={canPrev ? { scale: 0.96 } : {}}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
                background: canPrev ? '#FFFFFF' : '#F8FAFC',
                color: canPrev ? '#334155' : '#CBD5E1',
                fontSize: '0.82rem', fontWeight: 600,
                cursor: canPrev ? 'pointer' : 'not-allowed',
                boxShadow: canPrev ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              Previous
            </motion.button>

            {/* Same gradient as "Start Audit Execution" button */}
            <motion.button
              onClick={goNext}
              disabled={!canNext}
              aria-label="Next visualization"
              whileHover={canNext ? { scale: 1.03, transform: 'translateY(-1px)' } : {}}
              whileTap={canNext ? { scale: 0.97 } : {}}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 20px', borderRadius: '10px', border: 'none',
                background: canNext
                  ? 'linear-gradient(135deg, #007680 0%, #004D54 100%)'
                  : '#CBD5E1',
                color: '#FFFFFF',
                fontSize: '0.82rem', fontWeight: 700,
                cursor: canNext ? 'pointer' : 'not-allowed',
                boxShadow: canNext ? '0 4px 14px rgba(0,118,128,0.28)' : 'none',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              Next
              <ChevronRight size={14} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>

      </div>
    </motion.section>
  );
};

export default VisualizationShowcase;
