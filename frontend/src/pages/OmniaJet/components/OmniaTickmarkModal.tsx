import React, { useState } from 'react';
import { X, Tag, Check, HelpCircle, ShieldCheck } from 'lucide-react';
import { TickmarkItem } from '../../../types';
import { FlaggedEntry } from './OmniaFlaggedEntriesTable';

interface OmniaTickmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEntries: FlaggedEntry[];
  onSaveTickmark: (tickmark: TickmarkItem) => void;
}

export const OmniaTickmarkModal: React.FC<OmniaTickmarkModalProps> = ({
  isOpen,
  onClose,
  selectedEntries,
  onSaveTickmark,
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('TM-1');
  const [explanation, setExplanation] = useState('');
  const [sendForEvaluation, setSendForEvaluation] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const entryIds = selectedEntries.map((entry, idx) =>
      String(entry.Journal_Number || entry.Journal_Entry_Number || entry.DocumentNo || entry.document_no || idx)
    );

    const newTickmark: TickmarkItem = {
      id: `tm_${Date.now()}`,
      code: code.trim() || 'TM-1',
      title: title.trim(),
      explanation: explanation.trim(),
      appliedEntryIds: entryIds,
      sendForEvaluation,
      createdAt: new Date().toISOString(),
    };

    onSaveTickmark(newTickmark);
    setTitle('');
    setExplanation('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Deloitte Signature Top Stripe */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3.5px',
          background: 'linear-gradient(90deg, #007680 0%, #86BC25 50%, #2563EB 100%)',
          zIndex: 10,
        }} />

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#F0F9FA',
              border: '1px solid rgba(0, 118, 128, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#007680',
            }}>
              <Tag size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Create / Assign Audit Tickmark
              </h3>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                Applying to <strong style={{ color: '#007680' }}>{selectedEntries.length}</strong> selected exception record{selectedEntries.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(el) => { el.currentTarget.style.background = '#E2E8F0'; el.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={(el) => { el.currentTarget.style.background = '#F1F5F9'; el.currentTarget.style.color = '#64748B'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Tickmark Code *
              </label>
              <input
                type="text"
                className="jet-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="TM-1"
                required
                style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Tickmark Title *
              </label>
              <input
                type="text"
                className="jet-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Routine Month-End Amortization"
                required
                style={{ fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Audit Rationale / Explanation *
            </label>
            <textarea
              className="jet-input"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why these transactions are considered routine, false positive, or tested via alternate audit procedures..."
              rows={3}
              required
              style={{ fontSize: '0.80rem', resize: 'vertical' }}
            />
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 750, color: '#0F172A' }}>
                Send for Formal Auditor Evaluation
              </div>
              <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: '1px' }}>
                Flag for documented partner/manager sign-off in audit workpapers.
              </div>
            </div>
            <input
              type="checkbox"
              checked={sendForEvaluation}
              onChange={(e) => setSendForEvaluation(e.target.checked)}
              style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
            />
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 650,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '6px 18px',
                fontSize: '0.78rem',
                background: '#007680',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Check size={14} /> Apply Tickmark
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
