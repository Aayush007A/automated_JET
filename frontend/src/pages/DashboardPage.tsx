import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { RunService } from '../services/runService';
import { RunSummary } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Sparkles, Layers, ArrowRight, Play, FileSpreadsheet, RefreshCw,
  CheckCircle2, Database, FileText, Activity, Search, Zap, FileCheck,
  Trash2, BarChart3, Shield, Cpu, TrendingUp, BookOpen, ExternalLink
} from 'lucide-react';

import { ConfirmModal } from '../components/common/ConfirmModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
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
    } catch (err) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRuns(); }, []);

  const handleStartWorkflow = async (workflow: 'SPARK_JET' | 'OMNIA_JET') => {
    setCreating(workflow);
    try {
      const res = await RunService.createRun(workflow, 'PYTHON');
      navigate(workflow === 'SPARK_JET' ? `/spark-jet?runId=${res.runId}` : `/omnia-jet?runId=${res.runId}`);
    } catch (err: any) {
      console.error('Failed to create run:', err);
    } finally {
      setCreating(null);
    }
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
    <div style={{ maxWidth: '1340px', margin: '0 auto', padding: '28px 24px 60px' }}>

      {/* ── COMPACT HERO ─────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #006B73 0%, #004F57 50%, #003740 100%)',
        borderRadius: '18px',
        padding: '28px 36px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 16px 48px -8px rgba(0, 62, 68, 0.38)',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-50px', right: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(134,188,37,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '35%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,163,173,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Top pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 12px', borderRadius: '999px',
              background: 'rgba(134,188,37,0.18)', border: '1px solid rgba(134,188,37,0.38)',
              color: '#B8F158', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
            }}>
              <Sparkles size={12} /> ENTERPRISE AUDIT AUTOMATION
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 11px', borderRadius: '999px',
              background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.32)',
              color: '#6EE7B7', fontSize: '0.72rem', fontWeight: 600,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} className="pulse-dot" />
              System Operational
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 900, color: '#FFFFFF',
            letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: '8px',
          }}>
            Good afternoon, <span style={{ color: '#A8F0A8' }}>{user?.fullName?.split(' ')[0] || user?.username}</span>
          </h1>
          <p style={{ fontSize: 'clamp(0.82rem, 1.4vw, 0.92rem)', color: 'rgba(255,255,255,0.65)', maxWidth: '560px', lineHeight: '1.6' }}>
            Automate Journal Entry Testing with high-speed TB & GL ingestion, 4-tier field mapping, 20 Golden DQC rules, 12 parameter exceptions, and Deloitte-grade audit working papers.
          </p>
        </div>
      </div>

      {/* ── WORKFLOW SELECTION HEADER ────────────────────── */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <span style={{
            fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em',
            color: 'var(--deloitte-teal)', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--deloitte-teal)', display: 'inline-block' }} />
            Workflow Selection
          </span>
        </div>
        <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.65rem)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.035em', marginBottom: '4px' }}>
          Select JET Workflow
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Choose the testing pipeline aligned with your audit methodology and data format.
        </p>
      </div>

      {/* ── WORKFLOW CARDS ────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
        gap: '20px',
        marginBottom: '20px',
      }}>
        {/* SPARK JET */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1.5px solid rgba(134,188,37,0.3)',
          padding: 'clamp(22px, 3vw, 32px)',
          boxShadow: '0 4px 24px -4px rgba(134,188,37,0.08), 0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column', gap: '0',
          transition: 'box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease',
          position: 'relative', overflow: 'hidden',
        }}
        onMouseOver={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px -8px rgba(134,188,37,0.14), 0 4px 16px rgba(0,0,0,0.06)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(134,188,37,0.5)';
        }}
        onMouseOut={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px -4px rgba(134,188,37,0.08), 0 2px 8px rgba(0,0,0,0.04)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(134,188,37,0.3)';
        }}>
          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #86BC25, #A5D643)', borderRadius: '18px 18px 0 0' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', paddingTop: '4px' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #F2F9E8, #E3F5C3)',
              border: '1.5px solid rgba(134,188,37,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--deloitte-green-dark)',
              boxShadow: '0 4px 12px rgba(134,188,37,0.15)',
            }}>
              <Layers size={26} />
            </div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em',
              padding: '5px 12px', borderRadius: '999px',
              background: 'var(--deloitte-green-light)',
              color: 'var(--deloitte-green-dark)',
              border: '1px solid rgba(134,188,37,0.3)',
            }}>STANDARD AUDIT TESTING</span>
          </div>

          <h3 style={{ fontSize: 'clamp(1.2rem, 2vw, 1.45rem)', fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--text-primary)', marginBottom: '10px' }}>
            SPARK JET Workflow
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.65', marginBottom: '20px' }}>
            Automated Spark Scala & Python engine for Trial Balance & General Ledger Population extracts. Validates TB/GL balance integrity, runs 4 Integrity Tests (IR 1–4), extracts 12 Parameter Exceptions (Ex1 to Ex12), and dumps random control samples.
          </p>

          {/* 4-column feature row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '22px',
          }}>
            {[
              { icon: CheckCirce2Icon, label: 'TB Checkpoints', desc: '4-phase validation', I: CheckCircle2 },
              { label: 'GL Balancing Pivot', desc: 'Document-level pivot', I: BarChart3 },
              { label: 'IR 1–4 Integrity', desc: 'Cross-dataset testing', I: Shield },
              { label: 'Ex1–12 Rules', desc: '12 exception filters', I: Cpu },
            ].map((f, i) => {
              const IconComp = [CheckCircle2, BarChart3, Shield, Cpu][i];
              return (
                <div key={f.label} style={{
                  padding: '10px 10px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <IconComp size={15} color="var(--deloitte-green-dark)" style={{ marginBottom: '6px' }} />
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{f.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{f.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: '18px', borderTop: '1px solid var(--border-subtle)',
            flexWrap: 'wrap', gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <FileText size={14} />
              Input: <strong style={{ color: 'var(--text-secondary)' }}>TB.csv + Population.csv</strong>
            </div>
            <button
              onClick={() => handleStartWorkflow('SPARK_JET')}
              disabled={creating === 'SPARK_JET'}
              className="btn-green"
              style={{ padding: '10px 22px', fontSize: '0.9rem', fontWeight: 800 }}
            >
              {creating === 'SPARK_JET'
                ? <><RefreshCw size={14} className="spin-slow" /> Initializing...</>
                : <>Launch Spark JET <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>

        {/* OMNIA JET */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1.5px solid rgba(0,118,128,0.25)',
          padding: 'clamp(22px, 3vw, 32px)',
          boxShadow: '0 4px 24px -4px rgba(0,118,128,0.07), 0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column',
          transition: 'box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease',
          position: 'relative', overflow: 'hidden',
        }}
        onMouseOver={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px -8px rgba(0,118,128,0.13), 0 4px 16px rgba(0,0,0,0.06)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,118,128,0.45)';
        }}
        onMouseOut={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px -4px rgba(0,118,128,0.07), 0 2px 8px rgba(0,0,0,0.04)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,118,128,0.25)';
        }}>
          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #007680, #00A3AD)', borderRadius: '18px 18px 0 0' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', paddingTop: '4px' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--deloitte-teal-light), #C8EDF0)',
              border: '1.5px solid rgba(0,118,128,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--deloitte-teal)',
              boxShadow: '0 4px 12px rgba(0,118,128,0.12)',
            }}>
              <FileSpreadsheet size={26} />
            </div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em',
              padding: '5px 12px', borderRadius: '999px',
              background: 'var(--deloitte-teal-light)',
              color: 'var(--deloitte-teal-dark)',
              border: '1px solid rgba(0,118,128,0.22)',
            }}>DELOITTE OMNIA CDM</span>
          </div>

          <h3 style={{ fontSize: 'clamp(1.2rem, 2vw, 1.45rem)', fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--text-primary)', marginBottom: '10px' }}>
            OMNIA JET Workflow
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.65', marginBottom: '20px' }}>
            Ingests multi-sheet workbooks into Common Data Model (CDM), performs Account-level Reconciliation (≤1.0 variance tolerance), executes all 20 Data Quality Checks (DQC 01a–20), builds Control Totals, and generates the formatted Excel Template.
          </p>

          {/* 4-column feature row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '22px',
          }}>
            {[
              { label: 'Multi-Sheet XLSX', desc: 'TB, Pop, COA', I: FileCheck },
              { label: 'Currency Recon', desc: '≤1.0 tolerance', I: TrendingUp },
              { label: '20 Golden DQCs', desc: 'Full DQC matrix', I: Activity },
              { label: 'Excel Template', desc: 'Audit working paper', I: BookOpen },
            ].map((f) => {
              const IconComp = f.I;
              return (
                <div key={f.label} style={{
                  padding: '10px 10px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <IconComp size={15} color="var(--deloitte-teal)" style={{ marginBottom: '6px' }} />
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{f.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{f.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: '18px', borderTop: '1px solid var(--border-subtle)',
            flexWrap: 'wrap', gap: '10px', marginTop: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <FileText size={14} />
              Input: <strong style={{ color: 'var(--text-secondary)' }}>JET_Input.xlsx</strong> (TB, Pop, COA)
            </div>
            <button
              onClick={() => handleStartWorkflow('OMNIA_JET')}
              disabled={creating === 'OMNIA_JET'}
              className="btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.9rem', fontWeight: 800 }}
            >
              {creating === 'OMNIA_JET'
                ? <><RefreshCw size={14} className="spin-slow" /> Initializing...</>
                : <>Launch Omnia JET <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM CAPABILITY BAR (matches image 3) ─────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '32px',
      }}>
        {[
          { icon: Shield, label: 'Enterprise Grade', desc: 'Built for audit reliability', color: 'var(--deloitte-teal)' },
          { icon: Database, label: 'Secure & Compliant', desc: 'No data stored externally', color: '#0284C7' },
          { icon: Zap, label: 'High Performance', desc: 'Scalable for large datasets', color: '#D97706' },
          { icon: FileCheck, label: 'Audit Ready Outputs', desc: 'Pre-formatted & traceable', color: 'var(--deloitte-green-dark)' },
        ].map((c) => {
          const IconComp = c.icon;
          return (
            <div key={c.label} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <IconComp size={20} color={c.color} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.label}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{c.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── EXECUTION HISTORY ────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 4px 20px -4px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(135deg, #F8FAFC, #FFFFFF)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              Execution History & Audit Runs
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {runs.length} runs · {completedRuns} completed
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '9px', border: '1px solid var(--border-subtle)' }}>
              {(['ALL', 'SPARK_JET', 'OMNIA_JET'] as const).map(tab => (
                <button key={tab} onClick={() => setWorkflowFilter(tab)} style={{
                  padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700,
                  borderRadius: '7px', border: 'none', cursor: 'pointer',
                  background: workflowFilter === tab ? '#FFFFFF' : 'transparent',
                  color: workflowFilter === tab ? 'var(--deloitte-teal)' : 'var(--text-muted)',
                  boxShadow: workflowFilter === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.18s',
                  whiteSpace: 'nowrap',
                }}>
                  {tab === 'ALL' ? 'All' : tab.replace('_', ' ')}
                </button>
              ))}
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" className="jet-input" placeholder="Search..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '28px', paddingTop: '6px', paddingBottom: '6px', fontSize: '0.8rem', width: '180px' }} />
            </div>
            <button onClick={fetchRuns} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
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
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={18} className="spin-slow" style={{ margin: '0 auto 8px' }} />
                  <div>Loading runs...</div>
                </td></tr>
              ) : filteredRuns.length > 0 ? filteredRuns.map(run => (
                <tr key={run.runId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{
                        width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                        background: run.status === 'COMPLETED' ? '#0D9488' : run.status === 'FAILED' ? '#E11D48' : run.status === 'RUNNING' ? '#0284C7' : '#94A3B8',
                      }} />
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--deloitte-teal)' }}>{run.runId}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '0.75rem', fontWeight: 700, padding: '3px 9px', borderRadius: '999px',
                      background: run.workflow === 'SPARK_JET' ? 'var(--deloitte-green-light)' : 'var(--deloitte-teal-light)',
                      color: run.workflow === 'SPARK_JET' ? 'var(--deloitte-green-dark)' : 'var(--deloitte-teal-dark)',
                      border: `1px solid ${run.workflow === 'SPARK_JET' ? 'rgba(134,188,37,0.28)' : 'rgba(0,118,128,0.22)'}`,
                    }}>
                      {run.workflow === 'SPARK_JET' ? <Layers size={10} /> : <FileSpreadsheet size={10} />}
                      {run.workflow.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.79rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{run.engine || 'PYTHON'}</td>
                  <td><StatusBadge status={run.status} /></td>
                  <td style={{ fontSize: '0.79rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {run.startedAt ? (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{new Date(run.startedAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.72rem' }}>{new Date(run.startedAt).toLocaleTimeString()}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: '64px', height: '5px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${run.progress}%`, height: '100%', borderRadius: '3px',
                          background: run.status === 'COMPLETED'
                            ? 'linear-gradient(90deg, #0D9488, #34D399)'
                            : run.status === 'FAILED' ? '#E11D48'
                            : 'linear-gradient(90deg, #007680, #00A3AD)',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{run.progress}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => handleResumeRun(run)} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem', gap: '5px' }}>
                        {run.status === 'COMPLETED' ? <ExternalLink size={12} /> : <Play size={12} />}
                        {run.status === 'COMPLETED' ? 'View' : 'Resume'}
                      </button>
                      <button onClick={() => handleOpenDelete(run)} disabled={deletingId === run.runId} className="btn-secondary"
                        style={{ padding: '5px 9px', color: 'var(--status-error)' }} title="Delete run">
                        {deletingId === run.runId ? <RefreshCw size={12} className="spin-slow" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Activity size={28} color="var(--text-subtle)" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>No Audit Runs Found</div>
                    <p style={{ fontSize: '0.84rem', maxWidth: '340px', margin: '0 auto 18px' }}>
                      {searchQuery ? 'No runs match your search.' : 'Launch a workflow above to create your first audit run.'}
                    </p>
                    {!searchQuery && (
                      <button onClick={() => handleStartWorkflow('SPARK_JET')} className="btn-green" style={{ padding: '9px 20px' }}>
                        <Layers size={14} /> Launch Spark JET
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOM PREMIUM DELETE CONFIRMATION MODAL */}
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CheckCirce2Icon(_: any) { return null; }
