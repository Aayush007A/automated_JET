import React, { useState } from 'react';
import { Building2, Calendar, ShieldCheck, DollarSign, Tag, ShieldAlert, Briefcase, Check, ChevronDown } from 'lucide-react';

export interface EngagementAuditParametersData {
  engagementName: string;
  startDate: string;
  endDate: string;
  financialYearEnd: string;
  engagementRunId: string;
  operatingCurrency: string;
  overallMateriality: number | string;
  engagementClassification: string;
}

interface EngagementAuditParametersCardProps {
  parameters: EngagementAuditParametersData;
  onChange: (newParams: EngagementAuditParametersData) => void;
  runId?: string;
  editable?: boolean;
}

const CURRENCIES = [
  { code: 'INR', label: 'INR (₹) — Indian Rupee' },
  { code: 'USD', label: 'USD ($) — US Dollar' },
  { code: 'EUR', label: 'EUR (€) — Euro' },
  { code: 'GBP', label: 'GBP (£) — British Pound' },
  { code: 'CAD', label: 'CAD ($) — Canadian Dollar' },
  { code: 'AUD', label: 'AUD ($) — Australian Dollar' },
  { code: 'SGD', label: 'SGD ($) — Singapore Dollar' },
  { code: 'JPY', label: 'JPY (¥) — Japanese Yen' },
  { code: 'AED', label: 'AED (د.إ) — UAE Dirham' },
  { code: 'CHF', label: 'CHF (₣) — Swiss Franc' },
];

const CLASSIFICATIONS = [
  'Select Audit Classification...',
  'Tier 1 Key Audit Engagement',
  'Public Listed Entity / PCAOB AS 2401',
  'Standard Statutory Audit',
  'Internal Audit Review',
  'Agreed-Upon Procedures (AUP)',
  'Special Purpose Audit',
];

