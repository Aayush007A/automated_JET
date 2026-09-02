import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ActivePageContext {
  route?: string;
  pageTitle?: string;
  currentStep?: number;
  totalSteps?: number;
  stepTitle?: string;
  stepDescription?: string;
  actionGuidance?: string;
  activeTab?: string;
  metadata?: Record<string, any>;
}

export interface AiResponse {
  message: string;
  guardrailTriggered: boolean;
  guardrailReason?: string;
}

class AiAssistantService {
  private localAiServerUrl = 'http://127.0.0.1:5005/chat';

  // Strictly permitted domain terms: Automated JET, General Ledger audit testing, tests 1-12, EDA
  private allowedDomainKeywords: string[] = [
    'jet', 'journal', 'ledger', 'entry', 'entries', 'gl', 'posting', 'debit', 'credit',
    'balance', 'account', 'accounts', 'transaction', 'transactions', 'audit', 'auditor',
    'materiality', 'threshold', 'spark', 'test', 'tests', 'cutoff', 'post-closing',
    'seldom', 'dormant', 'unusual', 'keyword', 'keywords', 'narration', 'regex', 'round',
    'duplicate', 'duplicates', 'backdated', 'out-of-period', 'weekend', 'holiday',
    'revenue', 'monitored', 'user', 'users', 'preparer', 'benford', 'benford\'s', 'first-digit',
    'chi-square', 'mad', 'population', 'funnel', 'sample', 'control', 'risk', 'high-risk',
    'medium-risk', 'low-risk', 'eda', 'visualizer', 'distribution', 'health', 'univariate',
    'multivariate', 'scatter', 'polar', 'radar', 'export', 'csv', 'excel', 'upload', 'clean',
    'auto-clean', 'null', 'missing', 'column', 'dataset', 'parsenum', 'format', 'date', 'fiscal',
    'deloitte', 'platform', 'feature', 'features', 'help', 'guide', 'how to', 'step', 'overview',
    'beginning_balance', 'ending_balance', 'currency', 'formula', 'variance', 'prior', 'baseline',
    'mapping', 'cdm', 'canonical', 'trial balance', 'chart of accounts', 'workpaper', 'reconciliation',
    'current step', 'what do i do', 'next step', 'where am i', 'what is this step', 'how do i', 'explain this',
    'question', 'questions', 'sample', 'sample questions', 'prompts', '/questions', '/help', '/prompts', 'catalog', 'inquiries'
  ];

  // Strictly prohibited off-topic indicators
  private prohibitedTopics: RegExp[] = [
    /\b(weather|temperature\s+outside|forecast|rain|sunny)\b/i,
    /\b(recipe|cook|baking|cake|pizza|burger|pasta|food)\b/i,
    /\b(movie|cinema|actor|actress|hollywood|netflix|song|music|singer|album)\b/i,
    /\b(politics|election|president|democrat|republican|prime\s+minister|war|military)\b/i,
    /\b(cricket|football|soccer|nba|nfl|baseball|ipl|tennis|olympics)\b/i,
    /\b(dating|relationship|love|horoscope|astrology|zodiac)\b/i,
    /\b(joke|riddle|funny\s+story|tell\s+me\s+a\s+joke)\b/i,
    /\b(write\s+a\s+poem|lyrics|haiku|story\s+about)\b/i,
    /\b(bitcoin|crypto|ethereum|doge|nft|buy\s+stocks)\b/i,
    /\b(ignore\s+all\s+previous\s+instructions|pretend\s+you\s+are|jailbreak|dan\s+mode)\b/i,
  ];

  // ── Guardrail Validator ─────────────────────────────────────────────
  public checkGuardrails(userQuery: string): { allowed: boolean; reason?: string } {
    const trimmed = userQuery.trim().toLowerCase();

    for (const pattern of this.prohibitedTopics) {
      if (pattern.test(trimmed)) {
        return { allowed: false, reason: 'PROHIBITED_OFF_TOPIC' };
      }
    }

    if (trimmed.includes('system prompt') || trimmed.includes('ignore previous') || trimmed.includes('developer instructions')) {
      return { allowed: false, reason: 'PROMPT_INJECTION_ATTEMPT' };
    }

    const matchedKeywords = this.allowedDomainKeywords.filter((kw) => trimmed.includes(kw));

    if (matchedKeywords.length === 0 && trimmed.length > 8) {
      if (/^(hi|hello|hey|greetings|who\s+are\s+you|what\s+can\s+you\s+do)/i.test(trimmed)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'OUT_OF_DOMAIN_SCOPE' };
    }

    return { allowed: true };
  }

