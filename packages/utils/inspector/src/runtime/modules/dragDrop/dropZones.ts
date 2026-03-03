/**
 * @file dropZones.ts
 * @description 放置区管理器
 */

import { DATA_ATTRIBUTES, OVERLAY_STYLES } from '../../../shared/constants';
import { applyStyles, createOverlayElement } from '../../../shared/utils';

interface Floor {
  element: Element;
  id: string;
}

export class DropZoneManager {
  private dropZones: HTMLElement[] = [];
  private currentHighlightedZone: HTMLElement | null = null;

  createDropZones(): void {
    this.removeAllDropZones();

    const floors = this.getAllFloors();

    floors.forEach((floor, index) => {
      if (index === 0) {
        const topZone = this.createDropZone('before', floor.element, floor.id);
        floor.element.parentNode!.insertBefore(topZone, floor.element);
        this.dropZones.push(topZone);
      }

      const bottomZone = this.createDropZone('after', floor.element, floor.id);
      if (floor.element.nextSibling) {
        floor.element.parentNode!.insertBefore(bottomZone, floor.element.nextSibling);
      } else {
        floor.element.parentNode!.appendChild(bottomZone);
      }
      this.dropZones.push(bottomZone);
    });
  }

  removeAllDropZones(): void {
    this.dropZones.forEach((zone) => {
      if (zone && zone.parentNode) {
        zone.parentNode.removeChild(zone);
      }
    });
    this.dropZones = [];
    this.currentHighlightedZone = null;
  }

  findDropZoneAtPoint(x: number, y: number): HTMLElement | null {
    for (const zone of this.dropZones) {
      const rect = zone.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return zone;
      }
    }
    return null;
  }

  highlightZone(zone: HTMLElement | null): void {
    if (this.currentHighlightedZone === zone) {
      return;
    }

    if (this.currentHighlightedZone) {
      applyStyles(this.currentHighlightedZone, {
        backgroundColor: OVERLAY_STYLES.DROP_ZONE.background,
        borderColor: OVERLAY_STYLES.DROP_ZONE.border.split(' ')[2],
        borderWidth: OVERLAY_STYLES.DROP_ZONE.border.split(' ')[0],
        height: OVERLAY_STYLES.DROP_ZONE.height,
        borderStyle: 'dashed',
      });
    }

    if (zone) {
      applyStyles(zone, {
        backgroundColor: OVERLAY_STYLES.DROP_ZONE_ACTIVE.background,
        borderColor: OVERLAY_STYLES.DROP_ZONE_ACTIVE.border.split(' ')[2],
        borderWidth: OVERLAY_STYLES.DROP_ZONE_ACTIVE.border.split(' ')[0],
        height: OVERLAY_STYLES.DROP_ZONE_ACTIVE.height,
        borderStyle: 'solid',
      });
    }

    this.currentHighlightedZone = zone;
  }

  clearHighlight(): void {
    this.highlightZone(null);
  }

  getDropZones(): HTMLElement[] {
    return this.dropZones;
  }

  getZoneInfo(zone: HTMLElement): {
    position: string;
    floorId: string;
    rect: DOMRect;
  } {
    const position = zone.dataset.position ?? '';
    const floorId = zone.dataset.floorId ?? '';
    const rect = zone.getBoundingClientRect();
    return { position, floorId, rect };
  }

  private createDropZone(position: 'before' | 'after', targetElement: Element, floorId: string): HTMLElement {
    const zone = createOverlayElement();
    zone.className = 'drop-zone-overlay';
    zone.dataset.position = position;
    zone.dataset.floorId = floorId;

    applyStyles(zone, {
      position: 'relative',
      display: 'block',
      height: OVERLAY_STYLES.DROP_ZONE.height,
      border: OVERLAY_STYLES.DROP_ZONE.border,
      backgroundColor: OVERLAY_STYLES.DROP_ZONE.background,
      borderRadius: OVERLAY_STYLES.DROP_ZONE.borderRadius,
      cursor: 'pointer',
      margin: OVERLAY_STYLES.DROP_ZONE.margin,
      transition: 'all 0.2s ease',
      pointerEvents: 'auto',
    });

    return zone;
  }

  private getAllFloors(): Floor[] {
    const floors: Floor[] = [];
    const elements = document.querySelectorAll(`[${DATA_ATTRIBUTES.COMPONENT_ID}], [${DATA_ATTRIBUTES.F_ID}]`);

    elements.forEach((element) => {
      const id = element.getAttribute(DATA_ATTRIBUTES.COMPONENT_ID) || element.getAttribute(DATA_ATTRIBUTES.F_ID);

      if (id) {
        floors.push({ element, id });
      }
    });

    return floors;
  }
}
