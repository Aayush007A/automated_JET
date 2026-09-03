import React from 'react';

import {
  AnimatePresence,
  motion,
} from 'motion/react';

import {
  BrainCircuit,
  FileSearch,
  ScanSearch,
  Sparkles,
} from 'lucide-react';

export type AgentProcessingStage =
  | 'context'
  | 'scan'
  | 'reason'
  | 'response';

interface AgentScanStateProps {
  stage: AgentProcessingStage;
  pageTitle?: string;
  stepTitle?: string;
  signals?: string[];
}

const stages = {
  context: {
    icon: FileSearch,
    eyebrow: 'CONTEXT',
    title: 'Reading current workspace',
    description:
      'Understanding the active workflow and screen state.',
  },

  scan: {
    icon: ScanSearch,
    eyebrow: 'SCAN',
    title: 'Inspecting visible context',
    description:
      'Looking through relevant sections, fields and results.',
  },

  reason: {
    icon: BrainCircuit,
    eyebrow: 'REASONING',
    title: 'Connecting audit context',
    description:
      'Matching your question with the current JET workflow.',
  },

  response: {
    icon: Sparkles,
    eyebrow: 'RESPONSE',
    title: 'Preparing your answer',
    description:
      'Organizing the most relevant information for you.',
  },
};

function getUniqueSignals(
  pageTitle?: string,
  stepTitle?: string,
  signals: string[] = []
): string[] {
  const candidates = [
    pageTitle,
    stepTitle,
    ...signals,
  ].filter(Boolean) as string[];

  const unique: string[] = [];

  for (
    const candidate of candidates
  ) {
    const normalized =
      candidate.trim();

    if (!normalized) {
      continue;
    }

    const exists =
      unique.some(
        (existing) =>
          existing.toLowerCase() ===
          normalized.toLowerCase()
      );

    if (!exists) {
      unique.push(normalized);
    }
  }

  return unique.slice(0, 4);
}

export const AgentScanState: React.FC<
  AgentScanStateProps
> = ({
  stage,
  pageTitle,
  stepTitle,
  signals = [],
}) => {
  const current =
    stages[stage];

  const Icon =
    current.icon;

  const uniqueSignals =
    getUniqueSignals(
      pageTitle,
      stepTitle,
      signals
    );

  return (
    <motion.div
      className="jet-agent-thinking"
      initial={{
        opacity: 0,
        y: 10,
        scale: 0.985,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: 6,
        scale: 0.99,
      }}
      transition={{
        duration: 0.28,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
    >
      <div className="jet-agent-thinking-glow" />

      <div className="jet-agent-thinking-header">
        <motion.div
          className="jet-agent-thinking-icon"
          animate={{
            scale: [
              1,
              1.055,
              1,
            ],
          }}
          transition={{
            duration: 1.65,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Icon size={17} />
        </motion.div>

        <div className="jet-agent-thinking-copy">
          <AnimatePresence
            mode="wait"
          >
            <motion.div
              key={`${stage}-eyebrow`}
              className="jet-agent-thinking-eyebrow"
              initial={{
                opacity: 0,
                x: 5,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: -5,
              }}
            >
              {current.eyebrow}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence
            mode="wait"
          >
            <motion.div
              key={`${stage}-title`}
              className="jet-agent-thinking-title"
              initial={{
                opacity: 0,
                y: 5,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -5,
              }}
            >
              {current.title}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence
            mode="wait"
          >
            <motion.div
              key={`${stage}-description`}
              className="jet-agent-thinking-description"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.18,
              }}
            >
              {current.description}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="jet-agent-thinking-live">
          <span />
          LIVE
        </div>
      </div>

      {uniqueSignals.length >
        0 && (
        <div className="jet-agent-thinking-context">
          <div className="jet-agent-thinking-context-label">
            CURRENT SIGNALS
          </div>

          <div className="jet-agent-signal-grid">
            {uniqueSignals.map(
              (
                signal,
                index
              ) => (
                <motion.div
                  key={signal}
                  className="jet-agent-signal"
                  initial={{
                    opacity: 0,
                    y: 5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.2,
                    delay:
                      index *
                      0.055,
                  }}
                >
                  <span className="jet-agent-signal-mark">
                    <span />
                  </span>

                  <span className="jet-agent-signal-text">
                    {signal}
                  </span>
                </motion.div>
              )
            )}
          </div>
        </div>
      )}

      <div className="jet-agent-progress">
        <motion.div
          className="jet-agent-progress-line"
          animate={{
            x: [
              '-110%',
              '230%',
            ],
          }}
          transition={{
            duration: 1.45,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="jet-agent-thinking-footer">
        <span>
          Context engine active
        </span>

        <span>
          {stage === 'context' &&
            'Preparing'}

          {stage === 'scan' &&
            'Scanning'}

          {stage === 'reason' &&
            'Reasoning'}

          {stage === 'response' &&
            'Finalizing'}
        </span>
      </div>
    </motion.div>
  );
};