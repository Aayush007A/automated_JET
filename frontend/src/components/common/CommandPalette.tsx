import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, ArrowRight, Layers, Table, CheckSquare, Settings, Play, Download, X, HelpCircle, ShieldCheck } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateStep?: (stepIndex: number) => void;
  onRunCleansing?: () => void;
  onStartPipeline?: () => void;
  onExportArtifacts?: () => void;
  currentStep?: number;
  workflowType?: 'OMNIA_JET' | 'SPARK_JET';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateStep,
  onRunCleansing,
  onStartPipeline,
  onExportArtifacts,
  currentStep = 1,
  workflowType = 'OMNIA_JET',
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keydown handler for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const items = [
    {
      category: 'Workflow Steps',
      title: 'Step 1: Upload Datasets & Parameters',
      subtitle: 'Ingest TB, GL, and COA raw files or multi-sheet workbooks',
      icon: Table,
      action: () => { onNavigateStep?.(1); onClose(); },
      tag: 'Step 1',
    },
    {
      category: 'Workflow Steps',
      title: 'Step 2: Data File Column Mapping',
      subtitle: 'Map source columns to Deloitte CDM standard schema',
      icon: Layers,
      action: () => { onNavigateStep?.(2); onClose(); },
      tag: 'Step 2',
    },
    {
      category: 'Workflow Steps',
      title: 'Step 3: Auto-Cleansing & Constraints Check',
      subtitle: 'Run 16 schema integrity rules & automatic data sanitization',
      icon: Sparkles,
      action: () => { onNavigateStep?.(3); onClose(); },
      tag: 'Step 3',
    },
    {
      category: 'Workflow Steps',
      title: 'Step 4: Audit Parameters & Period Cutoff',
      subtitle: 'Configure testing periods, currency rules, and DQC thresholds',
      icon: Settings,
      action: () => { onNavigateStep?.(4); onClose(); },
      tag: 'Step 4',
    },
    {
      category: 'Workflow Steps',
      title: 'Step 5: DQC Execution Engine',
      subtitle: 'View live 5-stage pipeline processing and execution state',
      icon: Play,
      action: () => { onNavigateStep?.(5); onClose(); },
      tag: 'Step 5',
    },
    {
      category: 'Workflow Steps',
      title: 'Step 6: Executive Results & Reconciliation',
      subtitle: 'Inspect balance reconciliations, 20 DQC matrix & Excel deliverables',
      icon: ShieldCheck,
      action: () => { onNavigateStep?.(6); onClose(); },
      tag: 'Step 6',
    },
    {
      category: 'Auditor Quick Actions',
      title: 'Run Automated Cleansing & Sanitation',
      subtitle: 'Sanitize dates, clean strings and evaluate all 16 constraints',
      icon: Sparkles,
      action: () => { onRunCleansing?.(); onClose(); },
      tag: 'Action',
    },
    {
      category: 'Auditor Quick Actions',
      title: 'Execute Full JET Pipeline',
      subtitle: 'Trigger background analytics pipeline and calculate reconciliation',
      icon: Play,
      action: () => { onStartPipeline?.(); onClose(); },
      tag: 'Run',
    },
    {
      category: 'Auditor Quick Actions',
      title: 'Export Complete JET Deliverables (ZIP)',
      subtitle: 'Download all reconciliation summaries, DQC logs, and stratification reports',
      icon: Download,
      action: () => { onExportArtifacts?.(); onClose(); },
      tag: 'Export',
    },
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.tag.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF'
        }}>
          <Search size={18} color="#007680" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a step name, command, or action (e.g. 'Mapping', 'Reconciliation', 'DQC')..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.94rem',
              color: '#0F172A',
              fontWeight: 600,
              background: 'transparent'
            }}
          />
          <kbd style={{
            fontSize: '0.7rem',
            padding: '3px 7px',
            background: '#F1F5F9',
            borderRadius: '5px',
            color: '#64748B',
            fontWeight: 700,
            border: '1px solid #E2E8F0',
            fontFamily: 'var(--font-mono)'
          }}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px 14px' }}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const IconComp = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={idx}
                  className={`cmd-item ${isSelected ? 'active' : ''}`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isSelected ? '#007680' : 'rgba(0, 118, 128, 0.08)',
                      color: isSelected ? '#FFFFFF' : '#007680',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}>
                      <IconComp size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 750, color: isSelected ? '#007680' : '#0F172A', lineHeight: 1.2 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(0, 118, 128, 0.15)' : '#F1F5F9',
                      color: isSelected ? '#007680' : '#64748B',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {item.tag}
                    </span>
                    <ArrowRight size={14} color={isSelected ? '#007680' : '#94A3B8'} />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
              <HelpCircle size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
                No commands matching &quot;{search}&quot;
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '3px' }}>
                Try searching for &apos;Mapping&apos;, &apos;Upload&apos;, &apos;Clean&apos;, or &apos;Reconciliation&apos;
              </div>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div style={{
          padding: '10px 20px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: '#64748B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span><kbd style={{ padding: '1px 5px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px' }}>↑</kbd> <kbd style={{ padding: '1px 5px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px' }}>↓</kbd> Navigate</span>
            <span><kbd style={{ padding: '1px 5px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px' }}>↵</kbd> Select</span>
          </div>
          <span>Deloitte JET Command Center</span>
        </div>
      </div>
    </div>
  );
};
