# Deloitte Journal Entry Testing (JET) Automation Platform

An enterprise-grade, full-stack audit analytics platform designed to automate Journal Entry Testing workflows:
1. **SPARK JET Workflow** (TB/GL preparation, Checkpoint validation, Integrity Testing IR 1–4, Parameter Testing Ex1 to Ex12, Control Sample Dump, and standardized exports).
2. **OMNIA JET Workflow** (Common Data Model preparation, Account-level Reconciliation in Entity & Group Currencies with $\le 1.0$ tolerance, 20 Data Quality Checks / DQC Golden Checks Matrix, Control Totals, JE Stratification, and multi-sheet Excel Workbook `JE-Recon-and-DIC-Template.xlsx`).

---

## Key Highlights & Architectural Features

- **No External Database Dependency**: State is stored directly on the file system in isolated run folders (`runs/<runId>/input/`, `config/`, `output/`, `logs/`, `status.json`).
- **Structured TXT Logging**: Audit-grade logs saved per run in `runs/<runId>/logs/execution.txt` and daily in `logs/application-YYYY-MM-DD.txt` following the format: `TIMESTAMP | RUN_ID | LEVEL | COMPONENT | MESSAGE`.
- **Dual Pipeline Engine**: High-performance Python engine (`pandas`/`openpyxl`/`pyarrow`) running locally out-of-the-box, alongside PySpark scripts and Scala Spark (`sbt`) scaffolding.
- **Intelligent File & Sheet Detection**: Automatic header and signature classification for Trial Balance, General Ledger / Population, Chart of Accounts, Fiscal Calendar, and Input Parameters with confidence scores.
- **Smart 4-Tier Field Mapping Engine**: Exact match, Normalized match, Alias dictionary, and Levenshtein fuzzy distance matching with interactive override controls.
- **Real-Time Progress Streaming**: Server-Sent Events (SSE) broadcasting live stage progression, percentages, and logs to the browser.
- **Enterprise Deloitte UI**: Deep Charcoal & Deloitte Green palette (`#86BC25`, `#007680`), glassmorphism, responsive desktop-first layout, interactive tables, and one-click ZIP / Excel exports.

---

## System Architecture

```
                               ┌────────────────────────────────────────────────┐
                               │   React 18 + Vite + TypeScript Frontend UI     │
                               └───────────────────────┬────────────────────────┘
                                                       │ REST API / SSE Events
                                                       ▼
                               ┌────────────────────────────────────────────────┐
                               │     Node.js + Express + TypeScript Backend     │
                               │                                                │
                               │  • AuthService (JWT, users.json)               │
                               │  • FileDetector & Smart FieldMapper            │
                               │  • DataNormalizer (Parentheses Negatives, etc) │
                               │  • RunManager (File-System State in runs/)     │
                               │  • LogService (Structured TXT logging)         │
                               │  • OutputService (ZIP & Excel Downloads)       │
                               └───────────────────────┬────────────────────────┘
                                                       │ child_process (JSON IPC)
                                                       ▼
                               ┌────────────────────────────────────────────────┐
                               │            Data Processing Pipelines           │
                               │                                                │
                               │  ┌──────────────────┐    ┌──────────────────┐  │
                               │  │    SPARK JET     │    │    OMNIA JET     │  │
                               │  │ • TB Checkpoints │    │ • CDM Prep & Map │  │
                               │  │ • GL Pivot Bal   │    │ • Currency Recon │  │
                               │  │ • IR Tests 1-4   │    │ • 20 DQC Matrix  │  │
                               │  │ • Ex1 - Ex12     │    │ • Control Totals │  │
                               │  │ • Sample Dump    │    │ • Excel Workbook │  │
                               │  └──────────────────┘    └──────────────────┘  │
                               └────────────────────────────────────────────────┘
```

---

## Prerequisites

