import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  itemDetails?: {
    label: string;
    value: string;
  }[];
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  itemDetails,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const iconBg = isDanger ? '#FEE2E2' : isWarning ? '#FEF3C7' : 'var(--deloitte-teal-light)';
  const iconColor = isDanger ? '#DC2626' : isWarning ? '#D97706' : 'var(--deloitte-teal)';
  const confirmBtnBg = isDanger ? '#DC2626' : isWarning ? '#D97706' : 'var(--deloitte-teal)';
  const confirmBtnHover = isDanger ? '#B91C1C' : isWarning ? '#B45309' : '#005E66';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={() => !isLoading && onClose()}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 1px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Content */}
        <div style={{ padding: '28px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: iconBg,
                color: iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDanger ? '0 4px 14px rgba(220, 38, 38, 0.2)' : 'none',
              }}
            >
              {isDanger ? <Trash2 size={24} /> : isWarning ? <AlertTriangle size={24} /> : <Info size={24} />}
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              style={{
                background: '#F1F5F9',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#E2E8F0')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#F1F5F9')}
            >
              <X size={16} />
            </button>
          </div>

          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h3>

          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {message}
          </p>

          {/* Optional item details card */}
          {itemDetails && itemDetails.length > 0 && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {itemDetails.map((detail, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{detail.label}:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div
          style={{
            padding: '16px 28px 24px',
            background: '#FAFAFA',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
              background: '#FFFFFF',
              color: 'var(--text-secondary)',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.borderColor = 'var(--border-medium)';
              }
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '9px 22px',
              borderRadius: '8px',
              border: 'none',
              background: confirmBtnBg,
              color: '#FFFFFF',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: isDanger ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 4px 12px rgba(0, 118, 128, 0.25)',
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = confirmBtnHover;
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = confirmBtnBg;
              }
            }}
          >
            {isLoading ? (
              <span>Deleting...</span>
            ) : (
              <>
                {isDanger && <Trash2 size={15} />}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
