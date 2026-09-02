import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface AiAgentTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  unreadCount?: number;
}

export const AiAgentTrigger: React.FC<AiAgentTriggerProps> = ({
  isOpen,
  onToggle,
  unreadCount = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Floating Hover Tooltip Pill */}
      <motion.div
        initial={{ opacity: 0, x: 10, scale: 0.95 }}
        animate={{
          opacity: isHovered && !isOpen ? 1 : 0,
          x: isHovered && !isOpen ? 0 : 10,
          scale: isHovered && !isOpen ? 1 : 0.95,
        }}
        transition={{ duration: 0.2 }}
        style={{
          pointerEvents: 'none',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 118, 128, 0.4)',
          color: '#FFFFFF',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.74rem',
          fontWeight: 700,
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10B981',
            display: 'inline-block',
            boxShadow: '0 0 8px #10B981',
          }}
        />
        Deloitte JET AI Assistant
      </motion.div>

      {/* Main Holographic Trigger Button */}
      <motion.button
        type="button"
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Open Deloitte JET AI Assistant"
        style={{
          position: 'relative',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
        }}
      >
        {/* Pulsing Holographic Halo Ring */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.6, 0.15, 0.6],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 118, 128, 0.6) 0%, rgba(99, 102, 241, 0.3) 50%, transparent 70%)',
            filter: 'blur(6px)',
            zIndex: 0,
          }}
        />

        {/* Outer Iridescent Glowing Ring */}
        <div
          style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #007680 0%, #0284C7 35%, #8B5CF6 70%, #EC4899 100%)',
            opacity: isHovered || isOpen ? 1 : 0.85,
            transition: 'opacity 0.25s ease',
            zIndex: 1,
          }}
        />

        {/* AI Orb Avatar Image */}
        <div
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#090D16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          }}
        >
          <img
            src="/ai-agent-avatar.png"
            alt="AI Assistant"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: isOpen ? 'rotate(15deg) scale(1.04)' : 'rotate(0deg) scale(1)',
              transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </div>

        {/* Active Online Indicator Dot */}
        <span
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '13px',
            height: '13px',
            borderRadius: '50%',
            background: '#10B981',
            border: '2.5px solid #FFFFFF',
            zIndex: 3,
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
          }}
        />

        {/* Optional Notification Badge */}
        {unreadCount > 0 && !isOpen && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '10px',
              zIndex: 4,
              border: '2px solid #FFFFFF',
            }}
          >
            {unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
};
