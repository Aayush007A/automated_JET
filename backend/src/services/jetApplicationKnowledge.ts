/**
 * Deloitte Automated JET (Journal Entry Testing) Platform Knowledge Base
 * Authoritative source of truth for all workflows, stages, tests, DQC rules,
 * CDM fields, forensic formulas, visualizations, and application components.
 */

export interface KnowledgeItem {
  id: string;
  category: 'stage' | 'test' | 'dqc' | 'sheet' | 'cdm' | 'forensic' | 'eda' | 'materiality' | 'architecture';
  title: string;
  aliases: string[];
  summary: string;
  details: string;
}

export const SIX_STAGES_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'stage_1',
    category: 'stage',
    title: 'Stage 1: Data Upload & Intelligent Inspection',
    aliases: ['stage 1', 'step 1', 'data upload', 'intelligent inspection', 'ingest data', 'upload files'],
    summary: 'Ingestion and pre-validation of General Ledger and Trial Balance populations.',
    details: `### Stage 1: Data Upload & Intelligent Inspection
- **Purpose**: Secure ingestion of general ledger (GL) journal entries and trial balance (TB) populations.
- **Accepted File Formats**: CSV, Excel (.xlsx, .xls), TSV, and Parquet.
- **Pre-Validation Checks**:
  - Validates file headers, row counts, and structural integrity.
  - Multi-sheet Excel workbook automatic discovery (TB and GL sheets).
  - Character encoding auto-detection (UTF-8, Windows-1252, Latin-1).
  - Memory-safe streaming chunks for multi-gigabyte populations.
- **Audit Requirement**: Guarantees raw data integrity before transformation, establishing an immutable audit trail.`
  },
  {
    id: 'stage_2',
    category: 'stage',
    title: 'Stage 2: File Preparation & Raw Data Inspection (EDA)',
    aliases: ['stage 2', 'step 2', 'file preparation', 'eda', 'raw data inspection', 'column health'],
    summary: 'Exploratory data analysis (EDA) and hygiene inspection across all raw columns.',
    details: `### Stage 2: File Preparation & Raw Data Inspection
- **Purpose**: Provides deep exploratory data analysis (EDA) and column health diagnostics on uploaded populations.
- **Core Diagnostic Features**:
  - **Univariate Analysis**: Value distribution frequency, completeness percentages, distinct cardinality, null counts.
  - **Multivariate Comparative Grouped Bars**: Side-by-side comparative views for multi-category populations with distinct sub-offsets.
  - **Accounting Number Parser**: Automatically parses financial formatting including negative accounting parentheses (e.g. \`(1,234.56)\` -> \`-1234.56\`), currency symbols (\$, €, £, ₹), and trailing debit/credit indicator tags (\`DR\` / \`CR\`).
  - **Schema Preview**: Column datatype inference and sample row inspection.`
  },
  {
    id: 'stage_3',
    category: 'stage',
    title: 'Stage 3: File Cleaning & Automated Constraints Validation (20 DQC Rules)',
    aliases: ['stage 3', 'step 3', 'file cleaning', 'automated constraints', 'dqc', '20 golden rules', 'cleaning'],
    summary: 'Execution of the 20 Golden Data Quality Control (DQC) rules and data cleansing.',
    details: `### Stage 3: File Cleaning & Automated Constraints Validation
- **Purpose**: Validates population hygiene against the 20 Golden DQC integrity rules and cleans invalid records.
- **20 Golden DQC Rules**: Checks for zero-balance debits/credits, structural account formats, future dates, missing headers, unassigned business units, and sequence gaps.
- **Cleansing Capabilities**:
  - Automatic whitespace and control character trimming.
  - Date normalization to standard ISO-8601 (\`YYYY-MM-DD\`).
  - Quarantine of unparseable or out-of-balance rows into an exception log.
- **Audit Rationale**: Prevents corrupted or unaligned data from skewing parametric audit risk tests.`
  },
  {
    id: 'stage_4',
    category: 'stage',
    title: 'Stage 4: Pre-Integrity Checks & Canonical Field Mapping (CDM)',
    aliases: ['stage 4', 'step 4', 'pre-integrity', 'canonical field mapping', 'cdm', 'mapping'],
    summary: 'Mapping client source columns to Deloitte\'s standard Canonical Data Model (CDM).',
    details: `### Stage 4: Pre-Integrity Checks & Canonical Field Mapping
- **Purpose**: Maps raw client accounting fields to the standardized Deloitte Canonical Data Model (CDM).
- **Core Target CDM Fields**:
  - \`Account_Number\`, \`Account_Description\`, \`Debit_Amount\`, \`Credit_Amount\`, \`Net_Amount\`
  - \`Effective_Date\`, \`Posting_Date\`, \`Journal_Entry_ID\`, \`Line_Number\`
  - \`Preparer_ID\`, \`Approver_ID\`, \`Business_Unit\`, \`Source_System\`, \`Document_Type\`
  - \`Header_Narration\`, \`Line_Memo\`
- **Intelligent Auto-Mapping**: Levenshtein distance matching, accounting alias dictionaries, and type compatibility verification.
- **Completeness Confidence Score**: Calculates percentage confidence of required vs optional CDM fields.`
  },
  {
    id: 'stage_5',
    category: 'stage',
    title: 'Stage 5: Integrity Testing & Automated Pipeline Execution',
    aliases: ['stage 5', 'step 5', 'integrity testing', 'automated pipeline', 'pipeline execution', 'control totals'],
    summary: 'Execution of population balancing control totals and parametric audit risk algorithms.',
    details: `### Stage 5: Integrity Testing & Automated Pipeline Execution
- **Purpose**: Runs live mathematical balancing control totals and executes all 12 parametric audit risk tests.
- **Baseline Control Totals**:
  - **Trial Balance Balancing**: \`Total TB Debits == Total TB Credits\` (Zero Net Difference).
  - **General Ledger Balancing**: \`Total GL Debits == Total GL Credits\`.
  - **Population Reconciliation**: \`Total GL Debits == Total TB Debits\`.
- **Live SSE Streaming Pipeline**:
  - [INGESTION] 25%: Reading and indexing TB and GL files.
  - [DQC_VALIDATION] 50%: Validating the 20 Golden DQC constraints.
  - [PARAMETRIC_TESTS] 75%: Executing Tests 01 through 12.
  - [FINALIZING] 100%: Reconciling workpapers and compiling executive analytics.`
  },
  {
    id: 'stage_6',
    category: 'stage',
    title: 'Stage 6: Executive Summary, Exceptions & Audit Reconciliation',
    aliases: ['stage 6', 'step 6', 'executive summary', 'exceptions', 'audit reconciliation', 'visual analytics', 'workpapers'],
    summary: 'Interactive forensic triage across 12 Visual Analytics worksheets and audit workpaper export.',
    details: `### Stage 6: Executive Summary, Exceptions & Audit Reconciliation
- **Purpose**: Triage flagged journal entry exceptions across 12 interactive visual analytics sheets and export audit-ready workpapers.
- **Key Modules**:
  - **12 Visual Analytics Worksheets**: Interactive Chart.js and D3 visual diagnostics with dynamic cross-filtering.
  - **Executive Forensic Intelligence Hub**: Multi-dimensional risk radar and anomaly stratification.
  - **Consolidated Anomaly Grid**: Cross-test flagged journal entry table with drill-down and export.
  - **Audit Workpaper Export**: Standardized CSV and Excel audit documentation compliant with ISA 240.`
  }
];

