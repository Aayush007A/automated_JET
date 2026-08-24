import os
import pandas as pd
import numpy as np
import openpyxl

base_dir = os.path.dirname(os.path.abspath(__file__))
spark_dir = os.path.join(base_dir, 'spark_jet')
omnia_dir = os.path.join(base_dir, 'omnia_jet')
os.makedirs(spark_dir, exist_ok=True)
os.makedirs(omnia_dir, exist_ok=True)

# 1. Spark JET Trial Balance
tb_data = [
    {"G/L": "1009", "Description": "ZeroBal Fund Trf", "Account Subtype": "Assets", "FS Line Item": "Control Account", "Opening Balance": 0.0, "Debit": 0.0, "Credit": 0.0, "Closing Balance": 0.0},
    {"G/L": "1012", "Description": "Zero Bal Others", "Account Subtype": "Assets", "FS Line Item": "Control Account", "Opening Balance": 0.0, "Debit": 160413148.0, "Credit": 160413148.0, "Closing Balance": 0.0},
    {"G/L": "1000001", "Description": "Eq.Sh.Cap-Rs.10", "Account Subtype": "Liabilities", "FS Line Item": "Share Capital", "Opening Balance": -1172000000.0, "Debit": 0.0, "Credit": 0.0, "Closing Balance": -1172000000.0},
    {"G/L": "1081001", "Description": "Preference Share Cap", "Account Subtype": "Liabilities", "FS Line Item": "Preference Share Capital", "Opening Balance": 0.0, "Debit": 0.0, "Credit": 0.0, "Closing Balance": 0.0},
    {"G/L": "1130001", "Description": "Share Premium - Equi", "Account Subtype": "Liabilities", "FS Line Item": "Securities Premium", "Opening Balance": 0.0, "Debit": 0.0, "Credit": 0.0, "Closing Balance": 0.0},
    {"G/L": "1160001", "Description": "Profit And Loss A/c", "Account Subtype": "Liabilities", "FS Line Item": "Retained Earnings", "Opening Balance": -32516305.0, "Debit": 0.0, "Credit": 0.0, "Closing Balance": -32516305.0},
    {"G/L": "11401000", "Description": "Trade Receivables Dom", "Account Subtype": "Assets", "FS Line Item": "Trade Receivables", "Opening Balance": 15000000.0, "Debit": 2138201.0, "Credit": 0.0, "Closing Balance": 17138201.0},
    {"G/L": "11202200", "Description": "Cost of Sales Material", "Account Subtype": "Expenses", "FS Line Item": "COST OF SALES AND SERVICES", "Opening Balance": 0.0, "Debit": 0.0, "Credit": 1812035.0, "Closing Balance": -1812035.0},
    {"G/L": "21302630", "Description": "Output GST Clearing", "Account Subtype": "Liabilities", "FS Line Item": "Other Payables", "Opening Balance": 0.0, "Debit": 0.0, "Credit": 326166.0, "Closing Balance": -326166.0},
    {"G/L": "41001400", "Description": "Sales - Domestic", "Account Subtype": "Revenue", "FS Line Item": "NET SALES REVENUE", "Opening Balance": -4295306840.0, "Debit": 500000.0, "Credit": 1049132300.0, "Closing Balance": -5343939140.0},
    {"G/L": "51001000", "Description": "Plant & Machinery", "Account Subtype": "Assets", "FS Line Item": "Property, plant and equipment", "Opening Balance": 5484823145.0, "Debit": 0.0, "Credit": 0.0, "Closing Balance": 5484823145.0},
    {"G/L": "3500001", "Description": "Trade Payables - Dom", "Account Subtype": "Liabilities", "FS Line Item": "Trade Payables", "Opening Balance": -3164019.0, "Debit": 55410257.0, "Credit": 103457461.0, "Closing Balance": -51211223.0},
    {"G/L": "52002500", "Description": "Consultancy & Audit Fee", "Account Subtype": "Expenses", "FS Line Item": "General and administrative expenses", "Opening Balance": 2500000.0, "Debit": 3500000.0, "Credit": 0.0, "Closing Balance": 6000000.0}
]
tb_df = pd.DataFrame(tb_data)
tb_df.to_csv(os.path.join(spark_dir, 'TB.csv'), index=False)

