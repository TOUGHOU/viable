/**
 * @file overlay.ts
 * @description 覆盖层管理器
 */

import { OVERLAY_STYLES } from '../../../shared/constants';
import type { IOverlayManager } from '../../../shared/types';
import { applyStyles, createOverlayElement, getElementRect } from '../../../shared/utils';

export class HighlightOverlay implements IOverlayManager {
  private overlay: HTMLElement | null = null;

  create(): HTMLElement {
    if (this.overlay) {
      return this.overlay;
    }

    this.overlay = createOverlayElement();

    applyStyles(this.overlay, {
      border: OVERLAY_STYLES.HIGHLIGHT.border,
      backgroundColor: OVERLAY_STYLES.HIGHLIGHT.background,
      zIndex: OVERLAY_STYLES.HIGHLIGHT.zIndex,
    });

    document.body.appendChild(this.overlay);
    return this.overlay;
  }

  update(element: Element): void {
    const overlay = this.create();
    const rect = getElementRect(element);

    applyStyles(overlay, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  remove(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
  }

  getElement(): HTMLElement | null {
    return this.overlay;
  }
}

export class SelectedOverlay implements IOverlayManager {
  private overlay: HTMLElement | null = null;

  create(): HTMLElement {
    if (this.overlay) {
      return this.overlay;
    }

    this.overlay = createOverlayElement('browser-preview-selected-overlay');

    applyStyles(this.overlay, {
      border: OVERLAY_STYLES.SELECTED.border,
      backgroundColor: OVERLAY_STYLES.SELECTED.background,
      boxShadow: OVERLAY_STYLES.SELECTED.boxShadow,
      zIndex: OVERLAY_STYLES.SELECTED.zIndex,
    });

    document.body.appendChild(this.overlay);
    return this.overlay;
  }

  update(element: Element): void {
    const overlay = this.create();
    const rect = getElementRect(element);

    applyStyles(overlay, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  remove(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
  }

  getElement(): HTMLElement | null {
    return this.overlay;
  }
}
