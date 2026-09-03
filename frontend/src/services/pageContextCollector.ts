import {
  ActivePageContext,
  VisiblePageContext,
  VisibleTableContext,
  VisibleCardContext,
  VisibleMetricContext,
  VisibleInputContext,
  VisibleFilterContext,
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

function collectInputs(root: Element): VisibleInputContext[] {
  const inputs: VisibleInputContext[] = [];
  const elements = Array.from(root.querySelectorAll('input:not([type="hidden"]), textarea')).filter(isVisible).filter((el) => !shouldIgnore(el));

  elements.forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    let label = '';
    if (input.id) {
      const labelEl = root.querySelector(`label[for="${input.id}"]`);
      if (labelEl) label = normalizeText(labelEl.textContent);
    }
    if (!label) {
      const parentLabel = input.closest('label');
      if (parentLabel) label = normalizeText(parentLabel.textContent);
    }
    if (!label) {
      label = input.getAttribute('aria-label') || input.name || input.placeholder || '';
    }

    if (label || input.value) {
      inputs.push({
        label: label || 'Input Field',
        value: input.type === 'password' ? '••••••••' : normalizeText(input.value),
        type: input.type,
        placeholder: input.placeholder || undefined,
      });
    }
  });

  return inputs.slice(0, 25);
}

function collectFilters(root: Element): VisibleFilterContext[] {
  const filters: VisibleFilterContext[] = [];
  const selects = Array.from(root.querySelectorAll('select')).filter(isVisible).filter((el) => !shouldIgnore(el));
  selects.forEach((s) => {
    const sel = s as HTMLSelectElement;
    const label = sel.getAttribute('aria-label') || sel.name || sel.previousElementSibling?.textContent || 'Filter';
    const activeOption = sel.options[sel.selectedIndex]?.text || sel.value;
    const options = Array.from(sel.options).map((o) => o.text);
    filters.push({
      label: normalizeText(label),
      activeValue: normalizeText(activeOption),
      options: options.slice(0, 10),
    });
  });

  const filterGroups = Array.from(root.querySelectorAll('[role="tablist"], [data-ai-context="filter-group"], .filter-pills')).filter(isVisible).filter((el) => !shouldIgnore(el));
  filterGroups.forEach((fg) => {
    const activeEl = fg.querySelector('[aria-selected="true"], .active, button[style*="background"]');
    const allBtns = Array.from(fg.querySelectorAll('button, [role="tab"]')).map((b) => normalizeText(b.textContent)).filter(Boolean);
    if (allBtns.length > 0) {
      filters.push({
        label: normalizeText(fg.getAttribute('aria-label') || 'Filter Selection'),
        activeValue: normalizeText(activeEl?.textContent) || allBtns[0],
        options: allBtns,
      });
    }
  });

  return filters.slice(0, 15);
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

  const inputs =
    collectInputs(pageRoot);

  const filters =
    collectFilters(pageRoot);

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
    inputs,
    filters,
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