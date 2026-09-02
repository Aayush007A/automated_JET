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
