import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, CheckCircle2, Layers, FileSpreadsheet, Activity } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userFocus, setUserFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await AuthService.login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  const capabilities = [
    { icon: Layers, label: 'SPARK JET', desc: 'TB/GL extraction & testing' },
    { icon: FileSpreadsheet, label: 'OMNIA JET', desc: 'CDM workbook reconciliation' },
    { icon: CheckCircle2, label: '20 DQC Rules', desc: 'Automated quality checks' },
    { icon: Activity, label: 'Real-time Logs', desc: 'Live execution tracking' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'linear-gradient(145deg, #F0F4F8, #E8EFF5)',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background ambient blobs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,118,128,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-5%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(134,188,37,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main card */}
      <div style={{
        width: '100%', maxWidth: '1060px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: '0 32px 80px -12px rgba(15,23,42,0.14), 0 4px 16px rgba(15,23,42,0.08)',
        border: '1px solid rgba(226,232,240,0.8)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(16px)',
        transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* ── LEFT: Dark Cinematic Panel ── */}
        <div
          className="login-left-premium"
          style={{
            padding: '48px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#FFFFFF',
            minHeight: '560px',
          }}
        >
          {/* Floating particles */}
          <div className="login-particle" />
          <div className="login-particle" />
          <div className="login-particle" />
          <div className="login-particle" />
          <div className="login-particle" />
          <div className="login-particle" />

          {/* Animated grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(0,163,173,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,173,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            animation: 'gridPan 14s linear infinite',
            pointerEvents: 'none',
            opacity: 0.5,
          }} />

          {/* Top: Brand */}
          <div style={{ position: 'relative', zIndex: 2, animation: 'slideUpFade 0.6s cubic-bezier(0.16,1,0.3,1) both 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}>
                <ShieldCheck size={22} color="#86BC25" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.04em' }}>
                  Deloitte<span style={{ color: '#86BC25' }}>.</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  JET Platform
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Headline */}
          <div style={{ position: 'relative', zIndex: 2, animation: 'slideUpFade 0.65s cubic-bezier(0.16,1,0.3,1) both 0.3s' }}>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              lineHeight: 1.1,
              color: '#FFFFFF',
              marginBottom: '14px',
            }}>
              AI-Powered<br />
              <span style={{ color: '#86BC25' }}>Audit Workspace</span>
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: '340px', marginBottom: '32px' }}>
              Unlock high-integrity insights, validation logs, and automated journal entry testing parameters.
            </p>

            {/* Capability chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {capabilities.map((c, i) => {
                const IconComp = c.icon;
                return (
                  <div key={c.label} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    animation: `slideUpFade 0.5s cubic-bezier(0.16,1,0.3,1) both`,
                    animationDelay: `${0.4 + i * 0.08}s`,
                    transition: 'background 0.25s, border-color 0.25s',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(134,188,37,0.12)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(134,188,37,0.25)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    <IconComp size={15} color="#86BC25" />
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>{c.label}</div>
                      <div style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>{c.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom: Footer */}
          <div style={{
            position: 'relative', zIndex: 2,
            animation: 'fadeIn 0.7s ease both 0.7s',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(134,188,37,0.1)',
              border: '1px solid rgba(134,188,37,0.2)',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#34D399',
                animation: 'pulse-ring 1.5s ease-out infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                All systems operational — Secure connection established
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Login Form ── */}
        <div
          className="login-form-panel"
          style={{
            padding: 'clamp(36px, 5vw, 56px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            {/* Form header */}
            <div style={{ marginBottom: '32px', animation: 'slideUpFade 0.55s cubic-bezier(0.16,1,0.3,1) both 0.1s' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 12px', borderRadius: '999px',
                background: 'var(--deloitte-teal-light)',
                border: '1px solid rgba(0,118,128,0.2)',
                fontSize: '0.68rem', fontWeight: 800,
                color: 'var(--deloitte-teal)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                marginBottom: '14px',
              }}>
                <ShieldCheck size={11} />
                Practitioner Access
              </div>
              <h2 style={{
                fontSize: 'clamp(1.5rem, 3vw, 1.9rem)',
                fontWeight: 900, letterSpacing: '-0.045em',
                color: 'var(--text-primary)', marginBottom: '8px',
              }}>
                Sign In
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Enter your audit engagement credentials to access testing workflows.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 16px', borderRadius: '12px',
                backgroundColor: 'var(--status-error-bg)',
                border: '1px solid var(--status-error-border)',
                color: 'var(--status-error)',
                fontSize: '0.86rem', marginBottom: '20px',
                animation: 'scaleIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ animation: 'slideUpFade 0.6s cubic-bezier(0.16,1,0.3,1) both 0.2s' }}>
              {/* Username */}
              <div style={{ marginBottom: '18px' }}>
                <label className="jet-label">Username</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    color={userFocus ? 'var(--deloitte-teal)' : 'var(--text-muted)'}
                    style={{
                      position: 'absolute', left: '14px', top: '50%',
                      transform: 'translateY(-50%)',
                      transition: 'color 0.2s',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    className="jet-input"
                    style={{ paddingLeft: '40px' }}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onFocus={() => setUserFocus(true)}
                    onBlur={() => setUserFocus(false)}
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '28px' }}>
                <label className="jet-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    color={passFocus ? 'var(--deloitte-teal)' : 'var(--text-muted)'}
                    style={{
                      position: 'absolute', left: '14px', top: '50%',
                      transform: 'translateY(-50%)',
                      transition: 'color 0.2s',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="password"
                    className="jet-input"
                    style={{ paddingLeft: '40px' }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPassFocus(true)}
                    onBlur={() => setPassFocus(false)}
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '0.94rem',
                  justifyContent: 'center',
                  background: loading
                    ? 'linear-gradient(135deg, #007680, #005A62)'
                    : 'linear-gradient(135deg, #007680 0%, #005A62 100%)',
                  letterSpacing: '-0.01em',
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                      animation: 'spinSlow 0.7s linear infinite',
                    }} />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Workspace
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo */}
            <div style={{
              marginTop: '28px', paddingTop: '24px',
              borderTop: '1px solid var(--border-subtle)',
              animation: 'fadeIn 0.7s ease both 0.45s',
            }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 800,
                color: 'var(--text-muted)', marginBottom: '12px',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                Quick Demo Accounts
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin', 'Admin2026')}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '9px 10px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  Admin (Lead)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('user', 'User2026')}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '9px 10px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  Practitioner
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              textAlign: 'center', marginTop: '28px',
              fontSize: '0.72rem', color: 'var(--text-subtle)',
              animation: 'fadeIn 0.8s ease both 0.55s',
            }}>
              © 2026 Deloitte Touche Tohmatsu Limited. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
