import React, { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
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
  isLoading = false,
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

  // Extract clean question and optional target item name from title
  let displayTitle = 'Do you want to delete this file?';
  let targetName: string | null = null;

  if (title.toLowerCase().includes('run')) {
    displayTitle = 'Do you want to delete this run?';
    const match = title.match(/JET-\d{8}-\d{3}/i) || title.match(/run\s+([^\s?]+)/i);
    if (match) targetName = match[0];
  } else if (title.toLowerCase().includes('delete') || title.toLowerCase().includes('remove')) {
    displayTitle = 'Do you want to delete this file?';
    const cleaned = title
      .replace(/^Delete\s+/i, '')
      .replace(/^Remove\s+/i, '')
      .replace(/\?$/, '')
      .trim();
    if (cleaned && cleaned.toLowerCase() !== 'this file' && cleaned.toLowerCase() !== 'file') {
      targetName = cleaned;
    }
  } else {
    displayTitle = title;
  }

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
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={() => !isLoading && onClose()}
    >
      <div
        style={{
          position: 'relative',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(226, 232, 240, 0.9)',
          width: '100%',
          maxWidth: '380px',
          padding: '28px 24px 24px',
          textAlign: 'center',
          animation: 'scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.color = '#0F172A';
            }
          }}
          onMouseOut={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94A3B8';
            }
          }}
        >
          <X size={18} strokeWidth={2.4} />
        </button>

        {/* Delete Illustration */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <img
            src="/delete-illustration.webp"
            alt="Delete Illustration"
            style={{
              width: '140px',
              height: '140px',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>

        {/* Clean Standard Question Title */}
        <h3
          style={{
            fontSize: '1.24rem',
            fontWeight: 800,
            color: '#EF4444',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}
        >
          {displayTitle}
        </h3>

        {/* Target Item Name (Truncated Chip) */}
        {targetName && (
          <div
            style={{
              display: 'inline-block',
              maxWidth: '310px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: '#334155',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '3px 10px',
              borderRadius: '8px',
              margin: '0 auto 10px',
            }}
            title={targetName}
          >
            {targetName}
          </div>
        )}

        {/* Subtitle Message */}
        <p
          style={{
            fontSize: '0.86rem',
            color: '#64748B',
            lineHeight: 1.45,
            margin: '0 auto 22px',
            maxWidth: '300px',
          }}
        >
          {message || 'Once you delete this, it will be permanently removed from your workspace.'}
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
          }}
        >
          {/* Delete Button (Primary Left) */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: '12px',
              border: 'none',
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#DC2626';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#EF4444';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
              }
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>

          {/* Cancel Button (Soft Rose Right) */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: '12px',
              border: 'none',
              background: '#FFF1F2',
              color: '#E11D48',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#FFE4E6';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#FFF1F2';
              }
            }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