export const EngagementAuditParametersCard: React.FC<EngagementAuditParametersCardProps> = ({ parameters, onChange, runId, editable = true }) => {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const update = (field: keyof EngagementAuditParametersData, value: string | number) => onChange({ ...parameters, [field]: value });
  const currentCurrencyCode = parameters.operatingCurrency && parameters.operatingCurrency.length <= 4 ? parameters.operatingCurrency : (CURRENCIES.find(c => c.code === parameters.operatingCurrency || c.label === parameters.operatingCurrency)?.code || parameters.operatingCurrency || 'INR');
  const displayRunId = runId || parameters.engagementRunId || 'JET-20260902-004';

  const labelStyle: React.CSSProperties = { fontSize: '0.62rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.045em', textTransform: 'uppercase', marginBottom: '6px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  const getContainerStyle = (fieldName: string): React.CSSProperties => { const focused = focusedField === fieldName; return { display: 'flex', alignItems: 'center', width: '100%', height: '42px', background: '#FFFFFF', border: `1px solid ${focused ? '#66B8BC' : '#DCE5EC'}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color .16s ease, box-shadow .16s ease', boxShadow: focused ? '0 0 0 3px rgba(0,118,128,.08)' : '0 1px 2px rgba(15,23,42,.02)' }; };
  const leftIconBoxStyle: React.CSSProperties = { width: '38px', height: '100%', minWidth: '38px', background: '#F2FBFA', borderRight: '1px solid #E4ECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007680', flexShrink: 0 };
  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 0, border: 'none', outline: 'none', padding: '0 12px', fontSize: '0.80rem', fontWeight: 650, color: '#172033', background: 'transparent', fontFamily: 'inherit', height: '100%' };

  const fieldWrap: React.CSSProperties = { minWidth: 0 };
  const rowGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' };

  return (
    <div style={{ width: '100%', background: '#FFFFFF', border: '1px solid #DFE7ED', borderRadius: '16px', boxShadow: '0 6px 22px -16px rgba(15,23,42,.22)', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #E8EEF2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', background: 'linear-gradient(180deg,#FFFFFF 0%,#FBFDFD 100%)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#EAF7F6', color: '#007680', border: '1px solid #C7E6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Briefcase size={18} strokeWidth={2.1} /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.04rem', fontWeight: 800, color: '#122033', margin: 0, letterSpacing: '-0.02em' }}>Engagement Audit Parameters</h3>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#007680', background: '#F0FAF9', border: '1px solid #CFE9E7', padding: '3px 7px', borderRadius: '999px', whiteSpace: 'nowrap' }}>Live Configuration</span>
            </div>
            <p data-ai-context="description" style={{ fontSize: '0.73rem', color: '#718096', margin: '3px 0 0', lineHeight: 1.35 }}>Define client details, testing period, currency and materiality scope for Journal Entry testing.</p>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F5FAFA', border: '1px solid #D5E9E8', borderRadius: '999px', padding: '7px 12px', flexShrink: 0 }}>
          <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#E4F4F3', color: '#007680', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.72rem' }}>#</span>
          <span data-ai-context="field" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', fontWeight: 800, color: '#24545A', letterSpacing: '0.025em' }}>{displayRunId}</span>
        </div>
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        <div style={rowGrid}>
          <div style={fieldWrap}>
            <label data-ai-context="label" style={labelStyle}>Client / Engagement Name</label>
            <div style={getContainerStyle('engagementName')}><div style={leftIconBoxStyle}><Building2 size={15} /></div><input type="text" style={inputStyle} value={parameters.engagementName || ''} onChange={e => update('engagementName', e.target.value)} onFocus={() => setFocusedField('engagementName')} onBlur={() => setFocusedField(null)} placeholder="e.g. Aayush Private Limited" disabled={!editable} /></div>
          </div>
          <div style={fieldWrap}>
            <label data-ai-context="label" style={labelStyle}>Engagement Audit Classification</label>
            <div style={{ ...getContainerStyle('engagementClassification'), position: 'relative' }}><div style={leftIconBoxStyle}><ShieldAlert size={15} /></div><select style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', paddingRight: '32px' }} value={parameters.engagementClassification || ''} onChange={e => update('engagementClassification', e.target.value)} onFocus={() => setFocusedField('engagementClassification')} onBlur={() => setFocusedField(null)} disabled={!editable}>{CLASSIFICATIONS.map(c => <option key={c} value={c === 'Select Audit Classification...' ? '' : c}>{c}</option>)}</select><ChevronDown size={14} color="#718096" style={{ position: 'absolute', right: '11px', pointerEvents: 'none' }} /></div>
          </div>
          <div style={fieldWrap}>
            <label data-ai-context="label" style={labelStyle}>Testing Period Start</label>
            <div style={getContainerStyle('startDate')}><div style={leftIconBoxStyle}><Calendar size={15} /></div><input type="text" style={inputStyle} value={parameters.startDate || ''} onChange={e => update('startDate', e.target.value)} onFocus={() => setFocusedField('startDate')} onBlur={() => setFocusedField(null)} placeholder="04/01/2025" disabled={!editable} /><Calendar size={14} color="#94A3B8" style={{ marginRight: '11px', flexShrink: 0 }} /></div>
          </div>
          <div style={fieldWrap}>
            <label data-ai-context="label" style={labelStyle}>Testing Period End</label>
            <div style={getContainerStyle('endDate')}><div style={leftIconBoxStyle}><Calendar size={15} /></div><input type="text" style={inputStyle} value={parameters.endDate || ''} onChange={e => update('endDate', e.target.value)} onFocus={() => setFocusedField('endDate')} onBlur={() => setFocusedField(null)} placeholder="03/31/2026" disabled={!editable} /><Calendar size={14} color="#94A3B8" style={{ marginRight: '11px', flexShrink: 0 }} /></div>
          </div>
        </div>

        <div style={{ ...rowGrid, marginTop: '12px' }}>
          <div style={fieldWrap}>
            <label data-ai-context="label" style={labelStyle}>Financial Year End</label>
            <div style={getContainerStyle('financialYearEnd')}><div style={leftIconBoxStyle}><ShieldCheck size={15} /></div><input type="text" style={inputStyle} value={parameters.financialYearEnd || ''} onChange={e => update('financialYearEnd', e.target.value)} onFocus={() => setFocusedField('financialYearEnd')} onBlur={() => setFocusedField(null)} placeholder="03/31/2026" disabled={!editable} /><Calendar size={14} color="#94A3B8" style={{ marginRight: '11px', flexShrink: 0 }} /></div>
          </div>
          <div style={fieldWrap}>
            <label data-ai-context="label" style={labelStyle}>Operating Currency</label>
            <div style={{ ...getContainerStyle('operatingCurrency'), position: 'relative' }}><div style={leftIconBoxStyle}><DollarSign size={15} /></div><select style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', paddingRight: '32px' }} value={parameters.operatingCurrency || 'INR'} onChange={e => update('operatingCurrency', e.target.value)} onFocus={() => setFocusedField('operatingCurrency')} onBlur={() => setFocusedField(null)} disabled={!editable}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select><ChevronDown size={14} color="#718096" style={{ position: 'absolute', right: '11px', pointerEvents: 'none' }} /></div>
          </div>
          <div style={fieldWrap}>
            <label data-ai-context="label" style={labelStyle}>Overall Materiality (Amount)</label>
            <div style={getContainerStyle('overallMateriality')}><div style={leftIconBoxStyle}><Tag size={15} /></div><input type="number" style={inputStyle} value={typeof parameters.overallMateriality === 'string' ? parseFloat(String(parameters.overallMateriality).replace(/[^0-9.-]+/g, '')) || '' : parameters.overallMateriality || ''} onChange={e => update('overallMateriality', e.target.value ? parseFloat(e.target.value) : '')} onFocus={() => setFocusedField('overallMateriality')} onBlur={() => setFocusedField(null)} placeholder="100000" disabled={!editable} /><span data-ai-context="metric" style={{ marginRight: '8px', padding: '3px 6px', background: '#F4F7F9', border: '1px solid #E3E9ED', borderRadius: '5px', fontSize: '0.64rem', fontWeight: 800, color: '#536274', letterSpacing: '0.04em', flexShrink: 0 }}>{currentCurrencyCode}</span></div>
          </div>
          <div style={fieldWrap}>
            <label data-ai-context="label" style={labelStyle}>Configuration Persistence</label>
            <div style={{ height: '42px', width: '100%', boxSizing: 'border-box', background: '#F3FAF9', border: '1px solid #BFE4E0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}><div style={{ width: '21px', height: '21px', borderRadius: '50%', background: '#007680', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={12} strokeWidth={3} /></div><div style={{ minWidth: 0, lineHeight: 1.1 }}><div style={{ fontSize: '0.71rem', fontWeight: 800, color: '#0A6268', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>All parameters saved live</div><div style={{ fontSize: '0.61rem', color: '#718096', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ready for step 2 verification</div></div></div>
              <Check size={16} color="#007680" style={{ flexShrink: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

