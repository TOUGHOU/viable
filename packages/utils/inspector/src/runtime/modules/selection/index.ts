/**
 * @file index.ts
 * @description 选择模块
 */

import type { IMessageBus, IModule, MessagePayload } from '../../../shared/types';
import { createLogger } from '../../../shared/utils';
import { SelectionHandler } from './handler';
import { HighlightOverlay, SelectedOverlay } from './overlay';

export class SelectionModule implements IModule {
  name = 'selection';

  private active = false;
  private highlightOverlay: HighlightOverlay;
  private selectedOverlay: SelectedOverlay;
  private handler: SelectionHandler;
  private logger: ReturnType<typeof createLogger>;

  constructor(
    private messageBus: IMessageBus,
    private debug: boolean = false,
  ) {
    this.logger = createLogger('SelectionModule', debug);
    this.highlightOverlay = new HighlightOverlay();
    this.selectedOverlay = new SelectedOverlay();
    this.handler = new SelectionHandler(messageBus, this.highlightOverlay, this.selectedOverlay, debug);
  }

  init(): void {
    this.messageBus.on('TOGGLE_SELECTOR', this.handleToggle);
    this.messageBus.on('UPDATE_SELECTED_ELEMENTS', this.handleUpdateSelected);
    this.logger.log('SelectionModule initialized');
  }

  destroy(): void {
    this.disable();
    this.messageBus.off('TOGGLE_SELECTOR', this.handleToggle);
    this.messageBus.off('UPDATE_SELECTED_ELEMENTS', this.handleUpdateSelected);
    this.logger.log('SelectionModule destroyed');
  }

  private handleToggle = (payload: MessagePayload['TOGGLE_SELECTOR']): void => {
    if (payload) {
      this.enable();
    } else {
      this.disable();
    }
  };

  private handleUpdateSelected = (payload: MessagePayload['UPDATE_SELECTED_ELEMENTS']): void => {
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      this.handler.clearSelection();
      this.highlightOverlay.remove();
    }
  };

  private enable(): void {
    if (this.active) {
      return;
    }

    this.active = true;
    document.body.style.cursor = 'crosshair';

    document.addEventListener('mouseover', this.handler.handleMouseOver, true);
    document.addEventListener('mouseout', this.handler.handleMouseOut, true);
    document.addEventListener('click', this.handler.handleClick, true);

    this.logger.log('Selection mode enabled');
  }

  private disable(): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    document.body.style.cursor = '';

    document.removeEventListener('mouseover', this.handler.handleMouseOver, true);
    document.removeEventListener('mouseout', this.handler.handleMouseOut, true);
    document.removeEventListener('click', this.handler.handleClick, true);

    this.highlightOverlay.remove();

    this.logger.log('Selection mode disabled');
  }

  updateOverlays(): void {
    this.handler.updateSelectedOverlay();
  }
}
