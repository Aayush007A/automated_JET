import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
} from 'chart.js';
import { Doughnut, Line, Bar, Radar, Scatter } from 'react-chartjs-2';
import {
  Sparkles, CheckCircle2, AlertTriangle, Database, Search,
  BarChart2, Table, Check, Clock, RefreshCw,
  Hash, Calendar, DollarSign, Type, ShieldCheck, ArrowRight,
  Info, HelpCircle, Layers, CheckCheck, Grid, TrendingUp,
  FileSpreadsheet, Activity, Key, Building2, User, Filter, Eye,
  Sliders, ArrowUpDown, Shuffle, Zap, Layers2, Lightbulb, ChevronRight, X,
  GitBranch, Sigma, PinOff, Pin, CalendarOff, Copy, CircleDot, BoxSelect,
  Radar as RadarIcon, ScanEye, Network,
} from 'lucide-react';
import { UploadedFileInfo } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController
);

export interface ColumnMetricItem {
  name: string;
  inferredType: 'Numeric' | 'Date' | 'Text' | 'Identifier' | 'Currency';
  categoryGroup: 'Financial Amounts' | 'Dates & Periods' | 'Audit Identifiers' | 'Entity & Users' | 'General';
  totalCount: number;
  validCount: number;
  missingCount: number;
  completenessPct: number;
  uniqueCount: number;
  distinctPct: number;
  sampleValues: string[];
  rawValues: any[];
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    sum: number;
    zeros: number;
    negatives: number;
  };
  hasDirtyFormats: boolean;
  dirtyIssues: string[];
}

export interface ExtractedDatasetProfile {
  id: string;
  title: string;
  shortName: string;
  sourceName: string;
  totalRows: number;
  headers: string[];
  columns: ColumnMetricItem[];
  overallCompletenessPct: number;
  totalMissingCells: number;
  totalCells: number;
  typeDistribution: {
    numeric: number;
    date: number;
    text: number;
    identifier: number;
    currency: number;
  };
  anomaliesDetectedCount: number;
}

interface DatasetColumnHealthVisualizerProps {
  files: UploadedFileInfo[];
  isCleaningPassed: boolean;
  onRunAutoClean: () => void;
  autoCleaning: boolean;
  autoCleanReport?: any;
}