export const TWELVE_TESTS_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'test_1',
    category: 'test',
    title: 'Test 01: Seldom Used & Dormant Accounts',
    aliases: ['test 1', 'test 01', 'ex 1', 'ex 01', 'seldom used', 'dormant accounts', 'unusual accounts'],
    summary: 'Identifies journal entries posted to general ledger accounts with historically low activity.',
    details: `### Test 01: Seldom Used & Dormant Accounts
- **Objective**: Detects entries recorded in balance sheet or P&L accounts that are rarely posted to throughout the fiscal year.
- **Risk Rationale**: Fraudulent, unauthorized, or concealing journal entries are frequently booked to rarely monitored accounts to evade routine review.
- **Detection Algorithm**: Accounts with posting frequency below the engagement dormancy threshold (typically <= 5 entries per year).
- **Audit Standard**: Aligns with ISA 240.A43 and PCAOB AS 2401 for identifying journal entries made to seldom-used accounts.
- **Associated Visual**: Summary 1 - Account Wise Distribution & Financial Statement Line Debit Exposure.`
  },
  {
    id: 'test_2',
    category: 'test',
    title: 'Test 02: Suspect Keywords & High-Risk Narrations',
    aliases: ['test 2', 'test 02', 'ex 2', 'ex 02', 'suspect keywords', 'keyword entries', 'narrations', 'word count'],
    summary: 'Scans entry descriptions and line memos for fraud, plug, error, or manual override indicators.',
    details: `### Test 02: Suspect Keywords & High-Risk Narrations
- **Objective**: Multi-pattern regex scanning across document headers, line memos, and descriptions for high-risk fraud terminology.
- **Target Indicators**: \`"plug"\`, \`"true-up"\`, \`"error"\`, \`"correction"\`, \`"override"\`, \`"suspense"\`, \`"partner request"\`, \`"audit adj"\`, \`"off-book"\`, \`"do not record"\`, \`"per discussion"\`.
- **Audit Rationale**: Management override of controls often leaves textual evidence in descriptions explaining anomalous adjustments.
- **Audit Standard**: Aligns with ISA 240.A43 keyword inquiry guidelines.
- **Associated Visual**: Summary 8 - Keyword Risk Severity Spread (Polar Area Chart).`
  },
  {
    id: 'test_3',
    category: 'test',
    title: 'Test 03: Large Debits to Revenue Accounts',
    aliases: ['test 3', 'test 03', 'ex 3', 'ex 03', 'revenue debits', 'large debits to revenue', 'debits to revenue'],
    summary: 'Surveils material or unusual debit entries booked against normally credit-balance revenue accounts.',
    details: `### Test 03: Large Debits to Revenue Accounts
- **Objective**: Identifies debit entries posted directly into revenue general ledger accounts.
- **Risk Rationale**: Revenue accounts naturally have credit balances. Debit entries to revenue can indicate concealed billing fraud, improper revenue reversals, unapproved customer concessions, or earnings smoothing.
- **Detection Criteria**: Debit transactions to revenue exceeding the materiality threshold or lacking standard debit memo authorization.
- **Audit Standard**: Aligns with PCAOB AS 2401.54 revenue recognition fraud presumption.
- **Associated Visual**: Summary 2 - Large Debits to Revenue by Category (Bar / Value Exposure Chart).`
  },
  {
    id: 'test_4',
    category: 'test',
    title: 'Test 04: Users with Few Postings (Rare Users)',
    aliases: ['test 4', 'test 04', 'ex 4', 'ex 04', 'few postings', 'rare users', 'infrequent users'],
    summary: 'Identifies journal entries posted by personnel who rarely create accounting entries.',
    details: `### Test 04: Users with Few Postings (Rare Users)
- **Objective**: Identifies entries originated by user IDs that have low historical posting volume.
- **Risk Rationale**: Non-accounting personnel, executives, temporary contractors, or terminated staff posting entries pose high fraud and unauthorized access risks.
- **Detection Algorithm**: User IDs with total posting count <= rare user cutoff (e.g. <= 10 entries across the entire year).
- **Audit Standard**: ISA 240.A43 - Journal entries made by individuals who typically do not make journal entries.
- **Associated Visual**: Summary 3 - User Activity & Posting Exposure by User Risk Profile.`
  },
  {
    id: 'test_5',
    category: 'test',
    title: 'Test 05: Users of Special Interest (Privileged Admins)',
    aliases: ['test 5', 'test 05', 'ex 5', 'ex 05', 'special interest', 'users of interest', 'privileged users', 'system admin'],
    summary: 'Surveils entries recorded by system administrators, generic batch accounts, or designated high-risk users.',
    details: `### Test 05: Users of Special Interest (Privileged Admins)
- **Objective**: Tracks journal entries posted by IT administrators, database accounts, superusers, or users flagged by audit committee inquiry.
- **Risk Rationale**: Privileged users have the technical access to bypass standard segregation of duties (SoD) and ERP workflow approvals.
- **Detection Algorithm**: Matches preparer User IDs against the engagement's Monitored Users list (e.g. \`USR_SYS_ADMIN\`, \`USR_BATCH_AUTO\`, \`ROOT\`).
- **Audit Standard**: PCAOB AS 2401 segregation of duties surveillance.
- **Associated Visual**: Summary 3 - Posting Exposure by User Risk Profile.`
  },
  {
    id: 'test_6',
    category: 'test',
    title: 'Test 06: Period-End Closing Adjustments',
    aliases: ['test 6', 'test 06', 'ex 6', 'ex 06', 'closing entries', 'period-end closing', 'period end entries'],
    summary: 'Surveils adjusting entries recorded during the critical period-end closing window.',
    details: `### Test 06: Period-End Closing Adjustments
- **Objective**: Evaluates entries posted on or immediately around the fiscal quarter/year-end closing dates (+/- 5 days).
- **Risk Rationale**: Closing adjustments represent the most common vehicle for management override to meet earnings targets or covenants.
- **Detection Algorithm**: Entries with posting timestamp within the period-end closing window targeting accrual, revenue, or asset categories.
- **Audit Standard**: ISA 240.32(a) - Testing journal entries made at the end of a reporting period.
- **Associated Visual**: Summary 4 - Non-Standard Closing Entries by Financial Statement Category.`
  },
  {
    id: 'test_7',
    category: 'test',
    title: 'Test 07: Postings on Dates of Interest (Weekends & Holidays)',
    aliases: ['test 7', 'test 07', 'ex 7', 'ex 07', 'dates of interest', 'weekend entries', 'holiday entries'],
    summary: 'Surveils journal entries posted on weekends, statutory public holidays, or non-working days.',
    details: `### Test 07: Postings on Dates of Interest (Weekends & Holidays)
- **Objective**: Identifies manual journal entries recorded on Saturdays, Sundays, or statutory holidays when business offices are closed.
- **Risk Rationale**: Unauthorized transactions are often booked during off-hours or weekends to avoid immediate detection by colleagues or supervisors.
- **Detection Algorithm**: Calendrical date extraction matching posting date against weekend days and corporate statutory holiday schedules.
- **Audit Standard**: ISA 240.A43 - Testing entries made outside of normal business hours.
- **Associated Visual**: Summary 5 - Dates of Interest Exposure Spread.`
  },
  {
    id: 'test_8',
    category: 'test',
    title: 'Test 08: Round Sum Amounts & Multiples',
    aliases: ['test 8', 'test 08', 'ex 8', 'ex 08', 'round amounts', 'round sums', 'round multiples', 'round numbers'],
    summary: 'Detects entries with round monetary values ($1,000, $10,000, $100,000) indicating arbitrary estimates.',
    details: `### Test 08: Round Sum Amounts & Multiples
- **Objective**: Identifies entries where the monetary amount is an exact multiple of 1,000, 10,000, or 100,000.
- **Risk Rationale**: Legitimate operational transactions almost always have cents/decimals and non-round digits. Round sums often indicate arbitrary management plugs, uncalculated reserves, or fictitious entries.
- **Detection Algorithm**: \`Amount % 1000 == 0\` and \`Amount >= Planning Materiality * 0.1\`.
- **Audit Standard**: ISA 240.A43 - Entries containing round numbers or consistent ending digits.
- **Associated Visual**: Summary 6 - Round Sum Multiples and Clustering.`
  },
  {
    id: 'test_9',
    category: 'test',
    title: 'Test 09: Duplicate & Near-Duplicate Transactions',
    aliases: ['test 9', 'test 09', 'ex 9', 'ex 09', 'duplicate entries', 'duplicate transactions', 'near duplicates'],
    summary: 'Detects identical or inverted transactions that may indicate accidental duplicate booking or fraud.',
    details: `### Test 09: Duplicate & Near-Duplicate Transactions
- **Objective**: Identifies pairs or clusters of journal entries sharing identical monetary amounts, account numbers, and effective dates.
- **Risk Rationale**: Can indicate double-counted revenues, duplicate vendor disbursement entries, or repeated manual adjustments.
- **Detection Algorithm**: Composite key hash matching: \`Hash(Account_Number + Amount + Date)\` or fuzzy near-match within +/- 3 days.
- **Associated Visual**: Summary 7 - Duplicate Entry Clusters by Risk Category.`
  },
  {
    id: 'test_10',
    category: 'test',
    title: 'Test 10: Benford\'s Law First-Digit Conformity',
    aliases: ['test 10', 'test 10', 'ex 10', 'ex 10', 'benford', 'first digit', 'conformity score', 'mad'],
    summary: 'Evaluates population leading-digit conformity against the natural logarithmic distribution.',
    details: `### Test 10: Benford's Law First-Digit Conformity
- **Objective**: Evaluates whether the leading digits (1 through 9) of monetary amounts conform to Benford's Law:
  $$P(d) = \\log_{10}(1 + 1/d)$$
- **Theoretical Expected Probabilities**:
  - Digit 1: **30.1%** | Digit 2: **17.6%** | Digit 3: **12.5%**
  - Digit 4: **9.7%**  | Digit 5: **7.9%**  | Digit 6: **6.7%**
  - Digit 7: **5.8%**  | Digit 8: **5.1%**  | Digit 9: **4.6%**
- **Mean Absolute Deviation (MAD) Benchmarks**:
  - Close Conformity: \`MAD < 0.006\` (Score >= 95%)
  - Acceptable Conformity: \`0.006 <= MAD < 0.012\` (Score 85% - 94%)
  - Non-Conformity: \`MAD >= 0.015\` (Score < 85%) - Indicates artificial rounding or threshold avoidance.
- **Associated Visual**: Test 10 Benford First-Digit Curve Visualizer.`
  },
  {
    id: 'test_11',
    category: 'test',
    title: 'Test 11: Post-Closing & Subsequent Period Adjustments',
    aliases: ['test 11', 'test 11', 'ex 11', 'ex 11', 'post-closing', 'after closing', 'subsequent entries', 'cutoff'],
    summary: 'Surveils entries recorded after the accounting period close that alter prior period financials.',
    details: `### Test 11: Post-Closing & Subsequent Period Adjustments
- **Objective**: Identifies journal entries posted after the ledger cutoff date with an effective date belonging to the closed period.
- **Risk Rationale**: Backdated entries booked after period close carry extreme audit risk of retroactive manipulation or unrecorded liabilities.
- **Detection Algorithm**: \`Posting_Date > Cutoff_Date\` and \`Effective_Date <= Cutoff_Date\`.
- **Associated Visual**: Summary 9 - Entries Booked Post-Period End Cutoff.`
  },
  {
    id: 'test_12',
    category: 'test',
    title: 'Test 12: Unrelated Account Pairings & Conflicting Classes',
    aliases: ['test 12', 'test 12', 'ex 12', 'ex 12', 'unrelated accounts', 'conflicting pairings', 'unnatural pairings'],
    summary: 'Identifies unnatural cross-class debit/credit pairings that violate standard accounting logic.',
    details: `### Test 12: Unrelated Account Pairings & Conflicting Classes
- **Objective**: Flags transactions pairing incompatible balance sheet and income statement account classes without legitimate clearing accounts.
- **Conflicting Pairings**:
  - Direct pairings between Equity and Revenue/Expense.
  - Direct pairings between Intercompany and Cash without reconciliation.
  - Direct Asset capitalization from commercial Revenue.
- **Detection Algorithm**: Matrix evaluation of debit account class against credit account class.
- **Associated Visual**: Summary 10 - Unrelated Pairing Exposure Distribution.`
  }
];

