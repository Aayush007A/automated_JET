import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { BenfordSummary, BenfordDigitStat } from '../../../types';
import { CheckCircle2, ShieldCheck, BarChart3 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface OmniaBenfordChartProps {
  summary?: BenfordSummary;
  rawRows?: Record<string, any>[];
}

const THEORETICAL_BENFORD: Record<number, number> = {
  1: 30.1,
  2: 17.6,
  3: 12.5,
  4: 9.7,
  5: 7.9,
  6: 6.7,
  7: 5.8,
  8: 5.1,
  9: 4.6,
};

export const OmniaBenfordChart: React.FC<OmniaBenfordChartProps> = ({
  summary,
  rawRows,
}) => {
  // If rawRows is provided from Omnia_Benford_Analysis.csv, calculate/standardize stats
  const digitStats: BenfordDigitStat[] = useMemo(() => {
    if (summary?.digitStats && summary.digitStats.length > 0) {
      return summary.digitStats;
    }
    if (summary?.firstDigitDistribution && summary.firstDigitDistribution.length > 0) {
      return summary.firstDigitDistribution;
    }

    if (rawRows && rawRows.length > 0) {
      const stats: BenfordDigitStat[] = [];
      for (let d = 1; d <= 9; d++) {
        const row = rawRows.find((r) => Number(r.Digit || r.digit || r.First_Digit) === d);
        const count = row ? Number(row.Count || row.count || row.Actual_Count || 0) : 0;
        const actualPct = row ? Number(row.Actual_Pct || row.actualPct || row.Actual_Percentage || 0) : 0;
        const expectedPct = THEORETICAL_BENFORD[d];
        const variance = actualPct - expectedPct;
        const isAnomaly = Math.abs(variance) > 3.0;

        stats.push({
          digit: d,
          count,
          actualPct,
          expectedPct,
          variancePct: variance,
          diffPct: variance,
          isAnomaly,
        });
      }
      return stats;
    }

    // Default distribution
    return [
      { digit: 1, count: 302, actualPct: 16.7, expectedPct: 30.1, variancePct: -13.4, diffPct: -13.4, isAnomaly: true },
      { digit: 2, count: 174, actualPct: 22.2, expectedPct: 17.6, variancePct: 4.6, diffPct: 4.6, isAnomaly: true },
      { digit: 3, count: 128, actualPct: 5.6, expectedPct: 12.5, variancePct: -6.9, diffPct: -6.9, isAnomaly: true },
      { digit: 4, count: 95, actualPct: 11.1, expectedPct: 9.7, variancePct: 1.4, diffPct: 1.4, isAnomaly: false },
      { digit: 5, count: 78, actualPct: 16.7, expectedPct: 7.9, variancePct: 8.8, diffPct: 8.8, isAnomaly: true },
      { digit: 6, count: 69, actualPct: 11.1, expectedPct: 6.7, variancePct: 4.4, diffPct: 4.4, isAnomaly: true },
      { digit: 7, count: 59, actualPct: 5.8, expectedPct: 5.8, variancePct: 0.0, diffPct: 0.0, isAnomaly: false },
      { digit: 8, count: 50, actualPct: 11.1, expectedPct: 5.1, variancePct: 6.0, diffPct: 6.0, isAnomaly: true },
      { digit: 9, count: 45, actualPct: 5.6, expectedPct: 4.6, variancePct: 1.0, diffPct: 1.0, isAnomaly: false },
    ];
  }, [summary, rawRows]);

  const totalTested = summary?.totalTransactionsTested || summary?.totalAnalyzed || digitStats.reduce((acc: number, curr: BenfordDigitStat) => acc + curr.count, 0);
  const mad = (summary as any)?.meanAbsoluteDeviation ?? summary?.madScore ?? 0.0078;
  const conformityRate = summary?.conformityScore ?? 96.8;

  // Chart data exactly matching Forensic Hub (Image 2)
  const chartData = {
    labels: digitStats.map((s) => `Digit ${s.digit}`),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Actual Population Frequency (%)',
        data: digitStats.map((s) => s.actualPct),
        backgroundColor: digitStats.map((s) => {
          return s.isAnomaly ? 'rgba(244, 63, 94, 0.85)' : 'rgba(0, 118, 128, 0.82)';
        }),
        borderColor: digitStats.map((s) => {
          return s.isAnomaly ? '#E11D48' : '#007680';
        }),
        borderWidth: 1.5,
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Theoretical Benford Standard (%)',
        data: digitStats.map((s) => s.expectedPct),
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
            const stat = digitStats[item.dataIndex];
            const diff = (stat.actualPct - stat.expectedPct).toFixed(1);
            return [
              `Observed: ${stat.actualPct.toFixed(1)}% (${stat.count.toLocaleString()} entries)`,
              `Theoretical: ${stat.expectedPct.toFixed(1)}%`,
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
      {/* Top Banner KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{
          padding: '16px', borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
            BENFORD CONFORMITY SCORE
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 850, color: conformityRate >= 85 ? '#007680' : '#DC2626', fontFamily: 'monospace' }}>
            {conformityRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.70rem', color: conformityRate >= 85 ? '#16A34A' : '#92400E', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> {conformityRate >= 85 ? 'High Conformity (Natural Distribution)' : 'Marginal Deviation Detected'}
          </div>
        </div>

        <div style={{
          padding: '16px', borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
            TOTAL TESTED POPULATION
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace' }}>
            {totalTested.toLocaleString()} Lines
          </div>
          <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '2px' }}>
            Excludes $0 amounts &amp; non-digits
          </div>
        </div>

        <div style={{
          padding: '16px', borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
            MEAN ABSOLUTE DEVIATION (MAD)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#0F172A', fontFamily: 'monospace' }}>
            {mad.toFixed(4)}
          </div>
          <div style={{ fontSize: '0.70rem', color: mad <= 0.012 ? '#16A34A' : '#DC2626', fontWeight: 600, marginTop: '2px' }}>
            {mad <= 0.006 ? 'Close conformity (< 0.006)' : mad <= 0.012 ? 'Acceptable conformity' : 'Non-conforming'}
          </div>
        </div>

        <div style={{
          padding: '16px', borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
            ANOMALY SPIKES (DEVIATION &gt; 3%)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 850, color: digitStats.filter((s: BenfordDigitStat) => s.isAnomaly).length > 0 ? '#DC2626' : '#16A34A', fontFamily: 'monospace' }}>
            {digitStats.filter((s: BenfordDigitStat) => s.isAnomaly).length} Digits
          </div>
          <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '2px' }}>
            Artificial threshold clustering
          </div>
        </div>
      </div>

      {/* ── Side-by-Side Dual Pane: Benford Plot (Left) & Detailed Digit Frequency Table (Right) ── */}
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
            <Chart type="bar" data={chartData as any} options={chartOptions} />
          </div>
        </div>

        {/* Right: Detailed Digit Frequency Table */}
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
                  <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>Actual Count</th>
                  <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>Observed (%)</th>
                  <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>Expected (%)</th>
                  <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>Variance (pp)</th>
                  <th style={{ width: '28%', padding: '10px 14px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {digitStats.map((s: BenfordDigitStat, idx) => {
                  const variance = s.variancePct ?? s.diffPct ?? 0;
                  return (
                    <tr key={s.digit} style={{ borderBottom: idx < 8 ? '1px solid #F1F5F9' : 'none', background: s.isAnomaly ? 'rgba(254, 242, 242, 0.6)' : '#FFFFFF' }}>
                      <td style={{ padding: '9.5px 14px', fontWeight: 750, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        Digit {s.digit}
                      </td>
                      <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>
                        {s.count.toLocaleString()}
                      </td>
                      <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#007680', whiteSpace: 'nowrap' }}>
                        {s.actualPct.toFixed(1)}%
                      </td>
                      <td style={{ padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {s.expectedPct.toFixed(1)}%
                      </td>
                      <td style={{
                        padding: '9.5px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700,
                        color: Number(variance) > 0 ? '#DC2626' : '#2563EB',
                        whiteSpace: 'nowrap',
                      }}>
                        {Number(variance) > 0 ? `+${Number(variance).toFixed(1)}` : Number(variance).toFixed(1)}
                      </td>
                      <td style={{ padding: '9.5px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.66rem', fontWeight: 750, padding: '2px 8px', borderRadius: '4px',
                          background: s.isAnomaly ? '#FEE2E2' : '#DCFCE7',
                          color: s.isAnomaly ? '#991B1B' : '#166534',
                          border: `1px solid ${s.isAnomaly ? '#FECDD3' : '#BBF7D0'}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {s.isAnomaly ? 'ANOMALY DETECTED' : 'CONFORMING'}
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
