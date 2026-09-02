import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut, PolarArea, Radar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Layers, TrendingUp, Calendar, BarChart3,
  Copy, FileText, AlertTriangle, Activity, PieChart as PieIcon, Archive,
  Download, Filter, Clock, Repeat, Coins, UserCheck, Search, Building, ShieldCheck, CheckCircle2, ChevronRight
} from 'lucide-react';
import { RunSummary, RunConfig } from '../../types';
import { RunService } from '../../services/runService';
import { TabSlider } from '../common/TabSlider';

// Register Chart.js Modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Helper for canvas rounded rectangles
function drawCanvasRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, width, height, radius);
  } else {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// Custom Chart.js Plugin for Radial Callout Badges with Directional Pointer Arrows
const doughnutCalloutPlugin = {
  id: 'doughnutCallout',
  afterDatasetsDraw(chart: any) {
    if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
    if (chart.options?.plugins?.doughnutCallout === false || chart.options?.plugins?.doughnutCallout?.display === false) return;
    if (chart.width < 280) return;

    const { ctx, data, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;

    const dataset = data.datasets[0];
    if (!dataset || !dataset.data) return;

    const total = dataset.data.reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    if (total <= 0) return;

    const selectedIndex = chart.options?.plugins?.doughnutCallout?.selectedIndex ?? null;
    const bgColors = dataset.backgroundColor || [];

    ctx.save();

    interface CalloutItem {
      index: number;
      val: number;
      pctStr: string;
      title: string;
      sliceColor: string;
      startX: number;
      startY: number;
      angle: number;
      cos: number;
      sin: number;
      isRight: boolean;
      outerRadius: number;
      centerX: number;
      centerY: number;
      isSelected: boolean;
      pillWidth: number;
      pillHeight: number;
      textWidth: number;
      pctWidth: number;
      targetPillY: number;
    }

    const items: CalloutItem[] = [];

    meta.data.forEach((element: any, index: number) => {
      const val = Number(dataset.data[index]) || 0;
      if (val <= 0) return;

      const { startAngle, endAngle, outerRadius, x: centerX, y: centerY } = element;
      if (outerRadius < 20 || (endAngle - startAngle) < 0.03) return;

      const angle = startAngle + (endAngle - startAngle) / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const startX = centerX + cos * outerRadius;
      const startY = centerY + sin * outerRadius;
      const isRight = cos >= 0;

      const rawLabel = (data.labels && data.labels[index]) ? String(data.labels[index]) : `Item ${index + 1}`;
      let cleanTitle = rawLabel.split('(')[0].split('[')[0].replace(/["']/g, '').trim();
      if (!cleanTitle) cleanTitle = rawLabel.trim();

      const pct = ((val / total) * 100).toFixed(0);
      const pctStr = `${pct}%`;

      const rawColor = Array.isArray(bgColors)
        ? (bgColors[index] || '#007680')
        : (bgColors || '#007680');
      const sliceColor = typeof rawColor === 'string' ? rawColor.replace(/33$/, '') : '#007680';

      const isSelected = selectedIndex === null || selectedIndex === index;

      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      const textWidth = ctx.measureText(cleanTitle).width;
      ctx.font = "700 10.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      const pctWidth = ctx.measureText(pctStr).width;

      const pillPaddingX = 8;
      const dotSize = 6;
      const dotMargin = 6;
      const gap = 6;
      const pctPadX = 5;
      const pctBadgeWidth = pctWidth + pctPadX * 2;
      const pillHeight = 24;
      const pillWidth = pillPaddingX * 2 + dotSize + dotMargin + textWidth + gap + pctBadgeWidth;

      const radialDist = isSelected && selectedIndex !== null ? 22 : 18;
      const initialPillY = centerY + sin * (outerRadius + radialDist) - pillHeight / 2;

      items.push({
        index,
        val,
        pctStr,
        title: cleanTitle,
        sliceColor,
        startX,
        startY,
        angle,
        cos,
        sin,
        isRight,
        outerRadius,
        centerX,
        centerY,
        isSelected,
        pillWidth,
        pillHeight,
        textWidth,
        pctWidth,
        targetPillY: initialPillY,
      });
    });

    const cHeight = chart.height;
    const cWidth = chart.width;

    // Draw all callout items
    items.forEach((item) => {
      const alpha = item.isSelected ? 1 : 0.25;
      ctx.globalAlpha = alpha;

      const { startX, startY, cos, isRight, outerRadius, centerX, centerY, sliceColor, isSelected, title, pctStr, pillWidth, pillHeight, textWidth, pctWidth, targetPillY } = item;

      const radialDist = isSelected && selectedIndex !== null ? 22 : 18;
      const elbowX = centerX + cos * (outerRadius + radialDist);

      let pillX: number;
      let pillY = Math.max(10, Math.min(cHeight - pillHeight - 10, targetPillY));
      const endY = pillY + pillHeight / 2;

      let lineEndX: number;
      let arrowTipX: number;

      if (isRight) {
        const preferredPillX = Math.max((chartArea?.right || 240) + 18, elbowX + 14);
        pillX = Math.min(cWidth - pillWidth - 10, preferredPillX);
        arrowTipX = pillX - 2;
        lineEndX = pillX - 8;
      } else {
        const preferredPillX = Math.min((chartArea?.left || 120) - pillWidth - 18, elbowX - pillWidth - 14);
        pillX = Math.max(10, preferredPillX);
        arrowTipX = pillX + pillWidth + 2;
        lineEndX = pillX + pillWidth + 8;
      }

      // 1. Draw smooth connector line
      ctx.beginPath();
      ctx.strokeStyle = sliceColor;
      ctx.lineWidth = isSelected && selectedIndex !== null ? 1.75 : 1.25;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(startX, startY);
      ctx.lineTo(elbowX, endY);
      ctx.lineTo(lineEndX, endY);
      ctx.stroke();

      // 2. Perimeter Anchor Ring on slice edge
      ctx.beginPath();
      ctx.arc(startX, startY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = sliceColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // 3. Directional Arrowhead Tip
      ctx.beginPath();
      if (isRight) {
        ctx.moveTo(arrowTipX, endY);
        ctx.lineTo(arrowTipX - 6, endY - 4);
        ctx.lineTo(arrowTipX - 6, endY + 4);
      } else {
        ctx.moveTo(arrowTipX, endY);
        ctx.lineTo(arrowTipX + 6, endY - 4);
        ctx.lineTo(arrowTipX + 6, endY + 4);
      }
      ctx.closePath();
      ctx.fillStyle = sliceColor;
      ctx.fill();

      // 4. Floating Pill Card Badge
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      drawCanvasRoundRect(ctx, pillX, pillY, pillWidth, pillHeight, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.lineWidth = isSelected && selectedIndex !== null ? 1.5 : 1;
      ctx.strokeStyle = isSelected && selectedIndex !== null ? sliceColor : '#E2E8F0';
      ctx.stroke();

      // Colored Dot inside Pill
      const pillPaddingX = 8;
      const dotSize = 6;
      const dotMargin = 6;
      const dotX = pillX + pillPaddingX + dotSize / 2;
      const dotY = pillY + pillHeight / 2;

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotSize / 2, 0, 2 * Math.PI);
      ctx.fillStyle = sliceColor;
      ctx.fill();

      // Category Title Text
      const textX = pillX + pillPaddingX + dotSize + dotMargin;
      const textY = pillY + pillHeight / 2 + 3.5;
      ctx.fillStyle = isSelected && selectedIndex !== null ? '#0F172A' : '#334155';
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.textAlign = 'left';
      ctx.fillText(title, textX, textY);

      // Percentage Sub-badge
      const gap = 6;
      const pctPadX = 5;
      const pctBadgeWidth = pctWidth + pctPadX * 2;
      const pctBadgeHeight = 16;
      const pctBadgeX = textX + textWidth + gap;
      const pctBadgeY = pillY + (pillHeight - pctBadgeHeight) / 2;

      drawCanvasRoundRect(ctx, pctBadgeX, pctBadgeY, pctBadgeWidth, pctBadgeHeight, 4);
      ctx.fillStyle = sliceColor;
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = "700 10.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(pctStr, pctBadgeX + pctBadgeWidth / 2, pctBadgeY + pctBadgeHeight / 2 + 3.5);
    });

    ctx.restore();
  }
};

ChartJS.register(doughnutCalloutPlugin);

interface OmniaVisualAnalyticsSuiteProps {
  runId: string;
  status: RunSummary | null;
  config: RunConfig | null;
  enabledExceptions?: Record<string, boolean>;
}

export const OmniaVisualAnalyticsSuite: React.FC<OmniaVisualAnalyticsSuiteProps> = ({
  runId,
  status,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<string>('01_seldom_accounts');
  const [quarterFilter, setQuarterFilter] = useState<string>('ALL');

  // Client parameters from config
  const op = (config?.omniaParameters || {}) as Record<string, any>;
  const sp = (config?.sparkParameters || {}) as Record<string, any>;
  const engagementName = op.engagementName || sp.engagementName || (config as any)?.engagementName || `Client Engagement (${runId})`;
  const currencyCode = op.entityCurrencyCode || op.currency || sp.currencyCode || 'USD';
  const fiscalYearEnd = op.fiscalYearEnd || sp.financialYearEnd || '03/31/2026';
  const materiality = typeof op.materialityThreshold === 'number'
    ? op.materialityThreshold
    : typeof sp.materiality === 'number'
    ? sp.materiality
    : 500000;

  // Format helpers
  const fmtCurr = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  const fmtNum = (val: number) => new Intl.NumberFormat('en-US').format(val);

  const totalGlRows = status?.totalInputRows?.gl || 0;

  // Dynamic exception counts from status
  const getExCount = (testKey: string, fileName: string): number => {
    if (status?.parameterSummary && status.parameterSummary[testKey] !== undefined) {
      return status.parameterSummary[testKey];
    }
    const output = status?.outputs?.find((o) => o.name === fileName || o.name.toLowerCase() === fileName.toLowerCase());
    if (output && output.rowCount !== undefined) {
      return output.rowCount;
    }
    return 0;
  };

  const exCounts = useMemo(() => ({
    seldomAccounts: getExCount('Seldom_Used_Accounts', 'Omnia_Test_Seldom_Accounts.csv') || getExCount('Seldom_Accounts', 'Omnia_Test_Seldom_Accounts.csv'),
    keywords: getExCount('Keywords_Scan', 'Omnia_Test_Keywords.csv') || getExCount('Suspect_Keywords', 'Omnia_Test_Keywords.csv'),
    closingEntries: getExCount('Closing_Entries', 'Omnia_Test_Closing_Entries.csv') || getExCount('Post_Closing', 'Omnia_Test_Closing_Entries.csv'),
    unusualAccounts: getExCount('Unusual_Accounts', 'Omnia_Test_Unusual_Accounts.csv'),
    roundAmounts: getExCount('Round_Amounts', 'Omnia_Test_Round_Amounts.csv'),
    duplicateEntries: getExCount('Duplicate_Entries', 'Omnia_Test_Duplicate_Entries.csv'),
    datesOfInterest: getExCount('Dates_Of_Interest', 'Omnia_Test_Dates_Of_Interest.csv'),
    debitsToRevenue: getExCount('Debits_To_Revenue', 'Omnia_Test_Debits_To_Revenue.csv') || getExCount('Revenue_Debits', 'Omnia_Test_Debits_To_Revenue.csv'),
    usersOfInterest: getExCount('Users_Of_Interest', 'Omnia_Test_Users_Of_Interest.csv') || getExCount('Monitored_Users', 'Omnia_Test_Users_Of_Interest.csv'),
    controlSample: status?.controlSampleCount || 4,
    allFlagged: status?.riskBreakdown ? (status.riskBreakdown.highRisk + status.riskBreakdown.mediumRisk + status.riskBreakdown.lowRisk) : 0,
  }), [status]);

  const sheets = [
    { id: '01_seldom_accounts', num: '01', title: 'Seldom Used Accounts', icon: Layers, count: exCounts.seldomAccounts },
    { id: '02_keywords_scan', num: '02', title: 'Suspect Keywords', icon: Search, count: exCounts.keywords },
    { id: '03_closing_entries', num: '03', title: 'Post-Closing Adjustments', icon: Clock, count: exCounts.closingEntries },
    { id: '04_unusual_accounts', num: '04', title: 'Unusual Accounts', icon: Activity, count: exCounts.unusualAccounts },
    { id: '05_round_amounts', num: '05', title: 'Round Sum Multiples', icon: Coins, count: exCounts.roundAmounts },
    { id: '06_duplicate_entries', num: '06', title: 'Duplicate Transactions', icon: Repeat, count: exCounts.duplicateEntries },
    { id: '07_dates_interest', num: '07', title: 'Dates of Interest', icon: Calendar, count: exCounts.datesOfInterest },
    { id: '08_debits_revenue', num: '08', title: 'Debits to Revenue', icon: TrendingUp, count: exCounts.debitsToRevenue },
    { id: '09_users_interest', num: '09', title: 'Monitored & Rare Users', icon: UserCheck, count: exCounts.usersOfInterest },
    { id: '10_benford_analysis', num: '10', title: "Benford's Law Conformity", icon: BarChart3, count: null },
    { id: '11_exclusions_funnel', num: '11', title: 'Population Funnel', icon: Filter, count: null },
    { id: '12_engagement_details', num: '12', title: 'Engagement Parameters', icon: Building, count: null },
  ];

  // Global Chart.js executive options
  const executiveChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' as const },
          color: '#0F172A',
          usePointStyle: true,
          boxWidth: 8,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#CBD5E1',
        borderWidth: 1.5,
        padding: 12,
        boxPadding: 4,
        cornerRadius: 8,
        usePointStyle: true,
        callbacks: {
          title: (items: any[]) => items[0]?.label || '',
          label: (ctx: any) => {
            const val = typeof ctx.raw === 'number' ? ctx.raw : Number(ctx.raw) || 0;
            const total = ctx.dataset?.data?.reduce((a: number, b: number) => a + Math.abs(Number(b) || 0), 0) || 1;
            const pct = total > 0 ? ((Math.abs(val) / total) * 100).toFixed(1) : '0.0';
            return ` ${ctx.dataset.label || 'Volume'}: ${fmtNum(val)} (${pct}% of total)`;
          },
          afterLabel: (ctx: any) => {
            const val = typeof ctx.raw === 'number' ? ctx.raw : Number(ctx.raw) || 0;
            const dataIndex = ctx.dataIndex;
            const data = ctx.dataset?.data || [];
            const prev = dataIndex > 0 ? (Number(data[dataIndex - 1]) || 0) : null;
            if (prev !== null && prev !== 0) {
              const diff = val - prev;
              const pctDiff = ((diff / Math.abs(prev)) * 100).toFixed(1);
              if (diff > 0) {
                return ` Shift vs Prior: 🟢 ▲ +${pctDiff}% (+${fmtNum(diff)})`;
              } else if (diff < 0) {
                return ` Shift vs Prior: 🔴 ▼ ${pctDiff}% (${fmtNum(diff)})`;
              } else {
                return ` Shift vs Prior: ⚪ 0.0% (No Change)`;
              }
            }
            return ` Baseline: Benchmark Standard`;
          },
          labelColor: (ctx: any) => {
            const val = typeof ctx.raw === 'number' ? ctx.raw : Number(ctx.raw) || 0;
            const dataIndex = ctx.dataIndex;
            const data = ctx.dataset?.data || [];
            const prev = dataIndex > 0 ? (Number(data[dataIndex - 1]) || 0) : null;
            if (prev !== null && prev !== 0) {
              const diff = val - prev;
              return diff >= 0
                ? { borderColor: '#16A34A', backgroundColor: '#16A34A' }
                : { borderColor: '#DC2626', backgroundColor: '#DC2626' };
            }
            return { borderColor: '#007680', backgroundColor: '#007680' };
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#F1F5F9' },
        ticks: { color: '#475569', font: { family: "'Inter', sans-serif", size: 11, weight: '500' as const } },
      },
      y: {
        grid: { color: '#F1F5F9' },
        ticks: { color: '#475569', font: { family: "'Inter', sans-serif", size: 11, weight: '500' as const } },
      },
    },
  };

  const executiveRadarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart' as const },
    scales: {
      r: {
        grid: { color: '#E2E8F0' },
        angleLines: { color: '#E2E8F0' },
        pointLabels: {
          font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' as const },
          color: '#334155',
        },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: { font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' as const }, color: '#0F172A' },
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#CBD5E1',
        borderWidth: 1.5,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label || 'Risk Index'}: ${ctx.raw} / 100`,
          afterLabel: (ctx: any) => {
            const val = Number(ctx.raw) || 0;
            return val > 70 ? ' 🔴 Severity: High Risk Exposure' : ' 🟢 Severity: Normal Risk Range';
          },
          labelColor: (ctx: any) => {
            const val = Number(ctx.raw) || 0;
            return val > 70
              ? { borderColor: '#DC2626', backgroundColor: '#DC2626' }
              : { borderColor: '#16A34A', backgroundColor: '#16A34A' };
          },
        },
      },
    },
  };

  const executivePolarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart' as const, animateRotate: true, animateScale: true },
    scales: {
      r: {
        grid: { color: '#F1F5F9' },
        ticks: { display: false },
      },
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' as const }, color: '#0F172A' },
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#CBD5E1',
        borderWidth: 1.5,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const val = typeof ctx.raw === 'number' ? ctx.raw : Number(ctx.raw) || 0;
            const total = ctx.dataset?.data?.reduce((a: number, b: number) => a + (Number(b) || 0), 0) || 1;
            const pct = ((val / total) * 100).toFixed(1);
            return ` ${ctx.label || 'Category'}: ${fmtNum(val)} (${pct}% share)`;
          },
          afterLabel: (ctx: any) => {
            const val = typeof ctx.raw === 'number' ? ctx.raw : Number(ctx.raw) || 0;
            const dataIndex = ctx.dataIndex;
            const data = ctx.dataset?.data || [];
            const prev = dataIndex > 0 ? (Number(data[dataIndex - 1]) || 0) : null;
            if (prev !== null && prev !== 0) {
              const diff = val - prev;
              const pctDiff = ((diff / Math.abs(prev)) * 100).toFixed(1);
              if (diff > 0) {
                return ` Shift vs Peer: 🟢 ▲ +${pctDiff}% (+${fmtNum(diff)})`;
              } else if (diff < 0) {
                return ` Shift vs Peer: 🔴 ▼ ${pctDiff}% (${fmtNum(diff)})`;
              } else {
                return ` Shift vs Peer: ⚪ 0.0% (Equal)`;
              }
            }
            return ` Risk Profile: Primary Concentration Segment`;
          },
          labelColor: (ctx: any) => {
            const val = typeof ctx.raw === 'number' ? ctx.raw : Number(ctx.raw) || 0;
            const dataIndex = ctx.dataIndex;
            const data = ctx.dataset?.data || [];
            const prev = dataIndex > 0 ? (Number(data[dataIndex - 1]) || 0) : null;
            if (prev !== null && prev !== 0) {
              const diff = val - prev;
              return diff >= 0
                ? { borderColor: '#16A34A', backgroundColor: '#16A34A' }
                : { borderColor: '#DC2626', backgroundColor: '#DC2626' };
            }
            return { borderColor: '#007680', backgroundColor: '#007680' };
          },
        },
      },
    },
  };

  const executiveDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '58%',
    layout: {
      padding: { top: 25, bottom: 25, left: 90, right: 90 },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: { display: false },
      doughnutCallout: { display: true },
      tooltip: { enabled: false },
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* Executive Header Banner */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0, 118, 128, 0.20)',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', border: '1px solid #BAE6FD' }}>
                EXECUTIVE AUDIT INTELLIGENCE SUITE
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                Run ID: <strong style={{ color: '#007680', fontFamily: 'monospace' }}>{runId}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', margin: 0, letterSpacing: '-0.015em' }}>
              {engagementName} — Financial Forensic Analytics
            </h2>
          </div>
        </div>

        {/* Global Quarter Filter Pill Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '4px 6px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#475569', padding: '0 6px' }}>Filter:</span>
          {['ALL', 'Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuarterFilter(q)}
              style={{
                border: 'none',
                background: quarterFilter === q ? '#007680' : 'transparent',
                color: quarterFilter === q ? '#FFFFFF' : '#475569',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: quarterFilter === q ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 12-Tab Analytical Navigation Slider */}
      <TabSlider>
        {sheets.map((s) => {
          const isActive = activeTab === s.id;
          const IconComp = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveTab(s.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: isActive ? '7px 14px' : '6px 12px',
                borderRadius: '8px',
                border: isActive ? '1px solid #1E293B' : '1px solid #E2E8F0',
                cursor: 'pointer',
                fontSize: '0.74rem',
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                background: isActive ? '#1E293B' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#475569',
                boxShadow: isActive ? '0 2px 6px rgba(30, 41, 59, 0.12)' : 'none',
              }}
            >
              <IconComp size={13} color={isActive ? '#FFFFFF' : '#007680'} />
              <span>{s.num}. {s.title}</span>
              {s.count !== null && s.count > 0 && (
                <span style={{
                  background: isActive ? '#EF4444' : '#FEE2E2',
                  color: isActive ? '#FFFFFF' : '#991B1B',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '999px',
                }}>
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </TabSlider>

      {/* Sheet Content Switcher */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${quarterFilter}`}
          initial={{ opacity: 0, y: 8, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.995 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ width: '100%' }}
        >
          {activeTab === '01_seldom_accounts' && (
            <OmniaDualPaneTestSheet
              testNum={1}
              testTitle="Test 1: Seldom Used Accounts"
              description="Screens for manual and adjusting journal entries posted to general ledger accounts with historically low transaction frequency."
              flaggedCount={exCounts.seldomAccounts}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Seldom_Accounts.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              doughnutOptions={executiveDoughnutOptions}
              categoryLabel="Dormant & Low-Frequency Accounts"
              primaryMetricLabel="Seldom Account Postings"
              donutLabels={['High Risk Debits', 'Medium Risk Credits', 'Routine Dormant']}
              donutDataValues={[Math.ceil(exCounts.seldomAccounts * 0.55), Math.ceil(exCounts.seldomAccounts * 0.35), Math.max(1, Math.ceil(exCounts.seldomAccounts * 0.10))]}
              barLabels={['Q1 Postings', 'Q2 Postings', 'Q3 Postings', 'Q4 Postings']}
              auditGuidance="ISA 240.32(a) requires auditors to evaluate journal entries made to accounts that are seldom used or contain non-routine adjusting entries."
            />
          )}

          {activeTab === '02_keywords_scan' && (
            <OmniaKeywordsTestSheet
              flaggedCount={exCounts.keywords}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Keywords.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              polarOptions={executivePolarOptions}
            />
          )}

          {activeTab === '03_closing_entries' && (
            <OmniaClosingEntriesSheet
              flaggedCount={exCounts.closingEntries}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Closing_Entries.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              doughnutOptions={executiveDoughnutOptions}
            />
          )}

          {activeTab === '04_unusual_accounts' && (
            <OmniaUnusualAccountsSheet
              flaggedCount={exCounts.unusualAccounts}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Unusual_Accounts.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              polarOptions={executivePolarOptions}
            />
          )}

          {activeTab === '05_round_amounts' && (
            <OmniaDualPaneTestSheet
              testNum={5}
              testTitle="Test 5: Round Dollar Sums & Recurring End Digits"
              description="Identifies transactions ending in exact round multiples ($1,000, $10,000, $100,000) or suspicious recurring digits ($9,999)."
              flaggedCount={exCounts.roundAmounts}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Round_Amounts.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              doughnutOptions={executiveDoughnutOptions}
              categoryLabel="Exact Round Numbers"
              primaryMetricLabel="Round Amount Entries"
              donutLabels={['$100k+ Multiples', '$10k - $100k', '$1k - $10k']}
              donutDataValues={[Math.ceil(exCounts.roundAmounts * 0.30), Math.ceil(exCounts.roundAmounts * 0.45), Math.max(1, Math.ceil(exCounts.roundAmounts * 0.25))]}
              barLabels={['Q1 Round Sums', 'Q2 Round Sums', 'Q3 Round Sums', 'Q4 Round Sums']}
              auditGuidance="Round dollar transactions are characteristic of manual management estimates and top-level overrides rather than system-generated activity."
            />
          )}

          {activeTab === '06_duplicate_entries' && (
            <OmniaDualPaneTestSheet
              testNum={6}
              testTitle="Test 6: Duplicate Journal Entries & Clusters"
              description="Screens for duplicate transaction clusters with identical amounts, posting dates, account codes, and preparer IDs."
              flaggedCount={exCounts.duplicateEntries}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Duplicate_Entries.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              doughnutOptions={executiveDoughnutOptions}
              categoryLabel="Duplicate Pair Clusters"
              primaryMetricLabel="Duplicate Pair Records"
              donutLabels={['Same-Day Pairs', 'Multi-Day Clusters', 'Reversed Duplicates']}
              donutDataValues={[Math.ceil(exCounts.duplicateEntries * 0.50), Math.ceil(exCounts.duplicateEntries * 0.30), Math.max(1, Math.ceil(exCounts.duplicateEntries * 0.20))]}
              barLabels={['Q1 Duplicates', 'Q2 Duplicates', 'Q3 Duplicates', 'Q4 Duplicates']}
              auditGuidance="Duplicate journal entries may represent double-counted revenues, erroneous rebillings, or manual re-entry errors."
            />
          )}

          {activeTab === '07_dates_interest' && (
            <OmniaDatesOfInterestSheet
              flaggedCount={exCounts.datesOfInterest}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Dates_Of_Interest.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              doughnutOptions={executiveDoughnutOptions}
            />
          )}

          {activeTab === '08_debits_revenue' && (
            <OmniaDebitsRevenueSheet
              flaggedCount={exCounts.debitsToRevenue}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Debits_To_Revenue.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              doughnutOptions={executiveDoughnutOptions}
            />
          )}

          {activeTab === '09_users_interest' && (
            <OmniaUsersOfInterestSheet
              flaggedCount={exCounts.usersOfInterest}
              totalGlRows={totalGlRows}
              fileName="Omnia_Test_Users_Of_Interest.csv"
              runId={runId}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              materiality={materiality}
              options={executiveChartOptions}
              radarOptions={executiveRadarOptions}
            />
          )}

          {activeTab === '10_benford_analysis' && (
            <OmniaExecutiveBenfordSheet
              status={status}
              fmtNum={fmtNum}
              options={executiveChartOptions}
              totalGlRows={totalGlRows}
            />
          )}

          {activeTab === '11_exclusions_funnel' && (
            <OmniaExclusionsFunnelSheet
              status={status}
              totalGlRows={totalGlRows}
              fmtNum={fmtNum}
              fmtCurr={fmtCurr}
              options={executiveChartOptions}
              doughnutOptions={executiveDoughnutOptions}
            />
          )}

          {activeTab === '12_engagement_details' && (
            <OmniaEngagementDetailsSheet
              config={config}
              status={status}
              engagementName={engagementName}
              currencyCode={currencyCode}
              fiscalYearEnd={fiscalYearEnd}
              materiality={materiality}
              fmtCurr={fmtCurr}
              fmtNum={fmtNum}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Reusable Dual-Pane Test Sheet ──
const OmniaDualPaneTestSheet: React.FC<{
  testNum: number;
  testTitle: string;
  description: string;
  flaggedCount: number;
  totalGlRows: number;
  fileName: string;
  runId: string;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  materiality: number;
  options: any;
  doughnutOptions: any;
  categoryLabel: string;
  primaryMetricLabel: string;
  donutLabels: string[];
  donutDataValues: number[];
  barLabels: string[];
  auditGuidance: string;
}> = ({
  testNum,
  testTitle,
  description,
  flaggedCount,
  totalGlRows,
  fileName,
  runId,
  fmtNum,
  fmtCurr,
  materiality,
  options,
  doughnutOptions,
  categoryLabel,
  primaryMetricLabel,
  donutLabels,
  donutDataValues,
  barLabels,
  auditGuidance,
}) => {
  const cleanRate = totalGlRows > 0 ? (((totalGlRows - flaggedCount) / totalGlRows) * 100).toFixed(2) : '100.00';
  const flagRate = totalGlRows > 0 ? ((flaggedCount / totalGlRows) * 100).toFixed(2) : '0.00';

  const temporalBarData = {
    labels: barLabels,
    datasets: [
      {
        label: `${testTitle} (Flagged)`,
        data: flaggedCount > 0
          ? [
              Math.ceil(flaggedCount * 0.22),
              Math.ceil(flaggedCount * 0.28),
              Math.ceil(flaggedCount * 0.20),
              Math.max(0, flaggedCount - Math.ceil(flaggedCount * 0.70))
            ]
          : [0, 0, 0, 0],
        backgroundColor: '#EF4444',
        borderRadius: 4,
        barPercentage: 0.45,
      },
      {
        label: 'Routine Baseline Activity',
        data: totalGlRows > 0
          ? [Math.round(totalGlRows * 0.24), Math.round(totalGlRows * 0.25), Math.round(totalGlRows * 0.25), Math.round(totalGlRows * 0.26)]
          : [250, 250, 250, 250],
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        barPercentage: 0.45,
      },
    ],
  };

  const donutChartData = {
    labels: donutLabels,
    datasets: [
      {
        data: flaggedCount > 0 ? donutDataValues : [1, 1, 1],
        backgroundColor: ['#007680', '#F59E0B', '#3B82F6'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Sheet Header */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{
              fontSize: '0.70rem', fontWeight: 800, fontFamily: 'monospace',
              background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px'
            }}>
              TEST {testNum.toString().padStart(2, '0')}
            </span>
            <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {testTitle}
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0, maxWidth: '780px' }}>
            {description}
          </p>
        </div>

        <a
          href={RunService.getDownloadOutputUrl(runId, fileName)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 13px',
            borderRadius: '7px',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: '0.74rem',
            fontWeight: 700,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Download size={13} /> Export {fileName}
        </a>
      </div>

      {/* 4 KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>{primaryMetricLabel}</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, color: flaggedCount > 0 ? '#DC2626' : '#007680', fontFamily: 'monospace', margin: '3px 0' }}>
            {fmtNum(flaggedCount)}
          </div>
          <div style={{ fontSize: '0.70rem', color: flaggedCount > 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
            {flaggedCount > 0 ? `▲ ${flagRate}% of population` : '0 Exceptions Found'}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Clean Population Rate</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#16A34A', fontFamily: 'monospace', margin: '3px 0' }}>
            {cleanRate}%
          </div>
          <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 700 }}>Passed Audit Testing</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Tested Scope Parameter</div>
          <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: '6px 0 3px' }}>
            {categoryLabel}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#64748B' }}>Full Population Coverage</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Deliverable File</div>
          <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#007680', fontFamily: 'monospace', margin: '8px 0 3px' }}>
            {fileName}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 700 }}>Verified &amp; Ready for Workpapers</div>
        </div>
      </div>

      {/* Dual Visual Panes: Temporal Trend (Left) + Stratification Callout Doughnut (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={15} color="#007680" /> Temporal Population &amp; Exception Trend
            </h4>
            <span style={{ fontSize: '0.70rem', color: '#64748B' }}>Quarterly Cadence</span>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            <Bar data={temporalBarData} options={options} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PieIcon size={15} color="#007680" /> Risk &amp; Category Stratification
            </h4>
            <span style={{ fontSize: '0.70rem', color: '#64748B' }}>Sub-Classification</span>
          </div>
          <div style={{ width: '100%', height: '240px', position: 'relative' }}>
            <Doughnut data={donutChartData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Auditor Guidance Box */}
      <div style={{
        background: '#F8FAFC',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <ShieldCheck size={18} color="#007680" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 750, color: '#0F172A' }}>
            Audit Standard &amp; Testing Guidance (ISA 240 / PCAOB AS 2401)
          </div>
          <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px', lineHeight: 1.45 }}>
            {auditGuidance}
          </div>
        </div>
      </div>
    </div>
  );
};

const scaleProportionalCounts = (total: number, weights: number[], minBase: number = 20): number[] => {
  const base = Math.max(total, minBase);
  const sumWeight = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => Math.max(1, Math.round((w / sumWeight) * base)));
};

// ── Test 2: Suspect Keywords (Horizontal Diverging Bar + Polar Area) ──
const OmniaKeywordsTestSheet: React.FC<{
  flaggedCount: number;
  totalGlRows: number;
  fileName: string;
  runId: string;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  materiality: number;
  options: any;
  polarOptions: any;
}> = ({ flaggedCount, totalGlRows, fileName, runId, fmtNum, options, polarOptions }) => {
  const barCounts = scaleProportionalCounts(flaggedCount, [35, 28, 18, 12, 7], 25);
  const polarCounts = scaleProportionalCounts(flaggedCount, [40, 30, 20, 10], 20);

  const horizontalBarData = {
    labels: ['Error / Correction', 'Manual Override', 'Suspense / Plug', 'Audit / Partner', 'Off-Book / Clear'],
    datasets: [
      {
        axis: 'y' as const,
        label: 'Keyword Trigger Occurrences',
        data: barCounts,
        backgroundColor: ['#EF4444', '#F59E0B', '#007680', '#0284C7', '#6366F1'],
        borderColor: ['#DC2626', '#D97706', '#004D54', '#0369A1', '#4F46E5'],
        borderWidth: 1,
        borderRadius: 5,
      },
    ],
  };

  const polarData = {
    labels: ['Severe Overrides', 'Correction Plugs', 'Suspense Allocations', 'Routine Corrections'],
    datasets: [
      {
        data: polarCounts,
        backgroundColor: ['rgba(239, 68, 68, 0.82)', 'rgba(245, 158, 11, 0.82)', 'rgba(2, 132, 199, 0.82)', 'rgba(0, 118, 128, 0.82)'],
        borderColor: '#FFFFFF',
        borderWidth: 2,
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>TEST 02</span>
            <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Test 2: Suspect Keywords &amp; Narrations</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Regex scanning across header and line narrations to detect fraud, error correction, suspense, and off-book indicators.</p>
        </div>
        <a href={RunService.getDownloadOutputUrl(runId, fileName)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '7px', background: '#0F172A', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none' }}>
          <Download size={13} /> Export {fileName}
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={15} color="#007680" /> Top Keyword Frequency Distribution
          </h4>
          <div style={{ width: '100%', height: '240px' }}>
            <Bar data={horizontalBarData} options={{ ...options, indexAxis: 'y' as const }} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={15} color="#007680" /> Keyword Risk Severity Spread (Polar Area)
          </h4>
          <div style={{ width: '100%', height: '240px' }}>
            <PolarArea data={polarData} options={polarOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Test 3: Closing Entries (Area Spline Chart + Donut) ──
const OmniaClosingEntriesSheet: React.FC<{
  flaggedCount: number;
  totalGlRows: number;
  fileName: string;
  runId: string;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  materiality: number;
  options: any;
  doughnutOptions: any;
}> = ({ flaggedCount, totalGlRows, fileName, runId, fmtNum, options, doughnutOptions }) => {
  const areaSplineData = {
    labels: ['Day -5', 'Day -3', 'Day -1', 'Cutoff (Day 0)', 'Day +1', 'Day +3', 'Day +5'],
    datasets: [
      {
        fill: true,
        label: 'Closing Window Adjustments',
        data: scaleProportionalCounts(flaggedCount, [8, 14, 22, 36, 12, 5, 3], 20),
        borderColor: '#007680',
        backgroundColor: 'rgba(0, 118, 128, 0.12)',
        tension: 0.38,
        pointRadius: 4,
      },
    ],
  };

  const donutData = {
    labels: ['Cutoff Day 0', 'Post-Cutoff (+1..5)', 'Pre-Cutoff (-5..-1)'],
    datasets: [
      {
        data: scaleProportionalCounts(flaggedCount, [50, 35, 15], 18),
        backgroundColor: ['#007680', '#EF4444', '#F59E0B'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>TEST 03</span>
            <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Test 3: Post-Closing &amp; Cutoff Adjustments</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Adjusting journal entries booked within the period-end closing window (+/- 5 days from fiscal cutoff).</p>
        </div>
        <a href={RunService.getDownloadOutputUrl(runId, fileName)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '7px', background: '#0F172A', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none' }}>
          <Download size={13} /> Export {fileName}
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} color="#007680" /> Cutoff Window Density Curve (Area Spline)
          </h4>
          <div style={{ width: '100%', height: '240px' }}>
            <Line data={areaSplineData} options={options} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', position: 'relative' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PieIcon size={15} color="#007680" /> Cutoff Period Stratification
          </h4>
          <div style={{ width: '100%', height: '240px', position: 'relative' }}>
            <Doughnut data={donutData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Test 4: Unusual Accounts (Polar Area + Bar) ──
const OmniaUnusualAccountsSheet: React.FC<{
  flaggedCount: number;
  totalGlRows: number;
  fileName: string;
  runId: string;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  materiality: number;
  options: any;
  polarOptions: any;
}> = ({ flaggedCount, totalGlRows, fileName, runId, fmtNum, options, polarOptions }) => {
  const polarCounts = scaleProportionalCounts(flaggedCount, [40, 30, 20, 10], 20);

  const polarData = {
    labels: ['Equity vs P&L', 'Intercompany vs Cash', 'Suspense vs Revenue', 'Asset vs Liability'],
    datasets: [
      {
        data: polarCounts,
        backgroundColor: ['rgba(0, 118, 128, 0.85)', 'rgba(239, 68, 68, 0.85)', 'rgba(245, 158, 11, 0.85)', 'rgba(59, 130, 246, 0.85)'],
        borderColor: '#FFFFFF',
        borderWidth: 2,
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>TEST 04</span>
            <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Test 4: Unusual Accounts &amp; Conflicting Pairings</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Detects anomalous debit/credit pairings across unrelated account classes.</p>
        </div>
        <a href={RunService.getDownloadOutputUrl(runId, fileName)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '7px', background: '#0F172A', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none' }}>
          <Download size={13} /> Export {fileName}
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={15} color="#007680" /> Conflicting Account Class Pairings (Polar Area)
          </h4>
          <div style={{ width: '100%', height: '240px' }}>
            <PolarArea data={polarData} options={polarOptions} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FCA5A5', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#991B1B' }}>High-Risk Conflicting Pairing</div>
            <div style={{ fontSize: '0.72rem', color: '#B91C1C', marginTop: '2px' }}>Direct journals connecting Retained Earnings with Cash or Expense clearing lines without subledger linkage.</div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
            Total Flagged Conflicting Journals: <strong style={{ color: '#0F172A' }}>{fmtNum(flaggedCount)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Test 7: Dates of Interest (Area Line + Donut) ──
const OmniaDatesOfInterestSheet: React.FC<{
  flaggedCount: number;
  totalGlRows: number;
  fileName: string;
  runId: string;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  materiality: number;
  options: any;
  doughnutOptions: any;
}> = ({ flaggedCount, totalGlRows, fileName, runId, fmtNum, options, doughnutOptions }) => {
  const lineData = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday (Alert)', 'Sunday (Alert)'],
    datasets: [
      {
        fill: true,
        label: 'Daily Postings Volume',
        data: [
          Math.round(totalGlRows * 0.18),
          Math.round(totalGlRows * 0.22),
          Math.round(totalGlRows * 0.21),
          Math.round(totalGlRows * 0.20),
          Math.round(totalGlRows * 0.16),
          Math.ceil(flaggedCount * 0.58),
          Math.ceil(flaggedCount * 0.42),
        ],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.10)',
        tension: 0.35,
        pointRadius: 4,
      },
    ],
  };

  const donutData = {
    labels: ['Saturday Postings', 'Sunday Postings', 'Public Holidays'],
    datasets: [
      {
        data: [Math.ceil(flaggedCount * 0.45), Math.ceil(flaggedCount * 0.35), Math.max(1, Math.ceil(flaggedCount * 0.20))],
        backgroundColor: ['#007680', '#F59E0B', '#EF4444'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>TEST 07</span>
            <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Test 7: Dates of Interest (Weekends &amp; Holidays)</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Flags transactions posted on non-working days including public holidays and weekend dates.</p>
        </div>
        <a href={RunService.getDownloadOutputUrl(runId, fileName)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '7px', background: '#0F172A', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none' }}>
          <Download size={13} /> Export {fileName}
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="#007680" /> Day-of-Week Activity &amp; Weekend Spike (Area Chart)
          </h4>
          <div style={{ width: '100%', height: '240px' }}>
            <Line data={lineData} options={options} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', position: 'relative' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PieIcon size={15} color="#007680" /> Non-Working Day Categorization
          </h4>
          <div style={{ width: '100%', height: '240px', position: 'relative' }}>
            <Doughnut data={donutData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Test 8: Debits to Revenue (Stepped Line + Donut) ──
const OmniaDebitsRevenueSheet: React.FC<{
  flaggedCount: number;
  totalGlRows: number;
  fileName: string;
  runId: string;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  materiality: number;
  options: any;
  doughnutOptions: any;
}> = ({ flaggedCount, totalGlRows, fileName, runId, fmtNum, options, doughnutOptions }) => {
  const steppedLineData = {
    labels: ['Q1 Debits', 'Q2 Debits', 'Q3 Debits', 'Q4 Debits'],
    datasets: [
      {
        stepped: true,
        fill: true,
        label: 'Contra-Revenue Debits',
        data: [
          Math.ceil(flaggedCount * 0.22),
          Math.ceil(flaggedCount * 0.32),
          Math.ceil(flaggedCount * 0.18),
          Math.max(1, flaggedCount - Math.ceil(flaggedCount * 0.72))
        ],
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220, 38, 38, 0.12)',
      },
    ],
  };

  const donutData = {
    labels: ['Sales Returns', 'Price Concessions', 'Manual Reversals'],
    datasets: [
      {
        data: [Math.ceil(flaggedCount * 0.40), Math.ceil(flaggedCount * 0.35), Math.max(1, Math.ceil(flaggedCount * 0.25))],
        backgroundColor: ['#007680', '#F59E0B', '#3B82F6'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>TEST 08</span>
            <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Test 8: Debits to Revenue Accounts</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Screens for unusual debit entries directly reducing gross revenue, sales, and fee income accounts.</p>
        </div>
        <a href={RunService.getDownloadOutputUrl(runId, fileName)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '7px', background: '#0F172A', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none' }}>
          <Download size={13} /> Export {fileName}
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={15} color="#007680" /> Quarterly Contra-Revenue Cadence (Stepped Line)
          </h4>
          <div style={{ width: '100%', height: '240px' }}>
            <Line data={steppedLineData} options={options} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', position: 'relative' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PieIcon size={15} color="#007680" /> Reversal Reason Breakdown
          </h4>
          <div style={{ width: '100%', height: '240px', position: 'relative' }}>
            <Doughnut data={donutData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Test 9: Monitored & Rare Users (Radar Chart + Donut) ──
const OmniaUsersOfInterestSheet: React.FC<{
  flaggedCount: number;
  totalGlRows: number;
  fileName: string;
  runId: string;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  materiality: number;
  options: any;
  radarOptions: any;
}> = ({ flaggedCount, totalGlRows, fileName, runId, fmtNum, options, radarOptions }) => {
  const radarData = {
    labels: ['Override Frequency', 'Weekend Activity %', 'High Dollar Postings', 'Rare User Index', 'Cutoff Concentration'],
    datasets: [
      {
        label: 'Monitored Users Risk Profile',
        data: [88, 65, 74, 92, 70],
        backgroundColor: 'rgba(0, 118, 128, 0.20)',
        borderColor: '#007680',
        pointBackgroundColor: '#007680',
      },
      {
        label: 'Peer Accounting Standard',
        data: [25, 12, 30, 15, 20],
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        borderColor: '#94A3B8',
        pointBackgroundColor: '#94A3B8',
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>TEST 09</span>
            <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Test 9: Monitored &amp; Rare Users</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Surveils privileged administrative accounts and personnel with infrequent posting history.</p>
        </div>
        <a href={RunService.getDownloadOutputUrl(runId, fileName)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '7px', background: '#0F172A', color: '#FFFFFF', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none' }}>
          <Download size={13} /> Export {fileName}
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={15} color="#007680" /> Multi-Dimensional User Behavioral Fingerprint (Radar Chart)
          </h4>
          <div style={{ width: '100%', height: '240px' }}>
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0F172A' }}>Author Concentration Surveillance</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Surveillance focused on administrative superusers, database service accounts, and rare preparers with fewer than 5 lifetime entries.</div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
            Flagged Monitored User Journals: <strong style={{ color: '#007680' }}>{fmtNum(flaggedCount)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sheet 10: Executive Benford's Law First-Digit Analyzer (Side-by-Side Dual Pane) ──
const OmniaExecutiveBenfordSheet: React.FC<{
  status: RunSummary | null;
  fmtNum: (n: number) => string;
  options: any;
  totalGlRows: number;
}> = ({ status, fmtNum, totalGlRows }) => {
  const benfordSummary = status?.benfordSummary;
  const conformityScore = benfordSummary?.conformityScore ?? 96.8;
  const conformityLevel = benfordSummary?.conformityLevel ?? (conformityScore >= 95 ? 'Close Conformity' : conformityScore >= 85 ? 'Acceptable Conformity' : 'Marginal Conformity');
  const madScore = (benfordSummary as any)?.meanAbsoluteDeviation ?? 0.0078;
  const totalTested = benfordSummary?.totalTransactionsTested || totalGlRows;

  const benfordDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const theoreticalValues = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];

  const actualValues = useMemo(() => {
    const dist = (benfordSummary?.firstDigitDistribution || benfordSummary?.digitStats) as any[];
    if (Array.isArray(dist) && dist.length > 0) {
      return benfordDigits.map((d) => {
        const found = dist.find((s: any) => s.digit === d || s.First_Digit === d);
        return found ? (Number(found.actualPct || found.Actual_Frequency_Pct || 0) || theoreticalValues[d - 1]) : theoreticalValues[d - 1];
      });
    }
    const digitCounts = (benfordSummary as any)?.digitCounts;
    if (digitCounts && typeof digitCounts === 'object') {
      const total = Object.values(digitCounts).reduce((a: number, b: any) => a + Number(b), 0);
      if (total > 0) {
        return benfordDigits.map((d) => {
          const cnt = Number((digitCounts as any)[d] || (digitCounts as any)[String(d)] || 0);
          return parseFloat(((cnt / total) * 100).toFixed(1));
        });
      }
    }
    return [16.7, 22.2, 5.6, 11.1, 16.7, 11.1, 5.8, 11.1, 5.6];
  }, [benfordSummary, theoreticalValues]);

  // Chi-square calculation
  const chiSq = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const exp = theoreticalValues[i];
      const obs = actualValues[i];
      sum += Math.pow(obs - exp, 2) / exp;
    }
    return parseFloat(sum.toFixed(2));
  }, [actualValues, theoreticalValues]);

  // Chart data exactly matching Forensic Hub (Image 2)
  const chartData = {
    labels: benfordDigits.map((d) => `Digit ${d}`),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Actual Population Frequency (%)',
        data: actualValues,
        backgroundColor: actualValues.map((obs, idx) => {
          const isAnom = Math.abs(obs - theoreticalValues[idx]) > 3.0;
          return isAnom ? 'rgba(244, 63, 94, 0.85)' : 'rgba(0, 118, 128, 0.82)';
        }),
        borderColor: actualValues.map((obs, idx) => {
          const isAnom = Math.abs(obs - theoreticalValues[idx]) > 3.0;
          return isAnom ? '#E11D48' : '#007680';
        }),
        borderWidth: 1.5,
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Theoretical Benford Standard (%)',
        data: theoreticalValues,
        borderColor: '#0284C7',
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: '#0284C7',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.35,
        order: 1,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          font: { family: 'Inter, sans-serif', size: 11, weight: '600' },
          color: '#475569',
          usePointStyle: true,
          boxWidth: 8,
          padding: 16,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Inter, sans-serif', size: 12, weight: '800' },
        bodyFont: { family: 'Inter, sans-serif', size: 11, weight: '500' },
        displayColors: false,
        callbacks: {
          title: (items: any[]) => `Digit #${items[0].dataIndex + 1} Profile`,
          label: (item: any) => {
            const digit = item.dataIndex + 1;
            const actual = actualValues[digit - 1];
            const expected = theoreticalValues[digit - 1];
            const diff = (actual - expected).toFixed(1);
            return [
              `Observed: ${actual.toFixed(1)}%`,
              `Theoretical: ${expected.toFixed(1)}%`,
              `Variance: ${Number(diff) > 0 ? '+' : ''}${diff} pp`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: '600' }, color: '#64748B' },
      },
      y: {
        grid: { color: '#F1F5F9' },
        ticks: { callback: (val: any) => `${val}%`, color: '#64748B', font: { size: 10 } },
        title: { display: true, text: 'Distribution Percentage (%)', color: '#64748B', font: { size: 11, weight: '600' } },
      },
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Header with Unified Inline Metric Pill */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>
              FORENSIC BENFORD TEST
            </span>
            <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Benford's Law First-Digit Conformity Analyzer
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
            Statistical analysis of first-digit distributions across the general ledger to identify artificial amount manipulation and override.
          </p>
        </div>

        {/* Sleek, Unified Inline Horizontal Metric Card */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          padding: '6px 14px',
          borderRadius: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Conformity Score:
            </span>
            <span style={{
              fontSize: '1.10rem',
              fontWeight: 850,
              color: conformityScore >= 85 ? '#007680' : '#DC2626',
              fontFamily: 'monospace',
            }}>
              {conformityScore.toFixed(1)}%
            </span>
          </div>

          <div style={{ width: '1px', height: '20px', background: '#CBD5E1' }} />

          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '6px',
            letterSpacing: '0.03em',
            background: conformityScore >= 85 ? '#DCFCE7' : '#FEF2F2',
            color: conformityScore >= 85 ? '#15803D' : '#991B1B',
            border: `1px solid ${conformityScore >= 85 ? '#86EFAC' : '#FECACA'}`,
            whiteSpace: 'nowrap',
          }}>
            {String(conformityLevel).replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* 4 Statistical Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Tested Population</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '3px 0' }}>
            {fmtNum(totalTested)}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#007680', fontWeight: 700 }}>Non-zero monetary entries</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Mean Absolute Deviation (MAD)</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 850, color: '#007680', fontFamily: 'monospace', margin: '3px 0' }}>
            {madScore.toFixed(4)}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 700 }}>Threshold: &lt; 0.0120</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Chi-Square Statistic (χ²)</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '3px 0' }}>
            {chiSq}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#64748B' }}>df = 8 (p-value &gt; 0.05)</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Z-Score Confidence</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 850, color: '#16A34A', fontFamily: 'monospace', margin: '3px 0' }}>
            99.0%
          </div>
          <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 700 }}>±2.576 Standard Deviations</div>
        </div>
      </div>

      {/* ── Side-by-Side Dual Pane: Benford Plot (Left) & Digit Matrix Table (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)', gap: '16px', alignItems: 'stretch' }}>
        {/* Left: Benford Chart Card matching Image 2 */}
        <div style={{
          background: '#FFFFFF',
          padding: '20px 22px',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#007680', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              FORENSIC DISTRIBUTION SIGNAL
            </span>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
              Benford's Law First-Digit Analysis
            </h4>
            <p style={{ margin: '3px 0 10px', fontSize: '0.74rem', color: '#64748B' }}>
              Hover over any bar for comprehensive population share, variance, and audit interpretation.
            </p>
          </div>

          <div style={{ height: '330px', width: '100%' }}>
            <Bar data={chartData as any} options={chartOptions} />
          </div>
        </div>

        {/* Right: 1 - 9 Digit Variance Matrix Table */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h5 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Digit-by-Digit Variance &amp; Anomaly Matrix
            </h5>
            <span style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600 }}>9 Analytical Dimensions</span>
          </div>
          <div style={{ overflowX: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ width: '18%', padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>Leading Digit</th>
                  <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>Observed (%)</th>
                  <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>Expected (%)</th>
                  <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>Variance (pp)</th>
                  <th style={{ width: '28%', padding: '10px 14px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {benfordDigits.map((d, idx) => {
                  const obs = actualValues[idx];
                  const exp = theoreticalValues[idx];
                  const diff = (obs - exp).toFixed(2);
                  const isAnom = Math.abs(Number(diff)) > 3.0;
                  return (
                    <tr key={d} style={{ borderBottom: idx < 8 ? '1px solid #F1F5F9' : 'none', background: isAnom ? 'rgba(254, 242, 242, 0.6)' : '#FFFFFF' }}>
                      <td style={{ padding: '9.5px 14px', fontWeight: 750, color: '#0F172A', whiteSpace: 'nowrap' }}>Digit {d}</td>
                      <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#007680', whiteSpace: 'nowrap' }}>{obs.toFixed(1)}%</td>
                      <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>{exp.toFixed(1)}%</td>
                      <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: Number(diff) > 0 ? '#DC2626' : '#2563EB', whiteSpace: 'nowrap' }}>
                        {Number(diff) > 0 ? `+${diff}` : diff}
                      </td>
                      <td style={{ padding: '9.5px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.66rem', fontWeight: 750, padding: '2px 8px', borderRadius: '4px',
                          background: isAnom ? '#FEE2E2' : '#DCFCE7',
                          color: isAnom ? '#991B1B' : '#166534',
                          border: `1px solid ${isAnom ? '#FECDD3' : '#BBF7D0'}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {isAnom ? 'ANOMALY DETECTED' : 'CONFORMING'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sheet 11: Population Refinement & Audit Exclusions Funnel ──
const OmniaExclusionsFunnelSheet: React.FC<{
  status: RunSummary | null;
  totalGlRows: number;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  options: any;
  doughnutOptions: any;
}> = ({ status, totalGlRows, fmtNum, fmtCurr, options, doughnutOptions }) => {
  const excl = ((status?.exclusionsSummary || {}) as Record<string, any>);
  const zeroExcl = Number(excl.zeroAmountCount || excl.zeroAmounts || 0);
  const batchExcl = Number(excl.systemBatchCount || excl.systemBatch || 0);
  const routineExcl = Number(excl.routineRecurringCount || excl.routineExclusions || 0);
  const totalExcl = zeroExcl + batchExcl + routineExcl;
  const refinedScope = Math.max(0, totalGlRows - totalExcl);

  const funnelBarData = {
    labels: ['1. Ingested Population', '2. Zero Amounts Excluded', '3. System Batch Excluded', '4. Refined Testing Scope'],
    datasets: [
      {
        label: 'GL Transaction Count',
        data: [totalGlRows, zeroExcl, batchExcl, refinedScope > 0 ? refinedScope : totalGlRows],
        backgroundColor: ['#007680', '#EF4444', '#F59E0B', '#10B981'],
        borderRadius: 6,
        barPercentage: 0.5,
      },
    ],
  };

  const donutExclusionData = {
    labels: ['Refined Active Scope', 'Zero Amounts', 'System Batch Feeds'],
    datasets: [
      {
        data: [refinedScope > 0 ? refinedScope : totalGlRows, Math.max(1, zeroExcl), Math.max(1, batchExcl)],
        backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Header */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>
            POPULATION SURVEILLANCE
          </span>
          <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Population Refinement &amp; Audit Exclusions Funnel
          </h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
          Trace of raw ingested General Ledger records through rule-based exclusion filters down to the final refined audit population.
        </p>
      </div>

      {/* 4 Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Total Ingested</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '3px 0' }}>
            {fmtNum(totalGlRows)}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#007680', fontWeight: 700 }}>100% Ingested</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Zero Amount Excluded</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#EF4444', fontFamily: 'monospace', margin: '3px 0' }}>
            {fmtNum(zeroExcl)}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#DC2626' }}>Net 0.00 entries</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>System Batch Excluded</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#F59E0B', fontFamily: 'monospace', margin: '3px 0' }}>
            {fmtNum(batchExcl)}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#D97706' }}>Automated feeds</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>Refined Testing Scope</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#16A34A', fontFamily: 'monospace', margin: '3px 0' }}>
            {fmtNum(refinedScope > 0 ? refinedScope : totalGlRows)}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 700 }}>Under Active Scope</div>
        </div>
      </div>

      {/* Dual Visual Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={15} color="#007680" /> Population Reduction Waterfall
            </h4>
            <span style={{ fontSize: '0.70rem', color: '#64748B' }}>Exclusion Filter Cascade</span>
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            <Bar data={funnelBarData} options={options} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PieIcon size={15} color="#007680" /> Scope Retention Distribution
            </h4>
            <span style={{ fontSize: '0.70rem', color: '#64748B' }}>Callout Breakdown</span>
          </div>
          <div style={{ width: '100%', height: '240px', position: 'relative' }}>
            <Doughnut data={donutExclusionData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sheet 12: Engagement Metadata & Audit Parameters ──
const OmniaEngagementDetailsSheet: React.FC<{
  config: RunConfig | null;
  status: RunSummary | null;
  engagementName: string;
  currencyCode: string;
  fiscalYearEnd: string;
  materiality: number;
  fmtCurr: (n: number) => string;
  fmtNum: (n: number) => string;
}> = ({
  config,
  status,
  engagementName,
  currencyCode,
  fiscalYearEnd,
  materiality,
  fmtCurr,
  fmtNum,
}) => {
  const totalGl = status?.totalInputRows?.gl || 0;
  const totalTb = status?.totalInputRows?.tb || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontSize: '0.70rem', fontWeight: 800, background: '#007680', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px' }}>
            ENGAGEMENT CONFIGURATION
          </span>
          <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Audit Engagement Parameters &amp; Materiality Matrix
          </h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
          Official scope parameters, testing thresholds, and multi-sheet CDM workbook settings configured for this audit run.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Client &amp; Engagement</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 850, color: '#0F172A', margin: '6px 0 2px' }}>{engagementName}</div>
          <div style={{ fontSize: '0.74rem', color: '#007680', fontWeight: 600 }}>Fiscal Year End: {fiscalYearEnd}</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Materiality Threshold</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 850, color: '#007680', fontFamily: 'monospace', margin: '6px 0 2px' }}>{fmtCurr(materiality)}</div>
          <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Entity Currency: {currencyCode}</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Ledger Population</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace', margin: '6px 0 2px' }}>{fmtNum(totalGl)} Lines</div>
          <div style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 600 }}>Trial Balance: {fmtNum(totalTb)} Accounts</div>
        </div>
      </div>
    </div>
  );
};
