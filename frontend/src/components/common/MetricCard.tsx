import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'teal';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  variant = 'default',
}) => {
  let valueColor = 'var(--text-primary)';
  let iconBg = 'var(--bg-secondary)';
  let borderColor = 'var(--border-subtle)';

  if (variant === 'success') {
    valueColor = '#0D9488';
    iconBg = '#F0FDF4';
    borderColor = '#BBF7D0';
  } else if (variant === 'warning') {
    valueColor = '#D97706';
    iconBg = '#FFFBEB';
    borderColor = '#FDE68A';
  } else if (variant === 'error') {
    valueColor = '#E11D48';
    iconBg = '#FFF1F2';
    borderColor = '#FECDD3';
  } else if (variant === 'teal') {
    valueColor = 'var(--deloitte-teal)';
    iconBg = 'var(--deloitte-teal-light)';
    borderColor = 'rgba(0, 118, 128, 0.25)';
  }

  return (
    <div
      className="jet-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderColor,
        padding: '20px 22px',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: valueColor, fontFamily: 'var(--font-mono)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
