/**
 * @file: constants.ts
 * @description 全局常量定义
 */

export const MODULE_NAME = 'vibe-inspector-plugin';

export const NAME_SPACE = 'sc';

export const VALID_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];

export const EXCLUDE_ELEMENTS = ['html', 'body', 'head', 'meta', 'style', 'script', 'link'];

export const MESSAGE_TYPES = {
  SELECTOR_SCRIPT_LOADED: 'SELECTOR_SCRIPT_LOADED',
  TOGGLE_SELECTOR: 'TOGGLE_SELECTOR',
  ELEMENT_CLICKED: 'ELEMENT_CLICKED',
  UPDATE_SELECTED_ELEMENTS: 'UPDATE_SELECTED_ELEMENTS',
  SCROLL_UPDATE: 'SCROLL_UPDATE',

  DRAG_START: 'DRAG_START',
  DRAG_MOVE: 'DRAG_MOVE',
  DRAG_DROP: 'DRAG_DROP',
  DRAG_END: 'DRAG_END',
  DROP_ZONE_CLICKED: 'DROP_ZONE_CLICKED',
  DROP_END: 'DROP_END',
  COMPONENT_DRAG_START: 'COMPONENT_DRAG_START',
  COMPONENT_DRAG_END: 'COMPONENT_DRAG_END',

  IFRAME_DRAG_MODE_ENABLED: 'IFRAME_DRAG_MODE_ENABLED',
  IFRAME_DRAG_MODE_DISABLED: 'IFRAME_DRAG_MODE_DISABLED',
  IFRAME_DRAG_OVER: 'IFRAME_DRAG_OVER',
  IFRAME_DRAG_FEEDBACK: 'IFRAME_DRAG_FEEDBACK',

  RUNTIME_ERROR: 'RUNTIME_ERROR',
  UNHANDLED_PROMISE_REJECTION: 'UNHANDLED_PROMISE_REJECTION',
} as const;

export const OVERLAY_STYLES = {
  HIGHLIGHT: {
    border: '2px dashed #4a6cf7',
    background: 'rgba(74,108,247,0.1)',
    zIndex: 999999,
  },
  SELECTED: {
    border: '2px solid #4a6cf7',
    background: 'rgba(74,108,247,0.15)',
    boxShadow: '0 0 0 2px rgba(74,108,247,0.2)',
    zIndex: 999998,
  },
  DROP_ZONE: {
    height: '40px',
    border: '2px dashed #4a6cf7',
    background: 'rgba(74,108,247,0.1)',
    borderRadius: '4px',
    margin: '8px 0',
  },
  DROP_ZONE_ACTIVE: {
    height: '40px',
    border: '2px solid #2d4ad4',
    background: 'rgba(74,108,247,0.35)',
  },
};

export const DATA_ATTRIBUTES = {
  ID: `data-${NAME_SPACE}-id`,
  NAME: `data-${NAME_SPACE}-name`,
  TYPE: `data-${NAME_SPACE}-type`,
  PATH: `data-${NAME_SPACE}-path`,
  LINE: `data-${NAME_SPACE}-line`,
  COL: `data-${NAME_SPACE}-col`,
  FILE: `data-${NAME_SPACE}-file`,
  PROPS: `data-${NAME_SPACE}-props`,
  COMPONENT_ID: 'data-component-id',
  F_ID: 'data-f-id',
};
