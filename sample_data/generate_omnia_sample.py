"""
Generate Omnia JET Sample Data - JET_Input.xlsx and CSVs
Workbook Sheets:
  1. TB         : Single Standard Trial Balance with Opening & Closing Balance (user input)
  2. Population : General Ledger Details (Standard, Non-Standard, Suspicious, Post-Closing JEs)
  3. COA        : Chart of Accounts master with FS categories and lines
"""

import os
import pandas as pd
from datetime import date

base_dir = os.path.dirname(os.path.abspath(__file__))
omnia_dir = os.path.join(base_dir, 'omnia_jet')
os.makedirs(omnia_dir, exist_ok=True)

out_xlsx_path = os.path.join(omnia_dir, 'JET_Input.xlsx')

# ─── Engagement Parameters ────────────────────────────────────────────────────
ENTITY_ID       = "ENT01"
ENTITY_NAME     = "JIOSAT Manufacturing Pvt. Ltd."
CHART_OF_ACCTS  = "JIOSAT"
EC_CURRENCY     = "INR"
GC_CURRENCY     = "USD"
FX_RATE         = 83.1          # 1 USD = 83.1 INR approx
FISCAL_YEAR     = 2026
TESTING_START   = "04/01/2025"  # period start
TESTING_END     = "03/31/2026"  # period end (fiscal year end)
BEG_PERIOD_END  = "03/31/2025"  # one day BEFORE testing start = beginning TB period_end_date
PERIOD_TYPE     = "YTD"

def ec_to_gc(amount):
    return round(amount / FX_RATE, 2)

# ─── Account Master ───────────────────────────────────────────────────────────
ACCOUNTS = [
    # (acct_no, description, fs_category, fs_subtotal, fs_line, fs_type, grp1_num, grp1, grp2_num, grp2)
    ("10100000","Cash and Bank - Current Account",  "Assets",     "Current Assets",        "Cash and cash equivalents",              "Balance Sheet", "CA01","Cash & Bank",    "FSL001","Cash and cash equivalents"),
    ("10200000","Short-term Investments",            "Assets",     "Current Assets",        "Cash and cash equivalents",              "Balance Sheet", "CA01","Cash & Bank",    "FSL001","Cash and cash equivalents"),
    ("11401000","Trade Receivables - Domestic",      "Assets",     "Current Assets",        "Trade Receivables",                      "Balance Sheet", "CA02","Receivables",    "FSL002","Trade Receivables"),
    ("11402000","Trade Receivables - Export",        "Assets",     "Current Assets",        "Trade Receivables",                      "Balance Sheet", "CA02","Receivables",    "FSL002","Trade Receivables"),
    ("11500000","Prepaid Expenses",                  "Assets",     "Current Assets",        "Other current assets",                   "Balance Sheet", "CA03","Prepayments",   "FSL003","Other current assets"),
    ("11600000","Security Deposits",                 "Assets",     "Non-Current Assets",    "Other non-current assets",               "Balance Sheet", "NCA01","Deposits",     "FSL004","Other non-current assets"),
    ("12100000","Inventories - Raw Materials",       "Assets",     "Current Assets",        "Inventories",                            "Balance Sheet", "CA04","Inventory",     "FSL005","Inventories"),
    ("12200000","Inventories - Finished Goods",      "Assets",     "Current Assets",        "Inventories",                            "Balance Sheet", "CA04","Inventory",     "FSL005","Inventories"),
    ("51001000","Property Plant and Machinery",      "Assets",     "Non-Current Assets",    "Property, plant and equipment",          "Balance Sheet", "NCA02","PPE - Gross",  "FSL006","Property, plant and equipment"),
    ("51002000","Accumulated Depreciation",          "Assets",     "Non-Current Assets",    "Property, plant and equipment",          "Balance Sheet", "NCA02","PPE - AccDep", "FSL006","Property, plant and equipment"),
    ("20100000","Short-Term Borrowings",             "Liabilities","Current Liabilities",   "Borrowings",                             "Balance Sheet", "CL01","Borrowings",    "FSL007","Borrowings"),
    ("20200000","Long-Term Loans",                   "Liabilities","Non-Current Liabilities","Borrowings",                            "Balance Sheet", "NCL01","Long-term Loans","FSL007","Borrowings"),
    ("21100000","Trade Payables - Domestic",         "Liabilities","Current Liabilities",   "Trade Payables",                         "Balance Sheet", "CL02","Payables",      "FSL008","Trade Payables"),
    ("21200000","Accrued Liabilities",               "Liabilities","Current Liabilities",   "Other current liabilities",              "Balance Sheet", "CL03","Accruals",      "FSL009","Other current liabilities"),
    ("21302630","Output GST Clearing",               "Liabilities","Current Liabilities",   "Other Payables",                         "Balance Sheet", "CL04","Tax Payables",  "FSL010","Other Payables"),
    ("1000001", "Equity Share Capital Rs 10",        "Equity",     "Equity",                "Share Capital",                          "Balance Sheet", "EQ01","Share Capital", "FSL011","Share Capital"),
    ("1160001", "Retained Earnings",                 "Equity",     "Equity",                "Retained Earnings",                      "Balance Sheet", "EQ02","Reserves",      "FSL012","Retained Earnings"),
    ("41001400","Sales Revenue - Domestic",          "Revenue",    "Revenue",               "NET SALES REVENUE",                      "Income Statement","REV01","Revenue",    "FSL013","NET SALES REVENUE"),
    ("41001500","Sales Revenue - Export",            "Revenue",    "Revenue",               "NET SALES REVENUE",                      "Income Statement","REV01","Revenue",    "FSL013","NET SALES REVENUE"),
    ("41301200","Interest Income",                   "Revenue",    "Finance Income",        "Finance income",                         "Income Statement","REV02","Other Income","FSL014","Finance income"),
    ("41301600","Miscellaneous Income",              "Revenue",    "Other Income",          "Other operating income (expenses), net", "Income Statement","REV02","Other Income","FSL015","Other operating income (expenses), net"),
    ("50001000","Cost of Goods Sold",                "Expenses",   "Cost of Sales",         "COST OF SALES AND SERVICES",             "Income Statement","EXP01","COGS",       "FSL016","COST OF SALES AND SERVICES"),
    ("52001000","Employee Compensation",             "Expenses",   "Operating Expenses",    "General and administrative expenses",    "Income Statement","EXP02","Staff Costs", "FSL017","General and administrative expenses"),
    ("52002500","Consultancy and Audit Fees",        "Expenses",   "Operating Expenses",    "General and administrative expenses",    "Income Statement","EXP02","Admin",       "FSL017","General and administrative expenses"),
    ("52003000","Depreciation Expense",              "Expenses",   "Operating Expenses",    "Depreciation and amortisation",          "Income Statement","EXP03","Depreciation","FSL018","Depreciation and amortisation"),
    ("52004000","Finance Costs - Interest",          "Expenses",   "Finance Costs",         "Finance costs",                          "Income Statement","EXP04","Finance Costs","FSL019","Finance costs"),
]