- **Node.js**: `v18.x` or higher (tested on `v22.17.0`)
- **npm**: `v9.x` or higher (tested on `11.16.0`)
- **Python**: `3.9+` (tested on `3.11.5`)
- **Python Libraries**: `pandas`, `openpyxl`, `numpy` (and optionally `pyspark`, `pyarrow`)
- **Java / Scala (Optional for Scala Spark Mode)**: Java 8/11 and Scala 2.12 with sbt

---

## Installation & Setup

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Generate Realistic Test Datasets (Optional)
To generate realistic sample files for instant testing:
```bash
python sample_data/generate_samples.py
```
This produces:
- `sample_data/spark_jet/TB.csv`
- `sample_data/spark_jet/Population.csv`
- `sample_data/omnia_jet/JET_Input.xlsx` (Multi-sheet workbook with TB, Population, COA)

---

## Running the Application

### Development Mode

**Start Backend Server** (Port `5000`):
```bash
cd backend
npm run dev
```

**Start Frontend Development Server** (Port `5173`):
```bash
cd frontend
npm run dev
```

Open your browser at: **`http://localhost:5173`**

### Pre-configured Login Accounts
| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin` | `Admin2026` | `admin` | Audit Engagement Lead |
| `user` | `User2026` | `user` | JET Senior Practitioner |

---

## Testing & Verification

### Run Backend Unit Tests (Jest)
```bash
cd backend
npm test
```
*Validates AuthService, FileDetector, FieldMapper 4-tier engine, DataNormalizer, and RunManager.*

### Run End-to-End Pipeline Verification
```bash
python tests/verify_pipelines.py
```
*Executes both Spark JET and Omnia JET pipelines, verifies all 20 Spark artifacts and all 13 Omnia artifacts (including `JE-Recon-and-DIC-Template.xlsx`).*

---

## Workflow Details

### 1. SPARK JET Workflow
1. **TB Checkpoints**:
   - G/L and Description non-blank validation.
   - Account Subtype verification (`Assets`, `Liabilities`, `Revenue`/`Income`, `Expenses`, `Equity`).
   - Debit vs Credit consistency.
   - Total Column Sum of Opening and Closing Balances.
2. **GL Population Checkpoints**:
   - Document balancing: for each document number, verifies $\sum \text{Amount} = 0.0$ and classifies as `BALANCED` or `UNBALANCED`.
3. **Integrity Testing (IR 1–4)**:
   - **IR 1**: GL in TB but not in Population (`IR_Exception_1.csv`).
   - **IR 2**: GL Activity in Population vs TB Activity (`IR_Exception_2.csv`). Flags exceptions if activity is zero with balance change or difference $> 1.0$.
   - **IR 3**: GL in Population but not in TB (`IR_Exception_3.csv`).
   - **IR 4**: Transaction frequency count per GL (`Parameter_2_Seldom_Accounts_Inputs.csv`).
4. **Parameter Exception Testing (Ex1 to Ex12)**:
   - **Ex1**: Entries to Unusual Accounts.
   - **Ex2**: Entries to Seldom-based Accounts.
   - **Ex3**: Large Debits to Revenue/Income.
   - **Ex4**: Users with few postings.
   - **Ex5**: Users of Interest.
   - **Ex6**: Closing Entries around fiscal year end.
   - **Ex7**: Entries posted on Dates of Interest.
   - **Ex8**: Entries with round amounts or recurring ending digits.
   - **Ex9**: Duplicate entries (identical GL + Amount combo).
   - **Ex10**: Entries containing suspicious keywords.
   - **Ex11**: Entries posted after closing date cutoff.
   - **Ex12**: Entries with unrelated account pairings (e.g. Trade Receivables & COGS).
5. **Control Sample Dump**:
   - Reproducible random sampling (seed 42) of specified count of distinct document numbers.

---

### 2. OMNIA JET Workflow
1. **CDM Ingestion & Normalization**:
   - Multi-sheet workbook (`JET_Input.xlsx`) or separate CSV/TXT files.
   - Date standardizations, numeric parsing, Indian & European decimal handling, and debit/credit splitting.
2. **Account Reconciliation**:
   - Reconciles Trial Balance balances with Journal Entry activities by `entity_id` and `account_number`.
   - Formula: $\text{Variance} = \text{Ending Balance} - \text{Beginning Balance} - \text{JE Activity}$.
   - Classification: `Reconciled` if $\text{abs(Variance)} \le 1.0$, else `Unreconciled`.
3. **All 20 Data Quality Checks (DQC Golden Checks)**:
   - `01a-e`: Critical Blank Values in COA, TB, JE, User ID, Transaction Type.
   - `02a-b`: Accounts in TB or JE not found in COA.
   - `03a-b`: Excess Digit / Precision Overflow in TB or JE.
   - `04a-b`: Duplicate Account Numbers in COA or TB.
   - `05-06`: Unknown or Mixed Standard / Non-Standard Classifications.
   - `07`: Unknown Financial Statement Categories in COA.
   - `08`: Multi-line Journal Entries not netting to zero.
   - `09`: One-Line Journal Entries.
   - `10`: Inconsistent Net Amount vs Debit/Credit calculation.
   - `11`: Journal lines with simultaneous Debit and Credit amounts.
   - `12`: Currency net amount inconsistencies.
   - `13a-b`: Multiple currencies per entity or multiple group currencies.
   - `14`: Entries with multiple effective or posting dates.
   - `15`: Entries with multiple transaction types.
   - `16`: Entries posted outside the testing period window.
   - `17`: Entries with multiple User IDs.
   - `18`: Entries with multiple header descriptions.
   - `19`: Transaction types not netting to zero.
   - `20`: User IDs mapped to multiple user names.
4. **Control Totals & Stratification**:
   - Summaries grouped by Period, Standard/Non-Standard, Currency, Transaction Type, and User.
   - Journal Line Stratification (1, 2–20, 21–100, 101–1000, >1000 lines).
5. **Excel Template Generation**:
   - Automated creation of styled `JE-Recon-and-DIC-Template.xlsx` with Deloitte branding.

---

## How to Extend the Platform

### Adding a New Workflow
1. Register workflow identifier in `backend/src/types/index.ts` and `frontend/src/types/index.ts`.
2. Create dedicated pipeline runner in `pipelines/pyspark/<new_workflow>_pipeline.py`.
3. Add workflow dispatcher in `backend/src/executors/pipelineExecutor.ts`.
4. Create frontend wizard screen under `frontend/src/pages/<NewWorkflow>/`.
5. Register route in `frontend/src/App.tsx`.

### Adding a New DQC Check
1. In `pipelines/pyspark/omnia_jet_pipeline.py`, add evaluation logic under `# 5. DATA INTEGRITY CHECKS`.
2. Append check record to `dqc_results` with `check`, `desc`, `type` (`Error` / `Warning` / `Observation`), `capability`, `affected_je`, `affected_lines`.
3. The check will automatically appear in the DQC Summary table and the generated Excel workbook.

---

## Environment Variables Reference (`.env`)

```ini
PORT=5000
NODE_ENV=development
JWT_SECRET=jet_secret_key_deloitte_2026_enterprise_audit_platform_token

# Storage Directories
UPLOAD_DIR=uploads
RUN_DIR=runs
LOG_DIR=logs
OUTPUT_DIR=outputs
CONFIG_DIR=config

# Pipeline Engine
SPARK_MODE=LOCAL
PYSPARK_COMMAND=python
SPARK_SUBMIT_COMMAND=spark-submit
SCALA_SPARK_JAR=pipelines/scala/target/scala-2.12/jet-pipeline_2.12-1.0.jar
SCALA_MAIN_CLASS=com.deloitte.jet.SparkJETPipeline

MAX_UPLOAD_SIZE_MB=500
```
