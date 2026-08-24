import os
import sys
import json
import re
import datetime
import math
import random
import pandas as pd
import numpy as np

def clean_str(val):
    if pd.isna(val) or val is None:
        return ""
    return str(val).strip()

def parse_num(val, dec_sep="Period"):
    if pd.isna(val) or val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val) if not math.isnan(val) else 0.0
    s = str(val).strip()
    if not s or s == '-' or s.lower() in ('na', 'n/a', 'null'):
        return 0.0
    is_neg = False
    if s.startswith('(') and s.endswith(')'):
        is_neg = True
        s = s[1:-1].strip()
    elif s.startswith('-') or s.endswith('-'):
        is_neg = True
        s = s.replace('-', '').strip()
    
    s = re.sub(r'[^0-9.,]', '', s)
    if dec_sep == "Comma":
        s = s.replace('.', '').replace(',', '.')
    else:
        s = s.replace(',', '')
    try:
        n = float(s)
        return -n if is_neg else n
    except:
        return 0.0

def parse_date_str(val):
    if pd.isna(val) or val is None:
        return ""
    if isinstance(val, (datetime.datetime, datetime.date, pd.Timestamp)):
        return val.strftime('%d-%b-%y')
    s = str(val).strip()
    if not s or s == '-' or s.lower() in ('na', 'n/a', 'null'):
        return ""
    
    # Try parsing common formats
    for fmt in ('%d-%b-%y', '%d-%b-%Y', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d', '%Y%m%d', '%d-%b-%y'):
        try:
            d = datetime.datetime.strptime(s, fmt)
            return d.strftime('%d-%b-%y')
        except:
            pass
    try:
        d = pd.to_datetime(s)
        return d.strftime('%d-%b-%y')
    except:
        return s

def date_to_iso(val):
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (datetime.datetime, datetime.date, pd.Timestamp)):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    for fmt in ('%d-%b-%y', '%d-%b-%Y', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d', '%Y%m%d', '%m-%d-%Y'):
        try:
            d = datetime.datetime.strptime(s, fmt)
            return d.strftime('%Y-%m-%d')
        except:
            pass
    try:
        d = pd.to_datetime(s)
        return d.strftime('%Y-%m-%d')
    except:
        return None

def parse_date_obj(val):
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, datetime.datetime):
        return val.date()
    if isinstance(val, datetime.date):
        return val
    if isinstance(val, pd.Timestamp):
        return val.to_pydatetime().date()
    s = str(val).strip()
    if not s or s == '-' or s.lower() in ('na', 'n/a', 'null'):
        return None
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%d-%b-%y', '%d-%b-%Y', '%d-%m-%Y', '%Y%m%d', '%m-%d-%Y'):
        try:
            return datetime.datetime.strptime(s, fmt).date()
        except:
            pass
    try:
        return pd.to_datetime(s).date()
    except:
        return None

def log_event(run_id, stage, progress, message, log_file=None):
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f"{ts} | {run_id} | INFO  | {stage.ljust(15)} | {message}"
    print(f"__PROGRESS__{json.dumps({'stage': stage, 'progress': progress, 'message': message, 'timestamp': ts})}", flush=True)
    if log_file and os.path.exists(os.path.dirname(log_file)):
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(line + "\n")
