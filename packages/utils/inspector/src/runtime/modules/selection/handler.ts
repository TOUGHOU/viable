/**
 * @file: handler.ts
 * @description 选择模式事件处理器
 */

import { DATA_ATTRIBUTES, NAME_SPACE } from '../../../shared/constants';
import type { ElementData, IMessageBus } from '../../../shared/types';
import {
  createLogger,
  findInspectableElement,
  getElementViewportRect,
} from '../../../shared/utils';
import type { HighlightOverlay, SelectedOverlay } from './overlay';

export class SelectionHandler {
  private hoveredElement: Element | null = null;
  private selectedElement: Element | null = null;
  private logger: ReturnType<typeof createLogger>;

  constructor(
    private messageBus: IMessageBus,
    private highlightOverlay: HighlightOverlay,
    private selectedOverlay: SelectedOverlay,
    private debug: boolean = false
  ) {
    this.logger = createLogger('SelectionHandler', debug);
  }

  handleMouseOver = (event: MouseEvent): void => {
    const target = event.target as Element;
    const inspectableElement = findInspectableElement(target);

    if (!inspectableElement) {
      return;
    }
    if (inspectableElement === this.selectedElement) {
      return;
    }
    if (inspectableElement === this.hoveredElement) {
      return;
    }

    this.hoveredElement = inspectableElement;
    this.highlightOverlay.update(inspectableElement);
  };

  handleMouseOut = (event: MouseEvent): void => {
    if (!this.hoveredElement) {
      return;
    }

    const relatedTarget = event.relatedTarget as Element | null;

    if (!relatedTarget) {
      this.hoveredElement = null;
      this.highlightOverlay.remove();
      return;
    }

    if (!relatedTarget || !this.hoveredElement.contains(relatedTarget)) {
      const selectedOverlayElement = this.selectedOverlay.getElement();
      if (relatedTarget !== selectedOverlayElement) {
        this.hoveredElement = null;
        this.highlightOverlay.remove();
      }
    }
  };

  handleClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as Element;
    const inspectableElement = findInspectableElement(target);

    if (!inspectableElement) {
      return;
    }

    if (inspectableElement === this.selectedElement) {
      return;
    }

    this.selectedElement = inspectableElement;
    this.selectedOverlay.update(this.selectedElement);

    if (this.hoveredElement === this.selectedElement) {
      this.hoveredElement = null;
      this.highlightOverlay.remove();
    }

    const elementData = this.extractElementData(this.selectedElement);
    this.messageBus.send('ELEMENT_CLICKED', elementData);
    this.sendScrollUpdate();
  };

  clearSelection(): void {
    if (this.selectedElement) {
      this.selectedElement = null;
      this.selectedOverlay.remove();
      this.messageBus.send('ELEMENT_CLICKED', null);
      this.messageBus.send('SCROLL_UPDATE', { rect: null });
    }
  }

  updateSelectedOverlay(): void {
    if (this.selectedElement) {
      this.selectedOverlay.update(this.selectedElement);
      this.sendScrollUpdate();
    }
  }

  private extractElementData(element: Element): ElementData {
    const rect = getElementViewportRect(element);

    const componentId =
      element.getAttribute(`data-${NAME_SPACE}-id`) ||
      element.getAttribute(DATA_ATTRIBUTES.F_ID) ||
      '';

    const componentName = element.getAttribute(`data-${NAME_SPACE}-name`) || '';
    const componentType = element.getAttribute(`data-${NAME_SPACE}-type`) || 'component';
    const componentPath = element.getAttribute(`data-${NAME_SPACE}-path`) || '';
    const componentLine = element.getAttribute(`data-${NAME_SPACE}-line`) || '';
    const componentCol = element.getAttribute(`data-${NAME_SPACE}-col`) || '';
    const componentFile = element.getAttribute(`data-${NAME_SPACE}-file`) || '';
    const floorId = element.getAttribute(`data-f-id`) || '';

    const name =
      componentName || element.getAttribute('data-component-name') || element.tagName.toLowerCase();

    const elementData: ElementData = {
      id: componentId || element.id || '',
      name,
      type: componentType as 'component' | 'element',
      filePath: componentPath,
      fileName: componentFile,
      lineNumber: componentLine ? Number(componentLine) : 0,
      col: componentCol ? Number(componentCol) : 0,
      floorId,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      },
    };

    return elementData;
  }

  private sendScrollUpdate(): void {
    if (!this.selectedElement) {
      this.messageBus.send('SCROLL_UPDATE', { rect: null });
      return;
    }

    const rect = getElementViewportRect(this.selectedElement);
    const elementId =
      this.selectedElement.getAttribute(`data-${NAME_SPACE}-id`) ||
      this.selectedElement.getAttribute(DATA_ATTRIBUTES.F_ID) ||
      this.selectedElement.getAttribute(DATA_ATTRIBUTES.COMPONENT_ID) ||
      '';

    this.messageBus.send('SCROLL_UPDATE', {
      elementId,
      rect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
    });
  }
}
