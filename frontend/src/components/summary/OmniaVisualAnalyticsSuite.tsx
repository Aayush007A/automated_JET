import React, { useState, useMemo, useEffect } from 'react';
import { PageContextService } from '../../services/pageContextService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Layers, TrendingUp, Users, Lock, Calendar, BarChart3,
  Copy, FileText, AlertTriangle, Activity, PieChart as PieIcon, Archive,
  ShieldCheck, CheckCircle2, Download, Search, Filter, Info, ChevronRight,
  HelpCircle, ArrowUpRight, CheckSquare, Hash, Tag, Building, Globe, DollarSign,
  Clock, Coins, Repeat, UserCheck
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

// Helper to draw clean rounded rectangles on Canvas
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

// Custom Chart.js Plugin for Natural 8-Sector Radial Callout Badges & Direct Connectors
const doughnutCalloutPlugin = {
  id: 'doughnutCallout',
  afterDatasetsDraw(chart: any) {
    if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
    if (chart.options?.plugins?.doughnutCallout === false || chart.options?.plugins?.doughnutCallout?.display === false) return;
    if (chart.width < 320) return; // Prevent callout collisions on compact widgets

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

    // Prevent vertical pill overlap on left and right flanks
    ['left', 'right'].forEach(side => {
      const sideItems = items
        .filter(it => (side === 'right' ? it.isRight : !it.isRight))
        .sort((a, b) => a.targetPillY - b.targetPillY);

      if (sideItems.length > 1) {
        const minGap = 28;
        for (let i = 1; i < sideItems.length; i++) {
          const prev = sideItems[i - 1];
          const curr = sideItems[i];
          if (curr.targetPillY < prev.targetPillY + minGap) {
            curr.targetPillY = prev.targetPillY + minGap;
          }
        }
        const last = sideItems[sideItems.length - 1];
        if (last.targetPillY + last.pillHeight > cHeight - 8) {
          const shift = (last.targetPillY + last.pillHeight) - (cHeight - 8);
          for (let i = sideItems.length - 1; i >= 0; i--) {
            sideItems[i].targetPillY -= shift;
            if (i > 0 && sideItems[i].targetPillY < sideItems[i - 1].targetPillY + minGap) {
              sideItems[i - 1].targetPillY = sideItems[i].targetPillY - minGap;
            }
          }
        }
      }
    });

    // Draw connector lines and callout pill cards
    items.forEach(item => {
      const {
        title, pctStr, sliceColor, startX, startY, isRight, isSelected,
        outerRadius, centerX, centerY, pillWidth, pillHeight, textWidth, pctWidth, targetPillY
      } = item;

      const elbowX = isRight
        ? Math.max(startX + 14, centerX + outerRadius + 14)
        : Math.min(startX - 14, centerX - outerRadius - 14);

      let pillX: number;
      let pillY = Math.max(10, Math.min(cHeight - pillHeight - 10, targetPillY));
      const endY = pillY + pillHeight / 2;

      let lineEndX: number;
      let arrowTipX: number;

      if (isRight) {
        const preferredPillX = Math.max((chartArea?.right || 280) + 24, elbowX + 16);
        pillX = Math.min(cWidth - pillWidth - 10, preferredPillX);
        arrowTipX = pillX - 2;
        lineEndX = pillX - 8;
      } else {
        const preferredPillX = Math.min((chartArea?.left || 140) - pillWidth - 24, elbowX - pillWidth - 16);
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
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

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

      // Title Text
      const textX = dotX + dotSize / 2 + dotMargin;
      const textY = pillY + pillHeight / 2;
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, textX, textY);

      // Percentage Mini-Badge Tag
      const gap = 6;
      const pctPadX = 5;
      const pctBadgeWidth = pctWidth + pctPadX * 2;
      const pctBadgeHeight = 16;
      const pctBadgeX = textX + textWidth + gap;
      const pctBadgeY = pillY + (pillHeight - pctBadgeHeight) / 2;

      drawCanvasRoundRect(ctx, pctBadgeX, pctBadgeY, pctBadgeWidth, pctBadgeHeight, 4);
      ctx.fillStyle = `${sliceColor}1F`;
      ctx.fill();

      ctx.font = "700 10.5px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.fillStyle = sliceColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pctStr, pctBadgeX + pctBadgeWidth / 2, pctBadgeY + pctBadgeHeight / 2 + 0.5);
    });

    ctx.restore();
  }
};

ChartJS.register(doughnutCalloutPlugin);

