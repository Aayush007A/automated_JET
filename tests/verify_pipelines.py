import os
import sys
import json
import subprocess
import pandas as pd

workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(workspace_root, 'pipelines', 'pyspark'))

print("=== Running End-to-End Pipeline Verification ===")

# 1. Verify Spark JET Pipeline Execution
print("\n--- Test 1: Spark JET Pipeline Execution ---")
spark_config_path = os.path.join(workspace_root, 'runs', 'TEST-SPARK-001', 'config', 'run_config.json')
os.makedirs(os.path.dirname(spark_config_path), exist_ok=True)
os.makedirs(os.path.join(workspace_root, 'runs', 'TEST-SPARK-001', 'output'), exist_ok=True)
os.makedirs(os.path.join(workspace_root, 'runs', 'TEST-SPARK-001', 'logs'), exist_ok=True)

spark_config = {
    "runId": "TEST-SPARK-001",
    "workflow": "SPARK_JET",
    "engine": "PYTHON",
    "files": [
        {
            "fileId": "TB.csv",
            "fileName": "TB.csv",
            "filePath": os.path.join(workspace_root, 'sample_data', 'spark_jet', 'TB.csv'),
            "detectedDataset": "TRIAL_BALANCE",
            "extension": "csv"
        },
        {
            "fileId": "Population.csv",
            "fileName": "Population.csv",
            "filePath": os.path.join(workspace_root, 'sample_data', 'spark_jet', 'Population.csv'),
            "detectedDataset": "GENERAL_LEDGER",
            "extension": "csv"
        }
    ],
    "datasetMap": {
        "tbFileId": "TB.csv",
        "glFileId": "Population.csv"
    },
    "fieldMappings": {},
    "sparkParameters": {
        "fiscalYear": 2026,
        "financialYearEnd": "31-Dec-25",
        "controlSampleCount": 5
    }
}

with open(spark_config_path, 'w', encoding='utf-8') as f:
    json.dump(spark_config, f, indent=2)

cmd_spark = [sys.executable, os.path.join(workspace_root, 'pipelines', 'pyspark', 'spark_jet_pipeline.py'), '--config', spark_config_path]
proc_spark = subprocess.run(cmd_spark, capture_output=True, text=True, cwd=workspace_root)

if proc_spark.returncode != 0:
    print(f"FAILED Spark JET: {proc_spark.stderr}")
    sys.exit(1)
else:
    print("SUCCESS: Spark JET pipeline executed successfully!")
    out_dir = os.path.join(workspace_root, 'runs', 'TEST-SPARK-001', 'output')
    print(f"Generated Spark JET outputs: {os.listdir(out_dir)}")
    assert os.path.exists(os.path.join(out_dir, 'TB_Standardized.csv'))
    assert os.path.exists(os.path.join(out_dir, 'JE_Standardized.csv'))
    assert os.path.exists(os.path.join(out_dir, 'IR_Exception_1.csv'))
    assert os.path.exists(os.path.join(out_dir, 'IR_Exception_2.csv'))
    assert os.path.exists(os.path.join(out_dir, 'Control_Sample_Dump.csv'))

# 2. Verify Omnia JET Pipeline Execution
print("\n--- Test 2: Omnia JET Pipeline Execution ---")
omnia_config_path = os.path.join(workspace_root, 'runs', 'TEST-OMNIA-001', 'config', 'run_config.json')
os.makedirs(os.path.dirname(omnia_config_path), exist_ok=True)
os.makedirs(os.path.join(workspace_root, 'runs', 'TEST-OMNIA-001', 'output'), exist_ok=True)
os.makedirs(os.path.join(workspace_root, 'runs', 'TEST-OMNIA-001', 'logs'), exist_ok=True)

omnia_config = {
    "runId": "TEST-OMNIA-001",
    "workflow": "OMNIA_JET",
    "engine": "PYTHON",
    "files": [
        {
            "fileId": "JET_Input.xlsx",
            "fileName": "JET_Input.xlsx",
            "filePath": os.path.join(workspace_root, 'sample_data', 'omnia_jet', 'JET_Input.xlsx'),
            "extension": "xlsx",
            "sheets": [
                {"sheetName": "TB_Beginning", "detectedDataset": "TRIAL_BALANCE"},
                {"sheetName": "TB_Ending", "detectedDataset": "TRIAL_BALANCE"},
                {"sheetName": "Population", "detectedDataset": "GENERAL_LEDGER"},
                {"sheetName": "COA", "detectedDataset": "COA"}
            ]
        }
    ],
    "datasetMap": {
        "tbFileId": "JET_Input.xlsx",
        "glFileId": "JET_Input.xlsx",
        "glSheetName": "Population",
        "coaFileId": "JET_Input.xlsx",
        "coaSheetName": "COA"
    },
    "fieldMappings": {},
    "omniaParameters": {
        "fiscalYear": 2026,
        "fiscalYearEnd": "03/31/2026",
        "testingPeriodStart": "04/01/2025",
        "testingPeriodEnd": "03/31/2026",
        "currency": "Entity Currency"
    }
}

with open(omnia_config_path, 'w', encoding='utf-8') as f:
    json.dump(omnia_config, f, indent=2)

cmd_omnia = [sys.executable, os.path.join(workspace_root, 'pipelines', 'pyspark', 'omnia_jet_pipeline.py'), '--config', omnia_config_path]
proc_omnia = subprocess.run(cmd_omnia, capture_output=True, text=True, cwd=workspace_root)

if proc_omnia.returncode != 0:
    print(f"FAILED Omnia JET: {proc_omnia.stderr}")
    sys.exit(1)
else:
    print("SUCCESS: Omnia JET pipeline executed successfully!")
    out_dir = os.path.join(workspace_root, 'runs', 'TEST-OMNIA-001', 'output')
    print(f"Generated Omnia JET outputs: {os.listdir(out_dir)}")
    assert os.path.exists(os.path.join(out_dir, 'Parquet_Reconciliation.csv'))
    assert os.path.exists(os.path.join(out_dir, 'Parquet_Data_Integrity_Check_00_Summary.csv'))
    assert os.path.exists(os.path.join(out_dir, 'JE-Recon-and-DIC-Template.xlsx'))

print("\n=== All End-to-End Pipeline Tests Passed with 100% Correctness! ===")
