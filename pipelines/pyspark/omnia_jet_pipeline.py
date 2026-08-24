import os
import sys
import json
import re
import datetime
import math
import argparse
import pandas as pd
import numpy as np
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from common_utils import clean_str, parse_num, parse_date_str, parse_date_obj, date_to_iso, log_event

def run_omnia_jet(config_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    run_id = config.get('runId', 'UNKNOWN_RUN')
    output_dir = os.path.join(os.path.dirname(os.path.dirname(config_path)), 'output')
    os.makedirs(output_dir, exist_ok=True)
    log_file = os.path.join(os.path.dirname(os.path.dirname(config_path)), 'logs', 'execution.txt')
    
    log_event(run_id, 'INITIALIZATION', 5, 'Initializing Omnia JET Workflow engine', log_file)

    input_files = config.get('files', [])
    dataset_map = config.get('datasetMap', {})
    field_mappings = config.get('fieldMappings', {})
    params = config.get('omniaParameters', {}) or {}

    log_event(run_id, 'READ_INPUT', 10, f'Reading Omnia input datasets ({len(input_files)} uploaded)', log_file)

    def load_dataset(file_id, sheet_name=None):
        for f in input_files:
            if f.get('fileId') == file_id or f.get('fileName') == file_id:
                path = f.get('filePath')
                ext = f.get('extension', '').lower()
                if ext in ('xlsx', 'xls'):
                    if sheet_name:
                        return pd.read_excel(path, sheet_name=sheet_name, dtype=str)
                    return pd.read_excel(path, dtype=str)
                else:
                    try:
                        return pd.read_csv(path, dtype=str, skipinitialspace=True)
                    except:
                        return pd.read_csv(path, sep=None, engine='python', dtype=str)
        return None

    tb_df = None
    tb_beg_df = None   # Prior-year (beginning) TB
    tb_end_df = None   # Current-year (ending) TB
    gl_df = None
    coa_df = None

    # ── Sheet-name aliases for beginning / ending TB ──────────────────────
    BEG_SHEET_NAMES = {'tb_beginning', 'tbbeg', 'tb_beg', 'beginning', 'tb_prior'}
    END_SHEET_NAMES = {'tb_ending', 'tbend', 'tb_end', 'ending', 'tb_current'}

    for f in input_files:
        detected = f.get('detectedDataset')
        if detected == 'TRIAL_BALANCE' and tb_df is None:
            tb_df = load_dataset(f.get('fileId'))
        elif detected in ('GENERAL_LEDGER', 'POPULATION') and gl_df is None:
            gl_df = load_dataset(f.get('fileId'))
        elif detected == 'COA' and coa_df is None:
            coa_df = load_dataset(f.get('fileId'))
        elif f.get('sheets'):
            for s in f.get('sheets', []):
                s_class = s.get('detectedDataset')
                s_name  = (s.get('sheetName') or '').lower().replace(' ', '_')
                if s_class in ('TRIAL_BALANCE', 'TRIAL_BALANCE_BEG') or s_name in BEG_SHEET_NAMES:
                    if tb_beg_df is None:
                        tb_beg_df = load_dataset(f.get('fileId'), s.get('sheetName'))
                    elif tb_df is None:   # fall-back: first TB sheet if no beg marker found
                        tb_df = load_dataset(f.get('fileId'), s.get('sheetName'))
                elif s_class == 'TRIAL_BALANCE_END' or s_name in END_SHEET_NAMES:
                    if tb_end_df is None:
                        tb_end_df = load_dataset(f.get('fileId'), s.get('sheetName'))
                elif s_class in ('GENERAL_LEDGER', 'POPULATION') and gl_df is None:
                    gl_df = load_dataset(f.get('fileId'), s.get('sheetName'))
                elif s_class == 'COA' and coa_df is None:
                    coa_df = load_dataset(f.get('fileId'), s.get('sheetName'))

    if dataset_map.get('tbFileId'):
        tb_df = load_dataset(dataset_map['tbFileId'], dataset_map.get('tbSheetName'))
    if dataset_map.get('glFileId'):
        gl_df = load_dataset(dataset_map['glFileId'], dataset_map.get('glSheetName'))
    if dataset_map.get('coaFileId'):
        coa_df = load_dataset(dataset_map['coaFileId'], dataset_map.get('coaSheetName'))

    # ── Merge Beginning + Ending TB if both are present ──────────────────
    if tb_beg_df is not None and tb_end_df is not None:
        log_event(run_id, 'TB_MERGE', 15,
                  f'Merging TB_Beginning ({len(tb_beg_df)} rows) + TB_Ending ({len(tb_end_df)} rows) into unified TB',
                  log_file)
        # Align columns – use union of both column sets, fill missing with NaN
        all_cols = list(dict.fromkeys(list(tb_beg_df.columns) + list(tb_end_df.columns)))
        tb_beg_df = tb_beg_df.reindex(columns=all_cols)
        tb_end_df = tb_end_df.reindex(columns=all_cols)
        tb_df = pd.concat([tb_beg_df, tb_end_df], ignore_index=True)
    elif tb_beg_df is not None and tb_df is None:
        tb_df = tb_beg_df   # only beginning available
    elif tb_end_df is not None and tb_df is None:
        tb_df = tb_end_df   # only ending available

    if tb_df is None:
        raise ValueError("Trial Balance (TB) dataset is required for Omnia JET workflow.")
    if gl_df is None:
        raise ValueError("General Ledger Detail (JE) dataset is required for Omnia JET workflow.")
    if coa_df is None:
        raise ValueError("Chart of Accounts (COA) dataset is required for Omnia JET workflow.")

    log_event(run_id, 'MAPPING', 20, 'Applying Omnia CDM standardized field mappings', log_file)

    def apply_mapping(df, mapping_list):
        if not mapping_list:
            return df
        rename_map = {}
        for m in mapping_list:
            std = m.get('standardField')
            src = m.get('sourceField')
            if src and src in df.columns:
                rename_map[src] = std
        return df.rename(columns=rename_map)

    tb_df = apply_mapping(tb_df, field_mappings.get('tb', []))
    gl_df = apply_mapping(gl_df, field_mappings.get('gl', []))
    coa_df = apply_mapping(coa_df, field_mappings.get('coa', []))

    def get_col(df, target_names, default=""):
        for name in target_names:
            if name in df.columns:
                return df[name]
        return pd.Series([default] * len(df), index=df.index)

    dec_sep = params.get('decimalSeparator', 'Period')

    # -------------------------------------------------------------
    # 1. PREPARING GENERAL LEDGER DETAIL
    # -------------------------------------------------------------
    log_event(run_id, 'GL_PREPARATION', 30, 'Transforming and standardizing General Ledger Detail', log_file)

    gl_clean = pd.DataFrame()
    gl_clean['entity_id'] = get_col(gl_df, ['entity_id', 'entity', 'Entity Number', 'Company Code']).apply(clean_str)
    gl_clean['entity_name'] = get_col(gl_df, ['entity_name', 'company name']).apply(clean_str)
    gl_clean['journal_number'] = get_col(gl_df, ['journal_number', 'documentno', 'Document number', 'Accounting document']).apply(clean_str)
    gl_clean['journal_line_number'] = get_col(gl_df, ['journal_line_number', 'line', 'item', 'Line number']).apply(clean_str)
    gl_clean['account_number'] = get_col(gl_df, ['account_number', 'g_l', 'gl', 'GL Account', 'Account Number']).apply(clean_str)
    gl_clean['account_description'] = get_col(gl_df, ['account_description', 'description', 'GL Description']).apply(clean_str)
    gl_clean['journal_header_description'] = get_col(gl_df, ['journal_header_description', 'document_header_text', 'Text Header']).apply(clean_str)
    gl_clean['journal_line_description'] = get_col(gl_df, ['journal_line_description', 'text', 'Text Details']).apply(clean_str)
    
    gl_clean['date_effective'] = get_col(gl_df, ['date_effective', 'entry_date', 'Accounting date']).apply(parse_date_str)
    gl_clean['date_posted'] = get_col(gl_df, ['date_posted', 'pstng_date', 'Posting date']).apply(parse_date_str)
    gl_clean['fiscal_year'] = get_col(gl_df, ['fiscal_year', 'year']).apply(clean_str)
    gl_clean['fiscal_period'] = get_col(gl_df, ['fiscal_period', 'period']).apply(clean_str)
    
    gl_clean['net_amount_ec'] = get_col(gl_df, ['net_amount_ec', 'amount_in_local_cur', 'Amount in local currency', 'Amount']).apply(lambda x: parse_num(x, dec_sep))
    gl_clean['entity_currency_ec'] = get_col(gl_df, ['entity_currency_ec', 'lcurr', 'Local Currency', 'Curr', 'Currency code'], 'INR').apply(clean_str)
    
    # Derive debit / credit if missing
    raw_debit_ec = get_col(gl_df, ['debit_amount_ec', 'debit']).apply(lambda x: parse_num(x, dec_sep))
    raw_credit_ec = get_col(gl_df, ['credit_amount_ec', 'credit']).apply(lambda x: parse_num(x, dec_sep))
    
    gl_clean['debit_amount_ec'] = np.where((raw_debit_ec == 0) & (raw_credit_ec == 0) & (gl_clean['net_amount_ec'] > 0), gl_clean['net_amount_ec'], raw_debit_ec)
    gl_clean['credit_amount_ec'] = np.where((raw_debit_ec == 0) & (raw_credit_ec == 0) & (gl_clean['net_amount_ec'] < 0), -gl_clean['net_amount_ec'], raw_credit_ec)

    gl_clean['net_amount_gc'] = get_col(gl_df, ['net_amount_gc', 'amount_in_loc_curr_2', 'Amount in group curr']).apply(lambda x: parse_num(x, dec_sep))
    gl_clean['group_currency_gc'] = get_col(gl_df, ['group_currency_gc', 'lcur2', 'Group Currency']).apply(clean_str)
    gl_clean['debit_amount_gc'] = get_col(gl_df, ['debit_amount_gc']).apply(lambda x: parse_num(x, dec_sep))
    gl_clean['credit_amount_gc'] = get_col(gl_df, ['credit_amount_gc']).apply(lambda x: parse_num(x, dec_sep))

    gl_clean['net_amount_oc'] = get_col(gl_df, ['net_amount_oc', 'amount_in_doc_curr', 'Amount in doc curr']).apply(lambda x: parse_num(x, dec_sep))
    gl_clean['original_currency_oc'] = get_col(gl_df, ['original_currency_oc', 'curr', 'Doc Curr']).apply(clean_str)
    gl_clean['debit_amount_oc'] = get_col(gl_df, ['debit_amount_oc']).apply(lambda x: parse_num(x, dec_sep))
    gl_clean['credit_amount_oc'] = get_col(gl_df, ['credit_amount_oc']).apply(lambda x: parse_num(x, dec_sep))

    gl_clean['transaction_type'] = get_col(gl_df, ['transaction_type', 'type', 'Document type']).apply(clean_str)
    gl_clean['transaction_type_description'] = get_col(gl_df, ['transaction_type_description']).apply(clean_str)
    gl_clean['time_posted'] = get_col(gl_df, ['time_posted', 'time']).apply(clean_str)
    gl_clean['userid_entered'] = get_col(gl_df, ['userid_entered', 'user_name', 'User UD', 'User Name', 'Username']).apply(clean_str)
    gl_clean['user_name_entered'] = get_col(gl_df, ['user_name_entered', 'user_name', 'User Name']).apply(clean_str)
    
    # is_standard logic: S for standard, N for non-standard
    raw_is_std = get_col(gl_df, ['is_standard', 'standard_flag', 'mansys']).apply(clean_str).str.upper()
    gl_clean['is_standard'] = np.where(raw_is_std.isin(['S', 'STANDARD', 'Y', 'YES', '1']), 'S',
                              np.where(raw_is_std.isin(['N', 'NON-STANDARD', 'NONSTANDARD', 'NO', '0']), 'N',
                              np.where(gl_clean['transaction_type'].isin(['SA', 'AB', 'MANUAL']), 'N', 'S')))

    gl_clean['source'] = get_col(gl_df, ['source', 'source_system']).apply(clean_str)
    gl_clean['dc_indicator'] = np.where(gl_clean['net_amount_ec'] >= 0, 'D', 'C')

    # Default missing entity_id
    if (gl_clean['entity_id'] == '').all():
        gl_clean['entity_id'] = 'ENT01'

    # Save GL outputs
    gl_out_csv = os.path.join(output_dir, 'General_Ledger_Detail.csv')
    gl_clean.to_csv(gl_out_csv, index=False)

    # -------------------------------------------------------------
    # 2. PREPARING TRIAL BALANCE (TB_Start + TB_End -> TB_Full)
    # -------------------------------------------------------------
    log_event(run_id, 'TB_PREPARATION', 42, 'Transforming and standardizing Trial Balance', log_file)

    # 1. Determine period dates for beginning cutoff (1 day prior to start) and ending cutoff
    testing_period_start = params.get('testingPeriodStart') or params.get('first_day_testing_period') or '04/01/2025'
    testing_period_end = params.get('testingPeriodEnd') or params.get('last_day_testing_period') or params.get('fiscalYearEnd') or '03/31/2026'

    start_date_obj = parse_date_obj(testing_period_start) or datetime.date(2025, 4, 1)
    end_date_obj = parse_date_obj(testing_period_end) or datetime.date(2026, 3, 31)

    prior_period_end_date = (start_date_obj - datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    current_period_end_date = end_date_obj.strftime('%Y-%m-%d')
    current_fy = str(params.get('fiscalYear') or 2026)
    try:
        prior_fy = str(int(current_fy) - 1)
    except:
        prior_fy = "2025"

    # 2. Extract base fields from raw TB
    tb_base = pd.DataFrame()
    tb_base['entity_id'] = get_col(tb_df, ['entity_id', 'entity', 'Entity Number', 'Company Code']).apply(clean_str)
    tb_base['entity_name'] = get_col(tb_df, ['entity_name', 'company name']).apply(clean_str)
    tb_base['account_number'] = get_col(tb_df, ['account_number', 'g_l', 'gl', 'GL Account', 'Account Number']).apply(clean_str)
    tb_base['account_description'] = get_col(tb_df, ['account_description', 'description', 'GL Description']).apply(clean_str)
    tb_base['raw_period_end_date'] = get_col(tb_df, ['period_end_date', 'end_date', 'date', 'Closing Date']).apply(date_to_iso)
    tb_base['entity_currency_ec'] = get_col(tb_df, ['entity_currency_ec', 'currency', 'lcurr', 'Local Currency'], 'INR').apply(clean_str)
    tb_base['group_currency_gc'] = get_col(tb_df, ['group_currency_gc', 'group_currency'], 'USD').apply(clean_str)
    
    tb_base['beginning_balance_ec'] = get_col(tb_df, ['beginning_balance_ec', 'opening_balance', 'Opening Balance', 'beginning_balance', 'op balance']).apply(lambda x: parse_num(x, dec_sep))
    tb_base['ending_balance_ec'] = get_col(tb_df, ['ending_balance_ec', 'closing_balance', 'Closing Balance', 'ending_balance', 'balance']).apply(lambda x: parse_num(x, dec_sep))
    tb_base['beginning_balance_gc'] = get_col(tb_df, ['beginning_balance_gc']).apply(lambda x: parse_num(x, dec_sep))
    tb_base['ending_balance_gc'] = get_col(tb_df, ['ending_balance_gc']).apply(lambda x: parse_num(x, dec_sep))
    
    # Auto-derive GC amounts if not present
    tb_base['beginning_balance_gc'] = np.where(tb_base['beginning_balance_gc'] == 0, (tb_base['beginning_balance_ec'] / 83.1).round(2), tb_base['beginning_balance_gc'])
    tb_base['ending_balance_gc'] = np.where(tb_base['ending_balance_gc'] == 0, (tb_base['ending_balance_ec'] / 83.1).round(2), tb_base['ending_balance_gc'])

    tb_base['period_type'] = get_col(tb_df, ['period_type'], 'YTD').apply(clean_str)
    tb_base['chart_of_accounts'] = get_col(tb_df, ['chart_of_accounts'], 'DEFAULT').apply(clean_str)

    if (tb_base['entity_id'] == '').all():
        tb_base['entity_id'] = gl_clean['entity_id'].iloc[0] if len(gl_clean) > 0 else 'ENT01'

    # Check if TB already contains distinct beginning and ending period dates (pre-split)
    distinct_dates = set(d for d in tb_base['raw_period_end_date'].unique() if d)
    has_dual_dates = (prior_period_end_date in distinct_dates and current_period_end_date in distinct_dates) or len(distinct_dates) >= 2

    if has_dual_dates:
        # Pre-split / multi-date TB provided
        tb_clean = tb_base.copy()
        tb_clean['period_end_date'] = tb_clean['raw_period_end_date']
        tb_clean['Fiscal_Year_Identifier'] = np.where(
            tb_clean['period_end_date'] <= prior_period_end_date, 'Current Period Beginning', 'Current Period Ending'
        )
        tb_clean['fiscal_year'] = np.where(
            tb_clean['Fiscal_Year_Identifier'] == 'Current Period Beginning', prior_fy, current_fy
        )
        tb_clean['fiscal_period'] = '12'
    else:
        # USER PROVIDED SINGLE TB FILE:
        # Auto-create TB_Start (TB_Beginning) and TB_End (TB_Ending), and union them to create TB_Full
        log_event(run_id, 'TB_AUTO_SPLIT', 45,
                  f'Auto-creating TB_Start (as-of {prior_period_end_date}) and TB_End (as-of {current_period_end_date}) from single TB dataset',
                  log_file)

        # 1. TB_Start (Prior Period Cutoff): contains beginning balances as ending balances
        tb_beg = tb_base.copy()
        tb_beg['period_end_date'] = prior_period_end_date
        tb_beg['ending_balance_ec'] = tb_base['beginning_balance_ec']
        tb_beg['ending_balance_gc'] = tb_base['beginning_balance_gc']
        tb_beg['beginning_balance_ec'] = 0.0
        tb_beg['beginning_balance_gc'] = 0.0
        tb_beg['fiscal_year'] = prior_fy
        tb_beg['fiscal_period'] = '12'
        tb_beg['Fiscal_Year_Identifier'] = 'Current Period Beginning'

        # 2. TB_End (Current Period Cutoff): contains current year ending balances
        tb_end = tb_base.copy()
        tb_end['period_end_date'] = current_period_end_date
        tb_end['ending_balance_ec'] = tb_base['ending_balance_ec']
        tb_end['ending_balance_gc'] = tb_base['ending_balance_gc']
        tb_end['beginning_balance_ec'] = tb_base['beginning_balance_ec']
        tb_end['beginning_balance_gc'] = tb_base['beginning_balance_gc']
        tb_end['fiscal_year'] = current_fy
        tb_end['fiscal_period'] = '12'
        tb_end['Fiscal_Year_Identifier'] = 'Current Period Ending'

        # Export individual TB_Start and TB_End for reference/checkpoints
        tb_beg.drop(columns=['raw_period_end_date'], errors='ignore').to_csv(os.path.join(output_dir, 'TB_Start.csv'), index=False)
        tb_end.drop(columns=['raw_period_end_date'], errors='ignore').to_csv(os.path.join(output_dir, 'TB_End.csv'), index=False)

        # 3. Union TB_Start and TB_End into unified TB_Full (tb_clean)
        tb_clean = pd.concat([tb_beg, tb_end], ignore_index=True)

    tb_clean = tb_clean.drop(columns=['raw_period_end_date'], errors='ignore')

    tb_out_csv = os.path.join(output_dir, 'Trial_Balance.csv')
    tb_clean.to_csv(tb_out_csv, index=False)

    # -------------------------------------------------------------
    # 3. PREPARING CHART OF ACCOUNTS (COA)
    # -------------------------------------------------------------
    log_event(run_id, 'COA_PREPARATION', 50, 'Transforming and standardizing Chart of Accounts', log_file)

    coa_clean = pd.DataFrame()
    coa_clean['chart_of_accounts'] = get_col(coa_df, ['chart_of_accounts'], 'DEFAULT').apply(clean_str)
    coa_clean['account_number'] = get_col(coa_df, ['account_number', 'g_l', 'gl', 'GL Account', 'Account Number']).apply(clean_str)
    coa_clean['account_description'] = get_col(coa_df, ['account_description', 'description', 'GL Description']).apply(clean_str)
    
    # Financial Statement Category normalization
    raw_cat = get_col(coa_df, ['financial_statement_category', 'fs category', 'category', 'account_subtype']).apply(clean_str).str.lower()
    coa_clean['financial_statement_category'] = np.where(raw_cat.str.contains('asset'), 'Assets',
                                                np.where(raw_cat.str.contains('liab'), 'Liabilities',
                                                np.where(raw_cat.str.contains('equity'), 'Equity',
                                                np.where(raw_cat.str.contains('rev') | raw_cat.str.contains('income'), 'Revenue',
                                                np.where(raw_cat.str.contains('exp'), 'Expenses', 'Assets')))))
    
    coa_clean['financial_statement_line'] = get_col(coa_df, ['financial_statement_line', 'fs_line_item', 'fs line']).apply(clean_str)
    coa_clean['account_grouping_1'] = get_col(coa_df, ['account_grouping_1', 'grouping']).apply(clean_str)
    coa_clean['financial_statement_type'] = np.where(coa_clean['financial_statement_category'].isin(['Assets', 'Liabilities', 'Equity']), 'BS', 'IS')
    coa_clean['entity_id'] = get_col(coa_df, ['entity_id'], tb_clean['entity_id'].iloc[0] if len(tb_clean) > 0 else 'ENT01').apply(clean_str)
    coa_clean['revision_date'] = get_col(coa_df, ['revision_date']).apply(parse_date_str)

    coa_out_csv = os.path.join(output_dir, 'Chart_of_Accounts.csv')
    coa_clean.to_csv(coa_out_csv, index=False)

    # -------------------------------------------------------------
    # 4. OMNIA RECONCILIATION
    # -------------------------------------------------------------
    log_event(run_id, 'RECONCILIATION', 60, 'Performing account-level reconciliation (TB vs JE Activity)', log_file)

    # Summarize JE by entity_id and account_number
    je_summary = gl_clean.groupby(['entity_id', 'account_number']).agg(
        je_activity=('net_amount_ec', 'sum'),
        debit_amount=('debit_amount_ec', 'sum'),
        credit_amount=('credit_amount_ec', 'sum'),
        number_of_lines=('journal_line_number', 'count'),
        number_of_entries=('journal_number', 'nunique')
    ).reset_index()

    # Reconcile using pivoted beginning and ending balances from unified TB
    tb_beg_sub = tb_clean[tb_clean['Fiscal_Year_Identifier'] == 'Current Period Beginning'][
        ['entity_id', 'account_number', 'account_description', 'ending_balance_ec', 'ending_balance_gc']
    ].rename(columns={'ending_balance_ec': 'beginning_balance', 'ending_balance_gc': 'beginning_balance_gc'})

    tb_end_sub = tb_clean[tb_clean['Fiscal_Year_Identifier'] == 'Current Period Ending'][
        ['entity_id', 'account_number', 'account_description', 'ending_balance_ec', 'ending_balance_gc']
    ].rename(columns={'ending_balance_ec': 'ending_balance', 'ending_balance_gc': 'ending_balance_gc'})

    if len(tb_beg_sub) > 0 and len(tb_end_sub) > 0:
        tb_reconciled_base = tb_end_sub.merge(
            tb_beg_sub[['entity_id', 'account_number', 'beginning_balance', 'beginning_balance_gc']],
            on=['entity_id', 'account_number'],
            how='outer'
        )
    elif len(tb_end_sub) > 0:
        tb_reconciled_base = tb_end_sub.copy()
        tb_reconciled_base['beginning_balance'] = 0.0
        tb_reconciled_base['beginning_balance_gc'] = 0.0
    else:
        tb_reconciled_base = tb_clean[['entity_id', 'account_number', 'account_description', 'beginning_balance_ec', 'ending_balance_ec']].rename(
            columns={'beginning_balance_ec': 'beginning_balance', 'ending_balance_ec': 'ending_balance'}
        ).drop_duplicates(subset=['entity_id', 'account_number'])

    tb_reconciled_base['beginning_balance'] = tb_reconciled_base['beginning_balance'].fillna(0.0)
    tb_reconciled_base['ending_balance'] = tb_reconciled_base['ending_balance'].fillna(0.0)

    recon_df = tb_reconciled_base.merge(je_summary, on=['entity_id', 'account_number'], how='outer')
    recon_df = recon_df.merge(
        coa_clean[['account_number', 'financial_statement_category', 'financial_statement_line', 'account_grouping_1']],
        on='account_number',
        how='left'
    )

    recon_df['beginning_balance'] = recon_df['beginning_balance'].fillna(0.0)
    recon_df['ending_balance'] = recon_df['ending_balance'].fillna(0.0)
    recon_df['je_activity'] = recon_df['je_activity'].fillna(0.0)
    recon_df['debit_amount'] = recon_df['debit_amount'].fillna(0.0)
    recon_df['credit_amount'] = recon_df['credit_amount'].fillna(0.0)
    recon_df['number_of_lines'] = recon_df['number_of_lines'].fillna(0).astype(int)
    recon_df['number_of_entries'] = recon_df['number_of_entries'].fillna(0).astype(int)

    # Trial Activity = Ending Balance - Beginning Balance
    recon_df['trial_activity'] = recon_df['ending_balance'] - recon_df['beginning_balance']
    recon_df['variance'] = recon_df['ending_balance'] - recon_df['beginning_balance'] - recon_df['je_activity']
    recon_df['abs_variance'] = recon_df['variance'].abs()

    # Classification
    recon_df['reconciliation'] = np.where(recon_df['abs_variance'] <= 1.0, 'Reconciled', 'Unreconciled')
    recon_df['reconciliation_currency'] = 'Entity Currency'

    recon_out_csv = os.path.join(output_dir, 'Parquet_Reconciliation.csv')
    recon_df.to_csv(recon_out_csv, index=False)

    unrecon_df = recon_df[recon_df['reconciliation'] == 'Unreconciled'].copy()
    unrecon_out_csv = os.path.join(output_dir, 'Unreconciled_Accounts_Detail.csv')
    unrecon_df.to_csv(unrecon_out_csv, index=False)

    reconciled_count = int((recon_df['reconciliation'] == 'Reconciled').sum())
    unreconciled_count = int((recon_df['reconciliation'] == 'Unreconciled').sum())

    # -------------------------------------------------------------
    # 5. DATA INTEGRITY CHECKS (ALL 20 DQCs)
    # -------------------------------------------------------------
    log_event(run_id, 'DQC_EXECUTION', 75, 'Executing all 20 Data Quality Checks (DQC 01a to 20)', log_file)

    dqc_results = []
    
    coa_accounts = set(coa_clean['account_number'].unique())
    tb_accounts = set(tb_clean['account_number'].unique())

    # 01a: COA Blank Values
    coa_blank = coa_clean[(coa_clean['account_number'] == '') | (coa_clean['account_description'] == '') | (coa_clean['financial_statement_category'] == '')]
    dqc_results.append({
        'check': '01a_Error_COA_Blank_Values',
        'desc': 'Chart of accounts has blank values in critical fields',
        'type': 'Error',
        'capability': 'Core Mapping',
        'fields': 'account_number, account_description, financial_statement_category',
        'affected_je': 0,
        'affected_lines': len(coa_blank),
        'debit_ec': 0.0, 'credit_ec': 0.0
    })

    # 01b: TB Blank Values
    tb_blank = tb_clean[(tb_clean['entity_id'] == '') | (tb_clean['account_number'] == '') | (tb_clean['period_end_date'] == '')]
    dqc_results.append({
        'check': '01b_Error_TB_Blank_Values',
        'desc': 'Trial balance has blank values in critical fields',
        'type': 'Error',
        'capability': 'Core Mapping',
        'fields': 'entity_id, account_number, period_end_date',
        'affected_je': 0,
        'affected_lines': len(tb_blank),
        'debit_ec': 0.0, 'credit_ec': 0.0
    })

    # 01c: JE Blank Values
    je_blank = gl_clean[(gl_clean['entity_id'] == '') | (gl_clean['journal_number'] == '') | (gl_clean['account_number'] == '') | (gl_clean['date_effective'] == '')]
    dqc_results.append({
        'check': '01c_Error_JE_Blank_Values',
        'desc': 'Journal entry data has blank values in critical fields',
        'type': 'Error',
        'capability': 'Core Mapping',
        'fields': 'entity_id, journal_number, account_number, date_effective',
        'affected_je': je_blank['journal_number'].nunique(),
        'affected_lines': len(je_blank),
        'debit_ec': je_blank['debit_amount_ec'].sum(), 'credit_ec': je_blank['credit_amount_ec'].sum()
    })

    # 01d: JE Blank User ID
    je_blank_user = gl_clean[gl_clean['userid_entered'] == '']
    dqc_results.append({
        'check': '01d_Warning_JE_Blank_UserID',
        'desc': 'Journal entry data has blank values in User ID',
        'type': 'Warning',
        'capability': 'User Analytics',
        'fields': 'userid_entered',
        'affected_je': je_blank_user['journal_number'].nunique(),
        'affected_lines': len(je_blank_user),
        'debit_ec': je_blank_user['debit_amount_ec'].sum(), 'credit_ec': je_blank_user['credit_amount_ec'].sum()
    })

    # 01e: JE Blank Transaction Type
    je_blank_type = gl_clean[gl_clean['transaction_type'] == '']
    dqc_results.append({
        'check': '01e_Warning_JE_Blank_Transaction_Type',
        'desc': 'Journal entry data has blank values in Transaction Type',
        'type': 'Warning',
        'capability': 'Standard/Non-Standard',
        'fields': 'transaction_type',
        'affected_je': je_blank_type['journal_number'].nunique(),
        'affected_lines': len(je_blank_type),
        'debit_ec': je_blank_type['debit_amount_ec'].sum(), 'credit_ec': je_blank_type['credit_amount_ec'].sum()
    })

    # 02a: TB Accounts Not in COA
    tb_not_coa = tb_clean[~tb_clean['account_number'].isin(coa_accounts)]
    dqc_results.append({
        'check': '02a_Error_TB_Accounts_Not_In_COA',
        'desc': 'Trial balance has accounts not in chart of accounts',
        'type': 'Error',
        'capability': 'Core Reconciliation',
        'fields': 'account_number',
        'affected_je': 0,
        'affected_lines': len(tb_not_coa),
        'debit_ec': 0.0, 'credit_ec': 0.0
    })

    # 02b: JE Accounts Not in COA
    je_not_coa = gl_clean[~gl_clean['account_number'].isin(coa_accounts)]
    dqc_results.append({
        'check': '02b_Error_JE_Accounts_Not_In_COA',
        'desc': 'Journal entry data has accounts not in chart of accounts',
        'type': 'Error',
        'capability': 'Core Reconciliation',
        'fields': 'account_number',
        'affected_je': je_not_coa['journal_number'].nunique(),
        'affected_lines': len(je_not_coa),
        'debit_ec': je_not_coa['debit_amount_ec'].sum(), 'credit_ec': je_not_coa['credit_amount_ec'].sum()
    })

    # 03a: TB Amount Digits Too Long
    tb_long_digits = tb_clean[tb_clean['ending_balance_ec'].abs() > 1e15]
    dqc_results.append({
        'check': '03a_Error_TB_Amount_Digits_TooLong',
        'desc': 'Trial balance amounts have excess digits',
        'type': 'Error',
        'capability': 'Data Integrity',
        'fields': 'ending_balance_ec',
        'affected_je': 0,
        'affected_lines': len(tb_long_digits),
        'debit_ec': 0.0, 'credit_ec': 0.0
    })

    # 03b: JE Amount Digits Too Long
    je_long_digits = gl_clean[gl_clean['net_amount_ec'].abs() > 1e15]
    dqc_results.append({
        'check': '03b_Error_JE_Amount_Digits_TooLong',
        'desc': 'Journal entry amounts have excess digits',
        'type': 'Error',
        'capability': 'Data Integrity',
        'fields': 'net_amount_ec',
        'affected_je': je_long_digits['journal_number'].nunique(),
        'affected_lines': len(je_long_digits),
        'debit_ec': je_long_digits['debit_amount_ec'].sum(), 'credit_ec': je_long_digits['credit_amount_ec'].sum()
    })

    # 04a: COA Duplicate Account Numbers
    coa_dup = coa_clean[coa_clean.duplicated(subset=['account_number'], keep=False)]
    dqc_results.append({
        'check': '04a_Error_COA_Duplicate_Account_Numbers',
        'desc': 'Chart of accounts has duplicate account numbers',
        'type': 'Error',
        'capability': 'COA Integrity',
        'fields': 'account_number',
        'affected_je': 0,
        'affected_lines': len(coa_dup),
        'debit_ec': 0.0, 'credit_ec': 0.0
    })

    # 04b: TB Duplicate Account Numbers
    tb_dup = tb_clean[tb_clean.duplicated(subset=['entity_id', 'account_number'], keep=False)]
    dqc_results.append({
        'check': '04b_Error_TB_Duplicate_Account_Numbers',
        'desc': 'Trial balance has duplicate account numbers',
        'type': 'Error',
        'capability': 'TB Integrity',
        'fields': 'account_number',
        'affected_je': 0,
        'affected_lines': len(tb_dup),
        'debit_ec': 0.0, 'credit_ec': 0.0
    })

    # 05: JE Unknown Classification
    je_unknown_class = gl_clean[~gl_clean['is_standard'].isin(['S', 'N'])]
    dqc_results.append({
        'check': '05_Error_JE_Unknown_Classification',
        'desc': 'Journal entry has lines with unknown classifications (standard/nonstandard)',
        'type': 'Error',
        'capability': 'Classification',
        'fields': 'is_standard',
        'affected_je': je_unknown_class['journal_number'].nunique(),
        'affected_lines': len(je_unknown_class),
        'debit_ec': je_unknown_class['debit_amount_ec'].sum(), 'credit_ec': je_unknown_class['credit_amount_ec'].sum()
    })

    # 06: JE Multiple Classification
    je_multi_class_docs = gl_clean.groupby('journal_number')['is_standard'].nunique()
    multi_class_jn_set = set(je_multi_class_docs[je_multi_class_docs > 1].index)
    je_multi_class = gl_clean[gl_clean['journal_number'].isin(multi_class_jn_set)]
    dqc_results.append({
        'check': '06_Error_JE_Multiple_Classification',
        'desc': 'Journal entry has lines with multiple classifications in single entry',
        'type': 'Error',
        'capability': 'Classification',
        'fields': 'journal_number, is_standard',
        'affected_je': len(multi_class_jn_set),
        'affected_lines': len(je_multi_class),
        'debit_ec': je_multi_class['debit_amount_ec'].sum(), 'credit_ec': je_multi_class['credit_amount_ec'].sum()
    })

    # 07: COA Unknown Financial Statement Category
    valid_fs_cats = {'Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses'}
    coa_bad_cat = coa_clean[~coa_clean['financial_statement_category'].isin(valid_fs_cats)]
    dqc_results.append({
        'check': '07_Error_COA_Unknown_Financial_Statement_Category',
        'desc': 'Chart of accounts has accounts with an unknown financial statement category',
        'type': 'Error',
        'capability': 'FS Presentation',
        'fields': 'financial_statement_category',
        'affected_je': 0,
        'affected_lines': len(coa_bad_cat),
        'debit_ec': 0.0, 'credit_ec': 0.0
    })

    # 08: JE Sum of Amount by Entry Not Net Zero (excluding 1-line entries)
    doc_lines_cnt = gl_clean.groupby('journal_number').size()
    multi_line_docs = set(doc_lines_cnt[doc_lines_cnt > 1].index)
    doc_sums = gl_clean[gl_clean['journal_number'].isin(multi_line_docs)].groupby('journal_number')['net_amount_ec'].sum()
    unbalanced_je_set = set(doc_sums[doc_sums.abs() > 0.01].index)
    je_unbalanced = gl_clean[gl_clean['journal_number'].isin(unbalanced_je_set)]
    dqc_results.append({
        'check': '08_Warning_JE_Sum_of_Amount_by_Entry_Not_Net_Zero',
        'desc': 'Journal entry data has multi-line entries that do not net to zero',
        'type': 'Warning',
        'capability': 'Double Entry Control',
        'fields': 'journal_number, net_amount_ec',
        'affected_je': len(unbalanced_je_set),
        'affected_lines': len(je_unbalanced),
        'debit_ec': je_unbalanced['debit_amount_ec'].sum(), 'credit_ec': je_unbalanced['credit_amount_ec'].sum()
    })

    # 09: JE One Line Entries
    one_line_docs = set(doc_lines_cnt[doc_lines_cnt == 1].index)
    je_one_line = gl_clean[gl_clean['journal_number'].isin(one_line_docs)]
    dqc_results.append({
        'check': '09_Warning_JE_One_Line_Entries',
        'desc': 'Journal entry has only one line',
        'type': 'Warning',
        'capability': 'Double Entry Control',
        'fields': 'journal_number',
        'affected_je': len(one_line_docs),
        'affected_lines': len(je_one_line),
        'debit_ec': je_one_line['debit_amount_ec'].sum(), 'credit_ec': je_one_line['credit_amount_ec'].sum()
    })

    # 10: JE Entry Amount Consistency (Net != Debit - Credit)
    je_inconsistent = gl_clean[(gl_clean['net_amount_ec'] - (gl_clean['debit_amount_ec'] - gl_clean['credit_amount_ec'])).abs() > 0.01]
    dqc_results.append({
        'check': '10_Warning_JE_Entry_Amount_Consistency',
        'desc': 'Journal entry has lines with net amount inconsistent with debit/credit',
        'type': 'Warning',
        'capability': 'Math Verification',
        'fields': 'net_amount_ec, debit_amount_ec, credit_amount_ec',
        'affected_je': je_inconsistent['journal_number'].nunique(),
        'affected_lines': len(je_inconsistent),
        'debit_ec': je_inconsistent['debit_amount_ec'].sum(), 'credit_ec': je_inconsistent['credit_amount_ec'].sum()
    })

    # 11: JE Debit Credit Same Line
    je_both_dr_cr = gl_clean[(gl_clean['debit_amount_ec'] > 0) & (gl_clean['credit_amount_ec'] > 0)]
    dqc_results.append({
        'check': '11_Warning_JE_Debit_Credit_Same_Line',
        'desc': 'Journal entry has lines with both non-zero debit and credit amounts',
        'type': 'Warning',
        'capability': 'Math Verification',
        'fields': 'debit_amount_ec, credit_amount_ec',
        'affected_je': je_both_dr_cr['journal_number'].nunique(),
        'affected_lines': len(je_both_dr_cr),
        'debit_ec': je_both_dr_cr['debit_amount_ec'].sum(), 'credit_ec': je_both_dr_cr['credit_amount_ec'].sum()
    })

    # 12: JE Amount Currency Inconsistency
    je_curr_incons = gl_clean[((gl_clean['net_amount_ec'] == 0) & (gl_clean['net_amount_gc'] != 0)) | ((gl_clean['net_amount_ec'] != 0) & (gl_clean['net_amount_gc'] == 0) & (gl_clean['group_currency_gc'] != ''))]
    dqc_results.append({
        'check': '12_Warning_JE_Amount_Currency_Inconsistency',
        'desc': 'Journal entry has lines with zero in one currency and non-zero in another',
        'type': 'Warning',
        'capability': 'Multi-Currency',
        'fields': 'net_amount_ec, net_amount_gc',
        'affected_je': je_curr_incons['journal_number'].nunique(),
        'affected_lines': len(je_curr_incons),
        'debit_ec': je_curr_incons['debit_amount_ec'].sum(), 'credit_ec': je_curr_incons['credit_amount_ec'].sum()
    })

    # 13a: JE Entity Multiple Currency
    ent_curr_cnt = gl_clean.groupby('entity_id')['entity_currency_ec'].nunique()
    multi_curr_ents = set(ent_curr_cnt[ent_curr_cnt > 1].index)
    je_multi_ent_curr = gl_clean[gl_clean['entity_id'].isin(multi_curr_ents)]
    dqc_results.append({
        'check': '13a_Warning_JE_Entity_Multiple_Currency',
        'desc': 'Journal entry data has individual entities with multiple entity currencies',
        'type': 'Warning',
        'capability': 'Multi-Currency',
        'fields': 'entity_id, entity_currency_ec',
        'affected_je': je_multi_ent_curr['journal_number'].nunique(),
        'affected_lines': len(je_multi_ent_curr),
        'debit_ec': je_multi_ent_curr['debit_amount_ec'].sum(), 'credit_ec': je_multi_ent_curr['credit_amount_ec'].sum()
    })

    # 13b: JE Group Multiple Currency
    grp_currs = gl_clean[gl_clean['group_currency_gc'] != '']['group_currency_gc'].nunique()
    dqc_results.append({
        'check': '13b_Warning_JE_Group_Multiple_Currency',
        'desc': 'Journal entry data has multiple group currencies',
        'type': 'Warning',
        'capability': 'Multi-Currency',
        'fields': 'group_currency_gc',
        'affected_je': gl_clean['journal_number'].nunique() if grp_currs > 1 else 0,
        'affected_lines': len(gl_clean) if grp_currs > 1 else 0,
        'debit_ec': gl_clean['debit_amount_ec'].sum() if grp_currs > 1 else 0.0,
        'credit_ec': gl_clean['credit_amount_ec'].sum() if grp_currs > 1 else 0.0
    })

    # 14: JE Multiple Date Values
    doc_dates_cnt = gl_clean.groupby('journal_number')['date_effective'].nunique()
    multi_date_docs = set(doc_dates_cnt[doc_dates_cnt > 1].index)
    je_multi_dates = gl_clean[gl_clean['journal_number'].isin(multi_date_docs)]
    dqc_results.append({
        'check': '14_Warning_JE_Multiple_Date_Values',
        'desc': 'Journal entry has lines with multiple effective or posted dates',
        'type': 'Warning',
        'capability': 'Temporal Consistency',
        'fields': 'journal_number, date_effective',
        'affected_je': len(multi_date_docs),
        'affected_lines': len(je_multi_dates),
        'debit_ec': je_multi_dates['debit_amount_ec'].sum(), 'credit_ec': je_multi_dates['credit_amount_ec'].sum()
    })

    # 15: JE Multiple Transaction Types
    doc_types_cnt = gl_clean.groupby('journal_number')['transaction_type'].nunique()
    multi_type_docs = set(doc_types_cnt[doc_types_cnt > 1].index)
    je_multi_type = gl_clean[gl_clean['journal_number'].isin(multi_type_docs)]
    dqc_results.append({
        'check': '15_Warning_JE_Multiple_Transaction_Type',
        'desc': 'Journal entry has lines with multiple transaction types',
        'type': 'Warning',
        'capability': 'Transaction Analytics',
        'fields': 'journal_number, transaction_type',
        'affected_je': len(multi_type_docs),
        'affected_lines': len(je_multi_type),
        'debit_ec': je_multi_type['debit_amount_ec'].sum(), 'credit_ec': je_multi_type['credit_amount_ec'].sum()
    })

    # 16: JE Prior/Post Effective Date
    tp_start = date_to_iso(params.get('testingPeriodStart', '2025-04-01'))
    tp_end = date_to_iso(params.get('testingPeriodEnd', '2026-03-31'))
    
    gl_iso_dates = gl_clean['date_effective'].apply(date_to_iso)
    if tp_start and tp_end:
        out_of_period = gl_iso_dates.apply(lambda d: d is not None and (d < tp_start or d > tp_end))
    else:
        out_of_period = pd.Series([False] * len(gl_clean))
    je_out_period = gl_clean[out_of_period]
    dqc_results.append({
        'check': '16_Warning_JE_Prior_Post_Effective_Date',
        'desc': 'Journal entry has lines with effective dates prior or after testing period',
        'type': 'Warning',
        'capability': 'Period Cutoff',
        'fields': 'date_effective',
        'affected_je': je_out_period['journal_number'].nunique(),
        'affected_lines': len(je_out_period),
        'debit_ec': je_out_period['debit_amount_ec'].sum(), 'credit_ec': je_out_period['credit_amount_ec'].sum()
    })

    # 17: JE Multiple User ID
    doc_users_cnt = gl_clean.groupby('journal_number')['userid_entered'].nunique()
    multi_user_docs = set(doc_users_cnt[doc_users_cnt > 1].index)
    je_multi_users = gl_clean[gl_clean['journal_number'].isin(multi_user_docs)]
    dqc_results.append({
        'check': '17_Observation_JE_Multiple_User_ID',
        'desc': 'Journal entry has lines with multiple User IDs in single document',
        'type': 'Observation',
        'capability': 'User Analytics',
        'fields': 'journal_number, userid_entered',
        'affected_je': len(multi_user_docs),
        'affected_lines': len(je_multi_users),
        'debit_ec': je_multi_users['debit_amount_ec'].sum(), 'credit_ec': je_multi_users['credit_amount_ec'].sum()
    })

    # 18: JE Multiple Entry Description
    doc_desc_cnt = gl_clean.groupby('journal_number')['journal_header_description'].nunique()
    multi_desc_docs = set(doc_desc_cnt[doc_desc_cnt > 1].index)
    je_multi_desc = gl_clean[gl_clean['journal_number'].isin(multi_desc_docs)]
    dqc_results.append({
        'check': '18_Observation_JE_Multiple_Entry_Description',
        'desc': 'Journal entry has multiple entry header descriptions',
        'type': 'Observation',
        'capability': 'Narration Analysis',
        'fields': 'journal_number, journal_header_description',
        'affected_je': len(multi_desc_docs),
        'affected_lines': len(je_multi_desc),
        'debit_ec': je_multi_desc['debit_amount_ec'].sum(), 'credit_ec': je_multi_desc['credit_amount_ec'].sum()
    })

    # 19: JE Sum of Amount by Transaction Type Not Net Zero
    tt_sums = gl_clean.groupby('transaction_type')['net_amount_ec'].sum()
    unbalanced_tt = set(tt_sums[tt_sums.abs() > 1.0].index)
    je_unbal_tt = gl_clean[gl_clean['transaction_type'].isin(unbalanced_tt)]
    dqc_results.append({
        'check': '19_Observation_JE_Sum_of_Amount_by_Transaction_Type_Not_Net_Zero',
        'desc': 'Journal entry data has transaction types that do not net to zero',
        'type': 'Observation',
        'capability': 'Transaction Analytics',
        'fields': 'transaction_type, net_amount_ec',
        'affected_je': je_unbal_tt['journal_number'].nunique(),
        'affected_lines': len(je_unbal_tt),
        'debit_ec': je_unbal_tt['debit_amount_ec'].sum(), 'credit_ec': je_unbal_tt['credit_amount_ec'].sum()
    })

    # 20: UserID Entered Multiple User Name Entered
    user_names_cnt = gl_clean[gl_clean['userid_entered'] != ''].groupby('userid_entered')['user_name_entered'].nunique()
    multi_name_users = set(user_names_cnt[user_names_cnt > 1].index)
    je_multi_name_users = gl_clean[gl_clean['userid_entered'].isin(multi_name_users)]
    dqc_results.append({
        'check': '20_Observation_UserID_Entered_Multiple_User_Name_Entered',
        'desc': 'User ID is mapped to more than one user name value',
        'type': 'Observation',
        'capability': 'User Analytics',
        'fields': 'userid_entered, user_name_entered',
        'affected_je': je_multi_name_users['journal_number'].nunique(),
        'affected_lines': len(je_multi_name_users),
        'debit_ec': je_multi_name_users['debit_amount_ec'].sum(), 'credit_ec': je_multi_name_users['credit_amount_ec'].sum()
    })

    dqc_summary_df = pd.DataFrame(dqc_results)
    dqc_summary_df.columns = [
        'Data_Integrity_Check_Name', 'Description', 'Error_Warning', 'Capability_Impacted',
        'Related_Fields', 'Number_of_Affected_Journal_Entries', 'Number_of_Affected_Lines',
        'Debit_Amount_EC', 'Credit_Amount_EC'
    ]
    dqc_summary_df['Data_Integrity_Check_Toggled_Off'] = 'No'

    dqc_out_csv = os.path.join(output_dir, 'Parquet_Data_Integrity_Check_00_Summary.csv')
    dqc_summary_df.to_csv(dqc_out_csv, index=False)

    # -------------------------------------------------------------
    # 6. CONTROL TOTALS
    # -------------------------------------------------------------
    log_event(run_id, 'CONTROL_TOTALS', 85, 'Generating Control Totals and JE Line Stratification', log_file)

    # By Period
    ct_period = gl_clean.groupby('fiscal_period').agg(
        line_count=('journal_line_number', 'count'),
        debit_total=('debit_amount_ec', 'sum'),
        credit_total=('credit_amount_ec', 'sum'),
        net_total=('net_amount_ec', 'sum'),
        date_min=('date_effective', 'min'),
        date_max=('date_effective', 'max')
    ).reset_index()
    ct_period_path = os.path.join(output_dir, 'Control_Total_By_Period.csv')
    ct_period.to_csv(ct_period_path, index=False)

    # By Standard / Non-Standard
    ct_std = gl_clean.groupby('is_standard').agg(
        line_count=('journal_line_number', 'count'),
        debit_total=('debit_amount_ec', 'sum'),
        credit_total=('credit_amount_ec', 'sum'),
        net_total=('net_amount_ec', 'sum'),
        date_min=('date_effective', 'min'),
        date_max=('date_effective', 'max')
    ).reset_index()
    ct_std_path = os.path.join(output_dir, 'Control_Total_By_Standard_Non_Standard.csv')
    ct_std.to_csv(ct_std_path, index=False)

    # By Currency
    ct_curr = gl_clean.groupby('entity_currency_ec').agg(
        line_count=('journal_line_number', 'count'),
        debit_total=('debit_amount_ec', 'sum'),
        credit_total=('credit_amount_ec', 'sum'),
        net_total=('net_amount_ec', 'sum'),
        date_min=('date_effective', 'min'),
        date_max=('date_effective', 'max')
    ).reset_index()
    ct_curr_path = os.path.join(output_dir, 'Control_Total_By_Currency.csv')
    ct_curr.to_csv(ct_curr_path, index=False)

    # By Transaction Type
    ct_tt = gl_clean.groupby('transaction_type').agg(
        line_count=('journal_line_number', 'count'),
        debit_total=('debit_amount_ec', 'sum'),
        credit_total=('credit_amount_ec', 'sum'),
        net_total=('net_amount_ec', 'sum'),
        date_min=('date_effective', 'min'),
        date_max=('date_effective', 'max')
    ).reset_index()
    ct_tt_path = os.path.join(output_dir, 'Control_Total_By_Transaction_Type.csv')
    ct_tt.to_csv(ct_tt_path, index=False)

    # By User
    ct_user = gl_clean.groupby('userid_entered').agg(
        line_count=('journal_line_number', 'count'),
        debit_total=('debit_amount_ec', 'sum'),
        credit_total=('credit_amount_ec', 'sum'),
        net_total=('net_amount_ec', 'sum'),
        date_min=('date_effective', 'min'),
        date_max=('date_effective', 'max')
    ).reset_index()
    ct_user_path = os.path.join(output_dir, 'Control_Total_By_User.csv')
    ct_user.to_csv(ct_user_path, index=False)

    # -------------------------------------------------------------
    # 7. JE LINE DISTRIBUTION (STRATIFICATION)
    # -------------------------------------------------------------
    doc_lines = gl_clean.groupby(['entity_id', 'is_standard', 'journal_number']).size().reset_index(name='line_count')
    
    def bucket_line_count(cnt):
        if cnt == 1: return '1'
        if 2 <= cnt <= 20: return '2 - 20'
        if 21 <= cnt <= 100: return '21 - 100'
        if 101 <= cnt <= 1000: return '101 - 1000'
        return '> 1000'

    doc_lines['Number_of_Lines_per_JE'] = doc_lines['line_count'].apply(bucket_line_count)
    strat = doc_lines.groupby(['entity_id', 'is_standard', 'Number_of_Lines_per_JE']).agg(
        Number_of_JE=('journal_number', 'count'),
        Number_of_Lines=('line_count', 'sum')
    ).reset_index()

    total_lines = len(gl_clean)
    total_je = gl_clean['journal_number'].nunique()

    strat['Percentage_of_Lines'] = (strat['Number_of_Lines'] / total_lines * 100).round(2)
    strat['Percentage_of_Entries'] = (strat['Number_of_JE'] / total_je * 100).round(2)

    strat_path = os.path.join(output_dir, 'JE_Line_Distribution.csv')
    strat.to_csv(strat_path, index=False)

    # -------------------------------------------------------------
    # 8. EXCEL RECONCILIATION TEMPLATE GENERATION
    # -------------------------------------------------------------
    log_event(run_id, 'EXCEL_EXPORT', 92, 'Building formatted JE-Recon-and-DIC-Template.xlsx', log_file)

    excel_template_path = os.path.join(output_dir, 'JE-Recon-and-DIC-Template.xlsx')
    wb = openpyxl.Workbook()
    wb.remove(wb.active) # Remove default sheet

    header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='007680', end_color='007680', fill_type='solid') # Deloitte Green-Teal
    border_thin = Border(left=Side(style='thin', color='D9D9D9'), right=Side(style='thin', color='D9D9D9'),
                         top=Side(style='thin', color='D9D9D9'), bottom=Side(style='thin', color='D9D9D9'))

    def format_sheet(ws, title, df, max_rows=1000):
        ws.title = title
        headers = list(df.columns)
        ws.append(headers)
        for col_num, h in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center')
        
        for r_idx, row in enumerate(df.head(max_rows).itertuples(index=False), 2):
            for c_idx, val in enumerate(row, 1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.border = border_thin
                if isinstance(val, (int, float)):
                    cell.alignment = Alignment(horizontal='right')
                else:
                    cell.alignment = Alignment(horizontal='left')
        
        # Auto adjust column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

    # 1. Summary Sheet
    ws_summary = wb.create_sheet(title='Summary')
    summary_data_list = [
        ['Metric', 'Value'],
        ['Engagement Run ID', run_id],
        ['Workflow', 'OMNIA JET (Golden Checks & Reconciliation)'],
        ['Total Input JE Lines', len(gl_clean)],
        ['Total Journal Entries', total_je],
        ['Total TB Accounts', len(tb_clean)],
        ['Total COA Accounts', len(coa_clean)],
        ['Reconciled Accounts', reconciled_count],
        ['Unreconciled Accounts', unreconciled_count],
        ['Total Beginning Balance (EC)', float(recon_df['beginning_balance'].sum())],
        ['Total Ending Balance (EC)', float(recon_df['ending_balance'].sum())],
        ['Total JE Net Activity (EC)', float(recon_df['je_activity'].sum())],
        ['Total Trial Activity (EC)', float(recon_df['trial_activity'].sum())],
        ['Total Net Variance (EC)', float(recon_df['variance'].sum())],
        ['DQC Errors Flagged', int((dqc_summary_df['Error_Warning'] == 'Error').sum())],
        ['DQC Warnings Flagged', int((dqc_summary_df['Error_Warning'] == 'Warning').sum())],
        ['DQC Observations Flagged', int((dqc_summary_df['Error_Warning'] == 'Observation').sum())],
    ]
    for r_idx, row in enumerate(summary_data_list, 1):
        for c_idx, val in enumerate(row, 1):
            cell = ws_summary.cell(row=r_idx, column=c_idx, value=val)
            if r_idx == 1:
                cell.font = header_font
                cell.fill = header_fill
            else:
                cell.border = border_thin
                if c_idx == 1:
                    cell.font = Font(name='Calibri', size=11, bold=True)

    # 2. Reconciliation Tab
    ws_recon = wb.create_sheet(title='Reconciliation')
    format_sheet(ws_recon, 'Reconciliation', recon_df[['entity_id', 'account_number', 'account_description', 'financial_statement_category', 'ending_balance', 'beginning_balance', 'je_activity', 'trial_activity', 'variance', 'abs_variance', 'reconciliation']])

    # 3. Unreconciled Detail Tab
    ws_unrecon = wb.create_sheet(title='Unreconciled Detail')
    format_sheet(ws_unrecon, 'Unreconciled Detail', unrecon_df[['entity_id', 'account_number', 'account_description', 'financial_statement_category', 'ending_balance', 'beginning_balance', 'je_activity', 'trial_activity', 'variance', 'abs_variance']])

    # 4. DQC Summary Tab
    ws_dqc = wb.create_sheet(title='DQC Summary')
    format_sheet(ws_dqc, 'DQC Summary', dqc_summary_df)

    # 5. Control Totals Tab
    ws_ct = wb.create_sheet(title='Control Totals')
    format_sheet(ws_ct, 'Control Totals', ct_period)

    # 6. JE Line Distribution Tab
    ws_strat = wb.create_sheet(title='Line Distribution')
    format_sheet(ws_strat, 'Line Distribution', strat)

    wb.save(excel_template_path)

    # -------------------------------------------------------------
    # 9. OUTPUT MANIFEST & RUN STATUS
    # -------------------------------------------------------------
    log_event(run_id, 'OUTPUT_GENERATION', 96, 'Compiling Omnia JET output manifest', log_file)

    outputs = [
        {'id': 'gl_detail', 'name': 'General_Ledger_Detail.csv', 'type': 'csv', 'category': 'MASTER', 'description': 'Standardized General Ledger Detail (CDM format)', 'rowCount': len(gl_clean), 'path': gl_out_csv},
        {'id': 'tb_detail', 'name': 'Trial_Balance.csv', 'type': 'csv', 'category': 'MASTER', 'description': 'Standardized Trial Balance (CDM format)', 'rowCount': len(tb_clean), 'path': tb_out_csv},
        {'id': 'coa_detail', 'name': 'Chart_of_Accounts.csv', 'type': 'csv', 'category': 'MASTER', 'description': 'Standardized Chart of Accounts (CDM format)', 'rowCount': len(coa_clean), 'path': coa_out_csv},
        {'id': 'recon_csv', 'name': 'Parquet_Reconciliation.csv', 'type': 'csv', 'category': 'RECONCILIATION', 'description': 'Account Reconciliation Summary (TB vs JE)', 'rowCount': len(recon_df), 'path': recon_out_csv},
        {'id': 'unrecon_csv', 'name': 'Unreconciled_Accounts_Detail.csv', 'type': 'csv', 'category': 'RECONCILIATION', 'description': 'Unreconciled Accounts Detail', 'rowCount': len(unrecon_df), 'path': unrecon_out_csv},
        {'id': 'dqc_summary', 'name': 'Parquet_Data_Integrity_Check_00_Summary.csv', 'type': 'csv', 'category': 'DQC', 'description': 'Omnia 20 Golden Checks (DQC 01a - 20) Summary', 'rowCount': len(dqc_summary_df), 'path': dqc_out_csv},
        {'id': 'ct_period', 'name': 'Control_Total_By_Period.csv', 'type': 'csv', 'category': 'CONTROL_TOTAL', 'description': 'Control Totals grouped by Fiscal Period', 'rowCount': len(ct_period), 'path': ct_period_path},
        {'id': 'ct_std', 'name': 'Control_Total_By_Standard_Non_Standard.csv', 'type': 'csv', 'category': 'CONTROL_TOTAL', 'description': 'Control Totals by Standard/Non-Standard', 'rowCount': len(ct_std), 'path': ct_std_path},
        {'id': 'ct_curr', 'name': 'Control_Total_By_Currency.csv', 'type': 'csv', 'category': 'CONTROL_TOTAL', 'description': 'Control Totals by Entity Currency', 'rowCount': len(ct_curr), 'path': ct_curr_path},
        {'id': 'ct_tt', 'name': 'Control_Total_By_Transaction_Type.csv', 'type': 'csv', 'category': 'CONTROL_TOTAL', 'description': 'Control Totals by Transaction Type', 'rowCount': len(ct_tt), 'path': ct_tt_path},
        {'id': 'ct_user', 'name': 'Control_Total_By_User.csv', 'type': 'csv', 'category': 'CONTROL_TOTAL', 'description': 'Control Totals by User ID', 'rowCount': len(ct_user), 'path': ct_user_path},
        {'id': 'strat_csv', 'name': 'JE_Line_Distribution.csv', 'type': 'csv', 'category': 'CONTROL_TOTAL', 'description': 'JE Line Stratification and Distribution', 'rowCount': len(strat), 'path': strat_path},
        {'id': 'excel_template', 'name': 'JE-Recon-and-DIC-Template.xlsx', 'type': 'xlsx', 'category': 'MASTER', 'description': 'Enterprise Deloitte Omnia Reconciliation & DQC Workbook', 'rowCount': len(recon_df), 'path': excel_template_path}
    ]

    summary_data = {
        'runId': run_id,
        'workflow': 'OMNIA_JET',
        'status': 'COMPLETED',
        'progress': 100,
        'completedAt': datetime.datetime.now().isoformat(),
        'totalInputRows': {
            'tb': len(tb_clean),
            'gl': len(gl_clean),
            'coa': len(coa_clean)
        },
        'reconciliationSummary': {
            'totalAccounts': len(recon_df),
            'reconciledAccounts': reconciled_count,
            'unreconciledAccounts': unreconciled_count,
            'totalBeginningBalance': round(float(recon_df['beginning_balance'].sum()), 2),
            'totalEndingBalance': round(float(recon_df['ending_balance'].sum()), 2),
            'totalJEActivity': round(float(recon_df['je_activity'].sum()), 2),
            'totalTrialActivity': round(float(recon_df['trial_activity'].sum()), 2),
            'totalVariance': round(float(recon_df['variance'].sum()), 2)
        },
        'dqcSummary': {
            'totalErrors': int((dqc_summary_df['Error_Warning'] == 'Error').sum()),
            'totalWarnings': int((dqc_summary_df['Error_Warning'] == 'Warning').sum()),
            'totalObservations': int((dqc_summary_df['Error_Warning'] == 'Observation').sum()),
            'checksPassed': int(((dqc_summary_df['Number_of_Affected_Lines'] == 0) & (dqc_summary_df['Number_of_Affected_Journal_Entries'] == 0)).sum()),
            'checksFailed': int(((dqc_summary_df['Number_of_Affected_Lines'] > 0) | (dqc_summary_df['Number_of_Affected_Journal_Entries'] > 0)).sum())
        },
        'controlTotalsSummary': {
            'totalDebit': round(float(gl_clean['debit_amount_ec'].sum()), 2),
            'totalCredit': round(float(gl_clean['credit_amount_ec'].sum()), 2),
            'netAmount': round(float(gl_clean['net_amount_ec'].sum()), 2),
            'periodCount': len(ct_period),
            'userCount': len(ct_user)
        },
        'outputs': outputs
    }

    status_path = os.path.join(os.path.dirname(os.path.dirname(config_path)), 'status.json')
    with open(status_path, 'w', encoding='utf-8') as f:
        json.dump(summary_data, f, indent=2)

    log_event(run_id, 'COMPLETED', 100, f'Omnia JET workflow executed successfully. {len(outputs)} outputs generated including Excel Workbook.', log_file)
    print(f"__RESULT__{json.dumps(summary_data)}", flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True, help='Path to run_config.json')
    args = parser.parse_args()
    try:
        run_omnia_jet(args.config)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"__ERROR__{json.dumps({'error': str(e), 'traceback': tb})}", file=sys.stderr, flush=True)
        sys.exit(1)
