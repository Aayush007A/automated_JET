export interface StandardFieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  aliases: string[];
  description: string;
}

// ==========================================
// SPARK JET SCHEMAS (EXACT CANONICAL COLUMNS)
// ==========================================

export const SPARK_TB_FIELDS: StandardFieldDefinition[] = [
  { name: 'G/L', label: 'G/L', type: 'string', required: true, aliases: ['g/l', 'g_l', 'gl', 'account', 'gl account', 'account number', 'gl code', 'account_number', 'saknr', 'hkont', 'general ledger', 'account no', 'gl_account', 'account_code'], description: 'G/L Account Code' },
  { name: 'Description', label: 'Description', type: 'string', required: true, aliases: ['description', 'gl description', 'account desc', 'account name', 'account_description', 'txt20', 'txt50', 'acct description', 'account_desc', 'desc'], description: 'Account Description' },
  { name: 'Account Subtype', label: 'Account Subtype', type: 'string', required: true, aliases: ['account subtype', 'account_subtype', 'subtype', 'acct subtype', 'account type', 'sub type', 'acct_subtype', 'account_type'], description: 'Assets, Liabilities, Revenue/Income, Expenses, Equity' },
  { name: 'Opening Balance', label: 'Opening Balance', type: 'number', required: true, aliases: ['opening balance', 'opening_balance', 'op balance', 'open bal', 'beginning balance', 'beginning_balance', 'beginning_balance_ec', 'initial balance', 'open_bal'], description: 'Opening balance for the period' },
  { name: 'Debit', label: 'Debit', type: 'number', required: false, aliases: ['debit', 'debit amount', 'total debit', 'dr', 'debit_amount', 'dr_amount', 'dr amount'], description: 'Total debit activity' },
  { name: 'Credit', label: 'Credit', type: 'number', required: false, aliases: ['credit', 'credit amount', 'total credit', 'cr', 'credit_amount', 'cr_amount', 'cr amount'], description: 'Total credit activity' },
  { name: 'Closing Balance', label: 'Closing Balance', type: 'number', required: true, aliases: ['closing balance', 'closing_balance', 'end balance', 'balance', 'close bal', 'ending balance', 'ending_balance', 'ending_balance_ec', 'final balance', 'close_bal'], description: 'Closing balance for the period' },
  { name: 'FS Line Item', label: 'FS Line Item', type: 'string', required: false, aliases: ['fs line item', 'fs_line_item', 'fs line', 'financial statement line', 'financial_statement_line', 'fs item', 'fs line item name', 'statement line'], description: 'Financial statement line item' }
];

