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
  runId?: string | null; 
  statusLabel?: string; 
  statusVariant?: 'default' | 'running' | 'completed' | 'warning'; 
  activeTitle?: string; 
  activeDescription?: string; 
  headerRight?: React.ReactNode; 
} 
 
const statusStyles: Record<string, { bg: string; border: string; color: string }> = { 
  default: { bg: '#E6F4F5', border: 'rgba(0,118,128,0.25)', color: 'var(--deloitte-teal)' }, 
  running: { bg: '#F0F9FF', border: '#BAE6FD', color: '#0284C7' }, 
  completed: { bg: '#F0FDF9', border: '#99F6E4', color: '#0D9488' }, 
  warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706' }, 
}; 
 
/** 
 * Horizontal "bubble" step timeline — replaces the old fixed vertical sidebar. 
 * Sits as a single premium card at the top of the workspace: connected step 
 * bubbles with a filling progress rail, plus a contextual banner beneath it 
 * describing the active step and hosting Back / Continue actions. 
 */ 
export const StepTimeline: React.FC<StepTimelineProps> = ({ 
  steps, 
  currentStep, 
  canAccessStep, 
  onStepClick, 
  runId, 
  statusLabel, 
  statusVariant = 'default', 
  activeTitle, 
  activeDescription, 
  headerRight, 
}) => { 
  const activeIndex = Math.max(0, steps.findIndex((s) => s.id === currentStep)); 
  const fillPct = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 0; 
  const active = steps.find((s) => s.id === currentStep); 
  const st = statusStyles[statusVariant] || statusStyles.default; 
 
  return ( 
    <div className="glass-panel timeline-card"> 
      {runId && ( 
        <div className="timeline-card-topline"> 
          <span className="timeline-run-id">{runId}</span> 
          {statusLabel && ( 
            <span 
              className="timeline-status-chip" 
              style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }} 
            > 
              <span className="timeline-status-dot" style={{ background: st.color }} /> 
              {statusLabel} 
            </span> 
          )} 
        </div> 
      )} 
 
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
                  <CheckCircle2 size={18} /> 
                ) : !allowed ? ( 
                  <Lock size={14} /> 
                ) : ( 
                  <Icon size={17} /> 
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
                <active.icon size={19} /> 
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