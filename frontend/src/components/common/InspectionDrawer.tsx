import React, { useState } from 'react';
import { X, Download, Search, Table, FileSpreadsheet, AlertTriangle, CheckCircle2, ChevronRight, Info } from 'lucide-react';

interface InspectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  headers?: string[];
  rows?: any[];
  downloadUrl?: string;
  downloadFilename?: string;
  ruleCode?: string;
  ruleDescription?: string;
}

export const InspectionDrawer: React.FC<InspectionDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  headers = [],
  rows = [],
  downloadUrl,
  downloadFilename = 'data_export.csv',
  ruleCode,
  ruleDescription,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const displayHeaders = headers.length > 0
    ? headers
    : rows.length > 0
      ? Object.keys(rows[0])
      : [];

  const filteredRows = rows.filter((r) => {
    if (!searchTerm) return true;
    return Object.values(r).some((v) =>
      String(v ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getBadgeStyle = (variant: string) => {
    switch (variant) {
      case 'success':
        return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
      case 'warning':
        return { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' };
      case 'danger':
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FECDD3' };
      case 'info':
        return { bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD' };
      default:
        return { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
    }
  };

  const badgeStyle = badge ? getBadgeStyle(badge.variant) : null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(0, 118, 128, 0.1)',
                color: '#007680',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Table size={16} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                {title}
              </h3>
              {badge && badgeStyle && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: badgeStyle.bg,
                  color: badgeStyle.color,
                  border: `1px solid ${badgeStyle.border}`
                }}>
                  {badge.text}
                </span>
              )}
            </div>
            {subtitle && (
              <p style={{ fontSize: '0.80rem', color: '#64748B', margin: '4px 0 0', fontWeight: 500 }}>
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              transition: 'all 0.15s ease'
            }}
            title="Close Drawer (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Rule Context Banner if available */}
        {(ruleCode || ruleDescription) && (
          <div style={{
            padding: '12px 24px',
            background: '#F0FDFA',
            borderBottom: '1px solid #CCFBF1',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <Info size={15} color="#007680" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#005A62', lineHeight: 1.4 }}>
              {ruleCode && <strong>Rule [{ruleCode}]: </strong>}
              {ruleDescription}
            </div>
          </div>
        )}

        {/* Toolbar: Search & Export */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#FFFFFF'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search records in drawer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '0.80rem',
                outline: 'none',
                background: '#F8FAFC'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
              Showing {filteredRows.length} of {rows.length} rows
            </span>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="btn-soft-teal"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Download size={13} /> Export CSV
              </a>
            )}
          </div>
        </div>

        {/* Records Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {filteredRows.length > 0 ? (
            <div className="table-container" style={{ marginTop: '16px', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
              <table className="jet-table" style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#F8FAFC' }}>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center', fontSize: '0.72rem' }}>#</th>
                    {displayHeaders.map((hdr) => (
                      <th key={hdr} style={{ fontSize: '0.74rem', textTransform: 'none', whiteSpace: 'nowrap' }}>
                        {hdr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="smooth-row">
                      <td style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                        {idx + 1}
                      </td>
                      {displayHeaders.map((hdr) => (
                        <td key={hdr} style={{ fontSize: '0.76rem', color: '#1E293B', whiteSpace: 'nowrap', fontFamily: typeof row[hdr] === 'number' ? 'var(--font-mono)' : 'inherit' }}>
                          {row[hdr] !== null && row[hdr] !== undefined ? String(row[hdr]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#64748B',
              background: '#F8FAFC',
              borderRadius: '12px',
              marginTop: '20px',
              border: '1px dashed #CBD5E1'
            }}>
              <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 10px', opacity: 0.8 }} />
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>
                No Exception Records
              </div>
              <p style={{ fontSize: '0.78rem', margin: '4px 0 0', color: '#64748B' }}>
                All schema constraints and validations passed cleanly with 0 failing rows.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