export const SPARK_GL_FIELDS: StandardFieldDefinition[] = [
  { name: 'G/L', label: 'G/L', type: 'string', required: true, aliases: ['g/l', 'gl account', 'g_l', 'gl', 'account', 'account number', 'gl code', 'account_number', 'saknr', 'hkont', 'general ledger', 'account no', 'gl_account'], description: 'G/L Account Number' },
  { name: 'DocumentNo', label: 'DocumentNo', type: 'string', required: true, aliases: ['documentno', 'accounting document', 'document number', 'doc no', 'journal_number', 'belnr', 'voucher no', 'je number', 'doc_num', 'journal id', 'journal number', 'doc_no', 'document_no', 'accounting_document'], description: 'Accounting Document Number' },
  { name: 'Type', label: 'Type', type: 'string', required: true, aliases: ['type', 'document type', 'transaction_type', 'doc type', 'blart', 'trans type', 'doc_type', 'transaction type'], description: 'Document / Transaction Type (e.g. SA, AB, RV)' },
  { name: 'Entry Date', label: 'Entry Date', type: 'date', required: true, aliases: ['entry date', 'entry_date', 'accounting date', 'date_effective', 'effective date', 'doc_date', 'bldat', 'entry_dt', 'effective_date'], description: 'Entry Date' },
  { name: 'Pstng Date', label: 'Pstng Date', type: 'date', required: true, aliases: ['pstng date', 'pstng_date', 'posting date', 'date_posted', 'budat', 'posted date', 'post date', 'posting_date', 'post_date'], description: 'Posting Date' },
  { name: 'Doc. Date', label: 'Doc. Date', type: 'date', required: false, aliases: ['doc. date', 'doc date', 'document date', 'document_date', 'bldat', 'doc_date'], description: 'Document Date' },
  { name: 'Amount in local cur.', label: 'Amount in local cur.', type: 'number', required: true, aliases: ['amount in local cur.', 'amount in local cur', 'amount in local currency', 'amount_in_local_cur', 'amount_in_local_currency', 'net_amount_ec', 'amount', 'dmbtr', 'net amount', 'local amount', 'net_amount'], description: 'Amount in Local Currency' },
  { name: 'LCurr', label: 'LCurr', type: 'string', required: true, aliases: ['lcurr', 'currency code', 'currency', 'local currency', 'curr', 'entity_currency_ec', 'waers', 'currency_code', 'local_currency'], description: 'Local Currency Code' },
  { name: 'Amount in doc. curr.', label: 'Amount in doc. curr.', type: 'number', required: false, aliases: ['amount in doc. curr.', 'amount in doc curr', 'wrbtr', 'amount in doc currency', 'doc_amount', 'document amount'], description: 'Amount in Document Currency' },
  { name: 'Curr.', label: 'Curr.', type: 'string', required: false, aliases: ['curr.', 'curr', 'doc curr', 'document currency', 'waers', 'doc_curr'], description: 'Document Currency Code' },
  { name: 'Amount in loc.curr.2', label: 'Amount in loc.curr.2', type: 'number', required: false, aliases: ['amount in loc.curr.2', 'amount in loc curr 2', 'dmbe2', 'net_amount_gc', 'group amount', 'local curr 2 amount'], description: 'Amount in Local Currency 2' },
  { name: 'LCur2', label: 'LCur2', type: 'string', required: false, aliases: ['lcur2', 'group currency', 'curr2', 'group_currency_gc', 'hwaer', 'group_currency'], description: 'Local Currency 2 Code' },
  { name: 'Document Header Text', label: 'Document Header Text', type: 'string', required: false, aliases: ['document header text', 'text header', 'header text', 'journal_header_description', 'bktxt', 'header description', 'header_text', 'doc header'], description: 'Document Header Text' },
  { name: 'Text', label: 'Text', type: 'string', required: false, aliases: ['text', 'text details', 'item text', 'line text', 'journal_line_description', 'sgtxt', 'narrative', 'details', 'line_text'], description: 'Line Item Text' },
  { name: 'User name', label: 'User name', type: 'string', required: true, aliases: ['user name', 'user_name', 'username', 'user ud', 'userid_entered', 'user id', 'entered by', 'usnam', 'created by', 'user', 'posted by', 'user_id'], description: 'User Name / User ID' }
];

// ==========================================
// OMNIA JET CDM SCHEMAS
// ==========================================

