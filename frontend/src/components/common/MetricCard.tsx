import React from 'react';
import { Loader2 } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  badge?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'teal' | 'info';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  badge,
  subtitle,
  icon,
  variant = 'default',
}) => {
  let valueColor = 'var(--text-primary)';
  let iconBg = 'var(--bg-secondary)';
  let borderColor = 'var(--border-subtle)';
  let badgeBg = 'var(--bg-secondary)';
  let badgeColor = 'var(--text-secondary)';

  if (variant === 'success') {
    valueColor = '#007680';
    iconBg = 'rgba(0, 118, 128, 0.06)';
    borderColor = '#CCECEF';
    badgeBg = '#E6F4F5';
    badgeColor = '#007680';
  } else if (variant === 'warning') {
    valueColor = '#D97706';
    iconBg = 'rgba(217, 119, 6, 0.06)';
    borderColor = '#FDE68A';
    badgeBg = '#FEF3C7';
    badgeColor = '#B45309';
  } else if (variant === 'error') {
    valueColor = '#DC2626';
    iconBg = 'rgba(220, 38, 38, 0.06)';
    borderColor = '#FECDD3';
    badgeBg = '#FEE2E2';
    badgeColor = '#991B1B';
  } else if (variant === 'teal' || variant === 'info') {
    valueColor = 'var(--deloitte-teal)';
    iconBg = 'rgba(0, 118, 128, 0.06)';
    borderColor = '#E2E8F0';
    badgeBg = '#E6F4F5';
    badgeColor = 'var(--deloitte-teal)';
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
  let fontSize = '1.5rem';
  if (isCalculating) {
    fontSize = '0.98rem';
  } else if (valLength > 12) {
    fontSize = '1.15rem';
  } else if (valLength > 8) {
    fontSize = '1.28rem';
  }

  return (
    <div
      className="jet-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: `1px solid ${borderColor}`,
        padding: '16px 18px',
        backgroundColor: '#FFFFFF',
        minHeight: '126px',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
        position: 'relative',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
    >
      {/* Card Header: Label & Optional Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
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
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Card Body: Main Metric Number + Clean Status Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        margin: '2px 0 6px',
      }}>
        <span
          style={{
            fontSize,
            fontWeight: 800,
            color: isCalculating ? 'var(--deloitte-teal)' : valueColor,
            fontFamily: 'var(--font-mono)',
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

        {parsedBadge && (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '6px',
              background: badgeBg,
              color: badgeColor,
              whiteSpace: 'nowrap',
              textTransform: 'capitalize',
              lineHeight: 1.2,
            }}
          >
            {parsedBadge}
          </span>
        )}
      </div>

      {/* Card Footer: Subtitle */}
      {subtitle && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={subtitle}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
