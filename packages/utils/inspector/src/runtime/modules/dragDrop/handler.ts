/**
 * @file handler.ts
 * @description 拖拽事件处理器
 */

import { MESSAGE_TYPES } from '../../../shared/constants';
import type { IMessageBus, Position } from '../../../shared/types';
import { createLogger } from '../../../shared/utils';
import type { DropZoneManager } from './dropZones';

export class DragDropHandler {
  private logger: ReturnType<typeof createLogger>;

  constructor(
    private messageBus: IMessageBus,
    private dropZoneManager: DropZoneManager,
    private debug: boolean = false,
  ) {
    this.logger = createLogger('DragDropHandler', debug);
  }

  handleDragEnter = (e: DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this.logger.log('Document drag enter', e.target);
  };

  handleDragOver = (e: DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const zone = this.updateHighlightAt(e.clientX, e.clientY);
    this.messageBus.send('IFRAME_DRAG_OVER', {
      x: e.clientX,
      y: e.clientY,
      hasZone: !!zone,
    });
  };

  handleDragLeave = (e: DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      this.logger.log('Document drag leave');
      this.dropZoneManager.clearHighlight();
    }
  };

  handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    this.logger.log('Document drop event', e.clientX, e.clientY);
    this.tryDropAt(e.clientX, e.clientY);
    this.dropZoneManager.clearHighlight();
  };

  handleDragMove = (position: Position): void => {
    const zone = this.updateHighlightAt(position.x, position.y);
    this.logger.log('DRAG_MOVE', position.x, position.y, zone ? 'over zone' : 'no zone');
    this.messageBus.send('IFRAME_DRAG_FEEDBACK', {
      hasZone: !!zone,
      zoneInfo: zone ? { position: zone.dataset.position!, floorId: zone.dataset.floorId! } : null,
    });
  };

  handleDragEnd = (payload: Position & { isOverIframe?: boolean }): void => {
    this.logger.log('Received DRAG_END', payload);
    if (payload?.isOverIframe) {
      this.tryDropAt(payload.x, payload.y);
    }
  };

  private updateHighlightAt(x: number, y: number): HTMLElement | null {
    const zone = this.dropZoneManager.findDropZoneAtPoint(x, y);
    this.dropZoneManager.highlightZone(zone);
    return zone;
  }

  private tryDropAt(x: number, y: number): boolean {
    const zone = this.dropZoneManager.findDropZoneAtPoint(x, y);
    if (!zone) {
      return false;
    }
    this.sendDropEndMessage(zone);
    return true;
  }

  private sendDropEndMessage(zone: HTMLElement): void {
    const position = zone.dataset.position as 'before' | 'after';
    const floorId = zone.dataset.floorId!;
    this.messageBus.send(MESSAGE_TYPES.DROP_END, {
      position,
      floorId,
      timestamp: Date.now(),
    });
  }
}
