import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Tag, Download, CheckSquare, Square, AlertCircle, ShieldAlert, Sparkles, Check, ChevronDown, Copy, CheckCheck, Info } from 'lucide-react';

export interface FlaggedEntry {
  Journal_Entry_Number?: string | number;
  Journal_Number?: string | number;
  DocumentNo?: string | number;
  document_no?: string | number;
  journal_number?: string | number;
  Effective_Date?: string;
  Date_Effective?: string;
  Date_Posted?: string;
  date_effective?: string;
  date_posted?: string;
  Account_Number?: string | number;
  account_number?: string | number;
  Account_Description?: string;
  account_description?: string;
  Financial_Statement_Line?: string;
  Net_Amount?: number | string;
  Net_Amount_EC?: number | string;
  net_amount_ec?: number | string;
  Amount?: number | string;
  amount?: number | string;
  Entity_Currency?: string;
  entity_currency?: string;
  Debit_Amount?: number | string;
  Credit_Amount?: number | string;
  User_ID_Entered?: string;
  User_ID?: string;
  userid_entered?: string;
  user_id?: string;
  User_Name_Entered?: string;
  User_Name?: string;
  user_name_entered?: string;
  user_name?: string;
  Entry_Description?: string;
  Line_Description?: string;
  Header_Description?: string;
  journal_header_description?: string;
  journal_line_description?: string;
  Flagged_Tests?: string;
  flagged_tests?: string;
  Risk_Score?: string;
  Risk_Level?: string;
  risk_level?: string;
  Flagged_Reasons?: string;
  Flag_Reasons?: string;
  Tickmarked_Status?: string;
  [key: string]: any;
}

interface OmniaFlaggedEntriesTableProps {
  entries: FlaggedEntry[];
  onViewDetails: (entry: FlaggedEntry) => void;
  onCreateTickmark: (selectedEntries: FlaggedEntry[]) => void;
  currencyCode?: string;
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

export const OmniaFlaggedEntriesTable: React.FC<OmniaFlaggedEntriesTableProps> = ({
  entries,
  onViewDetails,
  onCreateTickmark,
  currencyCode = 'USD',
}) => {
  const [search, setSearch] = useState('');
  const [testFilter, setTestFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);
  const pageSize = 50;

  // Extract distinct test names from entries
  const distinctTests = useMemo(() => {
    const testSet = new Set<string>();
    entries.forEach((e) => {
      const rawTests = e.Flagged_Tests || e.flagged_tests || '';
      const tests = String(rawTests).split(/[,;]/);
      tests.forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) testSet.add(trimmed);
      });
    });
    return Array.from(testSet).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Risk Filter
      const risk = String(e.Risk_Level || e.Risk_Score || e.risk_level || 'MEDIUM').toUpperCase();
      if (riskFilter !== 'ALL' && risk !== riskFilter) {
        return false;
      }

      // Test Filter
      const tests = String(e.Flagged_Tests || e.flagged_tests || '');
      if (testFilter !== 'ALL' && !tests.toLowerCase().includes(testFilter.toLowerCase())) {
        return false;
      }

