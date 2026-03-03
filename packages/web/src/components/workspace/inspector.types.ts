/**
 * @file inspector.types.ts
 * @description Inspector 与 iframe 通信相关类型，从 @vibe/utils-inspector/shared 扩展
 */

import type { RefObject } from 'react';
import type { ElementData, ErrorInfo } from '@vibe/utils-inspector/shared';

export type { DropZoneInfo, ElementData, ErrorInfo, IframeInfoItem, ScrollRect } from '@vibe/utils-inspector/shared';

export interface UseMessageHandlerOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onElementSelect?: (elementInfo: ElementData | null) => void;
  inspectorActive?: boolean;
  onErrorDetected?: (errorInfo: ErrorInfo) => void;
  onScrollUpdate?: (
    rect: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null,
  ) => void;
  onDropEnd?: (payload?: unknown) => void;
}

export interface UseIframeManagerOptions {
  src: string | null | undefined;
  inspectorActive?: boolean;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
}
