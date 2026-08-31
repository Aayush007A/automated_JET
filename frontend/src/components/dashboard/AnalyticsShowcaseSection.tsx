import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  PieChart, BarChart2, ShieldCheck, Activity,
  ArrowRight, CheckCircle2, Zap, Eye, TrendingUp, Database,
} from 'lucide-react';

/* ── Types ── */
interface ShowcaseItem {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  chartCount: string;
  accentFrom: string;
  accentTo: string;
  badgeColor: string;
  badgeBg: string;
  icon: React.ReactNode;
  image: string;
  imageAlt: string;
  flip: boolean;
}

const ITEMS: ShowcaseItem[] = [
  {
    id: 'tb-gl',
    eyebrow: 'TRIAL BALANCE & GENERAL LEDGER',
    title: 'Zero-Sum Integrity Checkpoints',
    description:
      'Automated vertical bar charts map every TB checkpoint against debit/credit equality rules. A live scorecard confirms Zero-Sum verification, opening/closing balances, and net difference — instantly surfacing any ledger mismatches before sign-off.',
    bullets: [
      'CP-01 through CP-08 pass/fail bar chart',
      'Opening & Closing Balance comparison cards',
      'Zero-Sum verified status with confidence score',
      'Progress bar: Passed vs. Total checkpoints',
    ],
    chartCount: '8 Checkpoints Visualized',
    accentFrom: '#007680',
    accentTo: '#86BC25',
    badgeColor: '#2DD4BF',
    badgeBg: 'rgba(0,163,173,0.10)',
    icon: <ShieldCheck size={20} strokeWidth={2.2} />,
    image: '/showcase/chart_tb_gl.jpg',
    imageAlt: 'Trial Balance & GL Checkpoint Analytics',
    flip: false,
  },
  {
    id: 'exceptions',
    eyebrow: 'EXCEPTION ANALYTICS — EX 1–12',
    title: 'Category-Wise Exception Intelligence',
    description:
      'Interactive donut charts break down all 12 exception parameters by category and severity. Keyword Risk Severity rings classify each flagged entry as High / Medium / Low, while radial callout labels ensure every slice is clearly labeled without overlap.',
    bullets: [
      'Exception distribution donut with 6 categories',
      'Keyword Risk Severity ring — 4-level heat mapping',
      'Callout arrows pointing to each labeled segment',
      'Legend with exact counts and percentages',
    ],
    chartCount: '12 Exceptions · 2 Ring Charts',
    accentFrom: '#7C3AED',
    accentTo: '#2563EB',
    badgeColor: '#A78BFA',
    badgeBg: 'rgba(124,58,237,0.10)',
    icon: <PieChart size={20} strokeWidth={2.2} />,
    image: '/showcase/chart_donut.jpg',
    imageAlt: 'Exception Category Donut Charts',
    flip: true,
  },
  {
    id: 'dqc',
    eyebrow: '20 GOLDEN DATA QUALITY CHECKS',
    title: 'DQC Pass / Fail Intelligence Charts',
    description:
      'Horizontal grouped bar charts display all 20 DQC parameters side by side — passed row volume vs. failed row count per check. A headline scorecard immediately signals the overall DQC pass rate so auditors can triage issues at a glance.',
    bullets: [
      'DQC-01 through DQC-20 horizontal bar matrix',
      'Dual-series: Passed volume (teal) vs Failed count (rose)',
      'Overall score banner: "18 Passed, 2 Failed, 90%"',
      'Interactive hover reveals exact row counts per DQC',
    ],
    chartCount: '20 DQC Bars Rendered',
    accentFrom: '#0284C7',
    accentTo: '#2DD4BF',
    badgeColor: '#38BDF8',
    badgeBg: 'rgba(2,132,199,0.10)',
    icon: <BarChart2 size={20} strokeWidth={2.2} />,
    image: '/showcase/chart_dqc.jpg',
    imageAlt: '20 Golden DQC Bar Chart',
    flip: false,
  },
  {
    id: 'integrity',
    eyebrow: 'INTEGRITY REPORTS — IR 1–4',
    title: 'Cross-Dataset Integrity Report Cards',
    description:
      'Four metric cards — IR-1 through IR-4 — each surface their own sparkline trend, exception count badge, and priority level. A stacked pass/fail bar chart at the bottom provides an aggregated view across all four integrity dimensions simultaneously.',
    bullets: [
      'IR-1: TB Not in Population — count badge + sparkline',
      'IR-2: Activity Mismatch — action-required indicator',
      'IR-3: Closing Balance Gaps — needs-review flag',
      'IR-4: Unposted Journals — stacked distribution bar',
    ],
    chartCount: '4 Reports · 4 Sparklines · 1 Stacked Bar',
    accentFrom: '#D97706',
    accentTo: '#E11D48',
    badgeColor: '#FBBF24',
    badgeBg: 'rgba(217,119,6,0.10)',
    icon: <Activity size={20} strokeWidth={2.2} />,
    image: '/showcase/chart_integrity.jpg',
    imageAlt: 'Integrity Reports IR-1 through IR-4',
    flip: true,
  },
];