export const TWENTY_DQC_RULES: KnowledgeItem[] = [
  {
    id: 'dqc_01',
    category: 'dqc',
    title: 'DQC-01: Header Row & Field Non-Emptiness',
    aliases: ['dqc 1', 'dqc-01', 'dqc 01', 'rule 1', 'header non-empty'],
    summary: 'Ensures the uploaded file contains valid, non-blank column headers.',
    details: `### DQC-01: Header Row & Field Non-Emptiness
- **Validation**: Verifies header row contains recognized textual names and zero null or undefined header tokens.
- **Audit Severity**: High (Blocks ingestion if headers are missing or unreadable).`
  },
  {
    id: 'dqc_02',
    category: 'dqc',
    title: 'DQC-02: Account Number Structural Formatting',
    aliases: ['dqc 2', 'dqc-02', 'dqc 02', 'rule 2', 'account format', 'account structure'],
    summary: 'Validates that general ledger account IDs adhere to client chart-of-accounts conventions.',
    details: `### DQC-02: Account Number Structural Formatting
- **Validation**: Verifies account identifiers conform to client length and pattern rules (e.g. 4-10 digits, alphanumeric segments).`
  },
  {
    id: 'dqc_03',
    category: 'dqc',
    title: 'DQC-03: Trial Balance Zero-Balance Equation (Sum Debits = Sum Credits)',
    aliases: ['dqc 3', 'dqc-03', 'dqc 03', 'rule 3', 'tb balance', 'zero balance', 'debits equal credits'],
    summary: 'Verifies the Trial Balance equation: Total Debits must equal Total Credits with zero difference.',
    details: `### DQC-03: Trial Balance Zero-Balance Equation
- **Validation**: Evaluates $|\\sum \\text{Debits} - \\sum \\text{Credits}| < 0.01$.
- **Audit Impact**: Critical. If TB is out of balance, the population cannot serve as the audit baseline.`
  },
  {
    id: 'dqc_04',
    category: 'dqc',
    title: 'DQC-04: Accounting Period & Effective Date Integrity',
    aliases: ['dqc 4', 'dqc-04', 'dqc 04', 'rule 4', 'date integrity', 'effective date'],
    summary: 'Ensures all effective dates are valid calendar dates within the defined audit scope.',
    details: `### DQC-04: Accounting Period & Effective Date Integrity
- **Validation**: Checks for unparseable date formats, dates outside the fiscal year, or non-existent calendar days (e.g. Feb 31).`
  },
  {
    id: 'dqc_05',
    category: 'dqc',
    title: 'DQC-05: Non-Negative Debits and Credits',
    aliases: ['dqc 5', 'dqc-05', 'dqc 05', 'rule 5', 'negative debits', 'negative credits'],
    summary: 'Verifies debit and credit columns contain only non-negative amounts, resolving sign conventions.',
    details: `### DQC-05: Non-Negative Debits and Credits
- **Validation**: Reconciles accounting negative representations (e.g. negative credits -> debits, or parenthetical amounts).`
  },
  {
    id: 'dqc_06',
    category: 'dqc',
    title: 'DQC-06: Currency Symbol & Numeric Purity',
    aliases: ['dqc 6', 'dqc-06', 'dqc 06', 'rule 6', 'numeric purity', 'currency symbols'],
    summary: 'Strips currency symbols ($, €, £) and thousand commas to ensure IEEE 754 float precision.',
    details: `### DQC-06: Currency Symbol & Numeric Purity
- **Validation**: Cleans formatting artifacts and guarantees pure float / decimal numeric parsing.`
  },
  {
    id: 'dqc_07',
    category: 'dqc',
    title: 'DQC-07: Exact Duplicate Row Elimination',
    aliases: ['dqc 7', 'dqc-07', 'dqc 07', 'rule 7', 'duplicate row', 'exact duplicate'],
    summary: 'Identifies completely duplicate rows across all columns in the raw file.',
    details: `### DQC-07: Exact Duplicate Row Elimination
- **Validation**: Detects identical record lines that may have been caused by repeated file concatenation.`
  },
  {
    id: 'dqc_08',
    category: 'dqc',
    title: 'DQC-08: Missing Entity / Business Unit Identifiers',
    aliases: ['dqc 8', 'dqc-08', 'dqc 08', 'rule 8', 'missing entity', 'business unit'],
    summary: 'Flags records lacking mandatory legal entity, company code, or business unit tags.',
    details: `### DQC-08: Missing Entity / Business Unit Identifiers
- **Validation**: Guarantees every journal entry line maps to an identifiable in-scope audit legal entity.`
  },
  {
    id: 'dqc_09',
    category: 'dqc',
    title: 'DQC-09: Sequential Document Number Gap Analysis',
    aliases: ['dqc 9', 'dqc-09', 'dqc 09', 'rule 9', 'sequence gap', 'document gap', 'missing numbers'],
    summary: 'Scans for missing document numbers in sequential journal entry runs.',
    details: `### DQC-09: Sequential Document Number Gap Analysis
- **Validation**: Identifies unrecorded or purged journal entry numbers in sequential transaction sequences.`
  },
  {
    id: 'dqc_10',
    category: 'dqc',
    title: 'DQC-10: Blank or Truncated Line Narrative Identification',
    aliases: ['dqc 10', 'dqc-10', 'dqc 10', 'rule 10', 'blank narrative', 'empty description'],
    summary: 'Flags lines with zero textual description or abbreviated non-descriptive tokens.',
    details: `### DQC-10: Blank or Truncated Line Narrative Identification
- **Validation**: Flags lines with empty description, single-character placeholders, or whitespace.`
  },
  {
    id: 'dqc_11',
    category: 'dqc',
    title: 'DQC-11: Future-Dated Posting Surveillance',
    aliases: ['dqc 11', 'dqc-11', 'dqc 11', 'rule 11', 'future date', 'future dated'],
    summary: 'Flags entries with posting or effective dates beyond the current date or fiscal year-end.',
    details: `### DQC-11: Future-Dated Posting Surveillance
- **Validation**: \`Effective_Date > Fiscal_Year_End\` or \`Posting_Date > Current_System_Date\`.`
  },
  {
    id: 'dqc_12',
    category: 'dqc',
    title: 'DQC-12: Fiscal Year-End Cutoff Boundary Conformance',
    aliases: ['dqc 12', 'dqc-12', 'dqc 12', 'rule 12', 'cutoff boundary', 'period cutoff'],
    summary: 'Verifies all transactions fall strictly within the audit period boundaries.',
    details: `### DQC-12: Fiscal Year-End Cutoff Boundary Conformance
- **Validation**: Ensures no prior-year or subsequent-period unapproved entries are mixed into the testing scope.`
  },
  {
    id: 'dqc_13',
    category: 'dqc',
    title: 'DQC-13: System Automated vs Manual Journal Distinction',
    aliases: ['dqc 13', 'dqc-13', 'dqc 13', 'rule 13', 'manual vs automated', 'source distinction'],
    summary: 'Verifies the population properly tags automated interface feeds vs manual user postings.',
    details: `### DQC-13: System Automated vs Manual Journal Distinction
- **Validation**: Ensures \`Document_Type\` or \`Source_System\` accurately identifies batch feeds vs manual overrides.`
  },
  {
    id: 'dqc_14',
    category: 'dqc',
    title: 'DQC-14: Active vs Dormant User ID Validation',
    aliases: ['dqc 14', 'dqc-14', 'dqc 14', 'rule 14', 'active user', 'dormant user', 'preparer id'],
    summary: 'Ensures preparer User IDs correspond to valid authorized corporate identity records.',
    details: `### DQC-14: Active vs Dormant User ID Validation
- **Validation**: Detects generic system placeholders or terminated user credentials in preparer fields.`
  },
  {
    id: 'dqc_15',
    category: 'dqc',
    title: 'DQC-15: Cross-Entity Intercompany Clearing Balancing',
    aliases: ['dqc 15', 'dqc-15', 'dqc 15', 'rule 15', 'intercompany', 'intercompany clearing'],
    summary: 'Verifies intercompany debit and credit accounts offset across consolidating entities.',
    details: `### DQC-15: Cross-Entity Intercompany Clearing Balancing
- **Validation**: Confirms multi-entity intercompany clearing balances to zero on consolidation.`
  },
  {
    id: 'dqc_16',
    category: 'dqc',
    title: 'DQC-16: Zero-Dollar Nominal Line Cleanup',
    aliases: ['dqc 16', 'dqc-16', 'dqc 16', 'rule 16', 'zero dollar', 'zero amount', 'nominal lines'],
    summary: 'Identifies non-impact lines where both debit and credit amounts equal $0.00.',
    details: `### DQC-16: Zero-Dollar Nominal Line Cleanup
- **Validation**: Isolates $0.00 placeholder lines that unnecessarily inflate population cardinality.`
  },
  {
    id: 'dqc_17',
    category: 'dqc',
    title: 'DQC-17: Multi-Currency Spot FX Rate Variance',
    aliases: ['dqc 17', 'dqc-17', 'dqc 17', 'rule 17', 'fx rate', 'foreign exchange', 'multi-currency'],
    summary: 'Evaluates functional currency conversions against official benchmark FX rates.',
    details: `### DQC-17: Multi-Currency Spot FX Rate Variance
- **Validation**: Checks for uncharacteristic exchange rate spikes or mismatched transaction currencies.`
  },
  {
    id: 'dqc_18',
    category: 'dqc',
    title: 'DQC-18: Out-of-Balance Transaction Verification',
    aliases: ['dqc 18', 'dqc-18', 'dqc 18', 'rule 18', 'out of balance', 'unbalanced entry', 'debit credit mismatch'],
    summary: 'Verifies double-entry accounting per Journal Entry ID: Sum(Debits) == Sum(Credits).',
    details: `### DQC-18: Out-of-Balance Transaction Verification
- **Validation**: For every unique \`Journal_Entry_ID\`, verifies that $|\\sum \\text{Debits} - \\sum \\text{Credits}| < 0.01$.
- **Audit Impact**: Critical. Unbalanced entries breach foundational double-entry accounting principles.`
  },
  {
    id: 'dqc_19',
    category: 'dqc',
    title: 'DQC-19: Retained Earnings Beginning-to-Ending Rollforward',
    aliases: ['dqc 19', 'dqc-19', 'dqc 19', 'rule 19', 'retained earnings', 'rollforward', 'equity rollforward'],
    summary: 'Reconciles prior period retained earnings plus current year net income to ending retained earnings.',
    details: `### DQC-19: Retained Earnings Beginning-to-Ending Rollforward
- **Validation**: Confirms beginning equity + net income - dividends equals ending balance sheet equity.`
  },
  {
    id: 'dqc_20',
    category: 'dqc',
    title: 'DQC-20: Reversal & Counter-Entry Linkage Verification',
    aliases: ['dqc 20', 'dqc-20', 'dqc 20', 'rule 20', 'reversal linkage', 'counter entry', 'reversal check'],
    summary: 'Verifies that marked reversal entries reference an active, valid prior journal entry ID.',
    details: `### DQC-20: Reversal & Counter-Entry Linkage Verification
- **Validation**: Confirms that reversal entries properly extinguish the target prior-period liability or asset.`
  }
];

