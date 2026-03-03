/**
 * @file types.ts
 * @description 类型定义
 */

import type { MESSAGE_TYPES } from './constants';

// ============ 通用类型 ============

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/** 与 Rect 同构，用于 SCROLL_UPDATE 等 payload.rect */
export type ScrollRect = Rect;

export interface Position {
  x: number;
  y: number;
}

/** iframe 上报的运行时错误（RUNTIME_ERROR / UNHANDLED_PROMISE_REJECTION 的 payload） */
export interface ErrorInfo {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  blankScreen?: boolean;
}

/** 放置区信息（DROP_ZONE_CLICKED / DROP_END 等） */
export interface DropZoneInfo {
  position: 'before' | 'after';
  floorId: string;
  timestamp: number;
}

/** 选中元素信息（父页展示用，与 ElementData 子集对齐） */
export interface IframeInfoItem {
  id: string;
  name: string;
  filePath: string;
  fileName: string;
  lineNumber: number;
  col: number;
  meta: Record<string, unknown>;
}

// ============ 运行时类型 ============

export interface RuntimeConfig {
  namespace?: string;
  debug?: boolean;
  features?: {
    selection?: boolean;
    dragDrop?: boolean;
  };
}

export interface ElementData {
  id: string;
  name: string;
  type: 'component' | 'element';
  filePath: string;
  fileName: string;
  lineNumber: number;
  col: number;
  floorId: string;
  rect: Rect;
  meta?: PropSchema[];
}

export interface MessagePayload {
  [MESSAGE_TYPES.SELECTOR_SCRIPT_LOADED]: {
    version: string;
    timestamp: number;
  };
  [MESSAGE_TYPES.TOGGLE_SELECTOR]: boolean;
  [MESSAGE_TYPES.ELEMENT_CLICKED]: ElementData | null;
  [MESSAGE_TYPES.UPDATE_SELECTED_ELEMENTS]: ElementData[];
  [MESSAGE_TYPES.SCROLL_UPDATE]: {
    elementId?: string;
    rect: Rect | null;
  };
  [MESSAGE_TYPES.DRAG_START]: void;
  [MESSAGE_TYPES.DRAG_MOVE]: Position;
  [MESSAGE_TYPES.DRAG_DROP]: Position;
  [MESSAGE_TYPES.DRAG_END]: Position & { isOverIframe: boolean };
  [MESSAGE_TYPES.DROP_ZONE_CLICKED]: DropZoneInfo;
  [MESSAGE_TYPES.DROP_END]: DropZoneInfo;
  [MESSAGE_TYPES.COMPONENT_DRAG_START]: unknown;
  [MESSAGE_TYPES.COMPONENT_DRAG_END]: unknown;
  [MESSAGE_TYPES.RUNTIME_ERROR]: ErrorInfo;
  [MESSAGE_TYPES.UNHANDLED_PROMISE_REJECTION]: ErrorInfo;

  [MESSAGE_TYPES.IFRAME_DRAG_MODE_ENABLED]: {
    zonesCount: number;
    timestamp: number;
  };
  [MESSAGE_TYPES.IFRAME_DRAG_MODE_DISABLED]: undefined;
  [MESSAGE_TYPES.IFRAME_DRAG_OVER]: Position & { hasZone: boolean };
  [MESSAGE_TYPES.IFRAME_DRAG_FEEDBACK]: {
    hasZone: boolean;
    zoneInfo: {
      position: string;
      floorId: string;
    } | null;
  };
}

export type MessageType = keyof typeof MESSAGE_TYPES;

export interface Message<T extends MessageType = MessageType> {
  type: T;
  payload: MessagePayload[T];
}

// ============ 转换层类型 ============

export interface TransformConfig {
  enabled?: boolean;
  debug?: boolean;
  includeElements?: string[];
  excludeElements?: string[];
}

export interface TransformResult {
  code: string;
  map?: unknown;
}

export interface PropSchema {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  line: number;
  col: number;
}

export interface PropsInfo {
  componentName: string;
  propsTypeName: string;
  props: PropSchema[];
  filePath: string;
  line: number;
  col: number;
}

export interface TransformContext {
  code: string;
  id: string;
  relativePath: string;
  fileName: string;
}

// ============ 插件配置类型 ============

export interface InspectorPluginOptions {
  runtime?: RuntimeConfig;
  transform?: TransformConfig;
}

export type BundlerType = 'vite' | 'turbopack';

export type InspectorOptions =
  | (InspectorPluginOptions & { bundler: 'vite' })
  | (InspectorPluginOptions & { bundler: 'turbopack' });

// ============ 适配器类型 ============

export interface ITransformer {
  transform(code: string, id: string): TransformResult | null;
}

export interface IOverlayManager {
  create(): HTMLElement;
  update(element: Element): void;
  remove(): void;
  getElement(): HTMLElement | null;
}

export interface IMessageBus {
  send<T extends MessageType>(type: T, payload: MessagePayload[T]): void;
  on<T extends MessageType>(type: T, handler: (payload: MessagePayload[T]) => void): void;
  off<T extends MessageType>(type: T, handler: (payload: MessagePayload[T]) => void): void;
  init(): void;
  destroy(): void;
}

export interface IModule {
  name: string;
  init(): void;
  destroy(): void;
}
