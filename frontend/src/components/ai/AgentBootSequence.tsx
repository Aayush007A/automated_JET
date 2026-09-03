import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BrainCircuit,
  ScanSearch,
  Layers3,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface AgentBootSequenceProps {
  onComplete: () => void;
  pageTitle?: string;
  stepTitle?: string;
}

const stages = [
  {
    label: 'Reading workspace',
    description: 'Locating the active JET environment',
    icon: Layers3,
  },
  {
    label: 'Scanning context',
    description: 'Reading the information currently on screen',
    icon: ScanSearch,
  },
  {
    label: 'Connecting intelligence',
    description: 'Preparing contextual audit reasoning',
    icon: BrainCircuit,
  },
  {
    label: 'Copilot ready',
    description: 'Your current workspace is now in context',
    icon: Sparkles,
  },
];

export const AgentBootSequence: React.FC<
  AgentBootSequenceProps
> = ({
  onComplete,
  pageTitle,
  stepTitle,
}) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const contextLabel = useMemo(() => {
    if (stepTitle) return stepTitle;
    if (pageTitle) return pageTitle;
    return 'JET workspace';
  }, [pageTitle, stepTitle]);

  useEffect(() => {
    const stageTimers = [
      window.setTimeout(() => {
        setStageIndex(1);
      }, 520),

      window.setTimeout(() => {
        setStageIndex(2);
      }, 1040),

      window.setTimeout(() => {
        setStageIndex(3);
      }, 1540),

      window.setTimeout(() => {
        onComplete();
      }, 2050),
    ];

    const progressTimer = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2.5;

        if (next >= 100) {
          window.clearInterval(progressTimer);
          return 100;
        }

        return next;
      });
    }, 48);

    return () => {
      stageTimers.forEach((timer) =>
        window.clearTimeout(timer)
      );

      window.clearInterval(progressTimer);
    };
  }, [onComplete]);

  const stage = stages[stageIndex];
  const StageIcon = stage.icon;

  return (
    <motion.div
      className="jet-ai-boot"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
        scale: 1.025,
        filter: 'blur(4px)',
      }}
      transition={{
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* ambient depth */}
      <div className="jet-ai-boot-noise" />

      <div className="jet-ai-boot-glow jet-ai-boot-glow-one" />
      <div className="jet-ai-boot-glow jet-ai-boot-glow-two" />

      {/* subtle architectural grid */}
      <motion.div
        className="jet-ai-boot-grid"
        animate={{
          backgroundPosition: [
            '0px 0px',
            '42px 42px',
          ],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* horizontal context scan */}
      <motion.div
        className="jet-ai-context-scan"
        animate={{
          y: ['-25vh', '120vh'],
          opacity: [0, 0.9, 0],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* top telemetry */}
      <div className="jet-ai-boot-topline">
        <span className="jet-ai-boot-topline-mark">
          <span />
        </span>

        <span>JET COPILOT</span>

        <span className="jet-ai-boot-topline-divider">
          /
        </span>

        <span>CONTEXT ENGINE</span>
      </div>

      {/* central AI identity */}
      <div className="jet-ai-boot-center">
        <div className="jet-ai-boot-orb-wrap">
          <motion.div
            className="jet-ai-orbit jet-ai-orbit-a"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          <motion.div
            className="jet-ai-orbit jet-ai-orbit-b"
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          <motion.div
            className="jet-ai-orb-outer-glow"
            animate={{
              scale: [1, 1.06, 1],
              opacity: [0.62, 0.34, 0.62],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.div
            className="jet-ai-boot-avatar"
            animate={{
              scale: [1, 1.025, 1],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <img
              src="/ai-agent-avatar.png"
              alt="JET Copilot"
            />
          </motion.div>

          <div className="jet-ai-orb-highlight" />
        </div>

        <div className="jet-ai-boot-brand">
          <div className="jet-ai-boot-brand-title">
            JET Copilot
          </div>

          <div className="jet-ai-boot-brand-subtitle">
            Context-aware audit intelligence
          </div>
        </div>

        <div className="jet-ai-boot-context">
          <span className="jet-ai-boot-context-dot" />
          <span className="jet-ai-boot-context-label">
            Current workspace
          </span>
          <span className="jet-ai-boot-context-value">
            {contextLabel}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={stageIndex}
            className="jet-ai-boot-stage"
            initial={{
              opacity: 0,
              y: 8,
              filter: 'blur(4px)',
            }}
            animate={{
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
            }}
            exit={{
              opacity: 0,
              y: -8,
              filter: 'blur(4px)',
            }}
            transition={{
              duration: 0.28,
            }}
          >
            <div className="jet-ai-boot-stage-icon">
              <StageIcon size={17} />
            </div>

            <div>
              <div className="jet-ai-boot-stage-title">
                {stage.label}
              </div>

              <div className="jet-ai-boot-stage-description">
                {stage.description}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="jet-ai-boot-progress-wrap">
          <div className="jet-ai-boot-progress">
            <motion.div
              className="jet-ai-boot-progress-fill"
              animate={{
                width: `${progress}%`,
              }}
            />
          </div>

          <span>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* bottom assurance */}
      <div className="jet-ai-boot-footer">
        <div className="jet-ai-boot-footer-item">
          <ShieldCheck size={12} />
          Local intelligence
        </div>

        <div className="jet-ai-boot-footer-separator" />

        <div className="jet-ai-boot-footer-item">
          Screen context enabled
        </div>
      </div>
    </motion.div>
  );
};