/* ── Framer variants ── */
const containerReveal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const slideLeft = {
  hidden: { opacity: 0, x: -52 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const } },
};
const slideRight = {
  hidden: { opacity: 0, x: 52 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ── Single Row ── */
const ShowcaseRow: React.FC<{ item: ShowcaseItem; idx: number; total: number }> = ({ item, idx, total }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px' });

  const textBlock = (
    <motion.div
      variants={item.flip ? slideRight : slideLeft}
      style={{ display: 'flex', flexDirection: 'column', gap: '18px', justifyContent: 'center' }}
    >
      {/* Icon + eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: item.badgeBg,
          border: `1px solid ${item.badgeColor}44`,
          color: item.badgeColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 14px ${item.badgeColor}22`,
        }}>
          {item.icon}
        </div>
        <span style={{
          fontSize: '0.67rem', fontWeight: 800, letterSpacing: '0.1em',
          color: item.badgeColor, textTransform: 'uppercase' as const,
        }}>
          {item.eyebrow}
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 'clamp(1.25rem, 2.1vw, 1.7rem)',
        fontWeight: 900,
        color: '#0F172A',
        letterSpacing: '-0.035em',
        lineHeight: 1.2,
        margin: 0,
      }}>
        {item.title}
      </h3>

      {/* Gradient rule */}
      <div style={{
        width: '48px', height: '3px', borderRadius: '999px',
        background: `linear-gradient(90deg, ${item.accentFrom}, ${item.accentTo})`,
        boxShadow: `0 0 10px ${item.accentFrom}55`,
      }} />

      {/* Description */}
      <p style={{ fontSize: '0.88rem', lineHeight: 1.72, color: '#475569', margin: 0, fontWeight: 400 }}>
        {item.description}
      </p>

      {/* Bullet list */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {item.bullets.map((b, bi) => (
          <li key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '0.83rem', color: '#334155', fontWeight: 500 }}>
            <CheckCircle2 size={15} color={item.accentFrom} style={{ flexShrink: 0, marginTop: '2px' }} strokeWidth={2.5} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* Footer pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const, marginTop: '4px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '999px',
          background: item.badgeBg, border: `1px solid ${item.badgeColor}44`,
          fontSize: '0.70rem', fontWeight: 700, color: item.badgeColor,
        }}>
          <Zap size={11} />
          {item.chartCount}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '0.76rem', fontWeight: 600, color: item.accentFrom,
        }}>
          <Eye size={12} /> Auto-generated on every run
          <ArrowRight size={11} />
        </span>
      </div>
    </motion.div>
  );

  const imageBlock = (
    <motion.div
      variants={item.flip ? slideLeft : slideRight}
      style={{ position: 'relative' as const }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute' as const, inset: '-28px',
        borderRadius: '32px',
        background: `radial-gradient(ellipse at center, ${item.accentFrom}14 0%, transparent 70%)`,
        pointerEvents: 'none' as const, zIndex: 0,
      }} />

      {/* Chrome browser frame */}
      <div style={{
        position: 'relative' as const,
        borderRadius: '18px',
        overflow: 'hidden',
        border: '1px solid rgba(148,163,184,0.2)',
        boxShadow: `0 28px 64px -14px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 1px rgba(0,0,0,0.04), 0 8px 24px -8px ${item.accentFrom}33`,
        zIndex: 1,
        background: '#0D1E35',
      }}>
        {/* Chrome title bar */}
        <div style={{
          height: '34px',
          background: 'linear-gradient(180deg, #1B2D46 0%, #142236 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: '7px',
        }}>
          {['#E11D48', '#F59E0B', '#22C55E'].map((c, ci) => (
            <div key={ci} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.65 }} />
          ))}
          {/* URL bar */}
          <div style={{
            flex: 1, height: '18px', marginLeft: '10px',
            background: 'rgba(255,255,255,0.06)', borderRadius: '4px',
            display: 'flex', alignItems: 'center', padding: '0 8px', gap: '5px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em', whiteSpace: 'nowrap' as const }}>
              jet.deloitte.com/summary/analytics
            </span>
          </div>
        </div>

        <img
          src={item.image}
          alt={item.imageAlt}
          style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' as const }}
          loading="lazy"
        />

        {/* Bottom "LIVE" badge */}
        <div style={{
          position: 'absolute' as const, bottom: '12px', right: '12px',
          background: 'rgba(13,30,53,0.85)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${item.badgeColor}55`,
          borderRadius: '7px',
          padding: '4px 10px',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          <TrendingUp size={10} color={item.badgeColor} />
          <span style={{ fontSize: '0.60rem', fontWeight: 700, color: item.badgeColor, letterSpacing: '0.05em' }}>
            LIVE ANALYTICS
          </span>
        </div>
      </div>

      {/* Step number badge */}
      <div style={{
        position: 'absolute' as const,
        top: '-14px',
        [item.flip ? 'right' : 'left']: '-14px',
        width: '44px', height: '44px', borderRadius: '50%',
        background: `linear-gradient(135deg, ${item.accentFrom}, ${item.accentTo})`,
        color: '#FFFFFF',
        fontSize: '1rem', fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 18px ${item.accentFrom}55`,
        zIndex: 2, letterSpacing: '-0.03em',
      }}>
        {String(idx + 1).padStart(2, '0')}
      </div>
    </motion.div>
  );

  return (
    <div ref={ref}>
      <motion.div
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        variants={containerReveal}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 1fr) minmax(420px, 1.15fr)',
          gap: 'clamp(28px, 4vw, 72px)',
          alignItems: 'center',
          padding: 'clamp(36px, 4.5vw, 64px) 0',
          borderBottom: idx < total - 1 ? '1px solid rgba(148,163,184,0.1)' : 'none',
        }}
      >
        {item.flip ? <>{imageBlock}{textBlock}</> : <>{textBlock}{imageBlock}</>}
      </motion.div>
    </div>
  );
};

/* ── Main Export ── */
export const AnalyticsShowcaseSection: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-60px 0px' });

  return (
    <section style={{
      width: '100%',
      background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F8FF 35%, #EEF9F5 65%, #FAFCFD 100%)',
      position: 'relative' as const,
      overflow: 'hidden',
      padding: 'clamp(48px, 6vw, 84px) clamp(20px, 3.5vw, 56px)',
      borderTop: '1px solid rgba(148,163,184,0.12)',
      borderBottom: '1px solid rgba(148,163,184,0.12)',
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute' as const, top: '-140px', left: '-100px',
        width: '560px', height: '560px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0,118,128,0.05) 0%, transparent 70%)',
        pointerEvents: 'none' as const, zIndex: 0,
      }} />
      <div style={{
        position: 'absolute' as const, bottom: '-100px', right: '-80px',
        width: '440px', height: '440px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(37,99,235,0.04) 0%, transparent 70%)',
        pointerEvents: 'none' as const, zIndex: 0,
      }} />
      {/* Dot grid */}
      <div style={{
        position: 'absolute' as const, inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(0,118,128,0.07) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 80%)',
        pointerEvents: 'none' as const, zIndex: 0,
      }} />

      <div style={{ maxWidth: '1520px', margin: '0 auto', position: 'relative' as const, zIndex: 1 }}>

        {/* ── Section Header ── */}
        <div ref={headerRef}>
          <motion.div
            initial="hidden"
            animate={headerInView ? 'visible' : 'hidden'}
            variants={containerReveal}
            style={{ textAlign: 'center' as const, marginBottom: 'clamp(36px, 5vw, 72px)' }}
          >
            <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '5px 16px', borderRadius: '999px',
                background: 'rgba(0,118,128,0.07)',
                border: '1px solid rgba(0,118,128,0.18)',
                fontSize: '0.69rem', fontWeight: 800, color: '#007680', letterSpacing: '0.09em',
                textTransform: 'uppercase' as const,
              }}>
                <Database size={12} />
                Analytics Intelligence Suite
              </span>
            </motion.div>

            <motion.h2 variants={fadeUp} style={{
              fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)',
              fontWeight: 900, color: '#0F172A',
              letterSpacing: '-0.04em', lineHeight: 1.13, margin: '0 0 14px',
            }}>
              Every Run Generates a{' '}
              <span style={{
                background: 'linear-gradient(135deg, #007680 0%, #86BC25 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Full Visual Intelligence Report
              </span>
            </motion.h2>

            <motion.p variants={fadeUp} style={{
              fontSize: '0.98rem', color: '#64748B', lineHeight: 1.68,
              maxWidth: '620px', margin: '0 auto 28px', fontWeight: 400,
            }}>
              JET auto-generates category-wise interactive charts — exception distributions, DQC scoring, integrity cross-checks, and TB/GL analytics — all rendered the moment your audit pipeline completes.
            </motion.p>

            {/* Stats row */}
            <motion.div variants={fadeUp} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '36px', flexWrap: 'wrap' as const,
            }}>
              {[
                { value: '4', label: 'Chart Categories', color: '#007680' },
                { value: '12+', label: 'Exception Visuals', color: '#7C3AED' },
                { value: '20', label: 'DQC Bar Charts', color: '#0284C7' },
                { value: '100%', label: 'Auto-Generated', color: '#D97706' },
              ].map((stat, si) => (
                <div key={si} style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: stat.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#94A3B8', marginTop: '4px', letterSpacing: '0.02em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* ── Alternating rows ── */}
        {ITEMS.map((item, idx) => (
          <ShowcaseRow key={item.id} item={item} idx={idx} total={ITEMS.length} />
        ))}

      </div>
    </section>
  );
};
