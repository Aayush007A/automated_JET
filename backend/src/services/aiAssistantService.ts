import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiConfig {
  localEndpoint: string; // e.g. "http://localhost:11434" for Ollama or "http://localhost:1234/v1" for LM Studio
  model: string;         // e.g. "llama3.2:1b", "qwen2.5:1.5b", "phi3:mini"
  temperature: number;
  timeoutMs: number;
}

export interface AiResponse {
  message: string;
  guardrailTriggered: boolean;
  guardrailReason?: string;
  modelUsed: string;
  source: 'local-llm' | 'built-in-engine';
}

class AiAssistantService {
  private config: AiConfig = {
    localEndpoint: process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434',
    model: process.env.LOCAL_LLM_MODEL || 'llama3.2:1b',
    temperature: 0.2,
    timeoutMs: 2500,
  };

  // ── Guardrail Domain Rules ───────────────────────────────────────────
  // Strictly permitted domain terms: Automated JET, General Ledger audit testing, Omnia tests, EDA
  private allowedDomainKeywords: string[] = [
    'jet', 'journal', 'ledger', 'entry', 'entries', 'gl', 'posting', 'debit', 'credit',
    'balance', 'account', 'accounts', 'transaction', 'transactions', 'audit', 'auditor',
    'materiality', 'threshold', 'omnia', 'spark', 'test', 'tests', 'cutoff', 'post-closing',
    'seldom', 'dormant', 'unusual', 'keyword', 'keywords', 'narration', 'regex', 'round',
    'duplicate', 'duplicates', 'backdated', 'out-of-period', 'weekend', 'holiday',
    'revenue', 'monitored', 'user', 'users', 'preparer', 'benford', 'benford\'s', 'first-digit',
    'chi-square', 'mad', 'population', 'funnel', 'sample', 'control', 'risk', 'high-risk',
    'medium-risk', 'low-risk', 'eda', 'visualizer', 'distribution', 'health', 'univariate',
    'multivariate', 'scatter', 'polar', 'radar', 'export', 'csv', 'excel', 'upload', 'clean',
    'auto-clean', 'null', 'missing', 'column', 'dataset', 'parsenum', 'format', 'date', 'fiscal',
    'deloitte', 'platform', 'feature', 'features', 'help', 'guide', 'how to', 'step', 'overview',
    'beginning_balance', 'ending_balance', 'currency', 'formula', 'variance', 'prior', 'baseline'
  ];

  // Strictly prohibited off-topic indicators (general chit-chat, weather, politics, unrelated software)
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

