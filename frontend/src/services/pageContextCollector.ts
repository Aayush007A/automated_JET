import {
  ActivePageContext,
  VisiblePageContext,
  VisibleTableContext,
  VisibleCardContext,
  VisibleMetricContext,
} from './pageContextService';

const MAX_TEXT_LENGTH = 16000;
const MAX_ROWS_PER_TABLE = 15;
const MAX_COLUMNS_PER_TABLE = 12;

function normalizeText(
  value: string | null | undefined
): string {
  return (value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isVisible(element: Element): boolean {
  const htmlElement =
    element as HTMLElement;

  const rect =
    htmlElement.getBoundingClientRect();

  const style =
    window.getComputedStyle(htmlElement);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

function shouldIgnore(
  element: Element
): boolean {
  return Boolean(
    element.closest(
      '[data-ai-ignore="true"], .ai-assistant-modal-container, .ai-assistant-card, #ai-copilot-modal'
    )
  );
}

function collectHeadings(
  root: Element
): string[] {
  const primary = Array.from(
    root.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, [role="heading"]'
    )
  )
    .filter(isVisible)
    .filter((element) => !shouldIgnore(element))
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean);

  // Look for prominent section header elements
  const secondary = Array.from(
    root.querySelectorAll(
      '[class*="header-title"], [class*="section-title"], [class*="card-title"]'
    )
  )
    .filter(isVisible)
    .filter((element) => !shouldIgnore(element))
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean);

  const combined = Array.from(new Set([...primary, ...secondary]));
  return combined.slice(0, 50);
}

function collectCards(root: Element): VisibleCardContext[] {
  const cards: VisibleCardContext[] = [];

  // Look for exception cards or rule items in the sidebar or grid
  const cardElements = Array.from(
    root.querySelectorAll(
      '[data-ai-context="card"], [class*="exception-item"], [class*="rule-item"], [class*="card"], div[style*="cursor: pointer"]'
    )
  ).filter(isVisible).filter((el) => !shouldIgnore(el));

  cardElements.forEach((el) => {
    const text = normalizeText(el.textContent);
    // Check if element contains flag count or test indicator
    const hasFlags = /\b(\d+)\s*(Flags?|Entries|Excluded|Items)\b/i.test(text);
    const hasTest = /\b(Test\s*\d+|Ex\s*\d+|All\s*Consolidation|ALL)\b/i.test(text);

    if (hasFlags || hasTest || el.getAttribute('data-ai-context') === 'card') {
      // Find title
      const titleEl = el.querySelector('h3, h4, h5, [class*="title"], strong') || el.firstElementChild;
      let title = normalizeText(titleEl?.textContent);
      if (!title || title.length > 80) {
        // Fallback: match Test pattern
        const testMatch = text.match(/(Test\s*\d+:[^0-9]+|All Consolidation Flagged Entries)/i);
        title = testMatch ? testMatch[0].trim() : text.slice(0, 50);
      }

      // Find badge / count
      const countMatch = text.match(/(\d+)\s*(Flags?|Total|Excluded)/i);
      const count = countMatch ? countMatch[0] : undefined;

      const badgeMatch = text.match(/\b(T\s*\d+|Ex\s*\d+|ALL)\b/i);
      const badge = badgeMatch ? badgeMatch[0] : undefined;

      // Avoid duplicates
      if (title && !cards.some((c) => c.title.toLowerCase() === title.toLowerCase())) {
        cards.push({
          title,
          badge,
          count,
          subtitle: text.length > title.length + 10 ? text.slice(0, 150) : undefined,
        });
      }
    }
  });

  return cards.slice(0, 30);
}

function collectMetrics(root: Element): VisibleMetricContext[] {
  const metrics: VisibleMetricContext[] = [];

  // Elements explicitly marked as metrics or stat tiles
  const metricElements = Array.from(
    root.querySelectorAll(
      '[data-ai-context="metric"], [class*="metric"], [class*="stat"], [class*="badge"], [class*="pill"]'
    )
  ).filter(isVisible).filter((el) => !shouldIgnore(el));

  metricElements.forEach((el) => {
    const text = normalizeText(el.textContent);
    // Check for "Label: Value" or "Value Label" patterns
    if (text.length > 2 && text.length < 80) {
      if (text.includes(':')) {
        const parts = text.split(':');
        metrics.push({
          label: parts[0].trim(),
          value: parts.slice(1).join(':').trim(),
        });
      } else {
        const countMatch = text.match(/^([\d,.$%+-]+)\s+(.+)$/) || text.match(/^(.+?)\s+([\d,.$%+-]+)$/);
        if (countMatch) {
          metrics.push({
            label: countMatch[1].match(/[\d,.$%+-]+/) ? countMatch[2].trim() : countMatch[1].trim(),
            value: countMatch[1].match(/[\d,.$%+-]+/) ? countMatch[1].trim() : countMatch[2].trim(),
          });
        }
      }
    }
  });

  return metrics.slice(0, 30);
}

