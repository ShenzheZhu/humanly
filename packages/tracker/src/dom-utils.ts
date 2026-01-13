import { TrackerConfig } from './types';

/**
 * Find all input elements on the page
 */
export function findInputElements(selector?: string): HTMLElement[] {
  if (selector) {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements) as HTMLElement[];
  }

  // Default: find all input, textarea, and contenteditable elements
  const inputs = Array.from(document.querySelectorAll('input, textarea'));
  const contentEditables = Array.from(
    document.querySelectorAll('[contenteditable="true"]')
  );

  return [...inputs, ...contentEditables] as HTMLElement[];
}

/**
 * Generate a unique CSS selector for an element
 */
export function getElementSelector(element: HTMLElement): string {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try name attribute
  if ('name' in element && element.name) {
    return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
  }

  // Build path from parents
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add classes if present
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2); // Max 2 classes
      if (classes.length > 0 && classes[0]) {
        selector += '.' + classes.join('.');
      }
    }

    // Add nth-child if needed
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const index = siblings.indexOf(current);
      if (siblings.length > 1) {
        selector += `:nth-child(${index + 1})`;
      }
    }

    path.unshift(selector);

    // Limit path depth
    if (path.length >= 3) {
      break;
    }

    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Extract user ID from the page based on configuration
 */
export function getUserId(config: TrackerConfig): string | undefined {
  // Try selector first
  if (config.userIdSelector) {
    const element = document.querySelector(config.userIdSelector);
    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }

  // Try meta tag
  if (config.userIdKey) {
    const metaTag = document.querySelector(
      `meta[name="${config.userIdKey}"], meta[property="${config.userIdKey}"]`
    );
    if (metaTag) {
      const content = metaTag.getAttribute('content');
      if (content) {
        return content;
      }
    }
  }

  // Try data attributes on body
  if (config.userIdKey) {
    const dataAttr = document.body.getAttribute(`data-${config.userIdKey}`);
    if (dataAttr) {
      return dataAttr;
    }
  }

  return undefined;
}

/**
 * Set up MutationObserver to detect dynamically added input elements
 */
export function observeDynamicElements(
  callback: (elements: HTMLElement[]) => void,
  selector?: string
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    const addedElements: HTMLElement[] = [];

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;

          // Check if the element itself matches
          if (isTrackableElement(element, selector)) {
            addedElements.push(element);
          }

          // Check children
          const children = findInputElements(selector);
          children.forEach((child) => {
            if (element.contains(child)) {
              addedElements.push(child);
            }
          });
        }
      });
    });

    if (addedElements.length > 0) {
      callback(addedElements);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

/**
 * Check if an element should be tracked
 */
function isTrackableElement(element: HTMLElement, selector?: string): boolean {
  if (selector) {
    return element.matches(selector);
  }

  // Check if it's an input or textarea
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    return true;
  }

  // Check if it's contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Get text content from an element (handles input, textarea, and contenteditable)
 */
export function getElementText(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }

  if (element.getAttribute('contenteditable') === 'true') {
    return element.textContent || '';
  }

  return '';
}

/**
 * Get cursor position from an element
 */
export function getCursorPosition(element: HTMLElement): number | undefined {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.selectionStart || undefined;
  }

  // For contenteditable, get cursor position
  if (element.getAttribute('contenteditable') === 'true') {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return range.startOffset;
    }
  }

  return undefined;
}

/**
 * Get selection range from an element
 */
export function getSelectionRange(element: HTMLElement): {
  start: number | undefined;
  end: number | undefined;
} {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return {
      start: element.selectionStart || undefined,
      end: element.selectionEnd || undefined,
    };
  }

  if (element.getAttribute('contenteditable') === 'true') {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return {
        start: range.startOffset,
        end: range.endOffset,
      };
    }
  }

  return { start: undefined, end: undefined };
}

/**
 * Safely get element value without throwing errors
 */
export function safeGetElementValue(element: HTMLElement): string {
  try {
    return getElementText(element);
  } catch (error) {
    return '';
  }
}