export const OMNIA_TB_FIELDS: StandardFieldDefinition[] = [
  { name: 'entity_id', label: 'Entity ID', type: 'string', required: true, aliases: ['entity', 'entity id', 'entity code', 'company code', 'cocd', 'bukrs'], description: 'Unique legal entity identifier' },
  { name: 'entity_name', label: 'Entity Name', type: 'string', required: false, aliases: ['company name', 'entity desc', 'legal entity'], description: 'Name of legal entity' },
  { name: 'account_number', label: 'Account Number', type: 'string', required: true, aliases: ['gl', 'g_l', 'gl account', 'account', 'gl code', 'account code', 'saknr', 'hkont'], description: 'Unique general ledger account number' },
  { name: 'account_description', label: 'Account Description', type: 'string', required: true, aliases: ['description', 'gl description', 'account desc', 'account name', 'txt20', 'txt50'], description: 'Description of account' },
  { name: 'period_end_date', label: 'Period End Date', type: 'date', required: true, aliases: ['end date', 'as of date', 'closing date', 'period date', 'date'], description: 'As-of cutoff date' },
  { name: 'fiscal_year', label: 'Fiscal Year', type: 'number', required: false, aliases: ['fiscal year', 'year', 'gjahr'], description: 'Identifier of the applicable fiscal year' },
  { name: 'fiscal_period', label: 'Fiscal Period', type: 'number', required: false, aliases: ['fiscal period', 'period', 'monat'], description: 'Identifier of a fiscal period (1-13)' },
  { name: 'period_type', label: 'Period Type (YTD/QTD/MTD)', type: 'string', required: true, aliases: ['period type', 'period_type', 'periodic type'], description: 'YTD, QTD, or MTD periodic indicator' },
  { name: 'entity_currency_ec', label: 'Entity Currency (EC)', type: 'string', required: true, aliases: ['currency', 'curr', 'lcurr', 'local currency', 'waers', 'currency code'], description: 'Functional currency code' },
  { name: 'beginning_balance_ec', label: 'Beginning Balance (EC)', type: 'number', required: false, aliases: ['opening balance', 'opening_balance', 'op balance', 'open bal', 'beginning balance'], description: 'Opening balance in entity currency' },
  { name: 'period_activity_ec', label: 'Period Activity (EC)', type: 'number', required: false, aliases: ['movement', 'activity', 'net activity', 'period movement'], description: 'Net movement in entity currency' },
  { name: 'ending_balance_ec', label: 'Ending Balance (EC)', type: 'number', required: true, aliases: ['closing balance', 'closing_balance', 'end balance', 'balance', 'close bal'], description: 'Ending balance in entity currency' },
  { name: 'preliminary_ec', label: 'Preliminary Balance (EC)', type: 'number', required: false, aliases: ['prelim balance', 'preliminary'], description: 'Preliminary balance before adjustments' },
  { name: 'adjusted_journal_entry_ec', label: 'Adjusted Journal Entry (EC)', type: 'number', required: false, aliases: ['aje', 'audit adjustment'], description: 'Adjusting journal entry amount' },
  { name: 'adjusted_ec', label: 'Adjusted Balance (EC)', type: 'number', required: false, aliases: ['adj balance', 'adjusted ending balance'], description: 'Adjusted ending balance' },
  { name: 'reclassification_journal_entry_ec', label: 'Reclassification JE (EC)', type: 'number', required: false, aliases: ['rje', 'reclass amount'], description: 'Reclassification amount' },
  { name: 'group_currency_gc', label: 'Group Currency (GC)', type: 'string', required: true, aliases: ['reporting currency', 'group curr', 'parent currency'], description: 'Presentation group currency code' },
  { name: 'beginning_balance_gc', label: 'Beginning Balance (GC)', type: 'number', required: false, aliases: ['opening balance gc', 'op bal gc'], description: 'Opening balance in group currency' },
  { name: 'period_activity_gc', label: 'Period Activity (GC)', type: 'number', required: false, aliases: ['period activity gc', 'net activity gc'], description: 'Net movement in group currency' },
  { name: 'ending_balance_gc', label: 'Ending Balance (GC)', type: 'number', required: true, aliases: ['closing balance gc', 'end bal gc'], description: 'Ending balance in group currency' },
  { name: 'preliminary_gc', label: 'Preliminary Balance (GC)', type: 'number', required: false, aliases: ['prelim balance gc'], description: 'Preliminary balance in group currency' },
  { name: 'adjusted_journal_entry_gc', label: 'Adjusted Journal Entry (GC)', type: 'number', required: false, aliases: ['aje gc'], description: 'Adjusting JE in group currency' },
  { name: 'adjusted_gc', label: 'Adjusted Balance (GC)', type: 'number', required: false, aliases: ['adj balance gc'], description: 'Adjusted balance in group currency' },
  { name: 'reclassification_journal_entry_gc', label: 'Reclassification JE (GC)', type: 'number', required: false, aliases: ['rje gc'], description: 'Reclassification JE in group currency' },
  { name: 'consolidation_journal_entry_gc', label: 'Consolidation JE (GC)', type: 'number', required: false, aliases: ['cje gc', 'consolidation amount'], description: 'Consolidation adjustments in GC' },
  { name: 'chart_of_accounts', label: 'Chart of Accounts', type: 'string', required: true, aliases: ['coa', 'chart of account', 'ktopl'], description: 'Chart of accounts identifier' },
  { name: 'coa_account_key', label: 'COA Account Key', type: 'string', required: false, aliases: ['coa account key', 'coa_key'], description: 'Optional combination of COA and account number' },
  { name: 'ledger_id', label: 'Ledger ID', type: 'string', required: false, aliases: ['ledger id', 'rldnr'], description: 'Alphanumeric reference for entity ledger' },
  { name: 'ledger_group', label: 'Ledger Group', type: 'string', required: false, aliases: ['ledger group'], description: 'Group that the ledger belongs to' },
  { name: 'extract_date', label: 'Extract Date', type: 'date', required: false, aliases: ['extract date'], description: 'Date data was extracted' },
  { name: 'import_date', label: 'Import Date', type: 'date', required: false, aliases: ['import date'], description: 'Date data was imported into Omnia Data' }
];

