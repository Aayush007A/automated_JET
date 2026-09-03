import React from 'react';
import { Loader2 } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  badge?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'peach' | 'orange' | 'green' | 'success' | 'blue' | 'lavender' | 'teal' | 'mint' | 'pink' | 'rose' | 'error' | 'warning' | 'info';
  delta?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  badge,
  subtitle,
  icon,
  variant = 'default',
  delta,
}) => {
  // Pastel Theme Configuration matching Reference Card Design
  let cardBg = '#FFF4EC';
  let cardBorder = '#FFE7D6';
  let valueColor = '#0F172A';
  let labelColor = '#475569';
  let pillBg = '#FFFFFF';
  let pillBorder = '#FED7AA';
  let pillColor = '#16A34A';
  let defaultDelta = '▲ 100%';

  if (variant === 'green' || variant === 'success') {
    cardBg = '#F0F9ED';
    cardBorder = '#DCFCE7';
    pillBorder = '#BBF7D0';
    pillColor = '#16A34A';
    defaultDelta = '▲ Active';
  } else if (variant === 'blue' || variant === 'lavender' || variant === 'info') {
    cardBg = '#EDF2FE';
    cardBorder = '#DBEAFE';
    pillBorder = '#BFDBFE';
    pillColor = '#007680';
    defaultDelta = '▲ Tested';
  } else if (variant === 'teal' || variant === 'mint') {
    cardBg = '#EAF5F2';
    cardBorder = '#CCFBF1';
    pillBorder = '#99F6E4';
    pillColor = '#007680';
    defaultDelta = '▲ Screened';
  } else if (variant === 'pink' || variant === 'rose' || variant === 'error') {
    cardBg = '#FDF0F2';
    cardBorder = '#FFE4E6';
    pillBorder = '#FECDD3';
    pillColor = '#9F1239';
    defaultDelta = '▲ Cutoff';
  } else if (variant === 'warning') {
    cardBg = '#FEF9C3';
    cardBorder = '#FEF08A';
    pillBorder = '#FDE047';
    pillColor = '#B45309';
    defaultDelta = '▲ Flagged';
  } else if (variant === 'peach' || variant === 'orange' || variant === 'default') {
    cardBg = '#FFF4EC';
    cardBorder = '#FFE7D6';
    pillBorder = '#FED7AA';
    pillColor = '#16A34A';
    defaultDelta = '▲ 100%';
  }

  // Parse value string if it contains embedded status badges
  let displayValue = typeof value === 'number' ? value.toLocaleString() : String(value || '');
  let parsedBadge = badge;
  const isCalculating = typeof displayValue === 'string' && (displayValue.includes('In Progress') || displayValue.includes('Calculating'));

  if (!parsedBadge && typeof value === 'string') {
    const passedMatch = displayValue.match(/^(\d+)\s*\((Passed)\)$/i);
    if (passedMatch) {
      displayValue = passedMatch[1];
      parsedBadge = passedMatch[2];
    } else {
      const statusWordMatch = displayValue.match(/^(\d+)\s+(Flagged|Failed|Noted|Accounts|Reconciled)$/i);
      if (statusWordMatch) {
        displayValue = statusWordMatch[1];
        parsedBadge = statusWordMatch[2];
      }
    }
  }

  // Determine dynamic font size based on character length so it never wraps
  const valLength = displayValue.length;
  let fontSize = '1.75rem';
  if (isCalculating) {
    fontSize = '0.98rem';
  } else if (valLength > 14) {
    fontSize = '1.20rem';
  } else if (valLength > 10) {
    fontSize = '1.40rem';
  }

  const activeDelta = delta || (parsedBadge ? `▲ ${parsedBadge}` : defaultDelta);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: `1px solid ${cardBorder}`,
        padding: '16px 18px',
        backgroundColor: cardBg,
        minHeight: '120px',
        borderRadius: '16px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
        position: 'relative',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
    >
      {/* Card Header: Category Label & Optional Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span
          data-ai-context="label"
          style={{
            fontSize: '0.82rem',
            fontWeight: 650,
            color: labelColor,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={label}
        >
          {label}
        </span>
        {icon && (
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Card Body: Large Bold Metric Number */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        margin: '2px 0 6px',
      }}>
        <span
          data-ai-context="metric"
          style={{
            fontSize,
            fontWeight: 850,
            color: isCalculating ? 'var(--deloitte-teal)' : valueColor,
            fontFamily: 'monospace',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isCalculating && <Loader2 size={15} className="spin" color="var(--deloitte-teal)" />}
          {displayValue}
        </span>
      </div>

      {/* Card Footer: Pill Badge + Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '8px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: pillBg,
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '0.68rem',
            fontWeight: 750,
            color: pillColor,
            border: `1px solid ${pillBorder}`,
            whiteSpace: 'nowrap',
          }}
        >
          {activeDelta}
        </span>

        {subtitle && (
          <span
            data-ai-context="description"
            style={{
              fontSize: '0.72rem',
              color: '#64748B',
              fontWeight: 500,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={subtitle}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
