# Omnia Journal Entry (JE) Workflow – Engagement Testing Report

Omnia JE is a digitized workflow for testing journal entries for management override or fraud. It guides the audit team through data preparation, analytic testing, and documentation of findings. The system ingests the full journal entry population along with related data (trial balance, chart of accounts, fiscal calendar) and applies automated tests. This approach aligns with standards: for example, PCAOB staff note that auditors should target entries to rare accounts, unusual users, post-close adjustments, and round amounts when screening for fraud. Below is a page-by-page breakdown and in-depth description of the entire JE testing process, including test categories, inputs, expected outputs, and visualizations.

## 1. Setup and Prerequisites

- **Link Data to Omnia:** Before starting JE testing, the engagement team must ensure the Omnia Engagement is connected to the client’s data (the **Omnia Data Project**). All relevant data files should be uploaded and mapped:
  - **Journal Entries** (detailed transactional data, including date, amount, account, user, etc.)
  - **Trial Balance (TB)** (for reconciling totals)
  - **Chart of Accounts (CoA)** (mapping account numbers to descriptions and financial statement lines)
  - **Fiscal Calendar** (defines period-end dates and close dates)
- **Configure Audit Setup:** Define **Entity Groups** (which company entities are in scope) and **Audit Calendar** (the fiscal periods, e.g. Q1, Q2, or full year).  
- **Activate Models:** In Omnia’s Data Library, activate the **Journal Entry (Omnia JE)** analytics model. (Optionally, also run additional analyses such as a Management Override or automated **Benford’s Law test** if needed.)  
- **Quality Checks:** Perform initial reconciliation (ensure JE totals tie to TB) and data validation checks (e.g. no missing accounts, consistent segments). These steps ensure the data is complete and accurate before analytics begin – in line with audit standards on completeness of the population. 

## 2. Add JE Analytic and Set Scope

1. **Add Analytic:** In the Omnia Engagement, navigate to *Live Index > Fraud Risk Assessment & Response* (or similar workspace) and click **Add**. Choose **Journal Entry Analytic** and name the module.  
2. **Define Scope:** The user is redirected to *Set Data Scope*. Here, select the **Entity Group** and **Audit Calendar** that will be tested (for example, Q1 through Q4 of Fiscal Year 202X). 
3. **Confirm Data Quality:** Before proceeding, check the box confirming that core data steps are done:
   - **Reconciliation**: Trial Balance vs. General Ledger totals agree.
   - **Data Validation**: All required GL segments and fiscal periods are present (Omnia flags issues like missing TB balances or invalid dates).
   - Attach any supporting documents if needed.
4. **Create Analytic:** Click **CREATE**. Omnia imports and processes the selected data, advancing to the data validation stage.

## 3. Data Creation & Validation

Once the scope is set, Omnia automatically builds the JE analytic and runs **Data Checks**:

- The system verifies **completeness and accuracy** of the JE population. For example, it checks that every journal entry has valid account codes, that all reported TB balances have corresponding entries, and that date fields fall within the selected period. These checks correspond to audit procedures for ensuring completeness of the JE population.  
- **Examples of Data Checks:** Detecting missing ending balances in the TB, entries with invalid accounts, gaps in the calendar, or duplicate header IDs.
- **Resolve Issues:** If any error or warning appears, the team must correct the data (e.g. update mappings, reload files) and rerun the check.
- After validation, Omnia confirms that the **Data Checks** step is complete and enables moving to refining the population.

## 4. Refine Data (Exclusions)

The **Refine Data** stage lets auditors exclude entries that should not be tested for potential fraud. This ensures that only relevant transactions remain in the testing population.

1. **Select Exclusions:** The interface offers common exclusion filters, such as:
   - **Zero-Value Lines:** Remove any journal lines with a $0 amount (e.g. headers or balances).
   - **System or Recurring Entries:** Exclude entries by document type (e.g. standard month-end amortization) or origin (e.g. payroll clearing).
   - **Specific Accounts:** Omit routine accounts (e.g. intercompany clearing, equity accounts, treasury).
   - **Entry Types:** Filter by transaction type (e.g. depreciation, inventory adjustments).
   - **User/Manager Entries:** Optionally exclude certain preparers or reviewers if known to be manual system processes.  
   
2. **Review Details:** For each exclusion criterion, click **View Details** to see which entries match the filter. You can inspect the entries in a pop-up table, and choose to remove them.  
3. **Document Reason:** For each category excluded, provide a reason or attach documentation (e.g. memo from management). This satisfies audit documentation rules (e.g. explaining why a parameter or test was set as it was).  
4. **Apply Exclusions:** Once finalized, click **APPLY EXCLUSIONS**. Omnia will remove those entries from the test population and update the summary.  

