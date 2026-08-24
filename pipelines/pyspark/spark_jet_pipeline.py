import os
import sys
import json
import argparse
import datetime
import warnings
import re
import pandas as pd
import numpy as np
from common_utils import parse_num, parse_date_str, date_to_iso, clean_str, log_event

# Suppress harmless pandas regex match-group warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

def run_spark_jet_pipeline(config_path: str):
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    run_id = config.get('runId', 'UNKNOWN_RUN')
    workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    run_dir = os.path.join(workspace_root, 'runs', run_id)
    output_dir = os.path.join(run_dir, 'output')
    log_dir = os.path.join(run_dir, 'logs')
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(log_dir, exist_ok=True)

    log_file = os.path.join(log_dir, 'execution.txt')
    log_event(run_id, 'INITIALIZATION', 5, f'Starting SPARK JET Pipeline for {run_id}', log_file)

    input_files = config.get('files', [])
    dataset_map = config.get('datasetMap', {})
    field_mappings = config.get('fieldMappings', {})
    params = config.get('sparkParameters', {})

    # -------------------------------------------------------------
    # 1. INGESTION & DATASET IDENTIFICATION
    # -------------------------------------------------------------
    log_event(run_id, 'DATA_INGESTION', 10, 'Loading and identifying input files', log_file)

    tb_df = None
    gl_df = None
    coa_df = None

    def load_dataset(file_id, sheet_name=None):
        for f in input_files:
            if f.get('fileId') == file_id:
                path = f.get('filePath') or os.path.join(run_dir, 'input', f.get('fileName', ''))
                if not os.path.exists(path):
                    path = f.get('filePath')
                if path and os.path.exists(path):
                    if path.endswith(('.xlsx', '.xls')):
                        return pd.read_excel(path, sheet_name=sheet_name or 0, dtype=str)
                    else:
                        return pd.read_csv(path, sep=None, engine='python', dtype=str)
        return None

    # Try mapping or direct detection
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
                if s_class == 'TRIAL_BALANCE' and tb_df is None:
                    tb_df = load_dataset(f.get('fileId'), s.get('sheetName'))
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

    if tb_df is None:
        raise ValueError("Trial Balance (TB) dataset is required for Spark JET workflow.")
    if gl_df is None:
        raise ValueError("General Ledger / Population dataset is required for Spark JET workflow.")

    log_event(run_id, 'MAPPING', 20, 'Applying standardized field mappings', log_file)

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
    if coa_df is not None:
        coa_df = apply_mapping(coa_df, field_mappings.get('coa', []))

    # Helper to get column with fallbacks
    def get_col(df, target_names, default=""):
        for name in target_names:
            if name in df.columns:
                return df[name]
        return pd.Series([default] * len(df), index=df.index)

    # -------------------------------------------------------------
    # 2. TB PREPARATION & CHECKPOINTS
    # -------------------------------------------------------------
    log_event(run_id, 'TB_PREPARATION', 30, 'Preparing Trial Balance and evaluating checkpoints', log_file)

    tb_clean = pd.DataFrame()
    tb_clean['G/L'] = get_col(tb_df, ['G/L', 'G_L', 'account_number', 'gl', 'GL Account', 'Account Number']).apply(clean_str)
    tb_clean['Description'] = get_col(tb_df, ['Description', 'account_description', 'gl description', 'Account Description']).apply(clean_str)
    tb_clean['Account Subtype'] = get_col(tb_df, ['Account Subtype', 'Account_Subtype', 'account_subtype', 'subtype']).apply(clean_str)
    tb_clean['FS Line Item'] = get_col(tb_df, ['FS Line Item', 'FS_Line_Item', 'financial_statement_line', 'fs_line_item']).apply(clean_str)
    
    tb_clean['Opening Balance'] = get_col(tb_df, ['Opening Balance', 'Opening_Balance', 'beginning_balance_ec', 'beginning_balance']).apply(parse_num)
    tb_clean['Debit'] = get_col(tb_df, ['Debit', 'debit_amount_ec', 'debit', 'Debit Amount']).apply(parse_num)
    tb_clean['Credit'] = get_col(tb_df, ['Credit', 'credit_amount_ec', 'credit', 'Credit Amount']).apply(parse_num)
    tb_clean['Closing Balance'] = get_col(tb_df, ['Closing Balance', 'Closing_Balance', 'ending_balance_ec', 'ending_balance']).apply(parse_num)
    tb_clean['Movement'] = tb_clean['Closing Balance'] - tb_clean['Opening Balance']

    # TB Checkpoints
    tb_blank_gl = int((tb_clean['G/L'] == '').sum())
    tb_blank_desc = int((tb_clean['Description'] == '').sum())
    tb_duplicate_gl = int(tb_clean['G/L'].duplicated().sum())
    tb_sum_opening = float(tb_clean['Opening Balance'].sum())
    tb_sum_closing = float(tb_clean['Closing Balance'].sum())
    tb_sum_debit = float(tb_clean['Debit'].sum())
    tb_sum_credit = float(tb_clean['Credit'].sum())

    valid_subtypes = {'assets', 'asset', 'liabilities', 'liability', 'revenue', 'revenues', 'income', 'expense', 'expenses', 'equity'}
    invalid_subtypes = int((~tb_clean['Account Subtype'].str.lower().isin(valid_subtypes)).sum())

    tb_checkpoints_passed = (tb_blank_gl == 0 and tb_blank_desc == 0 and tb_duplicate_gl == 0 and abs(tb_sum_opening) < 100.0)

    # Save standardized TB with exact canonical column names
    tb_out_path = os.path.join(output_dir, 'TB_Standardized.csv')
    tb_clean[['G/L', 'Description', 'Account Subtype', 'FS Line Item', 'Opening Balance', 'Debit', 'Credit', 'Closing Balance']].to_csv(tb_out_path, index=False)

    # -------------------------------------------------------------
    # 3. POPULATION / GL PREPARATION & CHECKPOINTS
    # -------------------------------------------------------------
    log_event(run_id, 'GL_PREPARATION', 45, 'Preparing Population / GL dump and calculating pivot balances', log_file)

    gl_clean = pd.DataFrame()
    gl_clean['G/L'] = get_col(gl_df, ['G/L', 'G_L', 'account_number', 'gl', 'GL Account', 'Account Number']).apply(clean_str)
    gl_clean['DocumentNo'] = get_col(gl_df, ['DocumentNo', 'journal_number', 'document number', 'Accounting document', 'Document number', 'Doc No']).apply(clean_str)
    gl_clean['Type'] = get_col(gl_df, ['Type', 'transaction_type', 'Document type', 'doc type']).apply(clean_str)
    gl_clean['Entry Date'] = get_col(gl_df, ['Entry Date', 'Entry_Date', 'date_effective', 'Accounting date']).apply(parse_date_str)
    gl_clean['Pstng Date'] = get_col(gl_df, ['Pstng Date', 'Pstng_Date', 'date_posted', 'Posting date']).apply(parse_date_str)
    gl_clean['Doc. Date'] = get_col(gl_df, ['Doc. Date', 'Doc_Date', 'date_effective', 'Document date']).apply(parse_date_str)
    gl_clean['Amount in local cur.'] = get_col(gl_df, ['Amount in local cur.', 'Amount_in_local_cur', 'net_amount_ec', 'Amount in local currency', 'Amount']).apply(parse_num)
    gl_clean['LCurr'] = get_col(gl_df, ['LCurr', 'Lcurr', 'entity_currency_ec', 'Local Currency', 'Currency code'], 'INR').apply(clean_str)
    gl_clean['Amount in doc. curr.'] = get_col(gl_df, ['Amount in doc. curr.', 'Amount_in_doc_curr', 'net_amount_oc', 'Amount in doc curr']).apply(parse_num)
    gl_clean['Curr.'] = get_col(gl_df, ['Curr.', 'Curr', 'original_currency_oc', 'Currency code'], 'INR').apply(clean_str)
    gl_clean['Amount in loc.curr.2'] = get_col(gl_df, ['Amount in loc.curr.2', 'Amount_in_loc_curr_2', 'net_amount_gc', 'Amount in group curr']).apply(parse_num)
    gl_clean['LCur2'] = get_col(gl_df, ['LCur2', 'group_currency_gc', 'Group Currency']).apply(clean_str)
    gl_clean['Document Header Text'] = get_col(gl_df, ['Document Header Text', 'Document_Header_Text', 'journal_header_description', 'Text Header', 'Header Text']).apply(clean_str).str.replace(',', ' ')
    gl_clean['Text'] = get_col(gl_df, ['Text', 'journal_line_description', 'Text Details', 'Line Text']).apply(clean_str).str.replace(',', ' ').str.lower()
    gl_clean['User name'] = get_col(gl_df, ['User name', 'User_name', 'userid_entered', 'User UD', 'User Name', 'Username']).apply(clean_str)

    gl_sum_total = float(gl_clean['Amount in local cur.'].sum())

    # Journal Document Balancing
    doc_totals = gl_clean.groupby('DocumentNo')['Amount in local cur.'].sum().reset_index()
    doc_totals.columns = ['DocumentNo', 'DocSum']
    unbalanced_docs = doc_totals[doc_totals['DocSum'].abs() > 0.01]
    balanced_docs = doc_totals[doc_totals['DocSum'].abs() <= 0.01]
    unbalanced_count = len(unbalanced_docs)
    balanced_count = len(balanced_docs)

    gl_clean = gl_clean.merge(doc_totals, on='DocumentNo', how='left')
    gl_clean['BalanceStatus'] = np.where(gl_clean['DocSum'].abs() <= 0.01, 'BALANCED', 'UNBALANCED')

    # Save standardized GL with exact canonical column names
    gl_cols_canonical = [
        'G/L', 'DocumentNo', 'Type', 'Entry Date', 'Pstng Date', 'Doc. Date',
        'Amount in local cur.', 'LCurr', 'Amount in doc. curr.', 'Curr.',
        'Amount in loc.curr.2', 'LCur2', 'Document Header Text', 'Text', 'User name'
    ]
    gl_out_path = os.path.join(output_dir, 'JE_Standardized.csv')
    gl_clean[gl_cols_canonical].to_csv(gl_out_path, index=False)

    # -------------------------------------------------------------
    # 4. INTEGRITY TESTING (IR Tests 1 to 4)
    # -------------------------------------------------------------
    log_event(run_id, 'INTEGRITY_TESTING', 60, 'Executing Integrity Testing IR 1 to IR 4', log_file)

    gl_grouped = gl_clean.groupby('G/L')['Amount in local cur.'].sum().reset_index()
    gl_grouped.columns = ['G/L', 'Total_Amount_in_local_cur']
    tb_unique_gl = set(tb_clean['G/L'].unique())
    gl_unique_gl = set(gl_clean['G/L'].unique())

    # IR Test 1: GL in TB not in Population
    ir_1 = tb_clean[~tb_clean['G/L'].isin(gl_unique_gl)].copy()
    ir_1_path = os.path.join(output_dir, 'IR_Exception_1.csv')
    ir_1.to_csv(ir_1_path, index=False)

    # IR Test 3: GL in Population not in TB
    ir_3 = gl_grouped[~gl_grouped['G/L'].isin(tb_unique_gl)].copy()
    ir_3_path = os.path.join(output_dir, 'IR_Exception_3.csv')
    ir_3.to_csv(ir_3_path, index=False)

    # IR Test 2: Amount in local curr of population for GL vs TB Activity (Closing - Opening)
    tb_left_pop = tb_clean.merge(gl_grouped, on='G/L', how='left')
    tb_left_pop['Total_Amount_in_local_cur'] = tb_left_pop['Total_Amount_in_local_cur'].fillna(0.0)
    tb_left_pop['GL_Activity'] = tb_left_pop['Total_Amount_in_local_cur']
    tb_left_pop['Difference_In_Activity'] = (tb_left_pop['Debit'] - tb_left_pop['Credit']) - tb_left_pop['Total_Amount_in_local_cur']
    
    # Exception logic matching notebook
    def eval_ir2(row):
        diff = row['Closing Balance'] - row['Opening Balance']
        gl_act = round(row['GL_Activity'], 2)
        if diff != 0 and gl_act == 0:
            return 'Exception'
        if abs(gl_act - diff) <= 1.0:
            return 'No Exception'
        return 'Exception'

    tb_left_pop['Exception2'] = tb_left_pop.apply(eval_ir2, axis=1)
    ir_2_all_path = os.path.join(output_dir, 'IR_Exception_2_Detail.csv')
    tb_left_pop.to_csv(ir_2_all_path, index=False)

    ir_2 = tb_left_pop[tb_left_pop['Exception2'] == 'Exception'].copy()
    ir_2_path = os.path.join(output_dir, 'IR_Exception_2.csv')
    ir_2.to_csv(ir_2_path, index=False)

    # IR Test 4 / Seldom Accounts Inputs (Count per GL)
    gl_counts = gl_clean.groupby('G/L')['DocumentNo'].count().reset_index()
    gl_counts.columns = ['G/L', 'Count']
    ir_4 = tb_clean[['G/L', 'Description', 'Account Subtype', 'FS Line Item']].merge(gl_counts, on='G/L', how='left')
    ir_4['Count'] = ir_4['Count'].fillna(0).astype(int)
    ir_4_path = os.path.join(output_dir, 'Parameter_2_Seldom_Accounts_Inputs.csv')
    ir_4.to_csv(ir_4_path, index=False)

    # -------------------------------------------------------------
    # 5. PARAMETER TESTING (Ex1 to Ex12)
    # -------------------------------------------------------------
    log_event(run_id, 'PARAMETER_TESTING', 75, 'Running Parameter Exception Tests (Ex1 to Ex12)', log_file)

    param_summary = {}

    def save_exception_file(df, num, name):
        p = os.path.join(output_dir, f'Parameter_Exception_{num}.csv')
        df.to_csv(p, index=False)
        cnt = int((df['Exception'] == f'Exception{num}').sum()) if 'Exception' in df.columns else len(df)
        param_summary[f'Ex{num}_{name}'] = cnt
        param_summary[f'Ex{num}'] = cnt
        param_summary[f'ex{num}'] = cnt
        param_summary[f'Parameter_Exception_{num}'] = cnt
        return cnt

    # Ex1: Unusual Accounts
    ex1_gls = params.get('ex1UnusualAccounts', [])
    if not ex1_gls:
        ex1_gls = ['0059100000', '0059100001', '0058809000', '0034100000', '1009', '1012']
    ex1_docs = set(gl_clean[gl_clean['G/L'].isin(ex1_gls)]['DocumentNo'].unique())
    ex1_df = gl_clean[gl_clean['DocumentNo'].isin(ex1_docs)].copy()
    ex1_df['FS Line Item'] = ''
    ex1_df['Exception'] = np.where(ex1_df['G/L'].isin(ex1_gls) & (ex1_df['Amount in local cur.'] != 0), 'Exception1', 'No Exception')
    save_exception_file(ex1_df, 1, 'Unusual_Accounts')

    # Ex2: Seldom-based Accounts
    ex2_gls = params.get('ex2SeldomAccounts', [])
    if not ex2_gls:
        seldom_list = ir_4[ir_4['Count'].between(1, 5)]['G/L'].tolist()
        ex2_gls = seldom_list[:20] if seldom_list else ['11301060', '11601900', '52002500', '1081001']
    ex2_docs = set(gl_clean[gl_clean['G/L'].isin(ex2_gls)]['DocumentNo'].unique())
    ex2_df = gl_clean[gl_clean['DocumentNo'].isin(ex2_docs)].copy()
    ex2_df['FS Line Item'] = ''
    ex2_df['Exception'] = np.where(ex2_df['G/L'].isin(ex2_gls) & (ex2_df['Amount in local cur.'] != 0), 'Exception2', 'No Exception')
    save_exception_file(ex2_df, 2, 'Seldom_Accounts')

    # Ex3: Large Debits to Revenue/Income
    rev_gls = set(tb_clean[tb_clean['Account Subtype'].str.lower().isin(['revenue', 'income', 'revenues'])]['G/L'].unique())
    rev_docs = gl_clean[gl_clean['G/L'].isin(rev_gls)]
    doc_rev_sums = rev_docs.groupby('DocumentNo')['Amount in local cur.'].sum().reset_index()
    ex3_threshold = params.get('ex3RevenueDebitsThreshold', 0.0)
    flagged_ex3_docs = set(doc_rev_sums[doc_rev_sums['Amount in local cur.'] > ex3_threshold]['DocumentNo'].unique())
    
    ex3_df = gl_clean[gl_clean['DocumentNo'].isin(flagged_ex3_docs)].copy()
    ex3_df['FS Line Item'] = ''
    ex3_df['Exception'] = np.where(ex3_df['G/L'].isin(rev_gls) & (ex3_df['Amount in local cur.'] > 0), 'Exception3', 'No Exception')
    save_exception_file(ex3_df, 3, 'Revenue_Debits')

    # Ex4: Users with few Postings
    ex4_thresh = params.get('ex4FewPostingsUserThreshold', 2)
    user_doc_counts = gl_clean.groupby('User name')['DocumentNo'].nunique().reset_index()
    user_doc_counts.columns = ['User name', 'DocCount']
    few_users = set(user_doc_counts[user_doc_counts['DocCount'] <= ex4_thresh]['User name'].unique())
    ex4_df = gl_clean[gl_clean['User name'].isin(few_users)].copy()
    ex4_df['FS Line Item'] = ''
    ex4_df['Exception'] = 'Exception4'
    save_exception_file(ex4_df, 4, 'Few_Postings_Users')

    # Ex5: Users of Interest
    ex5_users = params.get('ex5UsersOfInterest', ['SBPATIL', 'PKADAM', 'ADMIN', 'SYSTEM', 'BATCH'])
    ex5_df = gl_clean.copy()
    ex5_df['FS Line Item'] = ''
    ex5_df['Exception'] = np.where(ex5_df['User name'].str.upper().isin([u.upper() for u in ex5_users]), 'Exception5', 'No Exception')
    save_exception_file(ex5_df[ex5_df['Exception'] == 'Exception5'], 5, 'Users_Of_Interest')

    # Ex6: Closing Entries (Around Year-End)
    fy_end = params.get('financialYearEnd', '31-Dec-25')
    fy_end_date = date_to_iso(fy_end)
    ex6_days_before = params.get('ex6ClosingEntriesBeforeDays', 1)
    ex6_days_after = params.get('ex6ClosingEntriesAfterDays', 10)
    
    ex6_df = gl_clean.copy()
    ex6_df['FS Line Item'] = ''
    try:
        ref_date = datetime.date.fromisoformat(fy_end_date) if fy_end_date else datetime.date(2025, 12, 31)
        start_w = ref_date - datetime.timedelta(days=ex6_days_before)
        end_w = ref_date + datetime.timedelta(days=ex6_days_after)
        
        gl_clean_dates = gl_clean['Pstng Date'].apply(date_to_iso)
        is_in_win = gl_clean_dates.apply(lambda d: d is not None and start_w <= datetime.date.fromisoformat(d) <= end_w)
        ex6_df['Exception'] = np.where(is_in_win, 'Exception6', 'No Exception')
    except:
        ex6_df['Exception'] = 'No Exception'
    save_exception_file(ex6_df[ex6_df['Exception'] == 'Exception6'], 6, 'Closing_Entries')

    # Ex7: Dates of Interest
    ex7_dates = params.get('ex7DatesOfInterest', ['05-Nov-25', '25-Dec-25', '31-Dec-25', '01-Jan-26'])
    ex7_dates_iso = set([date_to_iso(d) for d in ex7_dates if date_to_iso(d)])
    
    ex7_df = gl_clean.copy()
    ex7_df['FS Line Item'] = ''
    gl_iso = gl_clean['Pstng Date'].apply(date_to_iso)
    ex7_df['Exception'] = np.where(gl_iso.isin(ex7_dates_iso), 'Exception7', 'No Exception')
    save_exception_file(ex7_df[ex7_df['Exception'] == 'Exception7'], 7, 'Dates_Of_Interest')

    # Ex8: Round Amounts & Round Thousands
    round_rules = params.get('ex8RoundDigits', ['1000', '10000', '100000', '1000000', '6', '7', '8', '9'])
    ex8_df = gl_clean.copy()
    ex8_df['FS Line Item'] = ''
    
    def is_round_amount(amt):
        abs_amt = abs(int(amt))
        if abs_amt == 0:
            return False
        if abs_amt % 1000000 == 0 or abs_amt % 100000 == 0 or abs_amt % 10000 == 0 or abs_amt % 1000 == 0:
            return True
        s = str(abs_amt)
        for r in round_rules:
            if s.endswith(str(r)):
                return True
        return False

    ex8_df['Exception'] = np.where(ex8_df['Amount in local cur.'].apply(is_round_amount), 'Exception8', 'No Exception')
    save_exception_file(ex8_df[ex8_df['Exception'] == 'Exception8'], 8, 'Round_Amounts')

    # Ex9: Duplicate Entries
    gl_clean['Combo'] = gl_clean['G/L'] + '_' + gl_clean['Amount in local cur.'].astype(int).astype(str)
    doc_combos = gl_clean.groupby('DocumentNo')['Combo'].apply(lambda x: '_'.join(sorted(x))).reset_index()
    combo_counts = doc_combos['Combo'].value_counts()
    dup_combos = set(combo_counts[combo_counts > 1].index)
    
    dup_docs = set(doc_combos[doc_combos['Combo'].isin(dup_combos)]['DocumentNo'].unique())
    ex9_df = gl_clean[gl_clean['DocumentNo'].isin(dup_docs)].copy()
    ex9_df['FS Line Item'] = ''
    ex9_df['Exception'] = 'Exception9'
    save_exception_file(ex9_df, 9, 'Duplicate_Entries')

    # Ex10: Keywords in Journal (using non-capturing regex group to prevent UserWarning)
    ex10_keywords = params.get('ex10Keywords', [
        'fault', 'bribe', "auditor's adjustment", 'mistake', 'risk', 'misstatement',
        'officer', 'prize', 'abuse', 'alter', 'seizure', 'bury', 'conceal', 'conting',
        'corrupt', 'demand', 'embezzle', 'theft', 'fictitious', 'fraud', 'manual', 'reverse'
    ])
    pattern = r'\b(?:' + '|'.join([re.escape(k.lower()) for k in ex10_keywords]) + r')\b'
    
    match_header = gl_clean['Document Header Text'].str.lower().str.contains(pattern, regex=True, na=False)
    match_text = gl_clean['Text'].str.lower().str.contains(pattern, regex=True, na=False)
    ex10_flagged_docs = set(gl_clean[match_header | match_text]['DocumentNo'].unique())
    
    ex10_df = gl_clean[gl_clean['DocumentNo'].isin(ex10_flagged_docs)].copy()
    ex10_df['FS Line Item'] = ''
    ex10_df['Exception'] = np.where(
        ex10_df['Document Header Text'].str.lower().str.contains(pattern, regex=True, na=False) |
        ex10_df['Text'].str.lower().str.contains(pattern, regex=True, na=False),
        'Exception10', 'No Exception'
    )
    save_exception_file(ex10_df, 10, 'Keyword_Entries')

    # Ex11: Entries Posted After Closing Date
    ex11_days = params.get('ex11DaysAfterClosing', 10)
    ex11_df = gl_clean.copy()
    ex11_df['FS Line Item'] = ''
    try:
        ref_date = datetime.date.fromisoformat(fy_end_date) if fy_end_date else datetime.date(2025, 12, 31)
        cutoff = ref_date + datetime.timedelta(days=ex11_days)
        gl_clean_dates = gl_clean['Entry Date'].apply(date_to_iso)
        is_after = gl_clean_dates.apply(lambda d: d is not None and datetime.date.fromisoformat(d) > cutoff)
        ex11_df['Exception'] = np.where(is_after, 'Exception11', 'No Exception')
    except:
        ex11_df['Exception'] = 'No Exception'
    save_exception_file(ex11_df[ex11_df['Exception'] == 'Exception11'], 11, 'Post_Closing_Entries')

    # Ex12: Unrelated Accounts (Debit to FS Line A and Credit to FS Line B)
    gl_with_fs = gl_clean.merge(tb_clean[['G/L', 'FS Line Item']], on='G/L', how='left')
    
    unrelated_rules = params.get('ex12UnrelatedRules', [
        {"debitFSLine": "Trade Receivables", "creditFSLine": "COST OF SALES AND SERVICES"},
        {"debitFSLine": "Trade Receivables", "creditFSLine": "Property, plant and equipment"},
    ])
    
    ex12_flagged_docs = set()
    for rule in unrelated_rules:
        d_line = rule.get('debitFSLine', '').lower()
        c_line = rule.get('creditFSLine', '').lower()
        
        has_debit = gl_with_fs[(gl_with_fs['Amount in local cur.'] > 0) & (gl_with_fs['FS Line Item'].str.lower().str.contains(d_line, na=False))]['DocumentNo'].unique()
        has_credit = gl_with_fs[(gl_with_fs['Amount in local cur.'] < 0) & (gl_with_fs['FS Line Item'].str.lower().str.contains(c_line, na=False))]['DocumentNo'].unique()
        matched = set(has_debit).intersection(set(has_credit))
        ex12_flagged_docs.update(matched)

    ex12_df = gl_with_fs[gl_with_fs['DocumentNo'].isin(ex12_flagged_docs)].copy()
    ex12_df['Exception'] = 'Exception12'
    save_exception_file(ex12_df, 12, 'Unrelated_Accounts')

    # -------------------------------------------------------------
    # 6. CONTROL SAMPLE DUMP (Random Sampling with Seed 42)
    # -------------------------------------------------------------
    log_event(run_id, 'SAMPLING', 90, 'Extracting reproducible control sample dump', log_file)

    sample_size = params.get('controlSampleCount', 61)
    unique_docs = pd.Series(gl_clean['DocumentNo'].unique())
    n_sample = min(len(unique_docs), sample_size)
    sampled_docs = set(unique_docs.sample(n=n_sample, random_state=42).tolist())

    sample_df = gl_clean[gl_clean['DocumentNo'].isin(sampled_docs)].copy()
    sample_df['Control_Sample'] = 'Sample_Selected'
    sample_out_path = os.path.join(output_dir, 'Control_Sample_Dump.csv')
    sample_df.to_csv(sample_out_path, index=False)

    # -------------------------------------------------------------
    # 7. SUMMARY & METRICS EMISSION
    # -------------------------------------------------------------
    log_event(run_id, 'FINALIZING', 98, 'Finalizing outputs manifest and metrics', log_file)

    summary_payload = {
        "status": "COMPLETED",
        "progress": 100,
        "currentStage": "COMPLETED",
        "totalInputRows": {
            "tb": len(tb_clean),
            "gl": len(gl_clean)
        },
        "tbCheckpointsSummary": {
            "passed": 4 if tb_checkpoints_passed else 3,
            "failed": 0 if tb_checkpoints_passed else 1,
            "totalBalanceZero": abs(tb_sum_closing) < 1.0,
            "debitCreditEqual": abs(tb_sum_debit - tb_sum_credit) < 1.0,
            "openingSum": tb_sum_opening,
            "closingSum": tb_sum_closing
        },
        "glCheckpointsSummary": {
            "totalNetBalance": gl_sum_total,
            "balancedJournalsCount": balanced_count,
            "unbalancedJournalsCount": unbalanced_count,
            "totalJournals": len(doc_totals),
            "totalLines": len(gl_clean)
        },
        "integritySummary": {
            "test1TBNotInPopCount": len(ir_1),
            "test2ActivityMismatchCount": len(ir_2),
            "test3PopNotInTBCount": len(ir_3),
            "test4SeldomAccountsCount": len(ir_4)
        },
        "parameterSummary": param_summary,
        "controlSampleCount": len(sampled_docs)
    }

    status_path = os.path.join(os.path.dirname(os.path.dirname(config_path)), 'status.json')
    if os.path.exists(status_path):
        try:
            with open(status_path, 'r', encoding='utf-8') as f:
                existing_status = json.load(f)
            existing_status.update(summary_payload)
            summary_payload = existing_status
        except:
            pass
    with open(status_path, 'w', encoding='utf-8') as f:
        json.dump(summary_payload, f, indent=2)

    print(f"__RESULT__{json.dumps(summary_payload)}", flush=True)
    log_event(run_id, 'COMPLETED', 100, 'SPARK JET Pipeline completed successfully', log_file)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Spark JET Automation Pipeline Runner')
    parser.add_argument('--config', required=True, help='Path to run_config.json')
    args = parser.parse_args()
    run_spark_jet_pipeline(args.config)
