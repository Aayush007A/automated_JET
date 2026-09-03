import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../../services/authService';
import {
  ShieldCheck, User, LogOut, LayoutDashboard, Rocket,
  Sparkles, History, CheckCircle2, ChevronRight, FileSpreadsheet,
  Activity, ArrowUpRight
} from 'lucide-react';
import { motion } from 'motion/react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = AuthService.getCurrentUser();
  const searchParams = new URLSearchParams(location.search);
  const currentRunId = searchParams.get('runId');

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const isWorkflowPage = location.pathname.includes('/jet') || location.pathname.includes('/spark-jet') || location.pathname.includes('/omnia-jet');

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  const handleScrollToSection = (sectionId: string) => {
    if (isDashboard) {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(`/dashboard`);
  };

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 clamp(16px, 3vw, 36px)',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
      transition: 'all 0.25s ease',
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
      }}>
        
        {/* ── Left: Brand Identity & Live Engine Badge ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {/* Deloitte Shield Logo Emblem */}
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #007680 0%, #004D54 65%, #86BC25 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 118, 128, 0.28)',
              flexShrink: 0,
            }}>
              <ShieldCheck size={21} color="#FFFFFF" strokeWidth={2.4} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '1.24rem',
                  fontWeight: 900,
                  letterSpacing: '-0.045em',
                  color: '#0F172A',
                  lineHeight: 1,
                }}>
                  Deloitte<span style={{ color: '#86BC25' }}>.</span>
                </span>

                <span style={{
                  background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2.5px 8px',
                  borderRadius: '5px',
                  letterSpacing: '0.07em',
                  boxShadow: '0 2px 6px rgba(0, 118, 128, 0.20)',
                }}>
                  JET ENTERPRISE
                </span>
              </div>
              
              <div style={{
                fontSize: '0.69rem',
                fontWeight: 500,
                color: '#64748B',
                letterSpacing: '0.01em',
                marginTop: '2px',
              }}>
                Journal Entry Testing &amp; Mathematical Integrity
              </div>
            </div>
          </Link>
        </div>

        {/* ── Center: Navigation Menu or Workflow Breadcrumb ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isWorkflowPage ? (
            /* Workflow Breadcrumb Navigator */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              background: '#F8FAFC',
              borderRadius: '999px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}>
              <LayoutDashboard size={13} color="#64748B" />
              <Link
                to="/dashboard"
                style={{
                  fontSize: '0.79rem',
                  color: '#64748B',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#007680')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#64748B')}
              >
                Dashboard
              </Link>
              <ChevronRight size={12} color="#CBD5E1" />
              <span style={{ fontSize: '0.79rem', color: '#007680', fontWeight: 800 }}>
                JET Audit Workflow
              </span>
              {currentRunId && (
                <>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono, monospace)',
                    color: '#007680',
                    background: 'rgba(0, 118, 128, 0.08)',
                    padding: '1px 7px',
                    borderRadius: '4px',
                  }}>
                    {currentRunId}
                  </span>
                </>
              )}
            </div>
          ) : (
            /* Dashboard Primary Navigation Links */
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Link
                to="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: isDashboard ? 700 : 600,
                  color: isDashboard ? '#007680' : '#475569',
                  background: isDashboard ? 'rgba(0, 118, 128, 0.08)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutDashboard size={14} />
                <span>Overview</span>
              </Link>

              <button
                onClick={() => handleScrollToSection('execution-history-section')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#475569',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#007680';
                  e.currentTarget.style.background = 'rgba(0, 118, 128, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <History size={14} />
                <span>Execution History</span>
              </button>
            </nav>
          )}
        </div>

        {/* ── Right: New Run CTA + User Profile + Logout ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Quick Launch CTA Button */}
          {!isWorkflowPage && (
            <motion.button
              onClick={() => navigate('/jet')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                color: '#FFFFFF',
                fontSize: '0.80rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 118, 128, 0.25)',
              }}
              whileHover={{ scale: 1.02, transform: 'translateY(-1px)' }}
              whileTap={{ scale: 0.98 }}
            >
              <Rocket size={13} />
              <span>Launch JET</span>
            </motion.button>
          )}

          {/* User Profile Capsule */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '5px 12px 5px 6px',
              borderRadius: '999px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}>
              {/* User Avatar Circle */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #007680 0%, #86BC25 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0, 118, 128, 0.25)',
              }}>
                {(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
              </div>

              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0F172A' }}>
                  {user.fullName || user.username}
                </div>
                <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#007680', textTransform: 'capitalize' }}>
                  {user.role || 'Auditor'}
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            aria-label="Sign Out"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#64748B',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FDA4AF';
              e.currentTarget.style.color = '#E11D48';
              e.currentTarget.style.background = '#FFF1F2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#64748B';
              e.currentTarget.style.background = '#FFFFFF';
            }}
            title="Sign out of Deloitte JET Platform"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