  // ── Fine-Tuned Automated JET Knowledge Base ─────────────────────────
  private domainKnowledge: Record<string, string> = {
    overview: `**Deloitte Automated JET Platform (Journal Entry Testing)** is an enterprise audit analytics solution designed to ingest general ledger populations, perform robust automated data hygiene (EDA Column Health Visualizer), and execute 12 specialized Omnia & Spark audit risk tests adhering to international standards (ISA 240 / PCAOB AS 2401).`,
    
    test01: `**Test 01: Seldom Used Accounts**
- **Objective**: Identifies postings booked to dormant or rarely utilized general ledger accounts that may conceal improper adjustments.
- **Audit Standard**: ISA 240.A43 / AS 2401.58.
- **Logic**: Flags accounts with fewer than a configured threshold of entries (typically <5 to 10 entries per fiscal year) or accounts dormant for >90 days that suddenly show high-value activity.
- **Output File**: \`Omnia_Test_Seldom_Accounts.csv\`.`,

    test02: `**Test 02: Suspect Keywords & Narrations**
- **Objective**: Scans header narrations, document descriptions, and line-item memos using multi-pattern regex matching to identify fraud, plugs, or manual overrides.
- **Target Indicators**: "plug", "true-up", "error", "correction", "override", "suspense", "partner request", "audit adj", "off-book", "do not record".
- **Visuals**: Displays Top Keyword Frequency Distribution and a Keyword Risk Severity Spread (Polar Area chart).
- **Output File**: \`Omnia_Test_Keywords.csv\`.`,

    test03: `**Test 03: Post-Closing & Cutoff Adjustments**
- **Objective**: Surveils adjusting journal entries posted within the period-end closing window (+/- 5 days from fiscal year/quarter cutoff).
- **Risk Rationale**: High risk of management bias or earnings manipulation occurs immediately around financial statement cutoffs.
- **Visuals**: Cutoff Window Density Curve (Area Spline) and Stratification Donut.
- **Output File**: \`Omnia_Test_Closing_Entries.csv\`.`,

    test04: `**Test 04: Unusual Accounts & Conflicting Pairings**
- **Objective**: Identifies unnatural account class debit/credit relationships that breach standard double-entry accounting.
- **Examples**: Direct pairings between Equity and P&L, Intercompany and Cash without clearing accounts, or Asset and Revenue.
- **Visuals**: Conflicting Account Class Pairings Polar Area chart.
- **Output File**: \`Omnia_Test_Unusual_Accounts.csv\`.`,

    test05: `**Test 05: Round Sum Multiples**
- **Objective**: Isolates transactions recorded in round thousands, tens of thousands, or hundreds of thousands ($1,000, $10,000, $100,000, $1,000,000).
- **Risk Rationale**: Genuine business transactions generally contain cents or irregular figures; round estimates frequently signify arbitrary management accruals.
- **Output File**: \`Omnia_Test_Round_Amounts.csv\`.`,

    test06: `**Test 06: Duplicate Transactions**
- **Objective**: Detects potential double-counting, duplicate vendor payments, or erroneous re-postings.
- **Matching Keys**: Exact matches on Amount, Posting Date, Account Code, and Description.
- **Output File**: \`Omnia_Test_Duplicate_Entries.csv\`.`,

    test07: `**Test 07: Dates of Interest (Weekends & Holidays)**
- **Objective**: Identifies transactions posted or created on non-business days (Saturdays, Sundays, statutory holidays) or backdated with significant lag between entry date and effective posting date.
- **Output File**: \`Omnia_Test_Dates_Of_Interest.csv\`.`,

    test08: `**Test 08: Debits to Revenue**
- **Objective**: Flags abnormal debit entries directly booked into revenue / sales accounts.
- **Risk Rationale**: Revenue accounts are naturally credit-normal. Direct debit adjustments may conceal unauthorized credit notes, unrecorded sales returns, or channel stuffing corrections.
- **Output File**: \`Omnia_Test_Debits_To_Revenue.csv\`.`,

    test09: `**Test 09: Monitored & Rare Users**
- **Objective**: Identifies postings by administrative superusers (e.g. \`SAP* \`, \`DDIC\`, \`DBA\`, \`SYSTEM\`), users with infrequent posting history (<5 lifetime entries), or terminated personnel.
- **Visuals**: Multi-Dimensional User Behavioral Fingerprint (Radar Chart) comparing flagged user risk indices against peer accounting standards.
- **Output File**: \`Omnia_Test_Users_Of_Interest.csv\`.`,

    test10: `**Test 10: Benford's Law First-Digit Analyzer**
- **Objective**: Tests whether the first significant digits (1 through 9) of monetary amounts follow the logarithmic Benford distribution ($P(d) = \\log_{10}(1 + 1/d)$).
- **Key Metrics**:
  - **Conformity Score**: (0-100%) Measures overall goodness-of-fit.
  - **Conformity Level**: Close Conformity (>=95%), Acceptable Conformity (85-94%), Marginal Conformity (<85%).
  - **Mean Absolute Deviation (MAD)**: Quantifies average divergence per digit.
  - **Chi-Square Statistic**: Evaluates statistical significance of anomalies.`,

    test11: `**Test 11: Population Funnel & Exclusions**
- **Objective**: Tracks full population reconciliation from Raw Ingested GL Rows -> System-Generated Exclusions (automated interfaces, depreciation runs) -> Tested Manual Journal Population.`,

    test12: `**Test 12: Engagement Parameters & Configuration**
- **Objective**: Documents core audit engagement parameters including Materiality Threshold, Currency Code, Fiscal Year-End, Entity Name, and Active Test Toggles.`,

    eda: `**EDA Column Health Visualizer**
- **Purpose**: Provides deep exploratory data analysis and hygiene auditing for uploaded GL datasets.
- **Univariate Analysis**: Renders value distributions, null/completeness %, distinct counts, dominant category shares, and statistical summaries (mean, min, max, std dev).
- **Multivariate Grouped Comparative View**: For multi-measure datasets (e.g. \`beginning_balance_ec\` vs \`beginning_balance_gc\` across Account Categories), renders side-by-side grouped comparative bars with individual category offsets (\`grouped: true\`).
- **Robust Accounting Parser**: Automatically parses negative parenthesis numbers (e.g. \`(1,234.56)\` -> \`-1234.56\`), currency symbols (\`$\`, \`₹\`, \`€\`, \`£\`), and Dr/Cr flags.
- **Light Theme Tooltip**: Features the clean executive tooltip with thin divider and color-coded variance (\`▲ +X%\` Green / \`▼ -X%\` Red).`,

    materiality: `**Materiality Threshold Configuration**
- Set in the workflow configuration step (typically defaults to $500,000 or client-specified amount).
- Postings exceeding materiality receive highest audit triage priority and are automatically flagged for substantive sampling.`
  };