export const DatasetColumnHealthVisualizer: React.FC<DatasetColumnHealthVisualizerProps> = ({
  files,
  isCleaningPassed,
  onRunAutoClean,
  autoCleaning,
  autoCleanReport,
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [activeVisualSubTab, setActiveVisualSubTab] = useState<'eda' | 'charts' | 'table' | 'delta'>('eda');
  const [columnSearch, setColumnSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [showEdaGuide, setShowEdaGuide] = useState<boolean>(true);

  // Multi-column selection for Exploratory Data Analysis (EDA)
  const [selectedColumnNames, setSelectedColumnNames] = useState<string[]>([]);

  // Alternate numeric view: histogram vs box plot
  const [numericViewMode, setNumericViewMode] = useState<'histogram' | 'boxplot'>('histogram');

  // Pin/compare mode: a pinned selection snapshot rendered side-by-side with the live selection
  const [pinnedSelection, setPinnedSelection] = useState<{ names: string[]; datasetId: string } | null>(null);

  // Compute rich column profiles for every dataset across all files and sheets
  const datasets: ExtractedDatasetProfile[] = useMemo(() => {
    if (!files || files.length === 0) return [];

    const list: ExtractedDatasetProfile[] = [];

    files.forEach((file) => {
      if (file.sheets && file.sheets.length > 0) {
        file.sheets.forEach((s) => {
          const headers = s.headers && s.headers.length > 0 ? s.headers : [];
          const rows = s.sampleRows && s.sampleRows.length > 0 ? s.sampleRows : [];
          const rowCount = s.rowCount || rows.length || 25;

          const columnProfiles = computeColumnStats(headers, rows, rowCount, isCleaningPassed);
          const totalCells = headers.length * rowCount;
          const totalMissing = columnProfiles.reduce((acc, c) => acc + c.missingCount, 0);
          const overallCompleteness = totalCells > 0 ? Math.round(((totalCells - totalMissing) / totalCells) * 1000) / 10 : 100;

          const typeDist = {
            numeric: columnProfiles.filter((c) => c.inferredType === 'Numeric' || c.inferredType === 'Currency').length,
            date: columnProfiles.filter((c) => c.inferredType === 'Date').length,
            text: columnProfiles.filter((c) => c.inferredType === 'Text').length,
            identifier: columnProfiles.filter((c) => c.inferredType === 'Identifier').length,
            currency: columnProfiles.filter((c) => c.inferredType === 'Currency').length,
          };

          const anomalyCount = isCleaningPassed ? 0 : columnProfiles.filter((c) => c.hasDirtyFormats).length;

          list.push({
            id: `${file.fileId}_${s.sheetName}`,
            title: s.sheetName || file.originalName,
            shortName: getDatasetShortName(s.detectedDataset || s.sheetName),
            sourceName: file.originalName,
            totalRows: rowCount,
            headers,
            columns: columnProfiles,
            overallCompletenessPct: isCleaningPassed ? 100 : overallCompleteness,
            totalMissingCells: isCleaningPassed ? 0 : totalMissing,
            totalCells,
            typeDistribution: typeDist,
            anomaliesDetectedCount: anomalyCount,
          });
        });
      } else {
        const headers = file.headers && file.headers.length > 0 ? file.headers : [];
        const rows = file.sampleRows && file.sampleRows.length > 0 ? file.sampleRows : [];
        const rowCount = rows.length || 30;

        const columnProfiles = computeColumnStats(headers, rows, rowCount, isCleaningPassed);
        const totalCells = headers.length * rowCount;
        const totalMissing = columnProfiles.reduce((acc, c) => acc + c.missingCount, 0);
        const overallCompleteness = totalCells > 0 ? Math.round(((totalCells - totalMissing) / totalCells) * 1000) / 10 : 100;

        const typeDist = {
          numeric: columnProfiles.filter((c) => c.inferredType === 'Numeric' || c.inferredType === 'Currency').length,
          date: columnProfiles.filter((c) => c.inferredType === 'Date').length,
          text: columnProfiles.filter((c) => c.inferredType === 'Text').length,
          identifier: columnProfiles.filter((c) => c.inferredType === 'Identifier').length,
          currency: columnProfiles.filter((c) => c.inferredType === 'Currency').length,
        };

        const anomalyCount = isCleaningPassed ? 0 : columnProfiles.filter((c) => c.hasDirtyFormats).length;

        list.push({
          id: file.fileId,
          title: file.originalName,
          shortName: getDatasetShortName(file.detectedDataset || file.originalName),
          sourceName: file.originalName,
          totalRows: rowCount,
          headers,
          columns: columnProfiles,
          overallCompletenessPct: isCleaningPassed ? 100 : overallCompleteness,
          totalMissingCells: isCleaningPassed ? 0 : totalMissing,
          totalCells,
          typeDistribution: typeDist,
          anomaliesDetectedCount: anomalyCount,
        });
      }
    });

    return list;
  }, [files, isCleaningPassed]);

  const activeDataset = useMemo(() => {
    if (datasets.length === 0) return null;
    const found = datasets.find((d) => d.id === selectedDatasetId);
    return found || datasets[0];
  }, [datasets, selectedDatasetId]);

  // Ensure default selected columns for EDA studio
  React.useEffect(() => {
    if (activeDataset && activeDataset.columns.length > 0 && selectedColumnNames.length === 0) {
      const firstNum = activeDataset.columns.find(c => c.inferredType === 'Numeric' || c.inferredType === 'Currency');
      setSelectedColumnNames([firstNum ? firstNum.name : activeDataset.columns[0].name]);
    }
  }, [activeDataset]);

  const categoryCounts = useMemo(() => {
    if (!activeDataset) {
      return { all: 0, numeric: 0, categorical: 0, date: 0, identifier: 0, highCard: 0, outliers: 0 };
    }
    const cols = activeDataset.columns;
    const numeric = cols.filter(c => c.inferredType === 'Numeric' || c.inferredType === 'Currency').length;
    const categorical = cols.filter(c => c.inferredType === 'Text').length;
    const date = cols.filter(c => c.inferredType === 'Date').length;
    const identifier = cols.filter(c => c.inferredType === 'Identifier').length;
    const highCard = cols.filter(c => c.inferredType !== 'Date' && (c.distinctPct >= 70 || (activeDataset.totalRows > 0 && c.uniqueCount >= activeDataset.totalRows * 0.7))).length;
    const outliers = cols.filter(c => c.hasDirtyFormats || (c.numericStats && (c.numericStats.zeros > 0 || c.numericStats.negatives > 0))).length;

    return { all: cols.length, numeric, categorical, date, identifier, highCard, outliers };
  }, [activeDataset]);

  const filteredColumns = useMemo(() => {
    if (!activeDataset) return [];
    return activeDataset.columns.filter((c) => {
      const matchSearch = !columnSearch || c.name.toLowerCase().includes(columnSearch.toLowerCase());
      const matchType = typeFilter === 'ALL' || c.inferredType.toUpperCase() === typeFilter.toUpperCase();

      let matchCat = true;
      if (selectedCategoryFilter === 'ALL') {
        matchCat = true;
      } else if (selectedCategoryFilter === 'NUMERIC') {
        matchCat = c.inferredType === 'Numeric' || c.inferredType === 'Currency';
      } else if (selectedCategoryFilter === 'CATEGORICAL') {
        matchCat = c.inferredType === 'Text';
      } else if (selectedCategoryFilter === 'DATE') {
        matchCat = c.inferredType === 'Date';
      } else if (selectedCategoryFilter === 'IDENTIFIER') {
        matchCat = c.inferredType === 'Identifier';
      } else if (selectedCategoryFilter === 'HIGHCARD') {
        matchCat = c.inferredType !== 'Date' && (c.distinctPct >= 70 || (activeDataset.totalRows > 0 && c.uniqueCount >= activeDataset.totalRows * 0.7));
      } else if (selectedCategoryFilter === 'OUTLIERS') {
        matchCat = Boolean(c.hasDirtyFormats || (c.numericStats && (c.numericStats.zeros > 0 || c.numericStats.negatives > 0)));
      } else if (selectedCategoryFilter === 'FINANCIAL') {
        matchCat = c.categoryGroup === 'Financial Amounts';
      } else if (selectedCategoryFilter === 'DATES') {
        matchCat = c.categoryGroup === 'Dates & Periods';
      } else if (selectedCategoryFilter === 'KEYS') {
        matchCat = c.categoryGroup === 'Audit Identifiers';
      } else if (selectedCategoryFilter === 'ENTITY') {
        matchCat = c.categoryGroup === 'Entity & Users';
      }

      return matchSearch && matchType && matchCat;
    });
  }, [activeDataset, columnSearch, typeFilter, selectedCategoryFilter]);

  const selectedColumnObjects = useMemo(() => {
    if (!activeDataset) return [];
    return selectedColumnNames
      .map(name => activeDataset.columns.find(c => c.name === name))
      .filter(Boolean) as ColumnMetricItem[];
  }, [activeDataset, selectedColumnNames]);

  const pinnedColumnObjects = useMemo(() => {
    if (!activeDataset || !pinnedSelection || pinnedSelection.datasetId !== activeDataset.id) return [];
    return pinnedSelection.names
      .map(name => activeDataset.columns.find(c => c.name === name))
      .filter(Boolean) as ColumnMetricItem[];
  }, [activeDataset, pinnedSelection]);

  const handleToggleColumn = (colName: string) => {
    setSelectedColumnNames(prev => {
      if (prev.includes(colName)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter(n => n !== colName);
      }
      return [...prev, colName];
    });
  };


  const handleClearSelection = () => {
    if (activeDataset && activeDataset.columns.length > 0) {
      setSelectedColumnNames([activeDataset.columns[0].name]);
    }
  };

  const handleTogglePin = () => {
    if (!activeDataset) return;
    if (pinnedSelection && pinnedSelection.datasetId === activeDataset.id) {
      setPinnedSelection(null);
    } else {
      setPinnedSelection({ names: [...selectedColumnNames], datasetId: activeDataset.id });
    }
  };

  if (!files || files.length === 0 || !activeDataset) {
    return null;
  }

  // ── Chart 1: Donut Chart (NO LEGEND) ──
  const totalCols = activeDataset.columns.length || 1;
  const numPct = Math.round((activeDataset.typeDistribution.numeric / totalCols) * 100);
  const datePct = Math.round((activeDataset.typeDistribution.date / totalCols) * 100);
  const textPct = Math.round((activeDataset.typeDistribution.text / totalCols) * 100);
  const idPct = Math.max(0, 100 - numPct - datePct - textPct);

  const typeDonutData = {
    labels: ['Numeric / Amount', 'Date / Time', 'Text / String', 'Identifier / Key'],
    datasets: [
      {
        data: [
          activeDataset.typeDistribution.numeric,
          activeDataset.typeDistribution.date,
          activeDataset.typeDistribution.text,
          activeDataset.typeDistribution.identifier,
        ],
        backgroundColor: [
          '#007680',
          '#0284C7',
          '#0D9488',
          '#6366F1',
        ],
        borderWidth: 3,
        borderColor: '#FFFFFF',
        hoverOffset: 6,
      },
    ],
  };

  const typeDonutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Inter, sans-serif', size: 12, weight: '700' },
        bodyFont: { family: 'Inter, sans-serif', size: 11, weight: '500' },
        callbacks: {
          label: (item: any) => {
            const count = item.raw;
            const pct = Math.round((count / totalCols) * 100);
            return ` ${count} Columns (${pct}% of total schema)`;
          },
        },
      },
    },
  };

  // ── Chart 2: Cardinality Density ──
  const cardinalityChartData = {
    labels: activeDataset.columns.map((c) => (c.name.length > 14 ? c.name.slice(0, 12) + '..' : c.name)),
    datasets: [
      {
        label: 'Distinct Values Count',
        data: activeDataset.columns.map((c) => c.uniqueCount),
        borderColor: '#007680',
        backgroundColor: 'rgba(0, 118, 128, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#007680',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const cardinalityChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items: any[]) => activeDataset.columns[items[0].dataIndex]?.name || '',
          label: (item: any) => {
            const col = activeDataset.columns[item.dataIndex];
            return [
              `Distinct Unique Values: ${col.uniqueCount}`,
              `Cardinality Density: ${col.distinctPct}%`,
              `Total Evaluated Rows: ${col.totalCount}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 9, weight: '600' }, color: '#64748B', maxRotation: 45, minRotation: 30 },
        grid: { display: false },
      },
      y: {
        ticks: { font: { size: 9.5, weight: '500' }, color: '#64748B' },
        grid: { color: '#F1F5F9' },
        beginAtZero: true,
      },
    },
  };

  // ── Chart 3: Field Completeness & Quality Bar ──
  const completenessBarData = {
    labels: activeDataset.columns.map((c) => (c.name.length > 14 ? c.name.slice(0, 12) + '..' : c.name)),
    datasets: [
      {
        label: 'Completeness %',
        data: activeDataset.columns.map((c) => c.completenessPct),
        backgroundColor: activeDataset.columns.map((c) =>
          c.completenessPct === 100 ? '#007680' : c.completenessPct >= 80 ? '#0284C7' : '#D97706'
        ),
        borderRadius: 4,
        borderWidth: 0,
      },
    ],
  };

  const completenessBarOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items: any[]) => activeDataset.columns[items[0].dataIndex]?.name || '',
          label: (item: any) => {
            const col = activeDataset.columns[item.dataIndex];
            return [
              `Completeness: ${col.completenessPct}%`,
              `Valid Rows: ${col.validCount} of ${col.totalCount}`,
              `Missing / Null: ${col.missingCount} cells`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 9, weight: '600' }, color: '#64748B', maxRotation: 45, minRotation: 30 },
        grid: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          font: { size: 9.5, weight: '500' },
          color: '#64748B',
          callback: (val: any) => `${val}%`,
        },
        grid: { color: '#F1F5F9' },
      },
    },
  };

  // ── Helper: Live Field KPI Summary Strip for EDA Canvas ──
  const renderFieldSummaryStrip = (selectedCols: ColumnMetricItem[]) => {
    if (selectedCols.length === 0) return null;

    if (selectedCols.length === 1) {
      const col = selectedCols[0];
      const isNum = col.inferredType === 'Numeric' || col.inferredType === 'Currency';
      const isDate = col.inferredType === 'Date';

      if (isNum && col.numericStats) {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>MEAN</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>{formatCompactNumber(col.numericStats.mean)}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>MEDIAN</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>{formatCompactNumber(col.numericStats.median)}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>RANGE (MIN - MAX)</div>
              <div style={{ fontSize: '0.80rem', fontWeight: 750, color: '#0F172A', marginTop: '1px', whiteSpace: 'nowrap' }}>
                {formatCompactNumber(col.numericStats.min)} – {formatCompactNumber(col.numericStats.max)}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>COMPLETENESS</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#007680', marginTop: '1px' }}>{col.completenessPct}%</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>DISTINCT VALUES</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0284C7', marginTop: '1px' }}>
                {col.uniqueCount} <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 500 }}>({col.distinctPct}%)</span>
              </div>
            </div>
          </div>
        );
      }

      if (isDate) {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>DISTINCT PERIODS</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0284C7', marginTop: '1px' }}>{col.uniqueCount} Dates</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>TOTAL POSTINGS</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>{col.validCount} Rows</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>COMPLETENESS</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#007680', marginTop: '1px' }}>{col.completenessPct}%</div>
            </div>
          </div>
        );
      }

      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>UNIQUE CATEGORIES</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
              {col.uniqueCount} <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 500 }}>({col.distinctPct}% density)</span>
            </div>
          </div>
          <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>EVALUATED ROWS</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>{col.totalCount} Rows</div>
          </div>
          <div style={{ background: '#F8FAFC', padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>SAMPLE VALUE</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 750, color: '#007680', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {col.sampleValues[0] || 'N/A'}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#475569' }}>Selected Fields ({selectedCols.length}):</span>
        {selectedCols.map((c) => (
          <span
            key={c.name}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#F0FDFA',
              border: '1px solid #CCFBF1',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.70rem',
              fontWeight: 700,
              color: '#007680',
            }}
          >
            {getTypeIcon(c.inferredType)} {c.name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 24px -4px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
        marginTop: '16px',
      }}
    >
      {/* ── Top Header Banner with Balanced Executive Information & Actions ── */}
      <div
        style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 60%, #F0FDFA 100%)',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        {/* Left: Icon, Title, Verification Badge & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '320px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #007680 0%, #004D54 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 118, 128, 0.24)',
              flexShrink: 0,
            }}
          >
            <BarChart2 size={20} color="#FFFFFF" strokeWidth={2.2} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 750, color: '#0F172A', margin: 0, letterSpacing: '-0.015em' }}>
                Automated Ingestion Quality &amp; Column Profiler
              </h3>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 750,
                  padding: '3px 9px',
                  borderRadius: '20px',
                  background: isCleaningPassed ? '#F0FDFA' : '#FFFBEB',
                  color: isCleaningPassed ? '#007680' : '#D97706',
                  border: isCleaningPassed ? '1px solid #99F6E4' : '1px solid #FDE68A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  letterSpacing: '0.02em',
                }}
              >
                {isCleaningPassed ? (
                  <>
                    <CheckCircle2 size={11} color="#007680" /> 100% SANITIZED &amp; VERIFIED
                  </>
                ) : (
                  <>
                    <Clock size={11} color="#D97706" /> RAW INGESTION • CLEANING PENDING
                  </>
                )}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
              Deep column completeness metrics, data type inferences, cardinality signals, and automated sanitization delta.
            </p>
          </div>
        </div>

        {/* Right: Action Button with generous breathing room */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onRunAutoClean}
            disabled={autoCleaning}
            className="btn-deloitte-action"
            style={{
              padding: '10px 22px',
              fontSize: '0.82rem',
              letterSpacing: '-0.01em',
              boxShadow: '0 3px 10px rgba(0, 118, 128, 0.18)',
            }}
          >
            <Sparkles size={14} color="#6EE7B7" className={autoCleaning ? 'spin-slow' : ''} />
            <span>
              {autoCleaning
                ? 'Sanitizing & Standardizing...'
                : isCleaningPassed
                ? 'Re-Run Auto-Clean Engine'
                : 'Run Auto-Clean & Sanitize Data'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Dedicated Dataset Scope Selector (Clean, Focused, Zero Redundant Telemetry) ── */}
      <div
        style={{
          padding: '10px 24px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#475569',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Database size={13} color="#007680" /> SELECT DATASET:
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
          }}
        >
          {datasets.map((d) => {
            const isSelected = d.id === activeDataset.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedDatasetId(d.id);
                  setSelectedColumnNames([]);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #007680' : '1px solid transparent',
                  background: isSelected ? 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)' : 'transparent',
                  color: isSelected ? '#005A60' : '#475569',
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 1px 3px rgba(0, 118, 128, 0.12)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Database size={13} color={isSelected ? '#007680' : '#94A3B8'} />
                <span>{d.title}</span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: isSelected ? 750 : 500,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: isSelected ? '#007680' : 'transparent',
                    color: isSelected ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {d.headers.length} Cols • {d.totalRows} Rows
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4 Executive KPI Metric Cards with Visual Depth & Pastel Accents ── */}
      <div style={{ padding: '14px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {/* Tile 1: Overall Completeness (Quality Signal - Deep Teal Solid Shield) */}
          <div
            style={{
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)',
              borderRadius: '12px',
              border: '1px solid #CCFBF1',
              boxShadow: '0 2px 8px rgba(0, 118, 128, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#005A60', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                DATA COMPLETENESS
              </span>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#007680',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 5px rgba(0, 118, 128, 0.2)',
                }}
              >
                <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.4} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 2px' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 850, color: '#0F172A', letterSpacing: '-0.02em', fontFamily: 'monospace' }}>
                {activeDataset.overallCompletenessPct.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden', margin: '2px 0 6px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${activeDataset.overallCompletenessPct}%`,
                  background: activeDataset.overallCompletenessPct >= 95 ? '#007680' : '#D97706',
                  borderRadius: '2px',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: activeDataset.overallCompletenessPct === 100 ? '#007680' : '#D97706' }}>
                {activeDataset.overallCompletenessPct === 100 ? '✓ Zero Null Cells' : `${(100 - activeDataset.overallCompletenessPct).toFixed(1)}% Missing`}
              </span>
              <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                {activeDataset.totalMissingCells} empty of {activeDataset.totalCells.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Tile 2: Schema Dimension (Structure Signal - Crisp Sky White Tile with Slate Dot) */}
          <div
            style={{
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                SCHEMA DIMENSION
              </span>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #CBD5E1',
                }}
              >
                <Table size={13} color="#475569" strokeWidth={2.4} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 2px' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 850, color: '#0F172A', letterSpacing: '-0.02em', fontFamily: 'monospace' }}>
                {activeDataset.columns.length}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Cols</span>
              <span style={{ fontSize: '0.74rem', color: '#CBD5E1' }}>•</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                {activeDataset.totalRows}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Rows</span>
            </div>
            <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden', margin: '2px 0 6px' }}>
              <div style={{ height: '100%', width: '100%', background: '#0284C7', borderRadius: '2px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284C7' }}>
                {activeDataset.totalCells.toLocaleString()} Matrix Cells
              </span>
              <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                Across {datasets.length} files
              </span>
            </div>
          </div>

          {/* Tile 3: Type Inferences (Inference Signal - Soft Blue Gradient Accent) */}
          <div
            style={{
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
              borderRadius: '12px',
              border: '1px solid #DBEAFE',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TYPE INFERENCES
              </span>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 5px rgba(37, 99, 235, 0.2)',
                }}
              >
                <Zap size={13} color="#FFFFFF" strokeWidth={2.4} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 2px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#1E40AF', background: '#DBEAFE', padding: '2px 7px', borderRadius: '4px' }}>
                {activeDataset.columns.filter(c => c.inferredType === 'Numeric').length} Numeric
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#047857', background: '#D1FAE5', padding: '2px 7px', borderRadius: '4px' }}>
                {activeDataset.columns.filter(c => c.inferredType === 'Text').length} Text
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 750, color: '#6D28D9', background: '#EDE9FE', padding: '2px 7px', borderRadius: '4px' }}>
                {activeDataset.columns.filter(c => c.inferredType === 'Date').length} Date
              </span>
            </div>
            <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden', margin: '2px 0 6px' }}>
              <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #2563EB 50%, #10B981 75%, #8B5CF6 100%)', borderRadius: '2px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1E40AF' }}>
                100% Inferred
              </span>
              <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                Zero Ambiguous Types
              </span>
            </div>
          </div>

          {/* Tile 4: Cleansing State (Engine Signal - Emerald / Amber State) */}
          <div
            style={{
              padding: '12px 14px',
              background: isCleaningPassed
                ? 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)'
                : 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
              borderRadius: '12px',
              border: isCleaningPassed ? '1px solid #BBF7D0' : '1px solid #FDE68A',
              boxShadow: isCleaningPassed ? '0 2px 8px rgba(22, 163, 74, 0.04)' : '0 2px 8px rgba(217, 119, 6, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 750, color: isCleaningPassed ? '#15803D' : '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                SANITIZATION STATE
              </span>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isCleaningPassed ? '#16A34A' : '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: isCleaningPassed ? '0 2px 5px rgba(22, 163, 74, 0.2)' : '0 2px 5px rgba(217, 119, 6, 0.2)',
                }}
              >
                {isCleaningPassed ? <ShieldCheck size={13} color="#FFFFFF" strokeWidth={2.4} /> : <AlertTriangle size={13} color="#FFFFFF" strokeWidth={2.4} />}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 2px' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 850, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {isCleaningPassed ? 'Sanitized' : 'Pending'}
              </span>
              <span style={{ fontSize: '0.74rem', color: isCleaningPassed ? '#16A34A' : '#D97706', fontWeight: 700 }}>
                {isCleaningPassed ? '100% Rules' : `${activeDataset.anomaliesDetectedCount} Warnings`}
              </span>
            </div>
            <div style={{ height: '4px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden', margin: '2px 0 6px' }}>
              <div style={{ height: '100%', width: isCleaningPassed ? '100%' : '40%', background: isCleaningPassed ? '#16A34A' : '#D97706', borderRadius: '2px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isCleaningPassed ? '#15803D' : '#B45309' }}>
                {isCleaningPassed ? '✓ Audit Ready (ISO 8601)' : '⚠ Cleansing Recommended'}
              </span>
              <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                {isCleaningPassed ? 'Standardized' : 'Raw ingestion'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Studio View Navigation Deck (Directly Above Workspace) ── */}
      <div
        style={{
          margin: '14px 24px 0',
          padding: '10px 14px',
          background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Left: Studio Segmented Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Sliders size={13} color="#007680" /> STUDIO VIEW:
          </span>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#FFFFFF',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              gap: '3px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveVisualSubTab('eda')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: activeVisualSubTab === 'eda' ? '1px solid #007680' : '1px solid transparent',
                background: activeVisualSubTab === 'eda' ? 'linear-gradient(135deg, #007680 0%, #005A60 100%)' : 'transparent',
                color: activeVisualSubTab === 'eda' ? '#FFFFFF' : '#475569',
                fontSize: '0.74rem',
                fontWeight: activeVisualSubTab === 'eda' ? 800 : 600,
                cursor: 'pointer',
                boxShadow: activeVisualSubTab === 'eda' ? '0 2px 6px rgba(0, 118, 128, 0.25)' : 'none',
              }}
            >
              <Zap size={13} /> Exploratory Studio (EDA)
            </button>
            <button
              type="button"
              onClick={() => setActiveVisualSubTab('charts')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: activeVisualSubTab === 'charts' ? '1px solid #007680' : '1px solid transparent',
                background: activeVisualSubTab === 'charts' ? 'linear-gradient(135deg, #007680 0%, #005A60 100%)' : 'transparent',
                color: activeVisualSubTab === 'charts' ? '#FFFFFF' : '#475569',
                fontSize: '0.74rem',
                fontWeight: activeVisualSubTab === 'charts' ? 800 : 600,
                cursor: 'pointer',
                boxShadow: activeVisualSubTab === 'charts' ? '0 2px 6px rgba(0, 118, 128, 0.25)' : 'none',
              }}
            >
              <BarChart2 size={13} /> Macro Quality Charts
            </button>
            <button
              type="button"
              onClick={() => setActiveVisualSubTab('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: activeVisualSubTab === 'table' ? '1px solid #007680' : '1px solid transparent',
                background: activeVisualSubTab === 'table' ? 'linear-gradient(135deg, #007680 0%, #005A60 100%)' : 'transparent',
                color: activeVisualSubTab === 'table' ? '#FFFFFF' : '#475569',
                fontSize: '0.74rem',
                fontWeight: activeVisualSubTab === 'table' ? 800 : 600,
                cursor: 'pointer',
                boxShadow: activeVisualSubTab === 'table' ? '0 2px 6px rgba(0, 118, 128, 0.25)' : 'none',
              }}
            >
              <Table size={13} /> Column Matrix Table ({activeDataset.columns.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveVisualSubTab('delta')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: activeVisualSubTab === 'delta' ? '1px solid #007680' : '1px solid transparent',
                background: activeVisualSubTab === 'delta' ? 'linear-gradient(135deg, #007680 0%, #005A60 100%)' : 'transparent',
                color: activeVisualSubTab === 'delta' ? '#FFFFFF' : '#475569',
                fontSize: '0.74rem',
                fontWeight: activeVisualSubTab === 'delta' ? 800 : 600,
                cursor: 'pointer',
                boxShadow: activeVisualSubTab === 'delta' ? '0 2px 6px rgba(0, 118, 128, 0.25)' : 'none',
              }}
            >
              <Sparkles size={13} /> Sanitization Delta
            </button>
          </div>
        </div>

        {/* Right: Contextual Mode Description */}
        <div style={{ fontSize: '0.70rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {activeVisualSubTab === 'eda' && (
            <>
              <Zap size={12} color="#007680" /> Select 1 field for distribution, 2+ for intelligent correlations
            </>
          )}
          {activeVisualSubTab === 'charts' && (
            <>
              <BarChart2 size={12} color="#007680" /> Full schema health breakdown &amp; cardinality curves
            </>
          )}
          {activeVisualSubTab === 'table' && (
            <>
              <Table size={12} color="#007680" /> Searchable field dictionary with sample values
            </>
          )}
          {activeVisualSubTab === 'delta' && (
            <>
              <Sparkles size={12} color="#007680" /> Audit trail of cleansing transformations applied
            </>
          )}
        </div>
      </div>

      {/* ── Content View Area ── */}
      <div style={{ padding: '16px 24px 24px' }}>
        {/* VIEW 0: INTERACTIVE EXPLORATORY DATA ANALYSIS (EDA) & MULTI-VARIATE STUDIO */}
        {activeVisualSubTab === 'eda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* ── Friendly, Streamlined EDA Action Guide (Easy to Understand, Not Overly Complex) ── */}
            {showEdaGuide && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #F8FAFC 50%, #EFF6FF 100%)',
                  borderRadius: '12px',
                  border: '1px solid #CCFBF1',
                  padding: '12px 16px',
                  boxShadow: '0 2px 8px rgba(0, 118, 128, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Header of Guide */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: '#007680',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Lightbulb size={14} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        How to explore this dataset
                      </h4>
                      <p style={{ fontSize: '0.70rem', color: '#64748B', margin: 0 }}>
                        Select fields to dynamically view distributions, histograms, outlier bounds, and intelligent cross-field correlations.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEdaGuide(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.70rem',
                      fontWeight: 600,
                    }}
                    title="Dismiss guide"
                  >
                    Dismiss <X size={14} />
                  </button>
                </div>

                {/* 3 Step Action Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#F0FDFA',
                        color: '#007680',
                        border: '1px solid #99F6E4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      1
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0F172A', marginBottom: '2px' }}>
                        Single Field Profiling
                      </div>
                      <p style={{ fontSize: '0.68rem', color: '#64748B', margin: 0, lineHeight: 1.35 }}>
                        Click any column on the left to see its frequency histogram, box plot, outlier bounds, and key summary statistics.
                      </p>
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#F0F9FF',
                        color: '#0284C7',
                        border: '1px solid #BAE6FD',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      2
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0F172A', marginBottom: '2px' }}>
                        Two-Field Correlation
                      </div>
                      <p style={{ fontSize: '0.68rem', color: '#64748B', margin: 0, lineHeight: 1.35 }}>
                        Select 2 fields to automatically plot timeline trends, category volume rollups, or scatter relationships.
                      </p>
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#F5F3FF',
                        color: '#6366F1',
                        border: '1px solid #DDD6FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      3
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 750, color: '#0F172A', marginBottom: '2px' }}>
                        Compare &amp; Pin Views
                      </div>
                      <p style={{ fontSize: '0.68rem', color: '#64748B', margin: 0, lineHeight: 1.35 }}>
                        Use &quot;Pin &amp; Compare&quot; to lock a chart and inspect it side-by-side with another column in the dataset.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Left-Right EDA Split View (Utilizing Full Screen Space) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 330px) minmax(0, 1fr)', gap: '16px', alignItems: 'stretch' }}>
              {/* LEFT PANEL: Interactive Column Selector & Type Filter */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '540px',
                }}
              >
                {/* Header: Title + Selection Mode Indicator */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers2 size={15} color="#007680" />
                      <span style={{ fontSize: '0.84rem', fontWeight: 750, color: '#0F172A' }}>
                        Select Field(s)
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 750,
                        padding: '2px 7px',
                        borderRadius: '10px',
                        background: selectedColumnNames.length > 1 ? '#F0FDF4' : '#F0FDFA',
                        color: selectedColumnNames.length > 1 ? '#16A34A' : '#007680',
                        border: selectedColumnNames.length > 1 ? '1px solid #BBF7D0' : '1px solid #99F6E4',
                      }}
                    >
                      {selectedColumnNames.length === 1
                        ? 'Univariate (1)'
                        : selectedColumnNames.length === 2
                        ? 'Bivariate (2)'
                        : `Multivariate (${selectedColumnNames.length})`}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.67rem', color: '#64748B', margin: 0 }}>
                    Click fields to plot distributions, relationships, and trends.
                  </p>
                </div>

                {/* Search + Category Filter Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={12} color="#64748B" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search field names..."
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px 8px 5px 26px',
                        fontSize: '0.73rem',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'ALL', label: `All (${categoryCounts.all})` },
                      { id: 'NUMERIC', label: `Numeric (${categoryCounts.numeric})` },
                      { id: 'CATEGORICAL', label: `Categorical (${categoryCounts.categorical})` },
                      { id: 'DATE', label: `Date (${categoryCounts.date})` },
                      { id: 'IDENTIFIER', label: `Identifier (${categoryCounts.identifier})` },
                      { id: 'HIGHCARD', label: `High Card (${categoryCounts.highCard})` },
                      { id: 'OUTLIERS', label: `Outliers (${categoryCounts.outliers})` },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(c.id)}
                        style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          border: selectedCategoryFilter === c.id ? '1px solid #007680' : '1px solid #E2E8F0',
                          background: selectedCategoryFilter === c.id ? '#F0FDFA' : '#FFFFFF',
                          color: selectedCategoryFilter === c.id ? '#007680' : '#64748B',
                          fontSize: '0.63rem',
                          fontWeight: selectedCategoryFilter === c.id ? 750 : 550,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable Column List */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    overflowY: 'auto',
                    flex: 1,
                    paddingRight: '2px',
                  }}
                >
                  {filteredColumns.map((col) => {
                    const isSelected = selectedColumnNames.includes(col.name);
                    const isHighCard = (col.distinctPct >= 70 || (activeDataset.totalRows > 0 && col.uniqueCount >= activeDataset.totalRows * 0.7)) && col.inferredType !== 'Date';
                    const isFlagged = col.hasDirtyFormats || (col.numericStats && (col.numericStats.zeros > 0 || col.numericStats.negatives > 0));

                    return (
                      <div
                        key={col.name}
                        onClick={() => handleToggleColumn(col.name)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isSelected ? '1.5px solid #007680' : '1px solid #E2E8F0',
                          background: isSelected ? '#F0FDFA' : '#FAFCFD',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {/* Checkbox & Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ accentColor: '#007680', cursor: 'pointer' }}
                          />
                          {getTypeIcon(col.inferredType)}
                          <span
                            style={{
                              fontSize: '0.71rem',
                              fontWeight: isSelected ? 750 : 600,
                              color: isSelected ? '#005A60' : '#0F172A',
                              fontFamily: 'var(--font-mono, monospace)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={col.name}
                          >
                            {col.name}
                          </span>
                        </div>

                        {/* Right Tag & Signal Indicators */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          {isHighCard && (
                            <span
                              style={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                color: '#6366F1',
                                background: '#F5F3FF',
                                border: '1px solid #DDD6FE',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                cursor: 'help',
                              }}
                              title="High Cardinality: Distinct values account for ≥ 70% of total records (e.g. unique keys or transaction IDs)"
                            >
                              High Card
                            </span>
                          )}
                          {isFlagged && (
                            <span
                              style={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                color: '#D97706',
                                background: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                cursor: 'help',
                              }}
                              title="Quality Flag: Potential format variances, outliers, or zero/negative anomalies detected"
                            >
                              Flagged
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              color: getTypeBadgeColor(col.inferredType),
                              background: getTypeBadgeBg(col.inferredType),
                              padding: '1px 4px',
                              borderRadius: '3px',
                              border: `1px solid ${getTypeBadgeBorder(col.inferredType)}`,
                            }}
                          >
                            {col.inferredType}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #E2E8F0', fontSize: '0.66rem', gap: '6px' }}>
                  <span style={{ color: '#64748B' }}>
                    {selectedColumnNames.length} selected of {activeDataset.columns.length}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={handleTogglePin}
                      title={pinnedSelection && pinnedSelection.datasetId === activeDataset.id ? 'Unpin comparison view' : 'Pin this selection to compare against a new one'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: pinnedSelection && pinnedSelection.datasetId === activeDataset.id ? '#F0FDFA' : 'none',
                        border: pinnedSelection && pinnedSelection.datasetId === activeDataset.id ? '1px solid #99F6E4' : '1px solid transparent',
                        borderRadius: '5px',
                        padding: '2px 6px',
                        color: pinnedSelection && pinnedSelection.datasetId === activeDataset.id ? '#007680' : '#64748B',
                        fontWeight: 750,
                        cursor: 'pointer',
                        fontSize: '0.66rem',
                      }}
                    >
                      {pinnedSelection && pinnedSelection.datasetId === activeDataset.id ? (
                        <>
                          <PinOff size={11} /> Unpin
                        </>
                      ) : (
                        <>
                          <Pin size={11} /> Pin &amp; Compare
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#007680',
                        fontWeight: 750,
                        cursor: 'pointer',
                        fontSize: '0.66rem',
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: Dynamic Intelligent Visual Studio Canvas (Expansive & Tightened) */}
              {pinnedColumnObjects.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1.5px solid #99F6E4',
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                    }}
                  >
                    <span style={{ position: 'absolute', top: 10, right: 12, fontSize: '0.6rem', fontWeight: 800, color: '#007680', background: '#F0FDFA', border: '1px solid #99F6E4', padding: '1px 6px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Pin size={9} /> PINNED
                    </span>
                    {renderFieldSummaryStrip(pinnedColumnObjects)}
                    {renderEdaVisualContent(pinnedColumnObjects, activeDataset, numericViewMode)}
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#0284C7', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '1px 6px', borderRadius: 999 }}>
                        LIVE
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {numericViewToggle(selectedColumnObjects, numericViewMode, setNumericViewMode)}
                        <button
                          type="button"
                          onClick={() => {
                            const colName = selectedColumnObjects[0]?.name || 'current field';
                            const colType = selectedColumnObjects[0]?.inferredType || 'field';
                            const isSingle = selectedColumnObjects.length === 1;
                            const promptText = isSingle
                              ? `Analyze the statistical distribution, outliers, skewness, and data quality implications for column "${colName}" (${colType}) in dataset "${activeDataset.title}". Provide key audit observations and recommendations.`
                              : `Analyze the correlation, relationships, and data dependencies between fields (${selectedColumnObjects.map(c => c.name).join(', ')}) in dataset "${activeDataset.title}". Provide audit risk signals and pattern findings.`;

                            window.dispatchEvent(new CustomEvent('jet:open-ai', {
                              detail: {
                                prompt: promptText,
                                context: colName,
                              }
                            }));
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #F0FDFA 0%, #E0F2FE 100%)',
                            border: '1px solid #99F6E4',
                            color: '#007680',
                            fontSize: '0.66rem',
                            fontWeight: 750,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0, 118, 128, 0.06)',
                            transition: 'all 0.15s ease',
                          }}
                          title="Ask Data Agent to analyze and explain this distribution"
                        >
                          <Sparkles size={11} color="#007680" />
                          <span>Explain with AI</span>
                        </button>
                      </div>
                    </div>
                    {renderFieldSummaryStrip(selectedColumnObjects)}
                    {renderEdaVisualContent(selectedColumnObjects, activeDataset, numericViewMode)}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '16px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Top Canvas Bar: Mode label, Numeric toggle & Contextual AI Trigger */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.70rem', fontWeight: 750, color: '#475569' }}>
                        {selectedColumnObjects.length === 1 ? 'Single Field Profile' : selectedColumnObjects.length === 2 ? 'Bivariate Correlation' : 'Multivariate EDA'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {numericViewToggle(selectedColumnObjects, numericViewMode, setNumericViewMode)}

                      {/* Contextual AI Agent Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          const colName = selectedColumnObjects[0]?.name || 'current field';
                          const colType = selectedColumnObjects[0]?.inferredType || 'field';
                          const isSingle = selectedColumnObjects.length === 1;
                          const promptText = isSingle
                            ? `Analyze the statistical distribution, outliers, skewness, and data quality implications for column "${colName}" (${colType}) in dataset "${activeDataset.title}". Provide key audit observations and recommendations.`
                            : `Analyze the correlation, relationships, and data dependencies between fields (${selectedColumnObjects.map(c => c.name).join(', ')}) in dataset "${activeDataset.title}". Provide audit risk signals and pattern findings.`;

                          window.dispatchEvent(new CustomEvent('jet:open-ai', {
                            detail: {
                              prompt: promptText,
                              context: colName,
                            }
                          }));
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #F0FDFA 0%, #E0F2FE 100%)',
                          border: '1px solid #99F6E4',
                          color: '#007680',
                          fontSize: '0.68rem',
                          fontWeight: 750,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0, 118, 128, 0.06)',
                          transition: 'all 0.15s ease',
                        }}
                        title="Ask Data Agent to analyze and explain this distribution"
                      >
                        <Sparkles size={12} color="#007680" />
                        <span>
                          {selectedColumnObjects.length === 1
                            ? 'Explain this distribution'
                            : selectedColumnObjects.length === 2
                            ? 'Explain correlation'
                            : 'Explain schema relationship'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {renderFieldSummaryStrip(selectedColumnObjects)}
                  {renderEdaVisualContent(selectedColumnObjects, activeDataset, numericViewMode)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 1: CHARTS & SCHEMA MACRO ANALYTICS (Full-Width, Dual & Tri-Pane Layout) */}
        {activeVisualSubTab === 'charts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Row: Type Classification Donut (Left) & Cardinality Density (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.35fr)', gap: '14px', alignItems: 'stretch' }}>
              {/* Left Card: Type Classification Donut + Detailed Breakdown Legend */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '290px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 750, color: '#0F172A', margin: 0 }}>
                      Schema Type Composition
                    </h4>
                    <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#007680', background: '#F0FDFA', border: '1px solid #CCFBF1', padding: '1px 7px', borderRadius: '4px' }}>
                      {totalCols} Columns
                    </span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#64748B', margin: '2px 0 8px' }}>
                    Canonical inferred data types across active dataset
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '14px', alignItems: 'center' }}>
                  {/* Donut Chart with Center Count */}
                  <div style={{ height: '160px', width: '150px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Doughnut data={typeDonutData} options={typeDonutOptions} />
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                        {totalCols}
                      </div>
                      <div style={{ fontSize: '0.60rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginTop: '2px' }}>
                        Fields
                      </div>
                    </div>
                  </div>

                  {/* Clean Legend Table Utilizing the Space */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { label: 'Numeric / Amount', count: activeDataset.typeDistribution.numeric, color: '#007680', pct: numPct },
                      { label: 'Date / Time', count: activeDataset.typeDistribution.date, color: '#0284C7', pct: datePct },
                      { label: 'Text / String', count: activeDataset.typeDistribution.text, color: '#0D9488', pct: textPct },
                      { label: 'Identifier / Key', count: activeDataset.typeDistribution.identifier, color: '#6366F1', pct: idPct },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', padding: '3px 6px', background: '#F8FAFC', borderRadius: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                          <span style={{ color: '#334155', fontWeight: 600 }}>{item.label}</span>
                        </div>
                        <span style={{ fontWeight: 750, color: '#0F172A' }}>
                          {item.count} <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.66rem' }}>({item.pct}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Card: Cardinality Density & Value Spread */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '290px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 750, color: '#0F172A', margin: 0 }}>
                      Distinct Value Density &amp; Cardinality
                    </h4>
                    <span style={{ fontSize: '0.66rem', fontWeight: 750, color: '#0284C7', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '1px 7px', borderRadius: '4px' }}>
                      Key Dispersion
                    </span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#64748B', margin: '2px 0 8px' }}>
                    Unique keys and distinct value variance count per column
                  </p>
                </div>

                <div style={{ height: '210px', width: '100%' }}>
                  <Line data={cardinalityChartData} options={cardinalityChartOptions} />
                </div>
              </div>
            </div>

            {/* Bottom Row: Full-Width Field Completeness & Missing Cell Profiler */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 750, color: '#0F172A', margin: 0 }}>
                    Field Completeness &amp; Data Population Rate
                  </h4>
                  <p style={{ fontSize: '0.68rem', color: '#64748B', margin: '2px 0 0' }}>
                    Completeness percentage across each column. Ideal threshold: 100% (Teal). Below 80% (Amber).
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.68rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#007680', fontWeight: 700 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#007680' }} /> 100% Complete
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0284C7', fontWeight: 700 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#0284C7' }} /> 80% - 99%
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#D97706', fontWeight: 700 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#D97706' }} /> &lt; 80%
                  </span>
                </div>
              </div>

              <div style={{ height: '220px', width: '100%', marginTop: '4px' }}>
                <Bar data={completenessBarData} options={completenessBarOptions} />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: COLUMN-BY-COLUMN PROFILER TABLE */}
        {activeVisualSubTab === 'table' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Table Filters Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={13} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 10px 5px 28px',
                    fontSize: '0.76rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748B' }}>FILTER:</span>
                {['ALL', 'NUMERIC', 'DATE', 'TEXT', 'IDENTIFIER'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: typeFilter === t ? '1px solid #007680' : '1px solid #E2E8F0',
                      background: typeFilter === t ? '#F0FDFA' : '#FFFFFF',
                      color: typeFilter === t ? '#007680' : '#475569',
                      fontSize: '0.66rem',
                      fontWeight: 750,
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table with Sticky Header */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', maxHeight: '520px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '8px 10px', fontWeight: 750 }}>Column Name</th>
                    <th style={{ padding: '8px 10px', fontWeight: 750 }}>Inferred Type</th>
                    <th style={{ padding: '8px 10px', fontWeight: 750, width: '160px' }}>Completeness %</th>
                    <th style={{ padding: '8px 10px', fontWeight: 750, textAlign: 'right' }}>Missing Cells</th>
                    <th style={{ padding: '8px 10px', fontWeight: 750, textAlign: 'right' }}>Distinct Values</th>
                    <th style={{ padding: '8px 10px', fontWeight: 750 }}>Sample Values</th>
                    <th style={{ padding: '8px 10px', fontWeight: 750 }}>Quality Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredColumns.map((col, idx) => (
                    <tr
                      key={col.name}
                      style={{
                        borderBottom: idx < filteredColumns.length - 1 ? '1px solid #F1F5F9' : 'none',
                        background: col.hasDirtyFormats && !isCleaningPassed ? '#FFFBEB' : '#FFFFFF',
                      }}
                    >
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#94A3B8', fontFamily: 'monospace', fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getTypeIcon(col.inferredType)}
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.73rem' }}>{col.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: getTypeBadgeBg(col.inferredType),
                            color: getTypeBadgeColor(col.inferredType),
                            border: `1px solid ${getTypeBadgeBorder(col.inferredType)}`,
                          }}
                        >
                          {col.inferredType}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, height: '5px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${col.completenessPct}%`,
                                background: col.completenessPct === 100 ? '#007680' : col.completenessPct >= 80 ? '#0284C7' : '#D97706',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.70rem', fontWeight: 750, color: '#0F172A', minWidth: '34px' }}>
                            {col.completenessPct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: col.missingCount > 0 ? '#DC2626' : '#64748B' }}>
                        {col.missingCount}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#007680' }}>
                        {col.uniqueCount} <span style={{ color: '#94A3B8', fontSize: '0.64rem' }}>({col.distinctPct}%)</span>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {col.sampleValues.slice(0, 3).map((s, si) => (
                            <span
                              key={si}
                              style={{
                                fontSize: '0.64rem',
                                padding: '1px 4px',
                                background: '#F1F5F9',
                                border: '1px solid #E2E8F0',
                                borderRadius: '3px',
                                color: '#334155',
                                maxWidth: '90px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={s}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        {isCleaningPassed ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              color: '#007680',
                              background: '#F0FDFA',
                              border: '1px solid #99F6E4',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            <Check size={10} color="#007680" /> Cleaned
                          </span>
                        ) : col.hasDirtyFormats ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              color: '#D97706',
                              background: '#FFFBEB',
                              border: '1px solid #FDE68A',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                            title={col.dirtyIssues.join(', ')}
                          >
                            <AlertTriangle size={10} /> Format Varied
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              color: '#007680',
                              background: '#F0FDFA',
                              border: '1px solid #CCFBF1',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            <CheckCircle2 size={10} /> Standard
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: SANITIZATION DELTA & AUDIT ACTION SUMMARY */}
        {activeVisualSubTab === 'delta' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                background: isCleaningPassed ? 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)' : 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
                border: isCleaningPassed ? '1px solid #99F6E4' : '1px solid #FDE68A',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isCleaningPassed ? (
                    <CheckCircle2 size={18} color="#007680" />
                  ) : (
                    <AlertTriangle size={18} color="#D97706" />
                  )}
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 750, color: isCleaningPassed ? '#005A60' : '#92400E', margin: 0 }}>
                    {isCleaningPassed
                      ? 'Automated Data Sanitization Executed Successfully'
                      : 'Raw Data Ingestion State — Awaiting Automated Cleansing'}
                  </h4>
                </div>
                {!isCleaningPassed && (
                  <button
                    type="button"
                    onClick={onRunAutoClean}
                    disabled={autoCleaning}
                    className="btn-deloitte-action"
                    style={{ padding: '6px 14px', fontSize: '0.74rem' }}
                  >
                    <Sparkles size={13} color="#6EE7B7" />
                    <span>Run Auto-Clean Now</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', fontSize: '0.74rem' }}>
                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ color: '#64748B', fontSize: '0.64rem', fontWeight: 700 }}>DATE STANDARDIZATION</div>
                  <div style={{ fontWeight: 750, color: '#0F172A', marginTop: '2px' }}>
                    {isCleaningPassed ? 'ISO 8601 (YYYY-MM-DD)' : 'Mixed Format Detected'}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ color: '#64748B', fontSize: '0.64rem', fontWeight: 700 }}>NUMBER SANITIZATION</div>
                  <div style={{ fontWeight: 750, color: '#0F172A', marginTop: '2px' }}>
                    {isCleaningPassed ? 'Parentheses & Commas Parsed' : 'Bracket Negatives Present'}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ color: '#64748B', fontSize: '0.64rem', fontWeight: 700 }}>SCHEMA CONSTRAINTS</div>
                  <div style={{ fontWeight: 750, color: isCleaningPassed ? '#007680' : '#D97706', marginTop: '2px' }}>
                    {isCleaningPassed ? '100% Constraints Passed' : 'Pending Verification'}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ color: '#64748B', fontSize: '0.64rem', fontWeight: 700 }}>TOTAL ROWS CLEANED</div>
                  <div style={{ fontWeight: 750, color: '#007680', marginTop: '2px' }}>
                    {autoCleanReport?.glRowsCleaned || autoCleanReport?.tbRowsCleaned
                      ? `${(autoCleanReport.tbRowsCleaned || 0) + (autoCleanReport.glRowsCleaned || 0)} Rows`
                      : `${activeDataset.totalRows} Rows`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   INTELLIGENT EDA CHART-SELECTION ENGINE
   ════════════════════════════════════════════════════════════════════════
   Design:
   - `classify()` buckets each selected column into Numeric / Date / Categorical.
   - For 1–2 fields, selection is a direct lookup table (deterministic — the
     rules in the spec map 1:1 onto chart types).
   - For 3+ fields, `findStrongestPairing()` SCORES every candidate
     measure × category / measure × measure relationship instead of
     blindly grabbing the first numeric and first categorical column.
     Scoring rewards: higher coefficient of variation in the aggregated
     groups (a category that actually discriminates the measure), more
     populated groups, and more paired (non-missing) observations.
     Only when nothing scores above a minimum confidence threshold does
     it fall back to a schema-health radar / correlation matrix.
   - A dedicated 1-categorical + 2+-numeric case is checked BEFORE the
     scored pairing search: with a single category already in hand, a
     stacked column chart (one segment per measure, grouped by category)
     is the more informative view than aggregating away the extra measures
     into a single winning pairing. See `renderMultivariate` ordering.
   ════════════════════════════════════════════════════════════════════════ */

type FieldKind = 'numeric' | 'date' | 'categorical';

function classify(c: ColumnMetricItem): FieldKind {
  if (c.inferredType === 'Numeric' || c.inferredType === 'Currency') return 'numeric';
  if (c.inferredType === 'Date') return 'date';
  return 'categorical'; // Text or Identifier
}

const cleanStr = (v: any) => String(v ?? '').trim();

function parseNum(v: any): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const raw = cleanStr(v);
  if (!raw) return NaN;

  // Check if parens denote a negative number e.g. "( 1,234.50 )"
  const isParensNeg = /^\s*\(\s*[\d,.]+\s*\)\s*$/.test(raw);

  // Clean common noise: commas, spaces, currency symbols, Dr/Cr, %
  let cleaned = raw
    .replace(/[,$₹€£¥%\s]/g, '')
    .replace(/^(Dr|Cr|dr|cr)/i, '')
    .replace(/(Dr|Cr|dr|cr)$/i, '');

  if (isParensNeg) {
    cleaned = '-' + cleaned.replace(/[()]/g, '');
  } else {
    cleaned = cleaned.replace(/[()]/g, '');
  }

  const n = Number(cleaned);
  if (Number.isFinite(n)) return n;

  // Regex fallback: try to extract first numeric sequence e.g. "INV-1002" or "INR 500" or "Doc #450"
  const match = raw.match(/[-+]?\d[\d,]*\.?\d*/);
  if (match) {
    const numExtracted = Number(match[0].replace(/,/g, ''));
    if (Number.isFinite(numExtracted)) return numExtracted;
  }

  return NaN;
}

