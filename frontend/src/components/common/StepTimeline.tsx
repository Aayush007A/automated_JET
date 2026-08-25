import React from 'react';
import { CheckCircle2, Lock, LucideIcon } from 'lucide-react';

export interface TimelineStep {
  id: number;
  label: string;
  sub?: string;
  icon: LucideIcon;
}

interface StepTimelineProps {
  steps: TimelineStep[];
  currentStep: number;
  canAccessStep: (stepId: number) => boolean;
  onStepClick: (stepId: number) => void;
  activeTitle?: string;
  activeDescription?: string;
  headerRight?: React.ReactNode;
}

/**
 * Clean, lightweight horizontal step timeline.
 * Features connected step bubbles on a subtle progress rail, plus a seamless
 * contextual banner beneath describing the active step with Back/Continue actions.
 */
export const StepTimeline: React.FC<StepTimelineProps> = ({
  steps,
  currentStep,
  canAccessStep,
  onStepClick,
  activeTitle,
  activeDescription,
  headerRight,
}) => {
  const activeIndex = Math.max(0, steps.findIndex((s) => s.id === currentStep));
  const fillPct = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 0;
  const active = steps.find((s) => s.id === currentStep);

  return (
    <div className="timeline-card">
      <div className="wizard-steps-h">
        <div className="wizard-line-h">
          <div className="wizard-line-h-progress" style={{ width: `${fillPct}%` }} />
        </div>

        {steps.map((step) => {
          const allowed = canAccessStep(step.id);
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const Icon = step.icon;

          let nodeClass = 'wizard-node-h';
          if (!allowed) nodeClass += ' locked';
          if (isActive) nodeClass += ' active';
          if (isCompleted) nodeClass += ' completed';

          return (
            <button
              key={step.id}
              type="button"
              className={nodeClass}
              disabled={!allowed}
              onClick={() => allowed && onStepClick(step.id)}
              title={step.label}
            >
              <span className="wizard-bubble-h">
                {isCompleted ? (
                  <CheckCircle2 size={16} />
                ) : !allowed ? (
                  <Lock size={13} />
                ) : (
                  <Icon size={15} />
                )}
              </span>
              <span className="wizard-label-h">{step.label}</span>
              {step.sub && <span className="wizard-sub-h">{step.sub}</span>}
            </button>
          );
        })}
      </div>

      {(activeTitle || headerRight) && (
        <div className="timeline-active-banner">
          <div className="timeline-active-info">
            {active && (
              <span className="timeline-active-icon">
                <active.icon size={17} />
              </span>
            )}
            <div>
              {activeTitle && <h3>{activeTitle}</h3>}
              {activeDescription && <p>{activeDescription}</p>}
            </div>
          </div>
          {headerRight && <div className="timeline-active-actions">{headerRight}</div>}
        </div>
      )}
    </div>
  );
};

export default StepTimeline;