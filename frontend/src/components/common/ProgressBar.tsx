import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  stage?: string;
  message?: string;
  isCompleted?: boolean;
  isFailed?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  stage,
  message,
  isCompleted,
  isFailed,
}) => {
  const percent = Math.min(100, Math.max(0, progress));

  let barGradient = 'linear-gradient(90deg, #007680 0%, #86BC25 100%)';
  if (isFailed) {
    barGradient = 'linear-gradient(90deg, #E11D48 0%, #BE123C 100%)';
  } else if (isCompleted) {
    barGradient = 'linear-gradient(90deg, #0D9488 0%, #86BC25 100%)';
  }

  return (
    <div className="glass-panel" style={{ padding: '24px 28px', margin: '20px 0', background: '#FFFFFF', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!isCompleted && !isFailed && (
            <Loader2 size={22} className="spin-slow" color="var(--deloitte-teal)" />
          )}
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {stage ? stage.replace(/_/g, ' ') : 'Processing Pipeline Execution'}
            </div>
            {message && (
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {message}
              </div>
            )}
          </div>
        </div>
        <div style={{
          fontSize: '1.35rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: isFailed ? 'var(--status-error)' : 'var(--deloitte-teal)',
        }}>
          {percent}%
        </div>
      </div>

      {/* Progress Track */}
      <div style={{
        width: '100%',
        height: '10px',
        backgroundColor: '#E2E8F0',
        borderRadius: '999px',
        overflow: 'hidden',
        border: '1px solid #CBD5E1',
        position: 'relative',
      }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: barGradient,
            borderRadius: '999px',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isFailed ? '0 0 12px rgba(225, 29, 72, 0.4)' : '0 0 10px rgba(0, 118, 128, 0.3)',
          }}
        />
      </div>
    </div>
  );
};
