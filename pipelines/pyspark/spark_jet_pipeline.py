import os
import sys

# Ensure local pipeline helpers are accessible
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import argparse
import datetime
import warnings
import re
import pandas as pd
import numpy as np
from common_utils import parse_num, parse_date_str, date_to_iso, clean_str, log_event

# Suppress harmless pandas regex and future warnings
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
    params = config.get('sparkParameters', {}) or {}

    # Selected parameter exceptions (default to all 1-12 if not provided)
    selected_exceptions = params.get('selectedExceptions')
    if selected_exceptions is None or len(selected_exceptions) == 0:
        selected_exceptions = list(range(1, 13))
    else:
        selected_exceptions = [int(x) for x in selected_exceptions]

    # -------------------------------------------------------------
    # 1. INGESTION & DATASET IDENTIFICATION
    # -------------------------------------------------------------
    log_event(run_id, 'DATA_INGESTION', 10, 'Loading and identifying input files', log_file)

    tb_df = None
    gl_df = None

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
        elif f.get('sheets'):
            for s in f.get('sheets', []):
                s_class = s.get('detectedDataset')
                if s_class == 'TRIAL_BALANCE' and tb_df is None:
                    tb_df = load_dataset(f.get('fileId'), s.get('sheetName'))
                elif s_class in ('GENERAL_LEDGER', 'POPULATION') and gl_df is None:
                    gl_df = load_dataset(f.get('fileId'), s.get('sheetName'))

    if dataset_map.get('tbFileId'):
        tb_df = load_dataset(dataset_map['tbFileId'], dataset_map.get('tbSheetName'))
    if dataset_map.get('glFileId'):
        gl_df = load_dataset(dataset_map['glFileId'], dataset_map.get('glSheetName'))

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

    def get_col(df, target_names, default=""):
        for name in target_names:
            if name in df.columns:
                return df[name]
        return pd.Series([default] * len(df), index=df.index)

    # -------------------------------------------------------------
    # 2. TB PREPARATION & MANDATORY CHECKPOINTS (Exact spark_JET_code Schema)
    # -------------------------------------------------------------
    log_event(run_id, 'TB_PREPARATION', 30, 'Preparing Trial Balance and evaluating checkpoints', log_file)

    tb_clean = pd.DataFrame()
    tb_clean['G_L'] = get_col(tb_df, ['G_L', 'G/L', 'account_number', 'gl', 'GL Account', 'Account Number']).apply(clean_str)
    tb_clean['Description'] = get_col(tb_df, ['Description', 'account_description', 'gl description', 'Account Description']).apply(clean_str)
    tb_clean['Opening_Balance'] = get_col(tb_df, ['Opening_Balance', 'Opening Balance', 'beginning_balance_ec', 'beginning_balance']).apply(parse_num)
    tb_clean['Debit'] = get_col(tb_df, ['Debit', 'debit_amount_ec', 'debit', 'Debit Amount']).apply(parse_num)
    tb_clean['Credit'] = get_col(tb_df, ['Credit', 'credit_amount_ec', 'credit', 'Credit Amount']).apply(parse_num)
    tb_clean['Closing_Balance'] = get_col(tb_df, ['Closing_Balance', 'Closing Balance', 'ending_balance_ec', 'ending_balance']).apply(parse_num)
    tb_clean['Movement'] = tb_clean['Closing_Balance'] - tb_clean['Opening_Balance']
    tb_clean['Account_Subtype'] = get_col(tb_df, ['Account_Subtype', 'Account Subtype', 'account_subtype', 'subtype']).apply(clean_str)
    tb_clean['FS_Line_Item'] = get_col(tb_df, ['FS_Line_Item', 'FS Line Item', 'financial_statement_line', 'fs_line_item']).apply(clean_str)

    # Fill NA / Nulls as per Spark code
    tb_clean['G_L'] = tb_clean['G_L'].fillna('0').replace('', '0')
    tb_clean['Description'] = tb_clean['Description'].fillna('0').replace('', '0')
    tb_clean['Opening_Balance'] = tb_clean['Opening_Balance'].fillna(0.0)
    tb_clean['Debit'] = tb_clean['Debit'].fillna(0.0)
    tb_clean['Credit'] = tb_clean['Credit'].fillna(0.0)
    tb_clean['Closing_Balance'] = tb_clean['Closing_Balance'].fillna(0.0)
    tb_clean['Movement'] = tb_clean['Movement'].fillna(0.0)
    tb_clean['Account_Subtype'] = tb_clean['Account_Subtype'].fillna('').replace('0', '')
    tb_clean['FS_Line_Item'] = tb_clean['FS_Line_Item'].fillna('').replace('0', '')

    # TB Checkpoints
    tb_blank_gl = int((tb_clean['G_L'] == '0').sum())
    tb_blank_desc = int((tb_clean['Description'] == '0').sum())
    tb_duplicate_gl = int(tb_clean['G_L'].duplicated().sum())
    tb_sum_opening = float(tb_clean['Opening_Balance'].sum())
    tb_sum_closing = float(tb_clean['Closing_Balance'].sum())
    tb_sum_debit = float(tb_clean['Debit'].sum())
    tb_sum_credit = float(tb_clean['Credit'].sum())

    tb_checkpoints_passed = (tb_blank_gl == 0 and tb_blank_desc == 0 and tb_duplicate_gl == 0 and abs(tb_sum_closing) < 1000.0)

    # Save standardized TB (Exact Spark code column names)
    tb_cols = ['G_L', 'Description', 'Opening_Balance', 'Debit', 'Credit', 'Closing_Balance', 'Movement', 'Account_Subtype', 'FS_Line_Item']
    tb_out_path = os.path.join(output_dir, 'TB.csv')
    tb_clean[tb_cols].to_csv(tb_out_path, index=False)

    # -------------------------------------------------------------
    # 3. POPULATION / GL PREPARATION & MANDATORY CHECKPOINTS
    # -------------------------------------------------------------
    log_event(run_id, 'GL_PREPARATION', 45, 'Preparing Population / GL dump and calculating pivot balances', log_file)

    gl_clean = pd.DataFrame()
    gl_clean['G_L'] = get_col(gl_df, ['G_L', 'G/L', 'account_number', 'gl', 'GL Account', 'Account Number']).apply(clean_str)
    gl_clean['DocumentNo'] = get_col(gl_df, ['DocumentNo', 'journal_number', 'document number', 'Accounting document', 'Document number', 'Doc No']).apply(clean_str)
    gl_clean['Type'] = get_col(gl_df, ['Type', 'transaction_type', 'Document type', 'doc type']).apply(clean_str)
    
    # Dates formatted as dd-MMM-yy
    def fmt_date(val):
        parsed = parse_date_str(val)
        if not parsed:
            return ''
        try:
            d = datetime.date.fromisoformat(parsed)
            return d.strftime('%d-%b-%y')
        except:
            return parsed

    gl_clean['Entry_Date'] = get_col(gl_df, ['Entry_Date', 'Entry Date', 'date_effective', 'Accounting date']).apply(fmt_date)
    gl_clean['Pstng_Date'] = get_col(gl_df, ['Pstng_Date', 'Pstng Date', 'date_posted', 'Posting date']).apply(fmt_date)
    gl_clean['Doc_Date'] = get_col(gl_df, ['Doc_Date', 'Doc. Date', 'Doc Date', 'Document date']).apply(fmt_date)
    
    gl_clean['Amount_in_local_cur'] = get_col(gl_df, ['Amount_in_local_cur', 'Amount in local cur.', 'Amount in local currency', 'net_amount_ec', 'Amount']).apply(parse_num)
    gl_clean['Lcurr'] = get_col(gl_df, ['Lcurr', 'LCurr', 'entity_currency_ec', 'Local Currency', 'Currency code'], 'INR').apply(clean_str)
    gl_clean['Amount_in_doc_curr'] = get_col(gl_df, ['Amount_in_doc_curr', 'Amount in doc. curr.', 'Amount in doc curr', 'net_amount_oc']).apply(parse_num)
    gl_clean['Curr'] = get_col(gl_df, ['Curr', 'Curr.', 'original_currency_oc', 'Currency code'], 'INR').apply(clean_str)
    gl_clean['Amount_in_loc_curr_2'] = get_col(gl_df, ['Amount_in_loc_curr_2', 'Amount in loc.curr.2', 'Amount in group curr', 'net_amount_gc']).apply(parse_num)
    gl_clean['LCur2'] = get_col(gl_df, ['LCur2', 'group_currency_gc', 'Group Currency']).apply(clean_str)
    
    gl_clean['Document_Header_Text'] = get_col(gl_df, ['Document_Header_Text', 'Document Header Text', 'journal_header_description', 'Text Header', 'Header Text']).apply(clean_str).str.replace(',', ' ')
    gl_clean['Text'] = get_col(gl_df, ['Text', 'journal_line_description', 'Text Details', 'Line Text']).apply(clean_str).str.replace(',', ' ').str.lower()
    gl_clean['User_name'] = get_col(gl_df, ['User_name', 'User name', 'userid_entered', 'User UD', 'User Name', 'Username']).apply(clean_str)
    gl_clean['Debit_Credit'] = ''

    # Clean nulls
    gl_clean['G_L'] = gl_clean['G_L'].fillna('0').replace('', '0')
    gl_clean['DocumentNo'] = gl_clean['DocumentNo'].fillna('0').replace('', '0')
    gl_clean['Amount_in_local_cur'] = gl_clean['Amount_in_local_cur'].fillna(0.0)
    gl_clean['Amount_in_doc_curr'] = gl_clean['Amount_in_doc_curr'].fillna(0.0)
    gl_clean['Amount_in_loc_curr_2'] = gl_clean['Amount_in_loc_curr_2'].fillna(0.0)
    gl_clean['Text'] = gl_clean['Text'].fillna('0').replace('', '0')

    gl_sum_total = float(gl_clean['Amount_in_local_cur'].sum())

    # Journal Document Balancing Checkpoint
    doc_totals = gl_clean.groupby('DocumentNo')['Amount_in_local_cur'].sum().reset_index()
    doc_totals.columns = ['DocumentNo', 'DocSum']
    unbalanced_docs = doc_totals[doc_totals['DocSum'].abs() > 0.01]
    balanced_docs = doc_totals[doc_totals['DocSum'].abs() <= 0.01]
    unbalanced_count = len(unbalanced_docs)
    balanced_count = len(balanced_docs)

    gl_clean = gl_clean.merge(doc_totals, on='DocumentNo', how='left')
    gl_clean['BalanceStatus'] = np.where(gl_clean['DocSum'].abs() <= 0.01, 'BALANCED', 'UNBALANCED')

    # Save standardized Population / JE CSV (Exact Spark code column names)
    gl_cols_canonical = [
        'G_L', 'DocumentNo', 'Type', 'Entry_Date', 'Pstng_Date', 'Doc_Date',
        'Amount_in_local_cur', 'Lcurr', 'Amount_in_doc_curr', 'Curr',
        'Amount_in_loc_curr_2', 'LCur2', 'Document_Header_Text', 'Text', 'User_name', 'Debit_Credit'
    ]
    gl_out_path = os.path.join(output_dir, 'JE.csv')
    gl_clean[gl_cols_canonical].to_csv(gl_out_path, index=False)

    # -------------------------------------------------------------
    # 4. INTEGRITY TESTING (IR Tests 1 to 4 - Exact spark_JET_code SQL)
    # -------------------------------------------------------------
    log_event(run_id, 'INTEGRITY_TESTING', 60, 'Executing Integrity Testing IR 1 to IR 4', log_file)

    # GL_new_unique: sum of Amount_in_local_cur by G_L
    gl_grouped = gl_clean.groupby('G_L')['Amount_in_local_cur'].sum().reset_index()
    gl_grouped.columns = ['G_L', 'Total_Amount_in_local_cur']

    tb_unique_gl = set(tb_clean['G_L'].unique())
    gl_unique_gl = set(gl_clean['G_L'].unique())

    # IR Test 1: GL present in Trial Balance but not in Population
    ir_1 = tb_clean[~tb_clean['G_L'].isin(gl_unique_gl)][tb_cols].copy()
    ir_1_path = os.path.join(output_dir, 'IR_Exception_1.csv')
    ir_1.to_csv(ir_1_path, index=False)

    # IR Test 3: GL present in Population but not in Trial Balance
    ir_3 = gl_grouped[~gl_grouped['G_L'].isin(tb_unique_gl)][['G_L', 'Total_Amount_in_local_cur']].copy()
    ir_3_path = os.path.join(output_dir, 'IR_Exception_3.csv')
    ir_3.to_csv(ir_3_path, index=False)

    # IR Test 2: Population GL activity agrees with Trial Balance activity
    tb_left_pop = tb_clean.merge(gl_grouped, on='G_L', how='left')
    tb_left_pop['Total_Amount_in_local_cur'] = tb_left_pop['Total_Amount_in_local_cur'].fillna(0.0)
    tb_left_pop['Difference_In_Activity'] = (tb_left_pop['Debit'] - tb_left_pop['Credit']) - tb_left_pop['Total_Amount_in_local_cur']
    
    def eval_ir2(row):
        diff = row['Closing_Balance'] - row['Opening_Balance']
        gl_act = round(row['Total_Amount_in_local_cur'], 2)
        if diff != 0 and gl_act == 0.0:
            return 'Exception'
        if abs(gl_act - diff) <= 1.0:
            return ' No Exception'
        return 'Exception'

    tb_left_pop['Exception2'] = tb_left_pop.apply(eval_ir2, axis=1)
    
    ir2_cols = ['G_L', 'Opening_Balance', 'Debit', 'Credit', 'Closing_Balance', 'Total_Amount_in_local_cur', 'Difference_In_Activity', 'Exception2']
    ir_2_all_path = os.path.join(output_dir, 'IR_Exception_2_Detail.csv')
    tb_left_pop[ir2_cols].to_csv(ir_2_all_path, index=False)

    ir_2 = tb_left_pop[tb_left_pop['Exception2'] == 'Exception'][ir2_cols].copy()
    ir_2_path = os.path.join(output_dir, 'IR_Exception_2.csv')
    ir_2.to_csv(ir_2_path, index=False)

    # IR Test 4 / Seldom Accounts Inputs (Transaction counts per GL)
    gl_counts = gl_clean.groupby('G_L')['DocumentNo'].count().reset_index()
    gl_counts.columns = ['G_L', 'Count']
    ir_4 = tb_clean[['G_L', 'Description', 'Account_Subtype', 'FS_Line_Item']].merge(gl_counts, on='G_L', how='left')
    ir_4['Count'] = ir_4['Count'].fillna(0).astype(int)
    ir_4_cols = ['G_L', 'Description', 'Account_Subtype', 'FS_Line_Item', 'Count']
    ir_4_path = os.path.join(output_dir, 'Parameter_2_Seldom_Accounts_Inputs.csv')
    ir_4[ir_4_cols].to_csv(ir_4_path, index=False)
    ir_4_alt_path = os.path.join(output_dir, 'IR_Exception_4.csv')
    ir_4[ir_4_cols].to_csv(ir_4_alt_path, index=False)

    # -------------------------------------------------------------
    # 5. PARAMETER TESTING (Ex 1 to Ex 12) - Executed only if selected
    # -------------------------------------------------------------
    log_event(run_id, 'PARAMETER_TESTING', 75, f'Running Selected Parameter Exception Tests: {selected_exceptions}', log_file)

    param_summary = {}

    # Exact 17 output columns for Parameter Exceptions as defined in spark_JET_code
    param_output_cols = [
        'G_L', 'FS_Line_Item', 'DocumentNo', 'Type', 'Entry_Date', 'Pstng_Date', 'Doc_Date',
        'Amount_in_local_cur', 'Lcurr', 'Amount_in_doc_curr', 'Curr', 'Amount_in_loc_curr_2',
        'LCur2', 'Document_Header_Text', 'Text', 'User_name', 'Exception'
    ]

    def save_exception_file(df, num, name):
        # Guarantee all 17 columns exist and non-null
        if 'FS_Line_Item' not in df.columns:
            df['FS_Line_Item'] = ''
        if 'Exception' not in df.columns:
            df['Exception'] = f'Exception{num}'
        
        out_df = df[[c for c in param_output_cols if c in df.columns]].copy()
        for c in param_output_cols:
            if c not in out_df.columns:
                out_df[c] = ''
        out_df = out_df[param_output_cols]

        p = os.path.join(output_dir, f'Parameter_Exception_{num}.csv')
        out_df.to_csv(p, index=False)
        
        cnt = int((out_df['Exception'] == f'Exception{num}').sum())
        param_summary[f'Ex{num}_{name}'] = cnt
        param_summary[f'Ex{num}'] = cnt
        param_summary[f'Parameter_Exception_{num}'] = cnt
        return cnt

    # Ex1: Entries made to Unusual Accounts
    if 1 in selected_exceptions:
        ex1_gls = params.get('ex1UnusualAccounts', [])
        if not ex1_gls:
            ex1_gls = ['0059100000', '0059100001', '0058809000', '0034100000', '1009', '1012']
        ex1_gls_clean = [str(x).strip() for x in ex1_gls if str(x).strip()]
        ex1_docs = set(gl_clean[gl_clean['G_L'].isin(ex1_gls_clean)]['DocumentNo'].unique())
        ex1_df = gl_clean[gl_clean['DocumentNo'].isin(ex1_docs)].copy()
        ex1_df['FS_Line_Item'] = ''
        ex1_df['Exception'] = np.where(ex1_df['G_L'].isin(ex1_gls_clean) & (ex1_df['Amount_in_local_cur'] != 0), 'Exception1', 'NO Exception')
        save_exception_file(ex1_df, 1, 'Unusual_Accounts')

    # Ex2: Entries made to Seldom-based Accounts
    if 2 in selected_exceptions:
        ex2_gls = params.get('ex2SeldomAccounts', [])
        if not ex2_gls:
            seldom_list = ir_4[ir_4['Count'].between(1, 5)]['G_L'].tolist()
            ex2_gls = seldom_list[:20] if seldom_list else ['11301060', '11601900', '52002500', '1081001']
        ex2_gls_clean = [str(x).strip() for x in ex2_gls if str(x).strip()]
        ex2_docs = set(gl_clean[gl_clean['G_L'].isin(ex2_gls_clean)]['DocumentNo'].unique())
        ex2_df = gl_clean[gl_clean['DocumentNo'].isin(ex2_docs)].copy()
        ex2_df['FS_Line_Item'] = ''
        ex2_df['Exception'] = np.where(ex2_df['G_L'].isin(ex2_gls_clean) & (ex2_df['Amount_in_local_cur'] != 0), 'Exception2', 'NO Exception')
        save_exception_file(ex2_df, 2, 'Seldom_Accounts')

    # Ex3: Large Debits to Revenue During the Period (Filter on Revenue subtype automatically; if not then find income else leave blank)
    if 3 in selected_exceptions:
        custom_rev = params.get('ex3RevenueAccounts', [])
        if custom_rev and len(custom_rev) > 0:
            rev_gls = set([str(x).strip() for x in custom_rev if str(x).strip()])
        else:
            rev_tb = tb_clean[tb_clean['Account_Subtype'].str.strip().str.lower() == 'revenue']
            if len(rev_tb) == 0:
                rev_tb = tb_clean[tb_clean['Account_Subtype'].str.strip().str.lower() == 'income']
            rev_gls = set(rev_tb['G_L'].unique()) if len(rev_tb) > 0 else set()
        
        if not rev_gls:
            # Leave blank if no revenue/income account subtype found
            ex3_df = gl_clean.head(0).copy()
            ex3_df['FS_Line_Item'] = ''
            ex3_df['Exception'] = 'Exception3'
            save_exception_file(ex3_df, 3, 'Revenue_Debits')
        else:
            rev_docs = gl_clean[gl_clean['G_L'].isin(rev_gls)]
            # Optional quarter date filtering
            q_start = params.get('ex3QuarterStartDate')
            q_end = params.get('ex3QuarterEndDate')
            if q_start and q_end:
                q_start_iso = date_to_iso(q_start)
                q_end_iso = date_to_iso(q_end)
                if q_start_iso and q_end_iso:
                    iso_dates = rev_docs['Pstng_Date'].apply(date_to_iso)
                    in_q = iso_dates.apply(lambda d: d is not None and q_start_iso <= d <= q_end_iso)
                    rev_docs = rev_docs[in_q]

            doc_rev_sums = rev_docs.groupby('DocumentNo')['Amount_in_local_cur'].sum().reset_index()
            ex3_threshold = float(params.get('ex3RevenueDebitsThreshold', 0.0))
            flagged_ex3_docs = set(doc_rev_sums[doc_rev_sums['Amount_in_local_cur'] > ex3_threshold]['DocumentNo'].unique())
            
            ex3_df = gl_clean[gl_clean['DocumentNo'].isin(flagged_ex3_docs)].copy()
            ex3_df['FS_Line_Item'] = ''
            ex3_df['Exception'] = np.where(ex3_df['G_L'].isin(rev_gls) & (ex3_df['Amount_in_local_cur'] > 0), 'Exception3', 'NO Exception')
            save_exception_file(ex3_df, 3, 'Revenue_Debits')

    # Ex4: Users with few Postings
    if 4 in selected_exceptions:
        ex4_thresh = int(params.get('ex4FewPostingsUserThreshold', 1))
        user_doc_counts = gl_clean.groupby('User_name')['DocumentNo'].nunique().reset_index()
        user_doc_counts.columns = ['User_name', 'DocCount']
        few_users = set(user_doc_counts[user_doc_counts['DocCount'] <= ex4_thresh]['User_name'].unique())
        ex4_df = gl_clean[gl_clean['User_name'].isin(few_users)].copy()
        ex4_df['FS_Line_Item'] = ''
        ex4_df['Exception'] = 'Exception4'
        save_exception_file(ex4_df, 4, 'Few_Postings_Users')

    # Ex5: Users of Interest
    if 5 in selected_exceptions:
        ex5_users = params.get('ex5UsersOfInterest', ['SBPATIL', 'PKADAM', 'ADMIN', 'SYSTEM', 'BATCH'])
        ex5_users_clean = [str(u).strip().upper() for u in ex5_users]
        ex5_docs = set(gl_clean[gl_clean['User_name'].str.upper().isin(ex5_users_clean)]['DocumentNo'].unique())
        ex5_df = gl_clean[gl_clean['DocumentNo'].isin(ex5_docs)].copy()
        ex5_df['FS_Line_Item'] = ''
        ex5_df['Exception'] = np.where(ex5_df['User_name'].str.upper().isin(ex5_users_clean), 'Exception5', 'NO Exception')
        save_exception_file(ex5_df, 5, 'Users_Of_Interest')

    # Ex6: Closing Entries (Around Year-End)
    if 6 in selected_exceptions:
        fy_end = params.get('ex6ClosingDate') or params.get('financialYearEnd', '31-Dec-25')
        fy_end_date = date_to_iso(fy_end)
        ex6_days_before = int(params.get('ex6ClosingEntriesBeforeDays', 1))
        ex6_days_after = int(params.get('ex6ClosingEntriesAfterDays', 10))
        
        ex6_df = gl_clean.copy()
        ex6_df['FS_Line_Item'] = ''
        try:
            ref_date = datetime.date.fromisoformat(fy_end_date) if fy_end_date else datetime.date(2025, 12, 31)
            start_w = ref_date - datetime.timedelta(days=ex6_days_before)
            end_w = ref_date + datetime.timedelta(days=ex6_days_after)
            
            gl_dates = gl_clean['Entry_Date'].apply(date_to_iso)
            is_in_win = gl_dates.apply(lambda d: d is not None and start_w <= datetime.date.fromisoformat(d) <= end_w)
            ex6_docs = set(gl_clean[is_in_win]['DocumentNo'].unique())
            ex6_df = gl_clean[gl_clean['DocumentNo'].isin(ex6_docs)].copy()
            ex6_df['FS_Line_Item'] = ''
            gl_dates_sub = ex6_df['Entry_Date'].apply(date_to_iso)
            ex6_df['Exception'] = np.where(gl_dates_sub.apply(lambda d: d is not None and start_w <= datetime.date.fromisoformat(d) <= end_w), 'Exception6', 'NO Exception')
        except:
            ex6_df['Exception'] = 'NO Exception'
        save_exception_file(ex6_df, 6, 'Closing_Entries')

    # Ex7: Entries posted on Dates of Interest
    if 7 in selected_exceptions:
        ex7_dates = params.get('ex7DatesOfInterest', ['05-Nov-25', '25-Dec-25', '31-Dec-25'])
        ex7_dates_iso = set([date_to_iso(d) for d in ex7_dates if date_to_iso(d)])
        
        gl_iso = gl_clean['Pstng_Date'].apply(date_to_iso)
        matched_docs = set(gl_clean[gl_iso.isin(ex7_dates_iso)]['DocumentNo'].unique())
        ex7_df = gl_clean[gl_clean['DocumentNo'].isin(matched_docs)].copy()
        ex7_df['FS_Line_Item'] = ''
        gl_sub_iso = ex7_df['Pstng_Date'].apply(date_to_iso)
        ex7_df['Exception'] = np.where(gl_sub_iso.isin(ex7_dates_iso), 'Exception7', 'NO Exception')
        save_exception_file(ex7_df, 7, 'Dates_Of_Interest')

    # Ex8: Entries with round Amounts or recurring ending Digits
    if 8 in selected_exceptions:
        round_rules = params.get('ex8RoundDigits', ['1000', '10000', '100000', '1000000', '10000000', '6', '7', '8', '9'])
        
        def is_round_or_recurring(amt):
            abs_amt = abs(int(amt))
            if abs_amt == 0:
                return False
            # Check magnitudes
            for mag in [1000000000, 100000000, 10000000, 1000000, 100000, 10000, 1000]:
                if str(mag) in round_rules and abs_amt % mag == 0:
                    return True
            s = str(abs_amt)
            # Check recurring ending patterns (22, 333, 4444, 55555, 666666, 7777777, etc.)
            for d in ['2', '3', '4', '5', '6', '7', '8', '9']:
                if d in round_rules:
                    digit_len = int(d)
                    if len(s) >= digit_len:
                        sub = s[-digit_len:]
                        if len(set(sub)) == 1:
                            return True
            return False

        ex8_matches = gl_clean['Amount_in_local_cur'].apply(is_round_or_recurring)
        ex8_docs = set(gl_clean[ex8_matches]['DocumentNo'].unique())
        ex8_df = gl_clean[gl_clean['DocumentNo'].isin(ex8_docs)].copy()
        ex8_df['FS_Line_Item'] = ''
        ex8_df['Exception'] = np.where(ex8_df['Amount_in_local_cur'].apply(is_round_or_recurring), 'Exception8', 'NO Exception')
        save_exception_file(ex8_df, 8, 'Round_Amounts')

    # Ex9: Duplicate Entries
    if 9 in selected_exceptions:
        val_thresh = int(params.get('ex9DuplicateCountThreshold', 2))
        amt_thresh = float(params.get('ex9DuplicateAmountThreshold', 0.0))
        
        gl_clean['Combo'] = gl_clean['G_L'] + '_' + gl_clean['Amount_in_local_cur'].astype(int).astype(str)
        doc_combos = gl_clean.groupby('DocumentNo')['Combo'].apply(lambda x: '_'.join(sorted(x))).reset_index()
        combo_counts = doc_combos['Combo'].value_counts()
        dup_combos = set(combo_counts[combo_counts > val_thresh].index)
        
        dup_docs = set(doc_combos[doc_combos['Combo'].isin(dup_combos)]['DocumentNo'].unique())
        
        if amt_thresh > 0:
            doc_pos_sums = gl_clean[gl_clean['Amount_in_local_cur'] > 0].groupby('DocumentNo')['Amount_in_local_cur'].sum().reset_index()
            qual_docs = set(doc_pos_sums[doc_pos_sums['Amount_in_local_cur'] > amt_thresh]['DocumentNo'].unique())
            dup_docs = dup_docs.intersection(qual_docs)

        ex9_df = gl_clean[gl_clean['DocumentNo'].isin(dup_docs)].copy()
        ex9_df['FS_Line_Item'] = ''
        ex9_df['Exception'] = 'Exception9'
        save_exception_file(ex9_df, 9, 'Duplicate_Entries')

    # Ex10: Entries Containing Keywords in Journal
    if 10 in selected_exceptions:
        ex10_keywords = params.get('ex10Keywords', [
            'fault', 'bribe', "auditor's adjustment", 'mistake', 'risk', 'misstatement',
            'officer', 'prize', 'abuse', 'alter', 'seizure', 'bury', 'conceal', 'conting',
            'corrupt', 'demand', 'embezzle', 'theft', 'fictitious', 'fraud', 'manual', 'adjustment', 'reverse'
        ])
        pattern = r'\b(?:' + '|'.join([re.escape(k.lower().strip()) for k in ex10_keywords if k.strip()]) + r')\b'
        
        match_header = gl_clean['Document_Header_Text'].str.lower().str.contains(pattern, regex=True, na=False)
        match_text = gl_clean['Text'].str.lower().str.contains(pattern, regex=True, na=False)
        ex10_flagged_docs = set(gl_clean[match_header | match_text]['DocumentNo'].unique())
        
        ex10_df = gl_clean[gl_clean['DocumentNo'].isin(ex10_flagged_docs)].copy()
        ex10_df['FS_Line_Item'] = ''
        ex10_df['Exception'] = np.where(
            ex10_df['Document_Header_Text'].str.lower().str.contains(pattern, regex=True, na=False) |
            ex10_df['Text'].str.lower().str.contains(pattern, regex=True, na=False),
            'Exception10', 'NO Exception'
        )
        save_exception_file(ex10_df, 10, 'Keyword_Entries')

    # Ex11: Entries Posted after closing date for Quarter/Month/Half Year/Annual
    if 11 in selected_exceptions:
        fy_end = params.get('ex11ClosingDate') or params.get('financialYearEnd', '31-Dec-25')
        fy_end_date = date_to_iso(fy_end)
        ex11_days = int(params.get('ex11DaysAfterClosing', 10))
        ex11_df = gl_clean.copy()
        ex11_df['FS_Line_Item'] = ''
        try:
            ref_date = datetime.date.fromisoformat(fy_end_date) if fy_end_date else datetime.date(2025, 12, 31)
            cutoff = ref_date + datetime.timedelta(days=ex11_days)
            gl_dates = gl_clean['Entry_Date'].apply(date_to_iso)
            is_after = gl_dates.apply(lambda d: d is not None and datetime.date.fromisoformat(d) > cutoff)
            ex11_docs = set(gl_clean[is_after]['DocumentNo'].unique())
            ex11_df = gl_clean[gl_clean['DocumentNo'].isin(ex11_docs)].copy()
            ex11_df['FS_Line_Item'] = ''
            gl_dates_sub = ex11_df['Entry_Date'].apply(date_to_iso)
            ex11_df['Exception'] = np.where(gl_dates_sub.apply(lambda d: d is not None and datetime.date.fromisoformat(d) > cutoff), 'Exception11', 'NO Exception')
        except:
            ex11_df['Exception'] = 'NO Exception'
        save_exception_file(ex11_df, 11, 'Post_Closing_Entries')

    # Ex12: Unrelated Accounts (Debit and Credit FS Line Items)
    if 12 in selected_exceptions:
        gl_with_fs = gl_clean.merge(tb_clean[['G_L', 'FS_Line_Item']], on='G_L', how='left')
        gl_with_fs['FS_Line_Item'] = gl_with_fs['FS_Line_Item'].fillna('')
        
        unrelated_rules = params.get('ex12UnrelatedRules', [
            {"debit": "Trade Receivables", "credit": "COST OF SALES AND SERVICES"},
            {"debit": "Property, plant and equipment", "credit": "General and administrative expenses"},
            {"debit": "Trade Payables", "credit": "NET SALES REVENUE"},
            {"debit": "Property, plant and equipment", "credit": "NET SALES REVENUE"},
        ])
        
        tb_fs_items = set([x.strip().lower() for x in tb_clean['FS_Line_Item'].dropna().unique() if x.strip()])
        ex12_flagged_docs = set()
        for rule in unrelated_rules:
            d_line = rule.get('debit', rule.get('debitFSLine', '')).strip()
            c_line = rule.get('credit', rule.get('creditFSLine', '')).strip()
            if not d_line or not c_line:
                continue
            
            # Constraint logging
            if tb_fs_items and d_line.lower() not in tb_fs_items:
                log_event(run_id, 'WARNING', 82, f"Ex12 constraint warning: Debit line item '{d_line}' is not present in TB FS_Line_Item column", log_file)
            if tb_fs_items and c_line.lower() not in tb_fs_items:
                log_event(run_id, 'WARNING', 82, f"Ex12 constraint warning: Credit line item '{c_line}' is not present in TB FS_Line_Item column", log_file)

            has_debit = gl_with_fs[(gl_with_fs['Amount_in_local_cur'] > 0) & (gl_with_fs['FS_Line_Item'].str.strip().str.lower() == d_line.lower())]['DocumentNo'].unique()
            has_credit = gl_with_fs[(gl_with_fs['Amount_in_local_cur'] < 0) & (gl_with_fs['FS_Line_Item'].str.strip().str.lower() == c_line.lower())]['DocumentNo'].unique()
            matched = set(has_debit).intersection(set(has_credit))
            ex12_flagged_docs.update(matched)

        ex12_df = gl_with_fs[gl_with_fs['DocumentNo'].isin(ex12_flagged_docs)].copy()
        ex12_df['Exception'] = 'Exception12'
        save_exception_file(ex12_df, 12, 'Unrelated_Accounts')

    # -------------------------------------------------------------
    # 6. CONTROL SAMPLE DUMP (Random Sampling with Seed 42)
    # -------------------------------------------------------------
    if params.get('runControlSamples', True):
        log_event(run_id, 'SAMPLING', 90, 'Extracting reproducible control sample dump', log_file)
        sample_size = int(params.get('controlSampleCount', 61))
        unique_docs = pd.Series(gl_clean['DocumentNo'].unique())
        n_sample = min(len(unique_docs), sample_size)
        sampled_docs = set(unique_docs.sample(n=n_sample, random_state=42).tolist())

        sample_df = gl_clean[gl_clean['DocumentNo'].isin(sampled_docs)].copy()
        sample_df['Control_Sample'] = 'Sample_Selected'
        sample_df['FS_Line_Item'] = ''
        sample_out_path = os.path.join(output_dir, 'Control_Sample_Dump.csv')
        sample_df.to_csv(sample_out_path, index=False)
        sampled_count = len(sampled_docs)
    else:
        sampled_count = 0

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
        "controlSampleCount": sampled_count
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
