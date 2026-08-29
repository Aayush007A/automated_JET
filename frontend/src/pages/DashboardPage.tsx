import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { RunService } from '../services/runService';
import { RunSummary } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { motion } from 'framer-motion';
import {
  Sparkles, Layers, ArrowRight, Play, FileSpreadsheet, RefreshCw,
  CheckCircle2, Database, FileText, Activity, Search, Zap, FileCheck,
  Trash2, BarChart3, Shield, Cpu, TrendingUp, BookOpen, ExternalLink,
  ChevronRight, Check, ShieldCheck, Scale, CheckSquare, Rocket
} from 'lucide-react';
import { ConfirmModal } from '../components/common/ConfirmModal';

/* ── Smooth One-Way Scroll-Reveal ── */
const sectionReveal = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

const cardStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
} as const;

const cardItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean; run: RunSummary | null }>({
    isOpen: false,
    run: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState<'ALL' | 'SPARK_JET' | 'OMNIA_JET'>('ALL');

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await RunService.listRuns();
      setRuns(data);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleStartWorkflow = (workflow: 'SPARK_JET' | 'OMNIA_JET') => {
    navigate(workflow === 'SPARK_JET' ? '/spark-jet' : '/omnia-jet');
  };

  const handleResumeRun = (run: RunSummary) => {
    navigate(run.workflow === 'SPARK_JET' ? `/spark-jet?runId=${run.runId}` : `/omnia-jet?runId=${run.runId}`);
  };

  const handleOpenDelete = (run: RunSummary) => {
    setConfirmDeleteModal({ isOpen: true, run });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteModal.run) return;
    const runId = confirmDeleteModal.run.runId;
    setDeletingId(runId);
    try {
      await RunService.deleteRun(runId);
      setRuns(prev => prev.filter(r => r.runId !== runId));
      setConfirmDeleteModal({ isOpen: false, run: null });
    } catch (err: any) {
      console.error('Failed to delete run:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRuns = runs.filter(r => {
    const matchFilter = workflowFilter === 'ALL' || r.workflow === workflowFilter;
    const matchSearch = !searchQuery
      || r.runId.toLowerCase().includes(searchQuery.toLowerCase())
      || r.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const completedRuns = runs.filter(r => r.status === 'COMPLETED').length;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#FFFFFF', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════
          1. FULL-SCREEN EDITORIAL HERO SECTION (Seamless Spacing)
          ══════════════════════════════════════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={sectionReveal}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(36px, 4.5vw, 56px) 0 clamp(40px, 4.5vw, 56px)',
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: '1520px',
          margin: '0 auto',
          padding: '0 clamp(24px, 4vw, 56px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: 'clamp(24px, 4vw, 52px)',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Left Text & CTAs */}
          <div style={{ maxWidth: '600px' }}>
            {/* Headline with Strong Visual Hierarchy */}
            <h1 style={{
              fontSize: 'clamp(2.4rem, 3.8vw, 3.5rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              margin: 0,
              marginBottom: '16px',
            }}>
              Audited before<br />
              <span style={{ color: '#007680' }}>it's an exception</span>
            </h1>

            {/* Light, Airy, Premium Subtitle */}
            <p style={{
              fontSize: 'clamp(0.92rem, 1.15vw, 1.02rem)',
              fontWeight: 400,
              color: '#64748B',
              lineHeight: 1.65,
              letterSpacing: '-0.01em',
              maxWidth: '520px',
              margin: 0,
              marginBottom: '28px',
            }}>
              Automated journal entry testing visual automation for the Deloitte Automated JET Platform.
              Accelerating Trial Balance &amp; General Ledger reconciliation, 20 Golden DQC rules, and audit-ready workpapers.
            </p>

            {/* Action Buttons with Depth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <motion.button
                onClick={() => handleStartWorkflow('SPARK_JET')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 26px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  letterSpacing: '0.015em',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px -4px rgba(0, 118, 128, 0.38), 0 2px 6px -1px rgba(0, 0, 0, 0.06)',
                }}
                whileHover={{ scale: 1.02, transform: 'translateY(-1px)', boxShadow: '0 12px 28px -4px rgba(0, 118, 128, 0.45)' }}
                whileTap={{ scale: 0.98 }}
              >
                <Rocket size={16} /> Launch Spark JET <ArrowRight size={15} />
              </motion.button>

              <motion.button
                onClick={() => handleStartWorkflow('OMNIA_JET')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '12px 24px',
                  borderRadius: '999px',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  border: '1.5px solid #E2E8F0',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
                whileHover={{ background: '#F8FAFC', borderColor: '#CBD5E1', transform: 'translateY(-1px)' }}
                whileTap={{ scale: 0.98 }}
              >
                Launch Omnia CDM <ChevronRight size={15} />
              </motion.button>
            </div>

            {/* Refined Feature Checkmark Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'rgba(0, 118, 128, 0.09)', color: '#007680',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check size={11} strokeWidth={3} />
                </span>
                20 Golden DQCs
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'rgba(0, 118, 128, 0.09)', color: '#007680',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check size={11} strokeWidth={3} />
                </span>
                TB &amp; GL Balancing
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'rgba(0, 118, 128, 0.09)', color: '#007680',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check size={11} strokeWidth={3} />
                </span>
                12 Parameter Exceptions
              </span>
            </div>
          </div>

          {/* Right Column: Seamlessly Blended 3D Visual */}
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              width: '100%',
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.08 }}
          >
            <img
              src="/Hero_Image.png"
              alt="Deloitte Audit Engagement Team"
              style={{
                width: '100%',
                maxWidth: '780px',
                maxHeight: '480px',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                position: 'relative',
                zIndex: 1,
              }}
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════
          2. FOUR FEATURE PILLARS — Exact Reference-Matched Design
          ══════════════════════════════════════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05, margin: "0px 0px -40px 0px" }}
        variants={sectionReveal}
        style={{
          width: '100%',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F5FAF8 40%, #EDF7F5 100%)',
          borderBottom: '1px solid #E2E8F0',
          padding: 'clamp(48px, 5.5vw, 68px) clamp(24px, 4vw, 56px) clamp(56px, 6.5vw, 76px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Background Decorative Elements ── */}

        {/* Subtle dot matrix grid pattern on the right side */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '420px',
          height: '100%',
          backgroundImage: 'radial-gradient(circle, rgba(0, 163, 173, 0.20) 1.2px, transparent 1.2px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 75% 50%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 75% 50%, black 20%, transparent 80%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Smooth connecting wave line flowing behind the cards */}
        <svg
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            height: '240px',
            pointerEvents: 'none',
            zIndex: 0,
            transform: 'translateY(-50%)',
          }}
          viewBox="0 0 1600 240"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M -50 180 C 250 50, 600 210, 950 80 C 1200 -10, 1420 160, 1650 70"
            stroke="url(#connectingRibbonGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
          <defs>
            <linearGradient id="connectingRibbonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#007680" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#10B981" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#00A3AD" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        {/* Decorative botanical watercolor leaf — bottom-left */}
        <motion.img
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 0.9, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          src="/decor/leaf_left_clean.png"
          alt="Botanical Leaf Decoration"
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            width: '120px',
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 1,
            filter: 'drop-shadow(0 4px 12px rgba(0, 118, 128, 0.08))',
          }}
        />

        {/* Decorative 3D Potted Plant — 100% visible at bottom-right */}
        <motion.img
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          src="/decor/potted_plant_clean.png"
          alt="Potted Plant Decoration"
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '18px',
            right: '24px',
            width: '95px',
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 1,
            filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.10))',
          }}
        />

        <div style={{ maxWidth: '1520px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Section Header Row — Balanced 2-Column Alignment */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
            marginBottom: '38px',
          }}>
            <div style={{ maxWidth: '620px' }}>
              {/* Pill badge */}
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
                  <ShieldCheck size={14} />
                  Powerful audit capabilities built for accuracy and assurance
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
                Built for audit excellence.<br />
                <span style={{ color: '#007680' }}>Engineered for confidence.</span>
              </h2>
            </div>

            {/* Right Subtitle Description — Cleanly Positioned alongside the header */}
            <p style={{
              fontSize: 'clamp(0.88rem, 1.05vw, 0.95rem)',
              color: '#64748B',
              lineHeight: 1.65,
              maxWidth: '380px',
              fontWeight: 400,
              margin: 0,
              paddingBottom: '4px',
            }}>
              Comprehensive automated testing suite covering trial balance validation, account reconciliation, and exception management.
            </p>
          </div>

          {/* 4 Feature Cards Grid */}
          <motion.div
            variants={cardStagger}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '20px',
            }}
          >
            {[
              {
                number: '01',
                title: 'TB Checkpoints',
                description: 'Check out to reassessing TB checkpoints and account variances on audit testing.',
                accentColor: '#007680',
                chipBg: 'rgba(0, 163, 173, 0.12)',
                chipColor: '#007680',
                flatIcon: <CheckSquare size={20} strokeWidth={2.2} />,
                img3d: '/pillars/pillar_clean_1.png',
              },
              {
                number: '02',
                title: 'GL Balancing',
                description: 'Balanced journal entry testing with debit/credit integrity thresholds and situational pivots.',
                accentColor: '#2563EB',
                chipBg: '#EFF6FF',
                chipColor: '#2563EB',
                flatIcon: <Scale size={20} strokeWidth={2.2} />,
                img3d: '/pillars/pillar_clean_2.png',
              },
              {
                number: '03',
                title: 'IR Tests',
                description: 'Automated cross-dataset integrity testing for account existence and total reconciliation.',
                accentColor: '#16A34A',
                chipBg: '#F0FDF4',
                chipColor: '#16A34A',
                flatIcon: <ShieldCheck size={20} strokeWidth={2.2} />,
                img3d: '/pillars/pillar_clean_3.png',
              },
              {
                number: '04',
                title: 'Ex1–12 Exceptions',
                description: '12 Parameter Exceptions plus 20 Golden DQC checks generate audit-ready workpapers.',
                accentColor: '#D97706',
                chipBg: '#FFFBEB',
                chipColor: '#D97706',
                flatIcon: <BarChart3 size={20} strokeWidth={2.2} />,
                img3d: '/pillars/pillar_clean_4.png',
              },
            ].map((pillar, i) => (
              <motion.div
                key={pillar.title}
                variants={cardItem}
                style={{
                  borderRadius: '20px',
                  background: '#FFFFFF',
                  border: '1px solid #EAEFF4',
                  boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  cursor: 'pointer',
                }}
                whileHover={{
                  y: -5,
                  borderColor: '#CBD5E1',
                  boxShadow: '0 18px 40px -8px rgba(15, 23, 42, 0.09), 0 4px 12px rgba(0, 0, 0, 0.03)',
                }}
              >
                {/* Top-Left Colored Corner Stroke Accent matching reference */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '56px',
                  height: '56px',
                  borderTop: `3px solid ${pillar.accentColor}`,
                  borderLeft: `3px solid ${pillar.accentColor}`,
                  borderTopLeftRadius: '20px',
                  pointerEvents: 'none',
                }} />

                {/* Card inner content */}
                <div style={{ padding: '26px 24px 22px 24px', display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', zIndex: 1 }}>

                  {/* Top Row: Left Flat Icon Chip + Right 3D Visual Asset */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    minHeight: '84px',
                  }}>
                    {/* Left Icon Chip */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: pillar.chipBg,
                      color: pillar.chipColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '4px',
                    }}>
                      {pillar.flatIcon}
                    </div>

                    {/* Right 3D Illustration — Seamless Isolated Alpha Asset */}
                    <img
                      src={pillar.img3d}
                      alt={pillar.title}
                      style={{
                        width: '84px',
                        height: '84px',
                        objectFit: 'contain',
                        display: 'block',
                        filter: 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.06))',
                        transition: 'transform 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '1.14rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.025em',
                    margin: 0,
                    marginBottom: '6px',
                    lineHeight: 1.25,
                  }}>
                    {pillar.title}
                  </h3>

                  {/* Title Color Underline Bar */}
                  <div style={{
                    width: '28px',
                    height: '3px',
                    borderRadius: '2px',
                    background: pillar.accentColor,
                    marginBottom: '14px',
                  }} />

                  {/* Description */}
                  <p style={{
                    fontSize: '0.84rem',
                    color: '#64748B',
                    lineHeight: 1.6,
                    margin: 0,
                    marginBottom: '24px',
                    flex: 1,
                    fontWeight: 400,
                  }}>
                    {pillar.description}
                  </p>

                  {/* Bottom Row: Number + Arrow */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                  }}>
                    <span style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: pillar.accentColor,
                      letterSpacing: '0.02em',
                    }}>
                      {pillar.number}
                    </span>

                    <span style={{
                      color: '#94A3B8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: 'all 0.25s ease',
                    }}>
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          3. FULL-SCREEN WORKFLOW SELECTION SECTION
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={sectionReveal}
        style={{
          width: '100%',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: 'clamp(36px, 4.5vw, 54px) clamp(20px, 3.2vw, 52px)',
        }}
      >
        <div style={{ maxWidth: '1560px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em',
                color: 'var(--deloitte-teal)', textTransform: 'uppercase',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--deloitte-teal)' }} />
                Testing Methodology
              </span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.3rem, 2.2vw, 1.75rem)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.035em', marginBottom: '4px' }}>
              Select JET Workflow
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Choose the testing pipeline aligned with your engagement methodology and data format.
            </p>
          </div>

          {/* Workflow Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
            gap: '20px',
          }}>
            {/* SPARK JET */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: '1.5px solid rgba(134,188,37,0.3)',
                padding: 'clamp(22px, 2.5vw, 28px)',
                boxShadow: '0 4px 20px -4px rgba(134,188,37,0.08), 0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.3s ease',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 36px -8px rgba(134,188,37,0.14), 0 4px 14px rgba(0,0,0,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(134,188,37,0.5)';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px -4px rgba(134,188,37,0.08), 0 2px 8px rgba(0,0,0,0.03)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(134,188,37,0.3)';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #86BC25, #A5D643)' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F2F9E8, #E3F5C3)',
                  border: '1.5px solid rgba(134,188,37,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--deloitte-green-dark)',
                  boxShadow: '0 3px 10px rgba(134,188,37,0.14)',
                }}>
                  <Layers size={24} />
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em',
                  padding: '4px 11px', borderRadius: '999px',
                  background: 'var(--deloitte-green-light)',
                  color: 'var(--deloitte-green-dark)',
                  border: '1px solid rgba(134,188,37,0.3)',
                }}>STANDARD AUDIT TESTING</span>
              </div>

              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.025em' }}>
                SPARK JET Workflow
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '18px', flex: 1 }}>
                Trial Balance &amp; General Ledger testing pipeline. Executes 4-phase field mapping, integrity tests IR 1–4, and extracts 12 parameter exceptions.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '22px' }}>
                {[
                  { icon: <Database size={13} />, label: 'TB.csv & GL.csv' },
                  { icon: <Zap size={13} />, label: '4-Phase Mapping' },
                  { icon: <Cpu size={13} />, label: 'IR 1–4 Integrity' },
                  { icon: <BarChart3 size={13} />, label: '12 Exceptions' },
                ].map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', borderRadius: '8px',
                    background: '#F8FAFC', border: '1px solid #E2E8F0',
                    fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                    <span style={{ color: 'var(--deloitte-green-dark)' }}>{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Typical run time: <strong>&lt; 30s</strong></span>
                <button
                  onClick={() => handleStartWorkflow('SPARK_JET')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '9px 20px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #86BC25 0%, #689913 100%)',
                    color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 800,
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(134,188,37,0.28)',
                  }}
                >
                  Start Spark JET <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* OMNIA CDM */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: '1.5px solid rgba(0,118,128,0.25)',
                padding: 'clamp(22px, 2.5vw, 28px)',
                boxShadow: '0 4px 20px -4px rgba(0,118,128,0.08), 0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.3s ease',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 36px -8px rgba(0,118,128,0.14), 0 4px 14px rgba(0,0,0,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,118,128,0.45)';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px -4px rgba(0,118,128,0.08), 0 2px 8px rgba(0,0,0,0.03)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,118,128,0.25)';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #007680, #00A3AD)' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #E6F4F5, #CEECF0)',
                  border: '1.5px solid rgba(0,118,128,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--deloitte-teal)',
                  boxShadow: '0 3px 10px rgba(0,118,128,0.12)',
                }}>
                  <FileSpreadsheet size={24} />
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em',
                  padding: '4px 11px', borderRadius: '999px',
                  background: 'var(--deloitte-teal-light)',
                  color: 'var(--deloitte-teal)',
                  border: '1px solid rgba(0,118,128,0.25)',
                }}>DELOITTE OMNIA CDM</span>
              </div>

              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.025em' }}>
                OMNIA JET Workflow
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '18px', flex: 1 }}>
                Multi-Sheet Excel workbook reconciliation. Ingests JET_Input.xlsx, performs Account Reconciliation, executes 20 Golden DQCs, and generates audit workpapers.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '22px' }}>
                {[
                  { icon: <FileText size={13} />, label: 'JET_Input.xlsx' },
                  { icon: <TrendingUp size={13} />, label: 'Account Recon' },
                  { icon: <Shield size={13} />, label: '20 Golden DQCs' },
                  { icon: <FileCheck size={13} />, label: 'Audit Workpapers' },
                ].map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', borderRadius: '8px',
                    background: '#F8FAFC', border: '1px solid #E2E8F0',
                    fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                    <span style={{ color: 'var(--deloitte-teal)' }}>{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Typical run time: <strong>&lt; 45s</strong></span>
                <button
                  onClick={() => handleStartWorkflow('OMNIA_JET')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '9px 20px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #007680 0%, #005A62 100%)',
                    color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 800,
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,118,128,0.25)',
                  }}
                >
                  Start Omnia JET <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          4. FULL-SCREEN EXECUTION HISTORY TABLE SECTION
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={sectionReveal}
        style={{
          width: '100%',
          background: '#FFFFFF',
          padding: 'clamp(36px, 4.5vw, 54px) clamp(20px, 3.2vw, 52px) 72px',
        }}
      >
        <div style={{ maxWidth: '1560px', margin: '0 auto' }}>
          {/* Table Container Card */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
          }}>
            {/* Header / Filter Toolbar */}
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Execution History &amp; Audit Runs
                  </h3>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px',
                    background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                  }}>
                    {runs.length} runs Â· {completedRuns} completed
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Filter and inspect previous Trial Balance &amp; General Ledger testing runs.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '3px' }}>
                  {(['ALL', 'SPARK_JET', 'OMNIA_JET'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setWorkflowFilter(tab)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        background: workflowFilter === tab ? '#FFFFFF' : 'transparent',
                        color: workflowFilter === tab ? 'var(--deloitte-teal)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        boxShadow: workflowFilter === tab ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      {tab === 'ALL' ? 'All' : tab.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="jet-input"
                    placeholder="Search runs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '28px', paddingTop: '6px', paddingBottom: '6px', fontSize: '0.78rem', width: '170px' }}
                  />
                </div>

                <button
                  onClick={fetchRuns}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  <RefreshCw size={13} className={loading ? 'spin-slow' : ''} /> Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="jet-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Workflow</th>
                    <th>Engine</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Progress</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <RefreshCw size={18} className="spin-slow" style={{ margin: '0 auto 8px' }} />
                        <div>Loading runs...</div>
                      </td>
                    </tr>
                  ) : filteredRuns.length > 0 ? (
                    filteredRuns.map(run => (
                      <tr key={run.runId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{
                              width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                              background: run.status === 'COMPLETED' ? '#0D9488' : run.status === 'FAILED' ? '#E11D48' : run.status === 'RUNNING' ? '#0284C7' : '#94A3B8',
                            }} />
                            <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--deloitte-teal)' }}>
                              {run.runId}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            fontSize: '0.74rem', fontWeight: 700, padding: '3px 9px', borderRadius: '999px',
                            background: run.workflow === 'SPARK_JET' ? 'var(--deloitte-green-light)' : 'var(--deloitte-teal-light)',
                            color: run.workflow === 'SPARK_JET' ? 'var(--deloitte-green-dark)' : 'var(--deloitte-teal-dark)',
                            border: `1px solid ${run.workflow === 'SPARK_JET' ? 'rgba(134,188,37,0.28)' : 'rgba(0,118,128,0.22)'}`,
                          }}>
                            {run.workflow === 'SPARK_JET' ? <Layers size={10} /> : <FileSpreadsheet size={10} />}
                            {run.workflow.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {run.engine || 'PYTHON'}
                        </td>
                        <td>
                          <StatusBadge status={run.status} />
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {run.startedAt || run.completedAt || run.createdAt ? (
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {new Date(run.startedAt || run.completedAt || run.createdAt!).toLocaleDateString()}
                              </div>
                              <div style={{ fontSize: '0.7rem' }}>
                                {new Date(run.startedAt || run.completedAt || run.createdAt!).toLocaleTimeString()}
                              </div>
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{ width: '60px', height: '5px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${run.progress}%`, height: '100%', borderRadius: '3px',
                                background: run.status === 'COMPLETED'
                                  ? 'linear-gradient(90deg, #0D9488, #34D399)'
                                  : run.status === 'FAILED' ? '#E11D48'
                                  : 'linear-gradient(90deg, #007680, #00A3AD)',
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                            <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              {run.progress}%
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleResumeRun(run)}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.76rem', gap: '4px' }}
                            >
                              {run.status === 'COMPLETED' ? <ExternalLink size={11} /> : <Play size={11} />}
                              {run.status === 'COMPLETED' ? 'View' : 'Resume'}
                            </button>
                            <button
                              onClick={() => handleOpenDelete(run)}
                              disabled={deletingId === run.runId}
                              className="btn-secondary"
                              style={{ padding: '4px 8px', color: 'var(--status-error)' }}
                              title="Delete run"
                            >
                              {deletingId === run.runId ? <RefreshCw size={11} className="spin-slow" /> : <Trash2 size={11} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '44px', color: 'var(--text-muted)' }}>
                        <Activity size={26} color="var(--text-subtle)" style={{ margin: '0 auto 10px' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          No Audit Runs Found
                        </div>
                        <p style={{ fontSize: '0.82rem', maxWidth: '340px', margin: '0 auto 16px' }}>
                          {searchQuery ? 'No runs match your search.' : 'Launch a workflow above to create your first audit run.'}
                        </p>
                        {!searchQuery && (
                          <button onClick={() => handleStartWorkflow('SPARK_JET')} className="btn-green" style={{ padding: '8px 18px', fontSize: '0.84rem' }}>
                            <Layers size={13} /> Launch Spark JET
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        onClose={() => setConfirmDeleteModal({ isOpen: false, run: null })}
        onConfirm={handleConfirmDelete}
        title={confirmDeleteModal.run ? `Delete Run ${confirmDeleteModal.run.runId}` : 'Delete Run'}
        message="Are you sure you want to permanently delete this audit execution? All standardized outputs, integrity test results, and execution logs will be permanently deleted. This action cannot be undone."
        confirmText="Delete Run"
        cancelText="Cancel"
        variant="danger"
        isLoading={Boolean(deletingId)}
        itemDetails={confirmDeleteModal.run ? [
          { label: 'Run ID', value: confirmDeleteModal.run.runId },
          { label: 'Workflow', value: confirmDeleteModal.run.workflow === 'SPARK_JET' ? 'Spark JET Automation' : 'Omnia JET Reconciliation' },
          { label: 'Status', value: confirmDeleteModal.run.status },
        ] : []}
      />
    </div>
  );
};