  public getConfig(): AiConfig {
    return { ...this.config };
  }

  public setConfig(newConfig: Partial<AiConfig>): AiConfig {
    this.config = { ...this.config, ...newConfig };
    return { ...this.config };
  }

  // ── Guardrail Validator ─────────────────────────────────────────────
  public checkGuardrails(userQuery: string): { allowed: boolean; reason?: string } {
    const trimmed = userQuery.trim().toLowerCase();

    // 1. Prohibited topic regex scan
    for (const pattern of this.prohibitedTopics) {
      if (pattern.test(trimmed)) {
        return {
          allowed: false,
          reason: 'PROHIBITED_OFF_TOPIC',
        };
      }
    }

    // 2. Prohibited system prompt injections
    if (trimmed.includes('system prompt') || trimmed.includes('ignore previous') || trimmed.includes('developer instructions')) {
      return {
        allowed: false,
        reason: 'PROMPT_INJECTION_ATTEMPT',
      };
    }

    // 3. Domain relevance check
    const matchedKeywords = this.allowedDomainKeywords.filter((kw) => trimmed.includes(kw));

    // If query is too short or has 0 domain matches
    if (matchedKeywords.length === 0 && trimmed.length > 8) {
      // Check for generic greetings (allowed)
      if (/^(hi|hello|hey|greetings|good\s+morning|good\s+afternoon|who\s+are\s+you|what\s+can\s+you\s+do)/i.test(trimmed)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'OUT_OF_DOMAIN_SCOPE',
      };
    }

    return { allowed: true };
  }

