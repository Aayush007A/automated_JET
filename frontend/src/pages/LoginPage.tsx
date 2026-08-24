import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await AuthService.login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(0, 118, 128, 0.06) 0%, #F1F5F9 70%)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Split Layout Container */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          background: '#FFFFFF',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.08)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        
        {/* Left Section: Illustration & Branding */}
        <div
          className="login-left-section"
          style={{
            background: 'linear-gradient(135deg, #004D54 0%, #002227 100%)',
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            color: '#FFFFFF',
            borderTopLeftRadius: '24px',
            borderBottomLeftRadius: '24px',
            overflow: 'hidden',
          }}
        >
          {/* Decorative curved shape backdrop */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              right: '-10%',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(134,188,37,0.1) 0%, transparent 75%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <ShieldCheck size={20} color="#86BC25" strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                Deloitte<span style={{ color: '#86BC25' }}>.</span>
              </span>
            </div>
          </div>

          {/* Illustration Container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '32px 0',
              zIndex: 2,
            }}
          >
            <img
              src="/Webinar-bro.png"
              alt="Audit Analytics Webinar Illustration"
              style={{
                maxWidth: '100%',
                maxHeight: '340px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))',
              }}
            />
          </div>

          {/* Bottom Pitch Details */}
          <div style={{ zIndex: 2 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px', color: '#FFFFFF' }}>
              AI-Powered Audit Workspace
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#E2E8F0', lineHeight: 1.5, margin: 0 }}>
              Unlock high-integrity insights, validation logs, and automated journal entry testing parameters.
            </p>
          </div>
        </div>

        {/* Right Section: Form */}
        <div
          style={{
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Practitioner Sign In
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.4 }}>
              Enter your audit engagement credentials to access testing workflows.
            </p>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--status-error-bg)',
                  border: '1px solid var(--status-error-border)',
                  color: 'var(--status-error)',
                  fontSize: '0.86rem',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle size={18} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="jet-label">Username</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    color="var(--text-muted)"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="text"
                    className="jet-input"
                    style={{ paddingLeft: '40px' }}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="jet-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    color="var(--text-muted)"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="password"
                    className="jet-input"
                    style={{ paddingLeft: '40px' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: '0.94rem',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #007680 0%, #005A62 100%)',
                  gap: '6px',
                }}
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div
              style={{
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Quick Demo Accounts
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin', 'Admin2026')}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  Admin (Lead)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('user', 'User2026')}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  Practitioner
                </button>
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                marginTop: '32px',
                fontSize: '0.74rem',
                color: 'var(--text-subtle)',
              }}
            >
              © 2026 Deloitte Touche Tohmatsu Limited. All rights reserved.
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
