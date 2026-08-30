import React from 'react';
import { FieldMappingItem } from '../../types';
import { StatusBadge } from './StatusBadge';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface FieldMappingTableProps {
  datasetTitle: string;
  sourceHeaders: string[];
  mappings: FieldMappingItem[];
  onChangeMapping: (standardField: string, newSourceField: string) => void;
}

export const FieldMappingTable: React.FC<FieldMappingTableProps> = ({
  datasetTitle,
  sourceHeaders,
  mappings,
  onChangeMapping,
}) => {
  const matchedCount = mappings.filter((m) => m.sourceField).length;
  const requiredCount = mappings.filter((m) => m.required).length;
  const requiredMatched = mappings.filter((m) => m.required && m.sourceField).length;

  return (
    <div
      style={{
        padding: '24px',
        margin: '20px 0',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header with Title and Badges */}
      <div className="field-mapping-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            {datasetTitle} Field Mapping
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Review smart field assignments and override any column mappings as needed.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '6px',
              background: '#F1F5F9',
              color: 'var(--text-secondary)',
              border: '1px solid #E2E8F0',
              letterSpacing: '0.03em',
            }}
          >
            TOTAL MAPPED: {matchedCount}/{mappings.length}
          </span>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '6px',
              background: requiredMatched === requiredCount ? '#D1FAE5' : '#FEF3C7',
              color: requiredMatched === requiredCount ? '#065F46' : '#92400E',
              border: `1px solid ${requiredMatched === requiredCount ? '#A7F3D0' : '#FDE68A'}`,
              letterSpacing: '0.03em',
            }}
          >
            REQUIRED: {requiredMatched}/{requiredCount}
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="jet-table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ width: '28%', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                STANDARD JET FIELD
              </th>
              <th style={{ width: '4%', textAlign: 'center' }}></th>
              <th style={{ width: '32%', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                MAPPED SOURCE COLUMN
              </th>
              <th style={{ width: '12%', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                MATCH TYPE
              </th>
              <th style={{ width: '12%', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                CONFIDENCE
              </th>
              <th style={{ width: '12%', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                STATUS
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((item) => {
              const isMatched = Boolean(item.sourceField);
              return (
                <tr key={item.standardField} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.80rem' }}>
                          {item.standardField}
                        </span>
                        {item.required && (
                          <span style={{ color: '#EF4444', fontSize: '0.82rem', fontWeight: 800, marginLeft: '2px' }}>*</span>
                        )}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#94A3B8' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>→</span>
                  </td>
                  <td>
                    <select
                      className="jet-select"
                      value={item.sourceField || ''}
                      onChange={(e) => onChangeMapping(item.standardField, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        borderColor: isMatched ? '#CBD5E1' : item.required ? '#FCA5A5' : '#CBD5E1',
                        color: isMatched ? 'var(--text-primary)' : 'var(--text-muted)',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">-- Not Mapped (Blank) --</option>
                      {sourceHeaders.map((src) => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: '#E0F2FE',
                        color: '#0369A1',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.matchType || 'EXACT'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: '45px',
                          height: '5px',
                          background: '#E2E8F0',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${item.confidence || (isMatched ? 100 : 0)}%`,
                            height: '100%',
                            background: (item.confidence || (isMatched ? 100 : 0)) >= 80 ? '#16A34A' : '#EAB308',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {item.confidence || (isMatched ? 100 : 0)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isMatched ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: '#D1FAE5',
                          color: '#065F46',
                          letterSpacing: '0.04em',
                        }}
                      >
                        <CheckCircle2 size={12} color="#059669" />
                        MATCHED
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: '#FEF3C7',
                          color: '#92400E',
                          letterSpacing: '0.04em',
                        }}
                      >
                        <AlertCircle size={12} color="#D97706" />
                        UNMATCHED
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
