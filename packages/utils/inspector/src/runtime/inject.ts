/**
 * @file inject.ts
 * @description Inspector Runtime - 浏览器端注入脚本
 */

import type { RuntimeConfig } from '../shared/types';
import { rafThrottle } from '../shared/utils';
import { DragDropModule } from './modules/dragDrop';
import { FiberInjectorModule } from './modules/fiberInjector';
import { MessageBus } from './modules/messaging';
import { SelectionModule } from './modules/selection';

class InspectorRuntime {
  private messageBus: MessageBus;
  private selectionModule: SelectionModule | null = null;
  private dragDropModule: DragDropModule | null = null;
  private fiberInjectorModule: FiberInjectorModule | null = null;
  private config: RuntimeConfig;

  constructor(config: RuntimeConfig = {}) {
    this.config = {
      namespace: 'sc',
      debug: false,
      features: {
        selection: true,
        dragDrop: true,
      },
      ...config,
    };

    this.messageBus = new MessageBus(this.config.debug);
  }

  init(): void {
    this.messageBus.init();

    if (this.config.features?.selection) {
      this.selectionModule = new SelectionModule(this.messageBus, this.config.debug);
      this.selectionModule.init();

      this.fiberInjectorModule = new FiberInjectorModule(this.config.debug);
      this.fiberInjectorModule.init();
    }

    if (this.config.features?.dragDrop) {
      this.dragDropModule = new DragDropModule(this.messageBus, this.config.debug, () =>
        this.selectionModule?.updateOverlays(),
      );
      this.dragDropModule.init();
    }

    this.setupGlobalListeners();

    if (this.config.debug) {
      console.log('[InspectorRuntime] Initialized with config:', this.config);
    }
  }

  destroy(): void {
    this.selectionModule?.destroy();
    this.dragDropModule?.destroy();
    this.fiberInjectorModule?.destroy();
    this.messageBus.destroy();
    this.removeGlobalListeners();
  }

  private setupGlobalListeners(): void {
    window.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  private removeGlobalListeners(): void {
    window.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  private handleScroll = rafThrottle(() => {
    this.selectionModule?.updateOverlays();
    this.dragDropModule?.updateDropZones();
  });

  private handleResize = rafThrottle(() => {
    this.selectionModule?.updateOverlays();
    this.dragDropModule?.updateDropZones();
  });

  private handleBeforeUnload = (): void => {
    this.destroy();
  };
}

export { InspectorRuntime };