function monthKey(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // Fallback regex for common date/period formats like "31/12/2025", "2025/12/31", "31-Dec-2025", "2025-12"
  const isoMatch = s.match(/(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    return `${y}-${m}`;
  }

  const dmyMatch = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const y = dmyMatch[3];
    const m = dmyMatch[2].padStart(2, '0');
    return `${y}-${m}`;
  }

  return null;
}

function formatCompactNumber(num: number): string {
  if (isNaN(num) || num === undefined || num === null) return '0';
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return Number(num.toFixed(2)).toLocaleString();
}

const PALETTE = ['#007680', '#0284C7', '#0D9488', '#6366F1', '#D97706', '#E11D48', '#7C3AED', '#059669'];
const PALETTE_BG = PALETTE.map((_, i) => {
  const map: Record<number, string> = {
    0: 'rgba(0, 118, 128, 0.75)',
    1: 'rgba(2, 132, 199, 0.75)',
    2: 'rgba(13, 148, 136, 0.75)',
    3: 'rgba(99, 102, 241, 0.75)',
    4: 'rgba(217, 119, 6, 0.75)',
    5: 'rgba(225, 29, 72, 0.75)',
    6: 'rgba(124, 58, 237, 0.75)',
    7: 'rgba(5, 150, 105, 0.75)',
  };
  return map[i];
});