  // ── Built-In Domain Reasoning Engine (Zero-Dependency Resilient Fallback) ──
  public generateBuiltInResponse(userQuery: string): string {
    const q = userQuery.toLowerCase();

    if (/^(hi|hello|hey|greetings|who\s+are\s+you|what\s+can\s+you\s+do)/i.test(q.trim())) {
      return `### 👋 Welcome to Deloitte Automated JET Intelligence Assistant!

I am your specialized audit AI copilot, strictly dedicated to guiding you through the **Automated Journal Entry Testing (JET)** platform. 

Here is what I can assist you with:
- 🧪 **Omnia Audit Tests (01 to 12)**: Detailed breakdown of test logic, risk standards (ISA 240 / PCAOB AS 2401), and CSV export outputs.
- 📊 **Benford's Law Analysis**: Conformity scores, MAD calculations, and digit distribution interpretation.
- 🔬 **EDA Column Health Visualizer**: Univariate distributions, side-by-side grouped multivariate comparative bars, and null rate diagnostics.
- ⚙️ **Workflow & Engagement Config**: Materiality thresholds, currency settings, cutoff windows, and test execution parameters.
- 📈 **Variance Tooltips & Analytics**: How to read period-over-period shift metrics and risk indicator badges.

*Feel free to ask any question about your general ledger data or audit testing procedures!*`;
    }

    // Test specific questions
    if (q.includes('test 2') || q.includes('keyword') || q.includes('narration') || q.includes('regex')) {
      return this.domainKnowledge.test02;
    }
    if (q.includes('test 10') || q.includes('benford') || q.includes('first digit') || q.includes('conformity') || q.includes('mad')) {
      return this.domainKnowledge.test10;
    }
    if (q.includes('test 3') || q.includes('cutoff') || q.includes('closing entries') || q.includes('post-closing')) {
      return this.domainKnowledge.test03;
    }
    if (q.includes('test 4') || q.includes('unusual account') || q.includes('conflicting pairing')) {
      return this.domainKnowledge.test04;
    }
    if (q.includes('test 1') || q.includes('seldom') || q.includes('dormant')) {
      return this.domainKnowledge.test01;
    }
    if (q.includes('test 5') || q.includes('round sum') || q.includes('round amount') || q.includes('multiple')) {
      return this.domainKnowledge.test05;
    }
    if (q.includes('test 6') || q.includes('duplicate')) {
      return this.domainKnowledge.test06;
    }
    if (q.includes('test 7') || q.includes('weekend') || q.includes('holiday') || q.includes('dates of interest') || q.includes('backdated')) {
      return this.domainKnowledge.test07;
    }
    if (q.includes('test 8') || q.includes('debit to revenue') || q.includes('revenue debit')) {
      return this.domainKnowledge.test08;
    }
    if (q.includes('test 9') || q.includes('user') || q.includes('monitored user') || q.includes('rare user') || q.includes('radar')) {
      return this.domainKnowledge.test09;
    }
    if (q.includes('test 11') || q.includes('funnel') || q.includes('exclusion')) {
      return this.domainKnowledge.test11;
    }
    if (q.includes('test 12') || q.includes('engagement') || q.includes('fiscal year')) {
      return this.domainKnowledge.test12;
    }
    if (q.includes('eda') || q.includes('column health') || q.includes('grouped') || q.includes('univariate') || q.includes('multivariate') || q.includes('parsenum')) {
      return this.domainKnowledge.eda;
    }
    if (q.includes('materiality') || q.includes('threshold')) {
      return this.domainKnowledge.materiality;
    }

    // Default comprehensive overview
    return `${this.domainKnowledge.overview}

### Key Capabilities You Can Inquire About:
1. **Omnia Audit Tests 1 to 12**: Seldom Accounts, Suspect Keywords, Post-Closing Cutoff, Unusual Account Pairings, Round Sum Multiples, Duplicate Transactions, Weekend/Holiday Postings, Debits to Revenue, Monitored Users, Benford's Law, Population Funnel, and Engagement Details.
2. **EDA Column Health Visualizer**: Deep univariate/multivariate distributions, accounting format parsing, and data completeness metrics.
3. **Audit Standards**: Built-in adherence to ISA 240 and PCAOB AS 2401 requirements for journal entry fraud risk identification.

*Ask me about any specific test, visualizer chart, or workflow step!*`;
  }

  // ── Dispatch to Local LLM (Ollama or OpenAI-compatible) ─────────────
  public async callLocalLlm(messages: AiMessage[]): Promise<string> {
    const systemPrompt = `You are the Deloitte Automated JET Intelligence Assistant, an expert AI copilot embedded within the Deloitte Automated Journal Entry Testing (JET) analytics platform.
You are strictly guarded: YOU MUST ONLY ANSWER QUESTIONS DIRECTLY RELATED TO THIS JET APPLICATION, General Ledger auditing, Omnia tests 1-12, EDA Column Health Visualizer, Benford's Law, and audit standards (ISA 240 / PCAOB AS 2401).
If a user asks about anything outside this domain (e.g. weather, recipes, movies, politics, personal questions), politely decline and state that you are exclusively configured for the Deloitte Automated JET platform.
Keep your answers professional, well-structured in markdown with bullet points, and reference relevant tests (e.g. Test 02 for Keywords, Test 03 for Cutoff, Test 10 for Benford).`;

    const endpoint = this.config.localEndpoint.replace(/\/+$/, '');
    const isOllama = endpoint.includes(':11434');

    if (isOllama) {
      // Ollama native API: /api/chat
      const url = new URL(`${endpoint}/api/chat`);
      const payload = JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: false,
        options: {
          temperature: this.config.temperature,
        },
      });

