import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RunService } from '../services/runService';
import { LogEntry, RunSummary } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { FileText, Download, Search, RefreshCw, Filter, Terminal } from 'lucide-react';

export const LogsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRunId = searchParams.get('runId') || '';

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(initialRunId);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchRuns = async () => {
    try {
      const data = await RunService.listRuns();
      setRuns(data);
    } catch {
      // ignore
    }
  };

  const fetchLogs = async () => {
    try {
      const logData = await RunService.getLogs(selectedRunId || undefined, selectedLevel || undefined, searchQuery || undefined);
      setLogs(logData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedRunId, selectedLevel, searchQuery]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedRunId, selectedLevel, searchQuery]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'var(--deloitte-teal-light)',
            border: '1px solid rgba(0, 118, 128, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--deloitte-teal)',
          }}>
            <Terminal size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>Structured Execution Logs</h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Traceable, audit-grade plain text execution logs with ISO timestamps and component tags.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Live Auto-Refresh (4s)
          </label>

          {selectedRunId && (
            <a
              href={RunService.getDownloadLogUrl(selectedRunId, 'execution')}
              className="btn-primary"
              style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '0.84rem' }}
            >
              <Download size={15} /> Download Run TXT Log
            </a>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '18px 24px', marginBottom: '20px', background: '#FFFFFF', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          {/* Run Selector */}
          <div style={{ minWidth: '240px' }}>
            <label className="jet-label">Filter by Run</label>
            <select
              className="jet-select"
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
            >
              <option value="">-- All System & Run Logs --</option>
              {runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  {r.runId} ({r.workflow.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div style={{ width: '150px' }}>
            <label className="jet-label">Log Level</label>
            <select
              className="jet-select"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </div>

          {/* Search Query */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <label className="jet-label">Search in Messages</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="jet-input"
                style={{ paddingLeft: '32px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search component, keyword, exception, DQC..."
              />
            </div>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={() => {
                setSelectedRunId('');
                setSelectedLevel('');
                setSearchQuery('');
              }}
              className="btn-secondary"
              style={{ padding: '9px 14px', fontSize: '0.84rem' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div
        className="glass-panel"
        style={{
          background: '#F8FAFC',
          border: '1px solid #CBD5E1',
          padding: '18px 20px',
          minHeight: '480px',
          maxHeight: '680px',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.03)',
        }}
      >
        {logs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {logs.map((entry, idx) => {
              let levelColor = '#0284C7';
              let rowBg = idx % 2 === 0 ? '#FFFFFF' : 'transparent';
              if (entry.level === 'ERROR') levelColor = '#E11D48';
              if (entry.level === 'WARN') levelColor = '#D97706';
              if (entry.level === 'INFO') levelColor = '#0D9488';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '12px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    backgroundColor: rowBg,
                    borderLeft: `3px solid ${levelColor}`,
                    boxShadow: idx % 2 === 0 ? '0 1px 2px rgba(0, 0, 0, 0.02)' : 'none',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    {entry.timestamp}
                  </span>
                  <span style={{ color: 'var(--deloitte-teal)', fontWeight: 700, minWidth: '140px' }}>
                    [{entry.runId}]
                  </span>
                  <span style={{ color: levelColor, fontWeight: 800, minWidth: '55px' }}>
                    {entry.level}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 700, minWidth: '160px' }}>
                    [{entry.component}]
                  </span>
                  <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontWeight: 500 }}>
                    {entry.message}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
            No log entries match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};
