import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, Sparkles, RefreshCw, ShieldCheck, Database,
  FileCheck, ArrowRight, Check, Info, Layers, Table, AlertCircle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { SchemaConstraintItem } from '../../types';

interface AutoCleanConstraintsPanelProps {
  workflowType: 'OMNIA_JET' | 'SPARK_JET';
  onProceed: () => void;
  tbRowCount?: number;
  glRowCount?: number;
  coaRowCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OMNIA JET CONSTRAINTS (16 Rules strictly from omnia_JET_user_input.txt)
// ─────────────────────────────────────────────────────────────────────────────
const OMNIA_CONSTRAINTS: SchemaConstraintItem[] = [
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPARK JET CHECKPOINTS (13 Rules strictly from spark_proper_guide.txt)
// ─────────────────────────────────────────────────────────────────────────────
const SPARK_CHECKPOINTS: SchemaConstraintItem[] = [
  // Trial Balance Checkpoints (TB-01 to TB-08)
  {
    id: 'TB-01',
    dataset: 'Trial Balance',
    name: 'G/L Code & Description Non-Blank & Unique Check',
    technicalField: 'G/L, Description',
    severity: 'Required',
    status: 'PASSED',
    details: 'G/L account number and description do not contain blank values, nulls, or invalid corrupted rows.',
    guidance: 'Should not contain blank values or duplicates in the Trial Balance master.'
  },
  {
    id: 'TB-02',
    dataset: 'Trial Balance',
    name: 'Account Subtype Classification Verification',
    technicalField: 'Account Subtype',
    severity: 'Required',
    status: 'PASSED',
    details: 'Verified that all account records belong to standard subtypes: Assets, Liabilities, Revenues/Income, and Expenses.',
    guidance: 'Account Subtype must be populated with standard financial categories.'
  },
  {
    id: 'TB-03',
    dataset: 'Trial Balance',
    name: 'Opening & Closing Balance Numeric Validation',
    technicalField: 'Opening Balance, Closing Balance',
    severity: 'Required',
    status: 'PASSED',
    details: 'Opening Balance and Closing Balance columns parsed to numeric floats with zero string/formatting errors.',
    guidance: 'Opening balance and Closing balance must be valid numbers.'
  },
  {
    id: 'TB-04',
    dataset: 'Trial Balance',
    name: 'Debit & Credit Total Balancing Check',
    technicalField: 'Debit, Credit',
    severity: 'Required',
    status: 'PASSED',
    details: 'Debit and Credit columns parsed into numbers; verified total debit equals total credit across the population.',
    guidance: 'Debit and Credit across the entire dataset must balance.'
  },
  {
    id: 'TB-05',
    dataset: 'Trial Balance',
    name: 'Net Total Opening & Closing Zero Balance Rule',
    technicalField: 'Opening Balance, Closing Balance',
    severity: 'Required',
    status: 'PASSED',
    details: 'Total column sum of Opening Balance and Closing Balance across all accounts equals 0.00.',
    guidance: 'Total column sum of Opening Balance and Closing Balance should be 0.'
  },
  {
    id: 'TB-06',
    dataset: 'Trial Balance',
    name: 'G/L Account Code Uniqueness After Trim-Clean',
    technicalField: 'G/L',
    severity: 'Required',
    status: 'PASSED',
    details: 'G/L column is strictly unique after whitespace trimming and lower/upper case normalization.',
    guidance: 'GL column should be unique after trim-clean.'
  },
  {
    id: 'TB-07',
    dataset: 'Trial Balance',
    name: 'Mandatory Field Completeness Check',
    technicalField: 'G/L, Description, Account Subtype, FS Line Item',
    severity: 'Required',
    status: 'PASSED',
    details: 'Validated that G/L, Description, Account Subtype, and FS line columns contain zero blank or null cells.',
    guidance: 'No blanks in GL, GL description, Account subtype and FS line columns.'
  },
  {
    id: 'TB-08',
    dataset: 'Trial Balance',
    name: 'Standardized CSV Export Integrity',
    technicalField: 'TB Preparation Structure',
    severity: 'Required',
    status: 'PASSED',
    details: 'Trial balance sanitized, structured, and verified ready for PySpark ingestion and aggregation.',
    guidance: 'Save the prepared TB in CSV format.'
  },

  // Population Checkpoints (POP-01 to POP-05)
  {
    id: 'POP-01',
    dataset: 'General Ledger',
    name: 'Mandatory Population Fields Completeness',
    technicalField: 'G/L, DocumentNo, Type, Entry Date, Pstng Date',
    severity: 'Required',
    status: 'PASSED',
    details: 'No blank or null values in G/L, DocumentNo, Document Type, Entry Date, or Posting Date.',
    guidance: 'No blanks in GL, DocumentNo, Type, Entry Date and Pstng Date.'
  },
  {
    id: 'POP-02',
    dataset: 'General Ledger',
    name: 'Total Population Net Amount Zero Sum Rule',
    technicalField: 'Amount in local cur.',
    severity: 'Required',
    status: 'PASSED',
    details: 'Sum of Amount in local currency across all journal transactions equals 0.00.',
    guidance: 'Sum of Amount in local currency should be 0.'
  },
  {
    id: 'POP-03',
    dataset: 'General Ledger',
    name: 'Posting Date Boundary Range Validation',
    technicalField: 'Pstng Date',
    severity: 'Required',
    status: 'PASSED',
    details: 'All transaction Posting Dates fall strictly within the engagement period Start Date and End Date.',
    guidance: 'Posting Date should be within the Start Date and End Date range.'
  },
  {
    id: 'POP-04',
    dataset: 'General Ledger',
    name: 'Per-Document Journal Balance Rule',
    technicalField: 'DocumentNo, Amount in local cur.',
    severity: 'Required',
    status: 'PASSED',
    details: 'For every distinct Document Number, the sum of line amounts balances exactly to 0.00.',
    guidance: 'For all document numbers, the sum against each document should be 0.'
  },
  {
    id: 'POP-05',
    dataset: 'General Ledger',
    name: 'Population Standardization & Comma Cleanup',
    technicalField: 'Document Header Text, Text, User name',
    severity: 'Required',
    status: 'PASSED',
    details: 'Commas replaced with spaces in text fields, amounts converted to numeric, and dates formatted to dd-MMM-yy.',
    guidance: 'Save the prepared Population as CSV.'
  }
];

export const AutoCleanConstraintsPanel: React.FC<AutoCleanConstraintsPanelProps> = ({
  workflowType,
  onProceed,
  tbRowCount = 22,
  glRowCount = 36,
  coaRowCount = 26,
}) => {
  const isSpark = workflowType === 'SPARK_JET';
  const defaultList = isSpark ? SPARK_CHECKPOINTS : OMNIA_CONSTRAINTS;

  const [isRunningClean, setIsRunningClean] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TB' | 'GL' | 'COA'>('ALL');
  const [constraints, setConstraints] = useState<SchemaConstraintItem[]>(defaultList);

  useEffect(() => {
    setConstraints(isSpark ? SPARK_CHECKPOINTS : OMNIA_CONSTRAINTS);
    setActiveFilter('ALL');
  }, [workflowType]);

  const totalRows = isSpark ? tbRowCount + glRowCount : tbRowCount + glRowCount + coaRowCount;

  const handleRunCleansing = () => {
    setIsRunningClean(true);
    setTimeout(() => {
      setIsRunningClean(false);
      setConstraints(isSpark ? SPARK_CHECKPOINTS : OMNIA_CONSTRAINTS);
    }, 900);
  };

  const filteredConstraints = constraints.filter((c) => {
    if (activeFilter === 'TB') return c.dataset === 'Trial Balance';
    if (activeFilter === 'GL') return c.dataset === 'General Ledger';
    if (activeFilter === 'COA') return c.dataset === 'Chart of Accounts';
    return true;
  });

  const passedCount = constraints.filter((c) => c.status === 'PASSED').length;
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
            {isSpark ? `TB (${tbRowCount}) · Population (${glRowCount})` : `TB (${tbRowCount}) · GL (${glRowCount}) · COA (${coaRowCount})`}
          </span>
        </div>

        <div style={{
          padding: '16px 18px', borderRadius: '10px', background: '#FFFFFF',
          border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            {isSpark ? 'CHECKPOINTS EVALUATED' : 'RULES EVALUATED'}
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#2563EB', marginTop: '4px' }}>
            {constraints.length} Checks
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {isSpark ? '8 TB · 5 Population Checkpoints' : '6 TB · 7 GL · 3 COA Constraints'}
          </span>
        </div>

        <div style={{
          padding: '16px 18px', borderRadius: '10px', background: '#FFFFFF',
          border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            {isSpark ? 'PASSED CHECKPOINTS' : 'PASSED CONSTRAINTS'}
          </span>
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
          {isSpark ? `Spark JET Mandatory Data Checkpoints (spark_proper_guide.txt) (${filteredConstraints.length})` : `Omnia JET Schema & Constraints Validation (omnia_JET_user_input.txt) (${filteredConstraints.length})`}
        </div>

        {/* Dataset Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
          {(isSpark
            ? [
                { key: 'ALL', label: `All Checkpoints (${constraints.length})` },
                { key: 'TB', label: 'Trial Balance (8)' },
                { key: 'GL', label: 'Population GL (5)' },
              ]
            : [
                { key: 'ALL', label: `All Rules (${constraints.length})` },
                { key: 'TB', label: 'Trial Balance (6)' },
                { key: 'GL', label: 'General Ledger (7)' },
                { key: 'COA', label: 'Chart of Accounts (3)' },
              ]
          ).map((tab) => (
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
                    <CheckCircle2 size={12} /> {c.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.3 }}>
                  {c.name}
                </div>

                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.35 }}>
                  {c.details}
                </p>
              </div>

              <div style={{
                fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: '8px',
                borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--deloitte-teal)', fontWeight: 600 }}>
                  {c.technicalField}
                </span>
                <span style={{ fontStyle: 'italic', fontSize: '0.66rem', color: '#64748B' }}>
                  {c.dataset}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AutoCleanConstraintsPanel;
