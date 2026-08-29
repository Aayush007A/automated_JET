import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../services/authService';
import {
  ShieldCheck, Lock, User, AlertCircle, ArrowRight,
  Eye, EyeOff, CheckCircle2, Layers, FileSpreadsheet,
  Activity, BarChart3, Zap, ChevronRight, Mail, AtSign, Briefcase
} from 'lucide-react';

/* ── Page transition variants ─────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
} as const;

const leftVariants = {
  hidden: { opacity: 0, x: -50 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
} as const;

/* ── Isometric 3D pipeline visual ────────────────────────────── */
const IsometricVisual: React.FC = () => {
  const steps = [
    { label: 'Upload TB & GL Files', color: '#86BC25', status: 'done', num: '01' },
    { label: '4-Phase Field Mapping', color: '#00A3AD', status: 'done', num: '02' },
    { label: 'Run 20 DQC Rules', color: '#007680', status: 'active', num: '03' },
    { label: 'Generate Audit Output', color: '#86BC25', status: 'pending', num: '04' },
  ];

  return (
    <motion.div
      className="iso-stage"
      initial={{ opacity: 0, rotateY: 15, scale: 0.88 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      transition={{ duration: 1.0, ease: 'easeOut', delay: 0.4 }}
    >
      <div className="iso-card-stack" style={{ position: 'relative' }}>
        {/* Satellite chips */}
        <div className="iso-satellite iso-satellite-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>All systems live</span>
          </div>
        </div>
        <div className="iso-satellite iso-satellite-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={11} color="#86BC25" />
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>20 DQC Rules</span>
          </div>
        </div>

        {/* Main card */}
        <div className="iso-card">
          <div className="iso-card-header">
            <div style={{ display: 'flex', gap: '4px' }}>
              <div className="iso-card-dot" style={{ background: '#E11D48' }} />
              <div className="iso-card-dot" style={{ background: '#F59E0B' }} />
              <div className="iso-card-dot" style={{ background: '#10B981' }} />
            </div>
            <div style={{ fontSize: '0.64rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              JET Execution Pipeline
            </div>
          </div>

          {steps.map((s, i) => (
            <motion.div
              key={s.label}
              className="iso-step-row"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.4, ease: 'easeOut' }}
            >
              <div className="iso-step-num" style={{
                background: s.status === 'pending'
                  ? 'rgba(255,255,255,0.06)'
                  : `${s.color}22`,
                color: s.status === 'pending' ? 'rgba(255,255,255,0.25)' : s.color,
              }}>
                {s.status === 'done' ? <CheckCircle2 size={13} /> : s.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.76rem',
                  fontWeight: s.status === 'active' ? 700 : 500,
                  color: s.status === 'pending'
                    ? 'rgba(255,255,255,0.25)'
                    : s.status === 'active'
                    ? '#FFFFFF'
                    : 'rgba(255,255,255,0.7)',
                }}>
                  {s.label}
                </div>
              </div>
              {s.status === 'active' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.58rem', fontWeight: 800, color: s.color,
                  background: `${s.color}18`, padding: '2px 7px', borderRadius: '5px',
                  border: `1px solid ${s.color}30`,
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <Zap size={8} />
                  </motion.div>
                  LIVE
                </div>
              )}
            </motion.div>
          ))}

          <div className="iso-mini-bars">
            {[
              { label: 'DQC Rules', value: '20', color: '#86BC25' },
              { label: 'Exceptions', value: '12', color: '#00A3AD' },
            ].map(s => (
              <div key={s.label} className="iso-mini-bar">
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em' }}>{s.value}</div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Left Panel (shared across login/register) ────────────────── */
const AuthLeftPanel: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => {
  const navigate = useNavigate();

  const stats = [
    { icon: Layers, label: 'SPARK JET', desc: 'TB/GL extraction & tests' },
    { icon: FileSpreadsheet, label: 'OMNIA JET', desc: 'CDM workbook recon' },
    { icon: Activity, label: '20 DQC Rules', desc: 'Automated validation' },
    { icon: BarChart3, label: 'Audit Analytics', desc: 'Real-time telemetry' },
  ];

  return (
    <motion.div
      className="auth-left"
      variants={leftVariants}
      initial="hidden"
      animate="show"
    >
      <div className="auth-left-bg" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />
      <div className="auth-grid" />
      <div className="auth-scanline" />
      <div className="auth-vignette" />

      <div className="auth-left-content">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => navigate('/login')}
        >
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0,118,128,0.7), rgba(0,90,98,0.7))',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            <ShieldCheck size={20} color="#86BC25" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#FFFFFF' }}>
              Deloitte<span style={{ color: '#86BC25' }}>.</span>
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              JET Platform
            </div>
          </div>
        </motion.div>

        {/* ISO Visual */}
        <div className="iso-scene">
          <IsometricVisual />
        </div>

        {/* Headline + description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
        >
          <h2 style={{
            fontSize: 'clamp(1.3rem, 2.2vw, 1.85rem)',
            fontWeight: 900, letterSpacing: '-0.045em',
            color: '#FFFFFF', lineHeight: 1.15, marginBottom: 'clamp(6px, 1vh, 10px)',
          }}>
            {mode === 'login' ? (
              <>Automated before<br /><span style={{ color: '#86BC25' }}>the engagement starts.</span></>
            ) : (
              <>Join the future of<br /><span style={{ color: '#86BC25' }}>audit automation.</span></>
            )}
          </h2>
          <p style={{
            fontSize: 'clamp(0.78rem, 1.1vw, 0.84rem)',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.5,
            maxWidth: '380px',
            marginBottom: 'clamp(10px, 1.6vh, 18px)',
          }}>
            High-speed TB &amp; GL ingestion, 20 Golden DQC rules, 12 parameter exceptions,
            and Deloitte-grade audit working papers — automated.
          </p>

          {/* Capability chips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {stats.map((s, i) => {
              const IconComp = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
                  whileHover={{ x: 3, transition: { duration: 0.15 } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 10px', borderRadius: '9px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    cursor: 'default',
                  }}
                >
                  <IconComp size={13} color="#86BC25" />
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>{s.label}</div>
                    <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>{s.desc}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Live status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 12px',
            background: 'rgba(134,188,37,0.08)',
            border: '1px solid rgba(134,188,37,0.18)',
            borderRadius: '9px',
            marginTop: 'clamp(10px, 1.5vh, 16px)',
          }}
        >
          <div className="status-dot-live" />
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            All systems operational — TLS 1.3 Secure Connection
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════════ */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin2026');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFocus, setUserFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await AuthService.login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <AuthLeftPanel mode="login" />

      {/* RIGHT PANEL */}
      <motion.div
        className="auth-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="auth-form-container"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Tab switcher */}
          <motion.div variants={itemVariants} className="auth-tab-group">
            <button className="auth-tab active">Sign In</button>
            <button
              className="auth-tab"
              onClick={() => navigate('/register')}
            >
              Create Account
            </button>
          </motion.div>

          {/* Header */}
          <motion.div variants={itemVariants} style={{ marginBottom: 'clamp(14px, 2.2vh, 24px)' }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '3px 10px', borderRadius: '999px',
                background: 'var(--deloitte-teal-light)',
                border: '1px solid rgba(0,118,128,0.2)',
                fontSize: '0.64rem', fontWeight: 800,
                color: 'var(--deloitte-teal)',
                letterSpacing: '0.07em', textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              <ShieldCheck size={11} />
              Practitioner Access
            </div>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 2.6vw, 1.95rem)',
              fontWeight: 900, letterSpacing: '-0.045em',
              color: 'var(--text-primary)', marginBottom: '4px',
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Sign in to your audit engagement workspace.
            </p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'var(--status-error-bg)',
                  border: '1px solid var(--status-error-border)',
                  color: 'var(--status-error)',
                  fontSize: '0.8rem', marginBottom: '14px',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <motion.div variants={itemVariants} className="jet-field">
              <label className="jet-field-label" style={{ color: userFocus ? 'var(--deloitte-teal)' : undefined }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  className="jet-input-icon"
                  color={userFocus ? 'var(--deloitte-teal)' : 'var(--text-subtle)'}
                />
                <input
                  type="text"
                  className="jet-input jet-input-has-icon"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setUserFocus(true)}
                  onBlur={() => setUserFocus(false)}
                  placeholder="Enter your username"
                  required
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={itemVariants} className="jet-field">
              <label className="jet-field-label" style={{ color: passFocus ? 'var(--deloitte-teal)' : undefined }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  className="jet-input-icon"
                  color={passFocus ? 'var(--deloitte-teal)' : 'var(--text-subtle)'}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="jet-input jet-input-has-icon"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocus(true)}
                  onBlur={() => setPassFocus(false)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--text-subtle)',
                    display: 'flex', padding: '2px', transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--deloitte-teal)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                className="btn-auth-cta btn-auth-cta-teal"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                style={{ padding: '12px' }}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      style={{
                        width: '15px', height: '15px', borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#FFFFFF',
                      }}
                    />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Workspace
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div variants={itemVariants} className="auth-divider">
            <div className="auth-divider-line" />
            <div className="auth-divider-text">Quick Access</div>
            <div className="auth-divider-line" />
          </motion.div>

          {/* Demo accounts */}
          <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Admin (Lead)', user: 'admin', pass: 'Admin2026' },
              { label: 'Practitioner', user: 'user', pass: 'User2026' },
            ].map(acc => (
              <motion.button
                key={acc.label}
                className="btn-secondary"
                onClick={() => { setUsername(acc.user); setPassword(acc.pass); }}
                style={{ fontSize: '0.78rem', fontWeight: 700, padding: '8px 10px', borderRadius: '10px' }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {acc.label}
              </motion.button>
            ))}
          </motion.div>

          {/* Register link */}
          <motion.div
            variants={itemVariants}
            style={{ textAlign: 'center', marginTop: 'clamp(12px, 1.8vh, 18px)' }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
            </span>
            <motion.button
              onClick={() => navigate('/register')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 700, color: 'var(--deloitte-teal)',
                padding: 0,
                display: 'inline-flex', alignItems: 'center', gap: '2px',
              }}
              whileHover={{ x: 2 }}
            >
              Create account <ChevronRight size={13} />
            </motion.button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            style={{ textAlign: 'center', marginTop: 'clamp(8px, 1.2vh, 14px)', fontSize: '0.66rem', color: 'var(--text-subtle)' }}
          >
            © 2026 Deloitte Touche Tohmatsu Limited. All rights reserved.
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   REGISTER PAGE (2-Column Grid Fit for 100vh)
   ══════════════════════════════════════════════════════════════ */
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'practitioner',
    password: '',
    confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  const handleChange = (field: string, val: string) => setFormData(p => ({ ...p, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await new Promise(res => setTimeout(res, 800));
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (pass: string) => {
    if (pass.length === 0) return { level: 0, label: '', color: '' };
    if (pass.length < 6) return { level: 1, label: 'Weak', color: '#E11D48' };
    if (pass.length < 10) return { level: 2, label: 'Fair', color: '#D97706' };
    if (pass.length >= 10 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) return { level: 4, label: 'Strong', color: '#0D9488' };
    return { level: 3, label: 'Good', color: '#0284C7' };
  };

  const strength = passwordStrength(formData.password);

  return (
    <div className="auth-root">
      <AuthLeftPanel mode="register" />

      {/* RIGHT PANEL */}
      <motion.div
        className="auth-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="auth-form-container"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Tab */}
          <motion.div variants={itemVariants} className="auth-tab-group">
            <button className="auth-tab" onClick={() => navigate('/login')}>Sign In</button>
            <button className="auth-tab active">Create Account</button>
          </motion.div>

          {/* Header */}
          <motion.div variants={itemVariants} style={{ marginBottom: 'clamp(10px, 1.8vh, 18px)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 10px', borderRadius: '999px',
              background: 'var(--deloitte-teal-light)',
              border: '1px solid rgba(0,118,128,0.2)',
              fontSize: '0.64rem', fontWeight: 800,
              color: 'var(--deloitte-teal)',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              <ShieldCheck size={11} />
              New Practitioner
            </div>
            <h2 style={{
              fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)',
              fontWeight: 900, letterSpacing: '-0.045em',
              color: 'var(--text-primary)', marginBottom: '4px',
            }}>
              Create your account
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Join the JET Platform audit automation workspace.
            </p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  padding: '9px 12px', borderRadius: '10px',
                  background: 'var(--status-error-bg)',
                  border: '1px solid var(--status-error-border)',
                  color: 'var(--status-error)',
                  fontSize: '0.8rem', marginBottom: '12px',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <motion.div variants={itemVariants} className="jet-field" style={{ marginBottom: 'clamp(6px, 1vh, 10px)' }}>
              <label className="jet-field-label" style={{ color: focus === 'fullName' ? 'var(--deloitte-teal)' : undefined, marginBottom: '4px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} className="jet-input-icon" color={focus === 'fullName' ? 'var(--deloitte-teal)' : 'var(--text-subtle)'} />
                <input
                  type="text"
                  className="jet-input jet-input-has-icon"
                  value={formData.fullName}
                  onChange={e => handleChange('fullName', e.target.value)}
                  onFocus={() => setFocus('fullName')}
                  onBlur={() => setFocus(null)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </motion.div>

            {/* Username & Email Grid (Clean 2-col or single col) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px', marginBottom: 'clamp(6px, 1vh, 10px)' }}>
              <div>
                <label className="jet-field-label" style={{ color: focus === 'username' ? 'var(--deloitte-teal)' : undefined, marginBottom: '4px' }}>
                  Username
                </label>
                <div style={{ position: 'relative' }}>
                  <AtSign size={15} className="jet-input-icon" color={focus === 'username' ? 'var(--deloitte-teal)' : 'var(--text-subtle)'} />
                  <input
                    type="text"
                    className="jet-input jet-input-has-icon"
                    value={formData.username}
                    onChange={e => handleChange('username', e.target.value)}
                    onFocus={() => setFocus('username')}
                    onBlur={() => setFocus(null)}
                    placeholder="username"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="jet-field-label" style={{ color: focus === 'email' ? 'var(--deloitte-teal)' : undefined, marginBottom: '4px' }}>
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} className="jet-input-icon" color={focus === 'email' ? 'var(--deloitte-teal)' : 'var(--text-subtle)'} />
                  <input
                    type="email"
                    className="jet-input jet-input-has-icon"
                    value={formData.email}
                    onChange={e => handleChange('email', e.target.value)}
                    onFocus={() => setFocus('email')}
                    onBlur={() => setFocus(null)}
                    placeholder="you@deloitte.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Role */}
            <motion.div variants={itemVariants} className="jet-field" style={{ marginBottom: 'clamp(6px, 1vh, 10px)' }}>
              <label className="jet-field-label" style={{ color: focus === 'role' ? 'var(--deloitte-teal)' : undefined, marginBottom: '4px' }}>
                Practitioner Role
              </label>
              <div className="jet-select-wrapper">
                <Briefcase size={15} className="jet-input-icon" color={focus === 'role' ? 'var(--deloitte-teal)' : 'var(--text-subtle)'} />
                <select
                  className="jet-select"
                  value={formData.role}
                  onChange={e => handleChange('role', e.target.value)}
                  onFocus={() => setFocus('role')}
                  onBlur={() => setFocus(null)}
                >
                  <option value="practitioner">Audit Practitioner</option>
                  <option value="admin">Audit Lead / Manager</option>
                  <option value="viewer">Engagement Reviewer</option>
                </select>
              </div>
            </motion.div>

            {/* Password & Confirm Password Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: 'clamp(6px, 1vh, 10px)' }}>
              <div>
                <label className="jet-field-label" style={{ color: focus === 'password' ? 'var(--deloitte-teal)' : undefined, marginBottom: '4px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} className="jet-input-icon" color={focus === 'password' ? 'var(--deloitte-teal)' : 'var(--text-subtle)'} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="jet-input jet-input-has-icon"
                    style={{ paddingRight: '32px' }}
                    value={formData.password}
                    onChange={e => handleChange('password', e.target.value)}
                    onFocus={() => setFocus('password')}
                    onBlur={() => setFocus(null)}
                    placeholder="Min. 8 chars"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', color: 'var(--text-subtle)',
                      display: 'flex', padding: '2px',
                    }}
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="jet-field-label" style={{ color: focus === 'confirm' ? 'var(--deloitte-teal)' : undefined, marginBottom: '4px' }}>
                  Confirm
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} className="jet-input-icon" color={focus === 'confirm' ? 'var(--deloitte-teal)' : 'var(--text-subtle)'} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="jet-input jet-input-has-icon"
                    style={{
                      paddingRight: '32px',
                      borderColor: formData.confirmPassword && formData.confirmPassword !== formData.password
                        ? 'var(--status-error)'
                        : formData.confirmPassword && formData.confirmPassword === formData.password
                        ? 'var(--status-success)'
                        : undefined,
                    }}
                    value={formData.confirmPassword}
                    onChange={e => handleChange('confirmPassword', e.target.value)}
                    onFocus={() => setFocus('confirm')}
                    onBlur={() => setFocus(null)}
                    placeholder="Repeat password"
                    required
                  />
                  {formData.confirmPassword && formData.confirmPassword === formData.password && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      }}
                    >
                      <CheckCircle2 size={15} color="var(--status-success)" />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Password strength mini-bar */}
            {formData.password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ marginBottom: 'clamp(6px, 1vh, 10px)' }}
              >
                <div style={{ display: 'flex', gap: '3px', marginBottom: '2px' }}>
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: '3px', borderRadius: '3px',
                        background: i <= strength.level ? strength.color : 'var(--border-subtle)',
                        transition: 'background 0.3s',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '0.66rem', color: strength.color, fontWeight: 700 }}>
                  {strength.label}
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <motion.div variants={itemVariants} style={{ marginTop: '2px' }}>
              <motion.button
                type="submit"
                className="btn-auth-cta btn-auth-cta-teal"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                style={{ padding: '12px' }}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      style={{
                        width: '15px', height: '15px', borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF',
                      }}
                    />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Workspace Account
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Sign in link */}
          <motion.div
            variants={itemVariants}
            style={{ textAlign: 'center', marginTop: 'clamp(10px, 1.6vh, 16px)' }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
            </span>
            <motion.button
              onClick={() => navigate('/login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 700, color: 'var(--deloitte-teal)', padding: 0,
                display: 'inline-flex', alignItems: 'center', gap: '2px',
              }}
              whileHover={{ x: 2 }}
            >
              Sign in <ChevronRight size={13} />
            </motion.button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            style={{ textAlign: 'center', marginTop: 'clamp(6px, 1vh, 12px)', fontSize: '0.66rem', color: 'var(--text-subtle)' }}
          >
            © 2026 Deloitte Touche Tohmatsu Limited. All rights reserved.
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};