  // ── Sanitizer: Strictly strip "Omnia" and casual emojis ─────────────
  private sanitizeText(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/omnia/gi, 'Deloitte JET')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  }

  // ── Dispatch to Real Local Neural Model (Qwen2.5 on Port 5005) ──────
  private async queryLocalNeuralModel(messages: AiMessage[], context?: ActivePageContext): Promise<string> {
    const url = new URL(this.localAiServerUrl);
    const payload = JSON.stringify({
      messages,
      context: context || {},
    });

    return new Promise<string>((resolve, reject) => {
      const req = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 18000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.message) {
                resolve(this.sanitizeText(parsed.message));
              } else {
                reject(new Error('Invalid response from local AI microservice'));
              }
            } catch (e: any) {
              reject(e);
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Local AI server request timed out'));
      });

      req.write(payload);
      req.end();
    });
  }

  // ── Dynamic Step-Aware Knowledge Engine (Ultra-Reliable Fallback) ──
  private generateStepAwareResponse(userQuery: string, context?: ActivePageContext): string {
    const q = userQuery.toLowerCase().trim();

    // 0. Sample Questions / Prompt Catalog Command
    if (q === '/questions' || q === '/help' || q === '/prompts' || q.includes('sample question') || q.includes('prompt catalog') || q.includes('all questions') || q.includes('what questions')) {
      return `### Deloitte JET AI Prompt Catalog

Explore categorized inquiries across the platform. Click any question below to ask immediately:

#### 1. Workflow & Current Step Guidance
[ASK: What is this current step all about and what do I need to do?]
[ASK: What file formats and schemas can I upload on Step 1?]
[ASK: What are the 16 mandatory auto-cleansing rules on Step 3?]
[ASK: What canonical CDM fields must be mapped on Step 4?]
[ASK: How do I review the summary reconciliation on Step 6?]

#### 2. Audit Risk Tests (01 to 12)
[ASK: Explain Test 2 Suspect Keywords regex scanning and logic]
[ASK: What does Test 3 Post-Closing Cutoff window measure?]
[ASK: Explain Test 4 Unusual Accounts and conflicting pairings]
[ASK: What are Test 8 Debits to Revenue Accounts?]
[ASK: What are Test 9 Monitored and Rare Users?]

#### 3. Forensic Mathematics & Benford Analysis
[ASK: How is Benford's Law conformity score calculated?]
[ASK: What does Mean Absolute Deviation (MAD) indicate?]
[ASK: How does first-digit distribution detect artificial rounding?]

#### 4. Column Health Diagnostics & Visualizations
[ASK: Explain how the Column Health Visualizer renders grouped bars]
[ASK: How does the parser handle accounting negative parentheses?]
[ASK: What does distinct cardinality indicate in the health report?]

#### 5. Planning Materiality & Standards
[ASK: How do I configure overall planning materiality?]
[ASK: How does ISA 240 define management override of controls?]
[ASK: What are the 20 Golden DQC integrity rules?]`;
    }

    // Query for all workflow steps on the page
    if (
      q.includes('all the step') ||
      q.includes('all steps') ||
      q.includes('steps i need to perform') ||
      q.includes('steps to perform') ||
      q.includes('workflow steps') ||
      q.includes('overview of steps')
    ) {
      const activeStepTitle = context?.stepTitle || 'Step 1: Ingest Data';
      return `### Overview of JET Audit Workflow Steps

Here is the complete step-by-step audit process across all workflow steps on this page:

1. **Step 1: Ingest Data (Upload Files)**
   - **What to do**: Upload your raw general ledger and accounting populations—either separate CSV files or an all-in-one multi-sheet Excel workbook containing Trial Balance (TB) and General Ledger (GL) Population.
   - **Verification**: Inspect the detected sheet previews, verify total row counts, and ensure files are properly parsed before proceeding.

2. **Step 2: Data File Mapping**
   - **What to do**: Map your source system columns to Deloitte's standard Canonical Data Model (CDM) schema.
   - **Required Fields**: Account Number, Account Description, Debit/Credit Amounts, Effective Date, Journal Entry / Document ID, and User / Preparer ID.

3. **Step 3: Auto-Cleansing & Constraints Check**
   - **What to do**: Automated hygiene engine cleanses raw data, standardizes date formats into ISO-8601 (\`YYYY-MM-DD\`), converts negative accounting parentheses \`(1,234.56)\` -> \`-1234.56\`, and validates 16 mandatory audit integrity rules.
   - **Column Health**: Review exploratory Column Health diagnostics with univariate distributions and grouped comparative bars.

4. **Step 4: Integrity & Data Readiness Tests (IR 1-4)**
   - **What to do**: Execute core baseline checks: Trial Balance debits/credits zero-balance checkpoint, GL to TB total volume reconciliation, and document numbering gap diagnostics.

5. **Step 5: Parametric Exception Testing (Ex 01-12)**
   - **What to do**: Configure engagement audit parameters, materiality thresholds, suspect keyword regex patterns, weekend/holiday dates, and cutoff adjustment windows.

6. **Step 6: Executive Deliverables & Workpapers**
   - **What to do**: Review interactive audit dashboards, forensic exception tables, and Benford's Law logarithmic first-digit conformity scores. Download full audit documentation and audit workpapers.

*Currently, you are on **${activeStepTitle}**. Upload your TB and GL population files to begin.*`;
    }

    // Step 1: Ingest Data / Dataset Guidance
    if (
      q.includes('ingest') ||
      q.includes('upload file') ||
      q.includes('upload dataset') ||
      (context?.currentStep === 1 && (q.includes('what do i do') || q.includes('how do i') || q.includes('current step') || q.includes('next')))
    ) {
      return `### Step 1: Ingest Data (Upload Files)

On this step, you load the raw general ledger and financial accounting datasets for the audit engagement:

**What you need to do:**
1. **Upload Files**: Drag & drop or browse for your files:
   - **Trial Balance (TB)**: Account-level opening, debit, credit, and closing balances.
   - **General Ledger (GL) Population**: Transaction-level journal entries containing amounts, dates, accounts, and preparer IDs.
   - **Chart of Accounts (COA)**: Optional account hierarchy and category metadata.
2. **Supported Formats**: CSV (\`.csv\`) or multi-sheet Excel (\`.xlsx\`, \`.xls\`).
3. **Inspect Sheet Previews**: Click on any detected sheet tab to preview the top 50 sample rows and confirm correct parsing.
4. **Proceed**: Once files are loaded, click **"Proceed to Data File Mapping"** to map your columns to the Deloitte CDM schema.

**Key Requirements:**
- Ensure numerical values are formatted correctly (parentheses or negative signs for credits).
- The Trial Balance debits and credits must balance to zero.
- Ensure date fields contain full day, month, and year information.`;
    }

    // Contextual Step Queries
    if (context && (q.includes('step') || q.includes('what do i do') || q.includes('how do i') || q.includes('current') || q.includes('next') || q.includes('where am i') || q.includes('explain this'))) {
      const stepNum = context.currentStep || 1;
      const stepTitle = context.stepTitle || 'Audit Workflow Step';
      const stepDesc = context.stepDescription || '';
      const stepGuidance = context.actionGuidance || '';

      return `### Step ${stepNum}: ${stepTitle}

${stepDesc}

**Required Actions on this Step:**
- ${stepGuidance || 'Review the inputs on this screen and ensure all required fields are validated before proceeding to the next step.'}

**Key Best Practices:**
- Verify that your data formats adhere to Deloitte canonical standards.
- Check that debits and credits balance in the source Trial Balance.
- Inspect any flagged validation warnings before clicking Proceed.`;
    }

    if (/^(hi|hello|hey|greetings|who\s+are\s+you|what\s+can\s+you\s+do)/i.test(q.trim())) {
      const currentLoc = context?.stepTitle ? `You are currently viewing **${context.stepTitle}**.` : 'You are currently on the Deloitte JET platform.';
      return `### Deloitte JET Assistant

${currentLoc}

I am your dedicated enterprise audit copilot, specialized in Journal Entry Testing (JET), forensic analytics, and audit data preparation.

**How I can assist you:**
- **Step Guidance**: Ask "What is this step about?" or "What do I need to do here?" at any point in the workflow.
- **Audit Risk Tests (01 to 12)**: Explanations of test logic, mathematical thresholds, and ISA 240 / PCAOB AS 2401 fraud risk standards.
- **Benford's Law Conformity**: Detailed breakdown of first-digit distributions, Conformity Scores, and Mean Absolute Deviation (MAD).
- **Column Health & Visualizations**: Interpretation of univariate distributions and side-by-side grouped multivariate comparative bars.
- **Engagement Configuration**: Guidance on setting materiality thresholds, cutoff periods, and currency parameters.`;
    }

    // Test specific questions
    if (q.includes('test 2') || q.includes('keyword') || q.includes('narration') || q.includes('regex')) {
      return `### Test 02: Suspect Keywords & Narrations

- **Objective**: Scans header narrations, line memos, and document descriptions using multi-pattern regex matching to identify fraud, plugs, or manual overrides.
- **Target Indicators**: "plug", "true-up", "error", "correction", "override", "suspense", "partner request", "audit adj", "off-book", "do not record".
- **Visual Analytics**: Displays Top Keyword Frequency Distribution and a Keyword Risk Severity Spread (Polar Area chart).
- **Audit Standard**: Aligns with ISA 240.A43 and PCAOB AS 2401.58 for management override detection.`;
    }

    if (q.includes('test 10') || q.includes('benford') || q.includes('first digit') || q.includes('conformity') || q.includes('mad')) {
      return `### Test 10: Benford's Law First-Digit Conformity

- **Objective**: Evaluates whether the leading digits (1 through 9) of monetary amounts conform to the natural logarithmic distribution: P(d) = log10(1 + 1/d).
- **Conformity Score**:
  - Close Conformity (>=95%): Transaction population naturally generated with minimal arbitrary rounding.
  - Acceptable Conformity (85% - 94%): Standard business distribution with minor cluster anomalies.
  - Marginal / Non-Conformity (<85%): Potential artificial rounding, invoice threshold circumvention, or systematic bias.
- **Mean Absolute Deviation (MAD)**: Quantifies the average percentage divergence across all 9 digits.`;
    }

    if (q.includes('test 3') || q.includes('cutoff') || q.includes('closing entries') || q.includes('post-closing')) {
      return `### Test 03: Post-Closing & Cutoff Adjustments

- **Objective**: Surveils adjusting journal entries posted within the period-end closing window (+/- 5 days from fiscal year/quarter cutoff).
- **Risk Rationale**: High risk of management bias or earnings manipulation occurs immediately around financial statement cutoffs.
- **Visual Analytics**: Cutoff Window Density Curve (Area Spline) and Stratification Donut showing entries booked exactly on Cutoff Day 0 vs post-cutoff.`;
    }

    if (q.includes('test 4') || q.includes('unusual account') || q.includes('conflicting pairing')) {
      return `### Test 04: Unusual Accounts & Conflicting Pairings

- **Objective**: Identifies unnatural account class debit/credit relationships that breach standard double-entry accounting.
- **Examples**: Direct pairings between Equity and P&L, Intercompany and Cash without clearing accounts, or Asset and Revenue.
- **Visual Analytics**: Conflicting Account Class Pairings Polar Area chart with non-flat proportional radii.`;
    }

    if (q.includes('eda') || q.includes('column health') || q.includes('grouped') || q.includes('univariate') || q.includes('multivariate') || q.includes('parsenum')) {
      return `### EDA Column Health Visualizer

- **Purpose**: Provides exploratory data analysis and data hygiene diagnostics for uploaded audit populations.
- **Univariate Analysis**: Evaluates value frequencies, completeness percentages, distinct cardinality, and summary statistics.
- **Multivariate Grouped Comparative View**: For multi-measure categories (e.g. beginning_balance_ec vs beginning_balance_gc across Account Categories), renders side-by-side comparative bars with distinct category sub-offsets.
- **Accounting Parser**: Automatically parses accounting parentheses (e.g. (1,234.56) -> -1234.56), currency symbols, and debit/credit suffixes.
- **Light Theme Tooltip**: Features the clean executive floating card with thin divider and bold variance indicators.`;
    }

    if (q.includes('materiality') || q.includes('threshold')) {
      return `### Materiality Threshold Configuration

- **Purpose**: Defines the monetary benchmark above which journal entries receive highest audit triage priority.
- **Triage Priority**: Transactions exceeding materiality are automatically prioritized for substantive workpaper sampling and forensic inspection.
- **Configuration**: Configurable during the workflow parameters step (typically defaulting to $500,000 or client-specific planning materiality).`;
    }

    if (q.includes('12') && (q.includes('test') || q.includes('forensic') || q.includes('risk') || q.includes('overview') || q.includes('cover'))) {
      return `### Overview of 12 Forensic Audit Risk Tests

The Deloitte Automated JET platform executes 12 parametric fraud and integrity tests aligned with ISA 240 and PCAOB AS 2401:

1. **Test 01: Seldom & Dormant Accounts** – Detects transactions booked to general ledger accounts with rare or inactive historical posting patterns.
2. **Test 02: Suspect Keywords & Narrations** – Multi-pattern regex scanning of journal narrations for fraud terms (plug, true-up, error, correction, partner request).
3. **Test 03: Post-Closing & Cutoff Adjustments** – Surveils adjusting journal entries posted within the period-end closing window (+/- 5 days from fiscal cutoff).
4. **Test 04: Unusual Accounts & Conflicting Pairings** – Flags unnatural account class debit/credit relationships that breach double-entry rules.
5. **Test 05: Round Sum Multiples** – Identifies entries recorded in exact round values ($10K, $50K, $100K) or just beneath approval thresholds.
6. **Test 06: Duplicate Transactions** – Highlights repeated entries with matching amounts, accounts, dates, or preparers indicating split postings.
7. **Test 07: Weekend & Holiday Postings** – Detects entries posted on non-business days, Saturdays, Sundays, or recognized holidays.
8. **Test 08: Debits to Revenue Accounts** – Uncovers unusual debit transactions reducing sales or operating revenue accounts.
9. **Test 09: Monitored & Rare Users** – Activity originated by privileged IT admin credentials, executive accounts, or infrequent preparers.
10. **Test 10: Benford's Law First-Digit Conformity** – Evaluates natural logarithmic digit distributions and computes Mean Absolute Deviation (MAD).
11. **Test 11: Population Funnel & Reconciliation** – Reconciles raw GL population against Trial Balance control totals.
12. **Test 12: Engagement Scope & Control Sample** – Applies materiality benchmarks and generates representative audit sampling workpapers.`;
    }

    return `### Deloitte JET Audit Guidance

The Deloitte Automated JET platform delivers automated general ledger ingestion, exploratory column health diagnostics, and 12 forensic audit risk tests.

**Core Capabilities:**
- **Audit Risk Tests 01 to 12**: Seldom Accounts, Suspect Keywords, Cutoff Adjustments, Unusual Account Pairings, Round Sum Multiples, Duplicate Transactions, Weekend/Holiday Postings, Debits to Revenue, Monitored Users, Benford's Law, Population Funnel, and Engagement Details.
- **EDA Column Health Diagnostics**: Deep univariate/multivariate distributions, accounting format parsing, and data completeness metrics.
- **Reconciliation Workpapers**: Three-way Trial Balance to General Ledger reconciliation.`;
  }

  // ── Main Process Method ─────────────────────────────────────────────
  public async processQuery(messages: AiMessage[], context?: ActivePageContext): Promise<AiResponse> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const q = lastUserMessage.toLowerCase().trim();

    // 1. Guardrail Validation
    const guardrailCheck = this.checkGuardrails(lastUserMessage);
    if (!guardrailCheck.allowed) {
      return {
        message: `**Deloitte Domain Guardrail Activated**\n\nI am the **Deloitte JET Assistant**, strictly dedicated to guiding you through **Journal Entry Testing (JET)**, audit risk diagnostics, and dataset health workflows.\n\nYour inquiry is outside the scope of this audit application. Please ask questions related to:\n- Your current workflow step\n- Audit Risk Tests (01 to 12)\n- EDA Column Health Diagnostics\n- Benford's Law Conformity Analysis\n- Cutoff, Materiality, and Account Configurations`,
        guardrailTriggered: true,
        guardrailReason: guardrailCheck.reason,
      };
    }

    // 2. Deterministic Commands & Core Canonicals (Instant High-Accuracy Execution)
    if (
      q === '/questions' ||
      q === '/help' ||
      q === '/prompts' ||
      q.includes('sample question') ||
      q.includes('prompt catalog') ||
      q.includes('show questions') ||
      q.includes('all questions') ||
      q.includes('all the step') ||
      q.includes('all steps') ||
      q.includes('steps i need to perform') ||
      q.includes('steps to perform') ||
      q.includes('workflow steps') ||
      q.includes('ingest data') ||
      q.includes('ingest dataset') ||
      (q.includes('12') && (q.includes('test') || q.includes('forensic') || q.includes('overview') || q.includes('cover')))
    ) {
      const canonicalResponse = this.generateStepAwareResponse(lastUserMessage, context);
      return {
        message: this.sanitizeText(canonicalResponse),
        guardrailTriggered: false,
      };
    }

    // 3. Attempt Real Local Neural Model (Qwen2.5 on Port 5005)
    try {
      const llmResult = await this.queryLocalNeuralModel(messages, context);
      return {
        message: llmResult,
        guardrailTriggered: false,
      };
    } catch (err) {
      // 4. Resilient Fallback to Step-Aware Dynamic Knowledge Engine
      const fallbackResponse = this.generateStepAwareResponse(lastUserMessage, context);
      return {
        message: this.sanitizeText(fallbackResponse),
        guardrailTriggered: false,
      };
    }
  }
}

export const aiAssistantService = new AiAssistantService();
