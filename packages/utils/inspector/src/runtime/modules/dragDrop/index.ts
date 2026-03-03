/**
 * @file index.ts
 * @description 拖拽模块
 */

import type { IMessageBus, IModule } from '../../../shared/types';
import { createLogger } from '../../../shared/utils';
import { DropZoneManager } from './dropZones';
import { DragDropHandler } from './handler';

export class DragDropModule implements IModule {
  name = 'drag-drop';

  private active = false;
  private dropZoneManager: DropZoneManager;
  private handler: DragDropHandler;
  private logger: ReturnType<typeof createLogger>;

  constructor(
    private messageBus: IMessageBus,
    private debug: boolean = false,
    private onLayoutChange?: () => void,
  ) {
    this.logger = createLogger('DragDropModule', debug);
    this.dropZoneManager = new DropZoneManager();
    this.handler = new DragDropHandler(messageBus, this.dropZoneManager, debug);
  }

  init(): void {
    this.messageBus.on('DRAG_START', this.handleDragStart);
    this.messageBus.on('DRAG_MOVE', this.handleDragMove);
    this.messageBus.on('DRAG_END', this.handleDragEnd);
    this.logger.log('DragDropModule initialized');
  }

  destroy(): void {
    this.disable();
    this.messageBus.off('DRAG_START', this.handleDragStart);
    this.messageBus.off('DRAG_MOVE', this.handleDragMove);
    this.messageBus.off('DRAG_END', this.handleDragEnd);
    this.logger.log('DragDropModule destroyed');
  }

  private handleDragStart = (): void => {
    this.enable();
  };

  private handleDragMove = (position: { x: number; y: number }): void => {
    if (this.active) {
      this.handler.handleDragMove(position);
    }
  };

  private handleDragEnd = (payload: { x: number; y: number; isOverIframe: boolean } | undefined): void => {
    const safePayload = payload ?? { x: 0, y: 0, isOverIframe: false };
    if (this.active) {
      this.handler.handleDragEnd(safePayload);
    }
    this.disable();
  };

  private enable(): void {
    if (this.active) {
      return;
    }

    this.active = true;
    this.dropZoneManager.createDropZones();

    this.logger.log('Drag mode enabled, adding event listeners');
    this.logger.log('Drop zones created:', this.dropZoneManager.getDropZones().length);

    this.dropZoneManager.getDropZones().forEach((zone, index) => {
      const rect = zone.getBoundingClientRect();
      this.logger.log(`Zone ${index}:`, {
        position: zone.dataset.position,
        floorId: zone.dataset.floorId,
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      });
    });

    window.addEventListener('dragenter', this.handler.handleDragEnter, true);
    window.addEventListener('dragover', this.handler.handleDragOver, true);
    window.addEventListener('dragleave', this.handler.handleDragLeave, true);
    window.addEventListener('drop', this.handler.handleDrop, true);

    document.body.addEventListener('dragenter', this.handler.handleDragEnter, false);
    document.body.addEventListener('dragover', this.handler.handleDragOver, false);
    document.body.addEventListener('dragleave', this.handler.handleDragLeave, false);
    document.body.addEventListener('drop', this.handler.handleDrop, false);

    this.messageBus.send('IFRAME_DRAG_MODE_ENABLED', {
      zonesCount: this.dropZoneManager.getDropZones().length,
      timestamp: Date.now(),
    });

    this.scheduleLayoutChangeNotify();
  }

  private disable(): void {
    if (!this.active) {
      return;
    }

    this.active = false;

    window.removeEventListener('dragenter', this.handler.handleDragEnter, true);
    window.removeEventListener('dragover', this.handler.handleDragOver, true);
    window.removeEventListener('dragleave', this.handler.handleDragLeave, true);
    window.removeEventListener('drop', this.handler.handleDrop, true);

    document.body.removeEventListener('dragenter', this.handler.handleDragEnter, false);
    document.body.removeEventListener('dragover', this.handler.handleDragOver, false);
    document.body.removeEventListener('dragleave', this.handler.handleDragLeave, false);
    document.body.removeEventListener('drop', this.handler.handleDrop, false);

    this.dropZoneManager.clearHighlight();
    this.dropZoneManager.removeAllDropZones();

    this.messageBus.send('IFRAME_DRAG_MODE_DISABLED', undefined);
    this.scheduleLayoutChangeNotify();

    this.logger.log('Drag mode disabled');
  }

  private scheduleLayoutChangeNotify(): void {
    if (!this.onLayoutChange) {
      return;
    }
    requestAnimationFrame(() => {
      this.onLayoutChange?.();
    });
  }

  updateDropZones(): void {
    if (this.active) {
      // no-op: optionally recreate drop zones
    }
  }
}
