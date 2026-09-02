import React, { useState } from 'react';
import { OmniaExclusions } from '../../../types';
import { Filter, Trash2, Plus, ShieldCheck, CheckCircle2, Sparkles, X } from 'lucide-react';

interface OmniaExclusionsPanelProps {
  exclusions: OmniaExclusions;
  onChange: (newExclusions: OmniaExclusions) => void;
  totalRawLines: number;
}

export const OmniaExclusionsPanel: React.FC<OmniaExclusionsPanelProps> = ({
  exclusions,
  onChange,
  totalRawLines,
}) => {
  const [newSysType, setNewSysType] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newEntryType, setNewEntryType] = useState('');
  const [newUser, setNewUser] = useState('');

  const systemEntryTypes = exclusions.systemEntryTypes || [];
  const excludedAccounts = exclusions.excludedAccounts || [];
  const excludedEntryTypes = exclusions.excludedEntryTypes || [];
  const excludedUsers = exclusions.excludedUsers || [];
  const rationales = exclusions.rationales || {};

  const handleToggleZero = (val: boolean) => {
    onChange({
      ...exclusions,
      excludeZeroLines: val,
    });
  };

  const handleAddChip = (field: 'systemEntryTypes' | 'excludedAccounts' | 'excludedEntryTypes' | 'excludedUsers', value: string, setter: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = exclusions[field] || [];
    if (!current.includes(trimmed)) {
      onChange({
        ...exclusions,
        [field]: [...current, trimmed],
      });
    }
    setter('');
  };

  const handleRemoveChip = (field: 'systemEntryTypes' | 'excludedAccounts' | 'excludedEntryTypes' | 'excludedUsers', value: string) => {
    const current = exclusions[field] || [];
    onChange({
      ...exclusions,
      [field]: current.filter((x) => x !== value),
    });
  };

  const handleUpdateRationale = (key: string, text: string) => {
    onChange({
      ...exclusions,
      rationales: {
        ...rationales,
        [key]: text,
      },
    });
  };

  const totalExclusionFilters = (exclusions.excludeZeroLines ? 1 : 0) + systemEntryTypes.length + excludedAccounts.length + excludedEntryTypes.length + excludedUsers.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Top Banner with Refinement Guidance */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(0, 118, 128, 0.04) 0%, rgba(37, 99, 235, 0.03) 100%)',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'var(--deloitte-teal)', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Filter size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Refine Data – Audit Population Exclusions
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Exclude non-fraud routine or system-generated transactions from the active testing population as per audit methodology.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '5px 12px',
            borderRadius: '8px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            fontSize: '0.76rem',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            Raw Population: <span style={{ color: '#0F172A', fontWeight: 800 }}>{totalRawLines.toLocaleString()} Lines</span>
          </div>
          <div style={{
            padding: '5px 12px',
            borderRadius: '8px',
            background: 'var(--deloitte-teal-light)',
            border: '1px solid rgba(0,118,128,0.2)',
            fontSize: '0.76rem',
            fontWeight: 700,
            color: 'var(--deloitte-teal)'
          }}>
            Active Exclusions: <span style={{ fontWeight: 850 }}>{totalExclusionFilters} Rules</span>
          </div>
        </div>
      </div>

      {/* Symmetrical 2x2 Exclusion Categories Grid with Equal Card Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Zero-Value Lines */}
        <div style={{
          padding: '18px 20px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '275px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 118, 128, 0.08)', color: 'var(--deloitte-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    1. Zero-Value Lines ($0 Net Amount)
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Omit non-financial header & memo balancing lines</span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => handleToggleZero(!exclusions.excludeZeroLines)}
                style={{
                  width: '40px', height: '22px', borderRadius: '11px',
                  background: exclusions.excludeZeroLines ? 'var(--deloitte-teal)' : '#CBD5E1',
                  padding: '2px', transition: 'all 0.2s ease', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', flexShrink: 0
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF',
                  transform: exclusions.excludeZeroLines ? 'translateX(18px)' : 'translateX(0)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>

            {/* Content body with matching height */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #F1F5F9',
              padding: '12px 14px',
              fontSize: '0.76rem',
              color: '#475569',
              lineHeight: 1.45,
              marginBottom: '12px',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: '2px' }}>
                Status: {exclusions.excludeZeroLines ? '✓ Zero-Value Lines Filtered' : '○ Zero Lines Included in Scope'}
              </div>
              <div>
                Statistical records, placeholder headers, and $0 net adjustments are filtered prior to parametric fraud tests.
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
            <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Audit Documentation Rationale
            </label>
            <input
              type="text"
              className="jet-input"
              value={rationales.zeroLines || 'Omit zero dollar header lines and statistical balances from fraud testing.'}
              onChange={(e) => handleUpdateRationale('zeroLines', e.target.value)}
              placeholder="Explain rationale for excluding zero dollar entries..."
              style={{ fontSize: '0.80rem', marginTop: '4px', width: '100%' }}
            />
          </div>
        </div>

        {/* Card 2: System or Recurring Entries */}
        <div style={{
          padding: '18px 20px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '275px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    2. System & Recurring Document Types
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Exclude automated amortizations, payroll, depreciation</span>
                </div>
              </div>

              <span style={{
                fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                background: systemEntryTypes.length > 0 ? '#EFF6FF' : '#F1F5F9',
                color: systemEntryTypes.length > 0 ? '#1D4ED8' : '#64748B',
                border: systemEntryTypes.length > 0 ? '1px solid #BFDBFE' : '1px solid #E2E8F0'
              }}>
                {systemEntryTypes.length} Excluded
              </span>
            </div>

            {/* Quick Add Row */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <input
                type="text"
                className="jet-input"
                value={newSysType}
                onChange={(e) => setNewSysType(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddChip('systemEntryTypes', newSysType, setNewSysType); }}
                placeholder="e.g. AMORT, PAYROLL, DEPR..."
                style={{ fontSize: '0.80rem', flex: 1 }}
              />
              <button
                type="button"
                onClick={() => handleAddChip('systemEntryTypes', newSysType, setNewSysType)}
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {/* Chips Container */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '5px',
              minHeight: '40px', maxHeight: '48px', overflowY: 'auto',
              marginBottom: '12px', padding: '2px 0'
            }}>
              {systemEntryTypes.length === 0 ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', alignSelf: 'center' }}>
                  No document types excluded (all types in scope).
                </span>
              ) : (
                systemEntryTypes.map((type) => (
                  <span
                    key={type}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 7px', borderRadius: '6px',
                      background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                      fontSize: '0.72rem', fontWeight: 700
                    }}
                  >
                    {type}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip('systemEntryTypes', type)}
                      style={{ border: 'none', background: 'transparent', color: '#1D4ED8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
            <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Audit Documentation Rationale
            </label>
            <input
              type="text"
              className="jet-input"
              value={rationales.systemEntries || 'Automated recurring system batch entries with standardized calculation controls.'}
              onChange={(e) => handleUpdateRationale('systemEntries', e.target.value)}
              placeholder="Reason for excluding these system document types..."
              style={{ fontSize: '0.80rem', marginTop: '4px', width: '100%' }}
            />
          </div>
        </div>

        {/* Card 3: Specific Routine Accounts */}
        <div style={{
          padding: '18px 20px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '275px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Filter size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    3. Specific Routine Accounts
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Omit intercompany clearing, treasury, equity reserve</span>
                </div>
              </div>

              <span style={{
                fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                background: excludedAccounts.length > 0 ? '#F5F3FF' : '#F1F5F9',
                color: excludedAccounts.length > 0 ? '#6D28D9' : '#64748B',
                border: excludedAccounts.length > 0 ? '1px solid #DDD6FE' : '1px solid #E2E8F0'
              }}>
                {excludedAccounts.length} Excluded
              </span>
            </div>

            {/* Quick Add Row */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <input
                type="text"
                className="jet-input"
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddChip('excludedAccounts', newAccount, setNewAccount); }}
                placeholder="e.g. 109000, 300100, IC_CLEAR..."
                style={{ fontSize: '0.80rem', flex: 1 }}
              />
              <button
                type="button"
                onClick={() => handleAddChip('excludedAccounts', newAccount, setNewAccount)}
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {/* Chips Container */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '5px',
              minHeight: '40px', maxHeight: '48px', overflowY: 'auto',
              marginBottom: '12px', padding: '2px 0'
            }}>
              {excludedAccounts.length === 0 ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', alignSelf: 'center' }}>
                  No GL accounts excluded (all accounts in scope).
                </span>
              ) : (
                excludedAccounts.map((acc) => (
                  <span
                    key={acc}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 7px', borderRadius: '6px',
                      background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE',
                      fontSize: '0.72rem', fontWeight: 700
                    }}
                  >
                    {acc}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip('excludedAccounts', acc)}
                      style={{ border: 'none', background: 'transparent', color: '#6D28D9', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
            <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Audit Documentation Rationale
            </label>
            <input
              type="text"
              className="jet-input"
              value={rationales.accounts || 'Routine intercompany and treasury settlement accounts tested through alternative procedures.'}
              onChange={(e) => handleUpdateRationale('accounts', e.target.value)}
              placeholder="Reason for excluding these GL accounts..."
              style={{ fontSize: '0.80rem', marginTop: '4px', width: '100%' }}
            />
          </div>
        </div>

        {/* Card 4: Automated System Users */}
        <div style={{
          padding: '18px 20px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '275px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.08)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    4. Automated Batch Users / Preparers
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Exclude certified robotic automated system IDs</span>
                </div>
              </div>

              <span style={{
                fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                background: excludedUsers.length > 0 ? '#FEF3C7' : '#F1F5F9',
                color: excludedUsers.length > 0 ? '#B45309' : '#64748B',
                border: excludedUsers.length > 0 ? '1px solid #FDE68A' : '1px solid #E2E8F0'
              }}>
                {excludedUsers.length} Excluded
              </span>
            </div>

            {/* Quick Add Row */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <input
                type="text"
                className="jet-input"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddChip('excludedUsers', newUser, setNewUser); }}
                placeholder="e.g. AUTOSYS, BATCH_JOB, SAP_SYS..."
                style={{ fontSize: '0.80rem', flex: 1 }}
              />
              <button
                type="button"
                onClick={() => handleAddChip('excludedUsers', newUser, setNewUser)}
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {/* Chips Container */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '5px',
              minHeight: '40px', maxHeight: '48px', overflowY: 'auto',
              marginBottom: '12px', padding: '2px 0'
            }}>
              {excludedUsers.length === 0 ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', alignSelf: 'center' }}>
                  No preparers excluded (all users tested).
                </span>
              ) : (
                excludedUsers.map((u) => (
                  <span
                    key={u}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 7px', borderRadius: '6px',
                      background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A',
                      fontSize: '0.72rem', fontWeight: 700
                    }}
                  >
                    {u}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip('excludedUsers', u)}
                      style={{ border: 'none', background: 'transparent', color: '#B45309', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
            <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Audit Documentation Rationale
            </label>
            <input
              type="text"
              className="jet-input"
              value={rationales.users || 'System interface automated IDs verified under IT General Controls (ITGC) review.'}
              onChange={(e) => handleUpdateRationale('users', e.target.value)}
              placeholder="Reason for excluding these automated user IDs..."
              style={{ fontSize: '0.80rem', marginTop: '4px', width: '100%' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