# 2. Spark JET Population / GL Dump
je_data = [
    {"GL Account": "11401000", "Accounting document": "2500007294", "Document type": "RV", "Accounting date": "03-Nov-25", "Posting date": "03-Nov-25", "Document date": "03-Nov-25", "Amount in local currency": "1339512.0", "Currency code": "INR", "Text Header": "Invoice Posting", "Text Details": "Normal sales batch", "User UD": "SATPUTD"},
    {"GL Account": "11202200", "Accounting document": "2500007294", "Document type": "RV", "Accounting date": "03-Nov-25", "Posting date": "03-Nov-25", "Document date": "03-Nov-25", "Amount in local currency": "-1135180.0", "Currency code": "INR", "Text Header": "Invoice Posting", "Text Details": "Normal sales batch", "User UD": "SATPUTD"},
    {"GL Account": "21302630", "Accounting document": "2500007294", "Document type": "RV", "Accounting date": "03-Nov-25", "Posting date": "03-Nov-25", "Document date": "03-Nov-25", "Amount in local currency": "-204332.0", "Currency code": "INR", "Text Header": "Invoice Posting", "Text Details": "Normal sales batch", "User UD": "SATPUTD"},
    
    {"GL Account": "11401000", "Accounting document": "2500007295", "Document type": "RV", "Accounting date": "03-Nov-25", "Posting date": "03-Nov-25", "Document date": "03-Nov-25", "Amount in local currency": "798689.0", "Currency code": "INR", "Text Header": "Invoice Posting", "Text Details": "Standard billing", "User UD": "SATPUTD"},
    {"GL Account": "11202200", "Accounting document": "2500007295", "Document type": "RV", "Accounting date": "03-Nov-25", "Posting date": "03-Nov-25", "Document date": "03-Nov-25", "Amount in local currency": "-676855.0", "Currency code": "INR", "Text Header": "Invoice Posting", "Text Details": "Standard billing", "User UD": "SATPUTD"},
    {"GL Account": "21302630", "Accounting document": "2500007295", "Document type": "RV", "Accounting date": "03-Nov-25", "Posting date": "03-Nov-25", "Document date": "03-Nov-25", "Amount in local currency": "-121834.0", "Currency code": "INR", "Text Header": "Invoice Posting", "Text Details": "Standard billing", "User UD": "SATPUTD"},
    
    {"GL Account": "41001400", "Accounting document": "2000001001", "Document type": "AB", "Accounting date": "31-Dec-25", "Posting date": "31-Dec-25", "Document date": "31-Dec-25", "Amount in local currency": "500000.0", "Currency code": "INR", "Text Header": "Auditor adjustment", "Text Details": "Adjustment entry to revenue", "User UD": "SBPATIL"},
    {"GL Account": "3500001", "Accounting document": "2000001001", "Document type": "AB", "Accounting date": "31-Dec-25", "Posting date": "31-Dec-25", "Document date": "31-Dec-25", "Amount in local currency": "-500000.0", "Currency code": "INR", "Text Header": "Auditor adjustment", "Text Details": "Adjustment entry to trade payables", "User UD": "SBPATIL"},

    {"GL Account": "1009", "Accounting document": "2000001002", "Document type": "SA", "Accounting date": "05-Nov-25", "Posting date": "05-Nov-25", "Document date": "05-Nov-25", "Amount in local currency": "1000000.0", "Currency code": "INR", "Text Header": "Fund Transfer", "Text Details": "Unusual zero balance clearing", "User UD": "OCPL-PRASHAN"},
    {"GL Account": "52002500", "Accounting document": "2000001002", "Document type": "SA", "Accounting date": "05-Nov-25", "Posting date": "05-Nov-25", "Document date": "05-Nov-25", "Amount in local currency": "-1000000.0", "Currency code": "INR", "Text Header": "Fund Transfer", "Text Details": "Consultancy charge", "User UD": "OCPL-PRASHAN"}
]
gl_df = pd.DataFrame(je_data)
gl_df.to_csv(os.path.join(spark_dir, 'Population.csv'), index=False)

# 3. Omnia JET Multi-Sheet XLSX
with pd.ExcelWriter(os.path.join(omnia_dir, 'JET_Input.xlsx'), engine='openpyxl') as writer:
    tb_df.to_excel(writer, sheet_name='TB', index=False)
    gl_df.to_excel(writer, sheet_name='Population', index=False)
    
    coa_data = [
        {"Chart of Accounts": "DEFAULT", "Account Number": "1009", "Description": "ZeroBal Fund Trf", "Financial Statement Category": "Assets", "FS Line Item": "Control Account", "Account Grouping 1": "Cash"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "1012", "Description": "Zero Bal Others", "Financial Statement Category": "Assets", "FS Line Item": "Control Account", "Account Grouping 1": "Cash"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "1000001", "Description": "Eq.Sh.Cap-Rs.10", "Financial Statement Category": "Liabilities", "FS Line Item": "Share Capital", "Account Grouping 1": "Equity"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "11401000", "Description": "Trade Receivables Dom", "Financial Statement Category": "Assets", "FS Line Item": "Trade Receivables", "Account Grouping 1": "Receivables"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "11202200", "Description": "Cost of Sales Material", "Financial Statement Category": "Expenses", "FS Line Item": "COST OF SALES AND SERVICES", "Account Grouping 1": "COGS"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "21302630", "Description": "Output GST Clearing", "Financial Statement Category": "Liabilities", "FS Line Item": "Other Payables", "Account Grouping 1": "Payables"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "41001400", "Description": "Sales - Domestic", "Financial Statement Category": "Revenue", "FS Line Item": "NET SALES REVENUE", "Account Grouping 1": "Revenue"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "51001000", "Description": "Plant & Machinery", "Financial Statement Category": "Assets", "FS Line Item": "Property, plant and equipment", "Account Grouping 1": "PPE"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "3500001", "Description": "Trade Payables - Dom", "Financial Statement Category": "Liabilities", "FS Line Item": "Trade Payables", "Account Grouping 1": "Payables"},
        {"Chart of Accounts": "DEFAULT", "Account Number": "52002500", "Description": "Consultancy & Audit Fee", "Financial Statement Category": "Expenses", "FS Line Item": "General and administrative expenses", "Account Grouping 1": "Admin"}
    ]
    coa_df = pd.DataFrame(coa_data)
    coa_df.to_excel(writer, sheet_name='COA', index=False)

print("Sample datasets generated successfully.")
