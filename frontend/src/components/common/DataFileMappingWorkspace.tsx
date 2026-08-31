import React, { useState, useMemo, useEffect } from 'react';
import {
  Table, Database, FileSpreadsheet, ArrowRight, CheckCircle2, AlertCircle,
  Search, Filter, Sparkles, RefreshCw, HelpCircle, Check, Eye, ChevronRight
} from 'lucide-react';
import { FieldMappingItem } from '../../types';
import { StatusBadge } from './StatusBadge';

export interface DatasetMappingConfig {
  key: 'tb' | 'gl' | 'coa';
  title: string;
  shortName: string;
  sourceHeaders: string[];
  mappings: FieldMappingItem[];
  onChangeMapping: (standardField: string, newSourceField: string) => void;
  rowCount?: number;
}

interface DataFileMappingWorkspaceProps {
  datasets: DatasetMappingConfig[];
  onProceed?: () => void;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const findBestMatchingSourceHeader = (standardField: string, sourceHeaders: string[]): string => {
  if (!sourceHeaders || sourceHeaders.length === 0) return '';
  const stdNorm = normalize(standardField);

  // Exact match (case insensitive)
  const exact = sourceHeaders.find(h => normalize(h) === stdNorm);
  if (exact) return exact;

  // Well-known standard field aliases dictionary
  const ALIASES: Record<string, string[]> = {
    // GL / General Ledger fields
    'glaccountnumber': ['glaccount', 'glaccountnumber', 'glacct', 'gl', 'account', 'accountnumber', 'acct', 'hkont', 'saknr', 'general_ledger_account'],
    'documentnumber': ['documentnumber', 'documentno', 'docno', 'docnumber', 'document', 'belnr', 'voucherno', 'entryno', 'transno', 'journal_entry_id'],
    'postingdate': ['postingdate', 'pstngdate', 'budat', 'date', 'postdate', 'glpostdate', 'trandate', 'effdate', 'effectivedate', 'entry_date'],
    'documentdate': ['documentdate', 'docdate', 'bldat', 'entrydate', 'invoicedate'],
    'amountinlocalcurrency': ['amountinlocalcurrency', 'localcurrencyamount', 'localamount', 'amount', 'dmbtr', 'wrbtr', 'netamount', 'transamount', 'amt', 'monetary_amount'],
    'enteredamount': ['enteredamount', 'amount', 'wrbtr', 'dmbtr', 'netamount', 'monetaryamount'],
    'userid': ['userid', 'username', 'user', 'usnam', 'createdby', 'enteredby', 'author', 'operator', 'user_id'],
    'transactiontype': ['transactiontype', 'transtype', 'doctype', 'documenttype', 'blart', 'type', 'category', 'trans_type'],
    'entrydescription': ['entrydescription', 'description', 'narrative', 'sgtxt', 'bktxt', 'lineitemtext', 'memo', 'headertext', 'entry_desc'],
    'debit': ['debit', 'debitamount', 'shkzg_s', 'd_amount', 'dr', 'd', 'debit_val'],
    'credit': ['credit', 'creditamount', 'shkzg_h', 'c_amount', 'cr', 'c', 'credit_val'],
    'debitcreditindicator': ['debitcreditindicator', 'shkzg', 'dc', 'drcr', 'indicator', 'type_dc', 'dc_ind'],
    'localcurrency': ['localcurrency', 'waers', 'currency', 'currcode', 'curr', 'h_waers', 'cur'],
    'period': ['period', 'postingperiod', 'monat', 'fiscalperiod', 'month', 'posting_period'],
    'fiscalyear': ['fiscalyear', 'year', 'gjahr', 'fy', 'fiscal_yr'],
    'referencenumber': ['referencenumber', 'reference', 'xblnr', 'refno', 'ref', 'ref_num'],

    // TB / Trial Balance fields
    'financialstatementcategory': ['financialstatementcategory', 'fscategory', 'category', 'fsline', 'statementcategory', 'accounttype', 'fs_category'],
    'startingbalance': ['startingbalance', 'openingbalance', 'openbalance', 'begbalance', 'initialbalance', 'startbalance', 'opening_bal'],
    'endingbalance': ['endingbalance', 'closingbalance', 'closebalance', 'endbalance', 'finalbalance', 'balance', 'closing_bal'],
    'netactivity': ['netactivity', 'activity', 'movement', 'netmovement', 'periodactivity', 'turnover', 'net_act'],

    // COA / Chart of Accounts fields
    'accountdescription': ['accountdescription', 'accountname', 'acctdesc', 'acctname', 'description', 'txt20', 'txt50', 'account_desc'],
  };

  const aliases = ALIASES[stdNorm] || [];
  for (const alias of aliases) {
    const matched = sourceHeaders.find(h => normalize(h) === alias);
    if (matched) return matched;
  }

  // Substring inclusion match
  const sub = sourceHeaders.find(h => {
    const hNorm = normalize(h);
    return (hNorm.length > 2 && stdNorm.includes(hNorm)) || (stdNorm.length > 2 && hNorm.includes(stdNorm));
  });
  if (sub) return sub;

  return '';
};

export const DataFileMappingWorkspace: React.FC<DataFileMappingWorkspaceProps> = ({
  datasets,
  onProceed,
}) => {
  const [activeTab, setActiveTab] = useState<'tb' | 'gl' | 'coa'>(datasets[0]?.key || 'tb');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'REQUIRED' | 'OPTIONAL' | 'UNMAPPED'>('ALL');

  const currentDataset = datasets.find((d) => d.key === activeTab) || datasets[0];
  const hasAutoMappedRef = React.useRef<Record<string, boolean>>({});

  // Auto-pick unmapped columns when headers are detected
  const handleAutoMapCurrentDataset = () => {
    if (!currentDataset || !currentDataset.sourceHeaders || currentDataset.sourceHeaders.length === 0) return;
    currentDataset.mappings.forEach((m) => {
      if (!m.sourceField) {
        const best = findBestMatchingSourceHeader(m.standardField, currentDataset.sourceHeaders);
        if (best) {
          currentDataset.onChangeMapping(m.standardField, best);
        }
      }
    });
  };

  // Run auto-pick at most once per tab when source headers are first available
  useEffect(() => {
    if (!currentDataset || !currentDataset.sourceHeaders || currentDataset.sourceHeaders.length === 0) return;
    if (hasAutoMappedRef.current[activeTab]) return;

    hasAutoMappedRef.current[activeTab] = true;
    handleAutoMapCurrentDataset();
  }, [activeTab, currentDataset?.sourceHeaders?.length]);

  const {
    totalFields,
    matchedCount,
    requiredCount,
    requiredMatchedCount,
    optionalCount,
    unmappedCount,
  } = useMemo(() => {
    if (!currentDataset) {
      return {
        totalFields: 0,
        matchedCount: 0,
        requiredCount: 0,
        requiredMatchedCount: 0,
        optionalCount: 0,
        unmappedCount: 0,
      };
    }
    const mappings = currentDataset.mappings;
    const matched = mappings.filter((m) => !!m.sourceField).length;
    const req = mappings.filter((m) => m.requirementLevel === 'Required' || m.required).length;
    const reqMatched = mappings.filter((m) => (m.requirementLevel === 'Required' || m.required) && !!m.sourceField).length;
    const opt = mappings.length - req;
    const unmapped = mappings.filter((m) => !m.sourceField).length;

    return {
      totalFields: mappings.length,
      matchedCount: matched,
      requiredCount: req,
      requiredMatchedCount: reqMatched,
      optionalCount: opt,
      unmappedCount: unmapped,
    };
  }, [currentDataset]);

  const filteredMappings = useMemo(() => {
    if (!currentDataset) return [];
    return currentDataset.mappings.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.standardField.toLowerCase().includes(q) ||
        item.sourceField.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.guidance && item.guidance.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === 'REQUIRED') return item.requirementLevel === 'Required' || item.required;
      if (filterType === 'OPTIONAL') return item.requirementLevel === 'Optional' || (!item.required && item.requirementLevel !== 'Required');
      if (filterType === 'UNMAPPED') return !item.sourceField;

      return true;
    });
  }, [currentDataset, searchQuery, filterType]);

  const percentMapped = totalFields > 0 ? Math.round((matchedCount / totalFields) * 100) : 0;

  return (
    <div style={{ width: '100%', paddingBottom: '24px' }}>
      {/* Category Tab Switcher Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#FFFFFF',
        padding: '12px 18px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '16px'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {datasets.map((ds) => {
            const isActive = ds.key === activeTab;
            const dsMatched = ds.mappings.filter((m) => !!m.sourceField).length;
            const dsTotal = ds.mappings.length;
            const isAllMatched = dsMatched >= dsTotal && dsTotal > 0;

            return (
              <button
                key={ds.key}
                type="button"
                className="smooth-tab-btn"
                onClick={() => {
                  setActiveTab(ds.key);
                  setSearchQuery('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: isActive ? '1.5px solid var(--deloitte-teal)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'var(--deloitte-teal-light)' : '#F8FAFC',
                  color: isActive ? 'var(--deloitte-teal)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 6px rgba(0, 118, 128, 0.12)' : 'none'
                }}
              >
                <Table size={15} color={isActive ? 'var(--deloitte-teal)' : 'var(--text-muted)'} />
                <span>{ds.title}</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '12px',
                  background: isAllMatched ? 'rgba(5, 150, 105, 0.12)' : '#E2E8F0',
                  color: isAllMatched ? '#059669' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {dsMatched}/{dsTotal}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Progress & Auto-Pick Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="smooth-tab-btn"
            onClick={handleAutoMapCurrentDataset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#F0FDFA',
              border: '1px solid #CCFBF1',
              color: '#007680',
              fontSize: '0.76rem',
              fontWeight: 750,
              cursor: 'pointer',
            }}
            title="Auto-match and pick columns based on Deloitte intelligent naming schema"
          >
            <Sparkles size={13} color="#007680" />
            <span>Auto-Pick Columns</span>
          </button>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Active File Mapping:
          </span>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '16px', background: 'rgba(5, 150, 105, 0.1)',
            color: '#059669', fontSize: '0.78rem', fontWeight: 800, fontFamily: 'var(--font-mono)'
          }}>
            <CheckCircle2 size={14} />
            {percentMapped}% MAPPED
          </div>
        </div>
      </div>

      {/* Main Mapping Table Panel with Smooth Tab Transition */}
      <div key={activeTab} className="glass-panel tab-panel-anim" style={{ padding: '24px 28px', background: '#FFFFFF', marginBottom: '20px' }}>
        {/* Header with Title and Search/Filter Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '18px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {currentDataset?.title} Column Mapping
              </h3>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                background: '#F1F5F9', color: 'var(--text-secondary)'
              }}>
                {currentDataset?.sourceHeaders?.length || 0} Source Headers Detected
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              Assign source columns to the standard Deloitte CDM schema. Mandatory fields are highlighted with <span style={{ color: 'var(--deloitte-teal)', fontWeight: 700 }}>Required</span>.
            </p>
          </div>

          {/* Search & Filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search standard/source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  outline: 'none',
                  background: '#FFFFFF'
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              {[
                { key: 'ALL', label: `All (${totalFields})` },
                { key: 'REQUIRED', label: `Required (${requiredCount})` },
                { key: 'OPTIONAL', label: `Optional (${optionalCount})` },
                { key: 'UNMAPPED', label: `Unmapped (${unmappedCount})` },
              ].map((flt) => (
                <button
                  key={flt.key}
                  type="button"
                  onClick={() => setFilterType(flt.key as any)}
                  style={{
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: filterType === flt.key ? 800 : 600,
                    cursor: 'pointer',
                    background: filterType === flt.key ? '#FFFFFF' : 'transparent',
                    color: filterType === flt.key ? 'var(--deloitte-teal)' : 'var(--text-secondary)',
                    boxShadow: filterType === flt.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {flt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mappings Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="jet-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ width: '25%', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  STANDARD FIELD NAME
                </th>
                <th style={{ width: '4%', textAlign: 'center' }}></th>
                <th style={{ width: '28%', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  MAPPED SOURCE COLUMN
                </th>
                <th style={{ width: '12%', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  DATA TYPE
                </th>
                <th style={{ width: '21%', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  DESCRIPTION & GUIDANCE
                </th>
                <th style={{ width: '10%', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    No fields match the active filter or search query.
                  </td>
                </tr>
              ) : (
                filteredMappings.map((item) => {
                  const isReq = item.requirementLevel === 'Required' || item.required;
                  const isMatched = !!item.sourceField;

                  return (
                    <tr
                      key={item.standardField}
                      className="smooth-row"
                      style={{
                        background: !isMatched && isReq ? 'rgba(254, 242, 242, 0.4)' : '#FFFFFF'
                      }}
                    >
                      {/* Standard Field */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-primary)'
                          }}>
                            {item.standardField}
                          </span>

                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isReq ? 'rgba(0, 118, 128, 0.08)' : '#F1F5F9',
                            color: isReq ? 'var(--deloitte-teal)' : 'var(--text-muted)',
                            whiteSpace: 'nowrap'
                          }}>
                            {isReq ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </td>

                      {/* Arrow */}
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        <ArrowRight size={14} />
                      </td>

                      {/* Source Column Dropdown */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <select
                            className="jet-select"
                            value={item.sourceField || ''}
                            onChange={(e) => currentDataset.onChangeMapping(item.standardField, e.target.value)}
                            style={{
                              fontSize: '0.8rem',
                              padding: '5px 8px',
                              height: '32px',
                              width: '100%',
                              borderColor: isMatched ? 'var(--border-subtle)' : (isReq ? 'rgba(225, 29, 72, 0.4)' : 'var(--border-subtle)'),
                              background: isMatched ? '#FFFFFF' : '#FEF2F2'
                            }}
                          >
                            <option value="">-- Select Source Column --</option>
                            {currentDataset.sourceHeaders.map((hdr) => (
                              <option key={hdr} value={hdr}>
                                {hdr}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Data Type */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {item.fieldType || 'STRING'}
                        </span>
                      </td>

                      {/* Description & Guidance */}
                      <td>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                          {item.description || item.guidance || 'Standard general ledger field for data reconciliation'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        {isMatched ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.70rem',
                            fontWeight: 750,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: '#F0FDF4',
                            color: '#166534',
                            border: '1px solid #BBF7D0'
                          }}>
                            <Check size={12} color="#16A34A" /> Mapped
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.70rem',
                            fontWeight: 750,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: isReq ? '#FFF1F2' : '#F8FAFC',
                            color: isReq ? '#9F1239' : '#64748B',
                            border: isReq ? '1px solid #FECDD3' : '1px solid #E2E8F0'
                          }}>
                            {isReq ? 'Required' : 'Unmapped'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
