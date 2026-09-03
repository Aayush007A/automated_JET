import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageContextService } from '../services/pageContextService';

export function useApplicationContextSync() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (path === '/dashboard' || path === '/') {
      PageContextService.setContext({
        route: path,
        pageTitle: 'Deloitte Automated JET - Executive Dashboard',
        stepTitle: 'Executive Audit Intelligence Hub',
        stepDescription: 'Central command console for Journal Entry Testing (JET), active audit runs, 20 Golden DQC integrity monitors, and workflow launches.',
        actionGuidance: 'Select an audit engagement run to view results, launch Omnia JET or Spark JET, or review telemetry logs.',
        metadata: {
          activeRoute: path,
          workflowsAvailable: ['Omnia JET (Integrated 6-Stage Audit Workflow)', 'Spark JET (Distributed Big-Data Engine)', 'Classic JET'],
          coreStandards: ['ISA 240 (Auditor\'s Fraud Responsibilities)', 'PCAOB AS 2401', 'AICPA SAS 99'],
          goldenDqcCount: 20,
          parametricTestsCount: 12,
        },
      });
    } else if (path.includes('/omnia-jet')) {
      PageContextService.setContext({
        route: path,
        pageTitle: 'Omnia JET - Unified 6-Stage Audit Testing Workflow',
        stepTitle: 'Omnia JET Audit Workflow',
        stepDescription: 'Deloitte Omnia integrated 6-stage Journal Entry Testing pipeline with automated constraints validation and executive analytics.',
        actionGuidance: 'Follow the 6 stages: Data Upload, File Preparation (EDA), File Cleaning (20 DQC), CDM Mapping, Integrity Pipeline, and Executive Summary.',
        metadata: {
          activeRoute: path,
          workflowType: 'Omnia JET',
          totalStages: 6,
          goldenDqcRules: 20,
          parametricTests: 12,
        },
      });
    } else if (path.includes('/spark-jet')) {
      PageContextService.setContext({
        route: path,
        pageTitle: 'Spark JET - High-Performance Distributed Big-Data Pipeline',
        stepTitle: 'Spark JET Workflow',
        stepDescription: 'Enterprise high-throughput journal entry testing engine built for large-scale transaction populations.',
        actionGuidance: 'Upload general ledger and trial balance populations for distributed Spark cluster processing and anomaly triage.',
        metadata: {
          activeRoute: path,
          workflowType: 'Spark JET',
          totalStages: 6,
          goldenDqcRules: 20,
          parametricTests: 12,
        },
      });
    } else if (path.includes('/jet')) {
      PageContextService.setContext({
        route: path,
        pageTitle: 'Classic JET - Parametric Journal Entry Testing',
        stepTitle: 'Classic JET Testing Workflow',
        stepDescription: 'Standard parametric exception testing workflow executing Tests 01 through 12.',
        actionGuidance: 'Configure testing parameters and run exception checks.',
        metadata: {
          activeRoute: path,
          workflowType: 'Classic JET',
          parametricTests: 12,
        },
      });
    } else if (path.includes('/login') || path.includes('/register')) {
      PageContextService.setContext({
        route: path,
        pageTitle: 'Deloitte Automated JET - User Authentication',
        stepTitle: 'Authentication & Security Access',
        stepDescription: 'Secure enterprise credentials verification and role-based audit access.',
        actionGuidance: 'Sign in with your enterprise credentials or contact the engagement team administrator.',
      });
    }
  }, [location.pathname]);
}