# Prior year closing = current year opening balances
prior_year_ending = {
    "10100000":  45200000.0,   "10200000":  10000000.0,
    "11401000":  148500000.0,  "11402000":  32000000.0,
    "11500000":  3800000.0,    "11600000":  5000000.0,
    "12100000":  62000000.0,   "12200000":  28000000.0,
    "51001000":  540000000.0,  "51002000": -180000000.0,
    "20100000": -80000000.0,   "20200000": -250000000.0,
    "21100000": -42000000.0,   "21200000": -18000000.0,
    "21302630":  0.0,          "1000001":  -117200000.0,
    "1160001":  -85000000.0,   "41001400":  0.0,
    "41001500":  0.0,          "41301200":  0.0,
    "41301600":  0.0,          "50001000":  0.0,
    "52001000":  0.0,          "52002500":  0.0,
    "52003000":  0.0,          "52004000":  0.0,
}

# Current year ending balances
current_year_ending = {
    "10100000":  38750000.0,   "10200000":  10000000.0,
    "11401000":  162000000.0,  "11402000":  28500000.0,
    "11500000":  4200000.0,    "11600000":  5000000.0,
    "12100000":  58000000.0,   "12200000":  31500000.0,
    "51001000":  558000000.0,  "51002000": -201000000.0,
    "20100000": -75000000.0,   "20200000": -230000000.0,
    "21100000": -48000000.0,   "21200000": -21000000.0,
    "21302630": -2500000.0,    "1000001":  -117200000.0,
    "1160001":  -110000000.0,  "41001400": -445000000.0,
    "41001500": -50500000.0,   "41301200": -4600000.0,
    "41301600": -1800000.0,    "50001000":  248000000.0,
    "52001000":  60000000.0,   "52002500":  6000000.0,
    "52003000":  21000000.0,   "52004000":  11200000.0,
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. SINGLE TRIAL BALANCE (TB)
# User provides 1 TB file with Opening Balance and Closing Balance
# ─────────────────────────────────────────────────────────────────────────────
tb_rows = []
for acct in ACCOUNTS:
    acct_no, desc, fs_cat, fs_subtotal, fs_line, fs_type, grp1_num, grp1, _, _ = acct
    op_bal = prior_year_ending[acct_no]
    cl_bal = current_year_ending[acct_no]
    dr = max(0.0, cl_bal - op_bal) if (cl_bal - op_bal) > 0 else 0.0
    cr = max(0.0, op_bal - cl_bal) if (op_bal - cl_bal) > 0 else 0.0
    
    tb_rows.append({
        "entity_id":           ENTITY_ID,
        "entity_name":         ENTITY_NAME,
        "account_number":      acct_no,
        "account_description": desc,
        "period_end_date":     TESTING_END,
        "fiscal_year":         FISCAL_YEAR,
        "fiscal_period":       12,
        "period_type":         PERIOD_TYPE,
        "chart_of_accounts":   CHART_OF_ACCTS,
        "entity_currency_ec":  EC_CURRENCY,
        "group_currency_gc":   GC_CURRENCY,
        "beginning_balance_ec": op_bal,
        "ending_balance_ec":   cl_bal,
        "beginning_balance_gc": ec_to_gc(op_bal),
        "ending_balance_gc":   ec_to_gc(cl_bal),
        "debit":               dr,
        "credit":              cr,
        "financial_statement_category": fs_cat,
        "financial_statement_line":     fs_line,
        "account_grouping_1":           grp1,
    })

tb_df = pd.DataFrame(tb_rows)

# ─────────────────────────────────────────────────────────────────────────────
# 2. GENERAL LEDGER POPULATION (GL DETAIL)
# ─────────────────────────────────────────────────────────────────────────────
def je_row(jnum, jline, acct, eff_date, post_date, time_p, fy, fperiod,
           net_ec, dr_ec, cr_ec, tx_type, is_std,
           hdr_desc, line_desc, user_id, user_name, appr_id="FINANCE_MGR", appr_name="Finance Manager",
           is_manual="A"):
    net_gc = ec_to_gc(net_ec)
    dr_gc  = ec_to_gc(dr_ec)
    cr_gc  = ec_to_gc(cr_ec)
    return {
        "entity_id":                  ENTITY_ID,
        "entity_name":                ENTITY_NAME,
        "journal_number":             jnum,
        "journal_line_number":        f"{jnum}-{jline:02d}",
        "account_number":             acct,
        "date_effective":             eff_date,
        "date_posted":                post_date,
        "time_posted":                time_p,
        "fiscal_year":                fy,
        "fiscal_period":              fperiod,
        "transaction_type":           tx_type,
        "transaction_type_description": {
            "RV": "Customer Invoice", "RE": "Vendor Invoice", "PC": "Payroll",
            "AF": "Depreciation Run", "ZP": "Payment", "SA": "Manual Journal",
            "AB": "Manual Adjustment", "AA": "Asset Posting", "WA": "Goods Issue",
            "KR": "Tax Posting",
        }.get(tx_type, tx_type),
        "net_amount_ec":              net_ec,
        "debit_amount_ec":            dr_ec,
        "credit_amount_ec":           cr_ec,
        "net_amount_gc":              net_gc,
        "debit_amount_gc":            dr_gc,
        "credit_amount_gc":           cr_gc,
        "net_amount_oc":              net_ec,
        "debit_amount_oc":            dr_ec,
        "credit_amount_oc":           cr_ec,
        "entity_currency_ec":         EC_CURRENCY,
        "group_currency_gc":          GC_CURRENCY,
        "original_currency_oc":       EC_CURRENCY,
        "dc_indicator":               "D" if net_ec > 0 else "C",
        "is_standard":                is_std,
        "is_manual":                  is_manual,
        "chart_of_accounts":          CHART_OF_ACCTS,
        "journal_header_description": hdr_desc,
        "journal_line_description":   line_desc,
        "userid_entered":             user_id,
        "user_name_entered":          user_name,
        "userid_approved":            appr_id,
        "user_name_approved":         appr_name,
        "source":                     tx_type,
        "business_area":              "MANUFACTURING",
        "cost_center":                "CC100",
        "profit_center":              "PC100",
    }

je_rows = [
    # Standard domestic sales invoice (RV)
    je_row("RV2026000001",1,"11401000","04/05/2025","04/05/2025","09:14:00",2026,1, 5250000.0,5250000.0,0.0,      "RV","S","Sales Invoice Q1 FY26","AR debit - domestic sale",     "JKUMAR","J. Kumar"),
    je_row("RV2026000001",2,"41001400","04/05/2025","04/05/2025","09:14:00",2026,1,-5250000.0,0.0,5250000.0,      "RV","S","Sales Invoice Q1 FY26","Revenue recognition",           "JKUMAR","J. Kumar"),

    je_row("RV2026000002",1,"11401000","05/12/2025","05/12/2025","10:30:00",2026,2, 3800000.0,3800000.0,0.0,      "RV","S","Sales Invoice Q1 FY26","AR debit - standard billing",   "PSINGH","P. Singh"),
    je_row("RV2026000002",2,"41001400","05/12/2025","05/12/2025","10:30:00",2026,2,-3800000.0,0.0,3800000.0,      "RV","S","Sales Invoice Q1 FY26","Revenue credit",                "PSINGH","P. Singh"),

    # Export sales (RV)
    je_row("RV2026000010",1,"11402000","06/18/2025","06/18/2025","14:05:00",2026,3, 8500000.0,8500000.0,0.0,      "RV","S","Export Sales Invoice","AR debit - Middle East export", "RVERMA","R. Verma"),
    je_row("RV2026000010",2,"41001500","06/18/2025","06/18/2025","14:05:00",2026,3,-8500000.0,0.0,8500000.0,      "RV","S","Export Sales Invoice","Export revenue credit",          "RVERMA","R. Verma"),

    # Purchase / COGS (RE)
    je_row("RE2026000020",1,"50001000","07/01/2025","07/01/2025","08:00:00",2026,4, 12000000.0,12000000.0,0.0,    "RE","S","Purchase Invoice COGS","COGS debit - raw material",     "ASHARMA","A. Sharma"),
    je_row("RE2026000020",2,"21100000","07/01/2025","07/01/2025","08:00:00",2026,4,-12000000.0,0.0,12000000.0,    "RE","S","Purchase Invoice COGS","Trade payable - Hindustan Corp","ASHARMA","A. Sharma"),

    # PPE addition (AA)
    je_row("AA2026000040",1,"51001000","08/20/2025","08/20/2025","11:22:00",2026,5, 22000000.0,22000000.0,0.0,    "AA","S","Asset Addition - Machinery","PPE debit - CNC machine",  "TRAO","T. Rao"),
    je_row("AA2026000040",2,"21100000","08/20/2025","08/20/2025","11:22:00",2026,5,-22000000.0,0.0,22000000.0,    "AA","S","Asset Addition - Machinery","Payable - Siemens India",   "TRAO","T. Rao"),

    # Payroll (PC)
    je_row("PC2026000060",1,"52001000","07/31/2025","07/31/2025","23:55:00",2026,4, 4000000.0,4000000.0,0.0,      "PC","S","Payroll July 2025","Monthly salary expense",             "SYSTEM","System Batch","SYSTEM","System Batch"),
    je_row("PC2026000060",2,"10100000","07/31/2025","07/31/2025","23:55:00",2026,4,-4000000.0,0.0,4000000.0,      "PC","S","Payroll July 2025","Bank payment - payroll",             "SYSTEM","System Batch","SYSTEM","System Batch"),

    # Depreciation (AF)
    je_row("AF2026000070",1,"52003000","09/30/2025","09/30/2025","22:00:00",2026,6, 5000000.0,5000000.0,0.0,      "AF","S","Depreciation Q2 FY26","Depreciation expense",            "BATCH","System Batch","SYSTEM","System Batch"),
    je_row("AF2026000070",2,"51002000","09/30/2025","09/30/2025","22:00:00",2026,6,-5000000.0,0.0,5000000.0,      "AF","S","Depreciation Q2 FY26","Accumulated depreciation credit", "BATCH","System Batch","SYSTEM","System Batch"),

    # Loan repayment (ZP)
    je_row("ZP2026000080",1,"20200000","10/15/2025","10/15/2025","16:45:00",2026,7, 20000000.0,20000000.0,0.0,    "ZP","S","Loan Repayment Q3","Long-term loan principal repayment","TRAO","T. Rao"),
    je_row("ZP2026000080",2,"10100000","10/15/2025","10/15/2025","16:45:00",2026,7,-20000000.0,0.0,20000000.0,    "ZP","S","Loan Repayment Q3","Bank outflow - HDFC settlement",   "TRAO","T. Rao"),

    # Interest income (ZP)
    je_row("ZP2026000090",1,"10200000","10/31/2025","10/31/2025","17:00:00",2026,7, 800000.0,800000.0,0.0,         "ZP","S","Interest Income Oct","FD interest receipt",             "BATCH","System Batch","SYSTEM","System Batch"),
    je_row("ZP2026000090",2,"41301200","10/31/2025","10/31/2025","17:00:00",2026,7,-800000.0,0.0,800000.0,         "ZP","S","Interest Income Oct","Interest income recognition",    "BATCH","System Batch","SYSTEM","System Batch"),

    # Inventory GI (WA)
    je_row("WA2026000100",1,"50001000","11/10/2025","11/10/2025","07:30:00",2026,8, 42000000.0,42000000.0,0.0,    "WA","S","GI to Production","Raw material issued to production",   "BATCH","System Batch","SYSTEM","System Batch"),
    je_row("WA2026000100",2,"12100000","11/10/2025","11/10/2025","07:30:00",2026,8,-42000000.0,0.0,42000000.0,    "WA","S","GI to Production","Inventory credit - RM consumed",    "BATCH","System Batch","SYSTEM","System Batch"),

    # GST Tax Posting (KR)
    je_row("KR2026000110",1,"21302630","02/28/2026","02/28/2026","15:30:00",2026,11,-2500000.0,0.0,2500000.0,     "KR","S","GST Output Clearing","Quarterly GST output liability",   "ASHARMA","A. Sharma"),
    je_row("KR2026000110",2,"10100000","02/28/2026","02/28/2026","15:30:00",2026,11, 2500000.0,2500000.0,0.0,     "KR","S","GST Output Clearing","Bank receipt - GST refund",        "ASHARMA","A. Sharma"),

    # Finance costs YE (ZP)
    je_row("ZP2026000120",1,"52004000","03/31/2026","03/31/2026","18:00:00",2026,12, 2700000.0,2700000.0,0.0,     "ZP","S","Interest Expense YE","Annual interest on term loan",     "SYSTEM","System Batch","SYSTEM","System Batch"),
    je_row("ZP2026000120",2,"20100000","03/31/2026","03/31/2026","18:00:00",2026,12,-2700000.0,0.0,2700000.0,     "ZP","S","Interest Expense YE","Short-term borrowing interest",    "SYSTEM","System Batch","SYSTEM","System Batch"),

    # Consultancy round-sum SUSPICIOUS - manual (SA)
    je_row("SA2026000130",1,"52002500","01/15/2026","01/15/2026","20:45:00",2026,10, 1000000.0,1000000.0,0.0,     "SA","N","Consultancy Fee - Manual","External consultant fee",       "SBPATIL","S. B. Patil","SBPATIL","S. B. Patil","M"),
    je_row("SA2026000130",2,"10100000","01/15/2026","01/15/2026","20:45:00",2026,10,-1000000.0,0.0,1000000.0,     "SA","N","Consultancy Fee - Manual","Bank payment to consultant",   "SBPATIL","S. B. Patil","SBPATIL","S. B. Patil","M"),

    # Auditor/Management adjustment (AB) - non-standard
    je_row("AB2026000140",1,"41001400","03/31/2026","03/31/2026","23:50:00",2026,12, 500000.0,500000.0,0.0,        "AB","N","Auditor Adjustment YE","Management override - revenue adj","MGMT","Senior Manager","MGMT","Senior Manager","M"),
    je_row("AB2026000140",2,"21200000","03/31/2026","03/31/2026","23:50:00",2026,12,-500000.0,0.0,500000.0,        "AB","N","Auditor Adjustment YE","Accrual reversal entry",         "MGMT","Senior Manager","MGMT","Senior Manager","M"),

    # Post-closing entry (after testing period end) - (SA)
    je_row("SA2026000150",1,"41301600","04/05/2026","04/05/2026","09:00:00",2026,12, 600000.0,600000.0,0.0,        "SA","N","Post-Closing Misc Income","Late income recognised",       "RDESAI","R. Desai","FINANCE_MGR","Finance Manager","M"),
    je_row("SA2026000150",2,"11500000","04/05/2026","04/05/2026","09:00:00",2026,12,-600000.0,0.0,600000.0,        "SA","N","Post-Closing Misc Income","Prepaid writedown offset",    "RDESAI","R. Desai","FINANCE_MGR","Finance Manager","M"),

    # Weekend/holiday posting - suspicious (SA)
    je_row("SA2026000160",1,"41301600","03/15/2026","03/15/2026","02:15:00",2026,12, 600000.0,600000.0,0.0,        "SA","N","Misc Income - Odd Hours","Unplanned misc income (Sunday)", "OCPL01","External Consultant","FINANCE_MGR","Finance Manager","M"),
    je_row("SA2026000160",2,"11500000","03/15/2026","03/15/2026","02:15:00",2026,12,-600000.0,0.0,600000.0,        "SA","N","Misc Income - Odd Hours","Prepaid account offset",        "OCPL01","External Consultant","FINANCE_MGR","Finance Manager","M"),

    # Additional domestic sales (RV)
    je_row("RV2026000017",1,"11401000","12/10/2025","12/10/2025","10:00:00",2026,9, 9500000.0,9500000.0,0.0,       "RV","S","Sales Invoice Q3 FY26","AR debit - Q3 billing run",     "PSINGH","P. Singh"),
    je_row("RV2026000017",2,"41001400","12/10/2025","12/10/2025","10:00:00",2026,9,-9500000.0,0.0,9500000.0,       "RV","S","Sales Invoice Q3 FY26","Revenue credit Q3",             "PSINGH","P. Singh"),

    # Inventory finished goods production (WA)
    je_row("WA2026000180",1,"12200000","01/20/2026","01/20/2026","14:00:00",2026,10, 18500000.0,18500000.0,0.0,   "WA","S","GR from Production","Finished goods GR debit",           "BATCH","System Batch","SYSTEM","System Batch"),
    je_row("WA2026000180",2,"50001000","01/20/2026","01/20/2026","14:00:00",2026,10,-18500000.0,0.0,18500000.0,   "WA","S","GR from Production","COGS - FG production credit",       "BATCH","System Batch","SYSTEM","System Batch"),
]

gl_df = pd.DataFrame(je_rows)

# ─────────────────────────────────────────────────────────────────────────────
# 3. CHART OF ACCOUNTS (COA)
# ─────────────────────────────────────────────────────────────────────────────
coa_rows = []
for acct in ACCOUNTS:
    (acct_no, desc, fs_cat, fs_subtotal, fs_line, fs_type,
     grp1_num, grp1, fs_line_num, _) = acct
    coa_rows.append({
        "chart_of_accounts":                  CHART_OF_ACCTS,
        "entity_id":                          ENTITY_ID,
        "entity_name":                        ENTITY_NAME,
        "account_number":                     acct_no,
        "account_description":                desc,
        "account_grouping_1_num":             grp1_num,
        "account_grouping_1":                 grp1,
        "financial_statement_line_num":       fs_line_num,
        "financial_statement_line":           fs_line,
        "financial_statement_subtotal_category": fs_subtotal,
        "financial_statement_category":       fs_cat,
        "financial_statement_type":           fs_type,
        "revision_date":                      "03/31/2026",
    })

coa_df = pd.DataFrame(coa_rows)

# ─────────────────────────────────────────────────────────────────────────────
# Save Single Workbook JET_Input.xlsx (TB, Population, COA)
# ─────────────────────────────────────────────────────────────────────────────
with pd.ExcelWriter(out_xlsx_path, engine='openpyxl') as writer:
    tb_df.to_excel(writer, sheet_name='TB', index=False)
    gl_df.to_excel(writer, sheet_name='Population', index=False)
    coa_df.to_excel(writer, sheet_name='COA', index=False)

# Also save standalone CSVs for flexibility
tb_df.to_csv(os.path.join(omnia_dir, 'TB.csv'), index=False)
gl_df.to_csv(os.path.join(omnia_dir, 'Population.csv'), index=False)
coa_df.to_csv(os.path.join(omnia_dir, 'COA.csv'), index=False)

print(f"\nOmnia JET sample data generated successfully:")
print(f"  Workbook : {out_xlsx_path}")
print(f"  TB       : {len(tb_df)} accounts (single sheet with Opening & Closing Balance)")
print(f"  GL (Pop) : {len(gl_df)} JE lines ({len(gl_df)//2} balanced entries)")
print(f"  COA      : {len(coa_df)} accounts")
