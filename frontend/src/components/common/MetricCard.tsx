import React from 'react';

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
    valueColor = '#0F766E';
    iconBg = 'rgba(15, 118, 110, 0.06)';
    borderColor = 'rgba(15, 118, 110, 0.2)';
    badgeBg = 'rgba(15, 118, 110, 0.09)';
    badgeColor = '#0F766E';
  } else if (variant === 'warning') {
    valueColor = '#B45309';
    iconBg = 'rgba(180, 83, 9, 0.06)';
    borderColor = 'rgba(180, 83, 9, 0.2)';
    badgeBg = 'rgba(180, 83, 9, 0.09)';
    badgeColor = '#92400E';
  } else if (variant === 'error') {
    valueColor = '#BE123C';
    iconBg = 'rgba(190, 18, 60, 0.06)';
    borderColor = 'rgba(190, 18, 60, 0.2)';
    badgeBg = 'rgba(190, 18, 60, 0.09)';
    badgeColor = '#9F1239';
  } else if (variant === 'teal' || variant === 'info') {
    valueColor = 'var(--deloitte-teal)';
    iconBg = 'rgba(0, 118, 128, 0.06)';
    borderColor = 'rgba(0, 118, 128, 0.2)';
    badgeBg = 'rgba(0, 118, 128, 0.09)';
    badgeColor = 'var(--deloitte-teal)';
  }

  // Parse value string if it contains embedded status badges (e.g. "0 (Passed)", "1 Flagged", "22 Accounts")
  let displayValue = typeof value === 'number' ? value.toLocaleString() : String(value || '');
  let parsedBadge = badge;

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
  if (valLength > 12) {
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
        borderColor,
        padding: '16px 18px',
        backgroundColor: '#FFFFFF',
        minHeight: '126px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        position: 'relative',
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
            color: valueColor,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em',
          }}
        >
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
