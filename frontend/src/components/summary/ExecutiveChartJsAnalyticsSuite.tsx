import React, { useState, useMemo } from 'react';
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
import { Bar, Line, Doughnut, Pie, PolarArea } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Layers, TrendingUp, Users, Lock, Calendar, BarChart3,
  Copy, FileText, AlertTriangle, Activity, PieChart as PieIcon, Archive,
  ShieldCheck, CheckCircle2, Download, Search, Filter, Info, ChevronRight,
  HelpCircle, ArrowUpRight, CheckSquare, Hash, Tag, Building, Globe, DollarSign
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

// Custom Chart.js Plugin for Polyline Leader Lines & Outer Callout Labels with Interactive Highlighting & Reveal Animation
const doughnutCalloutPlugin = {
  id: 'doughnutCallout',
  afterDatasetsDraw(chart: any) {
    if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
    if (chart.options?.plugins?.doughnutCallout === false || chart.options?.plugins?.doughnutCallout?.display === false) return;

    const { ctx, data } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;

    const dataset = data.datasets[0];
    if (!dataset || !dataset.data) return;

    const total = dataset.data.reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    if (total <= 0) return;

    // Selected slice index from chart options
    const selectedIndex = chart.options?.plugins?.doughnutCallout?.selectedIndex ?? null;

    ctx.save();

    meta.data.forEach((element: any, index: number) => {
      const val = Number(dataset.data[index]) || 0;
      if (val <= 0) return;

      const { startAngle, endAngle, outerRadius, x: centerX, y: centerY } = element;
      if (outerRadius < 20 || (endAngle - startAngle) < 0.04) return;

      // Reveal animation scaling progress
      const animProgress = Math.min(1, Math.max(0, (outerRadius - 20) / 35));
      if (animProgress <= 0) return;

      const isSelected = selectedIndex === null || selectedIndex === index;
      const alpha = isSelected ? animProgress : animProgress * 0.22;
      ctx.globalAlpha = alpha;

      const angle = startAngle + (endAngle - startAngle) / 2;

      // 1. Point on the outer edge of the slice
      const startX = centerX + Math.cos(angle) * outerRadius;
      const startY = centerY + Math.sin(angle) * outerRadius;

      // 2. Elbow point extending outward diagonally
      const extDist = isSelected && selectedIndex !== null ? 22 : 18;
      const elbowX = centerX + Math.cos(angle) * (outerRadius + extDist);
      const elbowY = centerY + Math.sin(angle) * (outerRadius + extDist);

      // 3. Horizontal segment going left or right
      const isRight = Math.cos(angle) >= 0;
      const horizLen = isSelected && selectedIndex !== null ? 26 : 22;
      const endX = isRight ? elbowX + horizLen : elbowX - horizLen;
      const endY = elbowY;

      // 4. Draw polyline leader line
      ctx.beginPath();
      ctx.strokeStyle = isSelected && selectedIndex !== null ? '#0284C7' : '#94A3B8';
      ctx.lineWidth = isSelected && selectedIndex !== null ? 2 : 1.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.moveTo(startX, startY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Small anchor point on perimeter
      ctx.beginPath();
      ctx.arc(startX, startY, isSelected && selectedIndex !== null ? 3 : 2, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected && selectedIndex !== null ? '#0284C7' : '#64748B';
      ctx.fill();

      // 5. Clean text label & percentage
      const rawLabel = (data.labels && data.labels[index]) ? String(data.labels[index]) : `Item ${index + 1}`;
      const cleanTitle = rawLabel
        .replace(/\s*\(\d+(\.\d+)?%\)/g, '')
        .replace(/\s*-\s*\d+(\.\d+)?%/g, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      const pct = ((val / total) * 100).toFixed(0);
      const displayText = `${cleanTitle} - ${pct}%`;

      // 6. Draw typography label
      ctx.font = isSelected && selectedIndex !== null ? "600 11.5px 'Inter', sans-serif" : "500 11px 'Inter', sans-serif";
      ctx.fillStyle = isSelected && selectedIndex !== null ? '#0369A1' : '#1E293B';
      ctx.textBaseline = 'middle';
      ctx.textAlign = isRight ? 'left' : 'right';
      const textX = isRight ? endX + 6 : endX - 6;
      ctx.fillText(displayText, textX, endY);
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

interface ExecutiveChartJsAnalyticsSuiteProps {
  runId: string;
  status: RunSummary | null;
  config: RunConfig | null;
  enabledExceptions?: Record<string, boolean>;
}

export const ExecutiveChartJsAnalyticsSuite: React.FC<ExecutiveChartJsAnalyticsSuiteProps> = ({
  runId,
  status,
  config,
  enabledExceptions,
}) => {
  const [activeTab, setActiveTab] = useState<string>('01_account_wise');
  const [quarterFilter, setQuarterFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Format currency helper ($ accounting format)
  const fmtCurr = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  const fmtNum = (val: number) => new Intl.NumberFormat('en-US').format(val);

  // Derive execution baseline metrics
  const totalGlRows = status?.totalInputRows?.gl || 54280;
  const totalTbRows = status?.totalInputRows?.tb || 6880;
  const totalStdLines = Math.round(totalGlRows * 0.782);
  const totalNonStdLines = totalGlRows - totalStdLines;

  // Real Exception counts from status
  const getExCount = (num: number, key: string): number => {
    const s = status as any;
    if (s?.exceptionCounts && s.exceptionCounts[key] !== undefined) {
      return s.exceptionCounts[key];
    }
    return status?.outputs?.find(o => o.name.toLowerCase().includes(`ex_${num}`) || o.name.toLowerCase().includes(`parameter_${num}`))?.rowCount || 0;
  };

  const exCounts = useMemo(() => ({
    ex1: getExCount(1, 'Ex1_Unusual_Accounts') || 412,
    ex2: getExCount(2, 'Ex2_Seldom_Accounts') || 711,
    ex3: getExCount(3, 'Ex3_Revenue_Debits') || 184,
    ex4: getExCount(4, 'Ex4_Few_Postings_Users') || 96,
    ex5: getExCount(5, 'Ex5_Users_Of_Interest') || 54,
    ex6: getExCount(6, 'Ex6_Closing_Entries') || 1341,
    ex7: getExCount(7, 'Ex7_Dates_Of_Interest') || 382,
    ex8: getExCount(8, 'Ex8_Round_Amounts') || 928,
    ex9: getExCount(9, 'Ex9_Duplicate_Entries') || 214,
    ex10: getExCount(10, 'Ex10_Keyword_Entries') || 516,
    ex11: getExCount(11, 'Ex11_Post_Closing_Entries') || 98724,
    ex12: getExCount(12, 'Ex12_Unrelated_Accounts') || 128,
  }), [status]);

  // Sheets mapping matching summary_overview.txt
  const sheets = [
    { id: '01_account_wise', num: '01', title: 'Account Wise Analysis', exKey: 'ex1', sub: 'Summary 1', icon: Layers },
    { id: '02_revenue_debits', num: '02', title: 'Large Debits to Revenue', exKey: 'ex3', sub: 'Summary 2', icon: TrendingUp },
    { id: '03_user_wise', num: '03', title: 'User Wise Analysis', exKey: 'ex4', sub: 'Summary 3', icon: Users },
    { id: '04_closing_entries', num: '04', title: 'Closing Entries Analysis', exKey: 'ex6', sub: 'Summary 4', icon: Lock },
    { id: '05_dates_interest', num: '05', title: 'Dates of Interest', exKey: 'ex7', sub: 'Summary 5', icon: Calendar },
    { id: '06_amount_analysis', num: '06', title: 'Amount Analysis', exKey: 'ex8', sub: 'Summary 6', icon: BarChart3 },
    { id: '07_duplicate_entries', num: '07', title: 'Duplicate Analysis', exKey: 'ex9', sub: 'Summary 7', icon: Copy },
    { id: '08_word_count', num: '08', title: 'High-Risk Word Count', exKey: 'ex10', sub: 'Summary 8', icon: FileText },
    { id: '09_post_closing', num: '09', title: 'After Closing Entries', exKey: 'ex11', sub: 'Summary 9', icon: AlertTriangle },
    { id: '10_unrelated_accounts', num: '10', title: 'Unrelated Accounts', exKey: 'ex12', sub: 'Summary 10', icon: Activity },
    { id: '11_population_stats', num: '11', title: 'Population Statistics', exKey: null, sub: 'Period Analysis', icon: PieIcon },
    { id: '00_engagement_details', num: '12', title: 'Engagement Details', exKey: null, sub: 'Scope & Cover', icon: Building },
  ];

  // Professional Custom HTML Tooltip Handler
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

  // Executive Theme Chart.js options with Info-Rich Tooltips & Smooth Animation
  const executiveChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 950,
      easing: 'easeOutQuart' as const,
    },
    animations: {
      y: {
        duration: 950,
        easing: 'easeOutQuart' as const,
      },
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
        grid: { color: '#F1F5F9', strokeDasharray: [3, 3] },
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
    cutout: '48%',
    layout: {
      padding: {
        top: 22,
        bottom: 22,
        left: 105,
        right: 105,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', fontFamily: "'Inter', sans-serif" }}>
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
              <span style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', border: '1px solid #E0F2FE' }}>
                EXECUTIVE AUDIT INTELLIGENCE SUITE
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                Run ID: <strong style={{ color: '#007680', fontFamily: 'monospace' }}>{runId}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', margin: 0, letterSpacing: '-0.015em' }}>
              Executive Visual Analytics &amp; Summary Worksheets
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '4px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <Filter size={13} color="#007680" />
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748B' }}>Filter Quarter:</span>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.76rem', fontWeight: 600, color: '#1E293B', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">All Quarters (Q1-Q4)</option>
              <option value="Q1">Q1 Only</option>
              <option value="Q2">Q2 Only</option>
              <option value="Q3">Q3 Only</option>
              <option value="Q4">Q4 Only</option>
            </select>
          </div>

          <a
            href={RunService.getDownloadAllZipUrl(runId)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              background: '#1E293B',
              color: '#FFFFFF',
              fontSize: '0.76rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(30, 41, 59, 0.15)',
              transition: 'background 0.15s ease',
            }}
          >
            <Archive size={14} color="#FFFFFF" />
            <span>Download All Workpapers (.ZIP)</span>
          </a>
        </div>
      </div>

      {(() => {
        const currentSheetIndex = sheets.findIndex((s) => s.id === activeTab);
        const handlePrevSheet = () => { if (currentSheetIndex > 0) setActiveTab(sheets[currentSheetIndex - 1].id); };
        const handleNextSheet = () => { if (currentSheetIndex < sheets.length - 1) setActiveTab(sheets[currentSheetIndex + 1].id); };

        return (
          <TabSlider
            scrollStep={280}
            activeId={activeTab}
            onPrev={handlePrevSheet}
            onNext={handleNextSheet}
            canPrev={currentSheetIndex > 0}
            canNext={currentSheetIndex < sheets.length - 1}
            containerStyle={{
              background: '#F8FAFC',
              padding: '6px 8px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
            }}
          >
            {sheets.map((s) => {
              const IconComp = s.icon;
              const isActive = activeTab === s.id;
              const isOut = s.exKey && enabledExceptions && enabledExceptions[s.exKey] === false;
              return (
                <button
                  key={s.id}
                  data-active={isActive ? 'true' : 'false'}
                  onClick={() => setActiveTab(s.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: isActive ? '6px 12px' : '5px 10px',
                    borderRadius: '8px',
                    border: isActive ? '1px solid #1E293B' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: isActive ? 600 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.18s ease',
                    background: isActive ? '#1E293B' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : isOut ? '#94A3B8' : '#475569',
                    opacity: isOut ? 0.6 : 1,
                    boxShadow: isActive ? '0 2px 6px rgba(30, 41, 59, 0.12)' : 'none',
                    zIndex: isActive ? 2 : 1,
                  }}
                >
                  <IconComp size={13} color={isActive ? '#FFFFFF' : isOut ? '#94A3B8' : '#007680'} />
                  <span>{s.num}. {s.title}</span>
                </button>
              );
            })}
          </TabSlider>
        );
      })()}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${quarterFilter}`}
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%' }}
        >
          {activeTab === '00_engagement_details' && (
            <Sheet00EngagementDetails fmtNum={fmtNum} fmtCurr={fmtCurr} totalGlRows={totalGlRows} totalTbRows={totalTbRows} options={executiveChartOptions} pieOptions={pieChartOptions} config={config} status={status} quarterFilter={quarterFilter} />
          )}
          {activeTab === '01_account_wise' && (
            <Sheet01AccountWise exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '02_revenue_debits' && (
            <Sheet02RevenueDebits exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '03_user_wise' && (
            <Sheet03UserWise exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '04_closing_entries' && (
            <Sheet04ClosingEntries exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '05_dates_interest' && (
            <Sheet05DatesOfInterest exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '06_amount_analysis' && (
            <Sheet06AmountAnalysis exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '07_duplicate_entries' && (
            <Sheet07DuplicateAnalysis exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '08_word_count' && (
            <Sheet08WordCount exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '09_post_closing' && (
            <Sheet09AfterClosing exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '10_unrelated_accounts' && (
            <Sheet10UnrelatedAccounts exCounts={exCounts} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
          {activeTab === '11_population_stats' && (
            <Sheet11PopulationStats totalGlRows={totalGlRows} options={executiveChartOptions} pieOptions={pieChartOptions} fmtNum={fmtNum} fmtCurr={fmtCurr} quarterFilter={quarterFilter} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const Sheet00EngagementDetails: React.FC<{
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  totalGlRows: number;
  totalTbRows: number;
  options: any;
  pieOptions: any;
  config: RunConfig | null;
  status: RunSummary | null;
  quarterFilter?: string;
}> = ({ fmtNum, fmtCurr, totalGlRows, totalTbRows, options, pieOptions, config, status, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const p = (config as any)?.parameters || {};
  const engName = p.engagementName || (config as any)?.engagementName || 'Tangerine Skies Pvt Ltd - JET Audit';
  const sDate = p.startDate || '01-Apr-2025';
  const eDate = p.endDate || '31-Mar-2026';
  const fyEnd = p.financialYearEnd || '31-Mar';
  const engCode = status?.runId || (config as any)?.runId || '4538076-JET-2026';
  const currCode = p.currencyCode || 'USD';
  const matThreshold = p.materiality ? fmtCurr(p.materiality) : '$500,000.00';

  const mappedScopeAccounts = Math.round(totalTbRows * 0.48);
  const popTotal = totalGlRows + totalTbRows + mappedScopeAccounts;
  const glShare = popTotal > 0 ? ((totalGlRows / popTotal) * 100).toFixed(1) : '0';
  const tbShare = popTotal > 0 ? ((totalTbRows / popTotal) * 100).toFixed(1) : '0';
  const scopeShare = popTotal > 0 ? ((mappedScopeAccounts / popTotal) * 100).toFixed(1) : '0';

  const baseColors = ['#007680', '#38BDF8', '#FBBF24'];
  const popDoughnutData = useMemo(() => ({
    labels: [
      `General Ledger Rows (${glShare}%)`,
      `Trial Balance Accounts (${tbShare}%)`,
      `Mapped Scope Accounts (${scopeShare}%)`
    ],
    datasets: [{
      data: [totalGlRows, totalTbRows, mappedScopeAccounts],
      backgroundColor: getHighlightColors(baseColors, selectedIdx),
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }]
  }), [totalGlRows, totalTbRows, mappedScopeAccounts, glShare, tbShare, scopeShare, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const periodBarData = useMemo(() => {
    const q1Gl = Math.round(totalGlRows * 0.24);
    const q2Gl = Math.round(totalGlRows * 0.25);
    const q3Gl = Math.round(totalGlRows * 0.25);
    const q4Gl = Math.round(totalGlRows * 0.26);
    const q1Ex = Math.round(totalGlRows * 0.0077);
    const q2Ex = Math.round(totalGlRows * 0.0103);
    const q3Ex = Math.round(totalGlRows * 0.0125);
    const q4Ex = Math.round(totalGlRows * 0.0235);

    if (quarterFilter === 'Q1') {
      return {
        labels: ['Month 1 (Apr)', 'Month 2 (May)', 'Month 3 (Jun)'],
        datasets: [
          { label: 'Standard Population Volume (Q1)', data: [Math.round(q1Gl * 0.32), Math.round(q1Gl * 0.33), Math.round(q1Gl * 0.35)], backgroundColor: '#007680', borderRadius: 4 },
          { label: 'Flagged Exception Targets (Q1)', data: [Math.round(q1Ex * 0.30), Math.round(q1Ex * 0.32), Math.round(q1Ex * 0.38)], backgroundColor: '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 4 }
        ]
      };
    }
    if (quarterFilter === 'Q2') {
      return {
        labels: ['Month 4 (Jul)', 'Month 5 (Aug)', 'Month 6 (Sep)'],
        datasets: [
          { label: 'Standard Population Volume (Q2)', data: [Math.round(q2Gl * 0.33), Math.round(q2Gl * 0.33), Math.round(q2Gl * 0.34)], backgroundColor: '#007680', borderRadius: 4 },
          { label: 'Flagged Exception Targets (Q2)', data: [Math.round(q2Ex * 0.31), Math.round(q2Ex * 0.33), Math.round(q2Ex * 0.36)], backgroundColor: '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 4 }
        ]
      };
    }
    if (quarterFilter === 'Q3') {
      return {
        labels: ['Month 7 (Oct)', 'Month 8 (Nov)', 'Month 9 (Dec)'],
        datasets: [
          { label: 'Standard Population Volume (Q3)', data: [Math.round(q3Gl * 0.32), Math.round(q3Gl * 0.33), Math.round(q3Gl * 0.35)], backgroundColor: '#007680', borderRadius: 4 },
          { label: 'Flagged Exception Targets (Q3)', data: [Math.round(q3Ex * 0.30), Math.round(q3Ex * 0.32), Math.round(q3Ex * 0.38)], backgroundColor: '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 4 }
        ]
      };
    }
    if (quarterFilter === 'Q4') {
      return {
        labels: ['Month 10 (Jan)', 'Month 11 (Feb)', 'Month 12 (Mar)'],
        datasets: [
          { label: 'Standard Population Volume (Q4)', data: [Math.round(q4Gl * 0.31), Math.round(q4Gl * 0.31), Math.round(q4Gl * 0.38)], backgroundColor: '#007680', borderRadius: 4 },
          { label: 'Flagged Exception Targets (Q4)', data: [Math.round(q4Ex * 0.28), Math.round(q4Ex * 0.28), Math.round(q4Ex * 0.44)], backgroundColor: '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 4 }
        ]
      };
    }

    return {
      labels: ['Q1 Fiscal', 'Q2 Fiscal', 'Q3 Fiscal', 'Q4 Year-End'],
      datasets: [
        { label: 'Standard Population Volume', data: [q1Gl, q2Gl, q3Gl, q4Gl], backgroundColor: '#007680', borderRadius: 4 },
        { label: 'Flagged Exception Targets', data: [q1Ex, q2Ex, q3Ex, q4Ex], backgroundColor: '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 4 }
      ]
    };
  }, [totalGlRows, quarterFilter]);

  const segLabels = ['General Ledger Rows', 'Trial Balance Accounts', 'Mapped Scope Accounts'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Engagement Details &amp; Testing Parameters</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Interactive overview of client engagement metadata, testing period boundary parameters ({sDate} to {eDate}), financial statement scope, and PCAOB AS 2401 compliance setup. Click any chart slice to cross-filter parameters.</p>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={segLabels[selectedIdx] || 'Selected Segment'}
          countText={selectedIdx === 0 ? `${fmtNum(totalGlRows)} GL Lines` : selectedIdx === 1 ? `${fmtNum(totalTbRows)} TB Accounts` : `${fmtNum(mappedScopeAccounts)} Mapped Accounts`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Audit Population Ingestion Breakdown</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Interactive Slice Click</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut key={`doughnut-00-${quarterFilter}`} data={popDoughnutData} options={interactivePieOptions} />
          </div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Quarterly Population &amp; Exception Scanning Density {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h4>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={periodBarData} options={options} /></div>
        </div>
      </div>
      <div style={{ background: '#FFFFFF', padding: '22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#1E293B', margin: '0 0 14px' }}>Engagement Audit Parameters</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
          {[
            { label: 'Engagement Name', val: engName, icon: Building, color: '#007680' },
            { label: 'Start Date', val: sDate, icon: Calendar, color: '#007680' },
            { label: 'End Date', val: eDate, icon: Calendar, color: '#007680' },
            { label: 'Financial Year End', val: fyEnd, icon: ShieldCheck, color: '#0284C7' },
            { label: 'Engagement Run ID', val: engCode, icon: Hash, color: '#7C3AED' },
            { label: 'Operating Currency', val: currCode, icon: DollarSign, color: '#059669' },
            { label: 'Overall Materiality', val: matThreshold, icon: Tag, color: '#D97706' },
            { label: 'Engagement Classification', val: 'Tier 1 Key Audit Engagement', icon: ShieldCheck, color: '#007680' },
          ].map((item) => (
            <div key={item.label} style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1E293B', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Sheet01AccountWise: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const rawCategories = ['Trade Receivables', 'Finished Goods', 'Cash Holdings', 'Accrued Liabilities'];

  const chartData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.24;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.26;
    const stdBase = [1420, 2180, 1850, 940, 120, 45];
    const nonStdBase = [320, 540, 410, 290, exCounts.ex1, exCounts.ex2];
    const baseColors = ['#007680', '#007680', '#007680', '#007680', '#007680', '#007680'];
    return {
      labels: ['Cash & Equiv', 'Trade Receivables', 'Inventories', 'Accrued Expenses', 'Suspense', 'Seldom Rev'],
      datasets: [
        { label: quarterFilter === 'ALL' ? 'Total Standard Lines' : `Standard Lines (${quarterFilter})`, data: stdBase.map(v => Math.round(v * mult)), backgroundColor: getHighlightColors(baseColors, selectedIdx), borderRadius: 4 },
        { label: quarterFilter === 'ALL' ? 'Total Non-Standard Lines' : `Non-Standard Lines (${quarterFilter})`, data: nonStdBase.map(v => Math.round(v * mult)), backgroundColor: selectedIdx !== null ? '#BAE6FD33' : '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 4 }
      ]
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const fsDoughnutData = useMemo(() => {
    const qMult = quarterFilter === 'Q1' ? 0.24 : quarterFilter === 'Q2' ? 0.25 : quarterFilter === 'Q3' ? 0.25 : quarterFilter === 'Q4' ? 0.26 : 1;
    const baseAmounts = [28940000, 19820500, 14280900, 8420100].map(v => Math.round(v * qMult));
    const totalExp = baseAmounts.reduce((a, b) => a + b, 0);
    const catNames = rawCategories;
    const labels = catNames.map((name, i) => {
      const pct = totalExp > 0 ? ((baseAmounts[i] / totalExp) * 100).toFixed(1) : '0';
      return `${name} (${pct}%)`;
    });
    const baseColors = ['#007680', '#38BDF8', '#FBBF24', '#34D399'];
    return {
      labels,
      datasets: [{
        data: baseAmounts,
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
    };
  }, [quarterFilter, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);
  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);

  const allRows = [
    { gl: '106000', desc: 'Trade Debtors - Domestic', fs: 'Trade Receivables', catIdx: 0, totLines: 2720, stdLines: 2180, nonStdLines: 540, entries: 1250, debits: 28940000, credits: 28940000, net: 0, q1A: 7000000, q2A: 7200000, q3A: 7300000, q4A: 7440000 },
    { gl: '107500', desc: 'Finished Goods Inventory', fs: 'Finished Goods', catIdx: 1, totLines: 2260, stdLines: 1850, nonStdLines: 410, entries: 980, debits: 19820500, credits: 19820500, net: 0, q1A: 4800000, q2A: 4900000, q3A: 5000000, q4A: 5120500 },
    { gl: '101000', desc: 'Cash and Liquid Holdings', fs: 'Cash Holdings', catIdx: 2, totLines: 1740, stdLines: 1420, nonStdLines: 320, entries: 840, debits: 14280900, credits: 14280900, net: 0, q1A: 3500000, q2A: 3400000, q3A: 3600000, q4A: 3780900 },
    { gl: '201900', desc: 'Accrued Payroll & Bonuses', fs: 'Accrued Liabilities', catIdx: 3, totLines: 1230, stdLines: 940, nonStdLines: 290, entries: 420, debits: 8420100, credits: 8420100, net: 0, q1A: 2000000, q2A: 2100000, q3A: 2100000, q4A: 2220100 },
    { gl: '399999', desc: 'Unusual Suspense Clearing', fs: 'Other Current Liabilities', catIdx: 4, totLines: 120 + exCounts.ex1, stdLines: 120, nonStdLines: exCounts.ex1, entries: exCounts.ex1, debits: 4892000, credits: 4892000, net: 0, q1A: 1000000, q2A: 1100000, q3A: 1200000, q4A: 1592000 },
    { gl: '400500', desc: 'Seldom Used Revenue GL', fs: 'Operating Revenues', catIdx: 5, totLines: 45 + exCounts.ex2, stdLines: 45, nonStdLines: exCounts.ex2, entries: exCounts.ex2, debits: 3150000, credits: 3150000, net: 0, q1A: 500000, q2A: 600000, q3A: 700000, q4A: 1350000 },
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
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>This summary gives an overview of entries and activity of specified GLs. Click any slice or bar to filter the data table below to that specific account category.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 1 - Account Activity Distribution {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
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
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 1 - Account Wise Analysis Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{filteredRows.length} Accounts Displayed</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>G/L</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FS Line Items</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Total Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Std Lines</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase' }}>Non-Std Lines</th>
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
                    <td style={{ padding: '8px 12px' }}><span style={{ background: '#F1F5F9', color: '#007680', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.74rem' }}>{r.gl}</span></td>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1E293B' }}>{r.desc}</td>
                    <td style={{ padding: '8px 12px', color: '#64748B', fontSize: '0.74rem' }}>{r.fs}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtNum(r.totLines)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: 500 }}>{fmtNum(r.stdLines)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}><span style={{ background: r.nonStdLines > 200 ? '#FFF1F2' : '#F8FAFC', color: r.nonStdLines > 200 ? '#E11D48' : '#64748B', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{fmtNum(r.nonStdLines)}</span></td>
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

const Sheet02RevenueDebits: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const categories = ['Sales Returns', 'Price Adjustments', 'Rebate Settlements', 'Manual Overrides'];
  const baseAmounts = [4200000, 2800000, 1600000, 860000];

  const lineData = useMemo(() => {
    return {
      labels: ['Q1 Revenue Debits', 'Q2 Revenue Debits', 'Q3 Revenue Debits', 'Q4 Revenue Debits'],
      datasets: [{ label: 'Net Debit Reversal Amount ($)', data: [1240000, 2850000, 1920000, 3450000], borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', fill: true, tension: 0.3 }]
    };
  }, [quarterFilter]);

  const catBarData = useMemo(() => {
    const baseColors = ['#EF4444', '#F87171', '#FCA5A5', '#FECDD3'];
    return {
      labels: categories,
      datasets: [{
        label: 'Reversal Value Exposure ($)',
        data: baseAmounts,
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderRadius: 4
      }]
    };
  }, [selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);

  const allRows = [
    { catIdx: 3, type: 'Non-Standard Manual Debit', uId: 'USR_FIN_MGR', uName: 'S. Accountant', aId: 'USR_DIR_FIN', aName: 'J. Director', entries: exCounts.ex3, netAmt: 9460000, wEnd: 18, hol: 4, q1A: 1240000, q2A: 2850000, q3A: 1920000, q4A: 3450000 },
    { catIdx: 0, type: 'Non-Standard Credit Memo (Returns)', uId: 'USR_SALES_OPS', uName: 'R. Reynolds', aId: 'USR_VP_SALES', aName: 'M. Vance', entries: 42, netAmt: 4200000, wEnd: 6, hol: 1, q1A: 420000, q2A: 980000, q3A: 720000, q4A: 1000000 },
    { catIdx: 1, type: 'Non-Standard Price Adjustment', uId: 'USR_PRICING', uName: 'K. Patel', aId: 'USR_DIR_FIN', aName: 'J. Director', entries: 29, netAmt: 2800000, wEnd: 3, hol: 0, q1A: 310000, q2A: 820000, q3A: 640000, q4A: 1030000 },
    { catIdx: 2, type: 'Non-Standard Rebate Settlement', uId: 'USR_COMMERCIAL', uName: 'D. Vance', aId: 'USR_VP_SALES', aName: 'M. Vance', entries: 18, netAmt: 1600000, wEnd: 2, hol: 1, q1A: 210000, q2A: 450000, q3A: 390000, q4A: 550000 },
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
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>This summary identifies reversals in revenue that may have been improperly recognized. Click any bar column to isolate specific revenue debit categories.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Summary 2 - Revenue Debit Reversal Trajectory {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
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
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 2 - Large Debits to Revenue Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
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
                const typeDesc = r.type.replace(/^Non-Standard\s*/i, '');
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
                          Non-Standard
                        </span>
                        <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                          {typeDesc}
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

const Sheet03UserWise: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const userList = ['USR_BATCH_AUTO', 'USR_ACCOUNTANT_1', 'USR_SYS_ADMIN', 'USR_TEMP_AUDIT', 'USR_CONSULTANT'];

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
      datasets: [{
        label: quarterFilter === 'ALL' ? 'Total Journal Entry Amount ($)' : `Journal Entry Amount (${quarterFilter}) ($)`,
        data: baseData.map(v => Math.round(v * mult)),
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderRadius: 4
      }]
    };
  }, [quarterFilter, selectedIdx]);

  const userRiskPieData = useMemo(() => {
    const qMult = quarterFilter === 'Q1' ? 0.24 : quarterFilter === 'Q2' ? 0.25 : quarterFilter === 'Q3' ? 0.25 : quarterFilter === 'Q4' ? 0.26 : 1;
    const autoAmt = Math.round(42800000 * qMult);
    const stdAmt = Math.round(18500000 * qMult);
    const riskAmt = Math.round((exCounts.ex4 * 98541 + exCounts.ex5 * 58333) * qMult);
    const totalAmt = autoAmt + stdAmt + riskAmt;
    const autoPct = totalAmt > 0 ? ((autoAmt / totalAmt) * 100).toFixed(1) : '0';
    const stdPct = totalAmt > 0 ? ((stdAmt / totalAmt) * 100).toFixed(1) : '0';
    const riskPct = totalAmt > 0 ? ((riskAmt / totalAmt) * 100).toFixed(1) : '0';
    const baseColors = ['#007680', '#38BDF8', '#EF4444'];
    return {
      labels: [
        `Automated Feeds (${autoPct}%)`,
        `Standard Operations (${stdPct}%)`,
        `High-Risk Admin/Temp (${riskPct}%)`
      ],
      datasets: [{
        data: [autoAmt, stdAmt, riskAmt],
        backgroundColor: getHighlightColors(baseColors, selectedIdx !== null ? (selectedIdx <= 1 ? selectedIdx : 2) : null),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
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
    { uIdx: 0, type: 'Standard Automated', name: 'USR_BATCH_AUTO', entries: 28400, amt: 42800000, q1: 7100, q2: 7000, q3: 7100, q4: 7200, risk: 'low' },
    { uIdx: 1, type: 'Standard Manual', name: 'USR_ACCOUNTANT_1', entries: 14200, amt: 18500000, q1: 3500, q2: 3550, q3: 3550, q4: 3600, risk: 'low' },
    { uIdx: 2, type: 'Non-Standard Manual', name: 'USR_SYS_ADMIN', entries: exCounts.ex4, amt: 9460000, q1: 20, q2: 24, q3: 22, q4: 30, risk: 'high' },
    { uIdx: 3, type: 'Non-Standard Manual', name: 'USR_TEMP_AUDIT', entries: exCounts.ex5, amt: 3150000, q1: 10, q2: 12, q3: 14, q4: 18, risk: 'high' },
    { uIdx: 4, type: 'Non-Standard External', name: 'USR_CONSULTANT', entries: 14, amt: 1280000, q1: 2, q2: 4, q3: 3, q4: 5, risk: 'high' },
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
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Analyze journal entries by user to identify personnel posting infrequent or high-risk manual transaction volumes. Click any user bar or doughnut slice to isolate user transactions.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 3 - User Posting Value Distribution {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
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
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 3 - User Wise Analysis Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
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
                        display: 'inline-block'
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

const Sheet04ClosingEntries: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
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
    const totalExp = v1 + v2 + v3 + v4 + v5;
    const p1 = totalExp > 0 ? ((v1 / totalExp) * 100).toFixed(1) : '0';
    const p2 = totalExp > 0 ? ((v2 / totalExp) * 100).toFixed(1) : '0';
    const p3 = totalExp > 0 ? ((v3 / totalExp) * 100).toFixed(1) : '0';
    const p4 = totalExp > 0 ? ((v4 / totalExp) * 100).toFixed(1) : '0';
    const p5 = totalExp > 0 ? ((v5 / totalExp) * 100).toFixed(1) : '0';
    const baseColors = ['#007680', '#38BDF8', '#EF4444', '#FBBF24', '#8B5CF6'];
    return {
      labels: [
        `Increase in Assets (${p1}%)`,
        `Decrease in Liab (${p2}%)`,
        `Increase in Exp [Risk] (${p3}%)`,
        `Decrease in Rev (${p4}%)`,
        `Equity Adj (${p5}%)`
      ],
      datasets: [{
        data: [v1, v2, v3, v4, v5],
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
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
        { label: 'Standard Documented Closing Lines', data: [Math.round(3100 * mult), Math.round(1400 * mult), Math.round(620 * mult), Math.round(150 * mult)], backgroundColor: '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 4 }
      ]
    };
  }, [quarterFilter]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRows = [
    { catIdx: 0, type: 'Non-Standard Closing', fs: 'Increase in Assets', lines: 420, deb: 4200000, cred: 0, entries: 180, net: 4200000, q1L: 80, q2L: 90, q3L: 100, q4L: 150 },
    { catIdx: 1, type: 'Non-Standard Closing', fs: 'Decrease in Liabilities', lines: 310, deb: 3100000, cred: 0, entries: 140, net: 3100000, q1L: 60, q2L: 70, q3L: 80, q4L: 100 },
    { catIdx: 2, type: 'Non-Standard Closing', fs: 'Increase in Expense', lines: exCounts.ex6, deb: 8400000, cred: 0, entries: 420, net: 8400000, q1L: 100, q2L: 120, q3L: 140, q4L: exCounts.ex6 },
    { catIdx: 3, type: 'Non-Standard Closing', fs: 'Decrease in Revenue', lines: 190, deb: 1900000, cred: 0, entries: 90, net: 1900000, q1L: 30, q2L: 40, q3L: 50, q4L: 70 },
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
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Identify entries having limited, weak, or blank narration during the period-end closing period. Click any slice to filter closing effect categories.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 4 - Closing Entries Financial Statement Effect</h4>
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
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 4 - Closing Entries Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
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

const Sheet05DatesOfInterest: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const dayCategories = ['Saturday Postings', 'Sunday Postings', 'Public Bank Holidays'];

  const lineData = useMemo(() => {
    return {
      labels: ['Easter Weekend', 'Independence Day', 'Labor Day', 'Thanksgiving', 'Christmas / Year-End'],
      datasets: [{ label: 'Flagged Holiday/Weekend Entries', data: [18, 24, 16, 42, exCounts.ex7], borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', fill: true, tension: 0.3, }]
    };
  }, [quarterFilter, exCounts]);

  const pieData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.22;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.28;
    const satCount = Math.round(exCounts.ex7 * 0.47 * mult);
    const sunCount = Math.round(exCounts.ex7 * 0.31 * mult);
    const holCount = Math.round(exCounts.ex7 * 0.22 * mult);
    const totalCount = satCount + sunCount + holCount;
    const satPct = totalCount > 0 ? ((satCount / totalCount) * 100).toFixed(1) : '0';
    const sunPct = totalCount > 0 ? ((sunCount / totalCount) * 100).toFixed(1) : '0';
    const holPct = totalCount > 0 ? ((holCount / totalCount) * 100).toFixed(1) : '0';
    const baseColors = ['#EF4444', '#FBBF24', '#007680'];
    return {
      labels: [
        `Saturday Postings [Risk] (${satPct}%)`,
        `Sunday Postings (${sunPct}%)`,
        `Public Bank Holidays (${holPct}%)`
      ],
      datasets: [{
        data: [satCount, sunCount, holCount],
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRows = [
    { dayIdx: 0, type: 'Non-Standard Weekend', day: 'Saturday', date: '04/12/2025', entries: 42, cred: 1420000, deb: 1420000 },
    { dayIdx: 1, type: 'Non-Standard Weekend', day: 'Sunday', date: '04/13/2025', entries: 28, cred: 980000, deb: 980000 },
    { dayIdx: 2, type: 'Non-Standard Holiday', day: 'Bank Holiday', date: '12/25/2025', entries: exCounts.ex7, cred: 3450000, deb: 3450000 },
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
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Identify entries posted on weekends, public holidays, or specified company shutdown dates. Click any slice to filter specific day classifications.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Summary 5 - Weekend &amp; Holiday Trajectory {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
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
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 5 - Dates of Interest Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
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
const Sheet06AmountAnalysis: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
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
      datasets: [{
        label: quarterFilter === 'ALL' ? 'Rounded Amounts Count' : `Rounded Amounts Count (${quarterFilter})`,
        data: baseAmounts,
        backgroundColor: baseColors,
        borderRadius: 4,
      }]
    };
  }, [quarterFilter]);

  const endDigitsDoughnutData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.23;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.27;
    const c000 = Math.round(exCounts.ex8 * 0.62 * mult);
    const c999 = Math.round(exCounts.ex8 * 0.24 * mult);
    const c500 = Math.round(exCounts.ex8 * 0.14 * mult);
    const totalCount = c000 + c999 + c500;
    const p000 = totalCount > 0 ? ((c000 / totalCount) * 100).toFixed(1) : '0';
    const p999 = totalCount > 0 ? ((c999 / totalCount) * 100).toFixed(1) : '0';
    const p500 = totalCount > 0 ? ((c500 / totalCount) * 100).toFixed(1) : '0';
    const baseColors = ['#007680', '#EF4444', '#38BDF8'];
    return {
      labels: [
        `Triple Zero .000 (${p000}%)`,
        `Ending in .999 [Risk] (${p999}%)`,
        `Ending in .500 (${p500}%)`
      ],
      datasets: [{
        data: [c000, c999, c500],
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRowsA = [
    { pIdx: 1, pat: '.999 Endings', cat: 'Non-Standard', entries: 142, deb: 1420000 },
    { pIdx: 2, pat: '.500 Endings', cat: 'Non-Standard', entries: 88, deb: 880000 },
  ];

  const allRowsB = [
    { pIdx: 0, thresh: '$100,000', cat: 'Non-Standard', entries: exCounts.ex8, deb: 92800000 },
    { pIdx: 0, thresh: '$1,000,000+', cat: 'Non-Standard', entries: 38, deb: 38000000 },
  ];

  const filteredRowsA = useMemo(() => {
    if (selectedIdx === null) return allRowsA;
    return allRowsA.filter(r => r.pIdx === selectedIdx);
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
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Identify journal entries with round amounts and recurring ending digits (.000, .999, .500). Click any doughnut slice to highlight specific digit patterns.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Summary 6 - Rounded Amounts Magnitude {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
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

const Sheet07DuplicateAnalysis: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const dupCategories = ['2x Exact Line Matches', '3x Triplicate Matches', '4x+ Multi-Post Matches'];

  const barData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.20;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.30;
    const baseData = [Math.round(exCounts.ex9 * mult), Math.round(18 * mult), Math.round(5 * mult)];
    const baseColors = ['#EF4444', '#F87171', '#FCA5A5'];
    return {
      labels: dupCategories,
      datasets: [{
        label: quarterFilter === 'ALL' ? 'Duplicate Sets Identified' : `Duplicate Sets Identified (${quarterFilter})`,
        data: baseData,
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderRadius: 4,
      }]
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const dupRatioData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.20;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.30;
    const dupCount = Math.round(exCounts.ex9 * 2.2 * mult);
    const uniqueCount = Math.max(0, Math.round(54280 * mult) - dupCount);
    const totalLines = uniqueCount + dupCount;
    const uPct = totalLines > 0 ? ((uniqueCount / totalLines) * 100).toFixed(1) : '0';
    const dPct = totalLines > 0 ? ((dupCount / totalLines) * 100).toFixed(1) : '0';
    const baseColors = ['#007680', '#EF4444'];
    return {
      labels: [
        `Unique Journal Lines (${uPct}%)`,
        `Potential Duplicate Clusters [Risk] (${dPct}%)`
      ],
      datasets: [{
        data: [uniqueCount, dupCount],
        backgroundColor: getHighlightColors(baseColors, selectedIdx !== null ? 1 : null),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);
  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx !== null ? 1 : null, (idx) => {
    setSelectedIdx(idx === 1 ? 0 : null);
  }), [pieOptions, selectedIdx]);

  const allRows = [
    { dIdx: 0, type: 'Non-Standard Duplicate', matchType: '2x Exact Match', entries: exCounts.ex9, lines: exCounts.ex9 * 2, deb: 4280000, cred: 4280000 },
    { dIdx: 1, type: 'Non-Standard Triplicate', matchType: '3x Triplicate Match', entries: 18, lines: 54, deb: 920000, cred: 920000 },
    { dIdx: 2, type: 'Non-Standard Multi-Post', matchType: '4x+ Multi-Post Match', entries: 5, lines: 22, deb: 410000, cred: 410000 },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter(r => r.dIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Identify duplicate entries with identical account, amount, and date combinations. Click any duplicate category bar to filter sets.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 7 - Duplicate Multiplier Breakdown {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
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
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 7 - Duplicate Analysis Data Grid {quarterFilter !== 'ALL' ? `[Scope: ${quarterFilter}]` : ''}</h5>
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
const Sheet08WordCount: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
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
      datasets: [{
        label: quarterFilter === 'ALL' ? 'Matching Journal Entries' : `Matching Journal Entries (${quarterFilter})`,
        data: base.map(v => Math.round(v * mult)),
        backgroundColor: baseColors,
        borderRadius: 4,
      }]
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
    const infoRisk = Math.round(exCounts.ex10 * mult);
    const totalRisk = highRisk + medRisk + infoRisk;
    const hPct = totalRisk > 0 ? ((highRisk / totalRisk) * 100).toFixed(1) : '0';
    const mPct = totalRisk > 0 ? ((medRisk / totalRisk) * 100).toFixed(1) : '0';
    const iPct = totalRisk > 0 ? ((infoRisk / totalRisk) * 100).toFixed(1) : '0';
    const baseColors = ['#EF4444', '#FBBF24', '#38BDF8'];
    return {
      labels: [
        `High Risk ("Fraud", "Plug", "Override") (${hPct}%)`,
        `Medium Risk ("Suspense", "Adjust") (${mPct}%)`,
        `Informational ("Manual", "Reclass") (${iPct}%)`
      ],
      datasets: [{
        data: [highRisk, medRisk, infoRisk],
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
    };
  }, [quarterFilter, exCounts, selectedIdx]);

  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRows = [
    { rIdx: 0, word: 'Fraud', risk: 'High', entries: 4, amt: 840000, user: 'USR_TEMP_AUDIT' },
    { rIdx: 0, word: 'Plug', risk: 'High', entries: 7, amt: 1250000, user: 'USR_SYS_ADMIN' },
    { rIdx: 0, word: 'Override', risk: 'High', entries: 38, amt: 4890000, user: 'USR_FIN_MGR' },
    { rIdx: 1, word: 'Suspense', risk: 'Medium', entries: 18, amt: 2180000, user: 'USR_ACCOUNTANT_1' },
    { rIdx: 1, word: 'Adjust', risk: 'Medium', entries: 145, amt: 14200000, user: 'USR_ACCOUNTANT_1' },
    { rIdx: 2, word: 'Manual', risk: 'Informational', entries: 210, amt: 18500000, user: 'USR_ACCOUNTANT_1' },
    { rIdx: 2, word: 'Reclass', risk: 'Informational', entries: 82, amt: 6400000, user: 'USR_ACCOUNTANT_1' },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter(r => r.rIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Identify entries with high-risk keywords of interest in journal descriptions and line narrations. Click any slice in the stratification doughnut to filter monitored words by severity.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Summary 8 - Keyword Flag Frequency &amp; Density {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
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
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 8 - Keyword Flagged Entries Breakdown</h5>
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

const Sheet09AfterClosing: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const divNames = ['Corporate HQ', 'EMEA Operations', 'North America Sales', 'APAC Treasury'];

  const lineData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.18;
    if (quarterFilter === 'Q2') mult = 0.22;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.35;
    return {
      labels: ['Day +1', 'Day +3', 'Day +5', 'Day +10', 'Day +20', 'Day +30'],
      datasets: [{ label: quarterFilter === 'ALL' ? 'Entries Posted After Closing Date' : `Entries Posted After Closing (${quarterFilter})`, data: [Math.round(exCounts.ex11 * mult), Math.round(4120 * mult), Math.round(1820 * mult), Math.round(890 * mult), Math.round(310 * mult), Math.round(140 * mult)], borderColor: '#007680', backgroundColor: 'rgba(0, 118, 128, 0.08)', fill: true, tension: 0.3, }]
    };
  }, [quarterFilter, exCounts]);

  const divBarData = useMemo(() => {
    const baseColors = ['#007680', '#38BDF8', '#FBBF24', '#8B5CF6'];
    return {
      labels: divNames,
      datasets: [{
        label: 'Late Entries Materiality ($)',
        data: [4850000, 2410000, 1680000, 932000],
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderRadius: 4
      }]
    };
  }, [selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);

  const allRows = [
    { divIdx: 0, type: 'Post-Closing Adjustment', postDate: '04/05/2026', cutoff: '03/31/2026', lag: '+5 Days', entries: 1820, deb: 3450000, user: 'USR_FIN_MGR' },
    { divIdx: 1, type: 'Post-Closing Reversal', postDate: '04/10/2026', cutoff: '03/31/2026', lag: '+10 Days', entries: 890, deb: 1980000, user: 'USR_SYS_ADMIN' },
    { divIdx: 2, type: 'Late Sales Recognition', postDate: '04/03/2026', cutoff: '03/31/2026', lag: '+3 Days', entries: 620, deb: 1680000, user: 'USR_SALES_OPS' },
    { divIdx: 3, type: 'FX Revaluation Adjustment', postDate: '04/15/2026', cutoff: '03/31/2026', lag: '+15 Days', entries: 310, deb: 932000, user: 'USR_TREASURY' },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter(r => r.divIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Identify entries posted strictly after the official financial statement closing period cutoff date. Click any division bar to filter late entry records.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Summary 9 - After Closing Decay Velocity {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
          <div style={{ flex: 1, minHeight: 0 }}><Line data={lineData} options={options} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Late Entries Materiality by Operating Division</h4>
            <span style={{ fontSize: '0.70rem', color: '#0284C7', fontWeight: 600 }}>Click column to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={divBarData} options={interactiveBarOptions} /></div>
        </div>
      </div>

      {selectedIdx !== null && (
        <ActiveCrossFilterBanner
          label={divNames[selectedIdx] || `Division ${selectedIdx + 1}`}
          countText={`Showing ${filteredRows.length} post-closing entry`}
          onClear={() => setSelectedIdx(null)}
        />
      )}

      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 9 - Post-Closing Entries Activity Grid</h5>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>{filteredRows.length} Post-Closing Records Displayed</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '180px' }}>Entry Type</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Effective Posting Date</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Cutoff Lag</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Entries</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Debit Impact ($)</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '0.70rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Preparer User</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => {
                const isSelected = selectedIdx === r.divIdx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIdx(selectedIdx === r.divIdx ? null : r.divIdx)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      background: isSelected ? '#FEF3C7' : idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
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
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>{r.postDate}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}><span style={{ background: '#FFF1F2', color: '#EF4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '0.72rem' }}>{r.lag}</span></td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtNum(r.entries)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#007680', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtCurr(r.deb)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>{r.user}</td>
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

const Sheet10UnrelatedAccounts: React.FC<{ exCounts: Record<string, number>; options: any; pieOptions: any; fmtNum: (n: number) => string; fmtCurr: (n: number) => string; quarterFilter?: string }> = ({ exCounts, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const pairingNames = ['Cash vs Depr', 'Revenue vs Payable', 'Inventory vs Bonus', 'Prepaid vs Loan'];

  const barData = useMemo(() => {
    let mult = 1;
    if (quarterFilter === 'Q1') mult = 0.20;
    if (quarterFilter === 'Q2') mult = 0.25;
    if (quarterFilter === 'Q3') mult = 0.25;
    if (quarterFilter === 'Q4') mult = 0.30;
    const baseData = [Math.round(exCounts.ex12 * mult), Math.round(45 * mult), Math.round(28 * mult), Math.round(12 * mult)];
    const baseColors = ['#EF4444', '#FBBF24', '#007680', '#38BDF8'];
    return {
      labels: pairingNames,
      datasets: [{
        label: quarterFilter === 'ALL' ? 'Unrelated Pairing Transactions' : `Unrelated Pairing Transactions (${quarterFilter})`,
        data: baseData,
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderRadius: 4,
      }]
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
    const totalExp = v1 + v2 + v3 + v4;
    const p1 = totalExp > 0 ? ((v1 / totalExp) * 100).toFixed(1) : '0';
    const p2 = totalExp > 0 ? ((v2 / totalExp) * 100).toFixed(1) : '0';
    const p3 = totalExp > 0 ? ((v3 / totalExp) * 100).toFixed(1) : '0';
    const p4 = totalExp > 0 ? ((v4 / totalExp) * 100).toFixed(1) : '0';
    const baseColors = ['#EF4444', '#FBBF24', '#007680', '#38BDF8'];
    return {
      labels: [
        `Cash vs Depr [Risk] (${p1}%)`,
        `Revenue vs Payable [Risk] (${p2}%)`,
        `Inventory vs Bonus (${p3}%)`,
        `Prepaid vs Loan (${p4}%)`
      ],
      datasets: [{
        data: [v1, v2, v3, v4],
        backgroundColor: getHighlightColors(baseColors, selectedIdx),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }]
    };
  }, [quarterFilter, selectedIdx]);

  const interactiveBarOptions = useMemo(() => createInteractiveChartOptions(options, selectedIdx, setSelectedIdx), [options, selectedIdx]);
  const interactivePieOptions = useMemo(() => createInteractivePieOptions(pieOptions, selectedIdx, setSelectedIdx), [pieOptions, selectedIdx]);

  const allRows = [
    { pIdx: 0, debGl: '101000', credGl: '602000', desc: 'Cash vs Depreciation Pairing', lines: exCounts.ex12, exp: 4200000, risk: 'High' },
    { pIdx: 1, debGl: '400100', credGl: '201000', desc: 'Revenue vs Accounts Payable', lines: 45, exp: 2100000, risk: 'High' },
    { pIdx: 2, debGl: '107500', credGl: '501200', desc: 'Inventory vs Exec Bonus', lines: 28, exp: 1400000, risk: 'Medium' },
    { pIdx: 3, debGl: '108000', credGl: '204000', desc: 'Prepaid Expenses vs Long-Term Debt', lines: 12, exp: 800000, risk: 'Low' },
  ];

  const filteredRows = useMemo(() => {
    if (selectedIdx === null) return allRows;
    return allRows.filter(r => r.pIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>How the Test Works</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>Identify transactions posted between unrelated financial statement account combinations. Click any slice or bar to filter anomalous combinations.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 10 - Unrelated Accounts Pairing Frequency {quarterFilter !== 'ALL' ? `[${quarterFilter}]` : ''}</h4>
            <span style={{ fontSize: '0.70rem', color: '#EF4444', fontWeight: 600 }}>Click column to filter</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><Bar data={barData} options={interactiveBarOptions} /></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '20px 22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Unrelated Pairing Exposure Distribution ($)</h4>
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
          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>Summary 10 - Unrelated Account Pairings Grid</h5>
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

interface Sheet11PopulationStatsProps {
  totalGlRows: number;
  options: any;
  pieOptions: any;
  fmtNum: (n: number) => string;
  fmtCurr: (n: number) => string;
  quarterFilter?: string;
}

const Sheet11PopulationStats = ({ totalGlRows, options, pieOptions, fmtNum, fmtCurr, quarterFilter = 'ALL' }: Sheet11PopulationStatsProps): React.ReactElement => {
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
        { label: 'Standard Entries', data: [3800, 3500, 4200, 3700, 3900, 4600, 4000, 4200, 5100, 3900, 3700, 6400], backgroundColor: getHighlightColors(baseColors, selectedIdx), borderRadius: 3 },
        { label: 'Non-Standard Entries', data: [400, 400, 600, 400, 400, 600, 400, 400, 1000, 400, 400, 2000], backgroundColor: selectedIdx !== null ? '#BAE6FD33' : '#BAE6FD', borderColor: '#0284C7', borderWidth: 1, borderRadius: 3 }
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
    return allRows.filter(r => r.pIdx === selectedIdx);
  }, [selectedIdx, allRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ background: '#F0F9FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E0F2FE', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Info size={16} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369A1', margin: '0 0 2px' }}>Population Statistics: Period-Wise Analysis</h4>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
            Period-wise distribution of journal entry volumes, local currency debit/credit sums, and standard vs. non-standard classifications. Click any period column to filter table records.
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

export default ExecutiveChartJsAnalyticsSuite;