export const OMNIA_GL_FIELDS: StandardFieldDefinition[] = [
  { name: 'entity_id', label: 'Entity ID', type: 'string', required: true, aliases: ['entity', 'entity id', 'entity code', 'company code', 'cocd', 'bukrs'], description: 'Legal entity identifier' },
  { name: 'journal_number', label: 'Journal Number', type: 'string', required: true, aliases: ['documentno', 'document number', 'accounting document', 'doc no', 'belnr', 'voucher no', 'je number', 'doc_num'], description: 'Unique journal document number' },
  { name: 'journal_line_number', label: 'Line Number', type: 'string', required: false, aliases: ['line', 'buzei', 'line number', 'item', 'item no', 'doc line'], description: 'Journal line item sequence number' },
  { name: 'journal_header_description', label: 'Header Description', type: 'string', required: false, aliases: ['document_header_text', 'header text', 'doc header text', 'bktxt', 'header description', 'je description'], description: 'Journal header narration/text' },
  { name: 'journal_line_description', label: 'Line Description', type: 'string', required: false, aliases: ['text', 'item text', 'line text', 'sgtxt', 'narrative', 'details'], description: 'Line item description/narration' },
  { name: 'account_number', label: 'Account Number', type: 'string', required: true, aliases: ['g_l', 'gl', 'gl account', 'account', 'gl code', 'saknr', 'hkont'], description: 'General ledger account number' },
  { name: 'account_description', label: 'Account Description', type: 'string', required: false, aliases: ['gl description', 'account name', 'txt20'], description: 'GL account description' },
  { name: 'date_effective', label: 'Effective Date', type: 'date', required: true, aliases: ['entry_date', 'accounting date', 'entry date', 'valut', 'document date', 'effective date', 'doc_date', 'bldat'], description: 'Effective/Accounting date' },
  { name: 'date_posted', label: 'Posting Date', type: 'date', required: true, aliases: ['pstng_date', 'posting date', 'budat', 'posted date', 'post date'], description: 'Posting date in accounting ledger' },
  { name: 'entity_currency_ec', label: 'Entity Currency (EC)', type: 'string', required: true, aliases: ['lcurr', 'local currency', 'curr', 'waers', 'currency', 'currency code'], description: 'Entity local currency code' },
  { name: 'net_amount_ec', label: 'Net Amount (EC)', type: 'number', required: true, aliases: ['amount_in_local_cur', 'amount in local currency', 'amount in local cur', 'amount', 'dmbtr', 'net amount', 'local amount'], description: 'Net signed transaction amount in EC' },
  { name: 'credit_amount_ec', label: 'Credit Amount (EC)', type: 'number', required: false, aliases: ['credit', 'cr amount', 'credit in local cur', 'credit_amount'], description: 'Credit amount in EC' },
  { name: 'debit_amount_ec', label: 'Debit Amount (EC)', type: 'number', required: false, aliases: ['debit', 'dr amount', 'debit in local cur', 'debit_amount'], description: 'Debit amount in EC' },
  { name: 'transaction_type', label: 'Transaction Type', type: 'string', required: true, aliases: ['type', 'document type', 'doc type', 'blart', 'trans type'], description: 'Transaction type code (e.g., SA, AB, RV, KR)' },
  { name: 'userid_entered', label: 'User ID Entered', type: 'string', required: true, aliases: ['user_name', 'user id', 'user ud', 'entered by', 'usnam', 'created by', 'user'], description: 'User identifier who entered transaction' },
  { name: 'is_standard', label: 'Is Standard (S/N)', type: 'string', required: false, aliases: ['standard/non-standard', 'is standard', 'mansys', 'standard flag'], description: 'Standard (S) or Non-standard (N)' },
  { name: 'is_manual', label: 'Is Manual (Y/N)', type: 'string', required: false, aliases: ['manual flag', 'manual'], description: 'Manual entry flag (Y/N)' },
  { name: 'source', label: 'Source System', type: 'string', required: false, aliases: ['source system', 'source', 'awtyp'], description: 'Source application or module' },
  { name: 'group_currency_gc', label: 'Group Currency (GC)', type: 'string', required: false, aliases: ['group currency', 'curr2', 'lcur2', 'hwaer'], description: 'Group presentation currency' },
  { name: 'net_amount_gc', label: 'Net Amount (GC)', type: 'number', required: false, aliases: ['amount_in_loc_curr_2', 'amount in group curr', 'dmbe2'], description: 'Net signed amount in GC' }
];

