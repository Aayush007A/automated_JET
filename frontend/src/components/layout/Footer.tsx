import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Lock, CheckCircle2, Scale, Sliders, ArrowRight,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      data-ai-ignore="true"
      style={{
      background: 'linear-gradient(160deg, #0A1628 0%, #0D1E35 30%, #0C2233 60%, #091820 100%)',
      color: '#94A3B8',
      borderTop: '1px solid rgba(0, 163, 173, 0.15)',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: '56px',
    }}>

      {/* ── Signature Multi-Stop Accent Stripe ── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #00A3AD 0%, #007680 20%, #86BC25 50%, #2563EB 80%, #7C3AED 100%)',
        zIndex: 10,
      }} />

      {/* ── Radial glow blob — top left ── */}
      <div style={{
        position: 'absolute',
        top: '-80px',
        left: '-60px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0, 118, 128, 0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── Radial glow blob — bottom right ── */}
      <div style={{
        position: 'absolute',
        bottom: '-60px',
        right: '-40px',
        width: '480px',
        height: '480px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── Subtle dot grid — right side ── */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '460px',
        height: '100%',
        backgroundImage: 'radial-gradient(circle, rgba(0, 163, 173, 0.14) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 75% 50%, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 75% 50%, black 20%, transparent 80%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── Botanical Leaf Accent ── */}
      <img
        src="/decor/leaf_left_clean.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '14px',
          width: '110px',
          height: 'auto',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.28,
          filter: 'drop-shadow(0 4px 16px rgba(0, 163, 173, 0.25))',
        }}
      />

      {/* ── 3D Potted Plant Decor ── */}
      <img
        src="/decor/potted_plant_clean.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '24px',
          width: '84px',
          height: 'auto',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.38,
          filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.4))',
        }}
      />

      {/* ── Main Content Container ── */}
      <div style={{
        maxWidth: '1520px',
        margin: '0 auto',
        padding: '0 clamp(20px, 3.5vw, 56px)',
        position: 'relative',
        zIndex: 2,
      }}>

        {/* ── 4-Column Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'clamp(28px, 3.5vw, 48px)',
          paddingBottom: '44px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        }}>

          {/* ── Column 1: Brand ── */}
          <div style={{ maxWidth: '360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {/* Logo Icon */}
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #007680 0%, #004D54 65%, #86BC25 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 1px rgba(0,163,173,0.3), 0 4px 18px rgba(0, 118, 128, 0.45)',
              }}>
                <ShieldCheck size={19} color="#FFFFFF" strokeWidth={2.4} />
              </div>

              <div>
                <span style={{
                  fontSize: '1.22rem',
                  fontWeight: 900,
                  color: '#F1F5F9',
                  letterSpacing: '-0.04em',
                }}>
                  Deloitte<span style={{ color: '#86BC25' }}>.</span>
                </span>
                <span style={{
                  fontSize: '0.61rem',
                  fontWeight: 800,
                  color: '#2DD4BF',
                  background: 'linear-gradient(135deg, rgba(0,163,173,0.22) 0%, rgba(0,118,128,0.14) 100%)',
                  border: '1px solid rgba(0, 163, 173, 0.35)',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  marginLeft: '8px',
                  letterSpacing: '0.07em',
                  boxShadow: '0 0 8px rgba(0, 163, 173, 0.2)',
                }}>
                  JET PLATFORM
                </span>
              </div>
            </div>

            <p style={{
              fontSize: '0.82rem',
              lineHeight: 1.65,
              color: '#8AA4BC',
              margin: '0 0 18px',
              fontWeight: 400,
            }}>
              Automated Journal Entry Testing platform providing automated mathematical zero-sum integrity, multi-sheet reconciliation, and audit-ready workpapers.
            </p>

            {/* Compliance Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                { icon: <Lock size={11} color="#2DD4BF" />, label: 'SOC 2 Type II Certified', glow: 'rgba(0,163,173,0.12)', border: 'rgba(0,163,173,0.25)' },
                { icon: <CheckCircle2 size={11} color="#86BC25" />, label: 'PCAOB AS 2401 Aligned', glow: 'rgba(134,188,37,0.10)', border: 'rgba(134,188,37,0.22)' },
              ].map((pill, idx) => (
                <span key={idx} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 11px',
                  borderRadius: '999px',
                  background: pill.glow,
                  border: `1px solid ${pill.border}`,
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  color: '#CBD5E1',
                  backdropFilter: 'blur(4px)',
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 4px rgba(0,0,0,0.25)`,
                }}>
                  {pill.icon}
                  {pill.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Column 2: Audit Lifecycle ── */}
          <div>
            <h4 style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#CBD5E1',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '16px', height: '2px',
                borderRadius: '2px',
                background: 'linear-gradient(90deg, #00A3AD, #86BC25)',
              }} />
              Audit Lifecycle
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { number: '01', name: 'Data Upload & Ingestion', link: '/jet' },
                { number: '02', name: 'File Preparation & Sheets', link: '/jet' },
                { number: '03', name: 'Automated Data Cleansing', link: '/jet' },
                { number: '04', name: 'Pre-Integrity Constraint Checks', link: '/jet' },
                { number: '05', name: 'Integrity Testing & Execution', link: '/jet' },
                { number: '06', name: 'Summary & Reconciliation', link: '/jet' },
              ].map((stage, idx) => (
                <li key={idx}>
                  <Link
                    to={stage.link}
                    style={{
                      fontSize: '0.81rem',
                      color: '#8AA4BC',
                      textDecoration: 'none',
                      transition: 'color 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#2DD4BF';
                      const arrow = e.currentTarget.querySelector('.link-arrow') as HTMLElement;
                      if (arrow) arrow.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#8AA4BC';
                      const arrow = e.currentTarget.querySelector('.link-arrow') as HTMLElement;
                      if (arrow) arrow.style.opacity = '0';
                    }}
                  >
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#00A3AD',
                      fontFamily: 'var(--font-mono, monospace)',
                      background: 'rgba(0,163,173,0.1)',
                      border: '1px solid rgba(0,163,173,0.2)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      lineHeight: 1.5,
                    }}>
                      {stage.number}
                    </span>
                    <span>{stage.name}</span>
                    <ArrowRight size={11} className="link-arrow" style={{ opacity: 0, transition: 'opacity 0.15s ease', flexShrink: 0, color: '#2DD4BF' }} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 3: Core Capabilities ── */}
          <div>
            <h4 style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#CBD5E1',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '16px', height: '2px',
                borderRadius: '2px',
                background: 'linear-gradient(90deg, #86BC25, #2563EB)',
              }} />
              Core Capabilities
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Trial Balance Checkpoints', accent: '#2DD4BF' },
                { label: 'General Ledger Zero-Sum Balancing', accent: '#86BC25' },
                { label: 'IR 1–4 Cross-Dataset Checks', accent: '#60A5FA' },
                { label: '12 Parameter Exceptions (Ex 1–12)', accent: '#FBBF24' },
                { label: '20 Golden DQCs (Data Quality)', accent: '#F472B6' },
                { label: 'Automated Workpaper ZIP Export', accent: '#4ADE80' },
              ].map((item, idx) => (
                <li key={idx} style={{ fontSize: '0.81rem', color: '#8AA4BC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: item.accent,
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${item.accent}66`,
                  }} />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 4: Assurance Standards ── */}
          <div>
            <h4 style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#CBD5E1',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: '0 0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '16px', height: '2px',
                borderRadius: '2px',
                background: 'linear-gradient(90deg, #7C3AED, #2563EB)',
              }} />
              Assurance Standards
            </h4>

            <div style={{
              background: 'rgba(255,255,255,0.035)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
            }}>
              {[
                { title: 'PCAOB AS 2401', desc: 'Fraud & Journal Risk', icon: <ShieldCheck size={14} strokeWidth={2.2} />, accent: '#2DD4BF', bg: 'rgba(0, 163, 173, 0.18)' },
                { title: 'AICPA SAS 99', desc: 'Risk Assessment Rules', icon: <Scale size={14} strokeWidth={2.2} />, accent: '#60A5FA', bg: 'rgba(37, 99, 235, 0.18)' },
                { title: 'Canonical Mapping', desc: '4-Phase Standard Model', icon: <Sliders size={14} strokeWidth={2.2} />, accent: '#FBBF24', bg: 'rgba(217, 119, 6, 0.18)' },
                { title: 'Audit Trail Logs', desc: 'Cryptographic Integrity', icon: <Lock size={14} strokeWidth={2.2} />, accent: '#4ADE80', bg: 'rgba(22, 163, 74, 0.18)' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(148,163,184,0.1)',
                    backdropFilter: 'blur(8px)',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: item.bg,
                      color: item.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: `0 0 10px ${item.accent}33`,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#E2E8F0', lineHeight: 1.2 }}>{item.title}</div>
                      <div style={{ fontSize: '0.66rem', color: '#7A95AC', lineHeight: 1.2 }}>{item.desc}</div>
                    </div>
                  </div>
                  <div style={{
                    width: '18px', height: '18px',
                    borderRadius: '50%',
                    background: 'rgba(74, 222, 128, 0.15)',
                    border: '1px solid rgba(74, 222, 128, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <CheckCircle2 size={11} color="#4ADE80" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Bottom Legal Bar ── */}
        <div style={{
          padding: '20px 0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          fontSize: '0.74rem',
          color: '#546B82',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #007680, #86BC25)',
            }} />
            © 2026 Deloitte Touche Tohmatsu Limited. All rights reserved. Confidential audit testing platform.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{
              color: '#8AA4BC',
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}>Deloitte Global Audit Practice</span>
            <span style={{
              display: 'inline-block',
              width: '3px', height: '3px',
              borderRadius: '50%',
              background: '#3D5468',
            }} />
            <span style={{ color: '#8AA4BC', fontWeight: 600 }}>ISO 27001 Security</span>
            <span style={{
              display: 'inline-block',
              width: '3px', height: '3px',
              borderRadius: '50%',
              background: '#3D5468',
            }} />
            <span style={{
              color: '#2DD4BF',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #2DD4BF, #86BC25)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>JET Platform Enterprise</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
