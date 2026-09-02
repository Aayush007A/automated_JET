import React, { useState } from 'react';
import { TickmarkItem, EvaluationItem } from '../../../types';
import { Tag, CheckCircle2, AlertCircle, FileText, UserCheck, Trash2, Plus, Edit2, ShieldCheck, Check, ChevronDown } from 'lucide-react';

interface OmniaTickmarksTabProps {
  tickmarks: TickmarkItem[];
  evaluations: EvaluationItem[];
  onUpdateTickmarks: (tickmarks: TickmarkItem[]) => void;
  onUpdateEvaluations: (evaluations: EvaluationItem[]) => void;
  flaggedEntriesCount: number;
}

export const OmniaTickmarksTab: React.FC<OmniaTickmarksTabProps> = ({
  tickmarks,
  evaluations,
  onUpdateTickmarks,
  onUpdateEvaluations,
  flaggedEntriesCount,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tickmarks' | 'evaluations'>('tickmarks');
  const [newEvalEntryId, setNewEvalEntryId] = useState('');
  const [newEvalEvidenceReq, setNewEvalEvidenceReq] = useState(false);
  const [newEvalEvidenceNotes, setNewEvalEvidenceNotes] = useState('');
  const [newEvalConclusion, setNewEvalConclusion] = useState<'APPROPRIATE' | 'EXPLAINED' | 'INAPPROPRIATE'>('APPROPRIATE');
  const [newEvalNotes, setNewEvalNotes] = useState('');

  const totalEntriesResolved = tickmarks.reduce(
    (acc: number, t: TickmarkItem) => acc + (t.appliedEntryIds?.length || t.entryIds?.length || 0),
    0
  );

  const handleDeleteTickmark = (id: string) => {
    onUpdateTickmarks(tickmarks.filter((t) => t.id !== id));
  };

  const handleAddEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvalEntryId.trim()) return;

    const newEval: EvaluationItem = {
      id: `eval_${Date.now()}`,
      entryId: newEvalEntryId.trim(),
      documentNo: newEvalEntryId.trim(),
      additionalEvidenceNeeded: newEvalEvidenceReq,
      additionalEvidenceRequired: newEvalEvidenceReq,
      evidenceDescription: newEvalEvidenceNotes,
      conclusion: newEvalConclusion,
      auditorNotes: newEvalNotes,
      conclusionNotes: newEvalNotes,
      evaluatedBy: 'Auditor',
      evaluatedAt: new Date().toISOString(),
    };

    onUpdateEvaluations([...evaluations, newEval]);
    setNewEvalEntryId('');
    setNewEvalEvidenceNotes('');
    setNewEvalNotes('');
  };

  const handleDeleteEvaluation = (id?: string) => {
    if (!id) return;
    onUpdateEvaluations(evaluations.filter((ev) => ev.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        <div style={{
          padding: '16px', borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(0, 118, 128, 0.06) 0%, #FFFFFF 100%)',
          border: '1px solid rgba(0, 118, 128, 0.2)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
            ACTIVE AUDIT TICKMARKS
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 850, color: 'var(--deloitte-teal)' }}>
            {tickmarks.length} Tickmarks
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            False positive & routine group labels
          </div>
        </div>

        <div style={{
          padding: '16px', borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
            RESOLVED / EXPLAINED ENTRIES
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 850, color: '#16A34A' }}>
            {totalEntriesResolved.toLocaleString()} Entries
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            De-escalated via documented rationale
          </div>
        </div>

        <div style={{
          padding: '16px', borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
            AUDITOR EVALUATIONS SIGNED
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 850, color: 'var(--text-primary)' }}>
            {evaluations.length} Evaluations
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Documented audit conclusion records
          </div>
        </div>

        <div style={{
          padding: '16px', borderRadius: '12px',
          background: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
            REMAINING UNEXPLAINED
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 850, color: Math.max(0, flaggedEntriesCount - totalEntriesResolved) > 0 ? '#DC2626' : '#16A34A' }}>
            {Math.max(0, flaggedEntriesCount - totalEntriesResolved).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Exceptions awaiting tickmark resolution
          </div>
        </div>

      </div>

      {/* Sub-Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubTab('tickmarks')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: activeSubTab === 'tickmarks' ? 'var(--deloitte-teal)' : '#F1F5F9',
            color: activeSubTab === 'tickmarks' ? '#FFFFFF' : '#475569',
            border: 'none', fontWeight: 750, fontSize: '0.80rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <span
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: activeSubTab === 'tickmarks' ? '#FFFFFF' : '#CBD5E1',
              color: activeSubTab === 'tickmarks' ? '#007680' : '#475569',
              fontSize: '0.68rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            1
          </span>
          Managed Tickmarks ({tickmarks.length})
        </button>
        <button
          onClick={() => setActiveSubTab('evaluations')}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            background: activeSubTab === 'evaluations' ? 'var(--deloitte-teal)' : '#F1F5F9',
            color: activeSubTab === 'evaluations' ? '#FFFFFF' : '#475569',
            border: 'none', fontWeight: 750, fontSize: '0.80rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <span
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: activeSubTab === 'evaluations' ? '#FFFFFF' : '#CBD5E1',
              color: activeSubTab === 'evaluations' ? '#007680' : '#475569',
              fontSize: '0.68rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            2
          </span>
          Auditor Evaluations & Sign-Offs ({evaluations.length})
        </button>
      </div>

      {/* SUB-TAB 1: TICKMARKS LIST */}
      {activeSubTab === 'tickmarks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tickmarks.length === 0 ? (
            <div style={{
              padding: '32px', textAlign: 'center',
              background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)', fontSize: '0.84rem'
            }}>
              <Tag size={28} style={{ color: '#CBD5E1', marginBottom: '8px' }} />
              <div>No tickmarks have been created yet.</div>
              <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                Go to the <strong>"Flagged Exceptions"</strong> tab, select one or more flagged transactions, and click <strong>"+Create Tickmark"</strong> to group and explain them.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
              {tickmarks.map((tm) => (
                <div
                  key={tm.id}
                  style={{
                    padding: '16px',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px',
                        background: 'var(--deloitte-teal-light)', color: 'var(--deloitte-teal)',
                        fontSize: '0.72rem', fontWeight: 800
                      }}>
                        {tm.code || 'TICKMARK'}
                      </span>
                      <button
                        onClick={() => handleDeleteTickmark(tm.id)}
                        style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                        title="Delete Tickmark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                      {tm.title}
                    </h4>

                    <p style={{ fontSize: '0.76rem', color: '#475569', margin: '0 0 10px', lineHeight: 1.4 }}>
                      {tm.explanation || tm.rationale || 'No rationale provided.'}
                    </p>
                  </div>

                  <div style={{
                    paddingTop: '10px',
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)'
                  }}>
                    <span>Applied to: <strong>{(tm.appliedEntryIds || tm.entryIds || []).length} entries</strong></span>
                    <span>{tm.sendForEvaluation ? '✓ Sent for Eval' : 'Resolved'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: AUDITOR EVALUATIONS */}
      {activeSubTab === 'evaluations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* New Evaluation Form */}
          <div style={{
            padding: '18px',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              Document Auditor Conclusion & Evaluation
            </h4>

            <form onSubmit={handleAddEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700 }}>Journal Entry / Document No *</label>
                  <input
                    type="text"
                    className="jet-input"
                    value={newEvalEntryId}
                    onChange={(e) => setNewEvalEntryId(e.target.value)}
                    placeholder="e.g. JE-104992 or 1004"
                    required
                    style={{ fontSize: '0.80rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: '4px', display: 'block' }}>Audit Conclusion *</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <select
                      className="jet-select"
                      value={newEvalConclusion}
                      onChange={(e) => setNewEvalConclusion(e.target.value as any)}
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        width: '100%',
                        paddingRight: '36px',
                        fontSize: '0.80rem',
                        fontWeight: 600,
                        color: '#0F172A',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        height: '38px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="APPROPRIATE">Appropriate Business Rationale</option>
                      <option value="EXPLAINED">Satisfactorily Explained with Evidence</option>
                      <option value="INAPPROPRIATE">Inappropriate / Escalated Exception</option>
                    </select>
                    <ChevronDown size={15} color="#64748B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                  <input
                    type="checkbox"
                    id="chkEvidence"
                    checked={newEvalEvidenceReq}
                    onChange={(e) => setNewEvalEvidenceReq(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="chkEvidence" style={{ fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                    Additional Corroborating Evidence Required
                  </label>
                </div>
              </div>

              {newEvalEvidenceReq && (
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700 }}>Evidence Description Required</label>
                  <input
                    type="text"
                    className="jet-input"
                    value={newEvalEvidenceNotes}
                    onChange={(e) => setNewEvalEvidenceNotes(e.target.value)}
                    placeholder="e.g., Invoices, board approval, bank confirmation statement..."
                    style={{ fontSize: '0.80rem' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700 }}>Auditor Testing Summary & Justification</label>
                <textarea
                  className="jet-input"
                  value={newEvalNotes}
                  onChange={(e) => setNewEvalNotes(e.target.value)}
                  placeholder="Detail the substantive audit procedure performed and conclude on appropriateness..."
                  rows={2}
                  style={{ fontSize: '0.80rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: '6px 16px', fontSize: '0.80rem',
                    background: 'var(--deloitte-teal)', color: '#FFFFFF',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Check size={14} /> Submit Evaluation Sign-Off
                </button>
              </div>
            </form>
          </div>

          {/* Evaluations Table */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <table className="jet-table" style={{ width: '100%', fontSize: '0.80rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Document #</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Conclusion</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Auditor Notes</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Evidence Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Evaluated By</th>
                  <th style={{ width: '40px', padding: '10px 14px', textAlign: 'center', fontWeight: 800 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No formal evaluations logged yet. Complete the form above to sign off on specific entries.
                    </td>
                  </tr>
                ) : (
                  evaluations.map((ev, idx) => (
                    <tr key={ev.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 750, color: 'var(--text-primary)' }}>
                        {ev.entryId || ev.documentNo}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {ev.conclusion === 'APPROPRIATE' ? (
                          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontSize: '0.70rem', fontWeight: 750 }}>
                            APPROPRIATE
                          </span>
                        ) : ev.conclusion === 'EXPLAINED' ? (
                          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: '0.70rem', fontWeight: 750 }}>
                            EXPLAINED
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECDD3', fontSize: '0.70rem', fontWeight: 750 }}>
                            INAPPROPRIATE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {ev.auditorNotes || ev.conclusionNotes || '--'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.72rem' }}>
                        {(ev.additionalEvidenceRequired || ev.additionalEvidenceNeeded) ? (
                          <span style={{ color: '#D97706', fontWeight: 600 }}>
                            Req: {ev.evidenceDescription || 'Pending'}
                          </span>
                        ) : (
                          <span style={{ color: '#16A34A' }}>Not Required</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {ev.evaluatedBy || 'Auditor'} ({new Date(ev.evaluatedAt || '').toLocaleDateString()})
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteEvaluation(ev.id)}
                          style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
