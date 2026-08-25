import React, { useState, useMemo } from 'react';
import { X, Search, FileSpreadsheet, Grid, Hash, Type, Calendar } from 'lucide-react';

// Infer column type from values
const inferColType = (values: any[]): 'number' | 'date' | 'text' => {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonEmpty.length === 0) return 'text';
  const numCount = nonEmpty.filter(v => !isNaN(Number(String(v).replace(/,/g, ''))) && String(v).trim() !== '').length;
  if (numCount / nonEmpty.length > 0.7) return 'number';
  const dateCount = nonEmpty.filter(v => !isNaN(Date.parse(String(v)))).length;
  if (dateCount / nonEmpty.length > 0.6) return 'date';
  return 'text';
};

const ColTypeIcon = ({ type }: { type: 'number' | 'date' | 'text' }) => {
  if (type === 'number') return <Hash size={11} />;
  if (type === 'date') return <Calendar size={11} />;
  return <Type size={11} />;
};

interface SampleDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export const SampleDataModal: React.FC<SampleDataModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headers,
  rows,
  totalRows,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  const columnTypes = useMemo(() => {
    const types: Record<string, 'number' | 'date' | 'text'> = {};
    headers.forEach(h => {
      types[h] = inferColType(rows.map(r => r[h]));
    });
    return types;
  }, [headers, rows]);

  if (!isOpen) return null;

  const sheetMatch = title.match(/\[Sheet:\s*([^\]]+)\]/);
  const sheetName = sheetMatch ? sheetMatch[1] : null;
  const fileNamePart = title.replace(/Sample Data Preview:\s*/, '').replace(/\[Sheet:\s*[^\]]+\]/, '').trim();

  const highlightMatch = (text: string, term: string) => {
    if (!term || !text.toLowerCase().includes(term.toLowerCase())) return <>{text}</>;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === term.toLowerCase()
            ? <mark key={i} style={{ background: '#FEF08A', padding: '0 1px', borderRadius: '2px' }}>{part}</mark>
            : part
        )}
      </>
    );
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(10, 15, 30, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF', borderRadius: '20px',
          boxShadow: '0 32px 80px -12px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(0,0,0,0.06)',
          width: '100%', maxWidth: '1320px', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* DARK PREMIUM HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #0F2027 0%, #07555C 55%, #007680 100%)',
          padding: '22px 28px 20px',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: '16px',
          position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.055,
            backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,1) 28px,rgba(255,255,255,1) 29px)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1, minWidth: 0 }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '13px',
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileSpreadsheet size={23} color="#FFFFFF" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                <span style={{ fontSize: '1.12rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {fileNamePart}
                </span>
                {sheetName && (
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                    background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)',
                    padding: '2px 9px', borderRadius: '6px', whiteSpace: 'nowrap',
                  }}>
                    Sheet: {sheetName}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Grid size={12} />
                  {totalRows.toLocaleString()} total rows · {headers.length} columns
                </span>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)',
                  background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '5px',
                  border: '1px solid rgba(255,255,255,0.14)', whiteSpace: 'nowrap',
                }}>
                  Showing top {rows.length} sample records
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: '7px', borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, position: 'relative', zIndex: 1,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* SEARCH TOOLBAR */}
        <div style={{
          padding: '11px 24px', background: '#F8FAFC',
          borderBottom: '1px solid #E8EEF4', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexShrink: 0,
        }}>
          <div style={{ position: 'relative', width: '340px' }}>
            <Search size={14} style={{
              position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)',
              color: '#94A3B8', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Search across all columns..."
              className="jet-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: '34px', fontSize: '0.84rem', height: '36px',
                borderRadius: '8px', border: '1px solid #DDE4EE', background: '#FFFFFF',
              }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {searchTerm && (
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                {filteredRows.length} match{filteredRows.length !== 1 ? 'es' : ''}
              </span>
            )}
            {[
              { label: 'Numeric', icon: <Hash size={10}/>, bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
              { label: 'Date', icon: <Calendar size={10}/>, bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
              { label: 'Text', icon: <Type size={10}/>, bg: '#FDF4FF', color: '#9333EA', border: '#E9D5FF' },
            ].map(tag => (
              <span key={tag.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`,
                padding: '2px 8px', borderRadius: '5px', fontWeight: 700, fontSize: '0.7rem',
              }}>
                {tag.icon} {tag.label}
              </span>
            ))}
          </div>
        </div>

        {/* TABLE */}
        <div style={{ flex: 1, overflow: 'auto', background: '#FFFFFF' }}>
          {filteredRows.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '220px', gap: '10px', color: '#94A3B8',
            }}>
              <Search size={38} style={{ opacity: 0.28 }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No matching records found</div>
              <div style={{ fontSize: '0.8rem' }}>Try different search terms</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{
                    padding: '10px 12px', textAlign: 'center', width: '44px', minWidth: '44px',
                    fontWeight: 700, fontSize: '0.68rem', color: '#94A3B8', letterSpacing: '0.06em',
                    borderBottom: '2px solid #E2E8F0', background: '#F1F5F9',
                  }}>#</th>
                  {headers.map((h) => {
                    const type = columnTypes[h];
                    const typeStyle = type === 'number'
                      ? { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' }
                      : type === 'date'
                      ? { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' }
                      : { bg: '#FDF4FF', color: '#9333EA', border: '#E9D5FF' };
                    return (
                      <th key={h} style={{
                        padding: '8px 14px 10px',
                        textAlign: type === 'number' ? 'right' : 'left',
                        whiteSpace: 'nowrap', minWidth: '110px', maxWidth: '260px',
                        borderBottom: '2px solid #E2E8F0', background: '#F1F5F9',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: type === 'number' ? 'flex-end' : 'flex-start' }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: '#334155',
                            letterSpacing: '0.04em', textTransform: 'uppercase',
                            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '230px',
                          }}>{h}</span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                            background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`,
                          }}>
                            <ColTypeIcon type={type} /> {type}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr key={idx}
                      style={{ background: isEven ? '#FFFFFF' : '#F8FAFC', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                      onMouseLeave={e => (e.currentTarget.style.background = isEven ? '#FFFFFF' : '#F8FAFC')}
                    >
                      <td style={{
                        padding: '8px 12px', textAlign: 'center',
                        color: '#CBD5E1', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600,
                        borderBottom: '1px solid #F1F5F9',
                      }}>{idx + 1}</td>
                      {headers.map((h) => {
                        const val = row[h];
                        const type = columnTypes[h];
                        const isNull = val === null || val === undefined || String(val).trim() === '';
                        const displayVal = isNull ? null : String(val);
                        return (
                          <td key={h} style={{
                            padding: '8px 14px',
                            fontFamily: type === 'number' ? 'var(--font-mono)' : 'inherit',
                            fontSize: type === 'number' ? '0.79rem' : '0.82rem',
                            fontWeight: type === 'number' ? 600 : 400,
                            whiteSpace: 'nowrap', maxWidth: '260px',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            color: isNull ? '#CBD5E1' : type === 'number' ? '#0F172A' : '#1E293B',
                            textAlign: type === 'number' ? 'right' : 'left',
                            borderBottom: '1px solid #F1F5F9',
                          }} title={displayVal ?? ''}>
                            {isNull
                              ? <span style={{ fontStyle: 'italic', opacity: 0.4 }}>—</span>
                              : searchTerm ? highlightMatch(displayVal!, searchTerm) : displayVal
                            }
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '12px 24px', borderTop: '1px solid #E8EEF4', background: '#F8FAFC',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
            Showing <strong style={{ color: '#0F172A' }}>{filteredRows.length}</strong> of{' '}
            <strong style={{ color: '#0F172A' }}>{rows.length}</strong> sample records
            {totalRows > rows.length && (
              <span style={{ color: '#94A3B8' }}> · {(totalRows - rows.length).toLocaleString()} more rows in full dataset</span>
            )}
          </div>
          <button onClick={onClose} style={{
            padding: '8px 22px', fontSize: '0.84rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #007680, #005A62)',
            color: '#FFFFFF', border: 'none', borderRadius: '9px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 2px 10px rgba(0,118,128,0.28)',
          }}>
            <X size={14} /> Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
