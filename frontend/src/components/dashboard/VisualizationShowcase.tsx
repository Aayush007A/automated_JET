/**
 * VisualizationShowcase
 *
 * Premium Executive "Visualizations & Insights" showcase suite.
 * Built with dedicated, native vector-rendered interactive charts for ALL 12 categories.
 * Compact executive proportions, direction-aware animations, and Deloitte design system standards.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  TrendingUp,
  Shield,
  ShieldCheck,
  BarChart3,
  GitBranch,
  PieChart,
  Activity,
  Users,
  Lock,
  Calendar,
  DollarSign,
  Copy,
  FileText,
  AlertTriangle,
  Grid,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   12 ANALYTICAL CATEGORIES DATA
───────────────────────────────────────────────────────────────────────── */

export interface VisualizationCategory {
  id: string;
  num: string;
  category: string;
  shortLabel: string;
  badge: string;
  icon: React.ElementType;
  title: string;
  whatItShows: string;
  description: string;
  insight: string;
  analyticalMethod: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metricLabel: string;
  metricValue: string;
}

const CATEGORIES: VisualizationCategory[] = [
  {
    id: '01_account_wise',
    num: '01',
    category: 'Account Wise Analysis',
    shortLabel: '01. Account Wise',
    badge: 'Summary 1 · Ex 01 Exception',
    icon: Layers,
    title: 'Account Activity Distribution & Line Debit Exposure',
    whatItShows: 'Dual visualization: Standard vs. Non-Standard lines per GL account paired with Financial Statement Line Debit Exposure donut.',
    description: 'Classifies all journal lines by GL account to separate standard ERP subledger batches from non-standard manual adjustments across critical balance sheet segments.',
    insight: 'Accounts with over 15% non-standard volume in liquid asset segments indicate override risk and are prioritized for substantive testing.',
    analyticalMethod: 'Standard vs Non-Standard Line Classification',
    riskLevel: 'HIGH',
    metricLabel: 'Debit Coverage',
    metricValue: '6 GL Segments',
  },
  {
    id: '02_revenue_debits',
    num: '02',
    category: 'Large Debits to Revenue',
    shortLabel: '02. Revenue Debits',
    badge: 'Summary 2 · Ex 03 Exception',
    icon: TrendingDown,
    title: 'Unusual Revenue Debit Outliers & Top Account Impact',
    whatItShows: 'Monetary debit ranking across revenue accounts vs. materiality threshold with variance clustering.',
    description: 'Screens the revenue cycle for irregular debit postings that directly reduce recognized gross revenue, identifying potential unauthorized write-offs or rebate manipulations.',
    insight: 'Debit entries booked to Top-line Sales accounts within 5 days of quarter-end exceeding $250k require mandatory contract confirmation.',
    analyticalMethod: 'Revenue Debit Threshold Stratification',
    riskLevel: 'CRITICAL',
    metricLabel: 'Materiality Cut',
    metricValue: '>$250,000 Threshold',
  },
  {
    id: '03_user_wise',
    num: '03',
    category: 'User Wise Analysis',
    shortLabel: '03. User Wise',
    badge: 'Summary 3 · Ex 04 Exception',
    icon: Users,
    title: 'User Posting Value Distribution & Segregation of Duties',
    whatItShows: 'Monetary posting distribution across user profiles + risk classification (Admin/Temp vs Operations vs Batch).',
    description: 'Analyzes preparer and approver identities across the journal population to isolate administrative super-users and temporary external accounts posting high-value entries.',
    insight: '17% of total monetary value posted by USR_SYS_ADMIN and USR_TEMP_AUDIT without documented secondary approval indicates SOD deficiency.',
    analyticalMethod: 'User Role & Authorization Profiling',
    riskLevel: 'HIGH',
    metricLabel: 'Risk Exposure',
    metricValue: '17% Admin/Temp Postings',
  },
  {
    id: '04_closing_entries',
    num: '04',
    category: 'Closing Entries Analysis',
    shortLabel: '04. Closing Entries',
    badge: 'Summary 4 · Ex 06 Exception',
    icon: Lock,
    title: 'Period-End Closing Adjustments & Financial Statement Impact',
    whatItShows: 'Financial Statement effect breakdown (Increase in Expense 45%, Assets 23%, Liab 17%) + Post-period timing trajectory.',
    description: 'Isolates entries booked during the critical fiscal closing window (Day -1 to +8) and evaluates their net P&L and balance sheet reallocation magnitude.',
    insight: 'Late closing adjustments shifting $8.4M into Expense accounts booked with weak descriptions represent high risk for earnings smoothing.',
    analyticalMethod: 'Fiscal Cut-Off Window Stratification',
    riskLevel: 'HIGH',
    metricLabel: 'Closing Impact',
    metricValue: '4 Financial Lines',
  },
  {
    id: '05_dates_interest',
    num: '05',
    category: 'Dates of Interest & Holidays',
    shortLabel: '05. Dates of Interest',
    badge: 'Summary 5 · Ex 07 Exception',
    icon: Calendar,
    title: 'Off-Hours, Weekend & Public Holiday Posting Velocity',
    whatItShows: 'Time-series volume velocity curve mapping weekend and holiday postings against standard business day baseline.',
    description: 'Monitors transactions recorded on non-working days, statutory holidays, and off-hour periods when supervision and automated controls are reduced.',
    insight: 'A spike of 382 journal entries posted on Sunday midnight preceding fiscal cut-off warrants targeted forensic authorization verification.',
    analyticalMethod: 'Non-Business Calendar Temporal Screening',
    riskLevel: 'MEDIUM',
    metricLabel: 'Off-Hours Volume',
    metricValue: '382 Flagged Entries',
  },
  {
    id: '06_amount_analysis',
    num: '06',
    category: 'Amount & Round Dollar Analysis',
    shortLabel: '06. Amount Analysis',
    badge: 'Summary 6 · Ex 08 Exception',
    icon: DollarSign,
    title: 'Benford’s Law Digit Conformance & Round Dollar Multiples',
    whatItShows: 'Benford’s Law 1–9 first-digit logarithmic curve vs. actuals + round dollar clustering ($1k, $5k, $10k, $100k).',
    description: 'Tests mathematical naturalness of the journal population using Benford’s Law first-digit analysis alongside exact round dollar threshold screening.',
    insight: 'Benford’s Law conformity index of 96% confirms natural transaction spread, with minor clustering observed in $50k round sum provisions.',
    analyticalMethod: 'Benford First-Digit & Round Density',
    riskLevel: 'LOW',
    metricLabel: 'Benford Score',
    metricValue: '96% (Grade A)',
  },
  {
    id: '07_duplicate_entries',
    num: '07',
    category: 'Duplicate Journal Entries',
    shortLabel: '07. Duplicate Analysis',
    badge: 'Summary 7 · Ex 09 Exception',
    icon: Copy,
    title: 'Exact & Near-Duplicate Transaction Clusters',
    whatItShows: 'Density distribution of duplicate postings matched on identical Amount, Account, Date, and Description parameters.',
    description: 'Identifies potential double-counting, accidental re-postings, or deliberate duplicate entries designed to circumvent approval limits.',
    insight: '214 duplicate entry pairs identified with identical debit/credit sums posted within 48 hours of original subledger batches.',
    analyticalMethod: 'Multi-Parameter Near-Exact Matching',
    riskLevel: 'HIGH',
    metricLabel: 'Duplicate Count',
    metricValue: '214 Matched Pairs',
  },
  {
    id: '08_word_count',
    num: '08',
    category: 'High-Risk Word Count',
    shortLabel: '08. Word Count',
    badge: 'Summary 8 · Ex 10 Exception',
    icon: FileText,
    title: 'Sensitive Keyword Density & Risk Severity Stratification',
    whatItShows: 'Monitored keyword frequency ("Manual", "Adjust", "Override", "Fraud", "Plug", "Suspense") + Risk Severity Donut.',
    description: 'Scans journal header narrations and line descriptions against Deloitte’s forensic dictionary to detect subjective or high-risk terminology.',
    insight: 'Keywords categorized as High Risk ("Fraud", "Plug", "Override") represent 7% of flagged entries totaling $6.98M in debit volume.',
    analyticalMethod: 'Forensic Lexical Pattern Scanning',
    riskLevel: 'CRITICAL',
    metricLabel: 'High-Risk Keywords',
    metricValue: '7 Flagged Terms',
  },
  {
    id: '09_post_closing',
    num: '09',
    category: 'After Closing Entries',
    shortLabel: '09. After Closing',
    badge: 'Summary 9 · Ex 11 Exception',
    icon: AlertTriangle,
    title: 'Post-Cutoff Journal Entry Velocity & Audit Cutoff Integrity',
    whatItShows: 'Timeline distribution of late adjustments recorded after initial ledger freeze date.',
    description: 'Evaluates entries booked subsequent to the official trial balance freeze date to detect late unapproved adjustments affecting audited financial balances.',
    insight: '98,724 post-closing lines detected with significant concentration in period-end tax and inventory revaluation accounts.',
    analyticalMethod: 'Post-Close Timestamp Boundary Analysis',
    riskLevel: 'HIGH',
    metricLabel: 'Post-Close Lines',
    metricValue: '98.7k Entries',
  },
  {
    id: '10_unrelated_accounts',
    num: '10',
    category: 'Unrelated Account Combinations',
    shortLabel: '10. Unrelated Accounts',
    badge: 'Summary 10 · Ex 12 Exception',
    icon: Grid,
    title: 'Atypical Cross-Ledger Postings & Account Matrix Anomalies',
    whatItShows: 'Matrix of unusual debit/credit pairings bridging disparate financial statement categories (e.g. Cash vs Equity).',
    description: 'Detects unusual journal lines that cross unrelated chart of account boundaries that have no legitimate operational business nexus.',
    insight: '128 entries linking Cash directly to Non-Operating Equity without intermediary clearing accounts flagged for substantive substantiation.',
    analyticalMethod: 'Account Association Heatmap Matrix',
    riskLevel: 'HIGH',
    metricLabel: 'Anomalous Pairs',
    metricValue: '128 Flagged Postings',
  },
  {
    id: '11_population_stats',
    num: '11',
    category: 'Population Statistics',
    shortLabel: '11. Population Stats',
    badge: 'Summary 11 · Period Analysis',
    icon: Activity,
    title: 'Period-Wise Monetary Trajectory & Monthly Volume Breakdown',
    whatItShows: 'Smooth P1–P12 Local Currency Activity Trajectory line + Monthly Standard vs Non-Standard volume grouped bars.',
    description: 'Visualizes the 12-month baseline operational tempo across the entire general ledger population, exposing seasonality and period-end processing spikes.',
    insight: 'Sharp upward spike in P12 non-standard entries exceeding $8.3M demonstrates high fiscal year-end pressure entries requiring focused review.',
    analyticalMethod: 'Longitudinal Fiscal Trend Analysis',
    riskLevel: 'HIGH',
    metricLabel: 'Temporal Scope',
    metricValue: '12 Fiscal Periods',
  },
  {
    id: '12_forensic_radar',
    num: '12',
    category: 'Forensic Intelligence Vectors',
    shortLabel: '12. Forensic Radar',
    badge: 'Executive Risk DNA · Multi-Vector',
    icon: TrendingUp,
    title: 'Accounting Behavior Vector Comparison & Forensic Radar',
    whatItShows: '6-axis Radar chart comparing Client Risk DNA vs. Industry Peer Median across 6 behavioral dimensions.',
    description: 'Multi-dimensional evaluation benchmarking the client against Manufacturing & Industrial peer medians across Manual Overrides, Off-Hours, Closing Rush, and Benford conformity.',
    insight: 'Closing Concentration at 40.2% (+25.7% delta vs peer median) flagged as Primary Focus Area, while Benford Conformity confirms natural data spread.',
    analyticalMethod: 'Multi-Vector Behavioral Benchmarking',
    riskLevel: 'HIGH',
    metricLabel: 'Behavioral Vectors',
    metricValue: '6 Forensic Axes',
  },
];

