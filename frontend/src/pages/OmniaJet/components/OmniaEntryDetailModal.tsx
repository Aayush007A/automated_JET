import React, { useState } from 'react';
import { X, ShieldAlert, ShieldCheck, FileText, User, Calendar, DollarSign, Tag, Copy, CheckCheck, Download, AlertTriangle, CornerDownRight, BookOpen } from 'lucide-react';
import { FlaggedEntry } from './OmniaFlaggedEntriesTable';

interface OmniaEntryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: FlaggedEntry | null;
  currencyCode?: string;
  onApplyTickmark?: (entry: FlaggedEntry) => void;
}

// Color palette mapping for test badges
const getTestBadgeStyle = (testName: string) => {
  const lower = testName.toLowerCase();
  if (lower.includes('keyword') || lower.includes('suspect') || lower.includes('fraud')) {
    return { bg: '#FEF2F2', text: '#DC2626', border: '#FECDD3' };
  }
  if (lower.includes('revenue') || lower.includes('debit')) {
    return { bg: '#FDF2F8', text: '#BE185D', border: '#FBCFE8' };
  }
  if (lower.includes('seldom') || lower.includes('unusual')) {
    return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  }
  if (lower.includes('round') || lower.includes('recurring') || lower.includes('digit')) {
    return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  }
  if (lower.includes('date') || lower.includes('weekend') || lower.includes('closing') || lower.includes('period')) {
    return { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' };
  }
  if (lower.includes('user') || lower.includes('monitored') || lower.includes('rare')) {
    return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  }
  return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
};

export const OmniaEntryDetailModal: React.FC<OmniaEntryDetailModalProps> = ({
  isOpen,
  onClose,
  entry,
  currencyCode = 'USD',
  onApplyTickmark,
}) => {
  const [copiedDoc, setCopiedDoc] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen || !entry) return null;

  // Robust field extractions matching Omnia pipeline CSV output columns
  const docNo = String(entry.Journal_Number || entry.Journal_Entry_Number || entry.DocumentNo || entry.document_no || entry.doc_no || '--');
  const dateEffective = String(entry.Date_Effective || entry.Effective_Date || entry.date_effective || entry.Date_Posted || entry.date_posted || '--');
  const datePosted = String(entry.Date_Posted || entry.date_posted || dateEffective);
  const accNum = String(entry.Account_Number || entry.account_number || entry.G_L || entry.gl || '--');
  const accDesc = String(entry.Account_Description || entry.account_description || entry.Description || entry.description || 'General Ledger Account');
  
  const rawAmt = entry.Net_Amount_EC ?? entry.Net_Amount ?? entry.net_amount_ec ?? entry.Amount ?? entry.amount ?? 0;
  const netAmt = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt || '0').replace(/,/g, ''));
  const rowCurrency = String(entry.Entity_Currency || entry.entity_currency || currencyCode);

  const userId = String(entry.User_ID || entry.User_ID_Entered || entry.userid_entered || entry.user_id || '--');
  const userName = String(entry.User_Name || entry.User_Name_Entered || entry.user_name_entered || entry.user_name || '');
  const riskLevel = String(entry.Risk_Level || entry.Risk_Score || entry.risk_level || 'MEDIUM').toUpperCase();

  const rawTests = entry.Flagged_Tests || entry.flagged_tests || '';
  const tests = String(rawTests).split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  const flagReasons = String(entry.Flag_Reasons || entry.Flagged_Reasons || entry.reasons || entry.reason || 'Audit exception criteria triggered.');
  
  const headerDesc = String(entry.Header_Description || entry.journal_header_description || entry.Entry_Description || 'None provided');
  const lineDesc = String(entry.Line_Description || entry.journal_line_description || 'None provided');
  const txType = String(entry.Transaction_Type || entry.transaction_type || 'Standard Journal Entry');
  const entityId = String(entry.Entity_ID || entry.entity_id || 'Company Core Ledger');

  const handleCopyDoc = () => {
    navigator.clipboard.writeText(docNo);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getRiskBannerStyle = () => {
    if (riskLevel === 'HIGH') {
      return {
        bg: '#FEF2F2',
        border: '#FECDD3',
        titleColor: '#991B1B',
        descColor: '#B91C1C',
        iconColor: '#DC2626',
        badgeBg: '#DC2626',
        badgeText: '#FFFFFF',
        label: 'HIGH RISK ANOMALY',
      };
    }
    if (riskLevel === 'LOW') {
      return {
        bg: '#EFF6FF',
        border: '#BFDBFE',
        titleColor: '#1E40AF',
        descColor: '#2563EB',
        iconColor: '#3B82F6',
        badgeBg: '#2563EB',
        badgeText: '#FFFFFF',
        label: 'LOW RISK EXCEPTION',
      };
    }
    return {
      bg: '#FFFBEB',
      border: '#FDE68A',
      titleColor: '#92400E',
      descColor: '#B45309',
      iconColor: '#D97706',
      badgeBg: '#D97706',
      badgeText: '#FFFFFF',
      label: 'MEDIUM RISK ANOMALY',
    };
  };

  const banner = getRiskBannerStyle();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Deloitte Signature Top Stripe */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3.5px',
          background: 'linear-gradient(90deg, #007680 0%, #86BC25 50%, #2563EB 100%)',
          zIndex: 10,
        }} />

        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#F0F9FA',
              border: '1px solid rgba(0, 118, 128, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#007680',
              flexShrink: 0,
            }}>
              <BookOpen size={20} strokeWidth={2.2} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  Transaction Audit Exception Detail
                </h3>
                {/* Journal Number Monospace Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 750,
                  fontFamily: 'monospace',
                  color: '#0F172A',
                }}>
                  <span>Doc #{docNo}</span>
                  {docNo !== '--' && (
                    <button
                      type="button"
                      onClick={handleCopyDoc}
                      title="Copy Document Number"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '1px',
                        color: copiedDoc ? '#16A34A' : '#94A3B8',
                        display: 'inline-flex',
                      }}
                    >
                      {copiedDoc ? <CheckCheck size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                Deloitte Omnia Anomaly Surveillance • Entity: <strong>{entityId}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: banner.badgeBg,
              color: banner.badgeText,
              fontSize: '0.70rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}>
              {banner.label}
            </span>

            <button
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(el) => { el.currentTarget.style.background = '#E2E8F0'; el.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(el) => { el.currentTarget.style.background = '#F1F5F9'; el.currentTarget.style.color = '#64748B'; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Risk Findings & Rationale Callout */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: banner.bg,
            border: `1px solid ${banner.border}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <ShieldAlert size={20} style={{ color: banner.iconColor, flexShrink: 0, marginTop: '2px' }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: banner.titleColor }}>
                Flagged by {tests.length} Parametric Audit Test{tests.length > 1 ? 's' : ''} ({riskLevel} RISK)
              </div>
              <div style={{ fontSize: '0.76rem', color: banner.descColor, marginTop: '4px', lineHeight: 1.45 }}>
                {flagReasons}
              </div>
            </div>
          </div>

          {/* 4-KPI Core Transaction Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
          }}>
            {/* Amount */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Net Amount
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#007680', fontFamily: 'monospace', margin: '4px 0 2px' }}>
                {netAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                Entity Currency: <strong>{rowCurrency}</strong>
              </div>
            </div>

            {/* Effective Date */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Effective Date
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: '4px 0 2px' }}>
                {dateEffective}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                Posted: <strong>{datePosted}</strong>
              </div>
            </div>

            {/* User / Preparer */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Preparer / User ID
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: '4px 0 2px' }}>
                {userId}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName || 'System Authenticated'}
              </div>
            </div>

            {/* Transaction Type */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Transaction Type
              </div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', margin: '4px 0 2px' }}>
                {txType}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                Status: <strong>Screened</strong>
              </div>
            </div>
          </div>

          {/* General Ledger Account Card */}
          <div style={{
            padding: '14px 16px',
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              General Ledger Account Information
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.96rem',
                fontWeight: 850,
                fontFamily: 'monospace',
                color: '#0F172A',
                background: '#F1F5F9',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
              }}>
                {accNum}
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B' }}>
                {accDesc}
              </span>
            </div>
          </div>

          {/* Transaction Narrations & Descriptions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {/* Header Narration */}
            <div style={{
              padding: '12px 14px',
              background: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                Journal Header Description
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1E293B', lineHeight: 1.45, fontStyle: headerDesc === 'None provided' ? 'italic' : 'normal' }}>
                {headerDesc}
              </div>
            </div>

            {/* Line Narration */}
            <div style={{
              padding: '12px 14px',
              background: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                Line Item Narration
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1E293B', lineHeight: 1.45, fontStyle: lineDesc === 'None provided' ? 'italic' : 'normal' }}>
                {lineDesc}
              </div>
            </div>
          </div>

          {/* Triggered Parameter Exception Tests */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              All Triggered Exception Categories ({tests.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tests.map((t) => {
                const st = getTestBadgeStyle(t);
                return (
                  <span
                    key={t}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: st.bg,
                      color: st.text,
                      border: `1px solid ${st.border}`,
                      fontSize: '0.74rem',
                      fontWeight: 750,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <CornerDownRight size={12} strokeWidth={2.4} />
                    {t}
                  </span>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyJson}
              style={{
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 650,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {copiedJson ? <CheckCheck size={13} color="#16A34A" /> : <Copy size={13} />}
              {copiedJson ? 'JSON Copied!' : 'Copy Record JSON'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onApplyTickmark && (
              <button
                type="button"
                onClick={() => {
                  onApplyTickmark(entry);
                  onClose();
                }}
                className="btn-soft-slate"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Tag size={13} /> +Add Tickmark
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-primary"
              style={{
                padding: '6px 20px',
                fontSize: '0.78rem',
                background: '#007680',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close Window
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