export const APPLICATION_COMPONENTS_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'comp_eda',
    category: 'eda',
    title: 'EDA Column Health Visualizer',
    aliases: ['eda', 'column health visualizer', 'grouped bars', 'univariate', 'multivariate', 'accounting parser'],
    summary: 'Interactive component displaying column completeness, cardinality distributions, and multivariate grouped bars.',
    details: `### EDA Column Health Visualizer
- **Purpose**: Provides deep exploratory data hygiene diagnostics on uploaded populations.
- **Univariate Analysis**: Computes row completeness %, distinct cardinality, null counts, min/max/mean/median statistics.
- **Multivariate Comparative View**: Displays side-by-side grouped comparative bars with sub-offsets for multi-measure categories.
- **Accounting Parser**: Automatically parses financial negative parentheses \`(1,234.56)\` -> \`-1234.56\`, currency symbols (\$, €, £), and \`DR\`/\`CR\` indicator tags.`
  },
  {
    id: 'comp_materiality',
    category: 'materiality',
    title: 'Engagement Materiality Threshold Configuration',
    aliases: ['materiality', 'planning materiality', 'tolerable misstatement', 'sad threshold', 'clearly trivial', 'threshold'],
    summary: 'Configuration of Overall Planning Materiality, Tolerable Misstatement, and Clearly Trivial thresholds.',
    details: `### Engagement Materiality Threshold Configuration
- **Planning Materiality (Overall Materiality)**: The benchmark monetary threshold above which misstatements could influence the economic decisions of users.
- **Tolerable Misstatement (Performance Materiality)**: Typically set at 50% to 75% of Planning Materiality to reduce aggregation risk.
- **Summary of Audit Differences (SAD) / Clearly Trivial**: Typically 3% to 5% of Planning Materiality, below which matters are deemed inconsequential.
- **Audit Priority**: Transactions exceeding materiality receive highest priority for substantive audit sampling.`
  },
  {
    id: 'comp_benford_math',
    category: 'forensic',
    title: 'Benford\'s Law Forensic Mathematics',
    aliases: ['benford math', 'benford formula', 'mad formula', 'conformity calculation', 'first digit formula'],
    summary: 'The mathematical formulas and thresholds governing Benford\'s Law first-digit testing.',
    details: `### Benford's Law Forensic Mathematics
- **First-Digit Logarithmic Formula**:
  $$P(d) = \\log_{10}\\left(1 + \\frac{1}{d}\\right) \\quad \\text{for } d \\in \\{1, 2, \\dots, 9\\}$$
- **Expected Probabilities**:
  - $d=1: 30.1\\%$ | $d=2: 17.6\\%$ | $d=3: 12.5\\%$
  - $d=4: 9.7\\%$  | $d=5: 7.9\\%$  | $d=6: 6.7\\%$
  - $d=7: 5.8\\%$  | $d=8: 5.1\\%$  | $d=9: 4.6\\%$
- **Mean Absolute Deviation (MAD)**:
  $$\\text{MAD} = \\frac{1}{9} \\sum_{d=1}^{9} |\\text{Actual}(d) - P(d)|$$
- **Conformity Benchmarks**:
  - Close: $\\text{MAD} < 0.006$ (Score $\\ge 95\\%$)
  - Acceptable: $0.006 \\le \\text{MAD} < 0.012$ (Score $85\\% - 94\\%$)
  - Non-Conforming: $\\text{MAD} \\ge 0.015$ (Score $< 85\\%$)`
  },
  {
    id: 'comp_cdm',
    category: 'cdm',
    title: 'Deloitte Canonical Data Model (CDM) Specification',
    aliases: ['cdm', 'canonical data model', 'cdm fields', 'target schema', 'data dictionary'],
    summary: 'Standardized 16-field target schema for journal entry populations.',
    details: `### Deloitte Canonical Data Model (CDM) Specification
- **Financial Fields**: \`Debit_Amount\` (Decimal), \`Credit_Amount\` (Decimal), \`Net_Amount\` (Decimal), \`Currency\` (ISO-4217).
- **Accounting Fields**: \`Account_Number\` (Alphanumeric), \`Account_Description\` (Text), \`Business_Unit\` (Alphanumeric), \`Source_System\` (Text).
- **Chronological Fields**: \`Effective_Date\` (ISO Date), \`Posting_Date\` (ISO Date), \`Accounting_Period\` (String).
- **Transaction Identifiers**: \`Journal_Entry_ID\` (String), \`Line_Number\` (Integer), \`Document_Type\` (String).
- **Attribution & Narratives**: \`Preparer_ID\` (String), \`Approver_ID\` (String), \`Header_Narration\` (Text), \`Line_Memo\` (Text).`
  },
  {
    id: 'comp_architecture',
    category: 'architecture',
    title: 'Platform Architecture & Workflows (Omnia vs Spark vs Classic)',
    aliases: ['architecture', 'omnia jet', 'spark jet', 'classic jet', 'microservices', 'pipeline sse'],
    summary: 'System architecture including Omnia JET, Spark JET, and the local neural microservice.',
    details: `### Deloitte JET Platform Architecture & Workflows
- **Workflows**:
  - **Omnia JET**: Deloitte's flagship integrated audit platform workflow with full 6-stage testing.
  - **Spark JET**: Distributed Big Data execution engine tailored for multi-million row populations.
  - **Classic JET**: Parametric exception testing engine with lightweight in-browser execution.
- **Service Endpoints**:
  - **AI Neural Microservice**: \`http://127.0.0.1:5005\` (Local Qwen neural model on CPU).
  - **Enterprise Backend API**: \`http://localhost:5000\` (Express, TypeScript, SSE event streams).
  - **Executive Web Application**: \`http://localhost:5173\` (Vite, React, Chart.js, Tailwind-free vanilla CSS).`
  }
];