const RISK_BADGES: Record<string, { color: string; bg: string; border: string }> = {
  LOW:      { color: '#007680', bg: '#E6F4F5', border: '#99D5D9' },
  MEDIUM:   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  HIGH:     { color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' },
  CRITICAL: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

/* ─────────────────────────────────────────────────────────────────────────
   CUSTOM VECTOR CHART PRESENTATION ENGINES (ALL 12 CATEGORIES)
───────────────────────────────────────────────────────────────────────── */

const VectorChartCanvas: React.FC<{ categoryId: string }> = ({ categoryId }) => {
  switch (categoryId) {
    case '01_account_wise':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          {/* Left: Bar Chart */}
          <div style={{ flex: 1.1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Account Activity Distribution</span>
              <div style={{ display: 'flex', gap: '6px', fontSize: '0.58rem', color: '#64748B', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ width: 6, height: 6, background: '#007680', borderRadius: 2 }} />Std</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ width: 6, height: 6, background: '#38BDF8', borderRadius: 2 }} />Non-Std</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6px', paddingTop: '8px' }}>
              {[
                { label: 'Cash', std: 65, non: 15 },
                { label: 'AR', std: 95, non: 28 },
                { label: 'Inv', std: 80, non: 20 },
                { label: 'Accrued', std: 45, non: 12 },
                { label: 'Susp', std: 10, non: 22 },
                { label: 'Rev', std: 8, non: 32 },
              ].map((bar, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end', height: '80%' }}>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${bar.std}%` }} transition={{ duration: 0.4, delay: i * 0.04 }} style={{ flex: 1, background: '#007680', borderRadius: '2px 2px 0 0' }} />
                    <motion.div initial={{ height: 0 }} animate={{ height: `${bar.non}%` }} transition={{ duration: 0.4, delay: i * 0.04 + 0.08 }} style={{ flex: 1, background: '#38BDF8', borderRadius: '2px 2px 0 0' }} />
                  </div>
                  <span style={{ fontSize: '0.55rem', color: '#64748B' }}>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Donut Chart with Callouts */}
          <div style={{ flex: 0.9, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Debit Line Exposure</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="36" fill="transparent" stroke="#E2E8F0" strokeWidth="15" />
                <motion.circle cx="50" cy="50" r="36" fill="transparent" stroke="#007680" strokeWidth="15" strokeDasharray="90 226" strokeDashoffset="0" initial={{ strokeDashoffset: 226 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.5 }} />
                <motion.circle cx="50" cy="50" r="36" fill="transparent" stroke="#0284C7" strokeWidth="15" strokeDasharray="63 226" strokeDashoffset="-90" initial={{ strokeDashoffset: 226 }} animate={{ strokeDashoffset: -90 }} transition={{ duration: 0.5, delay: 0.1 }} />
                <motion.circle cx="50" cy="50" r="36" fill="transparent" stroke="#F59E0B" strokeWidth="15" strokeDasharray="45 226" strokeDashoffset="-153" initial={{ strokeDashoffset: 226 }} animate={{ strokeDashoffset: -153 }} transition={{ duration: 0.5, delay: 0.2 }} />
                <motion.circle cx="50" cy="50" r="36" fill="transparent" stroke="#10B981" strokeWidth="15" strokeDasharray="27 226" strokeDashoffset="-198" initial={{ strokeDashoffset: 226 }} animate={{ strokeDashoffset: -198 }} transition={{ duration: 0.5, delay: 0.3 }} />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>100%</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', fontSize: '0.55rem', fontWeight: 600 }}>
              <span style={{ color: '#007680' }}>● Receiv 40%</span>
              <span style={{ color: '#0284C7' }}>● Finished 28%</span>
              <span style={{ color: '#F59E0B' }}>● Cash 20%</span>
              <span style={{ color: '#10B981' }}>● Accrued 12%</span>
            </div>
          </div>
        </div>
      );

    case '02_revenue_debits':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          <div style={{ flex: 1.2, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Top Revenue Debit Postings</span>
              <span style={{ fontSize: '0.58rem', color: '#E11D48', fontWeight: 700 }}>Cutoff: $250k</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
              {[
                { acc: '4010 - Sales Revenue (Commercial)', amt: '$1,420,000', pct: 95, col: '#E11D48' },
                { acc: '4020 - Service Contracts', amt: '$890,000', pct: 68, col: '#E11D48' },
                { acc: '4050 - Subscription Revenue', amt: '$430,000', pct: 40, col: '#D97706' },
                { acc: '4090 - Product Licensing', amt: '$280,000', pct: 28, col: '#007680' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#334155', fontWeight: 600 }}>
                    <span>{item.acc}</span>
                    <span style={{ fontWeight: 800, color: item.col }}>{item.amt}</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 0.5, delay: i * 0.08 }} style={{ height: '100%', background: item.col, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 0.8, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Quarter-End Timing</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, justifyContent: 'center' }}>
              <div style={{ padding: '6px', borderRadius: '6px', background: '#FFF1F2', border: '1px solid #FECDD3', textAlign: 'center' }}>
                <span style={{ fontSize: '0.58rem', color: '#64748B', display: 'block' }}>Within 5 Days of Close</span>
                <span style={{ fontSize: '0.90rem', fontWeight: 900, color: '#E11D48' }}>92.4% Volume</span>
              </div>
              <div style={{ padding: '6px', borderRadius: '6px', background: '#F0F9FF', border: '1px solid #BAE6FD', textAlign: 'center' }}>
                <span style={{ fontSize: '0.58rem', color: '#64748B', display: 'block' }}>Mandatory Confirmation</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0284C7' }}>18 Sample Vouchers</span>
              </div>
            </div>
          </div>
        </div>
      );

    case '03_user_wise':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          <div style={{ flex: 1.1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>User Posting Value ($)</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6px', paddingTop: '8px' }}>
              {[
                { u: 'BATCH_AUTO', amt: '$42.8M', h: 90, color: '#007680' },
                { u: 'ACC_1', amt: '$18.5M', h: 48, color: '#0284C7' },
                { u: 'SYS_ADMIN', amt: '$9.4M', h: 28, color: '#E11D48' },
                { u: 'TEMP_AUDIT', amt: '$3.1M', h: 14, color: '#F59E0B' },
              ].map((user, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '3px' }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${user.h}%` }} transition={{ duration: 0.4, delay: i * 0.05 }} style={{ width: '100%', background: user.color, borderRadius: '3px 3px 0 0' }} />
                  <span style={{ fontSize: '0.52rem', color: '#64748B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '38px' }}>{user.u}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 0.9, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>User Risk Profile</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center', flex: 1 }}>
              <div style={{ padding: '5px 7px', borderRadius: '5px', background: '#FFF1F2', display: 'flex', justifyContent: 'space-between', fontSize: '0.60rem', fontWeight: 700, color: '#E11D48' }}>
                <span>Admin / Temp</span><span>17% ($12.6M)</span>
              </div>
              <div style={{ padding: '5px 7px', borderRadius: '5px', background: '#F0F9FF', display: 'flex', justifyContent: 'space-between', fontSize: '0.60rem', fontWeight: 700, color: '#0284C7' }}>
                <span>Standard Ops</span><span>25% ($18.5M)</span>
              </div>
              <div style={{ padding: '5px 7px', borderRadius: '5px', background: '#E6F4F5', display: 'flex', justifyContent: 'space-between', fontSize: '0.60rem', fontWeight: 700, color: '#007680' }}>
                <span>Automated Feeds</span><span>58% ($42.8M)</span>
              </div>
            </div>
          </div>
        </div>
      );

    case '04_closing_entries':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          <div style={{ flex: 1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Financial Statement Effect</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
              {[
                { name: 'Increase in Expense', pct: '45%', color: '#E11D48', bg: '#FFF1F2' },
                { name: 'Increase in Assets', pct: '23%', color: '#007680', bg: '#E6F4F5' },
                { name: 'Decrease in Liab', pct: '17%', color: '#0284C7', bg: '#F0F9FF' },
                { name: 'Decrease in Revenue', pct: '10%', color: '#F59E0B', bg: '#FFFBEB' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: item.bg, fontSize: '0.58rem', fontWeight: 700, color: item.color }}>
                  <span>{item.name}</span>
                  <span>{item.pct}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Post-Cutoff Timing Profile</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '5px', paddingTop: '8px' }}>
              {[
                { d: 'Day -1/0', val: 95, col: '#E11D48' },
                { d: 'Day +1/+3', val: 45, col: '#F59E0B' },
                { d: 'Day +4/+7', val: 20, col: '#0284C7' },
                { d: 'Day +8+', val: 10, col: '#007680' },
              ].map((bar, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '3px' }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${bar.val}%` }} transition={{ duration: 0.4, delay: i * 0.05 }} style={{ width: '100%', background: bar.col, borderRadius: '2px 2px 0 0' }} />
                  <span style={{ fontSize: '0.52rem', color: '#64748B' }}>{bar.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case '05_dates_interest':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          {/* Left: Weekday vs Weekend Heatmap Grid */}
          <div style={{ flex: 1.1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Calendar Posting Density</span>
              <span style={{ fontSize: '0.58rem', color: '#E11D48', fontWeight: 700 }}>Spike: 382 Lines</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '6px 0', flex: 1, alignItems: 'center' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <span style={{ fontSize: '0.54rem', fontWeight: 700, color: i >= 5 ? '#E11D48' : '#64748B' }}>{d}</span>
                  <div style={{ width: '100%', height: '24px', borderRadius: '3px', background: i === 6 ? '#E11D48' : i === 5 ? '#F59E0B' : '#E6F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.50rem', fontWeight: 800, color: i >= 5 ? '#FFFFFF' : '#007680' }}>
                      {i === 6 ? '382' : i === 5 ? '94' : '22'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.54rem', color: '#64748B', textAlign: 'center' }}>Sunday Midnight / Holiday Concentration Flagged</span>
          </div>

          {/* Right: Off-Hours Velocity Curve */}
          <div style={{ flex: 0.9, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Hourly Posting Velocity</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100%" height="70" viewBox="0 0 160 70">
                <path d="M 10 55 Q 40 50 60 58 T 90 20 T 130 52 T 150 15" fill="none" stroke="#E11D48" strokeWidth="2" />
                <circle cx="150" cy="15" r="3" fill="#E11D48" />
                <circle cx="90" cy="20" r="3" fill="#007680" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.54rem', color: '#94A3B8' }}>
              <span>8 AM</span><span>12 PM</span><span>6 PM</span><span style={{ color: '#E11D48', fontWeight: 700 }}>12 AM (Peak)</span>
            </div>
          </div>
        </div>
      );

    case '06_amount_analysis':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          {/* Left: Benford's Law 1-9 Curve */}
          <div style={{ flex: 1.1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Benford’s Law (Digits 1–9)</span>
              <span style={{ fontSize: '0.58rem', color: '#16A34A', fontWeight: 700 }}>96% Grade A</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '4px', paddingTop: '6px' }}>
              {[
                { d: '1', ben: 30.1, act: 31.2 }, { d: '2', ben: 17.6, act: 16.9 },
                { d: '3', ben: 12.5, act: 13.1 }, { d: '4', ben: 9.7, act: 9.2 },
                { d: '5', ben: 7.9, act: 8.4 }, { d: '6', ben: 6.7, act: 6.1 },
                { d: '7', ben: 5.8, act: 5.4 }, { d: '8', ben: 5.1, act: 5.0 },
                { d: '9', ben: 4.6, act: 4.7 },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '2px' }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${item.act * 2.5}%` }} transition={{ duration: 0.35, delay: i * 0.03 }} style={{ width: '100%', background: '#007680', borderRadius: '2px 2px 0 0' }} />
                  <span style={{ fontSize: '0.52rem', color: '#64748B' }}>{item.d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Round Dollar Multiples */}
          <div style={{ flex: 0.9, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Round Multiples Density</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
              {[
                { label: '$1,000 Multiples', count: '412 Lines', col: '#007680', bg: '#E6F4F5' },
                { label: '$10,000 Multiples', count: '184 Lines', col: '#0284C7', bg: '#F0F9FF' },
                { label: '$50,000 Multiples', count: '62 Lines', col: '#F59E0B', bg: '#FFFBEB' },
                { label: '$100,000+ Threshold', count: '19 Lines', col: '#E11D48', bg: '#FFF1F2' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderRadius: '4px', background: r.bg, fontSize: '0.58rem', fontWeight: 700, color: r.col }}>
                  <span>{r.label}</span>
                  <span>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case '07_duplicate_entries':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          {/* Left: Duplicate Match Breakdown */}
          <div style={{ flex: 1.1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Duplicate Clusters Match</span>
              <span style={{ fontSize: '0.58rem', color: '#E11D48', fontWeight: 700 }}>214 Flagged Pairs</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                  <span>Exact Match (Amount + Acct + Date)</span>
                  <span style={{ color: '#E11D48' }}>142 Pairs (66%)</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: '66%' }} transition={{ duration: 0.5 }} style={{ height: '100%', background: '#E11D48' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                  <span>Near Match (Within 48h Window)</span>
                  <span style={{ color: '#D97706' }}>72 Pairs (34%)</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: '34%' }} transition={{ duration: 0.5, delay: 0.1 }} style={{ height: '100%', background: '#D97706' }} />
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.54rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '4px' }}>
              Potential double-count exposure: <strong>$4.20M</strong>
            </span>
          </div>

          {/* Right: Time Window Distribution */}
          <div style={{ flex: 0.9, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Repetition Time Window</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
              <div style={{ padding: '5px', borderRadius: '4px', background: '#FFF1F2', textAlign: 'center' }}>
                <span style={{ fontSize: '0.54rem', color: '#64748B', display: 'block' }}>Same Day Reposting</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#E11D48' }}>65% Concentration</span>
              </div>
              <div style={{ padding: '5px', borderRadius: '4px', background: '#F0F9FF', textAlign: 'center' }}>
                <span style={{ fontSize: '0.54rem', color: '#64748B', display: 'block' }}>Subledger Retry Batch</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284C7' }}>25% Lag Window</span>
              </div>
            </div>
          </div>
        </div>
      );

    case '08_word_count':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          <div style={{ flex: 1.1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Monitored Keyword Frequency</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '5px', paddingTop: '8px' }}>
              {[
                { kw: 'Manual', count: 210, col: '#0284C7' },
                { kw: 'Adjust', count: 145, col: '#007680' },
                { kw: 'Override', count: 38, col: '#E11D48' },
                { kw: 'Suspense', count: 18, col: '#F59E0B' },
                { kw: 'Plug', count: 7, col: '#E11D48' },
                { kw: 'Fraud', count: 4, col: '#7C3AED' },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '3px' }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(95, (item.count / 210) * 90 + 10)}%` }} transition={{ duration: 0.4, delay: i * 0.04 }} style={{ width: '100%', background: item.col, borderRadius: '2px 2px 0 0' }} />
                  <span style={{ fontSize: '0.50rem', color: '#64748B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '34px' }}>{item.kw}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 0.9, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Severity Stratification</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, justifyContent: 'center' }}>
              <div style={{ padding: '5px 7px', borderRadius: '5px', background: '#FFF1F2', display: 'flex', justifyContent: 'space-between', fontSize: '0.60rem', fontWeight: 700, color: '#E11D48' }}>
                <span>High Risk (Fraud/Plug)</span><span>7% ($6.98M)</span>
              </div>
              <div style={{ padding: '5px 7px', borderRadius: '5px', background: '#FFFBEB', display: 'flex', justifyContent: 'space-between', fontSize: '0.60rem', fontWeight: 700, color: '#D97706' }}>
                <span>Medium (Suspense)</span><span>22% ($2.18M)</span>
              </div>
              <div style={{ padding: '5px 7px', borderRadius: '5px', background: '#F0F9FF', display: 'flex', justifyContent: 'space-between', fontSize: '0.60rem', fontWeight: 700, color: '#0284C7' }}>
                <span>Informational</span><span>71% ($16.4M)</span>
              </div>
            </div>
          </div>
        </div>
      );

    case '09_post_closing':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          {/* Left: Timeline Curve post freeze */}
          <div style={{ flex: 1.1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Post-Freeze Journal Timeline</span>
              <span style={{ fontSize: '0.58rem', color: '#E11D48', fontWeight: 700 }}>98.7k Entries</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100%" height="70" viewBox="0 0 180 70">
                <motion.path d="M 10 60 Q 40 55 70 58 T 100 20 T 140 45 T 175 10" fill="none" stroke="#E11D48" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
                <circle cx="100" cy="20" r="3.5" fill="#E11D48" />
                <circle cx="175" cy="10" r="3.5" fill="#E11D48" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.54rem', color: '#94A3B8' }}>
              <span>Freeze Date</span><span>Day +7</span><span style={{ color: '#E11D48', fontWeight: 700 }}>Day +14 (Audit Spike)</span><span>Day +30</span>
            </div>
          </div>

          {/* Right: Post-closing Account Distribution */}
          <div style={{ flex: 0.9, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Late Adjustment Impact</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
              {[
                { acc: 'Tax Provisions', amt: '$3.8M', col: '#E11D48', bg: '#FFF1F2' },
                { acc: 'Inventory Valuation', amt: '$2.9M', col: '#D97706', bg: '#FFFBEB' },
                { acc: 'Accrued Bonuses', amt: '$1.7M', col: '#007680', bg: '#E6F4F5' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderRadius: '4px', background: row.bg, fontSize: '0.58rem', fontWeight: 700, color: row.col }}>
                  <span>{row.acc}</span>
                  <span>{row.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case '10_unrelated_accounts':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          {/* Left: 4x4 Heatmap Matrix */}
          <div style={{ flex: 1.1, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Cross-Ledger Pairing Matrix</span>
              <span style={{ fontSize: '0.58rem', color: '#E11D48', fontWeight: 700 }}>128 Outliers</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', flex: 1, padding: '4px 0', alignItems: 'center' }}>
              {[
                { label: 'Asset/Liab', alert: false, col: '#E6F4F5' },
                { label: 'Asset/Rev', alert: false, col: '#F0F9FF' },
                { label: 'Asset/Eq', alert: true, col: '#FFF1F2' },
                { label: 'Liab/Exp', alert: false, col: '#E6F4F5' },
                { label: 'Rev/Exp', alert: false, col: '#F0F9FF' },
                { label: 'Cash/Eq', alert: true, col: '#FFE4E6' },
                { label: 'Liab/Eq', alert: false, col: '#F8FAFC' },
                { label: 'Susp/Rev', alert: true, col: '#FEF3C7' },
              ].map((cell, i) => (
                <div key={i} style={{ background: cell.col, borderRadius: '4px', padding: '4px 2px', textAlign: 'center', border: cell.alert ? '1px solid #FECDD3' : '1px solid transparent' }}>
                  <span style={{ fontSize: '0.52rem', fontWeight: 700, color: cell.alert ? '#E11D48' : '#475569', display: 'block' }}>{cell.label}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.54rem', color: '#64748B', textAlign: 'center' }}>Atypical pairings bridging disparate COA branches</span>
          </div>

          {/* Right: Outlier Detail Card */}
          <div style={{ flex: 0.9, height: '100%', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Primary Anomaly Focus</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, justifyContent: 'center' }}>
              <div style={{ padding: '6px', borderRadius: '5px', background: '#FFF1F2', border: '1px solid #FECDD3' }}>
                <span style={{ fontSize: '0.54rem', color: '#64748B', display: 'block' }}>Direct Cash ↔ Non-Operating Equity</span>
                <span style={{ fontSize: '0.80rem', fontWeight: 900, color: '#E11D48' }}>128 Postings ($840k)</span>
              </div>
              <div style={{ padding: '5px', borderRadius: '5px', background: '#E6F4F5', textAlign: 'center' }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#007680' }}>Mandatory Ledger Audit Flag</span>
              </div>
            </div>
          </div>
        </div>
      );

    case '11_population_stats':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          {/* Left: Activity Trajectory Line */}
          <div style={{ flex: 1.1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Activity Trajectory (P1–P12)</span>
              <span style={{ fontSize: '0.58rem', color: '#007680', fontWeight: 700 }}>Local Currency ($)</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100%" height="75" viewBox="0 0 240 75" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007680" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#007680" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <motion.path d="M 10 50 Q 35 55 55 40 T 100 42 T 140 28 T 180 44 T 210 18 T 235 5" fill="none" stroke="#007680" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }} />
                <path d="M 10 50 Q 35 55 55 40 T 100 42 T 140 28 T 180 44 T 210 18 T 235 5 L 235 70 L 10 70 Z" fill="url(#lineGrad)" />
                <circle cx="235" cy="5" r="3.5" fill="#007680" />
                <circle cx="140" cy="28" r="3" fill="#007680" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.54rem', color: '#94A3B8' }}>
              <span>P1</span><span>P3</span><span>P6</span><span>P9</span><span>P12 (Spike: $8.5M)</span>
            </div>
          </div>

          {/* Right: Monthly Volume Bars */}
          <div style={{ flex: 0.9, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Monthly Volume Profile</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '4px', paddingTop: '8px' }}>
              {[
                { p: 'P1', val: 45 }, { p: 'P3', val: 52 }, { p: 'P6', val: 68 },
                { p: 'P9', val: 78 }, { p: 'P11', val: 60 }, { p: 'P12', val: 95 }
              ].map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '2px' }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${m.val}%` }} transition={{ duration: 0.4, delay: i * 0.04 }} style={{ width: '100%', background: i === 5 ? '#007680' : '#0284C7', borderRadius: '2px 2px 0 0' }} />
                  <span style={{ fontSize: '0.52rem', color: '#64748B' }}>{m.p}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.54rem', color: '#64748B', fontWeight: 600, borderTop: '1px solid #F1F5F9', paddingTop: '3px' }}>
              <span>Standard: 88%</span>
              <span style={{ color: '#007680' }}>P12: +34%</span>
            </div>
          </div>
        </div>
      );

    case '12_forensic_radar':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '12px', alignItems: 'center', padding: '10px' }}>
          {/* Left: 6-Axis Radar */}
          <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#FFFFFF', borderRadius: '8px', padding: '8px 10px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#0F172A' }}>Behavior Vector Radar</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg width="120" height="100" viewBox="0 0 120 100">
                <polygon points="60,10 100,30 100,70 60,90 20,70 20,30" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                <polygon points="60,25 85,38 85,62 60,75 35,62 35,38" fill="none" stroke="#F1F5F9" strokeWidth="1" />
                <polygon points="60,28 88,40 82,65 60,72 38,62 40,38" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3" />
                <motion.polygon
                  points="60,15 95,35 88,68 60,86 28,66 32,32"
                  fill="rgba(0,118,128,0.22)"
                  stroke="#007680"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '0.54rem', fontWeight: 600 }}>
              <span style={{ color: '#007680' }}>● Client DNA</span>
              <span style={{ color: '#94A3B8' }}>-- Peer Median</span>
            </div>
          </div>

          {/* Right: Vector KPI Cards */}
          <div style={{ flex: 1, height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', overflow: 'hidden' }}>
            {[
              { title: 'Manual Override', val: '14.8%', delta: '+3.6% delta', color: '#D97706', bg: '#FFFBEB' },
              { title: 'Closing Rush', val: '40.2%', delta: '+25.7% Focus', color: '#E11D48', bg: '#FFF1F2' },
              { title: 'Benford Fit', val: '96%', delta: 'Grade A', color: '#16A34A', bg: '#F0FDF4' },
              { title: 'Off-Hours', val: '0.4%', delta: '-2.0% delta', color: '#007680', bg: '#E6F4F5' },
            ].map((kpi, i) => (
              <div key={i} style={{ background: kpi.bg, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.54rem', color: '#475569', fontWeight: 600 }}>{kpi.title}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{kpi.val}</span>
                <span style={{ fontSize: '0.52rem', color: kpi.color, fontWeight: 700 }}>{kpi.delta}</span>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   MAIN SHOWCASE COMPONENT
───────────────────────────────────────────────────────────────────────── */

export const VisualizationShowcase: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  const current = useMemo(() => CATEGORIES[index], [index]);
  const total = CATEGORIES.length;

  const goTo = useCallback((targetIndex: number) => {
    if (targetIndex === index || targetIndex < 0 || targetIndex >= total) return;
    setDirection(targetIndex > index ? 1 : -1);
    setIndex(targetIndex);
  }, [index, total]);

  const goNext = useCallback(() => {
    if (index < total - 1) {
      setDirection(1);
      setIndex(index + 1);
    }
  }, [index, total]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex(index - 1);
    }
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sectionRef.current && document.activeElement && sectionRef.current.contains(document.activeElement)) {
        if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (tabListRef.current) {
      const activeBtn = tabListRef.current.querySelector(`[data-index="${index}"]`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [index]);

  const riskStyle = RISK_BADGES[current.riskLevel];
  const canPrev = index > 0;
  const canNext = index < total - 1;

  const IconComponent = current.icon;

  return (
    <motion.section
      ref={sectionRef}
      id="visualizations-insights-showcase"
      aria-label="Visualizations and Insights showcase"
      tabIndex={-1}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: '100%',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F5FAF8 40%, #EDF7F5 100%)',
        borderBottom: '1px solid #E2E8F0',
        padding: 'clamp(28px, 3.5vw, 42px) clamp(20px, 3.5vw, 48px)',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto', position: 'relative', zIndex: 2 }}>

        {/* ── Section Header Row (Compact & High Impact) ── */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '18px',
        }}>
          <div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(0, 163, 173, 0.10)',
                border: '1px solid rgba(0, 118, 128, 0.18)',
                color: '#007680',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}>
                <Sparkles size={12} />
                Client-Ready Visualizations &amp; Exception Analytics Showcase
              </span>
            </div>
            <h2 style={{
              fontSize: 'clamp(1.65rem, 2.3vw, 2.15rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              margin: 0,
            }}>
              Visualizations &amp; Insights.{' '}
              <span style={{ color: '#007680' }}>Understand every audit category.</span>
            </h2>
          </div>

          <p style={{
            fontSize: '0.82rem',
            color: '#64748B',
            lineHeight: 1.45,
            maxWidth: '380px',
            margin: 0,
          }}>
            Explore real interactive visual workpapers generated across all 12 analytical categories, Trial Balance checkpoints, and forensic risk matrices.
          </p>
        </div>

        {/* ── 12-Category Scrollable Tab Strip (Compact & Crisp) ── */}
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Audit category tabs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '16px',
            scrollbarWidth: 'none',
          }}
        >
          {CATEGORIES.map((item, i) => {
            const isActive = i === index;
            const TabIcon = item.icon;
            return (
              <button
                key={item.id}
                data-index={i}
                role="tab"
                aria-selected={isActive}
                onClick={() => goTo(i)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: isActive ? '6px 12px' : '6px 10px',
                  borderRadius: '8px',
                  border: isActive ? '1.5px solid #007680' : '1px solid #E2E8F0',
                  background: isActive ? '#007680' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(0, 118, 128, 0.22)' : 'none',
                  flexShrink: 0,
                  outline: 'none',
                }}
              >
                <TabIcon size={12} color={isActive ? '#FFFFFF' : '#007680'} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            COMPACT FIXED STAGE (Height 340px)
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '55fr 45fr',
          gap: '18px',
          alignItems: 'stretch',
          height: '340px',
        }}>

          {/* ────────────────────────────────────────────────────────
              LEFT — High-Precision Visual Monitor Frame
          ──────────────────────────────────────────────────────── */}
          <div style={{
            height: '100%',
            borderRadius: '14px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Monitor Chrome Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FC5756' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FDBC40' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C84A' }} />
              </div>

              <div style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: '#007680',
                fontFamily: 'monospace',
                background: '#E6F4F5',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #99D5D9',
              }}>
                {current.badge}
              </div>

              <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748B', fontFamily: 'monospace' }}>
                {current.num} / 12
              </span>
            </div>

            {/* Live Chart Canvas Area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#F8FAFC' }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 25 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <VectorChartCanvas categoryId={current.id} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
              RIGHT — Compact Editorial Insight Panel
          ──────────────────────────────────────────────────────── */}
          <div style={{
            height: '100%',
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 6px 18px -4px rgba(15, 23, 42, 0.04)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current.id + '-panel'}
                custom={direction}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  {/* Category Pill + Number */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: '#E6F4F5',
                      border: '1px solid #99D5D9',
                      color: '#007680',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                    }}>
                      <IconComponent size={11} />
                      {current.category}
                    </span>

                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#007680', fontFamily: 'monospace' }}>
                      #{current.num}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '1.08rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    margin: '0 0 6px',
                  }}>
                    {current.title}
                  </h3>

                  {/* Blueprint Summary Box */}
                  <div style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    marginBottom: '6px',
                  }}>
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Visualization Blueprint:
                    </span>
                    <p style={{ fontSize: '0.72rem', color: '#334155', lineHeight: 1.3, margin: '2px 0 0', fontWeight: 500 }}>
                      {current.whatItShows}
                    </p>
                  </div>

                  {/* Insight Callout */}
                  <div style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(0, 118, 128, 0.04)',
                    borderLeft: '3px solid #007680',
                    border: '1px solid rgba(0, 118, 128, 0.15)',
                    borderLeftWidth: '3px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <TrendingUp size={10} color="#007680" strokeWidth={2.5} />
                      <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase' }}>
                        Key Audit Insight
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#1E293B', lineHeight: 1.35, margin: 0, fontWeight: 500 }}>
                      {current.insight}
                    </p>
                  </div>
                </div>

                {/* Metadata Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', paddingTop: '8px' }}>
                  <div style={{ padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '0.62rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Shield size={8} color="#64748B" />
                    <span>{current.analyticalMethod}</span>
                  </div>

                  <div style={{ padding: '2px 6px', borderRadius: '4px', background: riskStyle.bg, border: `1px solid ${riskStyle.border}`, fontSize: '0.62rem', fontWeight: 800, color: riskStyle.color, textTransform: 'uppercase' }}>
                    {current.riskLevel} Risk
                  </div>

                  <div style={{ padding: '2px 6px', borderRadius: '4px', background: '#E6F4F5', border: '1px solid #99D5D9', fontSize: '0.62rem', fontWeight: 700, color: '#007680' }}>
                    {current.metricLabel}: <strong>{current.metricValue}</strong>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            COMPACT NAVIGATION CONTROLS
        ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '14px',
          padding: '0 2px',
        }}>
          {/* Left: Counter */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace', lineHeight: 1 }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: '0.80rem', color: '#94A3B8', fontFamily: 'monospace' }}>/ 12</span>
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#007680', paddingLeft: '8px', borderLeft: '1.5px solid #CBD5E1' }}>
              {current.category}
            </span>
          </div>

          {/* Center: Progress Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {CATEGORIES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to category ${i + 1}`}
                style={{
                  width: i === index ? 18 : 5,
                  height: 4,
                  borderRadius: 999,
                  border: 'none',
                  padding: 0,
                  backgroundColor: i === index ? '#007680' : '#CBD5E1',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  outline: 'none',
                }}
              />
            ))}
          </div>

          {/* Right: Previous & Next (Standard Deloitte Theme) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button
              onClick={goPrev}
              disabled={!canPrev}
              whileHover={canPrev ? { x: -2 } : {}}
              whileTap={canPrev ? { scale: 0.98 } : {}}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: canPrev ? '#FFFFFF' : '#F8FAFC',
                color: canPrev ? '#0F172A' : '#94A3B8',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: canPrev ? 'pointer' : 'not-allowed',
                outline: 'none',
              }}
            >
              <ChevronLeft size={13} strokeWidth={2.5} />
              Previous
            </motion.button>

            <motion.button
              onClick={goNext}
              disabled={!canNext}
              whileHover={canNext ? { x: 2 } : {}}
              whileTap={canNext ? { scale: 0.98 } : {}}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                background: canNext ? 'linear-gradient(135deg, #007680 0%, #004D54 100%)' : '#CBD5E1',
                color: '#FFFFFF',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: canNext ? 'pointer' : 'not-allowed',
                boxShadow: canNext ? '0 3px 10px rgba(0, 118, 128, 0.25)' : 'none',
                outline: 'none',
              }}
            >
              Next
              <ChevronRight size={13} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>

      </div>
    </motion.section>
  );
};

export default VisualizationShowcase;
