/**
 * @file: utils.ts
 * @description 工具函数
 */

import { DATA_ATTRIBUTES, EXCLUDE_ELEMENTS } from './constants';
import type { InspectorPluginOptions, Rect } from './types';

export function shouldInspect(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();

  if (EXCLUDE_ELEMENTS.includes(tagName)) {
    return false;
  }

  if (
    element.id === 'browser-preview-selected-overlay' ||
    element.classList.contains('drop-zone-overlay')
  ) {
    return false;
  }

  return element.hasAttribute(DATA_ATTRIBUTES.ID);
}

export function findInspectableElement(element: Element | null): Element | null {
  if (!element) {
    return null;
  }

  let current: Element | null = element;

  while (current && current !== document.body && current !== document.documentElement) {
    if (shouldInspect(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

export function getElementRect(element: Element): Rect {
  const rect = element.getBoundingClientRect();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;

  return {
    left: rect.left + scrollX,
    top: rect.top + scrollY,
    width: rect.width,
    height: rect.height,
    right: rect.right + scrollX,
    bottom: rect.bottom + scrollY,
  };
}

export function getElementViewportRect(element: Element): Rect {
  const rect = element.getBoundingClientRect();

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

export function applyStyles(element: HTMLElement, styles: Record<string, string | number>): void {
  Object.entries(styles).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    element.style.setProperty(cssKey, String(value));
  });
}

export function createOverlayElement(id?: string): HTMLElement {
  const overlay = document.createElement('div');

  if (id) {
    overlay.id = id;
  }

  applyStyles(overlay, {
    position: 'absolute',
    pointerEvents: 'none',
    borderRadius: '2px',
    boxSizing: 'border-box',
    transition: 'all 0.1s ease',
  });

  return overlay;
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  let previous = 0;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = window.setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

export function rafThrottle<T extends (...args: unknown[]) => unknown>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      func.apply(this, args);
      rafId = null;
    });
  };
}

export function isPointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function safeJsonParse<T = unknown>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function createLogger(namespace: string, debug: boolean) {
  return {
    log: (...args: unknown[]) => {
      if (debug) {
        console.log(`[${namespace}]`, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (debug) {
        console.warn(`[${namespace}]`, ...args);
      }
    },
    error: (...args: unknown[]) => {
      console.error(`[${namespace}]`, ...args);
    },
  };
}

export function createRuntimeBootstrapCode(
  runtimeFilePath: string,
  runtimeConfig: InspectorPluginOptions['runtime'] = {}
): string {
  return `import { InspectorRuntime } from ${JSON.stringify(runtimeFilePath)};
if (typeof window !== 'undefined') {
  const runtime = new InspectorRuntime(${JSON.stringify(runtimeConfig)});
  runtime.init();
  window.__inspectorRuntime = runtime;
}`;
}