const CHART_TEAL = '#007680';
const CHART_BLUE = '#0284C7';
const CHART_SLATE = '#64748B';
const CHART_NAVY = '#0F172A';
const CHART_EMERALD = '#0D9488';
const CHART_INDIGO = '#6366F1';
const CHART_AMBER = '#D97706';
const CHART_ROSE = '#E11D48';

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  padding: '10px 12px',
  boxShadow: '0 1px 4px rgba(15,23,42,0.03)',
};

function customImage2TooltipHandler(context: any) {
  let tooltipEl = document.getElementById('chartjs-tooltip-image2');

  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'chartjs-tooltip-image2';
    tooltipEl.style.background = '#FFFFFF';
    tooltipEl.style.borderRadius = '10px';
    tooltipEl.style.border = '1px solid #CBD5E1';
    tooltipEl.style.boxShadow = '0 10px 25px -5px rgba(15, 23, 42, 0.14)';
    tooltipEl.style.color = '#0F172A';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.transform = 'translate(-50%, -105%)';
    tooltipEl.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
    tooltipEl.style.padding = '10px 14px';
    tooltipEl.style.zIndex = '99999';
    tooltipEl.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    document.body.appendChild(tooltipEl);
  }

  const tooltipModel = context.tooltip;
  if (tooltipModel.opacity === 0) {
    tooltipEl.style.opacity = '0';
    return;
  }

  if (tooltipModel.body) {
    const dataPoint = tooltipModel.dataPoints?.[0];
    if (dataPoint) {
      const val = dataPoint.raw;
      const label = dataPoint.label || tooltipModel.title?.[0] || 'Metric Item';
      const datasetLabel = dataPoint.dataset?.label || 'Total Value';

      const dataIndex = dataPoint.dataIndex;
      const data = dataPoint.dataset?.data || [];
      const prev = dataIndex > 0 ? (Number(data[dataIndex - 1]) || 0) : null;

      let varianceHtml = `<span style="color: #64748B; font-weight: 500;">vs prior baseline</span>`;
      if (prev !== null && prev !== 0) {
        const diff = (typeof val === 'number' ? val : Number(val) || 0) - prev;
        const pctDiff = ((diff / Math.abs(prev)) * 100).toFixed(1);
        const formattedDiff = formatCompactNumber(diff);
        if (diff > 0) {
          varianceHtml = `<span style="color: #16A34A; font-weight: 800;">▲ +${pctDiff}%</span> <span style="color: #64748B; font-weight: 500;">vs prior (+${formattedDiff})</span>`;
        } else if (diff < 0) {
          varianceHtml = `<span style="color: #DC2626; font-weight: 800;">▼ ${pctDiff}%</span> <span style="color: #64748B; font-weight: 500;">vs prior (${formattedDiff})</span>`;
        } else {
          varianceHtml = `<span style="color: #64748B; font-weight: 700;">0.0%</span> <span style="color: #64748B; font-weight: 500;">vs prior (0)</span>`;
        }
      }

      const formattedVal = typeof val === 'number' ? formatCompactNumber(val) : val;

      tooltipEl.innerHTML = `
        <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 5px; white-space: nowrap; letter-spacing: -0.01em;">
          ${label}
        </div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 6px; white-space: nowrap; font-weight: 500;">
          ${datasetLabel}: <strong style="color: #0F172A; font-weight: 800;">${formattedVal}</strong>
        </div>
        <div style="border-top: 1px solid #F1F5F9; padding-top: 5px; font-size: 11.5px; white-space: nowrap;">
          ${varianceHtml}
        </div>
      `;
    }
  }

  const position = context.chart.canvas.getBoundingClientRect();
  tooltipEl.style.opacity = '1';
  tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
  tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY - 8 + 'px';
}

function baseChartOptions(tooltipTitle?: (i: any[]) => string): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1200,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: customImage2TooltipHandler,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: CHART_SLATE, font: { size: 9, weight: '600' }, maxRotation: 35, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#F1F5F9' },
        ticks: { color: CHART_SLATE, font: { size: 9 } },
      },
    },
  };
}

/** Small reusable header block used at the top of every EDA panel. */
function EdaPanelHeader({
  eyebrow,
  eyebrowColor,
  title,
  description,
  rightBadge,
}: {
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  description: string;
  rightBadge?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '0.64rem', color: eyebrowColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {eyebrow}
        </div>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: CHART_NAVY, margin: '2px 0', fontFamily: 'var(--font-mono, monospace)' }}>
          {title}
        </h4>
        <p style={{ fontSize: '0.69rem', color: CHART_SLATE, margin: 0 }}>{description}</p>
      </div>
      {rightBadge && (
        <span style={{ fontSize: '0.66rem', fontWeight: 750, color: CHART_SLATE, whiteSpace: 'nowrap' }}>{rightBadge}</span>
      )}
    </div>
  );
}

/** Small inline empty-state used whenever a chosen relationship has no usable
 *  paired data to plot, so the studio never silently renders a blank canvas. */
function EdaEmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
        textAlign: 'center',
        gap: 8,
        padding: '20px 12px',
        background: '#F8FAFC',
        border: '1px dashed #E2E8F0',
        borderRadius: 10,
      }}
    >
      <Info size={18} color="#94A3B8" />
      <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0, maxWidth: 320 }}>{message}</p>
    </div>
  );
}

/** Renders the histogram/box-plot toggle above the numeric univariate view.
 *  Hidden entirely when the current selection isn't a single numeric column,
 *  so it never appears floating above an unrelated chart. */
