// export interface ActivePageContext {
//   route: string;
//   pageTitle: string;
//   currentStep?: number;
//   totalSteps?: number;
//   stepTitle?: string;
//   stepDescription?: string;
//   actionGuidance?: string;
//   activeTab?: string;
//   metadata?: Record<string, any>;
// }

// class PageContextManager {
//   private currentContext: ActivePageContext = {
//     route: window.location.pathname,
//     pageTitle: 'Deloitte Automated JET Platform',
//   };

//   private listeners: Array<(ctx: ActivePageContext) => void> = [];

//   public getContext(): ActivePageContext {
//     const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
//     const isWorkflow = currentPath.includes('/spark-jet') || currentPath.includes('/omnia-jet') || currentPath.includes('/jet');
//     if (isWorkflow && (this.currentContext.route === '/dashboard' || !this.currentContext.route.includes('jet'))) {
//       return {
//         ...this.currentContext,
//         route: currentPath,
//         pageTitle: 'JET Audit Workflow',
//         currentStep: this.currentContext.currentStep || 1,
//         stepTitle: 'Step 1: Ingest Data (Upload Files)',
//         stepDescription: 'Upload Trial Balance and General Ledger population files, inspect detected sheets, and verify row counts.',
//         actionGuidance: 'Upload CSV or multi-sheet Excel workbook for Trial Balance and Population files. Verify sheet previews before proceeding.',
//       };
//     }
//     return { ...this.currentContext };
//   }

//   public setContext(context: Partial<ActivePageContext>): void {
//     this.currentContext = {
//       ...this.currentContext,
//       ...context,
//       route: context.route || window.location.pathname,
//     };
//     this.listeners.forEach((listener) => {
//       try {
//         listener(this.currentContext);
//       } catch (e) {
//         console.error('PageContext listener error:', e);
//       }
//     });
//   }

//   public subscribe(listener: (ctx: ActivePageContext) => void): () => void {
//     this.listeners.push(listener);
//     return () => {
//       this.listeners = this.listeners.filter((l) => l !== listener);
//     };
//   }
// }

// export const PageContextService = new PageContextManager();

export interface VisibleTableContext {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface VisibleCardContext {
  title: string;
  badge?: string;
  count?: string | number;
  subtitle?: string;
  status?: string;
}

export interface VisibleMetricContext {
  label: string;
  value: string;
  subtext?: string;
}

export interface VisiblePageContext {
  headings: string[];
  labels: string[];
  buttons: string[];
  paragraphs: string[];
  cards?: VisibleCardContext[];
  metrics?: VisibleMetricContext[];
  tables: VisibleTableContext[];
  selectedText: string;
  text: string;
  url: string;
  capturedAt: string;
}

export interface ActivePageContext {
  route: string;
  pageTitle: string;

  currentStep?: number;
  totalSteps?: number;

  stepTitle?: string;
  stepDescription?: string;
  actionGuidance?: string;
  activeTab?: string;
  selectedItem?: string;

  visibleContent?: VisiblePageContext;

  metadata?: Record<string, any>;
}

class PageContextManager {
  private currentContext: ActivePageContext = {
    route:
      typeof window !== 'undefined'
        ? window.location.pathname
        : '',
    pageTitle: 'Deloitte Automated JET Platform',
  };

  private listeners: Array<
    (ctx: ActivePageContext) => void
  > = [];

  public getContext(): ActivePageContext {
    const currentPath =
      typeof window !== 'undefined'
        ? window.location.pathname
        : '';

    return {
      ...this.currentContext,
      route: currentPath || this.currentContext.route,
    };
  }

  public setContext(
    context: Partial<ActivePageContext>
  ): void {
    const mergedMetadata = context.metadata
      ? { ...(this.currentContext.metadata || {}), ...context.metadata }
      : this.currentContext.metadata;

    this.currentContext = {
      ...this.currentContext,
      ...context,
      metadata: mergedMetadata,
      route:
        context.route ||
        (typeof window !== 'undefined'
          ? window.location.pathname
          : this.currentContext.route),
    };

    this.emit();
  }

  public updateMetadata(metadata: Record<string, any>): void {
    this.setContext({
      metadata,
    });
  }

  public setScreenContext(
    visibleContent: VisiblePageContext
  ): void {
    this.currentContext = {
      ...this.currentContext,
      route:
        typeof window !== 'undefined'
          ? window.location.pathname
          : this.currentContext.route,
      visibleContent,
    };

    this.emit();
  }

  public refreshScreenContext(
    visibleContent: VisiblePageContext
  ): ActivePageContext {
    this.setScreenContext(visibleContent);
    return this.getContext();
  }

  public subscribe(
    listener: (ctx: ActivePageContext) => void
  ): () => void {
    this.listeners.push(listener);

    return () => {
      this.listeners =
        this.listeners.filter(
          (item) => item !== listener
        );
    };
  }

  private emit(): void {
    const context = this.getContext();

    this.listeners.forEach((listener) => {
      try {
        listener(context);
      } catch (error) {
        console.error(
          'PageContext listener error:',
          error
        );
      }
    });
  }
}

export const PageContextService =
  new PageContextManager();