      // Search Filter
      if (search) {
        const term = search.toLowerCase();
        const docNo = String(e.Journal_Number || e.Journal_Entry_Number || e.DocumentNo || e.document_no || '').toLowerCase();
        const acc = String(e.Account_Number || e.account_number || '').toLowerCase();
        const desc = String(e.Account_Description || e.account_description || '').toLowerCase();
        const user = String(e.User_ID || e.User_ID_Entered || e.User_Name || e.User_Name_Entered || '').toLowerCase();
        const reason = String(e.Flag_Reasons || e.Flagged_Reasons || '').toLowerCase();

        return (
          docNo.includes(term) ||
          acc.includes(term) ||
          desc.includes(term) ||
          user.includes(term) ||
          reason.includes(term) ||
          tests.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [entries, riskFilter, testFilter, search]);

  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, page]);

  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedEntries.length && paginatedEntries.length > 0) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set<string>();
      paginatedEntries.forEach((e, idx) => {
        const id = String(e.Journal_Number || e.Journal_Entry_Number || e.DocumentNo || idx);
        newSet.add(id);
      });
      setSelectedIds(newSet);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleTriggerTickmark = () => {
    const selected = entries.filter((e, idx) => {
      const id = String(e.Journal_Number || e.Journal_Entry_Number || e.DocumentNo || idx);
      return selectedIds.has(id);
    });
    onCreateTickmark(selected);
  };

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return;
    const headers = Object.keys(filteredEntries[0]);
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map((row) =>
        headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Omnia_Flagged_Exceptions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyDoc = (doc: string) => {
    navigator.clipboard.writeText(doc);
    setCopiedDoc(doc);
    setTimeout(() => setCopiedDoc(null), 2000);
  };

  const getRiskBadge = (score?: string) => {
    const s = String(score || 'MEDIUM').toUpperCase();
    if (s === 'HIGH') {
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '999px',
          background: '#FEF2F2',
          color: '#DC2626',
          border: '1px solid #FECDD3',
          fontSize: '0.68rem',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626' }} />
          HIGH
        </span>
      );
    }
    if (s === 'LOW') {
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '999px',
          background: '#EFF6FF',
          color: '#2563EB',
          border: '1px solid #BFDBFE',
          fontSize: '0.68rem',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }} />
          LOW
        </span>
      );
    }
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '999px',
        background: '#FFFBEB',
        color: '#D97706',
        border: '1px solid #FDE68A',
        fontSize: '0.68rem',
        fontWeight: 800,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap'
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} />
        MEDIUM
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      
      {/* Search & Filter Controls Toolbar */}
      <div style={{
        padding: '10px 14px',
        background: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
          {/* Quick Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filter by doc #, account, user, description..."
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: '12px',
                fontSize: '0.80rem',
                height: '32px',
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>

          {/* Risk Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                paddingLeft: '10px',
                paddingRight: '28px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#1E293B',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                height: '32px',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
            <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Test Category Filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={testFilter}
              onChange={(e) => { setTestFilter(e.target.value); setPage(1); }}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                paddingLeft: '10px',
                paddingRight: '28px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#1E293B',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                height: '32px',
                maxWidth: '200px',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Flagged Tests</option>
              {distinctTests.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedIds.size > 0 && (
            <button
              onClick={handleTriggerTickmark}
              className="btn-primary"
              style={{
                fontSize: '0.76rem',
                padding: '4px 12px',
                background: '#007680',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: '32px',
              }}
            >
              <Tag size={12} /> +Tickmark ({selectedIds.size})
            </button>
          )}

          <button
            onClick={handleExportCSV}
            style={{
              fontSize: '0.76rem',
              padding: '4px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              color: '#334155',
              fontWeight: 650,
              cursor: 'pointer',
              height: '32px',
            }}
          >
            <Download size={13} /> Export CSV ({filteredEntries.length})
          </button>
        </div>
      </div>

      {/* Flagged Exceptions Table Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1, minHeight: 0 }}>
          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left', minWidth: '960px' }}>
            <thead>
              <tr style={{
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                position: 'sticky',
                top: 0,
                zIndex: 2,
                color: '#475569',
                fontSize: '0.70rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                <th style={{ width: '36px', padding: '9px 10px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={paginatedEntries.length > 0 && selectedIds.size === paginatedEntries.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ width: '75px', padding: '9px 10px' }}>Risk</th>
                <th style={{ width: '105px', padding: '9px 10px' }}>Doc / JE #</th>
                <th style={{ width: '85px', padding: '9px 10px' }}>Date</th>
                <th style={{ width: '140px', padding: '9px 10px' }}>GL Account</th>
                <th style={{ width: '120px', padding: '9px 10px', textAlign: 'right' }}>Net Amount</th>
                <th style={{ width: '110px', padding: '9px 10px' }}>User / Preparer</th>
                <th style={{ width: '160px', padding: '9px 10px' }}>Flagged Tests</th>
                <th style={{ minWidth: '150px', padding: '9px 10px' }}>Audit Reason</th>
                <th style={{ width: '65px', padding: '9px 10px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={24} color="#CBD5E1" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>No flagged exception entries match the current filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((e, idx) => {
                  const docVal = String(e.Journal_Number || e.Journal_Entry_Number || e.DocumentNo || e.document_no || e.doc_no || '--');
                  const id = docVal !== '--' ? docVal : String(idx);
                  const isSelected = selectedIds.has(id);
                  
                  const rawTests = e.Flagged_Tests || e.flagged_tests || '';
                  const tests = String(rawTests).split(/[,;]/).map((t) => t.trim()).filter(Boolean);

                  const rawAmt = e.Net_Amount_EC ?? e.Net_Amount ?? e.net_amount_ec ?? e.Amount ?? e.amount ?? 0;
                  const netAmt = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt || '0').replace(/,/g, ''));
                  const rowCurrency = e.Entity_Currency || e.entity_currency || currencyCode;

                  const riskVal = e.Risk_Level || e.Risk_Score || e.risk_level || 'MEDIUM';
                  const dateVal = e.Date_Effective || e.Effective_Date || e.date_effective || e.Date_Posted || e.date_posted || '--';
                  const accNumVal = e.Account_Number || e.account_number || e.G_L || e.gl || '--';
                  const accDescVal = e.Account_Description || e.account_description || e.Description || e.description || '';
                  const userIdVal = e.User_ID || e.User_ID_Entered || e.userid_entered || e.user_id || '--';
                  const userNameVal = e.User_Name || e.User_Name_Entered || e.user_name_entered || e.user_name || '';
                  const reasonsVal = e.Flag_Reasons || e.Flagged_Reasons || e.reasons || e.reason || '--';

                  // Compact test pills: show first 2 tests + "+N more" badge
                  const visibleTests = tests.slice(0, 2);
                  const hiddenTestCount = tests.length - 2;

                  return (
                    <tr
                      key={id + '-' + idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isSelected ? 'rgba(0, 118, 128, 0.05)' : (idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF'),
                        transition: 'background 0.12s ease'
                      }}
                      onMouseEnter={(el) => { if (!isSelected) el.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={(el) => { if (!isSelected) el.currentTarget.style.background = idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF'; }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Risk Badge */}
                      <td style={{ padding: '7px 10px' }}>
                        {getRiskBadge(riskVal)}
                      </td>

                      {/* Doc / JE # with Copy icon */}
                      <td style={{ padding: '7px 10px', fontWeight: 750, color: '#0F172A', fontFamily: 'monospace' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>{docVal}</span>
                          {docVal !== '--' && (
                            <button
                              type="button"
                              onClick={() => handleCopyDoc(docVal)}
                              title="Copy Journal Number"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '1px',
                                color: copiedDoc === docVal ? '#16A34A' : '#94A3B8',
                                display: 'inline-flex'
                              }}
                            >
                              {copiedDoc === docVal ? <CheckCheck size={11} /> : <Copy size={11} />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Effective Date */}
                      <td style={{ padding: '7px 10px', color: '#475569', whiteSpace: 'nowrap', fontSize: '0.76rem' }}>
                        {dateVal}
                      </td>

                      {/* Account */}
                      <td style={{ padding: '7px 10px' }}>
                        <div style={{ fontWeight: 750, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {accNumVal}
                        </div>
                        {accDescVal && (
                          <div style={{ fontSize: '0.70rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={accDescVal}>
                            {accDescVal}
                          </div>
                        )}
                      </td>

                      {/* Net Amount */}
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.70rem', color: '#64748B', marginRight: '3px' }}>{rowCurrency}</span>
                        {netAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* User / Preparer */}
                      <td style={{ padding: '7px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.76rem' }}>{userIdVal}</div>
                        {userNameVal && (
                          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{userNameVal}</div>
                        )}
                      </td>

                      {/* Flagged Tests Horizontal Pills */}
                      <td style={{ padding: '7px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px' }}>
                          {visibleTests.map((t) => {
                            const st = getTestBadgeStyle(t);
                            return (
                              <span
                                key={t}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: st.bg,
                                  color: st.text,
                                  border: `1px solid ${st.border}`,
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}
                                title={t}
                              >
                                {t}
                              </span>
                            );
                          })}
                          {hiddenTestCount > 0 && (
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#F1F5F9',
                                color: '#475569',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                cursor: 'help',
                                whiteSpace: 'nowrap'
                              }}
                              title={tests.slice(2).join(', ')}
                            >
                              +{hiddenTestCount} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Audit Reason */}
                      <td style={{ padding: '7px 10px', maxWidth: '220px', fontSize: '0.72rem', color: '#475569' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={reasonsVal}>
                          {reasonsVal}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onViewDetails(e)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: '#F0F9FA',
                            border: '1px solid rgba(0, 118, 128, 0.25)',
                            color: '#007680',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(el) => { el.currentTarget.style.background = '#007680'; el.currentTarget.style.color = '#FFFFFF'; }}
                          onMouseLeave={(el) => { el.currentTarget.style.background = '#F0F9FA'; el.currentTarget.style.color = '#007680'; }}
                          title="Open Full Audit Modal"
                        >
                          <Eye size={11} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div style={{
          padding: '10px 16px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: '#64748B'
        }}>
          <div>
            Showing <strong>{paginatedEntries.length}</strong> of <strong>{filteredEntries.length.toLocaleString()}</strong> exceptions
            {selectedIds.size > 0 && <span style={{ color: '#007680', fontWeight: 700 }}> • {selectedIds.size} selected</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '3px 10px',
                fontSize: '0.72rem',
                fontWeight: 650,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '5px',
                color: page <= 1 ? '#94A3B8' : '#1E293B',
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '3px 10px',
                fontSize: '0.72rem',
                fontWeight: 650,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '5px',
                color: page >= totalPages ? '#94A3B8' : '#1E293B',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
