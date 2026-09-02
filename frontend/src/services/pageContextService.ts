export interface ActivePageContext {
  route: string;
  pageTitle: string;
  currentStep?: number;
  totalSteps?: number;
  stepTitle?: string;
  stepDescription?: string;
  actionGuidance?: string;
  activeTab?: string;
  metadata?: Record<string, any>;
}

class PageContextManager {
  private currentContext: ActivePageContext = {
    route: window.location.pathname,
    pageTitle: 'Deloitte Automated JET Platform',
  };

  private listeners: Array<(ctx: ActivePageContext) => void> = [];

  public getContext(): ActivePageContext {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isWorkflow = currentPath.includes('/spark-jet') || currentPath.includes('/omnia-jet') || currentPath.includes('/jet');
    if (isWorkflow && (this.currentContext.route === '/dashboard' || !this.currentContext.route.includes('jet'))) {
      return {
        ...this.currentContext,
        route: currentPath,
        pageTitle: 'JET Audit Workflow',
        currentStep: this.currentContext.currentStep || 1,
        stepTitle: 'Step 1: Ingest Data (Upload Files)',
        stepDescription: 'Upload Trial Balance and General Ledger population files, inspect detected sheets, and verify row counts.',
        actionGuidance: 'Upload CSV or multi-sheet Excel workbook for Trial Balance and Population files. Verify sheet previews before proceeding.',
      };
    }
    return { ...this.currentContext };
  }

  public setContext(context: Partial<ActivePageContext>): void {
    this.currentContext = {
      ...this.currentContext,
      ...context,
      route: context.route || window.location.pathname,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentContext);
      } catch (e) {
        console.error('PageContext listener error:', e);
      }
    });
  }

  public subscribe(listener: (ctx: ActivePageContext) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const PageContextService = new PageContextManager();