export const COA_FIELDS: StandardFieldDefinition[] = [
  { name: 'chart_of_accounts', label: 'Chart of Accounts', type: 'string', required: true, aliases: ['coa', 'chart of account', 'ktopl'], description: 'COA identifier' },
  { name: 'account_number', label: 'Account Number', type: 'string', required: true, aliases: ['gl', 'g_l', 'gl account', 'account', 'gl code', 'saknr'], description: 'GL account number' },
  { name: 'account_description', label: 'Account Description', type: 'string', required: true, aliases: ['description', 'gl description', 'account name', 'txt20', 'txt50'], description: 'GL account description' },
  { name: 'financial_statement_category', label: 'FS Category', type: 'string', required: true, aliases: ['fs category', 'financial statement category', 'category', 'statement category'], description: 'Assets, Liabilities, Equity, Revenue/Income, Expenses' },
  { name: 'financial_statement_line', label: 'FS Line', type: 'string', required: true, aliases: ['fs line', 'fs_line_item', 'financial statement line'], description: 'Financial statement line item' },
  { name: 'account_grouping_1', label: 'Account Grouping 1', type: 'string', required: false, aliases: ['grouping', 'account group', 'sub group'], description: 'Primary account grouping' },
  { name: 'financial_statement_type', label: 'FS Type', type: 'string', required: false, aliases: ['fs type', 'bs/is', 'balance sheet / income statement'], description: 'BS (Balance Sheet) or IS (Income Statement)' },
  { name: 'entity_id', label: 'Entity ID', type: 'string', required: false, aliases: ['entity', 'entity id', 'company code'], description: 'Associated Entity ID' }
];

export const TRIAL_BALANCE_FIELDS = OMNIA_TB_FIELDS;
export const JOURNAL_ENTRY_FIELDS = OMNIA_GL_FIELDS;
