/**
 * @file: index.ts
 * @description 父页与 iframe 通信协议：供宿主从 vibe-inspector-plugin/shared 引用
 */

export { MESSAGE_TYPES } from './constants';
export type {
  DropZoneInfo,
  ElementData,
  ErrorInfo,
  IframeInfoItem,
  Position,
  Rect,
  ScrollRect,
} from './types';