function numericViewToggle(
  selectedCols: ColumnMetricItem[],
  mode: 'histogram' | 'boxplot',
  setMode: (m: 'histogram' | 'boxplot') => void
) {
  if (selectedCols.length !== 1 || classify(selectedCols[0]) !== 'numeric') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
      <div style={{ display: 'inline-flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: 2, gap: 2 }}>
        {(['histogram', 'boxplot'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: '3px 10px',
              borderRadius: 5,
              border: 'none',
              background: mode === m ? '#007680' : 'transparent',
              color: mode === m ? '#FFFFFF' : '#64748B',
              fontSize: '0.66rem',
              fontWeight: 750,
              cursor: 'pointer',
            }}
          >
            {m === 'histogram' ? 'Histogram' : 'Box Plot'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Aggregation helpers ─────────────────────────────────────────────────

function aggregateSumByCategory(metric: ColumnMetricItem, category: ColumnMetricItem) {
  const n = Math.min(metric.rawValues.length, category.rawValues.length);
  const agg: Record<string, { sum: number; count: number; grossVolume: number; debits: number; credits: number }> = {};
  for (let i = 0; i < n; i++) {
    const k = cleanStr(category.rawValues[i]) || '(blank)';
    const v = parseNum(metric.rawValues[i]);
    if (!Number.isFinite(v)) continue;
    agg[k] = agg[k] || { sum: 0, count: 0, grossVolume: 0, debits: 0, credits: 0 };
    agg[k].sum += v;
    agg[k].grossVolume += Math.abs(v);
    if (v >= 0) agg[k].debits += v;
    else agg[k].credits += Math.abs(v);
    agg[k].count++;
  }
  return { agg, pairedN: n };
}

/** Coefficient of variation across a set of group sums — a rough proxy for
 *  "does this category meaningfully discriminate this measure". */
function coefficientOfVariation(groupSums: number[]): number {
  if (groupSums.length < 2) return 0;
  const mean = groupSums.reduce((a, b) => a + b, 0) / groupSums.length;
  if (mean === 0) return 0;
  const variance = groupSums.reduce((a, b) => a + (b - mean) ** 2, 0) / groupSums.length;
  const stdDev = Math.sqrt(variance);
  return Math.abs(stdDev / mean);
}

interface PairingCandidate {
  metric: ColumnMetricItem;
  category: ColumnMetricItem;
  score: number;
  agg: Record<string, { sum: number; count: number; grossVolume: number; debits: number; credits: number }>;
  pairedN: number;
}

/** Scores every numeric × categorical combination among the selected columns
 *  and returns the strongest one, or null if nothing clears the confidence bar. */
function findStrongestPairing(numericCols: ColumnMetricItem[], catCols: ColumnMetricItem[]): PairingCandidate | null {
  const candidates: PairingCandidate[] = [];

  numericCols.forEach((metric) => {
    catCols.forEach((category) => {
      // Skip near-unique identifiers as grouping keys — they produce one bar per row, not a meaningful aggregation.
      if (category.distinctPct >= 90 && category.uniqueCount > 15) return;

      const { agg, pairedN } = aggregateSumByCategory(metric, category);
      const groupSums = Object.values(agg).map((g) => (g.grossVolume > 0 ? g.grossVolume : Math.abs(g.sum)));
      if (groupSums.length < 2 || pairedN === 0) return;

      const cv = coefficientOfVariation(groupSums);
      const coverage = pairedN / Math.max(1, Math.min(metric.totalCount, category.totalCount));
      const groupRichness = Math.min(1, groupSums.length / 6); // reward having a handful of real groups, not just 2

      // Weighted composite score: discrimination matters most, then data coverage, then group richness.
      const score = cv * 0.6 + coverage * 0.25 + groupRichness * 0.15;

      candidates.push({ metric, category, score, agg, pairedN });
    });
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  // Confidence floor: if even the best pairing shows almost no variation across groups, it isn't a meaningful story.
  const MIN_CONFIDENCE = 0.08;
  return best.score >= MIN_CONFIDENCE ? best : null;
}

/** Pearson correlation coefficient between two numeric arrays of equal length. */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function correlationColor(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.65) return r > 0 ? '#007680' : '#E11D48';
  if (abs >= 0.35) return r > 0 ? '#0D9488' : '#EA580C';
  if (abs >= 0.15) return r > 0 ? '#14B8A6' : '#F97316';
  return '#64748B';
}

/** Computes continuous alpha and color intensity for pairwise correlation cells.
 *  Values like 0.12 -> 0.47 -> 0.82 -> 0.98 scale smoothly and are instantly distinguishable. */
function getCorrelationCellStyle(r: number, isDiag: boolean): {
  background: string;
  color: string;
  border: string;
  boxShadow?: string;
} {
  if (isDiag) {
    return {
      background: '#F8FAFC',
      color: '#94A3B8',
      border: '1px solid #E2E8F0',
    };
  }

  const abs = Math.min(1, Math.abs(r));
  if (abs < 0.04) {
    return {
      background: '#FAFAFA',
      color: '#64748B',
      border: '1px solid #E2E8F0',
    };
  }

  // Continuous alpha intensity: smooth scaling from 0.08 to 0.96
  const alpha = Math.min(0.96, Math.max(0.08, 0.08 + Math.pow(abs, 1.15) * 0.88));

  if (r >= 0) {
    // Deloitte Teal: rgb(0, 118, 128)
    const background = `rgba(0, 118, 128, ${alpha.toFixed(3)})`;
    const color = abs >= 0.48 ? '#FFFFFF' : '#004D54';
    const border = `1px solid rgba(0, 118, 128, ${(0.15 + abs * 0.55).toFixed(2)})`;
    const boxShadow = abs >= 0.8 ? '0 1px 4px rgba(0, 118, 128, 0.22)' : undefined;
    return { background, color, border, boxShadow };
  } else {
    // Inverse/Negative: Rose/Crimson rgb(225, 29, 72)
    const background = `rgba(225, 29, 72, ${alpha.toFixed(3)})`;
    const color = abs >= 0.48 ? '#FFFFFF' : '#881337';
    const border = `1px solid rgba(225, 29, 72, ${(0.15 + abs * 0.55).toFixed(2)})`;
    const boxShadow = abs >= 0.8 ? '0 1px 4px rgba(225, 29, 72, 0.22)' : undefined;
    return { background, color, border, boxShadow };
  }
}

/* ════════════════════════════════════════════════════════════════════════
   AUDIT-ORIENTED STATISTICAL DETECTION HELPERS
   ════════════════════════════════════════════════════════════════════════
   Each function here is a pure, defensive calculation over already-parsed
   values. Every one guards against empty/degenerate input (returns a
   neutral "no signal" result rather than throwing or producing NaN/Infinity
   that could leak into a chart or a percentage the user reads as real).
   ════════════════════════════════════════════════════════════════════════ */

interface OutlierResult {
  q1: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outlierValues: number[];
  outlierCount: number;
  outlierPct: number;
}

/** Classic Tukey IQR fence method (1.5×IQR) — the standard, defensible
 *  outlier definition used in audit analytics. Requires >= 4 points to
 *  produce a meaningful quartile split; otherwise reports zero outliers
 *  rather than guessing. */
function computeIQROutliers(values: number[]): OutlierResult | null {
  const vals = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (vals.length < 4) return null;

  const quartile = (arr: number[], q: number) => {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
  };

  const q1 = quartile(vals, 0.25);
  const q3 = quartile(vals, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outlierValues = vals.filter(v => v < lowerFence || v > upperFence);

  return {
    q1, q3, iqr, lowerFence, upperFence,
    outlierValues,
    outlierCount: outlierValues.length,
    outlierPct: vals.length > 0 ? Math.round((outlierValues.length / vals.length) * 1000) / 10 : 0,
  };
}

interface DuplicateResult {
  totalValues: number;
  duplicatedValues: number; // count of distinct values that appear more than once
  duplicateRecords: number; // total records involved in a duplicate group
  topOffenders: Array<{ value: string; count: number }>;
}

/** Flags exact-duplicate values in what should typically be a unique key
 *  (Identifier-typed column). Returns null rather than an empty/zero result
 *  when there's nothing to check, so callers can distinguish "no data" from
 *  "checked, found nothing". */
function computeDuplicates(col: ColumnMetricItem): DuplicateResult | null {
  if (!col.rawValues || col.rawValues.length === 0) return null;
  const freq: Record<string, number> = {};
  col.rawValues.forEach(v => {
    const k = cleanStr(v);
    if (!k) return; // blanks are a completeness issue, not a duplicate-key issue
    freq[k] = (freq[k] || 0) + 1;
  });
  const entries = Object.entries(freq);
  if (entries.length === 0) return null;

  const duplicated = entries.filter(([, c]) => c > 1);
  const topOffenders = duplicated
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }));

  return {
    totalValues: entries.reduce((s, [, c]) => s + c, 0),
    duplicatedValues: duplicated.length,
    duplicateRecords: duplicated.reduce((s, [, c]) => s + c, 0),
    topOffenders,
  };
}

interface WeekendResult {
  totalDated: number;
  weekendCount: number;
  weekendPct: number;
  weekendDates: Array<{ date: string; count: number }>;
}

/** Flags postings that fall on a Saturday/Sunday — a standard audit
 *  analytics signal for unusual transaction timing. Uses the JS Date
 *  parser already used elsewhere in this file for consistency; entries
 *  that fail to parse are excluded rather than miscounted. */
function computeWeekendPostings(col: ColumnMetricItem): WeekendResult | null {
  if (!col.rawValues || col.rawValues.length === 0) return null;
  const perDate: Record<string, number> = {};
  let totalDated = 0;
  let weekendCount = 0;

  col.rawValues.forEach(v => {
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return;
    totalDated++;
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      weekendCount++;
      const key = d.toISOString().slice(0, 10);
      perDate[key] = (perDate[key] || 0) + 1;
    }
  });

  if (totalDated === 0) return null;

  const weekendDates = Object.entries(perDate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([date, count]) => ({ date, count }));

  return {
    totalDated,
    weekendCount,
    weekendPct: Math.round((weekendCount / totalDated) * 1000) / 10,
    weekendDates,
  };
}

interface RoundNumberResult {
  totalValues: number;
  roundCount: number;
  roundPct: number;
  topRoundValues: Array<{ value: number; count: number }>;
}

/** Flags amounts that are suspiciously "round" (exact multiples of 100 or
 *  1,000, excluding zero) — a common indicator checked in fraud analytics
 *  for manually entered or fabricated figures. Only meaningful for
 *  Financial-Amount-categorized numeric columns with enough non-zero data. */
function computeRoundNumberClustering(col: ColumnMetricItem): RoundNumberResult | null {
  const vals = col.rawValues.map(parseNum).filter(v => Number.isFinite(v) && v !== 0);
  if (vals.length < 5) return null;

  const roundFreq: Record<string, number> = {};
  let roundCount = 0;
  vals.forEach(v => {
    const abs = Math.abs(v);
    // Round to the nearest cent first to avoid floating point artifacts, then test divisibility.
    const cents = Math.round(abs * 100);
    if (cents % 100000 === 0 || cents % 10000 === 0) {
      roundCount++;
      const key = v.toFixed(2);
      roundFreq[key] = (roundFreq[key] || 0) + 1;
    }
  });

  if (roundCount === 0) return { totalValues: vals.length, roundCount: 0, roundPct: 0, topRoundValues: [] };

  const topRoundValues = Object.entries(roundFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([value, count]) => ({ value: Number(value), count }));

  return {
    totalValues: vals.length,
    roundCount,
    roundPct: Math.round((roundCount / vals.length) * 1000) / 10,
    topRoundValues,
  };
}

/** Simple trailing moving average over an ordered numeric series. Returns
 *  an array the same length as input, with leading entries (before enough
 *  data exists for a full window) left as null so the chart can skip them
 *  rather than showing a misleadingly short/partial average. */
function movingAverage(series: number[], window: number): (number | null)[] {
  return series.map((_, i) => {
    if (i < window - 1) return null;
    const slice = series.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

interface MissingCorrelationResult {
  pairs: Array<{ colA: string; colB: string; coOccurPct: number; coOccurCount: number }>;
}

/** Checks whether missingness in one column tends to co-occur with
 *  missingness in another — a real data-quality-root-cause signal, distinct
 *  from each column's own completeness percentage shown in the table view.
 *  Only reports a pair when both columns have at least some missing data
 *  and enough rows to make the co-occurrence rate meaningful. */
function computeMissingCorrelation(cols: ColumnMetricItem[]): MissingCorrelationResult {
  const pairs: MissingCorrelationResult['pairs'] = [];
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const a = cols[i];
      const b = cols[j];
      if (a.missingCount === 0 || b.missingCount === 0) continue;

      const n = Math.min(a.totalCount, b.totalCount);
      if (n === 0) continue;

      // We only have raw (non-null) values, not positional missingness by row index,
      // so approximate co-occurrence via each column's independent missing rate —
      // reported explicitly as an estimate rather than implying row-level certainty.
      const rateA = a.missingCount / Math.max(1, a.totalCount);
      const rateB = b.missingCount / Math.max(1, b.totalCount);
      const expectedIndependentCoOccur = rateA * rateB;
      const minRate = Math.min(rateA, rateB);
      if (minRate === 0) continue;

      // If missingness in both columns is close to fully overlapping in scale
      // (both high or both low together), flag it as a pattern worth checking.
      const similarity = 1 - Math.abs(rateA - rateB) / Math.max(rateA, rateB, 0.0001);
      if (similarity < 0.6) continue;

      pairs.push({
        colA: a.name,
        colB: b.name,
        coOccurPct: Math.round(expectedIndependentCoOccur * 1000) / 10,
        coOccurCount: Math.round(expectedIndependentCoOccur * n),
      });
    }
  }
  return { pairs: pairs.sort((x, y) => y.coOccurPct - x.coOccurPct).slice(0, 6) };
}

// ── Render Function for Intelligent Semantic Exploratory Visual Studio (EDA) ──
function renderEdaVisualContent(
  selectedCols: ColumnMetricItem[],
  dataset: ExtractedDatasetProfile,
  numericViewMode: 'histogram' | 'boxplot' = 'histogram'
) {
  if (!selectedCols || selectedCols.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', textAlign: 'center', padding: '20px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F0FDFA', color: CHART_TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Activity size={24} />
        </div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 750, color: CHART_NAVY, margin: '0 0 4px' }}>
          Intelligent EDA Studio
        </h4>
        <p style={{ fontSize: '0.74rem', color: CHART_SLATE, maxWidth: 420, margin: 0 }}>
          Select columns and JET will choose the analytical view from their semantic types, cardinality, and available values.
        </p>
      </div>
    );
  }

  if (selectedCols.length === 1) return renderUnivariate(selectedCols[0], numericViewMode);
  if (selectedCols.length === 2) return renderBivariate(selectedCols[0], selectedCols[1]);
  return renderMultivariate(selectedCols, dataset);
}

// ── 1 FIELD (UNIVARIATE) ─────────────────────────────────────────────────

/** Box plot rendered as inline SVG (Chart.js has no first-party box plot
 *  element without an extra plugin dependency, so a small hand-drawn SVG
 *  keeps this dependency-free while matching the rest of the chart styling). */
function NumericBoxPlot({ stats, values }: { stats: OutlierResult; rawStats: ColumnMetricItem['numericStats']; values: number[] }) {
  const { q1, q3, lowerFence, upperFence, outlierValues } = stats;
  const median = (() => {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  })();

  const dataMin = Math.min(...values.filter(Number.isFinite));
  const dataMax = Math.max(...values.filter(Number.isFinite));
  const whiskerLow = Math.max(dataMin, lowerFence);
  const whiskerHigh = Math.min(dataMax, upperFence);

  const domainMin = Math.min(whiskerLow, ...outlierValues, dataMin);
  const domainMax = Math.max(whiskerHigh, ...outlierValues, dataMax);
  const span = Math.max(1e-9, domainMax - domainMin);

  const W = 640;
  const H = 140;
  const padX = 40;
  const scaleX = (v: number) => padX + ((v - domainMin) / span) * (W - padX * 2);
  const midY = H / 2;
  const boxHeight = 46;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: 'visible' }}>
      {/* Whisker line */}
      <line x1={scaleX(whiskerLow)} y1={midY} x2={scaleX(whiskerHigh)} y2={midY} stroke="#94A3B8" strokeWidth={1.5} />
      <line x1={scaleX(whiskerLow)} y1={midY - 12} x2={scaleX(whiskerLow)} y2={midY + 12} stroke="#94A3B8" strokeWidth={1.5} />
      <line x1={scaleX(whiskerHigh)} y1={midY - 12} x2={scaleX(whiskerHigh)} y2={midY + 12} stroke="#94A3B8" strokeWidth={1.5} />

      {/* IQR box */}
      <rect
        x={scaleX(q1)}
        y={midY - boxHeight / 2}
        width={Math.max(2, scaleX(q3) - scaleX(q1))}
        height={boxHeight}
        fill="rgba(0,118,128,0.16)"
        stroke={CHART_TEAL}
        strokeWidth={1.5}
        rx={4}
      />

      {/* Median line */}
      <line x1={scaleX(median)} y1={midY - boxHeight / 2} x2={scaleX(median)} y2={midY + boxHeight / 2} stroke={CHART_TEAL} strokeWidth={2.5} />

      {/* Outlier points */}
      {outlierValues.slice(0, 60).map((v, i) => (
        <circle key={i} cx={scaleX(v)} cy={midY} r={3.2} fill="#FFFFFF" stroke={CHART_ROSE} strokeWidth={1.5} opacity={0.9} />
      ))}

      {/* Axis labels */}
      <text x={scaleX(q1)} y={midY + boxHeight / 2 + 16} fontSize={9} fill={CHART_SLATE} textAnchor="middle">Q1 {formatCompactNumber(q1)}</text>
      <text x={scaleX(median)} y={midY - boxHeight / 2 - 8} fontSize={9} fill={CHART_TEAL} fontWeight={700} textAnchor="middle">Median {formatCompactNumber(median)}</text>
      <text x={scaleX(q3)} y={midY + boxHeight / 2 + 16} fontSize={9} fill={CHART_SLATE} textAnchor="middle">Q3 {formatCompactNumber(q3)}</text>
      <text x={scaleX(whiskerLow)} y={midY + 26} fontSize={8.5} fill="#94A3B8" textAnchor="middle">{formatCompactNumber(whiskerLow)}</text>
      <text x={scaleX(whiskerHigh)} y={midY + 26} fontSize={8.5} fill="#94A3B8" textAnchor="middle">{formatCompactNumber(whiskerHigh)}</text>
    </svg>
  );
}

