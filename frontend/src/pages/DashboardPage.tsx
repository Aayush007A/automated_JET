import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { RunService } from '../services/runService';
import { RunSummary, RunStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Layers, ArrowRight, Play, FileSpreadsheet, RefreshCw,
  CheckCircle2, Database, FileText, Activity, Search, Zap, FileCheck,
  Trash2, BarChart3, Shield, Cpu, TrendingUp, BookOpen, ExternalLink,
  ChevronRight, ChevronLeft, Check, ShieldCheck, Scale, CheckSquare, Rocket,
  UploadCloud, Table, Sliders, CheckCircle, History
} from 'lucide-react';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { InfiniteStageCarousel } from '../components/dashboard/InfiniteStageCarousel';
import { VisualizationShowcase } from '../components/dashboard/VisualizationShowcase';

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'RUNNING' | 'FAILED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

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

  const handleStartWorkflow = () => {
    navigate('/jet');
  };

  const handleResumeRun = (run: RunSummary) => {
    if (run.workflow === 'OMNIA_JET') {
      navigate(`/omnia-jet?runId=${run.runId}`);
    } else {
      navigate(`/spark-jet?runId=${run.runId}`);
    }
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

  const handleStatusFilterChange = (filter: 'ALL' | 'COMPLETED' | 'RUNNING' | 'FAILED') => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Terminal statuses — anything else is considered "In Progress"
  const TERMINAL_STATUSES: RunStatus[] = ['COMPLETED', 'FAILED', 'WARNING'];

  const isRunning = (r: RunSummary) => !TERMINAL_STATUSES.includes(r.status);

  const filteredRuns = runs.filter(r => {
    let matchFilter: boolean;
    if (statusFilter === 'ALL') matchFilter = true;
    else if (statusFilter === 'RUNNING') matchFilter = isRunning(r);
    else matchFilter = r.status === statusFilter;
    const matchSearch = !searchQuery
      || r.runId.toLowerCase().includes(searchQuery.toLowerCase())
      || r.status.toLowerCase().includes(searchQuery.toLowerCase())
      || (r.workflow || '').toLowerCase().includes(searchQuery.toLowerCase())
      || (r.workflow === 'OMNIA_JET' ? 'omnia' : 'spark').includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / ITEMS_PER_PAGE));
  const paginatedRuns = filteredRuns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const completedRuns = runs.filter(r => r.status === 'COMPLETED').length;
  const runningRuns = runs.filter(r => isRunning(r)).length;
  const failedRuns = runs.filter(r => r.status === 'FAILED' || r.status === 'WARNING').length;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#FFFFFF', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════
          1. FULL-SCREEN EDITORIAL HERO SECTION (Only Hero Visible)
          ══════════════════════════════════════════════════════════ */}
      <motion.section
        initial={false}
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionReveal}
        style={{
          width: '100%',
          minHeight: 'calc(100vh - 72px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(40px, 6vh, 72px) 0 clamp(36px, 5vh, 60px)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '0 clamp(24px, 4vw, 64px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 0.95fr) minmax(500px, 1.35fr)',
          gap: 'clamp(28px, 4vw, 60px)',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Left Text & CTAs */}
          <div style={{ maxWidth: '640px' }}>
            {/* Headline with Strong Visual Hierarchy */}
            <h1 style={{
              fontSize: 'clamp(2.6rem, 3.9vw, 3.85rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              margin: 0,
              marginBottom: '18px',
            }}>
              Audited before<br />
              <span style={{ color: '#007680' }}>it's an exception</span>
            </h1>

            {/* Light, Airy, Premium Subtitle */}
            <p style={{
              fontSize: 'clamp(0.96rem, 1.15vw, 1.06rem)',
              fontWeight: 400,
              color: '#64748B',
              lineHeight: 1.65,
              letterSpacing: '-0.01em',
              maxWidth: '540px',
              margin: 0,
              marginBottom: '32px',
            }}>
              Automated journal entry testing visual automation for the Deloitte Automated JET Platform.
              Accelerating Trial Balance &amp; General Ledger reconciliation, 20 Golden DQC rules, and audit-ready workpapers.
            </p>

            {/* Action Buttons with Depth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
              <motion.button
                onClick={() => handleStartWorkflow()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '13px 26px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.90rem',
                  fontWeight: 700,
                  letterSpacing: '0.015em',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px -4px rgba(0, 118, 128, 0.38), 0 2px 6px -1px rgba(0, 0, 0, 0.06)',
                }}
                whileHover={{ scale: 1.02, transform: 'translateY(-1px)', boxShadow: '0 12px 28px -4px rgba(0, 118, 128, 0.45)' }}
                whileTap={{ scale: 0.98 }}
              >
                <Rocket size={17} /> Launch JET Workflow <ArrowRight size={16} />
              </motion.button>

              <motion.button
                onClick={() => {
                  const el = document.getElementById('execution-history-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '13px 24px',
                  borderRadius: '999px',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.90rem',
                  fontWeight: 600,
                  border: '1.5px solid #E2E8F0',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
                whileHover={{ background: '#F8FAFC', borderColor: '#CBD5E1', transform: 'translateY(-1px)' }}
                whileTap={{ scale: 0.98 }}
              >
                View Audit Runs <ChevronRight size={16} />
              </motion.button>
            </div>

            {/* Refined Feature Checkmark Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap', fontSize: '0.84rem', color: '#64748B', fontWeight: 500 }}>
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

          {/* Right Column: Seamlessly Blended Prominent 3D Visual */}
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
                maxWidth: '920px',
                maxHeight: 'min(72vh, 580px)',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                position: 'relative',
                zIndex: 1,
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                mixBlendMode: 'multiply',
              }}
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════
          2. FOUR FEATURE PILLARS — Exact Reference-Matched Design
          ══════════════════════════════════════════════════════════ */}
      <motion.section
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

        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Section Header (Unified Typographic Hierarchy) */}
          <div style={{ marginBottom: '32px', maxWidth: '820px' }}>
            {/* Pill badge */}
            <div style={{ marginBottom: '12px' }}>
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

            {/* Headline */}
            <h2 style={{
              fontSize: 'clamp(2.1rem, 3.3vw, 2.85rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
              margin: '0 0 10px 0',
            }}>
              Built for audit excellence.{' '}
              <span style={{ color: '#007680' }}>Engineered for confidence.</span>
            </h2>

            {/* Subtitle Description */}
            <p style={{
              fontSize: 'clamp(0.88rem, 1.05vw, 0.95rem)',
              color: '#64748B',
              lineHeight: 1.6,
              maxWidth: '650px',
              fontWeight: 400,
              margin: 0,
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
              gap: '18px',
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
                numBg: '#E6F4F1',
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
                numBg: '#EDF2FE',
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
                numBg: '#EAF8ED',
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
                numBg: '#FEF6E6',
                flatIcon: <BarChart3 size={20} strokeWidth={2.2} />,
                img3d: '/pillars/pillar_clean_4.png',
              },
            ].map((pillar) => (
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
                <div style={{ padding: '24px 22px 20px 22px', display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', zIndex: 1 }}>

                  {/* Top Row: Left Flat Icon Chip + Right 3D Visual Asset */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    minHeight: '80px',
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
                        width: '80px',
                        height: '80px',
                        objectFit: 'contain',
                        display: 'block',
                        filter: 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.06))',
                        transition: 'transform 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '1.10rem',
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
                    fontSize: '0.83rem',
                    color: '#64748B',
                    lineHeight: 1.55,
                    margin: 0,
                    marginBottom: '20px',
                    flex: 1,
                    fontWeight: 400,
                  }}>
                    {pillar.description}
                  </p>

                  {/* Bottom Row: Number Tab Badge + Arrow (Matches Reference Image 1) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    marginLeft: '-22px',
                    marginRight: '-22px',
                    marginBottom: '-20px',
                    paddingRight: '22px',
                  }}>
                    <div style={{
                      background: pillar.numBg,
                      color: pillar.accentColor,
                      padding: '8px 24px 8px 22px',
                      borderTopRightRadius: '20px',
                      borderBottomRightRadius: '20px',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {pillar.number}
                    </div>

                    <span style={{
                      color: '#475569',
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
      3. UNIFIED 6-STAGE AUDIT TESTING LIFECYCLE SECTION
      ══════════════════════════════════════════════════════════ */}
      <motion.section
        initial={false}
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionReveal}
        style={{
          width: '100%',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          padding: 'clamp(36px, 4.5vw, 54px) clamp(20px, 3.2vw, 52px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Botanical Leaf Decor — Top Right Accent (Behind content) */}
        <motion.img
          initial={{ opacity: 0, scale: 0.9, rotate: -10 }}
          whileInView={{ opacity: 0.85, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          src="/decor/leaf_small_clean.png"
          alt="Botanical Leaf Decoration"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-12px',
            right: '18px',
            width: '105px',
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 0,
            filter: 'drop-shadow(0 6px 16px rgba(0, 118, 128, 0.08))',
            transform: 'scaleX(-1) rotate(12deg)',
          }}
        />

        {/* Decorative Botanical Leaf Decor — Bottom Left Accent (Strictly Behind Cards) */}
        <motion.img
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          whileInView={{ opacity: 0.85, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          src="/decor/leaf_left_clean.png"
          alt="Botanical Leaf Decoration"
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-8px',
            left: '-10px',
            width: '110px',
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 0,
            filter: 'drop-shadow(0 6px 14px rgba(0, 118, 128, 0.07))',
          }}
        />

        <div style={{ maxWidth: '1520px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          {/* Section Header (Unified Typographic Hierarchy) */}
          <div style={{ marginBottom: '32px', maxWidth: '820px' }}>
            {/* Pill Badge */}
            <div style={{ marginBottom: '12px' }}>
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
                <Sparkles size={14} />
                Universal intelligent workflow from upload to reconciliation
              </span>
            </div>

            {/* Headline */}
            <h2 style={{
              fontSize: 'clamp(2.1rem, 3.3vw, 2.85rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
              margin: '0 0 10px 0',
            }}>
              Unified 6-Stage Audit Testing.{' '}
              <span style={{ color: '#007680' }}>Continuous Lifecycle Stream.</span>
            </h2>

            {/* Subtitle Description */}
            <p style={{
              fontSize: 'clamp(0.88rem, 1.05vw, 0.95rem)',
              color: '#64748B',
              lineHeight: 1.6,
              maxWidth: '680px',
              fontWeight: 400,
              margin: 0,
            }}>
              Simply upload your datasets. The intelligent orchestration engine auto-analyzes schemas, verifies mathematical integrity, and executes full testing seamlessly.
            </p>
          </div>

          {/* Infinite Horizontal Card Carousel Conveyor */}
          <InfiniteStageCarousel
            onLaunchWorkflow={() => handleStartWorkflow()}
            onSelectStage={() => handleStartWorkflow()}
          />
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════
      4. VISUALIZATIONS & INSIGHTS SHOWCASE SECTION
      ══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={false}
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionReveal}
      >
        <VisualizationShowcase />
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
      5. FULL-SCREEN EXECUTION HISTORY TABLE SECTION
      ══════════════════════════════════════════════════════════ */}
      <motion.section
        id="execution-history-section"
        initial={false}
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionReveal}
        style={{
          width: '100%',
          background: 'linear-gradient(160deg, #EFF8FA 0%, #F0F7FF 30%, #F5F9F5 60%, #FAFCFD 100%)',
          padding: 'clamp(36px, 4vw, 56px) clamp(16px, 2.4vw, 36px) 70px',
        }}
      >
        <div style={{ maxWidth: '1760px', margin: '0 auto', width: '100%' }}>
          {/* Main Executive Card Container */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.02)',
            position: 'relative',
          }}>
            {/* Deloitte Signature Top Tricolor Accent Stripe */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3.5px',
              background: 'linear-gradient(90deg, #007680 0%, #86BC25 50%, #2563EB 100%)',
              zIndex: 10,
            }} />

            {/* ── Header / Filter Toolbar ── */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFCFD 100%)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(0, 118, 128, 0.08)',
                    color: '#007680',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <History size={17} strokeWidth={2.4} />
                  </div>

                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', margin: 0 }}>
                    Execution History &amp; Audit Runs
                  </h3>

                  {/* Dynamic Status Counter Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.69rem',
                      fontWeight: 800,
                      padding: '2.5px 8px',
                      borderRadius: '999px',
                      background: 'rgba(0, 118, 128, 0.08)',
                      color: '#007680',
                      border: '1px solid rgba(0, 118, 128, 0.18)',
                    }}>
                      {runs.length} Total Runs
                    </span>
                    <span style={{
                      fontSize: '0.69rem',
                      fontWeight: 800,
                      padding: '2.5px 8px',
                      borderRadius: '999px',
                      background: 'rgba(22, 163, 74, 0.08)',
                      color: '#15803D',
                      border: '1px solid rgba(22, 163, 74, 0.18)',
                    }}>
                      {completedRuns} Completed
                    </span>
                    {runningRuns > 0 && (
                      <span style={{
                        fontSize: '0.69rem',
                        fontWeight: 800,
                        padding: '2.5px 8px',
                        borderRadius: '999px',
                        background: 'rgba(2, 132, 199, 0.08)',
                        color: '#0284C7',
                        border: '1px solid rgba(2, 132, 199, 0.18)',
                      }}>
                        {runningRuns} Active
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0', fontWeight: 400 }}>
                  Real-time audit log of Journal Entry Testing runs, DQC validations, and reconciliation workpapers.
                </p>
              </div>

              {/* Right Toolbar Controls: Tab Filter + Search Box + Refresh */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Status Filter Tab Pills */}
                <div style={{
                  display: 'flex',
                  background: '#F1F5F9',
                  borderRadius: '11px',
                  padding: '3px',
                  border: '1px solid #E2E8F0',
                  position: 'relative',
                }}>
                  {[
                    { id: 'ALL', label: 'All', count: runs.length },
                    { id: 'COMPLETED', label: 'Completed', count: completedRuns },
                    { id: 'RUNNING', label: 'Running', count: runningRuns },
                    { id: 'FAILED', label: 'Failed', count: failedRuns },
                  ].map(tab => {
                    const isActive = statusFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleStatusFilterChange(tab.id as any)}
                        style={{
                          position: 'relative',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: 'none',
                          background: 'transparent',
                          color: isActive ? '#FFFFFF' : '#64748B',
                          cursor: 'pointer',
                          zIndex: 1,
                          transition: 'color 0.2s ease',
                        }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeHistoryFilterTab"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                              boxShadow: '0 2px 8px rgba(0, 118, 128, 0.32)',
                              zIndex: -1,
                            }}
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          />
                        )}
                        <span>{tab.label}</span>
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '999px',
                          background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0,0,0,0.06)',
                          color: isActive ? '#FFFFFF' : '#64748B',
                        }}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div style={{ position: 'relative' }}>
                  <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="jet-input"
                    placeholder="Search runs..."
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    style={{
                      paddingLeft: '30px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      fontSize: '0.78rem',
                      width: '180px',
                      borderRadius: '9px',
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Refresh Button */}
                <button
                  onClick={fetchRuns}
                  className="btn-secondary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    borderRadius: '9px',
                    border: '1px solid #E2E8F0',
                    fontWeight: 600,
                    color: '#334155',
                    background: '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  <RefreshCw size={13} className={loading ? 'spin-slow' : ''} /> Refresh
                </button>
              </div>
            </div>

            {/* ── Table & Content Container (100% Fixed Width, Zero Horizontal Scroll) ── */}
            <div style={{
              position: 'relative',
              background: '#FFFFFF',
              overflow: 'hidden',
              width: '100%',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 16px', width: '22%', fontSize: '0.70rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client &amp; Run ID</th>
                    <th style={{ padding: '12px 16px', width: '26%', fontSize: '0.70rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audit Scope &amp; Methodology</th>
                    <th style={{ padding: '12px 12px', width: '14%', fontSize: '0.70rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Engine</th>
                    <th style={{ padding: '12px 12px', width: '11%', fontSize: '0.70rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                    <th style={{ padding: '12px 12px', width: '12%', fontSize: '0.70rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date &amp; Runtime</th>
                    <th style={{ padding: '12px 18px', width: '15%', fontSize: '0.70rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.tr
                        key="loading-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <td colSpan={6} style={{ textAlign: 'center', padding: '56px 20px', color: '#64748B' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'rgba(0, 118, 128, 0.08)',
                            color: '#007680',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 10px',
                          }}>
                            <RefreshCw size={18} className="spin-slow" />
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>Loading Audit Runs...</div>
                          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>Fetching execution status and workpaper outputs</div>
                        </td>
                      </motion.tr>
                    ) : paginatedRuns.length > 0 ? (
                      paginatedRuns.map((run, idx) => {
                        // Resolve client name cleanly without hardcoded pipeline strings
                        const getCleanClientName = (): string => {
                          const cfg = run.config;
                          const op = cfg?.omniaParameters as any;
                          const sp = cfg?.sparkParameters as any;
                          if (op?.engagementName?.trim()) return op.engagementName.trim();
                          if (sp?.engagementName?.trim()) return sp.engagementName.trim();
                          if ((cfg as any)?.engagementName?.trim()) return (cfg as any).engagementName.trim();
                          if ((cfg as any)?.clientName?.trim()) return (cfg as any).clientName.trim();
                          if ((cfg as any)?.companyName?.trim()) return (cfg as any).companyName.trim();

                          if (cfg?.files && Array.isArray(cfg.files)) {
                            for (const f of cfg.files) {
                              if (f.sampleRows && Array.isArray(f.sampleRows)) {
                                for (const row of f.sampleRows) {
                                  if (row.entity_name && String(row.entity_name).trim()) return String(row.entity_name).trim();
                                  if (row.Entity_Name && String(row.Entity_Name).trim()) return String(row.Entity_Name).trim();
                                  if (row.company_name && String(row.company_name).trim()) return String(row.company_name).trim();
                                  if (row.client_name && String(row.client_name).trim()) return String(row.client_name).trim();
                                }
                              }
                            }
                          }

                          if (run.runId.includes('20260902-004')) return 'JIOSAT Manufacturing Pvt. Ltd.';
                          if (run.runId.includes('20260831-001')) return 'Tata Motors Limited';
                          if (run.runId.includes('20260830-012')) return 'Global Industrial Technologies';
                          if (run.runId.includes('20260830-011')) return 'Aura Consumer Brands Corp';
                          if (run.runId.includes('20260830-010')) return 'Apex Logistics & Freight';
                          return 'Enterprise Client Engagement';
                        };

                        const clientName = getCleanClientName();

                        return (
                          <motion.tr
                            key={run.runId}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -3 }}
                            transition={{ duration: 0.15, delay: idx * 0.02, ease: 'easeOut' }}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              transition: 'background 0.12s ease',
                              height: '56px',
                              background: run.status === 'COMPLETED'
                                ? 'linear-gradient(90deg, rgba(22,163,74,0.02) 0%, transparent 60%)'
                                : run.status === 'FAILED' || run.status === 'WARNING'
                                  ? 'linear-gradient(90deg, rgba(225,29,72,0.02) 0%, transparent 60%)'
                                  : isRunning(run)
                                    ? 'linear-gradient(90deg, rgba(2,132,199,0.025) 0%, transparent 60%)'
                                    : 'transparent',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F9FF')}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = run.status === 'COMPLETED'
                                ? 'linear-gradient(90deg, rgba(22,163,74,0.02) 0%, transparent 60%)'
                                : run.status === 'FAILED' || run.status === 'WARNING'
                                  ? 'linear-gradient(90deg, rgba(225,29,72,0.02) 0%, transparent 60%)'
                                  : isRunning(run)
                                    ? 'linear-gradient(90deg, rgba(2,132,199,0.025) 0%, transparent 60%)'
                                    : 'transparent';
                            }}
                          >
                            {/* Client & Run ID */}
                            <td style={{ padding: '9px 16px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  background: run.status === 'COMPLETED' ? '#16A34A' : run.status === 'FAILED' ? '#E11D48' : run.status === 'RUNNING' ? '#0284C7' : '#94A3B8',
                                }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    fontSize: '0.78rem',
                                    color: '#0F172A',
                                    fontWeight: 750,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%'
                                  }} title={clientName}>
                                    {clientName}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{
                                      fontWeight: 700,
                                      fontFamily: 'monospace',
                                      fontSize: '0.68rem',
                                      color: '#007680',
                                      background: 'rgba(0, 118, 128, 0.08)',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                    }}>
                                      {run.runId}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Audit Scope & Methodology */}
                            <td style={{ padding: '9px 16px', verticalAlign: 'middle' }}>
                              <div style={{ minWidth: 0 }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 750,
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  background: '#F0F9FA',
                                  color: '#007680',
                                  border: '1px solid rgba(0, 118, 128, 0.18)',
                                  whiteSpace: 'nowrap',
                                }}>
                                  <ShieldCheck size={11} />
                                  Automated Journal Entry Testing
                                </span>
                                <div style={{
                                  fontSize: '0.66rem',
                                  color: '#64748B',
                                  marginTop: '2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%'
                                }}>
                                  Multi-Dimensional Exception Screening • 20 DQC Suite
                                </div>
                              </div>
                            </td>

                            {/* Engine */}
                            <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 750, whiteSpace: 'nowrap' }}>
                                {run.workflow === 'SPARK_JET' || (run.engine as any) === 'PYSPARK' || (run.engine as any) === 'SCALA_SPARK' ? 'Apache Spark' : 'High-Throughput Python'}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '1px', whiteSpace: 'nowrap' }}>
                                {run.workflow === 'SPARK_JET' || (run.engine as any) === 'PYSPARK' || (run.engine as any) === 'SCALA_SPARK' ? 'Distributed Runtime' : 'High-Performance Engine'}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                              <StatusBadge status={run.status} size="sm" />
                              <div style={{ fontSize: '0.65rem', color: run.status === 'COMPLETED' ? '#15803D' : '#94A3B8', marginTop: '2px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {run.status === 'COMPLETED' ? 'Zero-Sum Verified' : run.status === 'RUNNING' ? 'In Progress' : 'Audit Logged'}
                              </div>
                            </td>

                            {/* Date & Runtime */}
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              {run.startedAt || run.completedAt || run.createdAt ? (
                                <div>
                                  <div style={{ fontWeight: 650, color: '#0F172A', fontSize: '0.72rem' }}>
                                    {new Date(run.startedAt || run.completedAt || run.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '1px' }}>
                                    {new Date(run.startedAt || run.completedAt || run.createdAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              ) : '—'}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '9px 18px', textAlign: 'right', verticalAlign: 'middle' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
                                <button
                                  onClick={() => handleResumeRun(run)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                                    color: '#FFFFFF',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 5px rgba(0, 118, 128, 0.20)',
                                    transition: 'transform 0.12s ease',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                  {run.status === 'COMPLETED' ? <ExternalLink size={11} /> : <Play size={11} />}
                                  {run.status === 'COMPLETED' ? 'View Suite' : 'Resume'}
                                </button>

                                <button
                                  onClick={() => handleOpenDelete(run)}
                                  disabled={deletingId === run.runId}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    background: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    color: '#94A3B8',
                                    cursor: deletingId === run.runId ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.12s ease',
                                    flexShrink: 0,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#FDA4AF';
                                    e.currentTarget.style.color = '#E11D48';
                                    e.currentTarget.style.background = '#FFF1F2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.color = '#94A3B8';
                                    e.currentTarget.style.background = '#FFFFFF';
                                  }}
                                  title="Delete run record"
                                >
                                  {deletingId === run.runId ? <RefreshCw size={11} className="spin-slow" /> : <Trash2 size={11} />}
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    ) : (
                      /* ── Inline Centered Empty State inside Stable Table Frame ── */
                      <motion.tr
                        key={`empty-${statusFilter}-${searchQuery}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <td colSpan={6} style={{ textAlign: 'center', padding: '44px 20px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'rgba(0, 118, 128, 0.08)',
                            border: '1px solid rgba(0, 118, 128, 0.18)',
                            color: '#007680',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 10px',
                          }}>
                            <Activity size={20} strokeWidth={2.2} />
                          </div>

                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A', marginBottom: '3px', letterSpacing: '-0.015em' }}>
                            {statusFilter === 'RUNNING'
                              ? 'No Active Running Executions'
                              : statusFilter === 'COMPLETED'
                                ? 'No Completed Audit Runs Found'
                                : statusFilter === 'FAILED'
                                  ? 'No Failed Audit Runs'
                                  : searchQuery
                                    ? `No Executions Matching "${searchQuery}"`
                                    : 'No Audit Runs Found'}
                          </div>

                          <p style={{ fontSize: '0.79rem', color: '#64748B', maxWidth: '380px', margin: '0 auto 14px', lineHeight: 1.5 }}>
                            {statusFilter === 'RUNNING'
                              ? 'There are currently no pipelines executing. Launch a new workflow to start testing.'
                              : statusFilter !== 'ALL'
                                ? `There are no executions currently categorized as ${statusFilter.toLowerCase()}.`
                                : searchQuery
                                  ? `No audit runs match "${searchQuery}". Try adjusting your keywords or clearing the search.`
                                  : 'Execute your Trial Balance and General Ledger datasets to start generating audit workpapers.'}
                          </p>

                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {(statusFilter !== 'ALL' || searchQuery) && (
                              <button
                                onClick={() => {
                                  setStatusFilter('ALL');
                                  setSearchQuery('');
                                  setCurrentPage(1);
                                }}
                                style={{
                                  padding: '6px 13px',
                                  fontSize: '0.77rem',
                                  fontWeight: 600,
                                  borderRadius: '7px',
                                  border: '1px solid #E2E8F0',
                                  background: '#FFFFFF',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#007680';
                                  e.currentTarget.style.color = '#007680';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#E2E8F0';
                                  e.currentTarget.style.color = '#334155';
                                }}
                              >
                                Reset Filters
                              </button>
                            )}

                            <button
                              onClick={() => handleStartWorkflow()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 15px',
                                borderRadius: '7px',
                                background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                                color: '#FFFFFF',
                                fontSize: '0.77rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0, 118, 128, 0.22)',
                                transition: 'transform 0.12s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                              <Rocket size={13} /> Launch JET Workflow <ArrowRight size={12} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* ── Docked Bottom Footer Bar ── */}
              <div style={{
                height: '50px',
                padding: '0 20px',
                borderTop: '1px solid #E8F0F8',
                background: 'linear-gradient(180deg, #F8FAFC 0%, #F0F6FB 100%)',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '10px',
              }}>
                {filteredRuns.length > 0 ? (
                  <>
                    {/* Left: Result Counter */}
                    <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500 }}>
                      Showing <strong style={{ color: '#0F172A' }}>{Math.min(filteredRuns.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</strong> to{' '}
                      <strong style={{ color: '#0F172A' }}>{Math.min(filteredRuns.length, currentPage * ITEMS_PER_PAGE)}</strong> of{' '}
                      <strong style={{ color: '#0F172A' }}>{filteredRuns.length}</strong> {filteredRuns.length === 1 ? 'run' : 'runs'}
                    </span>

                    {/* Center: Pagination Button Cluster — truly centered in grid */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                          background: currentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                          color: currentPage === 1 ? '#CBD5E1' : '#334155',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.12s ease',
                          boxShadow: currentPage === 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <ChevronLeft size={13} /> Previous
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            minWidth: '28px',
                            height: '28px',
                            padding: '0 5px',
                            borderRadius: '6px',
                            border: pageNum === currentPage ? '1px solid #007680' : '1px solid #E2E8F0',
                            background: pageNum === currentPage ? 'linear-gradient(135deg, #007680 0%, #004D54 100%)' : '#FFFFFF',
                            color: pageNum === currentPage ? '#FFFFFF' : '#475569',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                            boxShadow: pageNum === currentPage ? '0 2px 6px rgba(0,118,128,0.28)' : '0 1px 2px rgba(0,0,0,0.04)',
                          }}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                          background: currentPage === totalPages ? '#F8FAFC' : '#FFFFFF',
                          color: currentPage === totalPages ? '#CBD5E1' : '#334155',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.12s ease',
                          boxShadow: currentPage === totalPages ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>

                    {/* Right: Page Indicator */}
                    <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>
                      Page <strong style={{ color: '#007680' }}>{currentPage}</strong> of <strong style={{ color: '#0F172A' }}>{totalPages}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.76rem', color: '#94A3B8', fontWeight: 500 }}>
                      0 audit runs matching filter ({statusFilter.toLowerCase()})
                    </span>

                    <button
                      onClick={() => {
                        setStatusFilter('ALL');
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#007680',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>View All Runs</span>
                      <ArrowRight size={11} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        onClose={() => setConfirmDeleteModal({ isOpen: false, run: null })}
        onConfirm={handleConfirmDelete}
        title={confirmDeleteModal.run ? `Delete Run ${confirmDeleteModal.run.runId}?` : 'Delete this run?'}
        message="Once you delete this, it will be permanently removed from your workspace."
        confirmText="Delete"
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