After applying exclusions, Omnia shows an **Exclusion Summary**: the number of entries excluded and the remaining population. If this is a special *Levvia FSA* engagement, a **Tailoring Question** may appear (Step 5). Otherwise, proceed to design tests.

## 5. (Optional) Tailoring Question for Levvia FSA

*This step appears only for Levvia FSA engagements, which focus solely on the closing period.* If prompted:

- **Restrict to Closing Period:** Select **Yes** to limit testing to the defined closing period (e.g. entries from Closing Start Date to Closing End Date). Enter the closing dates and upload support.
- **Apply:** Click **Apply**. Omnia will filter the population to entries within the closing window.  
- During **Design Tests** (next step), the analyst will then run tests either on this closing subset or the entire period, as required. 

If Tailoring is not needed, teams skip to Design Tests.

## 6. Design Tests (Configure Analytic Parameters)

This is the heart of the JE workflow. Omnia lists a suite of journal-entry tests organized by priority:

- **Expected to Run (Mandatory)** – tests that are generally considered fundamental: 
  - Seldom Used Accounts, Keywords, Closing/Post-Closing Entries.
- **Expected to Consider (Optional)** – tests to enable based on risk: 
  - Unusual Accounts, Round Amounts (Recurring Digits).
- **Additional Tests (Supplementary)** – other possible checks:
  - Duplicate Entries, Dates of Interest (e.g. weekend or post-period entries), Debits-to-Revenue, etc.
- **Control Sample** – a random sampling feature to select entries for cross-checking (not flagged, but used for coverage).

Teams **enable or disable** each test via toggles. Omnia requires documenting a rationale if a normally-run test is turned off (for audit trail). 

Omnia’s interface provides interactive analytics for each test. For example, enabling a test might show a chart of flagged entries by account or date, plus a list of those entries. These visuals help auditors immediately see concentrations or trends. (PCAOB guidance notes that unusual postings often occur in rare accounts, by atypical users, or as round numbers; Omnia’s charts highlight exactly those anomalies.)  

**Test Categories and Parameters:** For each chosen test, the team sets up:

- **Primary Parameters:** Core filters for the test (e.g., specify which accounts count as “seldom used,” keyword lists, date ranges).  
- **Supporting Parameters:** Additional filters (e.g., limit to certain FS lines, set specific users, etc.).
- **Threshold (Optional):** A cutoff to ignore small transactions (e.g. ignore entries below \$5,000). Entries excluded by threshold are still listed separately for review.

Each test has a guidance panel (with text from audit methodology) and fields to enter parameters. Auditors should document why parameters are chosen. For example:

- **Seldom Used Accounts:** Define the criteria for “seldom used” (e.g. accounts with fewer than 5 entries in the period, or less than 1% of transaction volume). The input data is the Chart of Accounts and historical usage stats. Omnia then flags every journal entry that posted to those accounts. A helpful visualization could be a bar chart of flagged entry count by account.
- **Keywords:** Input a list of suspect terms (like “plug”, “test”, “net to zero”). Omnia scans descriptions and reference fields for those terms. Output is a table of entries containing those terms. Omnia might display a word cloud or column showing how many times each keyword was hit.
- **Closing/Post-Closing Entries:** Input the period-end date; Omnia flags entries dated after the books were closed. This requires the Fiscal Calendar data. The output is entries on or after the post-close start date, often displayed on a timeline or simply listed for the months after close.
- **Unusual Accounts:** Comparing the TB and CoA, Omnia identifies accounts that are new or used significantly less than peers. Input might include reference to last year’s TB accounts or frequency thresholds. The tool flags entries posted to any such account; a chart by account can show which had unexpected activity.
- **Round Amounts (Recurring Digits):** Auditors define rounding levels (e.g. 10s, 100s, 1000s). Omnia flags lines where the amount is an exact multiple of those. It uses the raw ledger amounts (not rounding those by exchange rates) to avoid false positives. A visualization might be a histogram of last-digit occurrences or a bar showing count by rounding factor. (Audit guidance explicitly flags entries with round numbers.)
- **Duplicate Entries:** Omnia scans for identical or highly similar journal lines (e.g. same date, amount, account pairs, user). Groups of duplicates are flagged. The UI may show a table grouping entries by duplicate sets.
- **Dates of Interest:** Flags clusters of entries on the same date or unusual dates (e.g. many entries on a weekend). Omnia may provide a time-series chart of postings by date to highlight spikes.
- **Debits to Revenue Accounts:** Using the CoA or FS line definitions, Omnia flags entries that debit a revenue (income) account. The result is a list of such entries, since normal practice is for revenue to be credited. A chart could show debits to revenue by account or user.

