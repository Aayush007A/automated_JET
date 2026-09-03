import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Info } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const s = (status || '').toUpperCase();

  let badgeClass = 'badge-neutral';
  let icon = <Info size={size === 'sm' ? 12 : 14} />;

  if (['COMPLETED', 'BALANCED', 'PASS', 'MATCHED', 'READY', 'RECONCILED', 'SUCCESS'].includes(s)) {
    badgeClass = 'badge-success';
    icon = <CheckCircle2 size={size === 'sm' ? 12 : 14} />;
  } else if (['WARNING', 'UNBALANCED', 'OVERRIDDEN', 'OBSERVATION'].includes(s)) {
    badgeClass = 'badge-warning';
    icon = <AlertTriangle size={size === 'sm' ? 12 : 14} />;
  } else if (['FAILED', 'FAIL', 'ERROR', 'UNRECONCILED', 'UNMATCHED'].includes(s)) {
    badgeClass = 'badge-error';
    icon = <XCircle size={size === 'sm' ? 12 : 14} />;
  } else if (['RUNNING', 'PROCESSING', 'UPLOADING', 'DETECTED', 'MAPPING'].includes(s)) {
    badgeClass = 'badge-info';
    icon = <Clock size={size === 'sm' ? 12 : 14} className="spin-slow" />;
  }

  return (
    <span data-ai-context="label" className={`badge ${badgeClass}`} style={{ fontSize: size === 'sm' ? '0.72rem' : '0.8rem', padding: size === 'sm' ? '3px 8px' : '5px 12px' }}>
      {icon}
      {status}
    </span>
  );
};
