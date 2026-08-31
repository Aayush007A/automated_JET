import React, { useState } from 'react';
import {
  Building2, Calendar, ShieldCheck, Hash, DollarSign, Tag, ShieldAlert,
  Edit3, Check, X
} from 'lucide-react';

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

export const EngagementAuditParametersCard: React.FC<EngagementAuditParametersCardProps> = ({
  parameters,
  onChange,
  runId,
  editable = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EngagementAuditParametersData>({ ...parameters });

  const formatCurrency = (val: number | string) => {
    if (val === '' || val === undefined || val === null) return '—';
    const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, '')) : val;
    if (isNaN(num) || num === 0) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: parameters.operatingCurrency || 'USD',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange({ ...formData });
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData({ ...parameters });
    setIsEditing(false);
  };

  const items = [
    {
      id: 'engagementName',
      label: 'ENGAGEMENT NAME',
      val: parameters.engagementName || '—',
      isUnset: !parameters.engagementName,
      icon: Building2,
      accent: '#007680',
      bg: '#F0FDFA',
    },
    {
      id: 'startDate',
      label: 'START DATE',
      val: parameters.startDate || '—',
      isUnset: !parameters.startDate,
      icon: Calendar,
      accent: '#0284C7',
      bg: '#F0F9FF',
    },
    {
      id: 'endDate',
      label: 'END DATE',
      val: parameters.endDate || '—',
      isUnset: !parameters.endDate,
      icon: Calendar,
      accent: '#0284C7',
      bg: '#F0F9FF',
    },
    {
      id: 'financialYearEnd',
      label: 'FINANCIAL YEAR END',
      val: parameters.financialYearEnd || '—',
      isUnset: !parameters.financialYearEnd,
      icon: ShieldCheck,
      accent: '#6366F1',
      bg: '#EEF2FF',
    },
    {
      id: 'engagementRunId',
      label: 'ENGAGEMENT RUN ID',
      val: parameters.engagementRunId || runId || '—',
      isUnset: !parameters.engagementRunId && !runId,
      icon: Hash,
      accent: '#7C3AED',
      bg: '#FAF5FF',
    },
    {
      id: 'operatingCurrency',
      label: 'OPERATING CURRENCY',
      val: parameters.operatingCurrency || '—',
      isUnset: !parameters.operatingCurrency,
      icon: DollarSign,
      accent: '#059669',
      bg: '#ECFDF5',
    },
    {
      id: 'overallMateriality',
      label: 'OVERALL MATERIALITY',
      val: formatCurrency(parameters.overallMateriality),
      isUnset: !parameters.overallMateriality,
      icon: Tag,
      accent: '#D97706',
      bg: '#FFFBEB',
    },
    {
      id: 'engagementClassification',
      label: 'ENGAGEMENT CLASSIFICATION',
      val: parameters.engagementClassification || '—',
      isUnset: !parameters.engagementClassification,
      icon: ShieldAlert,
      accent: '#007680',
      bg: '#F0FDFA',
    },
  ];

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        boxShadow: '0 2px 10px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        marginBottom: '20px',
      }}
    >
      {/* Header Section with Title + Edit Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '14px',
          borderBottom: '1px solid #F1F5F9',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, rgba(0, 118, 128, 0.12) 0%, rgba(0, 77, 84, 0.06) 100%)',
              color: '#007680',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0, 118, 128, 0.20)',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3
              style={{
                fontSize: '1.02rem',
                fontWeight: 800,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Engagement Audit Parameters
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500 }}>
              Client engagement metadata, testing boundary dates, currency, and materiality scope.
            </span>
          </div>
        </div>

        {editable && !isEditing && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setFormData({ ...parameters });
              setIsEditing(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#F8FAFC',
              color: '#007680',
              border: '1px solid #E2E8F0',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#F0FDFA';
              e.currentTarget.style.borderColor = '#99F6E4';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
          >
            <Edit3 size={13} />
            <span>Edit Parameters</span>
          </button>
        )}
      </div>

      {/* Main Grid: Clean, high-contrast parameter cards matching Image 2 (4x2 on desktop) */}
      {!isEditing ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
          }}
        >
          {items.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: '#64748B',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <IconComponent size={12} color={item.accent} />
                  <span>{item.label}</span>
                </div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: item.isUnset ? 500 : 700,
                    color: item.isUnset ? '#94A3B8' : '#0F172A',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontStyle: item.isUnset ? 'italic' : 'normal',
                  }}
                  title={String(item.val)}
                >
                  {item.val}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Inline Quick Edit Form (Never Refreshes) */
        <form onSubmit={handleSave}>
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Engagement Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                Engagement / Client Name
              </label>
              <input
                type="text"
                className="jet-input"
                value={formData.engagementName}
                onChange={(e) => setFormData({ ...formData, engagementName: e.target.value })}
                placeholder="Enter Client / Engagement Name"
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}
              />
            </div>

            {/* Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                Start Date (DD-MMM-YYYY)
              </label>
              <input
                type="text"
                className="jet-input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                placeholder="e.g. 01-Apr-2025"
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                End Date (DD-MMM-YYYY)
              </label>
              <input
                type="text"
                className="jet-input"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                placeholder="e.g. 31-Mar-2026"
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}
              />
            </div>

            {/* Financial Year End */}
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                Financial Year End
              </label>
              <input
                type="text"
                className="jet-input"
                value={formData.financialYearEnd}
                onChange={(e) => setFormData({ ...formData, financialYearEnd: e.target.value })}
                placeholder="e.g. 31-Mar"
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}
              />
            </div>

            {/* Operating Currency */}
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                Operating Currency
              </label>
              <select
                className="jet-input"
                value={formData.operatingCurrency}
                onChange={(e) => setFormData({ ...formData, operatingCurrency: e.target.value })}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}
              >
                <option value="">Select Currency...</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
                <option value="SGD">SGD ($) - Singapore Dollar</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
              </select>
            </div>

            {/* Overall Materiality */}
            <div>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                Overall Materiality ($)
              </label>
              <input
                type="number"
                className="jet-input"
                value={typeof formData.overallMateriality === 'string' ? parseFloat(formData.overallMateriality.replace(/[^0-9.-]+/g, '')) || '' : formData.overallMateriality || ''}
                onChange={(e) => setFormData({ ...formData, overallMateriality: e.target.value ? parseFloat(e.target.value) : '' })}
                placeholder="e.g. 500000"
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}
              />
            </div>

            {/* Engagement Classification */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                Engagement Audit Classification
              </label>
              <select
                className="jet-input"
                value={formData.engagementClassification}
                onChange={(e) => setFormData({ ...formData, engagementClassification: e.target.value })}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '7px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}
              >
                <option value="">Select Audit Classification...</option>
                <option value="Tier 1 Key Audit Engagement">Tier 1 Key Audit Engagement</option>
                <option value="Public Listed Entity / PCAOB AS 2401">Public Listed Entity / PCAOB AS 2401</option>
                <option value="Standard Statutory Audit">Standard Statutory Audit</option>
                <option value="Internal Audit Review">Internal Audit Review</option>
              </select>
            </div>
          </div>

          {/* Form Actions (Save / Cancel) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '6px 16px',
                borderRadius: '7px',
                border: 'none',
                background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
                color: '#FFFFFF',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0, 118, 128, 0.20)',
              }}
            >
              <Check size={13} /> Save Parameters
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