Each enabled test will run on the final refined population when executed.

## 7. Running Tests and Reviewing Results

Once parameters are set, click **RUN TEST**. Omnia processes all enabled tests and then presents the results in an executive dashboard layout:

- **Summary KPIs:** At the top, see metrics such as total entries tested, total flagged as exceptions, percentage conforming to Benford’s Law (if run), etc.
- **Charts and Tiles:** For each test or for groups of tests, Omnia displays charts and summary cards. Examples include:
  - A **donut or pie chart** showing distribution of flagged vs. normal entries, or severity levels (e.g. High/Medium/Low risk).
  - **Bar charts** summarizing flags by category (e.g. count of flagged entries per test or per GL account).
  - **Benford Chart:** If enabled, a bar chart compares the actual first-digit frequencies of amounts to the expected Benford distribution. Large deviations (e.g. too many 9’s) could highlight anomalies like groups of entries just under a threshold.
  - **Radar or gauge** visuals for KPIs like *“Percent Clean”*.
- **Tables:** A key component is a detailed table of all flagged entries. Columns typically include: Date, Transaction ID, GL Account (debit/credit), Amount, User, and which test(s) flagged it. There may also be columns for FS Line, etc.  

For illustration, the image below resembles an Omnia dashboard: multiple charts and tiles summarize results. In this example, you can see cards for *Total Flags* and *Benford Conformity*, plus bar and pie charts breaking down the exceptions. Below these graphics, Omnia provides sortable/filterable tables of flagged journal entries (not visible in the image), allowing auditors to click through to each detail.

- **Preview Mode:** Omnia often loads the top 50 flagged entries by default in the table. The user can scroll or use filters to see all results.
- **Export Results:** Each test’s output is available for download (e.g. a CSV of flagged entries). There is also usually an option to preview the raw data for an entry (show the full journal or ledger context).
- **Tooltip/Info Popups:** Some fields may have info icons explaining why an entry was flagged (e.g. “Account 123 was on the seldom-used list”).

Overall, this dashboard turns raw data into an *actionable analytic report*: auditors immediately see which tests found the most exceptions and get both visual summaries and detailed evidence lists.

## 8. Confirming and Refining Results

After reviewing the initial results:

- **Adjust and Rerun:** If parameters were off (too loose or too strict), auditors can adjust filters or thresholds and rerun an individual test or the entire suite.
- **Confirm:** Once satisfied, click **CONFIRM RESULTS**. This locks in the flagged entries for final evaluation. (If the user prefers to discard changes, there’s also a **REVERT** option to go back to the previous test run.)
- **Further Refinement (Tickmarks):** At this point, the team applies professional judgment. Some flagged entries may be false positives or explainable. The **Further Refinement** section is used to de-escalate those:
  - *New Tickmark:* Select one or more entries from a test’s flagged list and click +Tickmark to create a new tickmark. Give it a title (e.g. “Routine Adjustment”) and explain why these aren’t suspicious (professional judgment narrative). Set *“Send for Evaluation”* to **No** if you’re resolving it yourself.
  - *Existing Tickmark:* You can also open an existing tickmark definition and attach additional entries to it (if multiple flags share the same issue).
  - *Action:* Once tickmarked, those entries move out of the flagged list. You can edit or delete tickmarks later.
- The interface usually shows two sections: **Flagged Entries** (remaining issues) and **Further Refinement** (entries under review or marked not exceptions).
- Teams should continue adding tickmarks until every flagged entry is either resolved or prepared for final review. The goal is that the only entries left in *Flagged* are those needing auditor evaluation.

## 9. Evaluate Results

With the refined set of exceptions:

1. **Generate Final Results:** Click **Generate Results** on the *Evaluate Results* page. Omnia recalculates the summary metrics now that some entries have been tickmarked or removed. 
2. **Review Summary:** A final overview appears, often in two parts:
   - **Flagged by Count:** The total number of entries still flagged (after tickmarks) is shown, possibly broken out by test or risk level in charts.
   - **Flagged by Test:** A breakdown table or chart listing each test name and how many entries remain flagged under it.
3. **Entry-by-Entry Evaluation:** For each flagged entry, the auditor performs a detailed review:
   - Open the entry’s detail view. Verify the transaction’s context (see debit/credit lines, amounts, narrative, who posted it, etc.).
   - **Additional Evidence Needed:** Indicate **Yes** or **No**. If *No*, enter a conclusion explaining why the entry is not unusual or how it was satisfactorily explained. If *Yes*, describe what evidence was gathered (e.g. interview notes, transaction support) and provide a conclusion (often a conclusion form whether the entry was appropriate or not).
   - Save the evaluation. The entry is then marked with the auditor’s conclusion.
