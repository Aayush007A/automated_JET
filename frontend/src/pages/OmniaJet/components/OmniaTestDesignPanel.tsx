import React, { useState } from 'react';
import { OmniaTestsConfig } from '../../../types';
import {
  Sliders, ShieldCheck, Search, Scale, Coins, UserCheck, Repeat, Clock,
  Sparkles, Calendar, Plus, X, Layers, AlertCircle
} from 'lucide-react';

interface OmniaTestDesignPanelProps {
  testsConfig: OmniaTestsConfig;
  onChange: (newConfig: OmniaTestsConfig) => void;
}

export const OmniaTestDesignPanel: React.FC<OmniaTestDesignPanelProps> = ({
  testsConfig,
  onChange,
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newSeldomAcc, setNewSeldomAcc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newRevAcc, setNewRevAcc] = useState('');

  const cfg = testsConfig || {};

  const handleToggle = (testKey: keyof OmniaTestsConfig) => {
    const current = cfg[testKey] || { enabled: true };
    onChange({
      ...cfg,
      [testKey]: {
        ...current,
        enabled: !current.enabled,
      },
    });
  };

  const handleUpdateParam = (testKey: keyof OmniaTestsConfig, field: string, value: any) => {
    const current = cfg[testKey] || { enabled: true };
    onChange({
      ...cfg,
      [testKey]: {
        ...current,
        [field]: value,
      },
    });
  };

  const handleAddChip = (testKey: keyof OmniaTestsConfig, field: string, value: string, setter: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const currentTest = cfg[testKey] || { enabled: true };
    const currentList: string[] = currentTest[field] || [];
    if (!currentList.includes(trimmed)) {
      onChange({
        ...cfg,
        [testKey]: {
          ...currentTest,
          [field]: [...currentList, trimmed],
        },
      });
    }
    setter('');
  };

  const handleRemoveChip = (testKey: keyof OmniaTestsConfig, field: string, value: string) => {
    const currentTest = cfg[testKey] || { enabled: true };
    const currentList: string[] = currentTest[field] || [];
    onChange({
      ...cfg,
      [testKey]: {
        ...currentTest,
        [field]: currentList.filter((x) => x !== value),
      },
    });
  };

  // Helper render function for custom toggle switch
  const renderToggle = (testKey: keyof OmniaTestsConfig, isEnabled: boolean) => (
    <button
      type="button"
      onClick={() => handleToggle(testKey)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px',
        background: isEnabled ? 'var(--deloitte-teal)' : '#CBD5E1',
        padding: '2px', transition: 'all 0.2s ease', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', flexShrink: 0
      }}
      title={isEnabled ? 'Test Enabled' : 'Test Disabled'}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF',
        transform: isEnabled ? 'translateX(18px)' : 'translateX(0)',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }} />
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Top Banner */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(0, 118, 128, 0.04) 0%, rgba(124, 58, 237, 0.03) 100%)',
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
            <Sliders size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Design Journal Entry Tests (Analytic Parameters)
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Configure test criteria for management override and fraud risk screening aligned with PCAOB & Omnia Audit Standards.
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: EXPECTED TO RUN (MANDATORY) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{
            padding: '3px 8px', borderRadius: '6px',
            background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
            fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em'
          }}>
            Mandatory
          </span>
          <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            1. Expected to Run (Fundamental Tests)
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '16px' }}>
          
          {/* Test 1: Seldom Used Accounts */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 118, 128, 0.08)', color: 'var(--deloitte-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Scale size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      1. Seldom Used Accounts
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Identifies entries to dormant or rarely posted GL accounts</span>
                  </div>
                </div>
                {renderToggle('seldomAccounts', cfg.seldomAccounts?.enabled !== false)}
              </div>

              <div style={{
                background: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9',
                padding: '8px 12px', fontSize: '0.74rem', color: '#475569', lineHeight: 1.35, marginBottom: '10px'
              }}>
                Target accounts with &le; 5 total transactions or &le; 1% total activity volume across the period.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Max Postings Threshold</label>
                  <input
                    type="number"
                    className="jet-input"
                    value={cfg.seldomAccounts?.thresholdCount ?? 5}
                    onChange={(e) => handleUpdateParam('seldomAccounts', 'thresholdCount', Number(e.target.value))}
                    style={{ fontSize: '0.80rem', marginTop: '3px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount Cutoff ($)</label>
                  <input
                    type="number"
                    className="jet-input"
                    value={cfg.seldomAccounts?.threshold ?? 0}
                    onChange={(e) => handleUpdateParam('seldomAccounts', 'threshold', Number(e.target.value))}
                    placeholder="0 (All amounts)"
                    style={{ fontSize: '0.80rem', marginTop: '3px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.seldomAccounts?.rationale || 'Flag accounts with <= 5 postings for management override testing.'}
                onChange={(e) => handleUpdateParam('seldomAccounts', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

          {/* Test 2: Suspect Keywords Scan */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.08)', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Search size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      2. Suspect Keywords Scan
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Scans journal entry header and line item descriptions</span>
                  </div>
                </div>
                {renderToggle('keywords', cfg.keywords?.enabled !== false)}
              </div>

              {/* Quick Add Keyword Row */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input
                  type="text"
                  className="jet-input"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddChip('keywords', 'keywordList', newKeyword, setNewKeyword); }}
                  placeholder="e.g. plug, test, error, reverse, manual, audit..."
                  style={{ fontSize: '0.80rem', flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleAddChip('keywords', 'keywordList', newKeyword, setNewKeyword)}
                  className="btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={13} /> Add
                </button>
              </div>

              {/* Chips Container */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '5px',
                minHeight: '36px', maxHeight: '42px', overflowY: 'auto',
                marginBottom: '10px'
              }}>
                {((cfg.keywords?.keywordList && cfg.keywords.keywordList.length > 0)
                  ? cfg.keywords.keywordList
                  : ['plug', 'fudge', 'error', 'fraud', 'manual', 'true up', 'adjust', 'audit']
                ).map((kw: string) => (
                  <span
                    key={kw}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 7px', borderRadius: '6px',
                      background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECDD3',
                      fontSize: '0.72rem', fontWeight: 700
                    }}
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip('keywords', 'keywordList', kw)}
                      style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.keywords?.rationale || 'High-risk keyword filtering on line item description text.'}
                onChange={(e) => handleUpdateParam('keywords', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2: EXPECTED TO CONSIDER (RECOMMENDED) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{
            padding: '3px 8px', borderRadius: '6px',
            background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
            fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em'
          }}>
            Recommended
          </span>
          <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            2. Expected to Consider (Core Behavioral Tests)
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '16px' }}>
          
          {/* Test 3: Closing Entries */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.08)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      3. Closing & Post-Closing Entries
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entries posted near or after fiscal period close</span>
                  </div>
                </div>
                {renderToggle('closingEntries', cfg.closingEntries?.enabled !== false)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days Before Cutoff</label>
                  <input
                    type="number"
                    className="jet-input"
                    value={cfg.closingEntries?.daysBefore ?? 5}
                    onChange={(e) => handleUpdateParam('closingEntries', 'daysBefore', Number(e.target.value))}
                    style={{ fontSize: '0.80rem', marginTop: '3px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days After Cutoff</label>
                  <input
                    type="number"
                    className="jet-input"
                    value={cfg.closingEntries?.daysAfter ?? 15}
                    onChange={(e) => handleUpdateParam('closingEntries', 'daysAfter', Number(e.target.value))}
                    style={{ fontSize: '0.80rem', marginTop: '3px' }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px' }}>
                Flags adjustments created within window of financial year-end cutoff date.
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.closingEntries?.rationale || 'Target post-closing adjustments made after fiscal year-end.'}
                onChange={(e) => handleUpdateParam('closingEntries', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

          {/* Test 4: Unusual Accounts */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.08)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Layers size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      4. Unusual Account Combinations
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Identifies rarely paired debit/credit accounts in same entry</span>
                  </div>
                </div>
                {renderToggle('unusualAccounts', cfg.unusualAccounts?.enabled !== false)}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Historical Combination Threshold</label>
                <input
                  type="number"
                  className="jet-input"
                  value={cfg.unusualAccounts?.thresholdCount ?? 3}
                  onChange={(e) => handleUpdateParam('unusualAccounts', 'thresholdCount', Number(e.target.value))}
                  placeholder="3"
                  style={{ fontSize: '0.80rem', marginTop: '3px' }}
                />
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px' }}>
                Flags transactions where account pairings occur &le; threshold times during the audit period.
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.unusualAccounts?.rationale || 'Unusual debit/credit combinations across non-routine accounting flows.'}
                onChange={(e) => handleUpdateParam('unusualAccounts', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

          {/* Test 5: Round Amounts & Repeating Digits */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.08)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Coins size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      5. Round Amounts & Repeating Digits
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Exact thousands, millions, and patterns e.g. $9,999</span>
                  </div>
                </div>
                {renderToggle('roundAmounts', cfg.roundAmounts?.enabled !== false)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Min Amount Cutoff ($)</label>
                  <input
                    type="number"
                    className="jet-input"
                    value={cfg.roundAmounts?.threshold ?? 1000}
                    onChange={(e) => handleUpdateParam('roundAmounts', 'threshold', Number(e.target.value))}
                    style={{ fontSize: '0.80rem', marginTop: '3px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Multiples Monitored</label>
                  <input
                    type="text"
                    className="jet-input"
                    value="1k, 10k, 100k, 1M"
                    disabled
                    style={{ fontSize: '0.80rem', marginTop: '3px', background: '#F8FAFC', color: '#64748B' }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px' }}>
                Detects manual estimate padding or authorization limit structuring (e.g. $4,999).
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.roundAmounts?.rationale || 'Screening round dollar numbers and repeating digit estimates.'}
                onChange={(e) => handleUpdateParam('roundAmounts', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

          {/* Test 6: Duplicate Entries */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Repeat size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      6. Duplicate Transaction Entries
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Same Amount + Same Account + Same Effective Date</span>
                  </div>
                </div>
                {renderToggle('duplicateEntries', cfg.duplicateEntries?.enabled !== false)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Occurrences Cutoff</label>
                  <input
                    type="number"
                    className="jet-input"
                    value={cfg.duplicateEntries?.countThreshold ?? 2}
                    onChange={(e) => handleUpdateParam('duplicateEntries', 'countThreshold', Number(e.target.value))}
                    style={{ fontSize: '0.80rem', marginTop: '3px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Min Amount ($)</label>
                  <input
                    type="number"
                    className="jet-input"
                    value={cfg.duplicateEntries?.amountThreshold ?? 500}
                    onChange={(e) => handleUpdateParam('duplicateEntries', 'amountThreshold', Number(e.target.value))}
                    style={{ fontSize: '0.80rem', marginTop: '3px' }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px' }}>
                Identifies duplicate line postings indicative of duplicate invoicing or processing errors.
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.duplicateEntries?.rationale || 'Identify potential duplicate journal entries or erroneous re-postings.'}
                onChange={(e) => handleUpdateParam('duplicateEntries', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: ADDITIONAL TESTS (SUPPLEMENTARY) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{
            padding: '3px 8px', borderRadius: '6px',
            background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE',
            fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em'
          }}>
            Supplementary
          </span>
          <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            3. Additional Tests (Specific Risk Drivers)
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          
          {/* Test 7: Dates of Interest */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      7. Dates of Interest / Weekends
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Holiday & weekend postings</span>
                  </div>
                </div>
                {renderToggle('datesOfInterest', cfg.datesOfInterest?.enabled !== false)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  id="chkWeekends"
                  checked={cfg.datesOfInterest?.checkWeekends !== false}
                  onChange={(e) => handleUpdateParam('datesOfInterest', 'checkWeekends', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="chkWeekends" style={{ fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#1E293B' }}>
                  Flag Saturday & Sunday Postings
                </label>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px' }}>
                Highlights postings made on non-business days without active supervisor presence.
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.datesOfInterest?.rationale || 'Transactions posted on weekends or bank holidays.'}
                onChange={(e) => handleUpdateParam('datesOfInterest', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

          {/* Test 8: Debits to Revenue */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.08)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Coins size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      8. Debits to Revenue
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Anomalous revenue reductions</span>
                  </div>
                </div>
                {renderToggle('debitsToRevenue', cfg.debitsToRevenue?.enabled !== false)}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Min Debit Amount Cutoff ($)</label>
                <input
                  type="number"
                  className="jet-input"
                  value={cfg.debitsToRevenue?.threshold ?? 0}
                  onChange={(e) => handleUpdateParam('debitsToRevenue', 'threshold', Number(e.target.value))}
                  placeholder="0 (All debits to revenue)"
                  style={{ fontSize: '0.80rem', marginTop: '3px' }}
                />
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px' }}>
                Flags abnormal debits to income statement revenue accounts (income smoothing / fraud).
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.debitsToRevenue?.rationale || 'Debit adjustments reducing reported revenue balances.'}
                onChange={(e) => handleUpdateParam('debitsToRevenue', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

          {/* Test 9: Users of Interest */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.08)', color: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      9. Monitored Users
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Users with &le; 3 postings</span>
                  </div>
                </div>
                {renderToggle('usersOfInterest', cfg.usersOfInterest?.enabled !== false)}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Few Postings Threshold</label>
                <input
                  type="number"
                  className="jet-input"
                  value={cfg.usersOfInterest?.fewPostingsThreshold ?? 3}
                  onChange={(e) => handleUpdateParam('usersOfInterest', 'fewPostingsThreshold', Number(e.target.value))}
                  placeholder="3"
                  style={{ fontSize: '0.80rem', marginTop: '3px' }}
                />
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px' }}>
                Identifies executive management or non-accounting personnel making sporadic postings.
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.usersOfInterest?.rationale || 'Senior management or users posting fewer than 3 times annually.'}
                onChange={(e) => handleUpdateParam('usersOfInterest', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 4: STATISTICAL & SAMPLING ANALYTICS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{
            padding: '3px 8px', borderRadius: '6px',
            background: 'var(--deloitte-teal-light)', color: 'var(--deloitte-teal)', border: '1px solid rgba(0,118,128,0.2)',
            fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em'
          }}>
            Statistical
          </span>
          <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            4. Population Analytics & Control Sampling
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '16px' }}>
          
          {/* Benford's Law */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '260px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 118, 128, 0.08)', color: 'var(--deloitte-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Benford's Law First-Digit Analysis
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Automated logarithmic conformity scoring</span>
                  </div>
                </div>
                {renderToggle('benfordAnalysis', cfg.benfordAnalysis?.enabled !== false)}
              </div>

              <div style={{
                background: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9',
                padding: '10px 12px', fontSize: '0.74rem', color: '#475569', lineHeight: 1.45, marginBottom: '10px'
              }}>
                Calculates empirical first-digit distribution vs. log theoretical frequencies. Flags anomalies with &gt; 4.0% variance.
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.benfordAnalysis?.rationale || "Benford's Law first-digit mathematical distribution analysis."}
                onChange={(e) => handleUpdateParam('benfordAnalysis', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

          {/* Control Sampling */}
          <div style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '260px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Random Control Population Sample
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Representative audit sample (Seed: 42)</span>
                  </div>
                </div>
                {renderToggle('controlSample', cfg.controlSample?.enabled !== false)}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sample Size (Lines)</label>
                <input
                  type="number"
                  className="jet-input"
                  value={cfg.controlSample?.sampleCount ?? 25}
                  onChange={(e) => handleUpdateParam('controlSample', 'sampleCount', Number(e.target.value))}
                  placeholder="25"
                  style={{ fontSize: '0.80rem', marginTop: '3px' }}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              <label style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audit Rationale</label>
              <input
                type="text"
                className="jet-input"
                value={cfg.controlSample?.rationale || 'Representative random control sample across entire journal population.'}
                onChange={(e) => handleUpdateParam('controlSample', 'rationale', e.target.value)}
                style={{ fontSize: '0.78rem', marginTop: '3px', width: '100%' }}
              />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