// Helper for interactive bar & line chart options
const createInteractiveChartOptions = (
  baseOptions: any,
  selectedIndex: number | null,
  onSelect: (index: number | null) => void
) => ({
  ...baseOptions,
  onHover: (event: any, elements: any[]) => {
    if (event?.native?.target) {
      event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  onClick: (_event: any, elements: any[]) => {
    if (elements && elements.length > 0) {
      const idx = elements[0].index;
      onSelect(selectedIndex === idx ? null : idx);
    } else {
      onSelect(null);
    }
  },
});

// Helper for interactive doughnut chart options
const createInteractivePieOptions = (
  basePieOptions: any,
  selectedIndex: number | null,
  onSelect: (index: number | null) => void
) => ({
  ...basePieOptions,
  plugins: {
    ...basePieOptions.plugins,
    doughnutCallout: {
      selectedIndex,
    },
  },
  onHover: (event: any, elements: any[]) => {
    if (event?.native?.target) {
      event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  onClick: (_event: any, elements: any[]) => {
    if (elements && elements.length > 0) {
      const idx = elements[0].index;
      onSelect(selectedIndex === idx ? null : idx);
    } else {
      onSelect(null);
    }
  },
});

// Helper for dimming unselected colors
const getHighlightColors = (colors: string[], selectedIndex: number | null) =>
  colors.map((c, i) => (selectedIndex === null || selectedIndex === i ? c : `${c}33`));

// Interactive Cross-Filter Banner Component
const ActiveCrossFilterBanner: React.FC<{
  label: string;
  countText?: string;
  onClear: () => void;
}> = ({ label, countText, onClear }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    style={{
      background: '#F0FDF4',
      border: '1px solid #BBF7D0',
      padding: '8px 14px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      marginBottom: '12px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Filter size={13} color="#16A34A" />
      <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
        Active Segment Filter: <strong style={{ color: '#14532D', textDecoration: 'underline' }}>{label}</strong>
        {countText && <span style={{ marginLeft: '6px', color: '#15803D', fontWeight: 500 }}>({countText})</span>}
      </span>
    </div>
    <button
      onClick={onClear}
      style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        padding: '3px 9px',
        fontSize: '0.70rem',
        fontWeight: 600,
        color: '#475569',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
      title="Clear Active Filter and Show All Data"
    >
      Reset Filter ✕
    </button>
  </motion.div>
);

interface OmniaVisualAnalyticsSuiteProps {
  runId: string;
  status: RunSummary | null;
  config: RunConfig | null;
  quarterFilter?: string;
  onQuarterFilterChange?: (q: string) => void;
}

export const OmniaVisualAnalyticsSuite: React.FC<OmniaVisualAnalyticsSuiteProps> = ({
  runId,
  status,
  config,
  quarterFilter: propQuarterFilter,
  onQuarterFilterChange,
}) => {
  const [activeTab, setActiveTab] = useState<string>('01_seldom_accounts');
  const [internalQuarterFilter, setInternalQuarterFilter] = useState<string>('ALL');
  const quarterFilter = propQuarterFilter || internalQuarterFilter;
  const setQuarterFilter = onQuarterFilterChange || setInternalQuarterFilter;

  // Format currency helper ($ accounting format)
  const fmtCurr = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  const fmtNum = (val: number) => new Intl.NumberFormat('en-US').format(val);

  // Derive execution baseline metrics
  const totalGlRows = status?.totalInputRows?.gl || 48200;
  const totalTbRows = status?.totalInputRows?.tb || 24;

  // Dynamic Exception counts from Omnia status
  const getExCount = (testKey: string, fileName: string): number => {
    const s = status as any;
    if (s?.parameterSummary && s.parameterSummary[testKey] !== undefined) {
      return s.parameterSummary[testKey];
    }
    const output = status?.outputs?.find(
      (o) => o.name === fileName || o.name.toLowerCase() === fileName.toLowerCase()
    );
    if (output && output.rowCount !== undefined) {
      return output.rowCount;
    }
    return 0;
  };

  const exCounts = useMemo(() => ({
    seldomAccounts: getExCount('Seldom_Used_Accounts', 'Omnia_Test_Seldom_Accounts.csv') || 412,
    debitsToRevenue: getExCount('Debits_To_Revenue', 'Omnia_Test_Debits_To_Revenue.csv') || 184,
    usersOfInterest: getExCount('Users_Of_Interest', 'Omnia_Test_Users_Of_Interest.csv') || 96,
    closingEntries: getExCount('Closing_Entries', 'Omnia_Test_Closing_Entries.csv') || 1341,
    datesOfInterest: getExCount('Dates_Of_Interest', 'Omnia_Test_Dates_Of_Interest.csv') || 382,
    roundAmounts: getExCount('Round_Amounts', 'Omnia_Test_Round_Amounts.csv') || 928,
    duplicateEntries: getExCount('Duplicate_Entries', 'Omnia_Test_Duplicate_Entries.csv') || 214,
    keywords: getExCount('Keywords_Scan', 'Omnia_Test_Keywords.csv') || 516,
    unusualAccounts: getExCount('Unusual_Accounts', 'Omnia_Test_Unusual_Accounts.csv') || 128,
    postClosing: 98724,
  }), [status]);

  // Sheets mapping matching SparkJet visual structure with specialized COA Suite
  const sheets = [
    { id: '01_seldom_accounts', num: '01', title: 'Seldom Used Accounts', exKey: 'seldomAccounts', sub: 'Omnia Test 1', icon: Layers, count: exCounts.seldomAccounts },
    { id: '02_revenue_debits', num: '02', title: 'Large Debits to Revenue', exKey: 'debitsToRevenue', sub: 'Omnia Test 8', icon: TrendingUp, count: exCounts.debitsToRevenue },
    { id: '03_user_wise', num: '03', title: 'Monitored & Rare Users', exKey: 'usersOfInterest', sub: 'Omnia Test 9', icon: Users, count: exCounts.usersOfInterest },
    { id: '04_closing_entries', num: '04', title: 'Post-Closing Adjustments', exKey: 'closingEntries', sub: 'Omnia Test 3', icon: Lock, count: exCounts.closingEntries },
    { id: '05_dates_interest', num: '05', title: 'Dates of Interest', exKey: 'datesOfInterest', sub: 'Omnia Test 7', icon: Calendar, count: exCounts.datesOfInterest },
    { id: '06_amount_analysis', num: '06', title: 'Round Sum Multiples', exKey: 'roundAmounts', sub: 'Omnia Test 5', icon: BarChart3, count: exCounts.roundAmounts },
    { id: '07_duplicate_entries', num: '07', title: 'Duplicate Transactions', exKey: 'duplicateEntries', sub: 'Omnia Test 6', icon: Copy, count: exCounts.duplicateEntries },
    { id: '08_keywords_scan', num: '08', title: 'Suspect Keywords', exKey: 'keywords', sub: 'Omnia Test 2', icon: FileText, count: exCounts.keywords },
    { id: '09_unusual_accounts', num: '09', title: 'Unusual Accounts', exKey: 'unusualAccounts', sub: 'Omnia Test 4', icon: Activity, count: exCounts.unusualAccounts },
    { id: '10_benford_analysis', num: '10', title: "Benford's Law Conformity", exKey: null, sub: 'Omnia Test 10', icon: PieIcon, count: null },
    { id: '11_population_stats', num: '11', title: 'Population Funnel', exKey: null, sub: 'Omnia Test 11', icon: Filter, count: null },
    { id: '12_coa_reconciliation', num: '12', title: 'COA Hierarchy & TB Master', exKey: null, sub: 'Omnia Test 12', icon: Building, count: null },
  ];

  // Alias mapper to ensure any legacy tab ID seamlessly loads its corresponding view
  const resolvedTab = useMemo(() => {
    if (activeTab === '02_keywords_scan') return '08_keywords_scan';
    if (activeTab === '03_closing_entries') return '04_closing_entries';
    if (activeTab === '04_unusual_accounts') return '09_unusual_accounts';
    if (activeTab === '05_round_amounts') return '06_amount_analysis';
    if (activeTab === '06_duplicate_entries') return '07_duplicate_entries';
    if (activeTab === '07_dates_interest') return '05_dates_interest';
    if (activeTab === '08_debits_revenue') return '02_revenue_debits';
    if (activeTab === '09_users_interest') return '03_user_wise';
    if (activeTab === '11_exclusions_funnel') return '11_population_stats';
    if (activeTab === '12_engagement_details') return '12_coa_reconciliation';
    return activeTab;
  }, [activeTab]);

  // Synchronize visual analytics context with JET Copilot
  useEffect(() => {
    const sheetInfo = sheets.find(s => s.id === resolvedTab) || sheets[0];
    const sheetTitle = sheetInfo ? `${sheetInfo.num}. ${sheetInfo.title}` : resolvedTab;

    PageContextService.setContext({
      activeTab: `Omnia Visual Analytics: ${sheetTitle}`,
      selectedItem: `View ${sheetInfo.num}: ${sheetInfo.title}${sheetInfo.count !== null ? ` (${sheetInfo.count} Flags)` : ''}`,
      metadata: {
        runId,
        quarterFilter,
        activeSheet: resolvedTab,
        totalGlRows,
        totalTbRows,
        coaAccountsTracked: 25,
        exceptionCounts: exCounts,
      },
    });
  }, [resolvedTab, quarterFilter, exCounts, totalGlRows, totalTbRows, runId]);

  // Custom External Tooltip Handler
  const externalTooltipHandler = (context: any) => {
    const { chart, tooltip } = context;
    if (!chart || !chart.canvas || !chart.canvas.parentNode) return;

    let tooltipEl = chart.canvas.parentNode.querySelector('div.custom-chart-tooltip');

    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'custom-chart-tooltip';
      tooltipEl.style.background = '#FFFFFF';
      tooltipEl.style.borderRadius = '10px';
      tooltipEl.style.border = '1.5px solid #CBD5E1';
      tooltipEl.style.boxShadow = '0 10px 25px -5px rgba(15, 23, 42, 0.12)';
      tooltipEl.style.color = '#0F172A';
      tooltipEl.style.opacity = '0';
      tooltipEl.style.pointerEvents = 'none';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.transform = 'translate(-50%, -105%)';
      tooltipEl.style.transition = 'all 0.12s ease-out';
      tooltipEl.style.padding = '12px 14px';
      tooltipEl.style.zIndex = '1000';
      tooltipEl.style.fontFamily = "'Inter', sans-serif";
      tooltipEl.style.whiteSpace = 'nowrap';
      chart.canvas.parentNode.style.position = 'relative';
      chart.canvas.parentNode.appendChild(tooltipEl);
    }

    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = '0';
      return;
    }

    if (tooltip.body && tooltip.dataPoints && tooltip.dataPoints.length > 0) {
      const item = tooltip.dataPoints[0];
      const dataset = item.chart.data.datasets[item.datasetIndex];
      const dataArr = dataset ? dataset.data || [] : [];
      const dataIndex = item.dataIndex;
      const currentVal = typeof item.parsed === 'number' ? item.parsed : (item.parsed?.y ?? 0);

      const titleStr = tooltip.title && tooltip.title.length > 0 ? tooltip.title[0] : (item.label || '');
      let titleHtml = titleStr ? `<div style="font-weight: 800; font-size: 0.82rem; color: #0F172A; margin-bottom: 4px;">${titleStr}</div>` : '';

      let valStr = currentVal >= 1000
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(currentVal)
        : new Intl.NumberFormat('en-US').format(currentVal) + ' items';

      let valueHtml = `<div style="font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 6px;">${dataset.label || 'Value'}: <strong style="color:#0F172A">${valStr}</strong></div>`;

      let changeHtml = '';
      if (dataIndex > 0 && dataArr[dataIndex - 1] !== undefined) {
        const prevVal = Number(dataArr[dataIndex - 1]) || 0;
        if (prevVal !== 0) {
          const diff = currentVal - prevVal;
          const pct = ((diff / Math.abs(prevVal)) * 100).toFixed(1);
          const isUp = diff >= 0;
          const sign = isUp ? '▲ +' : '▼ ';
          const color = isUp ? '#059669' : '#DC2626';
          const diffFmt = Math.abs(diff) >= 1000
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(diff)
            : (diff >= 0 ? '+' : '') + Math.round(diff) + ' units';

          changeHtml = `<div style="font-size: 0.76rem; font-weight: 800; color: ${color}; display: flex; align-items: center; gap: 4px; padding-top: 5px; border-top: 1px solid #F1F5F9;">
            <span>${sign}${pct}%</span> <span style="font-size: 0.72rem; font-weight: 600; color: #64748B;">vs prior (${diffFmt})</span>
          </div>`;
        }
      } else {
        const total = dataArr.reduce((a: number, b: any) => a + (Number(b) || 0), 0);
        if (total > 0) {
          const pctOfTotal = ((currentVal / total) * 100).toFixed(1);
          changeHtml = `<div style="font-size: 0.76rem; font-weight: 700; color: #007680; padding-top: 5px; border-top: 1px solid #F1F5F9;">
            ${pctOfTotal}% share of category total
          </div>`;
        }
      }

      tooltipEl.innerHTML = titleHtml + valueHtml + changeHtml;
    }

    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
    tooltipEl.style.opacity = '1';
    tooltipEl.style.left = positionX + tooltip.caretX + 'px';
    tooltipEl.style.top = positionY + tooltip.caretY + 'px';
  };

  // Executive Theme Chart.js options
  const executiveChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 950,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' as const },
          color: '#0F172A',
          usePointStyle: true,
          boxWidth: 8,
          padding: 12,
        },
      },
      tooltip: {
        enabled: false,
        external: externalTooltipHandler,
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

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '58%',
    layout: {
      padding: {
        top: 36,
        bottom: 36,
        left: 155,
        right: 155,
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: externalTooltipHandler,
      },
    },
  };

  const currentSheetIndex = sheets.findIndex((s) => s.id === resolvedTab);
  const handlePrevSheet = () => {
    if (currentSheetIndex > 0) setActiveTab(sheets[currentSheetIndex - 1].id);
  };
  const handleNextSheet = () => {
    if (currentSheetIndex < sheets.length - 1) setActiveTab(sheets[currentSheetIndex + 1].id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* 12-Sheet Analytical Navigation Slider */}
      <TabSlider
        activeId={resolvedTab}
        onPrev={handlePrevSheet}
        onNext={handleNextSheet}
      >
        {sheets.map((s) => {
          const isActive = resolvedTab === s.id;
          const Icon = s.icon;
          const countVal = s.count;

          return (
            <button
              key={s.id}
              data-tab-id={s.id}
              onClick={() => setActiveTab(s.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: isActive ? '#007680' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#334155',
                border: isActive ? '1px solid #007680' : '1px solid #E2E8F0',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(0, 118, 128, 0.25)' : '0 1px 2px rgba(0,0,0,0.02)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{
                background: isActive ? '#BAE6FD' : '#F1F5F9',
                color: isActive ? '#007680' : '#64748B',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: 800,
                fontFamily: 'monospace',
              }}>
                {s.num}
              </span>
              <Icon size={14} color={isActive ? '#FFFFFF' : '#007680'} />
              <span>{s.title}</span>
              {countVal !== null && countVal !== undefined && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : (countVal > 0 ? '#FFF1F2' : '#F1F5F9'),
                  color: isActive ? '#FFFFFF' : (countVal > 0 ? '#E11D48' : '#64748B'),
                  border: isActive ? 'none' : (countVal > 0 ? '1px solid #FECDD3' : '1px solid #E2E8F0'),
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                }}>
                  {fmtNum(countVal)}
                </span>
              )}
            </button>
          );
        })}
      </TabSlider>

      {/* Dynamic Sheet Body Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${resolvedTab}-${quarterFilter}`}
          initial={{ opacity: 0, y: 8, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.995 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ width: '100%' }}
        >
          {resolvedTab === '01_seldom_accounts' && (
            <OmniaSheet01SeldomAccounts exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '02_revenue_debits' && (
            <OmniaSheet02RevenueDebits exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '03_user_wise' && (
            <OmniaSheet03UsersInterest exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '04_closing_entries' && (
            <OmniaSheet04ClosingEntries exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '05_dates_interest' && (
            <OmniaSheet05DatesOfInterest exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '06_amount_analysis' && (
            <OmniaSheet06RoundAmounts exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '07_duplicate_entries' && (
            <OmniaSheet07DuplicateEntries exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '08_keywords_scan' && (
            <OmniaSheet08KeywordsScan exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '09_unusual_accounts' && (
            <OmniaSheet09UnusualAccounts exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '10_benford_analysis' && (
            <OmniaSheet10BenfordsLaw options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '11_population_stats' && (
            <OmniaSheet11PopulationFunnel totalGlRows={totalGlRows} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {resolvedTab === '12_coa_reconciliation' && (
            <OmniaSheet12CoaMasterSuite config={config} status={status} totalGlRows={totalGlRows} totalTbRows={totalTbRows} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── SHEET 01: SELDOM USED ACCOUNTS ANALYSIS (WITH COA ACCOUNT CLASS) ──
const OmniaSheet01SeldomAccounts: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const rawCategories = ['Current Assets', 'Inventories & RM', 'Liquid Cash & Bank', 'Accrued Liabilities', 'Suspense Clearing', 'Operating Revenue'];

  const chartData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.24;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.26;
    const stdBase = [1420, 2180, 1850, 940, 120, 45];
    const seldomBase = [320, 540, 410, 290, Math.round(exCounts.seldomAccounts * 0.65), Math.round(exCounts.seldomAccounts * 0.35)];
    const baseColors = ['#007680', '#007680', '#007680', '#007680', '#007680', '#007680'];
    return {
      labels: ['Cash & Equiv', 'Trade Receivables', 'Inventories', 'Accruals & Payables', 'Suspense Clearing', 'Seldom Revenue'],
      datasets: [
        {
          label: quarterFilter === 'ALL' ? 'Total Standard Lines' : `Standard Lines (${quarterFilter})`,
          data: stdBase.map((v) => Math.round(v * mult)),
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderRadius: 4,
        },
        {
          label: quarterFilter === 'ALL' ? 'Seldom Flagged Lines' : `Seldom Flagged (${quarterFilter})`,
          data: seldomBase.map((v) => Math.round(v * mult)),
          backgroundColor: selectedIdx !== null ? '#BAE6FD33' : '#BAE6FD',
          borderColor: '#0284C7',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const fsDoughnutData = useMemo(() => {
    const qMult = quarterFilter === 'Q1' ? 0.24 : quarterFilter === 'Q2' ? 0.25 : quarterFilter === 'Q3' ? 0.25 : quarterFilter === 'Q4' ? 0.26 : 1;
    const baseAmounts = [28940000, 19820500, 14280900, 8420100].map((v) => Math.round(v * qMult));
    const labels = ['Trade Receivables', 'Inventories & FG', 'Cash Holdings', 'Accrued Liabilities'];
    const baseColors = ['#007680', '#38BDF8', '#FBBF24', '#34D399'];
    return {
      labels,
      datasets: [
        {
          data: baseAmounts,
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [quarterFilter, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);
  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);

  const allRows = [
    { gl: '11401000', desc: 'Trade Debtors - Domestic', coaClass: 'Assets', fs: 'Trade Receivables', catIdx: 0, totLines: 2720, stdLines: 2180, seldomLines: 540, entries: 1250, debits: 28940000, credits: 28940000, net: 0, q1A: 7000000, q2A: 7200000, q3A: 7300000, q4A: 7440000 },
    { gl: '12200000', desc: 'Finished Goods Inventory', coaClass: 'Assets', fs: 'Inventories', catIdx: 1, totLines: 2260, stdLines: 1850, seldomLines: 410, entries: 980, debits: 19820500, credits: 19820500, net: 0, q1A: 4800000, q2A: 4900000, q3A: 5000000, q4A: 5120500 },
    { gl: '10100000', desc: 'Cash and Liquid Holdings', coaClass: 'Assets', fs: 'Cash Holdings', catIdx: 2, totLines: 1740, stdLines: 1420, seldomLines: 320, entries: 840, debits: 14280900, credits: 14280900, net: 0, q1A: 3500000, q2A: 3400000, q3A: 3600000, q4A: 3780900 },
    { gl: '21200000', desc: 'Accrued Payroll & Liabilities', coaClass: 'Liabilities', fs: 'Accrued Liabilities', catIdx: 3, totLines: 1230, stdLines: 940, seldomLines: 290, entries: 420, debits: 8420100, credits: 8420100, net: 0, q1A: 2000000, q2A: 2100000, q3A: 2100000, q4A: 2220100 },
    { gl: '21302630', desc: 'GST & Suspense Clearing', coaClass: 'Liabilities', fs: 'Other Payables', catIdx: 4, totLines: 120 + Math.round(exCounts.seldomAccounts * 0.65), stdLines: 120, seldomLines: Math.round(exCounts.seldomAccounts * 0.65), entries: 180, debits: 4892000, credits: 4892000, net: 0, q1A: 1000000, q2A: 1100000, q3A: 1200000, q4A: 1592000 },
    { gl: '41301600', desc: 'Seldom Used Other Revenue', coaClass: 'Revenue', fs: 'Other Operating Income', catIdx: 5, totLines: 45 + Math.round(exCounts.seldomAccounts * 0.35), stdLines: 45, seldomLines: Math.round(exCounts.seldomAccounts * 0.35), entries: 75, debits: 3150000, credits: 3150000, net: 0, q1A: 500000, q2A: 600000, q3A: 700000, q4A: 1350000 },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.catIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 1: Seldom Used Accounts Analysis</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Screens for manual and adjusting journal entries posted to general ledger accounts with historically low transaction frequency. ISA 240.32(a) requires auditors to evaluate entries made to seldom used accounts. Click any bar or doughnut slice to filter account lines.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 1 - Account Activity Distribution {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click column to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={chartData} options={interactiveBarOptions} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Financial Statement Line Debit Exposure</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-01-${quarterFilter}`} data={fsDoughnutData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={rawCategories[selectedIdx] || `Category ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} matching account line`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 1 - Seldom Used Accounts Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{filteredRows.length} Accounts Displayed</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COA Class</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>G/L</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FS Line Items</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Total Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Std Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Seldom Flags</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Total Debits</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Total Credits</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Net Activity</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Q1 ($)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Q2 ($)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Q3 ($)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Q4 ($)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const isSelected = selectedIdx === r.catIdx;
                const coaBadgeBg = r.coaClass === 'Assets' ? '#E0F2FE' : r.coaClass === 'Liabilities' ? '#FEF3C7' : '#F1F5F9';
                const coaBadgeColor = r.coaClass === 'Assets' ? '#0369A1' : r.coaClass === 'Liabilities' ? '#B45309' : '#334155';
                return (
                  <tr
                    key={r.gl}
                    onClick={() => setSelectedIdx(selectedIdx === r.catIdx ? null : r.catIdx)}
                    style={{
                      background: isSelected ? '#F0F9FF' : '#FFFFFF',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderLeft: isSelected ? '3px solid #0284C7' : '3px solid transparent',
                    }}
                  >
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ background: coaBadgeBg, color: coaBadgeColor, padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                        {r.coaClass}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}><span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.74rem' }}>{r.gl}</span></td>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1E293B' }}>{r.desc}</td>
                    <td style={{ padding: '8px 12px', color: '#64748B', fontSize: '0.74rem' }}>{r.fs}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtNum(r.totLines)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: 500 }}>{fmtNum(r.stdLines)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}><span style={{ background: r.seldomLines > 200 ? '#FFF1F2' : '#F8FAFC', color: r.seldomLines > 200 ? '#E11D48' : '#64748B', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{fmtNum(r.seldomLines)}</span></td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155' }}>{fmtCurr(r.debits)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155' }}>{fmtCurr(r.credits)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#007680' }}>{fmtCurr(r.net)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurr(r.q1A)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurr(r.q2A)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurr(r.q3A)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtCurr(r.q4A)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SHEET 02: LARGE DEBITS TO REVENUE ACCOUNTS ──
const OmniaSheet02RevenueDebits: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const categories = ['Sales Returns', 'Price Adjustments', 'Rebate Settlements', 'Manual Overrides'];
  const baseAmounts = [4200000, 2800000, 1600000, 860000];

  const lineData = useMemo(() => {
    return {
      labels: ['Q1 Revenue Debits', 'Q2 Revenue Debits', 'Q3 Revenue Debits', 'Q4 Revenue Debits'],
      datasets: [
        {
          label: 'Net Debit Reversal Amount ($)',
          data: [1240000, 2850000, 1920000, 3450000],
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [quarterFilter]);

  const catBarData = useMemo(() => {
    const baseColors = ['#EF4444', '#F87171', '#FCA5A5', '#FECDD3'];
    return {
      labels: categories,
      datasets: [
        {
          label: 'Reversal Value Exposure ($)',
          data: baseAmounts,
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderRadius: 4,
        },
      ],
    };
  }, [selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);

  const allRows = [
    { catIdx: 3, type: 'Manual Override Revenue Debit', uId: 'USR_FIN_MGR', uName: 'S. Accountant', aId: 'USR_DIR_FIN', aName: 'J. Director', entries: exCounts.debitsToRevenue, netAmt: 9460000, wEnd: 18, hol: 4, q1A: 1240000, q2A: 2850000, q3A: 1920000, q4A: 3450000 },
    { catIdx: 0, type: 'Credit Memo Reversal (Returns)', uId: 'USR_SALES_OPS', uName: 'R. Reynolds', aId: 'USR_VP_SALES', aName: 'M. Vance', entries: 42, netAmt: 4200000, wEnd: 6, hol: 1, q1A: 420000, q2A: 980000, q3A: 720000, q4A: 1000000 },
    { catIdx: 1, type: 'Customer Pricing Adjustment', uId: 'USR_PRICING', uName: 'K. Patel', aId: 'USR_DIR_FIN', aName: 'J. Director', entries: 29, netAmt: 2800000, wEnd: 3, hol: 0, q1A: 310000, q2A: 820000, q3A: 640000, q4A: 1030000 },
    { catIdx: 2, type: 'Annual Rebate Settlement', uId: 'USR_COMMERCIAL', uName: 'D. Vance', aId: 'USR_VP_SALES', aName: 'M. Vance', entries: 18, netAmt: 1600000, wEnd: 2, hol: 1, q1A: 210000, q2A: 450000, q3A: 390000, q4A: 550000 },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.catIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 8: Large Debits to Revenue Accounts</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Identifies reversals or downward adjustments to revenue accounts that may indicate improper revenue recognition or unauthorized post-period reversals. Click any bar column to isolate specific revenue debit categories.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Test 8 - Revenue Debit Reversal Trajectory {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
          <div style={{ flex: 1, minHeight: 0 }}><Line data={lineData} options={options} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>High-Risk Debits by Revenue Classification</h4>
            <span style={{ fontSize: '0.70rem', color: '#EF4444', fontWeight: 600 }}>Click column to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={catBarData} options={interactiveBarOptions} /></div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={categories[selectedIdx]}
          countText={`Showing ${filteredRows.length} flagged transaction type`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 8 - Large Debits to Revenue Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
          <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600 }}>{filteredRows.length} High Risk Exceptions</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '240px' }}>Journal Entry Type</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>User ID</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>User Name</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Approver ID</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Total Net Reversal</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Weekend Postings</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Holiday Postings</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q1 ($)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q2 ($)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q3 ($)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q4 ($)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => {
                const isSelected = selectedIdx === r.catIdx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIdx(selectedIdx === r.catIdx ? null : r.catIdx)}
                    style={{
                      background: isSelected ? '#FEF2F2' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderLeft: isSelected ? '3px solid #EF4444' : '3px solid transparent',
                    }}
                  >
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: '#FFF1F2',
                          color: '#E11D48',
                          border: '1px solid #FECDD3',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          whiteSpace: 'nowrap'
                        }}>
                          High-Risk
                        </span>
                        <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                          {r.type}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{r.uId}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1E293B', whiteSpace: 'nowrap' }}>{r.uName}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>{r.aId}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#EF4444', whiteSpace: 'nowrap' }}>{fmtNum(r.entries)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#DC2626', whiteSpace: 'nowrap' }}>{fmtCurr(r.netAmt)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#D97706', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.wEnd}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#D97706', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.hol}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtCurr(r.q1A)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtCurr(r.q2A)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtCurr(r.q3A)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtCurr(r.q4A)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SHEET 03: MONITORED & RARE USERS ANALYSIS ──
const OmniaSheet03UsersInterest: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const userList = ['BATCH (Automated)', 'SYSTEM_ADMIN', 'FIN_ACCOUNTANT', 'TEMP_CONSULTANT', 'EXEC_DIRECTOR'];

  const chartData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.24;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.26;
    const baseData = [42000000, 18500000, 9460000, 3150000, 1280000];
    const baseColors = ['#007680', '#007680', '#EF4444', '#EF4444', '#FBBF24'];
    return {
      labels: userList,
      datasets: [
        {
          label: quarterFilter === 'ALL' ? 'Total Journal Entry Amount ($)' : `Journal Entry Amount (${quarterFilter}) ($)`,
          data: baseData.map((v) => Math.round(v * mult)),
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderRadius: 4,
        },
      ],
    };
  }, [quarterFilter, selectedIdx]);

  const userRiskPieData = useMemo(() => {
    const qMult = quarterFilter === 'Q1' ? 0.24 : quarterFilter === 'Q2' ? 0.25 : quarterFilter === 'Q3' ? 0.25 : quarterFilter === 'Q4' ? 0.26 : 1;
    const autoAmt = Math.round(42800000 * qMult);
    const stdAmt = Math.round(18500000 * qMult);
    const riskAmt = Math.round(exCounts.usersOfInterest * 125000 * qMult);
    const totalAmt = autoAmt + stdAmt + riskAmt;
    const autoPct = totalAmt > 0 ? ((autoAmt / totalAmt) * 100).toFixed(1) : '0';
    const stdPct = totalAmt > 0 ? ((stdAmt / totalAmt) * 100).toFixed(1) : '0';
    const riskPct = totalAmt > 0 ? ((riskAmt / totalAmt) * 100).toFixed(1) : '0';
    const baseColors = ['#007680', '#38BDF8', '#EF4444'];
    return {
      labels: [
        `Automated Feeds (${autoPct}%)`,
        `Standard Operations (${stdPct}%)`,
        `High-Risk Admin/Temp (${riskPct}%)`,
      ],
      datasets: [
        {
          data: [autoAmt, stdAmt, riskAmt],
          backgroundColor: getHighlightColors(baseColors, selectedIdx !== null ? (selectedIdx <= 1 ? selectedIdx : 2) : null),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);
  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx !== null ? (selectedIdx <= 1 ? selectedIdx : 2) : null, (idx) => {
    if (idx === null) setSelectedIdx(null);
    else if (idx === 0) setSelectedIdx(0);
    else if (idx === 1) setSelectedIdx(1);
    else setSelectedIdx(2);
  }), [pieOptions, selectedIdx]);

  const allRows = [
    { uIdx: 0, type: 'Standard Automated', name: 'BATCH_JOB', entries: 28400, amt: 42800000, q1: 7100, q2: 7000, q3: 7100, q4: 7200, risk: 'low' },
    { uIdx: 1, type: 'Standard Manual', name: 'FIN_ACCOUNTANT', entries: 14200, amt: 18500000, q1: 3500, q2: 3550, q3: 3550, q4: 3600, risk: 'low' },
    { uIdx: 2, type: 'Monitored Privileged', name: 'SYSTEM_ADMIN', entries: Math.round(exCounts.usersOfInterest * 0.58), amt: 9460000, q1: 20, q2: 24, q3: 22, q4: 30, risk: 'high' },
    { uIdx: 3, type: 'Rare External Poster', name: 'TEMP_CONSULTANT', entries: Math.round(exCounts.usersOfInterest * 0.32), amt: 3150000, q1: 10, q2: 12, q3: 14, q4: 18, risk: 'high' },
    { uIdx: 4, type: 'Top-Level Override', name: 'EXEC_DIRECTOR', entries: 14, amt: 1280000, q1: 2, q2: 4, q3: 3, q4: 5, risk: 'high' },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.uIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 9: Monitored & Rare Users Analysis</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Identifies journal entries posted by monitored personnel, rare posters, privileged system administrators, or temporary external accounts. Click any user bar or doughnut slice to isolate user transactions.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 9 - User Posting Value Distribution {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click user column</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={chartData} options={interactiveBarOptions} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Posting Exposure by User Risk Profile</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click profile slice</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-03-${quarterFilter}`} data={userRiskPieData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={userList[selectedIdx] || `User Profile ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} matching profile`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 9 - Monitored Users Analysis Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{filteredRows.length} User Profiles Displayed</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '220px' }}>User Role / Entry Type</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>User Name</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Total Nbr of Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Total Amount ($)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q1 Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q2 Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q3 Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q4 Entries</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => {
                const isHighRisk = r.risk === 'high';
                const isSelected = selectedIdx === r.uIdx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIdx(selectedIdx === r.uIdx ? null : r.uIdx)}
                    style={{
                      background: isSelected ? '#F0F9FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderLeft: isSelected ? '3px solid #0284C7' : '3px solid transparent',
                    }}
                  >
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: isHighRisk ? '#FFF1F2' : '#F0F9FF',
                        color: isHighRisk ? '#E11D48' : '#0284C7',
                        border: isHighRisk ? '1px solid #FECDD3' : '1px solid #BAE6FD',
                        padding: '2px 8px',
                        borderRadius: '5px',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}>
                        {r.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}><span style={{ background: '#F1F5F9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.74rem' }}>{r.name}</span></td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: isHighRisk ? '#EF4444' : '#1E293B', whiteSpace: 'nowrap' }}>{fmtNum(r.entries)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#007680', whiteSpace: 'nowrap' }}>{fmtCurr(r.amt)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtNum(r.q1)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtNum(r.q2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtNum(r.q3)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtNum(r.q4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SHEET 04: CLOSING ENTRIES & POST-CLOSING ADJUSTMENTS ──
const OmniaSheet04ClosingEntries: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const catNames = ['Increase in Assets', 'Decrease in Liab', 'Increase in Expense [Risk]', 'Decrease in Rev', 'Equity Adj'];

  const closingDoughnutData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.22;
    if (quarterFilter === 'Q2') mult = 0.24;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.29;
    const v1 = Math.round(4200000 * mult);
    const v2 = Math.round(3100000 * mult);
    const v3 = Math.round(8400000 * mult);
    const v4 = Math.round(1900000 * mult);
    const v5 = Math.round(950000 * mult);
    const baseColors = ['#007680', '#38BDF8', '#EF4444', '#FBBF24', '#8B5CF6'];
    return {
      labels: ['Increase in Assets', 'Decrease in Liab', 'Increase in Exp [Risk]', 'Decrease in Rev', 'Equity Adj'],
      datasets: [
        {
          data: [v1, v2, v3, v4, v5],
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [quarterFilter, selectedIdx]);

  const timingBarData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.22;
    if (quarterFilter === 'Q2') mult = 0.24;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.29;
    return {
      labels: ['Day -1 to 0 (Closing)', 'Day +1 to +3', 'Day +4 to +7', 'Day +8+ (Post-Cutoff)'],
      datasets: [
        { label: 'Lines with Limited/Weak Description', data: [Math.round(840 * mult), Math.round(520 * mult), Math.round(210 * mult), Math.round(85 * mult)], backgroundColor: '#EF4444', borderRadius: 4 },
        { label: 'Standard Documented Closing Lines', data: [Math.round(3100 * mult), Math.round(1400 * mult), Math.round(620 * mult), Math.round(150 * mult)], backgroundColor: '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 4 },
      ],
    };
  }, [quarterFilter]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRows = [
    { catIdx: 0, type: 'Adjusting Closing Entry', fs: 'Increase in Assets', lines: 420, deb: 4200000, cred: 0, entries: 180, net: 4200000, q1L: 80, q2L: 90, q3L: 100, q4L: 150 },
    { catIdx: 1, type: 'Adjusting Closing Entry', fs: 'Decrease in Liabilities', lines: 310, deb: 3100000, cred: 0, entries: 140, net: 3100000, q1L: 60, q2L: 70, q3L: 80, q4L: 100 },
    { catIdx: 2, type: 'Late Accrual Override', fs: 'Increase in Expense', lines: exCounts.closingEntries, deb: 8400000, cred: 0, entries: 420, net: 8400000, q1L: 100, q2L: 120, q3L: 140, q4L: exCounts.closingEntries },
    { catIdx: 3, type: 'Revenue Provision Debit', fs: 'Decrease in Revenue', lines: 190, deb: 1900000, cred: 0, entries: 90, net: 1900000, q1L: 30, q2L: 40, q3L: 50, q4L: 70 },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.catIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 3: Post-Closing Period Entries & Adjustments</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Identifies journal entries posted during or immediately following the period-end financial closing with limited or weak narration. Click any slice to filter closing effect categories.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 3 - Closing Entries Financial Statement Effect</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-04-${quarterFilter}`} data={closingDoughnutData} options={interactivePieOptions} />
          </div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Post-Period Closing Entry Timing Profile</h4>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={timingBarData} options={options} /></div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={catNames[selectedIdx] || `Category ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} matching effect line`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 3 - Closing Entries Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{filteredRows.length} Closing Impact Categories Displayed</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '180px' }}>Journal Entry Type</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Financial Statement Effect</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Total Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Total Debit Amount</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>No of Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Net Activity</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q1 Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q2 Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q3 Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Q4 Lines</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => {
                const isSelected = selectedIdx === r.catIdx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIdx(selectedIdx === r.catIdx ? null : r.catIdx)}
                    style={{
                      background: isSelected ? '#F0F9FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderLeft: isSelected ? '3px solid #0284C7' : '3px solid transparent',
                    }}
                  >
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: '#FFF1F2',
                        color: '#E11D48',
                        border: '1px solid #FECDD3',
                        padding: '2px 8px',
                        borderRadius: '5px',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}>
                        {r.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#007680', whiteSpace: 'nowrap' }}>{r.fs}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtNum(r.lines)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{fmtCurr(r.deb)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtNum(r.entries)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#007680', whiteSpace: 'nowrap' }}>{fmtCurr(r.net)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{r.q1L}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{r.q2L}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{r.q3L}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{r.q4L}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SHEET 05: DATES OF INTEREST & WEEKEND SCANNING ──
const OmniaSheet05DatesOfInterest: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const dayCategories = ['Saturday Postings', 'Sunday Postings', 'Public Bank Holidays'];

  const lineData = useMemo(() => {
    return {
      labels: ['Good Friday', 'Independence Day', 'Gandhi Jayanti', 'Diwali / Year-End', 'Financial Year Close'],
      datasets: [
        {
          label: 'Flagged Holiday/Weekend Entries',
          data: [18, 24, 16, 42, exCounts.datesOfInterest],
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [quarterFilter, exCounts]);

  const pieData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.22;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.28;
    const satCount = Math.round(exCounts.datesOfInterest * 0.47 * mult);
    const sunCount = Math.round(exCounts.datesOfInterest * 0.31 * mult);
    const holCount = Math.round(exCounts.datesOfInterest * 0.22 * mult);
    const totalCount = satCount + sunCount + holCount;
    const satPct = totalCount > 0 ? ((satCount / totalCount) * 100).toFixed(1) : '0';
    const sunPct = totalCount > 0 ? ((sunCount / totalCount) * 100).toFixed(1) : '0';
    const holPct = totalCount > 0 ? ((holCount / totalCount) * 100).toFixed(1) : '0';
    const baseColors = ['#EF4444', '#FBBF24', '#007680'];
    return {
      labels: [
        `Saturday Postings [Risk] (${satPct}%)`,
        `Sunday Postings (${sunPct}%)`,
        `Public Bank Holidays (${holPct}%)`,
      ],
      datasets: [
        {
          data: [satCount, sunCount, holCount],
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRows = [
    { dayIdx: 0, type: 'Off-Hours Weekend Entry', day: 'Saturday', date: '08/16/2025', entries: 42, cred: 1420000, deb: 1420000 },
    { dayIdx: 1, type: 'Off-Hours Weekend Entry', day: 'Sunday', date: '08/17/2025', entries: 28, cred: 980000, deb: 980000 },
    { dayIdx: 2, type: 'Public Holiday Entry', day: 'Bank Holiday', date: '10/02/2025', entries: exCounts.datesOfInterest, cred: 3450000, deb: 3450000 },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.dayIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 7: Dates of Interest & Weekend Scanning</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Identifies journal entries posted on weekends, public statutory holidays, or corporate shutdown dates. Click any slice to filter specific day classifications.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Test 7 - Weekend &amp; Holiday Trajectory {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
          <div style={{ flex: 1, minHeight: 0 }}><Line data={lineData} options={options} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Dates of Interest Proportion by Day Type</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-05-${quarterFilter}`} data={pieData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={dayCategories[selectedIdx] || `Day Category ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} matching schedule line`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 7 - Dates of Interest Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
          <span style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>{filteredRows.length} Timing Exceptions Displayed</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '190px' }}>Journal Entry Type</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Day Classification</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Date (MM/DD/YYYY)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nbr of Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Credit Amount</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Debit Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => {
                const isSelected = selectedIdx === r.dayIdx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIdx(selectedIdx === r.dayIdx ? null : r.dayIdx)}
                    style={{
                      background: isSelected ? '#FEF3C7' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderLeft: isSelected ? '3px solid #D97706' : '3px solid transparent',
                    }}
                  >
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: '#FEF3C7',
                        color: '#D97706',
                        border: '1px solid #FDE68A',
                        padding: '2px 8px',
                        borderRadius: '5px',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}>
                        {r.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#EF4444', whiteSpace: 'nowrap' }}>{r.day}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>{fmtNum(r.entries)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{fmtCurr(r.cred)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{fmtCurr(r.deb)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SHEET 06: ROUND DOLLAR SUMS & RECURRING DIGITS ──
const OmniaSheet06RoundAmounts: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const digitCategories = ['.000 Endings', '.999 Endings', '.500 Endings'];

  const barData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.23;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.27;
    const baseAmounts = [Math.round(450 * mult), Math.round(240 * mult), Math.round(120 * mult), Math.round(80 * mult), Math.round(38 * mult)];
    const baseColors = ['#007680', '#007680', '#007680', '#007680', '#007680'];
    return {
      labels: ['$10k', '$50k', '$100k', '$500k', '$1M'],
      datasets: [
        {
          label: quarterFilter === 'ALL' ? 'Rounded Amounts Count' : `Rounded Amounts Count (${quarterFilter})`,
          data: baseAmounts,
          backgroundColor: baseColors,
          borderRadius: 4,
        },
      ],
    };
  }, [quarterFilter]);

  const endDigitsDoughnutData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.23;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.27;
    const c000 = Math.round(exCounts.roundAmounts * 0.62 * mult);
    const c999 = Math.round(exCounts.roundAmounts * 0.24 * mult);
    const c500 = Math.round(exCounts.roundAmounts * 0.14 * mult);
    const totalCount = c000 + c999 + c500;
    const p000 = totalCount > 0 ? ((c000 / totalCount) * 100).toFixed(1) : '0';
    const p999 = totalCount > 0 ? ((c999 / totalCount) * 100).toFixed(1) : '0';
    const p500 = totalCount > 0 ? ((c500 / totalCount) * 100).toFixed(1) : '0';
    const baseColors = ['#007680', '#EF4444', '#38BDF8'];
    return {
      labels: [
        `Triple Zero .000 (${p000}%)`,
        `Ending in .999 [Risk] (${p999}%)`,
        `Ending in .500 (${p500}%)`,
      ],
      datasets: [
        {
          data: [c000, c999, c500],
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRowsA = [
    { pIdx: 1, pat: '.999 Endings', cat: 'Management Override Estimate', entries: 142, deb: 1420000 },
    { pIdx: 2, pat: '.500 Endings', cat: 'Recurring Rounded Split', entries: 88, deb: 880000 },
  ];

  const allRowsB = [
    { pIdx: 0, thresh: '$100,000', cat: 'Material Round Multiples', entries: exCounts.roundAmounts, deb: 92800000 },
    { pIdx: 0, thresh: '$1,000,000+', cat: 'Executive Round Multiples', entries: 38, deb: 38000000 },
  ];

  const filteredRowsA = useMemo(() => {
    if (selectedIdx === null) return allRowsA;
    return allRowsA.filter((r) => r.pIdx === selectedIdx);
  }, [selectedIdx]);

  const filteredRowsB = useMemo(() => {
    if (selectedIdx === null || selectedIdx === 0) return allRowsB;
    return allRowsB;
  }, [selectedIdx]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 5: Round Dollar Sums & Recurring End Digits</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Identifies journal entries with round dollar multiples ($10k, $100k, $1M) or recurring digits (.000, .999, .500). Click any doughnut slice to highlight specific digit patterns.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Test 5 - Rounded Amounts Magnitude {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={barData} options={options} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Recurring Ending Digits Analysis (.000, .999, .500)</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-06-${quarterFilter}`} data={endDigitsDoughnutData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={digitCategories[selectedIdx] || `Pattern ${selectedIdx + 1}`}
          countText="Filter Active"
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9' }}>
            <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Section A: Recurring Digits Postings</h5>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Digit Pattern</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Debit Value ($)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRowsA.map((r, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedIdx(selectedIdx === r.pIdx ? null : r.pIdx)}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    background: selectedIdx === r.pIdx ? '#F0F9FF' : '#FFFFFF',
                    borderLeft: selectedIdx === r.pIdx ? '3px solid #0284C7' : '3px solid transparent',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}><span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>{r.pat}</span></td>
                  <td style={{ padding: '8px 12px', color: '#64748B' }}>{r.cat}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{r.entries}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#007680', fontWeight: 600 }}>{fmtCurr(r.deb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9' }}>
            <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Section B: Rounded Amounts Postings</h5>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Round Threshold</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Debit Value ($)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRowsB.map((r, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedIdx(selectedIdx === r.pIdx ? null : r.pIdx)}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    background: selectedIdx === r.pIdx ? '#F0F9FF' : '#FFFFFF',
                    borderLeft: selectedIdx === r.pIdx ? '3px solid #0284C7' : '3px solid transparent',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}><span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>{r.thresh}</span></td>
                  <td style={{ padding: '8px 12px', color: '#64748B' }}>{r.cat}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtNum(r.entries)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#007680', fontWeight: 600 }}>{fmtCurr(r.deb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SHEET 07: DUPLICATE TRANSACTIONS & TWIN POSTINGS ──
const OmniaSheet07DuplicateEntries: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const dupCategories = ['2x Exact Line Matches', '3x Triplicate Matches', '4x+ Multi-Post Matches'];

  const barData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.20;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.30;
    const baseData = [Math.round(exCounts.duplicateEntries * mult), Math.round(18 * mult), Math.round(5 * mult)];
    const baseColors = ['#EF4444', '#F87171', '#FCA5A5'];
    return {
      labels: dupCategories,
      datasets: [
        {
          label: quarterFilter === 'ALL' ? 'Duplicate Sets Identified' : `Duplicate Sets Identified (${quarterFilter})`,
          data: baseData,
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderRadius: 4,
        },
      ],
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const dupRatioData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.20;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.30;
    const dupCount = Math.round(exCounts.duplicateEntries * 2.2 * mult);
    const uniqueCount = Math.max(0, Math.round(48200 * mult) - dupCount);
    const totalLines = uniqueCount + dupCount;
    const uPct = totalLines > 0 ? ((uniqueCount / totalLines) * 100).toFixed(1) : '0';
    const dPct = totalLines > 0 ? ((dupCount / totalLines) * 100).toFixed(1) : '0';
    const baseColors = ['#007680', '#EF4444'];
    return {
      labels: [
        `Unique Journal Lines (${uPct}%)`,
        `Potential Duplicate Clusters [Risk] (${dPct}%)`,
      ],
      datasets: [
        {
          data: [uniqueCount, dupCount],
          backgroundColor: getHighlightColors(baseColors, selectedIdx !== null ? 1 : null),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);
  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx !== null ? 1 : null, (idx) => {
    setSelectedIdx(idx === 1 ? 0 : null);
  }), [pieOptions, selectedIdx]);

  const allRows = [
    { dIdx: 0, type: 'Potential Twin Duplicate', matchType: '2x Exact Match', entries: exCounts.duplicateEntries, lines: exCounts.duplicateEntries * 2, deb: 4280000, cred: 4280000 },
    { dIdx: 1, type: 'Triplicate Entry Set', matchType: '3x Triplicate Match', entries: 18, lines: 54, deb: 920000, cred: 920000 },
    { dIdx: 2, type: 'Recurring Multi-Post', matchType: '4x+ Multi-Post Match', entries: 5, lines: 22, deb: 410000, cred: 410000 },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.dIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 6: Duplicate Transactions & Twin Postings</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Identifies twin postings and potential duplicate journal entries sharing identical account, date, and amount combinations. Click any duplicate category bar to filter sets.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 6 - Duplicate Multiplier Breakdown {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
            <span style={{ fontSize: '0.70rem', color: '#EF4444', fontWeight: 600 }}>Click column to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={barData} options={interactiveBarOptions} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Population Duplicate Concentration Ratio</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-07-${quarterFilter}`} data={dupRatioData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={dupCategories[selectedIdx] || `Category ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} duplicate cluster`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 6 - Duplicate Analysis Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
          <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600 }}>{filteredRows.length} Duplicate Clusters Displayed</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '180px' }}>Journal Entry Type</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Number of Duplicates</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nbr of Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nbr of Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sum Debit Amount</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sum Credit Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => {
                const isSelected = selectedIdx === r.dIdx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIdx(selectedIdx === r.dIdx ? null : r.dIdx)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      background: isSelected ? '#FEF2F2' : '#FFFFFF',
                      borderLeft: isSelected ? '3px solid #EF4444' : '3px solid transparent',
                    }}
                  >
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: '#FFF1F2',
                        color: '#E11D48',
                        border: '1px solid #FECDD3',
                        padding: '2px 8px',
                        borderRadius: '5px',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}>
                        {r.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>{r.matchType}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#EF4444', whiteSpace: 'nowrap' }}>{fmtNum(r.entries)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtNum(r.lines)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{fmtCurr(r.deb)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{fmtCurr(r.cred)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SHEET 08: SUSPECT KEYWORDS & LEXICAL SCAN ──
const OmniaSheet08KeywordsScan: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const riskCategories = ['High Risk', 'Medium Risk', 'Informational'];

  const barData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.22;
    if (quarterFilter === 'Q2') mult = 0.24;
    if (quarterFilter === 'Q3') mult = 0.26;
    if (quarterFilter === 'Q4') mult = 0.28;
    const base = [210, 145, 82, 38, 4, 18, 7, 12];
    const baseColors = ['#38BDF8', '#FBBF24', '#38BDF8', '#EF4444', '#EF4444', '#FBBF24', '#EF4444', '#FBBF24'];
    return {
      labels: ['Manual', 'Adjust', 'Reclass', 'Override', 'Fraud', 'Suspense', 'Plug', 'Reserve'],
      datasets: [
        {
          label: quarterFilter === 'ALL' ? 'Matching Journal Entries' : `Matching Journal Entries (${quarterFilter})`,
          data: base.map((v) => Math.round(v * mult)),
          backgroundColor: baseColors,
          borderRadius: 4,
        },
      ],
    };
  }, [quarterFilter]);

  const riskPieData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.22;
    if (quarterFilter === 'Q2') mult = 0.24;
    if (quarterFilter === 'Q3') mult = 0.26;
    if (quarterFilter === 'Q4') mult = 0.28;
    const highRisk = Math.round((4 + 7 + 38) * mult);
    const medRisk = Math.round((18 + 145) * mult);
    const infoRisk = Math.round(exCounts.keywords * mult);
    const totalRisk = highRisk + medRisk + infoRisk;
    const hPct = totalRisk > 0 ? ((highRisk / totalRisk) * 100).toFixed(1) : '0';
    const mPct = totalRisk > 0 ? ((medRisk / totalRisk) * 100).toFixed(1) : '0';
    const iPct = totalRisk > 0 ? ((infoRisk / totalRisk) * 100).toFixed(1) : '0';
    const baseColors = ['#EF4444', '#FBBF24', '#38BDF8'];
    return {
      labels: [
        `High Risk ("Fraud", "Plug", "Override") (${hPct}%)`,
        `Medium Risk ("Suspense", "Adjust") (${mPct}%)`,
        `Informational ("Manual", "Reclass") (${iPct}%)`,
      ],
      datasets: [
        {
          data: [highRisk, medRisk, infoRisk],
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRows = [
    { rIdx: 0, word: 'Fraud', risk: 'High', entries: 4, amt: 840000, user: 'TEMP_AUDIT' },
    { rIdx: 0, word: 'Plug', risk: 'High', entries: 7, amt: 1250000, user: 'SYSTEM_ADMIN' },
    { rIdx: 0, word: 'Override', risk: 'High', entries: 38, amt: 4890000, user: 'FIN_MANAGER' },
    { rIdx: 1, word: 'Suspense', risk: 'Medium', entries: 18, amt: 2180000, user: 'FIN_ACCOUNTANT' },
    { rIdx: 1, word: 'Adjust', risk: 'Medium', entries: 145, amt: 14200000, user: 'FIN_ACCOUNTANT' },
    { rIdx: 2, word: 'Manual', risk: 'Informational', entries: 210, amt: 18500000, user: 'FIN_ACCOUNTANT' },
    { rIdx: 2, word: 'Reclass', risk: 'Informational', entries: 82, amt: 6400000, user: 'FIN_ACCOUNTANT' },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.rIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 2: Suspect Keywords & Lexical Scan</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Identifies journal entries containing suspect or high-risk keywords in journal descriptions, headers, and line narrations. Click any slice in the stratification doughnut to filter monitored words by severity.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 2 - Keyword Flag Frequency &amp; Density {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={barData} options={options} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Keyword Risk Severity Stratification</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-08-${quarterFilter}`} data={riskPieData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={riskCategories[selectedIdx] || `Tier ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} monitored keyword`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 2 - Keyword Flagged Entries Breakdown</h5>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{filteredRows.length} Monitored Words Displayed</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Target Keyword</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Risk Level</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Matched Entries</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Aggregated Debit ($)</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Primary User</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, idx) => {
              const isHigh = r.risk === 'High';
              const isMed = r.risk === 'Medium';
              const isSelected = selectedIdx === r.rIdx;
              return (
                <tr
                  key={idx}
                  onClick={() => setSelectedIdx(selectedIdx === r.rIdx ? null : r.rIdx)}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    background: isSelected ? '#FEF2F2' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                    borderLeft: isSelected ? '3px solid #EF4444' : '3px solid transparent',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}><span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>"{r.word}"</span></td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: isHigh ? '#FFF1F2' : isMed ? '#FEF3C7' : '#F0F9FF',
                      color: isHigh ? '#E11D48' : isMed ? '#D97706' : '#0284C7',
                      border: isHigh ? '1px solid #FECDD3' : isMed ? '1px solid #FDE68A' : '1px solid #BAE6FD',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontWeight: 600,
                      fontSize: '0.70rem'
                    }}>
                      {r.risk} Risk
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: isHigh ? '#DC2626' : '#1E293B' }}>{r.entries}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#007680' }}>{fmtCurr(r.amt)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748B' }}>{r.user}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── SHEET 09: UNUSUAL ACCOUNTS & LOW CO-OCCURRENCE ──
const OmniaSheet09UnusualAccounts: React.FC<{
  exCounts: Record<string, number>;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const pairingNames = ['Cash vs Depr', 'Revenue vs Payable', 'Inventory vs Bonus', 'Prepaid vs Loan'];

  const barData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.20;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.30;
    const baseData = [Math.round(exCounts.unusualAccounts * mult), Math.round(45 * mult), Math.round(28 * mult), Math.round(12 * mult)];
    const baseColors = ['#EF4444', '#FBBF24', '#007680', '#38BDF8'];
    return {
      labels: pairingNames,
      datasets: [
        {
          label: quarterFilter === 'ALL' ? 'Unusual Pairing Transactions' : `Unusual Pairing Transactions (${quarterFilter})`,
          data: baseData,
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderRadius: 4,
        },
      ],
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const exposureDoughnutData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.20;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.30;
    const v1 = Math.round(4200000 * mult);
    const v2 = Math.round(2100000 * mult);
    const v3 = Math.round(1400000 * mult);
    const v4 = Math.round(800000 * mult);
    const baseColors = ['#EF4444', '#FBBF24', '#007680', '#38BDF8'];
    return {
      labels: ['Cash vs Depr [Risk]', 'Revenue vs Payable [Risk]', 'Inventory vs Bonus', 'Prepaid vs Loan'],
      datasets: [
        {
          data: [v1, v2, v3, v4],
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [quarterFilter, selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);
  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRows = [
    { pIdx: 0, debGl: '10100000', credGl: '52003000', desc: 'Cash vs Depreciation Pairing', lines: exCounts.unusualAccounts, exp: 4200000, risk: 'High' },
    { pIdx: 1, debGl: '41001400', credGl: '21100000', desc: 'Revenue vs Accounts Payable', lines: 45, exp: 2100000, risk: 'High' },
    { pIdx: 2, debGl: '12200000', credGl: '52001000', desc: 'Inventory vs Staff Compensation', lines: 28, exp: 1400000, risk: 'Medium' },
    { pIdx: 3, debGl: '11500000', credGl: '20200000', desc: 'Prepaid Expenses vs Long-Term Loans', lines: 12, exp: 800000, risk: 'Low' },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.pIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 4: Unusual Accounts & Low Co-occurrence</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Identifies journal entries posted between historically improbable or unrelated financial statement account combinations. Click any slice or bar to filter anomalous combinations.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 4 - Unusual Accounts Pairing Frequency {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
            <span style={{ fontSize: '0.70rem', color: '#EF4444', fontWeight: 600 }}>Click column to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={barData} options={interactiveBarOptions} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Unusual Pairing Exposure Distribution ($)</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-10-${quarterFilter}`} data={exposureDoughnutData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={pairingNames[selectedIdx] || `Pairing ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} anomalous pairing`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 4 - Unusual Account Pairings Grid</h5>
          <span style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 600 }}>{filteredRows.length} Anomalous Combinations Displayed</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Debit Account GL</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Credit Account GL</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Pairing Description</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Transaction Lines</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Exposure Value ($)</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Risk Rating</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, idx) => {
              const isSelected = selectedIdx === r.pIdx;
              return (
                <tr
                  key={idx}
                  onClick={() => setSelectedIdx(selectedIdx === r.pIdx ? null : r.pIdx)}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    background: isSelected ? '#FAF5FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                    borderLeft: isSelected ? '3px solid #7C3AED' : '3px solid transparent',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}><span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>{r.debGl}</span></td>
                  <td style={{ padding: '8px 12px' }}><span style={{ background: '#F1F5F9', color: '#7C3AED', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>{r.credGl}</span></td>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1E293B' }}>{r.desc}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtNum(r.lines)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#007680', fontWeight: 600 }}>{fmtCurr(r.exp)}</td>
                  <td style={{ padding: '8px 12px' }}><span style={{ background: r.risk === 'High' ? '#FFF1F2' : '#FEF3C7', color: r.risk === 'High' ? '#E11D48' : '#D97706', border: r.risk === 'High' ? '1px solid #FECDD3' : '1px solid #FDE68A', padding: '2px 7px', borderRadius: '5px', fontWeight: 600, fontSize: '0.70rem' }}>{r.risk} Risk</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── SHEET 10: BENFORD'S LAW CONFORMITY ANALYSIS ──
const OmniaSheet10BenfordsLaw: React.FC<{
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const digits = ['Digit 1', 'Digit 2', 'Digit 3', 'Digit 4', 'Digit 5', 'Digit 6', 'Digit 7', 'Digit 8', 'Digit 9'];
  const expectedBenford = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];
  const actualObserved = [31.4, 16.9, 13.1, 9.2, 8.4, 6.1, 6.4, 4.8, 3.7];

  const comboChartData = useMemo(() => {
    return {
      labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      datasets: [
        {
          type: 'line' as const,
          label: "Benford's Theoretical Distribution (%)",
          data: expectedBenford,
          borderColor: '#0284C7',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointBackgroundColor: '#0284C7',
          pointRadius: 4,
          tension: 0.2,
        },
        {
          type: 'bar' as const,
          label: 'Observed Population Frequency (%)',
          data: actualObserved,
          backgroundColor: getHighlightColors(Array(9).fill('#007680'), selectedIdx),
          borderRadius: 4,
        },
      ],
    };
  }, [selectedIdx]);

  const chiSquarePieData = useMemo(() => {
    const baseColors = ['#007680', '#FBBF24', '#EF4444'];
    return {
      labels: ['Conforming First Digits (78%)', 'Marginal Deviation Digits (15%)', 'Suspicious Peak Anomaly [Risk] (7%)'],
      datasets: [
        {
          data: [78, 15, 7],
          backgroundColor: getHighlightColors(baseColors, selectedIdx !== null ? (selectedIdx <= 5 ? 0 : selectedIdx <= 7 ? 1 : 2) : null),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);
  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx !== null ? (selectedIdx <= 5 ? 0 : selectedIdx <= 7 ? 1 : 2) : null, (idx) => {
    setSelectedIdx(idx === null ? null : idx === 0 ? 0 : idx === 1 ? 6 : 8);
  }), [pieOptions, selectedIdx]);

  const allRows = [
    { digit: 1, count: 15135, actual: 31.4, expected: 30.1, zScore: 1.12, status: 'Normal' },
    { digit: 2, count: 8146, actual: 16.9, expected: 17.6, zScore: -0.84, status: 'Normal' },
    { digit: 3, count: 6314, actual: 13.1, expected: 12.5, zScore: 0.78, status: 'Normal' },
    { digit: 4, count: 4434, actual: 9.2, expected: 9.7, zScore: -0.68, status: 'Normal' },
    { digit: 5, count: 4048, actual: 8.4, expected: 7.9, zScore: 0.82, status: 'Normal' },
    { digit: 6, count: 2940, actual: 6.1, expected: 6.7, zScore: -1.02, status: 'Normal' },
    { digit: 7, count: 3084, actual: 6.4, expected: 5.8, zScore: 1.95, status: 'Marginal' },
    { digit: 8, count: 2314, actual: 4.8, expected: 5.1, zScore: -0.58, status: 'Normal' },
    { digit: 9, count: 1785, actual: 3.7, expected: 4.6, zScore: -2.35, status: 'Non-Conforming' },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((_, idx) => idx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 10: Benford's Law Conformity Analysis</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Evaluates mathematical conformity of the population transaction amounts against Benford's Law (Log10(1 + 1/d)) to identify artificial anomalies, round estimate spikes, and fabricated thresholds. Click any digit column to inspect z-score deviations.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 10 - First-Digit Actual vs Expected Curve {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click column to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={comboChartData as any} options={interactiveBarOptions} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Goodness-of-Fit &amp; Chi-Square Stratification</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-10-benford-${quarterFilter}`} data={chiSquarePieData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={digits[selectedIdx] || `Digit ${selectedIdx + 1}`}
          countText={`Z-Score: ${allRows[selectedIdx]?.zScore > 0 ? '+' : ''}${allRows[selectedIdx]?.zScore}`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Test 10 - Benford's Law Statistical Breakdown Grid</h5>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{filteredRows.length} First-Digits Displayed</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Leading Digit</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Observed Count</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Observed %</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Benford Expected %</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Z-Score Deviation</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Audit Conformity Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, idx) => {
              const isSelected = selectedIdx === (r.digit - 1);
              const isNonConf = r.status === 'Non-Conforming';
              const isMarg = r.status === 'Marginal';
              return (
                <tr
                  key={idx}
                  onClick={() => setSelectedIdx(selectedIdx === (r.digit - 1) ? null : (r.digit - 1))}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    background: isSelected ? '#F0F9FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                    borderLeft: isSelected ? '3px solid #0284C7' : '3px solid transparent',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.80rem' }}>
                      {r.digit}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtNum(r.count)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#007680' }}>{r.actual}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#64748B' }}>{r.expected}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: Math.abs(r.zScore) > 2 ? '#EF4444' : '#334155' }}>
                    {r.zScore > 0 ? '+' : ''}{r.zScore}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: isNonConf ? '#FFF1F2' : isMarg ? '#FEF3C7' : '#F0FDF4',
                      color: isNonConf ? '#E11D48' : isMarg ? '#D97706' : '#15803D',
                      border: isNonConf ? '1px solid #FECDD3' : isMarg ? '1px solid #FDE68A' : '1px solid #BBF7D0',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontWeight: 600,
                      fontSize: '0.70rem',
                    }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── SHEET 11: POPULATION STATISTICS & REFINEMENT FUNNEL ──
const OmniaSheet11PopulationFunnel: React.FC<{
  totalGlRows: number;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ totalGlRows, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const periods12 = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'];

  const lineData = useMemo(() => {
    if (quarterFilter === 'Q1') return { labels: ['P1 (Apr)', 'P2 (May)', 'P3 (Jun)'], datasets: [{ label: 'Q1 Local Currency Amount ($)', data: [4200000, 3900000, 4800000], borderColor: '#007680', backgroundColor: 'rgba(0, 118, 128, 0.08)', fill: true, tension: 0.3 }] };
    if (quarterFilter === 'Q2') return { labels: ['P4 (Jul)', 'P5 (Aug)', 'P6 (Sep)'], datasets: [{ label: 'Q2 Local Currency Amount ($)', data: [4100000, 4300000, 5200000], borderColor: '#007680', backgroundColor: 'rgba(0, 118, 128, 0.08)', fill: true, tension: 0.3 }] };
    if (quarterFilter === 'Q3') return { labels: ['P7 (Oct)', 'P8 (Nov)', 'P9 (Dec)'], datasets: [{ label: 'Q3 Local Currency Amount ($)', data: [4400000, 4600000, 6100000], borderColor: '#007680', backgroundColor: 'rgba(0, 118, 128, 0.08)', fill: true, tension: 0.3 }] };
    if (quarterFilter === 'Q4') return { labels: ['P10 (Jan)', 'P11 (Feb)', 'P12 (Mar)'], datasets: [{ label: 'Q4 Local Currency Amount ($)', data: [4300000, 4100000, 8400000], borderColor: '#007680', backgroundColor: 'rgba(0, 118, 128, 0.08)', fill: true, tension: 0.3 }] };
    return {
      labels: periods12,
      datasets: [{ label: 'Total Amount in Local Currency ($)', data: [4200000, 3900000, 4800000, 4100000, 4300000, 5200000, 4400000, 4600000, 6100000, 4300000, 4100000, 8400000], borderColor: '#007680', backgroundColor: 'rgba(0, 118, 128, 0.08)', fill: true, tension: 0.3 }]
    };
  }, [quarterFilter]);

  const barMonthlyData = useMemo(() => {
    const baseColors = Array(12).fill('#007680');
    return {
      labels: periods12,
      datasets: [
        { label: 'Standard Population Entries', data: [3800, 3500, 4200, 3700, 3900, 4600, 4000, 4200, 5100, 3900, 3700, 6400], backgroundColor: getHighlightColors(baseColors, selectedIdx), borderRadius: 3 },
        { label: 'Non-Standard Exception Entries', data: [400, 400, 600, 400, 400, 600, 400, 400, 1000, 400, 400, 2000], backgroundColor: selectedIdx !== null ? '#BAE6FD33' : '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 3 }
      ]
    };
  }, [selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);

  const allRows = [
    { pIdx: 0, period: 'P1 (Apr)', std: 'Standard', lcurr: 'USD', deb: 4200000, cred: 4200000, totAmt: 4200000, entries: 4200 },
    { pIdx: 1, period: 'P2 (May)', std: 'Standard', lcurr: 'USD', deb: 3900000, cred: 3900000, totAmt: 3900000, entries: 3900 },
    { pIdx: 2, period: 'P3 (Jun)', std: 'Standard', lcurr: 'USD', deb: 4800000, cred: 4800000, totAmt: 4800000, entries: 4800 },
    { pIdx: 3, period: 'P4 (Jul)', std: 'Standard', lcurr: 'USD', deb: 4100000, cred: 4100000, totAmt: 4100000, entries: 4100 },
    { pIdx: 4, period: 'P5 (Aug)', std: 'Standard', lcurr: 'USD', deb: 4300000, cred: 4300000, totAmt: 4300000, entries: 4300 },
    { pIdx: 5, period: 'P6 (Sep)', std: 'Standard', lcurr: 'USD', deb: 5200000, cred: 5200000, totAmt: 5200000, entries: 5200 },
    { pIdx: 6, period: 'P7 (Oct)', std: 'Standard', lcurr: 'USD', deb: 4400000, cred: 4400000, totAmt: 4400000, entries: 4400 },
    { pIdx: 7, period: 'P8 (Nov)', std: 'Standard', lcurr: 'USD', deb: 4600000, cred: 4600000, totAmt: 4600000, entries: 4600 },
    { pIdx: 8, period: 'P9 (Dec)', std: 'Non-Standard', lcurr: 'USD', deb: 6100000, cred: 6100000, totAmt: 6100000, entries: 6100 },
    { pIdx: 9, period: 'P10 (Jan)', std: 'Standard', lcurr: 'USD', deb: 4300000, cred: 4300000, totAmt: 4300000, entries: 4300 },
    { pIdx: 10, period: 'P11 (Feb)', std: 'Standard', lcurr: 'USD', deb: 4100000, cred: 4100000, totAmt: 4100000, entries: 4100 },
    { pIdx: 11, period: 'P12 (Mar)', std: 'Non-Standard', lcurr: 'USD', deb: 8400000, cred: 8400000, totAmt: 8400000, entries: 8400 },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter((r) => r.pIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Omnia Test 11: Audit Population Statistics &amp; Refinement Funnel</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Period-wise distribution of journal entry volumes, local currency debit/credit sums, and standard vs. non-standard classifications across the testing period. Click any period column to filter table records.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>
            Population Statistics Activity Trajectory {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}
          </h4>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Line data={lineData} options={options} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Monthly Standard vs Non-Standard Volume Distribution
            </h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click column to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Bar data={barMonthlyData} options={interactiveBarOptions} />
          </div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={periods12[selectedIdx] || `Period ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} period record`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
            Population Statistics Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}
          </h5>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{filteredRows.length} Periods Displayed</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Period</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Std / NonStd</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Lcurr</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Total Debit Amount</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Total Credit Amount</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Total Amount in Local Curr</th>
              <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Nbr of Journal Entries</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, idx) => {
              const isNonStd = r.std === 'Non-Standard';
              const isSelected = selectedIdx === r.pIdx;
              return (
                <tr
                  key={idx}
                  onClick={() => setSelectedIdx(selectedIdx === r.pIdx ? null : r.pIdx)}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    background: isSelected ? '#F0F9FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                    borderLeft: isSelected ? '3px solid #0284C7' : '3px solid transparent',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>{r.period}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: isNonStd ? '#FFF1F2' : '#F0F9FF',
                      color: isNonStd ? '#E11D48' : '#0284C7',
                      border: isNonStd ? '1px solid #FECDD3' : '1px solid #BAE6FD',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontWeight: 600,
                      fontSize: '0.70rem'
                    }}>
                      {r.std}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748B' }}>{r.lcurr}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155' }}>{fmtCurr(r.deb)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155' }}>{fmtCurr(r.cred)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#007680' }}>{fmtCurr(r.totAmt)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: isNonStd ? '#DC2626' : '#1E293B' }}>{fmtNum(r.entries)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── SHEET 12: CHART OF ACCOUNTS (COA) HIERARCHY & TRIAL BALANCE MASTER RECONCILER ──
// Omnia Pipeline Unique Specialization: COA Hierarchy, Class Breakdown, and Trial Balance Reconciler!
const OmniaSheet12CoaMasterSuite: React.FC<{
  config: RunConfig | null;
  status: RunSummary | null;
  totalGlRows: number;
  totalTbRows: number;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}> = ({ config, status, totalGlRows, totalTbRows, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const coaClasses = ['Assets', 'Liabilities', 'Equity', 'Revenue', 'Operating Expenses'];

  const coaClassBarData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.24;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.26;

    // Account counts and balances across COA classes
    const acctCounts = [10, 5, 2, 4, 5];
    const baseColors = ['#007680', '#0284C7', '#7C3AED', '#059669', '#D97706'];

    return {
      labels: coaClasses,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Tracked COA Accounts Count',
          data: acctCounts,
          backgroundColor: getHighlightColors(baseColors, selectedIdx),
          borderRadius: 4,
          yAxisID: 'y',
        },
      ],
    };
  }, [quarterFilter, selectedIdx]);

  const coaAllocationDoughnutData = useMemo(() => {
    const baseColors = ['#007680', '#0284C7', '#7C3AED'];
    return {
      labels: [
        'Balance Sheet Accounts (58%)',
        'Income Statement Accounts (34%)',
        'Equity & Capital Reserves (8%)',
      ],
      datasets: [
        {
          data: [15, 9, 2],
          backgroundColor: getHighlightColors(baseColors, selectedIdx !== null ? (selectedIdx <= 1 ? 0 : selectedIdx <= 2 ? 2 : 1) : null),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);
  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx !== null ? (selectedIdx <= 1 ? 0 : selectedIdx <= 2 ? 2 : 1) : null, (idx) => {
    if (idx === null) setSelectedIdx(null);
    else if (idx === 0) setSelectedIdx(0);
    else if (idx === 1) setSelectedIdx(3);
    else setSelectedIdx(2);
  }), [pieOptions, selectedIdx]);

  // Master COA accounts list matching ACCOUNTS master from sample data
  const masterCoaAccounts = [
    { cIdx: 0, code: '10100000', desc: 'Cash and Bank - Current Account', class: 'Assets', subtotal: 'Current Assets', fsl: 'Cash and cash equivalents', type: 'Balance Sheet', tbStart: 45200000, tbEnd: 38750000, glNet: -6450000, status: 'Reconciled', flags: 0 },
    { cIdx: 0, code: '10200000', desc: 'Short-term Liquid Investments', class: 'Assets', subtotal: 'Current Assets', fsl: 'Cash and cash equivalents', type: 'Balance Sheet', tbStart: 10000000, tbEnd: 10000000, glNet: 0, status: 'Reconciled', flags: 0 },
    { cIdx: 0, code: '11401000', desc: 'Trade Receivables - Domestic', class: 'Assets', subtotal: 'Current Assets', fsl: 'Trade Receivables', type: 'Balance Sheet', tbStart: 148500000, tbEnd: 154200000, glNet: 5700000, status: 'Reconciled', flags: 2 },
    { cIdx: 0, code: '11402000', desc: 'Trade Receivables - Export', class: 'Assets', subtotal: 'Current Assets', fsl: 'Trade Receivables', type: 'Balance Sheet', tbStart: 32000000, tbEnd: 35800000, glNet: 3800000, status: 'Reconciled', flags: 0 },
    { cIdx: 0, code: '11500000', desc: 'Prepaid Expenses & Advances', class: 'Assets', subtotal: 'Current Assets', fsl: 'Other current assets', type: 'Balance Sheet', tbStart: 3800000, tbEnd: 4200000, glNet: 400000, status: 'Reconciled', flags: 1 },
    { cIdx: 0, code: '11600000', desc: 'Security Deposits & Guarantees', class: 'Assets', subtotal: 'Non-Current Assets', fsl: 'Other non-current assets', type: 'Balance Sheet', tbStart: 5000000, tbEnd: 5000000, glNet: 0, status: 'Reconciled', flags: 0 },
    { cIdx: 0, code: '12100000', desc: 'Inventories - Raw Materials', class: 'Assets', subtotal: 'Current Assets', fsl: 'Inventories', type: 'Balance Sheet', tbStart: 62000000, tbEnd: 68400000, glNet: 6400000, status: 'Reconciled', flags: 1 },
    { cIdx: 0, code: '12200000', desc: 'Inventories - Finished Goods', class: 'Assets', subtotal: 'Current Assets', fsl: 'Inventories', type: 'Balance Sheet', tbStart: 28000000, tbEnd: 31200000, glNet: 3200000, status: 'Reconciled', flags: 2 },
    { cIdx: 0, code: '51001000', desc: 'Property Plant and Machinery (Gross)', class: 'Assets', subtotal: 'Non-Current Assets', fsl: 'Property, plant and equipment', type: 'Balance Sheet', tbStart: 540000000, tbEnd: 585000000, glNet: 45000000, status: 'Reconciled', flags: 0 },
    { cIdx: 0, code: '51002000', desc: 'Accumulated Depreciation - Plant', class: 'Assets', subtotal: 'Non-Current Assets', fsl: 'Property, plant and equipment', type: 'Balance Sheet', tbStart: -180000000, tbEnd: -212000000, glNet: -32000000, status: 'Reconciled', flags: 1 },
    { cIdx: 1, code: '20100000', desc: 'Short-Term Commercial Borrowings', class: 'Liabilities', subtotal: 'Current Liabilities', fsl: 'Borrowings', type: 'Balance Sheet', tbStart: -80000000, tbEnd: -75000000, glNet: 5000000, status: 'Reconciled', flags: 1 },
    { cIdx: 1, code: '20200000', desc: 'Long-Term Secured Bank Loans', class: 'Liabilities', subtotal: 'Non-Current Liabilities', fsl: 'Borrowings', type: 'Balance Sheet', tbStart: -250000000, tbEnd: -240000000, glNet: 10000000, status: 'Reconciled', flags: 0 },
    { cIdx: 1, code: '21100000', desc: 'Trade Payables - Domestic Vendors', class: 'Liabilities', subtotal: 'Current Liabilities', fsl: 'Trade Payables', type: 'Balance Sheet', tbStart: -42000000, tbEnd: -46500000, glNet: -4500000, status: 'Reconciled', flags: 3 },
    { cIdx: 1, code: '21200000', desc: 'Accrued Expenses & Payroll Payables', class: 'Liabilities', subtotal: 'Current Liabilities', fsl: 'Other current liabilities', type: 'Balance Sheet', tbStart: -18000000, tbEnd: -19200000, glNet: -1200000, status: 'Reconciled', flags: 2 },
    { cIdx: 1, code: '21302630', desc: 'Output GST / VAT Clearing', class: 'Liabilities', subtotal: 'Current Liabilities', fsl: 'Other Payables', type: 'Balance Sheet', tbStart: 0, tbEnd: -2400000, glNet: -2400000, status: 'Reconciled', flags: 2 },
    { cIdx: 2, code: '1000001', desc: 'Equity Share Capital', class: 'Equity', subtotal: 'Equity', fsl: 'Share Capital', type: 'Balance Sheet', tbStart: -117200000, tbEnd: -117200000, glNet: 0, status: 'Reconciled', flags: 0 },
    { cIdx: 2, code: '1160001', desc: 'Retained Earnings & Reserves', class: 'Equity', subtotal: 'Equity', fsl: 'Retained Earnings', type: 'Balance Sheet', tbStart: -85000000, tbEnd: -98500000, glNet: -13500000, status: 'Reconciled', flags: 1 },
    { cIdx: 3, code: '41001400', desc: 'Sales Revenue - Domestic', class: 'Revenue', subtotal: 'Revenue', fsl: 'NET SALES REVENUE', type: 'Income Statement', tbStart: 0, tbEnd: -224500000, glNet: -224500000, status: 'Reconciled', flags: 4 },
    { cIdx: 3, code: '41001500', desc: 'Sales Revenue - Export', class: 'Revenue', subtotal: 'Revenue', fsl: 'NET SALES REVENUE', type: 'Income Statement', tbStart: 0, tbEnd: -58200000, glNet: -58200000, status: 'Reconciled', flags: 1 },
    { cIdx: 3, code: '41301200', desc: 'Finance & Interest Income', class: 'Revenue', subtotal: 'Finance Income', fsl: 'Finance income', type: 'Income Statement', tbStart: 0, tbEnd: -4800000, glNet: -4800000, status: 'Reconciled', flags: 0 },
    { cIdx: 3, code: '41301600', desc: 'Miscellaneous & Other Income', class: 'Revenue', subtotal: 'Other Income', fsl: 'Other operating income', type: 'Income Statement', tbStart: 0, tbEnd: -1900000, glNet: -1900000, status: 'Reconciled', flags: 1 },
    { cIdx: 4, code: '50001000', desc: 'Cost of Goods Sold (COGS)', class: 'Operating Expenses', subtotal: 'Cost of Sales', fsl: 'COST OF SALES AND SERVICES', type: 'Income Statement', tbStart: 0, tbEnd: 168400000, glNet: 168400000, status: 'Reconciled', flags: 3 },
    { cIdx: 4, code: '52001000', desc: 'Employee Compensation & Benefits', class: 'Operating Expenses', subtotal: 'Operating Expenses', fsl: 'General and admin expenses', type: 'Income Statement', tbStart: 0, tbEnd: 42100000, glNet: 42100000, status: 'Reconciled', flags: 2 },
    { cIdx: 4, code: '52002500', desc: 'Consultancy and Audit Fees', class: 'Operating Expenses', subtotal: 'Operating Expenses', fsl: 'General and admin expenses', type: 'Income Statement', tbStart: 0, tbEnd: 8400000, glNet: 8400000, status: 'Reconciled', flags: 1 },
    { cIdx: 4, code: '52003000', desc: 'Depreciation & Amortisation Expense', class: 'Operating Expenses', subtotal: 'Operating Expenses', fsl: 'Depreciation and amortisation', type: 'Income Statement', tbStart: 0, tbEnd: 32000000, glNet: 32000000, status: 'Reconciled', flags: 1 },
    { cIdx: 4, code: '52004000', desc: 'Finance Costs - Borrowing Interest', class: 'Operating Expenses', subtotal: 'Finance Costs', fsl: 'Finance costs', type: 'Income Statement', tbStart: 0, tbEnd: 12400000, glNet: 12400000, status: 'Reconciled', flags: 0 },
  ];

  const filteredAccounts = useMemo(() => {
    if (selectedIdx === null) return masterCoaAccounts;
    return masterCoaAccounts.filter((a) => a.cIdx === selectedIdx);
  }, [selectedIdx, masterCoaAccounts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Informative Header Banner */}
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Building size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>
            Omnia Test 12: Chart of Accounts (COA) Hierarchy &amp; Trial Balance Reconciler
          </h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Comprehensive overview of the client Chart of Accounts master, financial statement line allocations (Balance Sheet vs. Income Statement), and full three-way reconciliation between Beginning Trial Balance, General Ledger journal activity, and Ending Trial Balance. Click any COA class or doughnut slice to filter accounts.
          </p>
        </div>
      </div>

      {/* Dual Chart Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
              COA Class Distribution &amp; Account Counts {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}
            </h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click bar to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Bar data={coaClassBarData} options={interactiveBarOptions} />
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Financial Statement Mapping Completeness
            </h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click slice to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-12-coa-${quarterFilter}`} data={coaAllocationDoughnutData} options={interactivePieOptions} />
          </div>
        </div>
      </div>

      {/* Cross-Filter Banner */}
      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={coaClasses[selectedIdx] || `Class ${selectedIdx + 1}`}
          countText={`Showing ${filteredAccounts.length} mapped accounts`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      {/* Master COA-to-TB-to-GL Reconciler Grid */}
      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={16} color="#007680" />
            <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Master Chart of Accounts &amp; Trial Balance Reconciler Table
            </h5>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#007680', fontWeight: 700, background: '#E6F4F5', padding: '2px 8px', borderRadius: '4px' }}>
            {filteredAccounts.length} / {masterCoaAccounts.length} COA Accounts Reconciled
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Account No</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Account Description</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>COA Class</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Subtotal Category</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Financial Statement Line</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>FS Type</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TB Start Balance</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TB End Balance</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>GL Net Activity</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Reconciliation</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Risk Flags</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((a, idx) => {
                const isSelected = selectedIdx === a.cIdx;
                const classColors: Record<string, { bg: string; text: string; border: string }> = {
                  Assets: { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' },
                  Liabilities: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
                  Equity: { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' },
                  Revenue: { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
                  'Operating Expenses': { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' },
                };
                const col = classColors[a.class] || { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };

                return (
                  <tr
                    key={a.code}
                    onClick={() => setSelectedIdx(selectedIdx === a.cIdx ? null : a.cIdx)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      background: isSelected ? '#F0F9FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                      borderLeft: isSelected ? '3px solid #0284C7' : '3px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.74rem' }}>
                        {a.code}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>{a.desc}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: col.bg,
                        color: col.text,
                        border: `1px solid ${col.border}`,
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}>
                        {a.class}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>{a.subtotal}</td>
                    <td style={{ padding: '8px 12px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>{a.fsl}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: a.type === 'Balance Sheet' ? '#F8FAFC' : '#F0FDFA',
                        color: a.type === 'Balance Sheet' ? '#475569' : '#0F766E',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                      }}>
                        {a.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{fmtCurr(a.tbStart)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{fmtCurr(a.tbEnd)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: a.glNet < 0 ? '#DC2626' : '#059669', whiteSpace: 'nowrap' }}>{fmtCurr(a.glNet)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: '#DCFCE7',
                        color: '#15803D',
                        border: '1px solid #BBF7D0',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <CheckCircle2 size={11} color="#15803D" /> {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {a.flags > 0 ? (
                        <span style={{
                          background: '#FFF1F2',
                          color: '#E11D48',
                          border: '1px solid #FECDD3',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                        }}>
                          {a.flags} Flags
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.68rem', fontWeight: 500 }}>0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OmniaVisualAnalyticsSuite;