4. **Review Tickmark Summary:** Once all entries are evaluated, review the Tickmark Summary page. Ensure every flagged item is resolved (no open issues). You may edit tickmarks or add final review notes here.
5. **Documentation:** The Omnia JE workflow will now have a complete record: for every test, you have initial parameters, number of entries tested, detailed lists of flagged entries, and outcome (including tickmark notes and evaluation conclusions). 

By completion, the JE analytic provides a full engagement report: it shows how each test was configured, how many items were flagged, and exactly what auditors found on each entry. The interactive charts and tables themselves can be used as evidence in the audit file.

## 10. Test-Specific Guidance & Examples

Several audit best practices are embedded in the workflow guidance and should be followed:

- **Closing Entries Test:** Define the post-close window very carefully (commonly just 1–5 days after period end). This focuses the test on entries meant to adjust the books, which are higher risk for override.  
- **Dates and Holidays:** For *Dates of Interest*, include logic for weekends and holidays. Often Omnia flags entries dated on Saturday/Sunday or on financial year-end date (if fiscal year ends on a weekday).
- **Unusual Accounts:** Compare against prior year’s Chart of Accounts. Entries in brand-new account codes (that weren’t in last year’s TB) are often included.
- **Round Amounts:** Use the *original currency* (if journals have local and reporting currency). A round number in local may not appear round after conversion. Test at different rounding levels (e.g. $1,000 and $10,000).  
- **Duplicate Entries:** Typically, Omnia flags exact duplicates (all fields same) and near-duplicates (same date and amount on same or similar accounts). Ensure your definition captures groups of 2 or more.
- **Threshold Logic:** Omnia applies thresholds per test differently (as noted in guidance). For example, a threshold for *Seldom Used Accounts* might sum all debits/credits per account; a threshold for *Round Amounts* applies per journal line; for *Keywords* it might be the larger of debit/credit for each entry. Understand these differences so you set meaningful levels.

On pages 33–34 of the original guide, examples of false positives are given (e.g. an unusual account used for a regular accrual, or a round amount that’s actually an intercompany reclassification). Teams should use the *Further Refinement* tickmark process to remove those, as they are expected by the methodology.

## 11. Workflow Output and Visual Reporting

Although Omnia does not output a single compiled Excel workbook in this JE module, it effectively **contains all reporting within the application**:

- The **dashboard visualizations** (charts, graphs, KPIs) serve as a dynamic report summary. They highlight key findings (e.g. *“Benford Conformity: 96.2%”* or *“Total Flags: 27”*) in a clear, visual way.
- **Tables and Detail Views** allow examiners to see the exact data behind each summary point. Every number (counts, sums) is derived from the live data the client provided, ensuring traceability.
- Teams often export the flagged-entry lists or take screenshots of the Omnia dashboard for inclusion in the audit file if needed.
- Importantly, colors and design are chosen for clarity: Omnia uses consistent semantics (e.g. teal/blue for analytics, red for high-risk flags, green for clean signals), so an executive reviewer can immediately grasp the situation. For instance, a red segment in a pie chart might highlight *“High Risk Flags”*, whereas a large green area might show *“Normalized Entries”*.

## 12. Copying an Existing JE Workflow (Page 37)

Finally, Omnia supports duplicating an existing JE analytic into another engagement. To do this:
- Open the completed JE analytic, click the **Options** menu, and choose **Copy** (or *Copy to Workspace*).
- Select the target engagement/workspace to receive the copy.
- Omnia will duplicate the configuration (entities, periods, exclusions, enabled tests, parameters, and even resolved tickmarks).  
- After copying, the team should remove or update old tickmarks/conclusions, adjust dates/parameters for the new period, and then rerun tests as usual.

This facilitates efficiency when the same controls and risk criteria apply across audits or periods.

---

**In summary**, the Omnia JE workflow is a structured process that mirrors professional journal-entry testing practice. Each stage has clear inputs, actions, and outputs:

- **Data Input:** Journal entries, TB, CoA, Calendar.
- **Processing Steps:** Data validation, exclusion filtering, test configuration.
- **Test Runs:** Automated analytics covering multiple fraud indicators (account usage, text keywords, timing, rounding, etc.).
- **Results Presentation:** Rich visual dashboards and detailed exception tables.
- **Audit Outputs:** A fully documented set of flagged entries, tickmarks, and conclusions. 

All of these components—the counts, charts, and notes—are built from the actual supplied data and audit logic, ensuring that the **audit team’s report** is exhaustive and evidence-based. 