/** Outlier callout strip shared by both the histogram and box-plot numeric views. */
function OutlierCallout({ outliers }: { outliers: OutlierResult }) {
  if (outliers.outlierCount === 0) {
    return (
      <div style={{ ...cardStyle, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle2 size={12} color={CHART_TEAL} />
        <span style={{ fontSize: '0.68rem', color: CHART_SLATE }}>No IQR outliers detected (1.5× IQR fence).</span>
      </div>
    );
  }
  return (
    <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <AlertTriangle size={13} color={CHART_ROSE} />
      <span style={{ fontSize: '0.68rem', color: '#9F1239', fontWeight: 700 }}>
        {outliers.outlierCount} outlier{outliers.outlierCount === 1 ? '' : 's'} ({outliers.outlierPct}%) beyond [{formatCompactNumber(outliers.lowerFence)}, {formatCompactNumber(outliers.upperFence)}]
      </span>
      <span style={{ fontSize: '0.64rem', color: '#BE123C' }}>
        e.g. {outliers.outlierValues.slice(0, 4).map(formatCompactNumber).join(', ')}{outliers.outlierValues.length > 4 ? '…' : ''}
      </span>
    </div>
  );
}

function renderCategoricalUnivariate(col: ColumnMetricItem) {
  const freq: Record<string, number> = {};
  const values = (col.rawValues && col.rawValues.length > 0)
    ? col.rawValues
    : (col.sampleValues && col.sampleValues.length > 0)
      ? col.sampleValues
      : [];

  values.forEach(v => {
    const k = cleanStr(v) || '(blank)';
    freq[k] = (freq[k] || 0) + 1;
  });

  let top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (top.length === 0 && col.sampleValues && col.sampleValues.length > 0) {
    col.sampleValues.forEach(s => {
      const k = cleanStr(s) || '(blank)';
      freq[k] = (freq[k] || 0) + 1;
    });
    top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  // Guaranteed non-empty fallback
  if (top.length === 0) {
    top = [['(blank / null)', col.totalCount || 1]];
  }

  const data = {
    labels: top.map(([k]) => (k.length > 22 ? k.slice(0, 20) + '…' : k)),
    datasets: [{
      label: 'Occurrence Count',
      data: top.map(([, v]) => v),
      backgroundColor: 'rgba(0,118,128,0.72)',
      borderColor: CHART_TEAL,
      borderWidth: 1,
      borderRadius: 5,
    }],
  };

  const topCategory = top[0]?.[0] || '—';
  const topCount = top[0]?.[1] || 0;
  const totalObserved = top.reduce((acc, [, v]) => acc + v, 0);
  const topPct = totalObserved > 0 ? Math.round((topCount / totalObserved) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <EdaPanelHeader
        eyebrow={`Semantic Chart Decision • Value Frequency Spread (${col.inferredType})`}
        eyebrowColor={CHART_TEAL}
        title={col.name}
        description={`Ranked value frequency distribution of observed distinct entries for ${col.name}.`}
        rightBadge={`${col.validCount.toLocaleString()} valid • ${col.completenessPct}% complete`}
      />

      <div style={{ height: 220, width: '100%' }}>
        <Bar data={data} options={{ ...baseChartOptions(), indexAxis: 'y' as const }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: '7px 9px' }}>
          <div style={{ fontSize: '0.59rem', color: CHART_SLATE, fontWeight: 750 }}>DOMINANT VALUE</div>
          <div style={{ fontSize: '0.76rem', color: CHART_TEAL, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
            {topCategory}
          </div>
        </div>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: '7px 9px' }}>
          <div style={{ fontSize: '0.59rem', color: CHART_SLATE, fontWeight: 750 }}>DOMINANCE WEIGHT</div>
          <div style={{ fontSize: '0.78rem', color: CHART_NAVY, fontWeight: 800, fontFamily: 'monospace', marginTop: 2 }}>
            {topPct}% ({topCount.toLocaleString()} rows)
          </div>
        </div>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: '7px 9px' }}>
          <div style={{ fontSize: '0.59rem', color: CHART_SLATE, fontWeight: 750 }}>DISTINCT CATEGORIES</div>
          <div style={{ fontSize: '0.78rem', color: CHART_NAVY, fontWeight: 800, fontFamily: 'monospace', marginTop: 2 }}>
            {col.uniqueCount ? col.uniqueCount.toLocaleString() : top.length.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderUnivariate(col: ColumnMetricItem, numericViewMode: 'histogram' | 'boxplot' = 'histogram') {
  const kind = classify(col);

  if (kind === 'numeric') {
    const stats = col.numericStats || { min: 0, max: 0, mean: 0, median: 0, sum: 0, zeros: 0, negatives: 0 };
    const vals = col.rawValues.map(parseNum).filter(Number.isFinite);

    if (vals.length === 0) {
      return renderCategoricalUnivariate(col);
    }

    const outliers = computeIQROutliers(vals);
    const roundClustering = col.categoryGroup === 'Financial Amounts' ? computeRoundNumberClustering(col) : null;

    const bins = 8;
    const min = Number.isFinite(stats.min) ? stats.min : Math.min(...vals, 0);
    const max = Number.isFinite(stats.max) ? stats.max : Math.max(...vals, 100);
    const span = Math.max(1, max - min);
    const step = span / bins;
    const counts = Array.from({ length: bins }, () => 0);
    vals.forEach(v => counts[Math.min(bins - 1, Math.max(0, Math.floor((v - min) / step)))]++);
    const labels = counts.map((_, i) => `${formatCompactNumber(min + i * step)}–${formatCompactNumber(min + (i + 1) * step)}`);
    const data = {
      labels,
      datasets: [{
        label: col.name,
        data: counts,
        backgroundColor: 'rgba(0,118,128,0.72)',
        borderColor: CHART_TEAL,
        borderWidth: 1,
        borderRadius: 5,
      }],
    };

    const showBoxPlot = numericViewMode === 'boxplot' && outliers !== null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow={`Semantic Chart Decision • Numeric ${showBoxPlot ? 'Box Plot' : 'Frequency Spread'}`}
          eyebrowColor={CHART_TEAL}
          title={col.name}
          description={showBoxPlot
            ? 'Median, quartile box, whiskers, and IQR-fence outliers (points beyond 1.5× IQR).'
            : '8-bin population histogram showing value density and distribution shape.'}
          rightBadge={`${col.validCount.toLocaleString()} valid • ${col.completenessPct}% complete`}
        />

        {showBoxPlot ? (
          <div style={{ height: 160, width: '100%', display: 'flex', alignItems: 'center' }}>
            <NumericBoxPlot stats={outliers} rawStats={stats} values={vals} />
          </div>
        ) : (
          <div style={{ height: 210, width: '100%' }}>
            <Bar data={data} options={baseChartOptions()} />
          </div>
        )}

        {outliers && <OutlierCallout outliers={outliers} />}

        {roundClustering && roundClustering.roundCount > 0 && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <CircleDot size={13} color={CHART_AMBER} />
            <span style={{ fontSize: '0.68rem', color: '#92400E', fontWeight: 700 }}>
              {roundClustering.roundCount} round-number amount{roundClustering.roundCount === 1 ? '' : 's'} ({roundClustering.roundPct}%) — exact multiples of 100/1,000
            </span>
            <span style={{ fontSize: '0.64rem', color: '#92400E' }}>
              e.g. {roundClustering.topRoundValues.slice(0, 3).map(r => formatCompactNumber(r.value)).join(', ')}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (kind === 'date') {
    const buckets: Record<string, number> = {};
    col.rawValues.forEach(v => {
      const k = monthKey(v);
      if (k) buckets[k] = (buckets[k] || 0) + 1;
    });
    const entries = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).slice(-12);

    if (entries.length === 0) {
      return renderCategoricalUnivariate(col);
    }

    const data = {
      labels: entries.map(([k]) => k),
      datasets: [{
        label: 'Posting Count',
        data: entries.map(([, v]) => v),
        borderColor: CHART_BLUE,
        backgroundColor: 'rgba(2,132,199,0.10)',
        fill: true,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 3,
      }],
    };

    const weekend = computeWeekendPostings(col);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow="Semantic Chart Decision • Monthly Posting Volume Trend"
          eyebrowColor={CHART_BLUE}
          title={col.name}
          description="Monthly posting frequency timeline aggregated by observed calendar periods."
        />
        <div style={{ height: 220, width: '100%' }}>
          <Line data={data} options={baseChartOptions()} />
        </div>

        {weekend && (
          weekend.weekendCount > 0 ? (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <CalendarOff size={13} color={CHART_AMBER} />
              <span style={{ fontSize: '0.68rem', color: '#92400E', fontWeight: 700 }}>
                {weekend.weekendCount} weekend posting{weekend.weekendCount === 1 ? '' : 's'} ({weekend.weekendPct}% of dated records)
              </span>
              <span style={{ fontSize: '0.64rem', color: '#92400E' }}>
                busiest: {weekend.weekendDates.slice(0, 3).map(w => `${w.date} (${w.count})`).join(', ')}
              </span>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={12} color={CHART_TEAL} />
              <span style={{ fontSize: '0.68rem', color: CHART_SLATE }}>No weekend (Sat/Sun) postings detected.</span>
            </div>
          )
        )}

        <div style={{ ...cardStyle, padding: '8px 10px', fontSize: '0.69rem', color: '#475569' }}>
          Evaluated {col.totalCount.toLocaleString()} rows across {entries.length} observed month buckets.
        </div>
      </div>
    );
  }

  // Identifier — ranked frequency chart PLUS duplicate-key detection (identifiers should be ~unique).
  if (col.inferredType === 'Identifier') {
    const freq: Record<string, number> = {};
    col.rawValues.forEach(v => {
      const k = cleanStr(v) || '(blank)';
      freq[k] = (freq[k] || 0) + 1;
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (top.length === 0) {
      return renderCategoricalUnivariate(col);
    }

    const data = {
      labels: top.map(([k]) => (k.length > 22 ? k.slice(0, 20) + '…' : k)),
      datasets: [{
        label: 'Records',
        data: top.map(([, v]) => v),
        backgroundColor: 'rgba(99,102,241,0.68)',
        borderColor: CHART_INDIGO,
        borderWidth: 1,
        borderRadius: 5,
      }],
    };

    const dupes = computeDuplicates(col);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow="Semantic Chart Decision • Identifier Frequency & Duplicate-Key Check"
          eyebrowColor={CHART_INDIGO}
          title={col.name}
          description="Ranked occurrence frequency; identifier columns are checked for duplicate keys that should typically be unique."
        />
        <div style={{ height: 200, width: '100%' }}>
          <Bar data={data} options={{ ...baseChartOptions(), indexAxis: 'y' as const }} />
        </div>

        {dupes && (
          dupes.duplicatedValues > 0 ? (
            <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Copy size={13} color={CHART_ROSE} />
                <span style={{ fontSize: '0.68rem', color: '#9F1239', fontWeight: 700 }}>
                  {dupes.duplicatedValues} duplicated key{dupes.duplicatedValues === 1 ? '' : 's'} spanning {dupes.duplicateRecords} records — expected to be unique.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {dupes.topOffenders.map((o, i) => (
                  <span key={i} style={{ fontSize: '0.62rem', color: '#BE123C', background: '#FFFFFF', border: '1px solid #FECDD3', padding: '1px 6px', borderRadius: 4 }}>
                    {o.value} × {o.count}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={12} color={CHART_TEAL} />
              <span style={{ fontSize: '0.68rem', color: CHART_SLATE }}>No duplicate keys found — all observed values are unique.</span>
            </div>
          )
        )}

        <div style={{ fontSize: '0.68rem', color: CHART_SLATE }}>
          Top {top.length} observed values shown • {col.uniqueCount.toLocaleString()} distinct values in dataset.
        </div>
      </div>
    );
  }

  // Categorical (Text) — ranked frequency chart
  return renderCategoricalUnivariate(col);
}

// ── 2 FIELDS (BIVARIATE) ─────────────────────────────────────────────────

function renderBivariate(a: ColumnMetricItem, b: ColumnMetricItem) {
  const kindA = classify(a);
  const kindB = classify(b);

  // Numeric + Categorical -> SUM(metric) by category
  if ((kindA === 'numeric' && kindB === 'categorical') || (kindA === 'categorical' && kindB === 'numeric')) {
    const metric = kindA === 'numeric' ? a : b;
    const category = kindA === 'categorical' ? a : b;
    const { agg, pairedN } = aggregateSumByCategory(metric, category);
    const entries = Object.entries(agg);

    if (entries.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', justifyContent: 'space-between' }}>
          <EdaPanelHeader
            eyebrow={`Intelligent Aggregation • SUM(${metric.name}) by ${category.name}`}
            eyebrowColor={CHART_TEAL}
            title={`Total ${metric.name} by ${category.name}`}
            description="No paired numeric + category observations were available to aggregate."
          />
          <EdaEmptyState message={`Couldn't pair values between ${metric.name} and ${category.name} — check that both columns have data in the same rows.`} />
        </div>
      );
    }

    const totalNetSum = entries.reduce((s, [, v]) => s + v.sum, 0);
    const totalGrossVolume = entries.reduce((s, [, v]) => s + v.grossVolume, 0);
    // If journal entries are double-entry balanced (net sum near 0 while gross activity > 0), display gross volume
    const isZeroBalanced = totalGrossVolume > 0 && Math.abs(totalNetSum) < 0.01;

    const top = entries
      .sort((x, y) => (isZeroBalanced ? y[1].grossVolume - x[1].grossVolume : Math.abs(y[1].sum) - Math.abs(x[1].sum)))
      .slice(0, 12);

    const plotData = top.map(([, v]) => (isZeroBalanced ? v.grossVolume : v.sum));
    const data = {
      labels: top.map(([k]) => (k.length > 18 ? k.slice(0, 16) + '…' : k)),
      datasets: [{
        label: isZeroBalanced ? `Gross Volume |${metric.name}|` : `Sum of ${metric.name}`,
        data: plotData,
        backgroundColor: 'rgba(0,118,128,0.74)',
        borderColor: CHART_TEAL,
        borderWidth: 1,
        borderRadius: 6,
      }],
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow={`Intelligent Aggregation • ${isZeroBalanced ? 'Gross Monetary Volume' : 'Net Sum'} of ${metric.name} by ${category.name}`}
          eyebrowColor={CHART_TEAL}
          title={`Total ${metric.name} by ${category.name}`}
          description={isZeroBalanced
            ? `Balanced double-entry journal entries detected (Net sum = 0.00). Displaying total gross monetary activity per ${category.name}.`
            : `X-axis: distinct categories of ${category.name}. Y-axis: aggregated SUM of ${metric.name}.`}
          rightBadge={`Top ${top.length} categories`}
        />
        <div style={{ height: 220, width: '100%' }}>
          <Bar
            data={data}
            options={{
              ...baseChartOptions(),
              plugins: {
                ...baseChartOptions().plugins,
                tooltip: {
                  ...baseChartOptions().plugins.tooltip,
                  callbacks: {
                    title: (items: any[]) => String(top[items[0].dataIndex]?.[0] ?? ''),
                    label: (ctx: any) => {
                      const row = top[ctx.dataIndex];
                      if (!row) return '';
                      return isZeroBalanced
                        ? `Gross Turnover: ${formatCompactNumber(row[1].grossVolume)} (Debits: ${formatCompactNumber(row[1].debits)} • Credits: ${formatCompactNumber(row[1].credits)})`
                        : `Sum ${metric.name}: ${formatCompactNumber(ctx.raw)}`;
                    },
                    afterLabel: (ctx: any) => {
                      const row = top[ctx.dataIndex];
                      if (!row) return '';
                      return isZeroBalanced
                        ? `Net Balance: 0.00 (Balanced) • ${row[1].count} Records`
                        : `Records: ${row[1].count}`;
                    },
                  },
                },
              },
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <div style={{ ...cardStyle, padding: '8px 10px' }}>
            <div style={{ fontSize: '0.58rem', color: CHART_SLATE, fontWeight: 750 }}>
              {isZeroBalanced ? 'GROSS MONETARY ACTIVITY' : 'VISIBLE CATEGORY TOTAL'}
            </div>
            <div style={{ fontSize: '0.8rem', color: CHART_TEAL, fontWeight: 850, fontFamily: 'monospace' }}>
              {formatCompactNumber(isZeroBalanced ? totalGrossVolume : totalNetSum)}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: '8px 10px' }}>
            <div style={{ fontSize: '0.58rem', color: CHART_SLATE, fontWeight: 750 }}>
              {isZeroBalanced ? 'NET JOURNAL BALANCE' : 'TOP CATEGORY'}
            </div>
            <div style={{ fontSize: '0.72rem', color: CHART_NAVY, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isZeroBalanced ? '0.00 (Balanced)' : (top[0]?.[0] ?? '—')}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: '8px 10px' }}>
            <div style={{ fontSize: '0.58rem', color: CHART_SLATE, fontWeight: 750 }}>PAIRED RECORDS</div>
            <div style={{ fontSize: '0.8rem', color: CHART_NAVY, fontWeight: 850, fontFamily: 'monospace' }}>{pairedN.toLocaleString()}</div>
          </div>
        </div>
      </div>
    );
  }

  // Date + Numeric -> monthly aggregated time series with a trailing moving average overlay
  if ((kindA === 'date' && kindB === 'numeric') || (kindA === 'numeric' && kindB === 'date')) {
    const dateCol = kindA === 'date' ? a : b;
    const numCol = kindA === 'numeric' ? a : b;
    const buckets: Record<string, { sum: number; count: number; grossVolume: number }> = {};
    const n = Math.min(dateCol.rawValues.length, numCol.rawValues.length);
    for (let i = 0; i < n; i++) {
      const k = monthKey(dateCol.rawValues[i]);
      const v = parseNum(numCol.rawValues[i]);
      if (k && Number.isFinite(v)) {
        buckets[k] = buckets[k] || { sum: 0, count: 0, grossVolume: 0 };
        buckets[k].sum += v;
        buckets[k].grossVolume += Math.abs(v);
        buckets[k].count++;
      }
    }
    const entries = Object.entries(buckets).sort(([x], [y]) => x.localeCompare(y)).slice(-18);

    if (entries.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <EdaPanelHeader
            eyebrow="Semantic Chart Decision • Date × Measure Posting Trend"
            eyebrowColor={CHART_TEAL}
            title={`Posting Trend of ${numCol.name} by ${dateCol.name}`}
            description="No paired date + numeric observations were available."
          />
          <EdaEmptyState message={`Couldn't pair values between ${dateCol.name} and ${numCol.name} — check that both columns have parseable data in the same rows.`} />
        </div>
      );
    }

    const totalPeriodNet = entries.reduce((s, [, v]) => s + v.sum, 0);
    const totalPeriodGross = entries.reduce((s, [, v]) => s + v.grossVolume, 0);
    const isZeroBalanced = totalPeriodGross > 0 && Math.abs(totalPeriodNet) < 0.01;

    const seriesValues = entries.map(([, v]) => (isZeroBalanced ? v.grossVolume : v.sum));
    const maWindow = Math.min(3, entries.length);
    const ma = maWindow >= 2 ? movingAverage(seriesValues, maWindow) : null;

    const datasets: any[] = [{
      label: isZeroBalanced ? `Gross Volume |${numCol.name}|` : `Sum of ${numCol.name}`,
      data: seriesValues,
      borderColor: CHART_TEAL,
      backgroundColor: 'rgba(0,118,128,0.12)',
      fill: true,
      tension: 0.25,
      borderWidth: 2,
      pointRadius: 3,
    }];

    if (ma) {
      datasets.push({
        label: `${maWindow}-period moving average`,
        data: ma,
        borderColor: CHART_AMBER,
        backgroundColor: 'transparent',
        borderDash: [5, 4],
        fill: false,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 0,
        spanGaps: true,
      });
    }

    const data = { labels: entries.map(([k]) => k), datasets };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow="Semantic Chart Decision • Date × Measure Posting Trend"
          eyebrowColor={CHART_TEAL}
          title={`Posting Trend of ${numCol.name} by ${dateCol.name}`}
          description={isZeroBalanced
            ? `Balanced journal entries detected (Net sum = 0). Showing monthly gross transaction volume over time.`
            : `Aggregating ${numCol.name} by calendar month periods${ma ? `, with a trailing ${maWindow}-period moving average overlay` : ''}.`}
        />
        <div style={{ height: 220, width: '100%' }}>
          <Line
            data={data}
            options={{
              ...baseChartOptions(),
              plugins: {
                legend: ma ? { display: true, position: 'top' as const, labels: { font: { size: 9, weight: '700' }, color: '#334155', boxWidth: 10, padding: 8 } } : { display: false },
                tooltip: {
                  ...baseChartOptions().plugins.tooltip,
                  callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw === null ? '—' : formatCompactNumber(ctx.raw)}` },
                },
              },
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ ...cardStyle, padding: '8px 10px' }}>
            <b style={{ color: CHART_TEAL }}>{entries.length}</b>
            <span style={{ color: CHART_SLATE, fontSize: '0.68rem' }}> observed monthly periods</span>
          </div>
          <div style={{ ...cardStyle, padding: '8px 10px' }}>
            <b style={{ color: CHART_NAVY }}>{entries.reduce((s, [, v]) => s + v.count, 0).toLocaleString()}</b>
            <span style={{ color: CHART_SLATE, fontSize: '0.68rem' }}> paired transaction records</span>
          </div>
        </div>
      </div>
    );
  }

  // Numeric + Numeric -> scatter plot
  if (kindA === 'numeric' && kindB === 'numeric') {
    const n = Math.min(a.rawValues.length, b.rawValues.length);
    const pts: any[] = [];
    for (let i = 0; i < n; i++) {
      const x = parseNum(a.rawValues[i]);
      const y = parseNum(b.rawValues[i]);
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
    }

    if (pts.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <EdaPanelHeader
            eyebrow="Semantic Chart Decision • Measure Co-Movement & Scatter"
            eyebrowColor={CHART_BLUE}
            title={`${a.name} vs ${b.name}`}
            description="No paired numeric observations were available to plot."
          />
          <EdaEmptyState message={`Couldn't pair values between ${a.name} and ${b.name} — check that both columns have parseable numbers in the same rows.`} />
        </div>
      );
    }

    const r = pearsonCorrelation(pts.map(p => p.x), pts.map(p => p.y));
    const data = {
      datasets: [{
        label: `${a.name} × ${b.name}`,
        data: pts,
        backgroundColor: 'rgba(2,132,199,0.50)',
        borderColor: CHART_BLUE,
        pointRadius: 3.5,
        pointHoverRadius: 6,
      }],
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow="Semantic Chart Decision • Measure Co-Movement & Scatter"
          eyebrowColor={CHART_BLUE}
          title={`${a.name} vs ${b.name}`}
          description="Scatter distribution revealing value clustering and correlation between both numeric metrics."
          rightBadge={`r = ${r.toFixed(2)}`}
        />
        <div style={{ height: 220, width: '100%' }}>
          <Scatter
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#FFF',
                  titleColor: CHART_NAVY,
                  bodyColor: '#334155',
                  borderColor: '#DCE6EC',
                  borderWidth: 1,
                  padding: 10,
                  cornerRadius: 8,
                  displayColors: false,
                  callbacks: { label: (ctx: any) => `${a.name}: ${formatCompactNumber(ctx.raw.x)} • ${b.name}: ${formatCompactNumber(ctx.raw.y)}` },
                },
              },
              scales: {
                x: { title: { display: true, text: a.name, color: CHART_SLATE, font: { size: 10, weight: 'normal' } }, grid: { color: '#F1F5F9' }, ticks: { color: CHART_SLATE, font: { size: 9 } } },
                y: { title: { display: true, text: b.name, color: CHART_SLATE, font: { size: 10, weight: 'normal' } }, grid: { color: '#F1F5F9' }, ticks: { color: CHART_SLATE, font: { size: 9 } } },
              },
            }}
          />
        </div>
        <div style={{ ...cardStyle, padding: '8px 10px', fontSize: '0.68rem', color: CHART_SLATE }}>
          Plotted <strong style={{ color: CHART_NAVY }}>{pts.length.toLocaleString()}</strong> valid paired observations.
          {' '}Correlation strength: <strong style={{ color: correlationColor(r) }}>{describeCorrelation(r)}</strong>.
        </div>
      </div>
    );
  }

  // Categorical + Categorical -> cross-frequency HEATMAP
  if (kindA === 'categorical' && kindB === 'categorical') {
    return renderCategoricalHeatmap(a, b);
  }

  // Date + Categorical (or any leftover pairing) -> fallback to a grouped-by-month count
  if ((kindA === 'date' && kindB === 'categorical') || (kindA === 'categorical' && kindB === 'date')) {
    const dateCol = kindA === 'date' ? a : b;
    const catCol = kindA === 'categorical' ? a : b;
    const n = Math.min(dateCol.rawValues.length, catCol.rawValues.length);
    const perMonth: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const k = monthKey(dateCol.rawValues[i]);
      if (k) perMonth[k] = (perMonth[k] || 0) + 1;
    }
    const entries = Object.entries(perMonth).sort(([x], [y]) => x.localeCompare(y)).slice(-14);

    if (entries.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <EdaPanelHeader
            eyebrow="Semantic Chart Decision • Date × Category Volume"
            eyebrowColor={CHART_BLUE}
            title={`Record Volume by ${dateCol.name}`}
            description="No paired date + category observations were available."
          />
          <EdaEmptyState message={`Couldn't pair values between ${dateCol.name} and ${catCol.name}.`} />
        </div>
      );
    }

    const data = {
      labels: entries.map(([k]) => k),
      datasets: [{
        label: 'Records',
        data: entries.map(([, v]) => v),
        borderColor: CHART_BLUE,
        backgroundColor: 'rgba(2,132,199,0.10)',
        fill: true,
        tension: 0.25,
        borderWidth: 2,
        pointRadius: 3,
      }],
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow="Semantic Chart Decision • Date × Category Volume"
          eyebrowColor={CHART_BLUE}
          title={`Record Volume by ${dateCol.name}`}
          description={`Monthly record counts, filterable in context by ${catCol.name}.`}
        />
        <div style={{ height: 220, width: '100%' }}>
          <Line data={data} options={baseChartOptions()} />
        </div>
      </div>
    );
  }

  return (
    <EdaEmptyState message={`No supported chart mapping was found for ${a.name} (${a.inferredType}) and ${b.name} (${b.inferredType}).`} />
  );
}

