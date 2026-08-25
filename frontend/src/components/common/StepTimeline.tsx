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
  maxCompletedStep?: number;
  canAccessStep: (stepId: number) => boolean;
  onStepClick: (stepId: number) => void;
  activeTitle?: string;
  activeDescription?: string;
  headerRight?: React.ReactNode;
  isRunCompleted?: boolean;
}

/**
 * Clean, lightweight horizontal step timeline.
 * Features connected step bubbles on a subtle progress rail, plus a seamless
 * contextual banner beneath describing the active step with Back/Continue actions.
 */
export const StepTimeline: React.FC<StepTimelineProps> = ({
  steps,
  currentStep,
  maxCompletedStep,
  canAccessStep,
  onStepClick,
  activeTitle,
  activeDescription,
  headerRight,
  isRunCompleted,
}) => {
  // Use maxCompletedStep (if provided) to determine the furthest step reached
  const highWaterMark = maxCompletedStep ?? currentStep;
  const isAllResultsDone = Boolean(isRunCompleted || (maxCompletedStep !== undefined && maxCompletedStep >= steps.length));
  const active = steps.find((s) => s.id === currentStep);

  return (
    <div className="timeline-card">
      <div className="wizard-steps-h">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const allowed = canAccessStep(step.id);
          const isActive = step.id === currentStep;
          // A step is "completed" if it's been reached in the past AND is not currently active,
          // OR if all results are populated (completed) and this step has been finished (including the last step)
          const isCompleted = step.id < currentStep || (step.id <= highWaterMark && step.id !== currentStep) || (isAllResultsDone && (step.id <= highWaterMark || isLast));
          // A connecting segment is completed if the destination step is reached or all results are done
          const isSegmentCompleted = step.id < highWaterMark || isAllResultsDone;
          const isSegmentActive = step.id < currentStep;
          const Icon = step.icon;

          let nodeClass = 'wizard-node-h';
          if (!allowed) nodeClass += ' locked';
          if (isActive) nodeClass += ' active';
          if (isCompleted) nodeClass += ' completed';

          return (
            <div key={step.id} className="wizard-step-item">
              {/* Connector line to the next step (omitted on the last step) */}
              {!isLast && (
                <div className="wizard-connector-line">
                  <div
                    className={`wizard-connector-progress ${
                      isSegmentCompleted ? 'completed' : isSegmentActive ? 'active' : ''
                    }`}
                  />
                </div>
              )}

              <button
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
            </div>
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