      return new Promise<string>((resolve, reject) => {
        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
            timeout: this.config.timeoutMs,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                if (parsed.message?.content) {
                  resolve(parsed.message.content);
                } else if (parsed.error) {
                  reject(new Error(`Ollama Error: ${parsed.error}`));
                } else {
                  reject(new Error('Invalid response structure from Ollama'));
                }
              } catch (e: any) {
                reject(new Error(`Failed to parse Ollama response: ${e.message}`));
              }
            });
          }
        );

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Local LLM request timed out'));
        });

        req.write(payload);
        req.end();
      });
    } else {
      // Standard OpenAI-compatible format: /v1/chat/completions
      const url = new URL(`${endpoint}/v1/chat/completions`);
      const payload = JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: this.config.temperature,
      });

      return new Promise<string>((resolve, reject) => {
        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
            timeout: this.config.timeoutMs,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.message?.content;
                if (content) {
                  resolve(content);
                } else {
                  reject(new Error('Invalid OpenAI-compatible response'));
                }
              } catch (e: any) {
                reject(new Error(`Failed to parse response: ${e.message}`));
              }
            });
          }
        );

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Local LLM request timed out'));
        });

        req.write(payload);
        req.end();
      });
    }
  }

  // ── Main Process Method ─────────────────────────────────────────────
  public async processQuery(messages: AiMessage[]): Promise<AiResponse> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    // 1. Guardrail Validation
    const guardrailCheck = this.checkGuardrails(lastUserMessage);
    if (!guardrailCheck.allowed) {
      return {
        message: `🛡️ **Deloitte Domain Guardrail Activated**\n\nI am the **Automated JET Intelligence Assistant**, strictly dedicated to guiding you through **Journal Entry Testing (JET)**, Omnia audit diagnostics, and dataset health workflows.\n\nYour query appears outside the scope of this audit application. Please ask questions related to:\n- **Omnia Tests (01 to 12)**\n- **EDA Column Health Visualizer**\n- **Benford's Law Conformity Analysis**\n- **Cutoff & Materiality Settings**\n- **Data Cleaning & Output Reconciliation**`,
        guardrailTriggered: true,
        guardrailReason: guardrailCheck.reason,
        modelUsed: 'DomainGuardrail-v1.0',
        source: 'built-in-engine',
      };
    }

    // 2. Attempt Local LLM Execution
    try {
      const llmResult = await this.callLocalLlm(messages);
      return {
        message: llmResult,
        guardrailTriggered: false,
        modelUsed: this.config.model,
        source: 'local-llm',
      };
    } catch (err: any) {
      // 3. Resilient Fallback to Built-in Domain Knowledge Engine
      const fallbackResponse = this.generateBuiltInResponse(lastUserMessage);
      return {
        message: fallbackResponse,
        guardrailTriggered: false,
        modelUsed: `JET-Expert-Engine (Fallback: Local LLM at ${this.config.localEndpoint} offline)`,
        source: 'built-in-engine',
      };
    }
  }

  // ── Health / Daemon Status Check ────────────────────────────────────
  public async checkStatus(): Promise<{ connected: boolean; model: string; endpoint: string; details?: string }> {
    try {
      const endpoint = this.config.localEndpoint.replace(/\/+$/, '');
      const isOllama = endpoint.includes(':11434');
      const testUrl = isOllama ? `${endpoint}/api/tags` : `${endpoint}/v1/models`;

      const url = new URL(testUrl);
      const client = url.protocol === 'https:' ? https : http;

      return new Promise((resolve) => {
        const req = client.get(url, { timeout: 2000 }, (res) => {
          if (res.statusCode && res.statusCode < 400) {
            resolve({
              connected: true,
              model: this.config.model,
              endpoint: this.config.localEndpoint,
              details: 'Local LLM daemon reachable and operational',
            });
          } else {
            resolve({
              connected: false,
              model: this.config.model,
              endpoint: this.config.localEndpoint,
              details: `Daemon returned HTTP ${res.statusCode}`,
            });
          }
        });

        req.on('error', () => {
          resolve({
            connected: false,
            model: this.config.model,
            endpoint: this.config.localEndpoint,
            details: 'Local daemon not running (using Built-in JET Expert Engine)',
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            connected: false,
            model: this.config.model,
            endpoint: this.config.localEndpoint,
            details: 'Connection timed out (using Built-in JET Expert Engine)',
          });
        });
      });
    } catch (e: any) {
      return {
        connected: false,
        model: this.config.model,
        endpoint: this.config.localEndpoint,
        details: e.message,
      };
    }
  }
}

export const aiAssistantService = new AiAssistantService();