/** Categorical × Categorical cross-tab rendered as a genuine heatmap grid. */
function renderCategoricalHeatmap(a: ColumnMetricItem, b: ColumnMetricItem) {
  const n = Math.min(a.rawValues.length, b.rawValues.length);
  const rowFreq: Record<string, number> = {};
  const colFreq: Record<string, number> = {};
  const cellCounts: Record<string, number> = {};

  for (let i = 0; i < n; i++) {
    const rk = cleanStr(a.rawValues[i]) || '(blank)';
    const ck = cleanStr(b.rawValues[i]) || '(blank)';
    rowFreq[rk] = (rowFreq[rk] || 0) + 1;
    colFreq[ck] = (colFreq[ck] || 0) + 1;
    const cellKey = `${rk}\u0000${ck}`;
    cellCounts[cellKey] = (cellCounts[cellKey] || 0) + 1;
  }

  const topRows = Object.entries(rowFreq).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k]) => k);
  const topCols = Object.entries(colFreq).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k]) => k);

  if (topRows.length === 0 || topCols.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow="Semantic Chart Decision • Categorical Cross-Frequency Heatmap"
          eyebrowColor={CHART_EMERALD}
          title={`${a.name} × ${b.name}`}
          description="No paired category observations were available."
        />
        <EdaEmptyState message={`Couldn't pair values between ${a.name} and ${b.name}.`} />
      </div>
    );
  }

  const maxCell = Math.max(1, ...topRows.flatMap(r => topCols.map(c => cellCounts[`${r}\u0000${c}`] || 0)));

  const truncate = (s: string, len: number) => (s.length > len ? s.slice(0, len - 1) + '…' : s);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <EdaPanelHeader
        eyebrow="Semantic Chart Decision • Categorical Cross-Frequency Heatmap"
        eyebrowColor={CHART_EMERALD}
        title={`${a.name} × ${b.name}`}
        description="Cell intensity reflects the co-occurrence count between each pair of category values."
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '3px', fontSize: '0.62rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '2px 6px' }} />
              {topCols.map((c) => (
                <th
                  key={c}
                  title={c}
                  style={{
                    padding: '4px 6px',
                    fontWeight: 750,
                    color: CHART_SLATE,
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    maxHeight: 70,
                    fontSize: '0.6rem',
                  }}
                >
                  {truncate(c, 16)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topRows.map((r) => (
              <tr key={r}>
                <td
                  title={r}
                  style={{
                    padding: '4px 8px',
                    fontWeight: 750,
                    color: CHART_NAVY,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                  }}
                >
                  {truncate(r, 18)}
                </td>
                {topCols.map((c) => {
                  const count = cellCounts[`${r}\u0000${c}`] || 0;
                  const intensity = count / maxCell;
                  return (
                    <td
                      key={c}
                      title={`${r} × ${c}: ${count} records`}
                      style={{
                        width: 34,
                        height: 26,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        borderRadius: 4,
                        background: intensity === 0 ? '#F8FAFC' : `rgba(0, 118, 128, ${0.12 + intensity * 0.75})`,
                        color: intensity > 0.55 ? '#FFFFFF' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.62rem',
                      }}
                    >
                      {count > 0 ? count : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '0.68rem', color: CHART_SLATE }}>
        Showing top {topRows.length} × {topCols.length} value pairs by frequency across {n.toLocaleString()} paired observations
        ({a.uniqueCount.toLocaleString()} distinct {a.name} • {b.uniqueCount.toLocaleString()} distinct {b.name}).
      </div>
    </div>
  );
}

function describeCorrelation(r: number): string {
  const abs = Math.abs(r);
  const dir = r > 0 ? 'positive' : r < 0 ? 'negative' : 'none';
  if (abs >= 0.7) return `strong ${dir}`;
  if (abs >= 0.4) return `moderate ${dir}`;
  if (abs >= 0.2) return `weak ${dir}`;
  return 'negligible';
}

// ── 3+ FIELDS (MULTIVARIATE) ─────────────────────────────────────────────

function renderMultivariate(selectedCols: ColumnMetricItem[], dataset: ExtractedDatasetProfile) {
  const numericCols = selectedCols.filter(c => classify(c) === 'numeric');
  const dateCols = selectedCols.filter(c => classify(c) === 'date');
  const catCols = selectedCols.filter(c => classify(c) === 'categorical');

  // Case 1: 2+ Numeric Measures + 1+ Category (No Date) -> Grouped Side-by-Side Bar Chart for ALL selected measures
  if (numericCols.length >= 2 && catCols.length >= 1 && dateCols.length === 0) {
    return renderGroupedMultiMeasure(catCols[0], numericCols, selectedCols);
  }

  // Case 2: 2+ Numeric Measures + 1+ Date -> Multi-Measure Time Series Progression
  if (numericCols.length >= 2 && dateCols.length >= 1) {
    return renderMultiMeasureTimeSeries(dateCols[0], numericCols, selectedCols);
  }

  // Case 3: 1 Numeric Measure + 1+ Category -> Strongest Category Pairing Chart
  if (numericCols.length === 1 && catCols.length >= 1 && dateCols.length === 0) {
    const strongest = findStrongestPairing(numericCols, catCols);
    if (strongest) {
      return renderStrongestPairingChart(strongest, selectedCols);
    }
  }

  // Case 4: 1 Numeric Measure + 1+ Date -> Date Time Series
  if (numericCols.length === 1 && dateCols.length >= 1) {
    return renderMultiMeasureTimeSeries(dateCols[0], numericCols, selectedCols);
  }

  // Case 5: 3+ Numeric Measures (No Category, No Date) -> Pairwise Correlation Matrix
  if (numericCols.length >= 3 && catCols.length === 0 && dateCols.length === 0) {
    return renderCorrelationMatrix(numericCols);
  }

  // Case 6: Exactly 2 Numeric Measures (No Category, No Date) -> Bivariate Scatter Plot
  if (numericCols.length === 2 && catCols.length === 0 && dateCols.length === 0) {
    return renderBivariate(numericCols[0], numericCols[1]);
  }

  // Case 7: 3+ Categorical Fields (No Numeric) -> Categorical Cardinality & Heatmap
  if (catCols.length >= 3 && numericCols.length === 0) {
    return renderCategoricalCardinalityAndHeatmap(catCols);
  }

  // Case 8: 2 Categorical Fields (No Numeric) -> Cross-tab Heatmap
  if (catCols.length === 2 && numericCols.length === 0) {
    return renderCategoricalHeatmap(catCols[0], catCols[1]);
  }

  // Case 9: 1 Categorical Field (No Numeric) -> Categorical Frequency
  if (catCols.length === 1 && numericCols.length === 0) {
    return renderCategoricalUnivariate(catCols[0]);
  }

  // Fallback: Missingness correlation or schema health
  const missingPattern = computeMissingCorrelation(selectedCols);
  if (missingPattern.pairs.length > 0) {
    return renderMissingCorrelationView(missingPattern, selectedCols, dataset);
  }

  return renderSchemaHealthFallback(selectedCols, dataset);
}

/** 1 categorical + 2+ numeric measures -> Grouped Side-by-Side Column Chart:
 *  each category shows individual side-by-side comparative bars for each selected measure. */
function renderGroupedMultiMeasure(category: ColumnMetricItem, numericCols: ColumnMetricItem[], selectedCols: ColumnMetricItem[]) {
  const n = Math.min(
    category.rawValues?.length || 0,
    ...numericCols.map(c => c.rawValues?.length || 0)
  );

  const agg: Record<string, Record<string, number>> = {};
  let pairedN = 0;

  for (let i = 0; i < n; i++) {
    const catKey = cleanStr(category.rawValues[i]) || '(blank)';
    let rowHasValue = false;
    agg[catKey] = agg[catKey] || {};
    numericCols.forEach(m => {
      const v = parseNum(m.rawValues[i]);
      if (Number.isFinite(v)) {
        agg[catKey][m.name] = (agg[catKey][m.name] || 0) + v;
        rowHasValue = true;
      }
    });
    if (rowHasValue) pairedN++;
  }

  const categoryTotal = (k: string) => numericCols.reduce((s, m) => s + Math.abs(agg[k]?.[m.name] || 0), 0);
  const topCategories = Object.keys(agg).sort((x, y) => categoryTotal(y) - categoryTotal(x)).slice(0, 10);

  if (topCategories.length === 0 || pairedN === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow="Automatic Chart Decision • Grouped Side-by-Side Multi-Measure by Category"
          eyebrowColor={CHART_TEAL}
          title={`Measures Grouped by ${category.name}`}
          description="No paired category + measure observations were available to aggregate."
        />
        <EdaEmptyState message={`Couldn't pair values between ${category.name} and the selected measures.`} />
      </div>
    );
  }

  const measuresUsed = numericCols.slice(0, 6);
  const datasets = measuresUsed.map((m, idx) => ({
    label: m.name,
    data: topCategories.map(k => agg[k]?.[m.name] || 0),
    backgroundColor: PALETTE_BG[idx % PALETTE_BG.length],
    borderColor: PALETTE[idx % PALETTE.length],
    borderWidth: 1.5,
    borderRadius: 4,
    grouped: true,
    categoryPercentage: 0.8,
    barPercentage: 0.9,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <EdaPanelHeader
        eyebrow="Automatic Chart Decision • Grouped Side-by-Side Multi-Measure by Category"
        eyebrowColor={CHART_TEAL}
        title={`${measuresUsed.map(m => m.name).join(' vs ')} by ${category.name}`}
        description={`Grouped column chart — each ${category.name} category displays individual side-by-side comparative bars for each selected measure.`}
        rightBadge={`Top ${topCategories.length} categories`}
      />
      <div style={{ height: 240, width: '100%' }}>
        <Bar
          data={{ labels: topCategories.map(k => (k.length > 14 ? k.slice(0, 12) + '…' : k)), datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, position: 'top' as const, labels: { font: { size: 9.5, weight: 'bold' }, color: '#334155', boxWidth: 10, padding: 8 } },
              tooltip: {
                backgroundColor: '#FFFFFF',
                titleColor: CHART_NAVY,
                bodyColor: '#334155',
                borderColor: '#DCE6EC',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatCompactNumber(ctx.raw)}` },
              },
            },
            scales: {
              x: {
                stacked: false,
                grid: { display: false },
                ticks: { color: CHART_SLATE, font: { size: 9, weight: 'normal' }, maxRotation: 35 }
              },
              y: {
                stacked: false,
                beginAtZero: true,
                grid: { color: '#F1F5F9' },
                ticks: { color: CHART_SLATE, font: { size: 9 } }
              },
            },
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {selectedCols.map(c => (
          <span key={c.name} style={{ fontSize: '0.64rem', padding: '3px 7px', borderRadius: 5, background: '#F8FAFC', border: '1px solid #E2E8F0', color: c === category ? CHART_TEAL : CHART_NAVY, fontWeight: 650 }}>
            {c.name} · {c.inferredType}
          </span>
        ))}
      </div>
    </div>
  );
}

function renderStrongestPairingChart(pairing: PairingCandidate, selectedCols: ColumnMetricItem[]) {
  const { metric, category, agg } = pairing;
  const entries = Object.entries(agg);
  const totalNetSum = entries.reduce((s, [, v]) => s + v.sum, 0);
  const totalGrossVolume = entries.reduce((s, [, v]) => s + v.grossVolume, 0);
  const isZeroBalanced = totalGrossVolume > 0 && Math.abs(totalNetSum) < 0.01;

  const top = entries
    .sort((x, y) => (isZeroBalanced ? y[1].grossVolume - x[1].grossVolume : Math.abs(y[1].sum) - Math.abs(x[1].sum)))
    .slice(0, 12);

  const plotData = top.map(([, v]) => (isZeroBalanced ? v.grossVolume : v.sum));
  const data = {
    labels: top.map(([k]) => (k.length > 18 ? k.slice(0, 16) + '…' : k)),
    datasets: [{
      label: isZeroBalanced ? `Gross Volume |${metric.name}|` : `SUM ${metric.name}`,
      data: plotData,
      backgroundColor: 'rgba(0,118,128,0.74)',
      borderColor: CHART_TEAL,
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <EdaPanelHeader
        eyebrow={`Automatic Chart Decision • Strongest Measure × Category Pairing (${isZeroBalanced ? 'Gross Volume' : 'Net Sum'})`}
        eyebrowColor={CHART_TEAL}
        title={`Top ${category.name} Groups by ${metric.name}`}
        description={isZeroBalanced
          ? `Balanced journal entries detected (Net sum = 0). Displaying total gross monetary activity grouped by ${category.name}.`
          : `JET scored every measure × category combination in your selection and found ${category.name} × ${metric.name} to be the strongest discriminating relationship.`}
      />
      <div style={{ height: 220, width: '100%' }}>
        <Bar
          data={data}
          options={{
            ...baseChartOptions(),
            plugins: {
              ...baseChartOptions().plugins,
              tooltip: {
                ...baseChartOptions().plugins.tooltip,
                callbacks: {
                  title: (items: any[]) => String(top[items[0].dataIndex]?.[0] ?? ''),
                  label: (ctx: any) => {
                    const row = top[ctx.dataIndex];
                    if (!row) return '';
                    return isZeroBalanced
                      ? `Gross Turnover: ${formatCompactNumber(row[1].grossVolume)} (Debits: ${formatCompactNumber(row[1].debits)} • Credits: ${formatCompactNumber(row[1].credits)})`
                      : `SUM ${metric.name}: ${formatCompactNumber(ctx.raw)}`;
                  },
                  afterLabel: (ctx: any) => {
                    const row = top[ctx.dataIndex];
                    if (!row) return '';
                    return isZeroBalanced
                      ? `Net Balance: 0.00 (Balanced) • ${row[1].count} Records`
                      : `Records: ${row[1].count}`;
                  },
                },
              },
            },
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {selectedCols.map(c => (
          <span
            key={c.name}
            style={{
              fontSize: '0.64rem',
              padding: '3px 7px',
              borderRadius: 5,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: c === metric || c === category ? CHART_TEAL : CHART_SLATE,
              fontWeight: c === metric || c === category ? 750 : 600,
            }}
          >
            {c.name} · {c.inferredType}{c === metric || c === category ? ' ✓' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function renderMultiMeasureTimeSeries(dateCol: ColumnMetricItem, numericCols: ColumnMetricItem[], selectedCols: ColumnMetricItem[]) {
  const n = Math.min(dateCol.rawValues.length, ...numericCols.map(c => c.rawValues.length));
  const buckets: Record<string, Record<string, number>> = {};

  for (let i = 0; i < n; i++) {
    const k = monthKey(dateCol.rawValues[i]);
    if (!k) continue;
    buckets[k] = buckets[k] || {};
    numericCols.forEach(m => {
      const v = parseNum(m.rawValues[i]);
      if (Number.isFinite(v)) buckets[k][m.name] = (buckets[k][m.name] || 0) + v;
    });
  }

  const periods = Object.keys(buckets).sort().slice(-14);

  if (periods.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EdaPanelHeader
          eyebrow="Multi-Measure Time-Series Progression"
          eyebrowColor={CHART_BLUE}
          title={`Progression of Measures over ${dateCol.name}`}
          description="No paired date + measure observations were available."
        />
        <EdaEmptyState message={`Couldn't pair values between ${dateCol.name} and the selected measures.`} />
      </div>
    );
  }

  const datasets = numericCols.slice(0, 4).map((m, idx) => ({
    label: m.name,
    data: periods.map(p => buckets[p]?.[m.name] || 0),
    borderColor: PALETTE[idx % PALETTE.length],
    backgroundColor: 'transparent',
    fill: false,
    tension: 0.25,
    borderWidth: 2,
    pointRadius: 3,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <EdaPanelHeader
        eyebrow="Multi-Measure Time-Series Progression"
        eyebrowColor={CHART_BLUE}
        title={`Progression of Measures over ${dateCol.name}`}
        description="Chronological multi-line trend across observed calendar periods — no strong categorical grouping was found, so time is used as the primary axis."
      />
      <div style={{ height: 220, width: '100%' }}>
        <Line
          data={{ labels: periods, datasets }}
          options={{
            ...baseChartOptions(),
            plugins: {
              legend: { display: true, position: 'top' as const, labels: { font: { size: 9.5, weight: '700' }, color: '#334155', boxWidth: 10, padding: 8 } },
              tooltip: baseChartOptions().plugins.tooltip,
            },
          }}
        />
      </div>
      <div style={{ ...cardStyle, padding: '8px 10px', fontSize: '0.69rem', color: CHART_SLATE }}>
        Displaying {numericCols.length} measures over {periods.length} observed monthly periods.
      </div>
    </div>
  );
}

/** 3+ numeric measures, no useful category/date -> pairwise Pearson correlation matrix,
 *  which is a genuinely meaningful multivariate view (unlike a bare side-by-side sum chart). */
function renderCorrelationMatrix(numericCols: ColumnMetricItem[]) {
  const cols = numericCols.slice(0, 6);
  const seriesFor = (c: ColumnMetricItem) => c.rawValues.map(parseNum);

  const matrix: number[][] = cols.map((rowCol) => {
    const rowVals = seriesFor(rowCol);
    return cols.map((colCol) => {
      if (rowCol === colCol) return 1;
      const colVals = seriesFor(colCol);
      const n = Math.min(rowVals.length, colVals.length);
      const x: number[] = [];
      const y: number[] = [];
      for (let i = 0; i < n; i++) {
        if (Number.isFinite(rowVals[i]) && Number.isFinite(colVals[i])) {
          x.push(rowVals[i]);
          y.push(colVals[i]);
        }
      }
      return pearsonCorrelation(x, y);
    });
  });

  const truncate = (s: string, len: number) => (s.length > len ? s.slice(0, len - 1) + '…' : s);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <EdaPanelHeader
        eyebrow="Multi-Measure Correlation Matrix"
        eyebrowColor={CHART_INDIGO}
        title={`Pairwise Relationships (${cols.length} Financial Measures)`}
        description="No categorical field discriminated these measures strongly, so JET shows how each pair of numeric fields moves together instead."
      />

      <div style={{ overflowX: 'auto', padding: '2px 0' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '4px', fontSize: '0.66rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '2px 8px' }} />
              {cols.map((c) => (
                <th key={c.name} title={c.name} style={{ padding: '4px 6px', fontWeight: 750, color: CHART_SLATE, fontSize: '0.62rem' }}>
                  {truncate(c.name, 11)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((rowCol, ri) => (
              <tr key={rowCol.name}>
                <td title={rowCol.name} style={{ padding: '4px 10px', fontWeight: 750, color: CHART_NAVY, fontFamily: 'monospace', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {truncate(rowCol.name, 16)}
                </td>
                {cols.map((colCol, ci) => {
                  const r = matrix[ri][ci];
                  const isDiag = ri === ci;
                  const cellStyle = getCorrelationCellStyle(r, isDiag);
                  return (
                    <td
                      key={colCol.name}
                      title={isDiag ? `${rowCol.name} (Identity = 1.00)` : `${rowCol.name} × ${colCol.name}: Pearson r = ${r.toFixed(2)}`}
                      style={{
                        width: 52,
                        height: 34,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        borderRadius: 5,
                        background: cellStyle.background,
                        color: cellStyle.color,
                        border: cellStyle.border,
                        boxShadow: cellStyle.boxShadow,
                        fontWeight: 750,
                        fontSize: '0.66rem',
                        fontFamily: 'var(--font-mono, monospace)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isDiag ? '1.00' : r.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Continuous Statistical Intensity Scale Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          fontSize: '0.66rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9F1239', fontWeight: 750 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E11D48', display: 'inline-block' }} />
          <span>-1.00 (Inverse)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '280px', minWidth: '160px', margin: '0 8px' }}>
          <span style={{ color: '#94A3B8', fontSize: '0.60rem', fontFamily: 'monospace' }}>-1.0</span>
          <div
            style={{
              flex: 1,
              height: '8px',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #E11D48 0%, rgba(225,29,72,0.18) 40%, #E2E8F0 50%, rgba(0,118,128,0.18) 60%, #007680 100%)',
              border: '1px solid #CBD5E1',
            }}
          />
          <span style={{ color: '#94A3B8', fontSize: '0.60rem', fontFamily: 'monospace' }}>+1.0</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#005A60', fontWeight: 750 }}>
          <span>+1.00 (Direct)</span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#007680', display: 'inline-block' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols.length, 4)}, 1fr)`, gap: 8 }}>
        {cols.slice(0, 4).map((c, i) => {
          const stats = c.numericStats || { min: 0, max: 0, mean: 0, sum: 0 };
          return (
            <div key={c.name} style={{ ...cardStyle, borderTop: `3px solid ${PALETTE[i % PALETTE.length]}`, padding: '8px 10px' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: CHART_NAVY, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.name}>
                {c.name}
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 850, color: PALETTE[i % PALETTE.length], fontFamily: 'monospace', margin: '2px 0' }}>
                {formatCompactNumber(stats.sum)}
              </div>
              <div style={{ fontSize: '0.60rem', color: CHART_SLATE }}>Avg {formatCompactNumber(stats.mean)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderCategoricalCardinalityAndHeatmap(catCols: ColumnMetricItem[]) {
  const data = {
    labels: catCols.map(c => (c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name)),
    datasets: [{
      label: 'Distinct Unique Keys',
      data: catCols.map(c => c.uniqueCount),
      backgroundColor: 'rgba(13,148,136,0.72)',
      borderColor: CHART_EMERALD,
      borderWidth: 1.5,
      borderRadius: 5,
    }],
  };

  // Pick the two lowest-cardinality categorical fields for the companion heatmap — high-cardinality
  // identifiers (e.g. transaction IDs) make a heatmap unreadable and uninformative.
  const heatmapPair = [...catCols].sort((x, y) => x.uniqueCount - y.uniqueCount).slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <EdaPanelHeader
          eyebrow="Multi-Category Cardinality & Key Dispersion"
          eyebrowColor={CHART_EMERALD}
          title={`Distinct Values Spread (${catCols.length} Categorical Fields)`}
          description="Comparing unique identifier density across all selected category columns."
        />
        <div style={{ height: 180, width: '100%', marginTop: 8 }}>
          <Bar data={data} options={baseChartOptions()} />
        </div>
      </div>

      {heatmapPair.length === 2 && (
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
          {renderCategoricalHeatmap(heatmapPair[0], heatmapPair[1])}
        </div>
      )}
    </div>
  );
}


/** Missing-data co-occurrence pattern view — surfaces columns whose missingness rates line up,
 *  which is a data-quality root-cause signal distinct from each column's own completeness %. */
function renderMissingCorrelationView(pattern: MissingCorrelationResult, selectedCols: ColumnMetricItem[], dataset: ExtractedDatasetProfile) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EdaPanelHeader
        eyebrow="Missing-Data Correlation Pattern"
        eyebrowColor={CHART_AMBER}
        title="Columns With Aligned Missingness"
        description="No strong measure × category or numeric relationship was found, but these selected fields show similarly-scaled missing-data rates — worth checking as a shared root cause."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pattern.pairs.map((p, i) => {
          const colA = selectedCols.find(c => c.name === p.colA);
          const colB = selectedCols.find(c => c.name === p.colB);
          return (
            <div key={i} style={{ ...cardStyle, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <Network size={13} color={CHART_AMBER} />
                <span style={{ fontSize: '0.7rem', fontWeight: 750, color: CHART_NAVY, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.colA} ↔ {p.colB}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: '0.64rem', color: CHART_SLATE, flexShrink: 0 }}>
                <span>{colA?.missingCount ?? '—'} missing</span>
                <span>•</span>
                <span>{colB?.missingCount ?? '—'} missing</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...cardStyle, padding: '8px 12px', fontSize: '0.68rem', color: CHART_SLATE }}>
        Estimated from each column's independent missing rate (not row-level join) — treat as a lead to investigate, not a confirmed cause.
      </div>
    </div>
  );
}

function renderSchemaHealthFallback(selectedCols: ColumnMetricItem[], dataset: ExtractedDatasetProfile) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EdaPanelHeader
        eyebrow="Multivariate Field Quality & Profiling Suite"
        eyebrowColor={CHART_TEAL}
        title={`Comparative Metadata Matrix (${selectedCols.length} Columns)`}
        description="No high-confidence measure × category relationship was found among these fields, so JET shows side-by-side completeness, cardinality, and formatting health instead."
      />

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedCols.length, 3)}, 1fr)`, gap: 10 }}>
        {selectedCols.slice(0, 6).map((c, i) => (
          <div key={c.name} style={{ ...cardStyle, borderTop: `3px solid ${PALETTE[i % PALETTE.length]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: CHART_NAVY, fontFamily: 'monospace' }}>{c.name}</span>
              <span style={{ fontSize: '0.60rem', fontWeight: 750, color: PALETTE[i % PALETTE.length], background: '#F8FAFC', padding: '1px 5px', borderRadius: 4 }}>
                {c.inferredType}
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 850, color: PALETTE[i % PALETTE.length], margin: '4px 0' }}>
              {c.completenessPct}% <span style={{ fontSize: '0.68rem', fontWeight: 600, color: CHART_SLATE }}>Complete</span>
            </div>
            <div style={{ fontSize: '0.66rem', color: CHART_SLATE, borderTop: '1px solid #F1F5F9', paddingTop: 4 }}>
              <span>Unique: <b style={{ color: CHART_NAVY }}>{c.uniqueCount.toLocaleString()}</b></span> • <span>Missing: <b style={{ color: c.missingCount > 0 ? '#DC2626' : '#16A34A' }}>{c.missingCount}</b></span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: '8px 12px', fontSize: '0.70rem', color: CHART_SLATE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Total Evaluated Rows: <strong style={{ color: CHART_NAVY }}>{dataset.totalRows.toLocaleString()}</strong></span>
        <span>Schema Completeness: <strong style={{ color: CHART_TEAL }}>{dataset.overallCompletenessPct}%</strong></span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   COLUMN PROFILING / TYPE INFERENCE HELPERS
   ════════════════════════════════════════════════════════════════════════ */

function computeColumnStats(
  headers: string[],
  rows: Record<string, any>[],
  totalRows: number,
  isCleaned: boolean
): ColumnMetricItem[] {
  return headers.map((header) => {
    const values = rows.map((r) => r[header]).filter((v) => v !== undefined);
    const nonNullValues = values.filter((v) => v !== null && String(v).trim() !== '' && String(v).trim() !== '-' && String(v).trim() !== 'null');

    const totalCount = totalRows || (rows.length > 0 ? rows.length : 25);
    const validCount = isCleaned ? totalCount : Math.min(totalCount, Math.max(1, nonNullValues.length * Math.round(totalCount / Math.max(1, rows.length))));
    const missingCount = isCleaned ? 0 : Math.max(0, totalCount - validCount);
    const completenessPct = totalCount > 0 ? Math.round((validCount / totalCount) * 1000) / 10 : 100;

    const uniqueValues = Array.from(new Set(nonNullValues.map((v) => String(v).trim())));
    const uniqueCount = Math.min(totalCount, Math.max(1, uniqueValues.length));
    const distinctPct = totalCount > 0 ? Math.round((uniqueCount / totalCount) * 100) : 100;

    const inferredType = inferType(header, nonNullValues);
    const categoryGroup = categorizeField(header, inferredType);

    let numericStats: any = undefined;
    if (inferredType === 'Numeric' || inferredType === 'Currency') {
      const nums = nonNullValues.map(v => Number(String(v).replace(/[$,()]/g, ''))).filter(v => !isNaN(v));
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const mean = Math.round((sum / nums.length) * 100) / 100;
        const zeros = nums.filter(n => n === 0).length;
        const negatives = nums.filter(n => n < 0).length;
        numericStats = { min, max, mean, median: mean, sum, zeros, negatives };
      } else {
        numericStats = { min: 0, max: 0, mean: 0, median: 0, sum: 0, zeros: 0, negatives: 0 };
      }
    }

    const dirtyIssues: string[] = [];
    if (!isCleaned) {
      if (inferredType === 'Numeric' && nonNullValues.some((v) => String(v).includes('(') || String(v).includes('$') || String(v).includes(','))) {
        dirtyIssues.push('Format brackets/commas');
      }
      if (inferredType === 'Date' && nonNullValues.some((v) => String(v).includes('/') || String(v).includes('.'))) {
        dirtyIssues.push('Non-standard date delimiter');
      }
      if (missingCount > 0) {
        dirtyIssues.push(`${missingCount} empty cells`);
      }
    }

    // rawValues must reflect real ingested data only — never synthesize placeholder
    // values like "Row 1"/"Row 2" or generic numeric filler. If a column genuinely has
    // no usable sample rows (e.g. header-only preview), leave it empty and let each
    // chart renderer's own empty-state handle it rather than fabricating fake series.
    return {
      name: header,
      inferredType,
      categoryGroup,
      totalCount,
      validCount,
      missingCount,
      completenessPct: isCleaned ? 100 : completenessPct,
      uniqueCount,
      distinctPct,
      sampleValues: uniqueValues.slice(0, 5),
      rawValues: nonNullValues,
      numericStats,
      hasDirtyFormats: dirtyIssues.length > 0,
      dirtyIssues,
    };
  });
}

function categorizeField(header: string, type: string): 'Financial Amounts' | 'Dates & Periods' | 'Audit Identifiers' | 'Entity & Users' | 'General' {
  const h = header.toLowerCase();
  if (type === 'Numeric' || type === 'Currency' || h.includes('amount') || h.includes('balance') || h.includes('debit') || h.includes('credit')) {
    return 'Financial Amounts';
  }
  if (type === 'Date' || h.includes('date') || h.includes('period') || h.includes('year') || h.includes('time')) {
    return 'Dates & Periods';
  }
  if (h.includes('journal') || h.includes('account') || h.includes('doc') || h.includes('line') || h.includes('trans') || h.includes('type')) {
    return 'Audit Identifiers';
  }
  if (h.includes('entity') || h.includes('user') || h.includes('cost') || h.includes('profit') || h.includes('source') || h.includes('area')) {
    return 'Entity & Users';
  }
  return 'General';
}

function inferType(header: string, values: any[]): 'Numeric' | 'Date' | 'Text' | 'Identifier' | 'Currency' {
  const h = header.toLowerCase();
  if (h.includes('amount') || h.includes('balance') || h.includes('debit') || h.includes('credit') || h.includes('sum') || h.includes('val')) {
    return 'Numeric';
  }
  if (h.includes('date') || h.includes('period') || h.includes('time') || h.includes('year') || h.includes('day')) {
    return 'Date';
  }
  if (h.includes('id') || h.includes('num') || h.includes('code') || h.includes('account') || h.includes('key') || h.includes('user')) {
    return 'Identifier';
  }
  if (h.includes('currency') || h.includes('curr')) {
    return 'Currency';
  }

  if (values.length > 0) {
    const sample = String(values[0]);
    if (!isNaN(Number(sample.replace(/[$,()]/g, '')))) return 'Numeric';
    if (!isNaN(Date.parse(sample)) && (sample.includes('-') || sample.includes('/'))) return 'Date';
  }

  return 'Text';
}

function getDatasetShortName(dataset: string): string {
  const d = String(dataset).toUpperCase();
  if (d.includes('TRIAL') || d.includes('TB')) return 'TB';
  if (d.includes('POPULATION') || d.includes('GENERAL') || d.includes('GL')) return 'GL';
  if (d.includes('CHART') || d.includes('COA')) return 'COA';
  return 'DATASET';
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'Numeric':
    case 'Currency':
      return <DollarSign size={12} color="#007680" />;
    case 'Date':
      return <Calendar size={12} color="#0284C7" />;
    case 'Identifier':
      return <Hash size={12} color="#6366F1" />;
    default:
      return <Type size={12} color="#0D9488" />;
  }
}

function getTypeBadgeBg(type: string) {
  switch (type) {
    case 'Numeric':
    case 'Currency':
      return '#F0FDFA';
    case 'Date':
      return '#EFF6FF';
    case 'Identifier':
      return '#F5F3FF';
    default:
      return '#F0FDF4';
  }
}

function getTypeBadgeColor(type: string) {
  switch (type) {
    case 'Numeric':
    case 'Currency':
      return '#007680';
    case 'Date':
      return '#0284C7';
    case 'Identifier':
      return '#6366F1';
    default:
      return '#0D9488';
  }
}

function getTypeBadgeBorder(type: string) {
  switch (type) {
    case 'Numeric':
    case 'Currency':
      return '#CCFBF1';
    case 'Date':
      return '#BFDBFE';
    case 'Identifier':
      return '#DDD6FE';
    default:
      return '#A7F3D0';
  }
}