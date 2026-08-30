import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Lock, CheckCircle2, Check, Scale, Sliders
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      background: 'linear-gradient(180deg, #0B1320 0%, #070D17 100%)',
      color: '#94A3B8',
      borderTop: '1px solid #1E293B',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: '52px',
    }}>
      {/* ── Deloitte Signature Top Accent Stripe ── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #007680 0%, #86BC25 50%, #2563EB 100%)',
        zIndex: 10,
      }} />

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

      {/* Botanical Watercolor Leaf Accent — Bottom-Left */}
      <img
        src="/decor/leaf_left_clean.png"
        alt="Botanical Leaf Accent"
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '14px',
          width: '115px',
          height: 'auto',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.35,
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))',
        }}
      />

      {/* 3D Potted Plant Decor — Bottom-right */}
      <img
        src="/decor/potted_plant_clean.png"
        alt="Potted Plant Decoration"
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '24px',
          width: '88px',
          height: 'auto',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.45,
          filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.4))',
        }}
      />

      <div style={{
        maxWidth: '1520px',
        margin: '0 auto',
        padding: '0 clamp(20px, 3.5vw, 56px)',
        position: 'relative',
        zIndex: 2,
      }}>
        
        {/* ── 4-Column Navigation & Standards Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'clamp(28px, 3.5vw, 44px)',
          paddingBottom: '44px',
          borderBottom: '1px solid #1E293B',
        }}>
          
          {/* Column 1: Brand & Enterprise Profile */}
          <div style={{ maxWidth: '360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #007680 0%, #004D54 65%, #86BC25 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 118, 128, 0.35)',
              }}>
                <ShieldCheck size={19} color="#FFFFFF" strokeWidth={2.4} />
              </div>

              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.04em' }}>
                  Deloitte<span style={{ color: '#86BC25' }}>.</span>
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: '#2DD4BF',
                  background: 'rgba(0, 163, 173, 0.18)',
                  border: '1px solid rgba(0, 163, 173, 0.3)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  marginLeft: '7px',
                  letterSpacing: '0.06em',
                }}>
                  JET PLATFORM
                </span>
              </div>
            </div>

            <p style={{
              fontSize: '0.82rem',
              lineHeight: 1.6,
              color: '#94A3B8',
              margin: '0 0 16px',
              fontWeight: 400,
            }}>
              Automated Journal Entry Testing platform providing automated mathematical zero-sum integrity, multi-sheet reconciliation, and audit-ready workpapers.
            </p>

            {/* Compliance Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#131F33',
                border: '1px solid #1E293B',
                fontSize: '0.70rem',
                fontWeight: 700,
                color: '#CBD5E1',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}>
                <Lock size={11} color="#2DD4BF" />
                SOC 2 Type II Certified
              </span>

              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#131F33',
                border: '1px solid #1E293B',
                fontSize: '0.70rem',
                fontWeight: 700,
                color: '#CBD5E1',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}>
                <CheckCircle2 size={11} color="#4ADE80" />
                PCAOB AS 2401 Aligned
              </span>
            </div>
          </div>

          {/* Column 2: 6-Stage Audit Lifecycle */}
          <div>
            <h4 style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              margin: '0 0 14px',
            }}>
              Audit Lifecycle
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
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
                      color: '#94A3B8',
                      textDecoration: 'none',
                      transition: 'color 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#2DD4BF')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                  >
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00A3AD', fontFamily: 'var(--font-mono, monospace)' }}>
                      {stage.number}
                    </span>
                    <span>{stage.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Core Testing Capabilities */}
          <div>
            <h4 style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              margin: '0 0 14px',
            }}>
              Core Capabilities
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {[
                'Trial Balance Checkpoints',
                'General Ledger Zero-Sum Balancing',
                'IR 1–4 Cross-Dataset Checks',
                '12 Parameter Exceptions (Ex 1–12)',
                '20 Golden DQCs (Data Quality)',
                'Automated Workpaper ZIP Export',
              ].map((item, idx) => (
                <li key={idx} style={{ fontSize: '0.81rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#86BC25', flexShrink: 0 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Engagement Assurance & Standards Widget */}
          <div>
            <h4 style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              margin: '0 0 14px',
            }}>
              Assurance Standards
            </h4>
            
            <div style={{
              background: '#131F33',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid #1E293B',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {[
                {
                  title: 'PCAOB AS 2401',
                  desc: 'Fraud & Journal Risk',
                  icon: <ShieldCheck size={14} strokeWidth={2.2} />,
                  accent: '#2DD4BF',
                  bg: 'rgba(0, 163, 173, 0.18)',
                },
                {
                  title: 'AICPA SAS 99',
                  desc: 'Risk Assessment Rules',
                  icon: <Scale size={14} strokeWidth={2.2} />,
                  accent: '#60A5FA',
                  bg: 'rgba(37, 99, 235, 0.18)',
                },
                {
                  title: 'Canonical Mapping',
                  desc: '4-Phase Standard Model',
                  icon: <Sliders size={14} strokeWidth={2.2} />,
                  accent: '#FBBF24',
                  bg: 'rgba(217, 119, 6, 0.18)',
                },
                {
                  title: 'Audit Trail Logs',
                  desc: 'Cryptographic Integrity',
                  icon: <Lock size={14} strokeWidth={2.2} />,
                  accent: '#4ADE80',
                  bg: 'rgba(22, 163, 74, 0.18)',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 9px',
                    borderRadius: '9px',
                    background: '#0B1320',
                    border: '1px solid #1E293B',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '7px',
                      background: item.bg,
                      color: item.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.67rem', color: '#94A3B8', lineHeight: 1.2 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  <CheckCircle2 size={13} color="#4ADE80" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Bottom Legal Bar: Clean & Editorial ── */}
        <div style={{
          padding: '22px 0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          fontSize: '0.76rem',
          color: '#64748B',
        }}>
          <div>
            © 2026 Deloitte Touche Tohmatsu Limited. All rights reserved. Confidential audit testing platform.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94A3B8', fontWeight: 600 }}>Deloitte Global Audit Practice</span>
            <span style={{ color: '#475569' }}>•</span>
            <span style={{ color: '#94A3B8', fontWeight: 600 }}>ISO 27001 Security</span>
            <span style={{ color: '#475569' }}>•</span>
            <span style={{ color: '#2DD4BF', fontWeight: 700 }}>JET Platform Enterprise</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
