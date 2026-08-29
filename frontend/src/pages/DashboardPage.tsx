import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { RunService } from '../services/runService';
import { RunSummary, WorkflowType } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { motion } from 'framer-motion';
import {
  Sparkles, Layers, ArrowRight, Play, FileSpreadsheet, RefreshCw,
  CheckCircle2, Database, FileText, Activity, Search, Zap, FileCheck,
  Trash2, BarChart3, Shield, Cpu, TrendingUp, BookOpen, ExternalLink,
  ChevronRight, Check, ShieldCheck, Scale, CheckSquare, Rocket,
  UploadCloud, Table, Sliders, Plus
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

  const handleStartWorkflow = (workflow: WorkflowType = 'JET') => {
    navigate('/jet');
  };

  const handleResumeRun = (run: RunSummary) => {
    navigate(`/jet?runId=${run.runId}`);
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
                onClick={() => handleStartWorkflow('JET')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 30px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  letterSpacing: '0.015em',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px -4px rgba(0, 118, 128, 0.38), 0 2px 6px -1px rgba(0, 0, 0, 0.06)',
                }}
                whileHover={{ scale: 1.02, transform: 'translateY(-1px)', boxShadow: '0 12px 28px -4px rgba(0, 118, 128, 0.45)' }}
                whileTap={{ scale: 0.98 }}
              >
                <Rocket size={16} /> Launch JET Pipeline <ArrowRight size={15} />
              </motion.button>

              <motion.button
                onClick={() => {
                  const sectionEl = document.getElementById('pipeline-methodology');
                  if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '13px 24px',
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
                Explore 6-Phase Pipeline <ChevronRight size={15} />
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

      {/* ══════════════════════════════════════════════════════════
          3. THE 6-PHASE JET TESTING PIPELINE ARCHITECTURE
          ══════════════════════════════════════════════════════════ */}
      <motion.section
        id="pipeline-methodology"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        variants={sectionReveal}
        style={{
          width: '100%',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: 'clamp(44px, 5.5vw, 68px) clamp(20px, 3.2vw, 52px)',
        }}
      >
        <div style={{ maxWidth: '1520px', margin: '0 auto' }}>
          {/* Section Header Row */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '32px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em',
                  color: 'var(--deloitte-teal)', textTransform: 'uppercase',
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--deloitte-teal)' }} />
                  Deloitte Testing Methodology
                </span>
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.035em', margin: 0, marginBottom: '6px' }}>
                The 6-Phase Unified JET Pipeline
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, maxWidth: '560px' }}>
                End-to-end audit testing workflow. Drop any Excel workbook or CSV dataset—the engine automatically cleanses, verifies integrity, tests 12 parameter rules, and generates executive deliverables.
              </p>
            </div>

            <button
              onClick={() => handleStartWorkflow('JET')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 24px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 118, 128, 0.30)',
              }}
            >
              <Rocket size={15} /> Launch JET Workspace <ArrowRight size={14} />
            </button>
          </div>

          {/* 6-Phase Pipeline Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
          }}>
            {[
              {
                step: '01',
                title: 'Data Ingest & Auto-Detection',
                desc: 'Upload multi-sheet Excel workbooks or separate TB & GL CSVs with instant dataset classification.',
                icon: <UploadCloud size={20} />,
                accent: '#007680',
                badge: 'Multi-Format',
              },
              {
                step: '02',
                title: 'Automated Data Cleansing',
                desc: 'Standardizes date formats, numeric amounts, null handling, and trims whitespace automatically.',
                icon: <Sparkles size={20} />,
                accent: '#00A3AD',
                badge: 'Zero-Touch',
              },
              {
                step: '03',
                title: 'Pre-Integrity & Mapping',
                desc: 'Verifies Trial Balance control totals and maps source columns to canonical Deloitte schemas.',
                icon: <Table size={20} />,
                accent: '#2563EB',
                badge: 'Canonical Match',
              },
              {
                step: '04',
                title: 'Integrity Testing (IR 1–4)',
                desc: 'Control totals, account existence across datasets, document sequence gaps, and seldom accounts.',
                icon: <Activity size={20} />,
                accent: '#16A34A',
                badge: '4 Core Tests',
              },
              {
                step: '05',
                title: 'Parameter Rules (Ex 1–12)',
                desc: 'Executes 12 parameter exception tests including unusual accounts, round digits, keywords, and unrelated pairings.',
                icon: <Sliders size={20} />,
                accent: '#D97706',
                badge: '12 Exceptions',
              },
              {
                step: '06',
                title: 'Executive Reconciliation',
                desc: 'Audit KPI dashboards, interactive exception analytics, workpaper tie-outs, and one-click ZIP download.',
                icon: <BarChart3 size={20} />,
                accent: '#86BC25',
                badge: 'Audit-Ready',
              },
            ].map((phase, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                  padding: '22px 20px',
                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                }}
                onClick={() => handleStartWorkflow('JET')}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = phase.accent;
                  e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(15, 23, 42, 0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(15, 23, 42, 0.03)';
                }}
              >
                {/* Top color accent strip */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: phase.accent,
                }} />

                {/* Top Row: Icon + Step Number */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: `${phase.accent}14`,
                    color: phase.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {phase.icon}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: phase.accent, letterSpacing: '0.04em' }}>
                    {phase.step}
                  </span>
                </div>

                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, marginBottom: '6px', lineHeight: 1.3 }}>
                  {phase.title}
                </h3>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, marginBottom: '16px', flex: 1 }}>
                  {phase.desc}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: `${phase.accent}12`,
                    color: phase.accent,
                    letterSpacing: '0.02em',
                  }}>
                    {phase.badge}
                  </span>
                  <ArrowRight size={14} color="#94A3B8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════
          4. FULL-SCREEN EXECUTION HISTORY TABLE SECTION
          ══════════════════════════════════════════════════════════ */}
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
        <div style={{ maxWidth: '1520px', margin: '0 auto' }}>
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
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                    Execution History &amp; Audit Runs
                  </h3>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px',
                    background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                  }}>
                    {runs.length} runs • {completedRuns} completed
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                  Filter and inspect previous JET audit execution runs.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="jet-input"
                    placeholder="Search runs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '28px', paddingTop: '6px', paddingBottom: '6px', fontSize: '0.78rem', width: '180px' }}
                  />
                </div>

                <button
                  onClick={fetchRuns}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  <RefreshCw size={13} className={loading ? 'spin-slow' : ''} /> Refresh
                </button>

                <button
                  onClick={() => handleStartWorkflow('JET')}
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.78rem', gap: '5px' }}
                >
                  <Plus size={13} /> New Audit Run
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="jet-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Testing Engine</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Progress</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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
                            background: 'var(--deloitte-teal-light)',
                            color: 'var(--deloitte-teal)',
                            border: '1px solid rgba(0,118,128,0.22)',
                          }}>
                            <ShieldCheck size={11} /> JET Pipeline ({run.engine || 'PYTHON'})
                          </span>
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '44px', color: 'var(--text-muted)' }}>
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
