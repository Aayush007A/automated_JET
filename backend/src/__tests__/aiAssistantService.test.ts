import { aiAssistantService, ActivePageContext } from '../services/aiAssistantService';

describe('AI Assistant Service - Context Accuracy & Anti-Hallucination Tests', () => {
  const mockOmniaContext: ActivePageContext = {
    route: '/omnia-jet',
    pageTitle: 'Comprehensive Journal Entry Testing Suite',
    currentStep: 6,
    totalSteps: 6,
    stepTitle: 'Summary Reconciliation & Executive Reporting',
    activeTab: 'Exception Previews',
    selectedItem: 'Test 1: Seldom Used Accounts: 31 Flags',
    metadata: {
      totalFlags: 61,
      exceptionCards: [
        { num: 0, title: 'All Consolidated Flagged Entries', count: 61, desc: 'Master combined anomaly dataset' },
        { num: 1, title: 'Seldom Used Accounts', count: 31, desc: 'Identifies accounts with low transaction frequency' },
        { num: 2, title: 'Suspect Keywords', count: 0, desc: 'Scans narrative for fraud patterns' },
        { num: 3, title: 'Post-Closing Adjustments', count: 0, desc: 'Journals posted after period cutoff' },
        { num: 4, title: 'Unusual Accounts', count: 0, desc: 'Transactions violating pairing baselines' },
        { num: 5, title: 'Round Sum Multiples', count: 0, desc: 'Flag amounts in exact round thousands' },
        { num: 6, title: 'Duplicate Transactions', count: 0, desc: 'Identical amount, date, or posting pairings' },
        { num: 7, title: 'Dates of Interest', count: 0, desc: 'Entries recorded on weekends or holidays' },
        { num: 8, title: 'Debits to Revenue', count: 0, desc: 'Anomalous debit entries against revenue accounts' },
        { num: 9, title: 'Monitored & Rare Users', count: 0, desc: 'Entries created by unauthorized users' },
        { num: 10, title: 'Reproducible Control Sample', count: 4, desc: 'Deterministic sampling' },
      ],
      views12: [
        { num: '01', title: 'Seldom Used Accounts', count: 31 },
        { num: '02', title: 'Suspect Keywords', count: 0 },
        { num: '03', title: 'Post-Closing Adjustments', count: 0 },
        { num: '04', title: 'Unusual Accounts', count: 0 },
        { num: '05', title: 'Round Sum Multiples', count: 0 },
        { num: '06', title: 'Duplicate Transactions', count: 0 },
        { num: '07', title: 'Dates of Interest', count: 0 },
        { num: '08', title: 'Debits to Revenue', count: 0 },
        { num: '09', title: 'Monitored & Rare Users', count: 0 },
        { num: '10', title: "Benford's Law Conformity", count: '96.8% Conformity' },
        { num: '11', title: 'Population Funnel', count: '100% Reconciled' },
        { num: '12', title: 'Engagement Parameters', count: 'Configured' },
      ],
      kpis: {
        'Total Consolidated Flags': 61,
        'Total GL Population Rows': 10000,
        'Reconciled Accounts': '142 / 142',
        'Critical DQC Errors': 0,
        'Benford Conformity Score': '96.8%',
        'Planning Materiality': 500000,
        'Audit Currency': 'USD',
        'Fiscal Year End': '2026-03-31',
        'Active Sub-Tab': 'Exception Previews',
        'Active Exception Card': 'Seldom Used Accounts (31 Flags)',
      },
      allSheetsCatalog: {
        '01_account_wise': {
          num: '01',
          id: '01_account_wise',
          title: 'Account Wise Analysis',
          chartData: {
            title: 'Financial Statement Line Debit Exposure',
            chartType: 'Donut / Pie Chart',
            totalExposure: '$71,461,500',
            slices: [
              { category: 'Trade Receivables', percentage: '40%', amount: '$28,940,000', insight: 'Primary debit volume' },
              { category: 'Finished Goods', percentage: '28%', amount: '$19,820,500', insight: 'Inventory movements' },
              { category: 'Cash Holdings', percentage: '20%', amount: '$14,280,900', insight: 'Treasury transfers' },
              { category: 'Accrued Liabilities', percentage: '12%', amount: '$8,420,100', insight: 'Accrued payroll' },
            ],
          },
        },
        '03_user_wise': {
          num: '03',
          id: '03_user_wise',
          title: 'User Wise Analysis',
          chartData: {
            title: 'Posting Exposure by User Risk Profile',
            chartType: 'Donut / Pie Chart',
            totalExposure: '$73,909,918',
            slices: [
              { category: 'Automated Feeds', percentage: '57.9%', amount: '$42,800,000', insight: 'Routine ERP batch interface postings' },
              { category: 'Standard Operations', percentage: '25.0%', amount: '$18,500,000', insight: 'Standard day-to-day operations' },
              { category: 'High-Risk Admin/Temp', percentage: '17.1%', amount: '$12,609,918', insight: 'Privileged admin access entries' },
            ],
          },
        },
      },
    },
    visibleContent: {
      headings: ['Parameter Exception Previews', 'Audit Overview', 'Executive Summary'],
      labels: ['Test 1: Seldom Used Accounts', 'All Consolidation Flagged Entries', 'Top 50 per Test'],
      buttons: ['Export CSV', 'Next View', 'Close'],
      paragraphs: ['Browse flagged journal entries across all 9 parametric fraud tests, scored by risk tier.'],
      cards: [
        { title: 'All Consolidation Flagged Entries', badge: 'Ex 00', count: 61, subtitle: '61 Flags' },
        { title: 'Seldom Used Accounts', badge: 'T 01', count: 31, subtitle: '31 Flags' },
        { title: 'Suspect Keywords', badge: 'T 02', count: 0, subtitle: '0 Flags' },
      ],
      metrics: [
        { label: 'Reconciled Accounts', value: '142 / 142' },
        { label: 'Flagged Exceptions', value: '61' },
        { label: 'Benford Conformity', value: '96.8%' },
      ],
      tables: [],
      selectedText: '',
      text: 'Parameter Exception Previews All Consolidation Flagged Entries 61 Flags Test 1 Seldom Used Accounts 31 Flags',
      url: 'http://localhost:3000/omnia-jet?step=6',
      capturedAt: new Date().toISOString(),
    },
  };

  test('Query 1: Which exception has what count should return real counts and NEVER fake exceptions', async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: 'Parameter Visual Analytics Suite (12 Views) for this give me which exception has what count' }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);
    // Must contain the actual numbers
    expect(res.message).toContain('31');
    expect(res.message).toContain('61');
    expect(res.message).toContain('Seldom Used Accounts');

    // Must NOT contain the hallucinated fake exceptions from Screenshot 1
    expect(res.message).not.toContain('Data Manipulation Error');
    expect(res.message).not.toContain('Misstated Account Titles');
    expect(res.message).not.toContain('Incorrect Date Format');
    expect(res.message).not.toContain('Missing or Invalid Document ID');
    expect(res.message).not.toContain('Non-Cash Asset Reversal');
    expect(res.message).not.toContain('Non-GAAP EBITDA Adjustment');
  });

  test('Query 2: What KPIs showing here means what values are here should return real on-screen KPIs', async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: 'what KPIs showing here means what values are here' }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);
    // Must contain real values
    expect(res.message).toContain('61');
    expect(res.message).toContain('96.8%');
    expect(res.message).toContain('142 / 142');

    // Must NOT contain hallucinated fake KPIs from Screenshot 2
    expect(res.message).not.toContain('1,000,000');
    expect(res.message).not.toContain('Total Revenue: $100,000');
    expect(res.message).not.toContain('Total Assets: $200,000');
    expect(res.message).not.toContain('Net Income: -$50,000');
    expect(res.message).not.toContain('Days Outstanding: 10');
    expect(res.message).not.toContain('Month End Balance: $500,000');
  });

  test('Query 3: What are the 12 tests mentioned in visualizations should return the real 12 views', async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: 'what are the 12 tests which mentioned in the visualizations & Insights section on current page' }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);
    // Must contain real tests
    expect(res.message).toContain('Seldom Used Accounts');
    expect(res.message).toContain('Suspect Keywords');
    expect(res.message).toContain('Post-Closing Adjustments');
    expect(res.message).toContain('Unusual Accounts');
    expect(res.message).toContain('Round Sum Multiples');
    expect(res.message).toContain('Duplicate Transactions');
    expect(res.message).toContain('Dates of Interest');
    expect(res.message).toContain('Debits to Revenue');
    expect(res.message).toContain('Monitored & Rare Users');
    expect(res.message).toContain("Benford's Law Conformity");

    // Must NOT contain hallucinated fake names from Screenshot 3
    expect(res.message).not.toContain('Account Widespread Variance Analysis');
    expect(res.message).not.toContain('Revenue Debit & Credit Integrity');
    expect(res.message).not.toContain('Parameterized Exception Management');
  });

  test('Query 4: What are the Unified 6-Stage Audit Testing stages mentioned here should return all 6 stages', async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: 'what are the Unified 6-Stage Audit Testing stages mentioned here' }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);
    expect(res.message).toContain('Unified 6-Stage Audit Testing Workflow');
    expect(res.message).toContain('Stage 1: Data Upload & Intelligent Inspection');
    expect(res.message).toContain('Stage 2: File Preparation & Raw Data Inspection');
    expect(res.message).toContain('Stage 3: File Cleaning & Automated Constraints Validation');
    expect(res.message).toContain('Stage 4: Pre-Integrity Checks & Canonical Field Mapping');
    expect(res.message).toContain('Stage 5: Integrity Testing & Automated Pipeline Execution');
    expect(res.message).toContain('Stage 6: Executive Summary, Exceptions & Audit Reconciliation');
  });

  test("Query 5: Explain the 01. Account Wise Analysis pie chart's overall split should return the 4 real slices", async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: "explain the 01. Account Wise Analysis pie chart's overall split" }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);

    // Must contain real categories and percentages from the on-screen donut chart
    expect(res.message).toContain('Trade Receivables');
    expect(res.message).toContain('40%');
    expect(res.message).toContain('Finished Goods');
    expect(res.message).toContain('28%');
    expect(res.message).toContain('Cash Holdings');
    expect(res.message).toContain('20%');
    expect(res.message).toContain('Accrued Liabilities');
    expect(res.message).toContain('12%');

    // Must NOT contain hallucinated categories from Image 1
    expect(res.message).not.toContain('Deferred Taxes');
    expect(res.message).not.toContain('Equity Investments');
    expect(res.message).not.toContain('Other Current Liabilities');
    expect(res.message).not.toContain('Prepaid Expenses');
  });

  test("Query 6: Explain 03. User Wise Analysis pie chart's overall split should return the 3 User Wise slices and NOT Account Wise", async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: "explain 03. User Wise Analysis pie chart's overall split" }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);

    // Must contain Sheet 03 data
    expect(res.message).toContain('User Wise Analysis');
    expect(res.message).toContain('Posting Exposure by User Risk Profile');
    expect(res.message).toContain('Automated Feeds');
    expect(res.message).toContain('57.9%');
    expect(res.message).toContain('Standard Operations');
    expect(res.message).toContain('25.0%');
    expect(res.message).toContain('High-Risk Admin/Temp');
    expect(res.message).toContain('17.1%');

    // Must NOT return Sheet 01 categories
    expect(res.message).not.toContain('Trade Receivables');
    expect(res.message).not.toContain('Finished Goods');
    expect(res.message).not.toContain('Financial Statement Line Debit Exposure');
  });

  test('Query 7: What are the 20 golden rules should return all 20 DQC rules', async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: 'what are the 20 golden rules in this application' }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);
    expect(res.message).toContain('The 20 Golden Data Quality Control (DQC) Integrity Rules');
    expect(res.message).toContain('DQC-01');
    expect(res.message).toContain('DQC-03');
    expect(res.message).toContain('DQC-18');
    expect(res.message).toContain('DQC-20');
  });

  test('Query 8: Explain DQC-03 should return the Trial Balance Zero-Balance Equation details', async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: 'explain DQC-03' }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);
    expect(res.message).toContain('DQC-03: Trial Balance Zero-Balance Equation');
    expect(res.message).toContain('Debits');
    expect(res.message).toContain('Credits');
  });

  test('Query 9: How does Test 10 Benford Law calculate conformity score should return mathematical formula and MAD thresholds', async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: 'how does Test 10 Benford Law calculate conformity score' }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);
    expect(res.message).toContain("Test 10: Benford's Law First-Digit Conformity");
    expect(res.message).toContain('\\log_{10}');
    expect(res.message).toContain('Mean Absolute Deviation (MAD)');
    expect(res.message).toContain('Close Conformity');
  });

  test('Query 10: What are the target CDM fields should return the Deloitte Canonical Data Model specification', async () => {
    const res = await aiAssistantService.processQuery(
      [{ role: 'user', content: 'what are the target CDM fields' }],
      mockOmniaContext
    );

    expect(res.guardrailTriggered).toBe(false);
    expect(res.message).toContain('Deloitte Canonical Data Model (CDM) Specification');
    expect(res.message).toContain('Account_Number');
    expect(res.message).toContain('Debit_Amount');
    expect(res.message).toContain('Credit_Amount');
    expect(res.message).toContain('Effective_Date');
    expect(res.message).toContain('Preparer_ID');
  });
});