function collectLabels(
  root: Element
): string[] {
  const explicitlyMarked = Array.from(
    root.querySelectorAll(
      '[data-ai-context="label"], ' +
        '[data-ai-context="metric"], ' +
        '[data-ai-context="field"], ' +
        'label'
    )
  )
    .filter(isVisible)
    .filter((element) => !shouldIgnore(element))
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean);

  return explicitlyMarked.slice(0, 60);
}

function collectButtons(
  root: Element
): string[] {
  return Array.from(
    root.querySelectorAll('button, [role="tab"]')
  )
    .filter(isVisible)
    .filter(
      (element) => !shouldIgnore(element)
    )
    .map((element) =>
      normalizeText(
        element.textContent
      )
    )
    .filter(Boolean)
    .slice(0, 40);
}

function collectParagraphs(
  root: Element
): string[] {
  return Array.from(
    root.querySelectorAll(
      'p, li, [data-ai-context="description"]'
    )
  )
    .filter(isVisible)
    .filter(
      (element) => !shouldIgnore(element)
    )
    .map((element) =>
      normalizeText(
        element.textContent
      )
    )
    .filter(Boolean)
    .slice(0, 60);
}

function collectTables(
  root: Element
): VisibleTableContext[] {
  const tables =
    Array.from(
      root.querySelectorAll('table')
    );

  return tables
    .filter(isVisible)
    .filter(
      (table) => !shouldIgnore(table)
    )
    .slice(0, 10)
    .map((table) => {
      const titleElement =
        table.querySelector(
          'caption'
        ) ||
        table.previousElementSibling;

      const title =
        normalizeText(
          titleElement?.textContent
        ) || undefined;

      const headers =
        Array.from(
          table.querySelectorAll(
            'thead th, thead td'
          )
        )
          .map((cell) =>
            normalizeText(
              cell.textContent
            )
          )
          .filter(Boolean)
          .slice(
            0,
            MAX_COLUMNS_PER_TABLE
          );

      const rows =
        Array.from(
          table.querySelectorAll(
            'tbody tr'
          )
        )
          .filter(isVisible)
          .slice(
            0,
            MAX_ROWS_PER_TABLE
          )
          .map((row) =>
            Array.from(
              row.querySelectorAll(
                'th, td'
              )
            )
              .map((cell) =>
                normalizeText(
                  cell.textContent
                )
              )
              .slice(
                0,
                MAX_COLUMNS_PER_TABLE
              )
          );

      return {
        title,
        headers,
        rows,
      };
    });
}

function collectSelectedText(): string {
  try {
    return normalizeText(
      window
        .getSelection()
        ?.toString()
    ).slice(0, 2000);
  } catch {
    return '';
  }
}

export function collectVisiblePageContext(
  root?: Element
): VisiblePageContext {
  const pageRoot =
    root ||
    document.querySelector('main') ||
    document.body;

  const headings =
    collectHeadings(pageRoot);

  const cards =
    collectCards(pageRoot);

  const metrics =
    collectMetrics(pageRoot);

  const labels =
    collectLabels(pageRoot);

  const buttons =
    collectButtons(pageRoot);

  const paragraphs =
    collectParagraphs(pageRoot);

  const tables =
    collectTables(pageRoot);

  const selectedText =
    collectSelectedText();

  // Clone and strip ignored elements (like the AI assistant modal itself) before grabbing raw text
  let rawText = '';
  try {
    const clone = pageRoot.cloneNode(true) as HTMLElement;
    const ignored = clone.querySelectorAll(
      '[data-ai-ignore="true"], .ai-assistant-modal-container, .ai-assistant-card, #ai-copilot-modal, script, style, noscript'
    );
    ignored.forEach((el) => el.remove());
    rawText = normalizeText(clone.textContent);
  } catch {
    rawText = normalizeText(pageRoot.textContent);
  }

  const text =
    rawText.slice(
      0,
      MAX_TEXT_LENGTH
    );

  return {
    headings,
    cards,
    metrics,
    labels,
    buttons,
    paragraphs,
    tables,
    selectedText,
    text,
    url:
      window.location.href,
    capturedAt:
      new Date().toISOString(),
  };
}

export function buildContextSummary(
  context?: ActivePageContext
): string[] {
  if (!context) {
    return [];
  }

  const signals: string[] = [];

  if (context.pageTitle) {
    signals.push(context.pageTitle);
  }

  if (context.stepTitle) {
    signals.push(context.stepTitle);
  }

  if (context.activeTab) {
    signals.push(
      `Tab: ${context.activeTab}`
    );
  }

  if (context.selectedItem) {
    signals.push(`Active: ${context.selectedItem}`);
  }

  if (context.metadata?.totalFlags !== undefined) {
    signals.push(`${context.metadata.totalFlags} Total Flags`);
  }

  if (
    context.visibleContent?.cards?.length
  ) {
    signals.push(
      `${context.visibleContent.cards.length} visible tests`
    );
  }

  if (
    context.visibleContent?.headings?.length
  ) {
    signals.push(
      `${context.visibleContent.headings.length} sections`
    );
  }

  if (
    context.visibleContent?.tables?.length
  ) {
    signals.push(
      `${context.visibleContent.tables.length} tables`
    );
  }

  return signals.slice(0, 8);
}