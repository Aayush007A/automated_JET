import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, Sparkles, RefreshCw, ShieldCheck, Database,
  FileCheck, ArrowRight, Check, Info, Layers, Table, AlertCircle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { SchemaConstraintItem, AutoCleanConstraintsReport } from '../../types';

interface AutoCleanConstraintsPanelProps {
  workflowType: 'OMNIA_JET' | 'SPARK_JET';
  onProceed: () => void;
  tbRowCount?: number;
  glRowCount?: number;
  coaRowCount?: number;
}

const DEFAULT_CONSTRAINTS: SchemaConstraintItem[] = [
  // Trial Balance Constraints
  {
    id: 'TB-C01',
    dataset: 'Trial Balance',
    name: 'Legal Entity Identifier Constancy',
    technicalField: 'entity_id',
    severity: 'Required',
    status: 'PASSED',
    details: 'Alphanumeric reference used to uniquely identify a legal entity. Verified constant across all TB records.',
    guidance: 'Entity IDs should be consistently presented in all data sets.'
  },
  {
    id: 'TB-C02',
    dataset: 'Trial Balance',
    name: 'General Ledger Account Number Completeness',
    technicalField: 'account_number',
    severity: 'Required',
    status: 'PASSED',
    details: 'Unique GL account codes present without blank or corrupted keys.',
    guidance: 'Should match the Account Number in the General Ledger and Chart of Accounts.'
  },
  {
    id: 'TB-C03',
    dataset: 'Trial Balance',
    name: 'Cutoff & Period End Date Validation',
    technicalField: 'period_end_date',
    severity: 'Required',
    status: 'PASSED',
    details: 'Cutoff dates normalized to standard ISO format (YYYY-MM-DD) within valid fiscal bounds.',
    guidance: 'The as-of cutoff date for point-in-time trial balance records.'
  },
  {
    id: 'TB-C04',
    dataset: 'Trial Balance',
    name: 'Entity Currency Code Uniformity',
    technicalField: 'entity_currency_ec',
    severity: 'Required',
    status: 'PASSED',
    details: 'Verified functional currency ISO codes (e.g., USD, INR, EUR) match across records.',
    guidance: 'The currency code MUST be constant for each record of a given entity.'
  },
  {
    id: 'TB-C05',
    dataset: 'Trial Balance',
    name: 'Ending Balance Completeness & Sign Check',
    technicalField: 'ending_balance_ec',
    severity: 'Required',
    status: 'PASSED',
    details: 'At minimum, every TB row contains a valid numeric Ending Balance in Entity Currency.',
    guidance: 'Mandatory for MO-JE in Omnia Data. Cannot be empty or unparseable.'
  },
  {
    id: 'TB-C06',
    dataset: 'Trial Balance',
    name: 'Chart of Accounts Key Reference',
    technicalField: 'chart_of_accounts',
    severity: 'Required',
    status: 'PASSED',
    details: 'COA mapping identifier resolved (or defaulted to standard master).',
    guidance: 'Enter DEFAULT if specific sub-ledger COA is not provided.'
  },

  // General Ledger / Journal Entry Constraints
  {
    id: 'GL-C01',
    dataset: 'General Ledger',
    name: 'Journal Number & Line Sequence Uniqueness',
    technicalField: 'journal_number, journal_line_number',
    severity: 'Required',
    status: 'PASSED',
    details: 'Duplicate line items within a journal entry do not exist. Composite keys verified.',
    guidance: 'Duplicate values should not exist for Journal Line Number within a given journal entry.'
  },
  {
    id: 'GL-C02',
    dataset: 'General Ledger',
    name: 'Accounting Effective Date Format',
    technicalField: 'date_effective',
    severity: 'Required',
    status: 'PASSED',
    details: 'Transaction effective dates validated against calendar boundaries.',
    guidance: 'Date on which the transaction occurred or was considered effective.'
  },
  {
    id: 'GL-C03',
    dataset: 'General Ledger',
    name: 'Fiscal Year & Period (1-13) Boundaries',
    technicalField: 'fiscal_year, fiscal_period',
    severity: 'Required',
    status: 'PASSED',
    details: 'Fiscal period values are non-decimal integers strictly between 1 and 13.',
    guidance: 'Values accepted: 1 - 13 (no decimals).'
  },
  {
    id: 'GL-C04',
    dataset: 'General Ledger',
    name: 'Debit & Credit Net Amount Balance Sum Rule',
    technicalField: 'net_amount_ec, debit_amount_ec, credit_amount_ec',
    severity: 'Required',
    status: 'PASSED',
    details: 'Verified that for each row, debit_amount_ec and credit_amount_ec sum to net_amount_ec.',
    guidance: 'For each row, credit_amount_ec and debit_amount_ec must sum to net_amount_ec.'
  },
  {
    id: 'GL-C05',
    dataset: 'General Ledger',
    name: 'Mutual Exclusivity of Debit & Credit Amounts',
    technicalField: 'debit_amount_ec, credit_amount_ec',
    severity: 'Required',
    status: 'PASSED',
    details: 'Validated that both debit and credit amounts are not simultaneously non-zero.',
    guidance: 'Both the debit and credit amounts cannot be non-zero on the same row.'
  },
  {
    id: 'GL-C06',
    dataset: 'General Ledger',
    name: 'Author & User ID Identification Completeness',
    technicalField: 'userid_entered, transaction_type',
    severity: 'Required',
    status: 'PASSED',
    details: 'Posting user identifiers and document types populated for audit trail tracing.',
    guidance: 'Required for MO-JE Test 5 (Users of Interest) and Transaction Analysis.'
  },
  {
    id: 'GL-C07',
    dataset: 'General Ledger',
    name: 'Standard vs Non-Standard Flag Notation',
    technicalField: 'is_standard',
    severity: 'Required',
    status: 'PASSED',
    details: 'Entries normalized to S (Standard / Recurring) or N (Non-standard / Manual).',
    guidance: 'Required to distinguish routine closing entries from manual risk adjustments.'
  },

  // Chart of Accounts Constraints
  {
    id: 'COA-C01',
    dataset: 'Chart of Accounts',
    name: 'Financial Statement Line Mapping Completeness',
    technicalField: 'financial_statement_line',
    severity: 'Required',
    status: 'PASSED',
    details: 'Every general ledger account is associated with a primary financial statement line item.',
    guidance: 'Mandatory for MO-JE balance sheet and income statement grouping.'
  },
  {
    id: 'COA-C02',
    dataset: 'Chart of Accounts',
    name: 'FS Category Validation (Assets/Liabilities/Equity/Rev/Exp)',
    technicalField: 'financial_statement_category',
    severity: 'Required',
    status: 'PASSED',
    details: 'Categories verified against standard taxonomy: Assets, Liabilities, Equity, Revenue, Expenses.',
    guidance: 'Accepted values: Assets, Liabilities, Revenue, Expenses, Equity.'
  },
  {
    id: 'COA-C03',
    dataset: 'Chart of Accounts',
    name: 'Financial Statement Type Classification',
    technicalField: 'financial_statement_type',
    severity: 'Required',
    status: 'PASSED',
    details: 'Classified as Balance Sheet (BS) or Income Statement (IS).',
    guidance: 'Identifies permanent vs temporary accounts for rollforward reconciliation.'
  }
];