export const ALL_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  ...SIX_STAGES_KNOWLEDGE,
  ...TWELVE_TESTS_KNOWLEDGE,
  ...TWENTY_DQC_RULES,
  ...APPLICATION_COMPONENTS_KNOWLEDGE
];

/**
 * Searches the authoritative application knowledge base for matching concepts
 */
export function findKnowledgeForQuery(query: string): string | null {
  const q = query.toLowerCase().trim();

  // 1. Check overview clusters first
  if (
    q.includes('20 golden') ||
    q.includes('golden rule') ||
    q.includes('20 rules') ||
    q.includes('dqc rules') ||
    q.includes('dqc integrity')
  ) {
    const list = TWENTY_DQC_RULES.map((r, i) => `${i + 1}. **${r.title}**: ${r.summary}`).join('\n');
    return `### The 20 Golden Data Quality Control (DQC) Integrity Rules\n\n${list}\n\n*Type any specific rule name or ID (e.g. \`DQC-03\` or \`Rule 18\`) for complete technical details.*`;
  }

  if (
    q.includes('12 tests') ||
    q.includes('twelve tests') ||
    q.includes('parametric tests') ||
    q.includes('exception tests') ||
    q.includes('all tests')
  ) {
    const list = TWELVE_TESTS_KNOWLEDGE.map((t, i) => `${i + 1}. **${t.title}**: ${t.summary}`).join('\n');
    return `### The 12 Parametric Audit Risk Tests (Ex 01 - 12)\n\n${list}\n\n*Type any specific test (e.g. \`Test 04\` or \`Test 10 Benford\`) for complete detection logic.*`;
  }

  if (
    q.includes('6 stages') ||
    q.includes('six stages') ||
    q.includes('all stages') ||
    q.includes('workflow stages') ||
    q.includes('audit workflow')
  ) {
    const list = SIX_STAGES_KNOWLEDGE.map((s, i) => `${i + 1}. **${s.title}**: ${s.summary}`).join('\n');
    return `### Unified 6-Stage Audit Testing Workflow\n\n${list}\n\n*Type any stage name (e.g. \`Stage 3 File Cleaning\` or \`Stage 4 CDM\`) for detailed instructions.*`;
  }

  // 2. Specific item search prioritized by alias length (longest / most specific first)
  const flattened: { item: KnowledgeItem; alias: string }[] = [];
  for (const item of ALL_KNOWLEDGE_ITEMS) {
    for (const alias of item.aliases) {
      flattened.push({ item, alias });
    }
  }

  // Sort by alias length descending so "test 10" is checked before "test 1", "dqc-03" before "dqc"
  flattened.sort((a, b) => b.alias.length - a.alias.length);

  for (const { item, alias } of flattened) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i');
    if (regex.test(q)) {
      return item.details;
    }
  }

  return null;
}