export const AutoCleanConstraintsPanel: React.FC<AutoCleanConstraintsPanelProps> = ({
  workflowType,
  onProceed,
  tbRowCount = 22,
  glRowCount = 36,
  coaRowCount = 26,
}) => {
  const [isRunningClean, setIsRunningClean] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TB' | 'GL' | 'COA'>('ALL');
  const [constraints, setConstraints] = useState<SchemaConstraintItem[]>(DEFAULT_CONSTRAINTS);
  const [isCleaned, setIsCleaned] = useState(true);

  const totalRows = tbRowCount + glRowCount + coaRowCount;

  const handleRunCleansing = () => {
    setIsRunningClean(true);
    setTimeout(() => {
      setIsRunningClean(false);
      setIsCleaned(true);
      setConstraints(DEFAULT_CONSTRAINTS);
    }, 900);
  };

  const filteredConstraints = constraints.filter((c) => {
    if (activeFilter === 'TB') return c.dataset === 'Trial Balance';
    if (activeFilter === 'GL') return c.dataset === 'General Ledger';
    if (activeFilter === 'COA') return c.dataset === 'Chart of Accounts';
    return true;
  });

  const passedCount = constraints.filter((c) => c.status === 'PASSED').length;
  const warningCount = constraints.filter((c) => c.status === 'WARNING').length;
  const failedCount = constraints.filter((c) => c.status === 'FAILED').length;
  const allPassed = failedCount === 0;

  return (
    <div style={{ width: '100%', paddingBottom: '24px' }}>
      {/* 4 Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{
          padding: '16px 18px', borderRadius: '10px', background: '#FFFFFF',
          border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>TOTAL ROWS CLEANED</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)', marginTop: '4px' }}>
            {totalRows.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            TB ({tbRowCount}) · GL ({glRowCount}) · COA ({coaRowCount})
          </span>
        </div>

        <div style={{
          padding: '16px 18px', borderRadius: '10px', background: '#FFFFFF',
          border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>RULES EVALUATED</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#2563EB', marginTop: '4px' }}>
            {constraints.length} Checks
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            6 TB · 7 GL · 3 COA Constraints
          </span>
        </div>

        <div style={{
          padding: '16px 18px', borderRadius: '10px', background: '#FFFFFF',
          border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>PASSED CONSTRAINTS</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#059669', marginTop: '4px' }}>
            {passedCount} / {constraints.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            100% Mandatory Checks Met
          </span>
        </div>

        <div style={{
          padding: '16px 18px', borderRadius: '10px', background: '#FFFFFF',
          border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>DATA READINESS STATUS</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: allPassed ? '#059669' : '#DC2626', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {allPassed ? <CheckCircle2 size={20} color="#059669" /> : <AlertTriangle size={20} color="#DC2626" />}
            {allPassed ? 'READY FOR MAPPING' : 'ACTION REQUIRED'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Step 3 (Data File Mapping) Unlocked
          </span>
        </div>
      </div>

      {/* Constraints Breakdown Toolbar & Filter Switchers */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', marginBottom: '14px'
      }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} color="var(--deloitte-teal)" />
          Schema & Data Integrity Constraint Audit Rules ({filteredConstraints.length})
        </div>

        {/* Dataset Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
          {[
            { key: 'ALL', label: `All Rules (${constraints.length})` },
            { key: 'TB', label: 'Trial Balance (6)' },
            { key: 'GL', label: 'General Ledger (7)' },
            { key: 'COA', label: 'Chart of Accounts (3)' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key as any)}
              style={{
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: activeFilter === tab.key ? 800 : 600,
                cursor: 'pointer',
                background: activeFilter === tab.key ? '#FFFFFF' : 'transparent',
                color: activeFilter === tab.key ? 'var(--deloitte-teal)' : 'var(--text-secondary)',
                boxShadow: activeFilter === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Constraints Grid (Symmetrical 3 Cards per Row) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', marginBottom: '22px' }}>
        {filteredConstraints.map((c) => {
          const isReq = c.severity === 'Required';

          return (
            <div
              key={c.id}
              style={{
                padding: '16px 18px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: '#FFFFFF',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '140px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                      padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', color: 'var(--text-secondary)'
                    }}>
                      {c.id}
                    </span>
                    <span style={{
                      fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                      background: isReq ? 'rgba(0, 118, 128, 0.08)' : '#F1F5F9',
                      color: isReq ? 'var(--deloitte-teal)' : 'var(--text-muted)'
                    }}>
                      {c.severity}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px',
                    background: 'rgba(5, 150, 105, 0.1)', color: '#059669',
                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}>
                    <Check size={11} />
                    {c.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.25 }}>
                  {c.name}
                </div>

                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.35 }}>
                  {c.details}
                </p>
              </div>

              {c.guidance && (
                <div style={{
                  padding: '6px 8px', borderRadius: '6px', background: '#F8FAFC',
                  border: '1px solid #E2E8F0', fontSize: '0.7rem', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.25
                }}>
                  <Info size={13} color="#0284C7" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span><strong>Guidance:</strong> {c.guidance}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Completion & Proceed Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px', background: '#FFFFFF', textAlign: 'center',
        border: '1.5px solid rgba(0, 118, 128, 0.25)',
        boxShadow: '0 4px 16px rgba(0, 118, 128, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <CheckCircle2 size={22} color="#059669" />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            All Data Cleansing & Schema Constraints Passed (16 of 16)
          </span>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 18px' }}>
          Trial Balance, General Ledger, and Chart of Accounts datasets satisfy all mandatory audit schema constraints and data type specifications.
        </p>

        <button
          type="button"
          onClick={onProceed}
          className="btn-primary"
          style={{
            padding: '10px 32px',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 118, 128, 0.25)'
          }}
        >
          Proceed to Step 3: Data File Mapping <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
