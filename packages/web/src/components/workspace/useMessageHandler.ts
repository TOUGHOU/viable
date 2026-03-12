/**
 * @file: useMessageHandler.ts
 * @description 监听 iframe postMessage：元素选中、滚动、拖放结束、错误等
 */

import { useEffect, useState } from 'react';
import { MESSAGE_TYPES } from 'vibe-inspector-plugin/shared';
import type { ElementData, ErrorInfo } from 'vibe-inspector-plugin/shared';
import type { UseMessageHandlerOptions } from './types';

export function useMessageHandler(options: UseMessageHandlerOptions) {
  const {
    iframeRef,
    onElementSelect,
    inspectorActive,
    onErrorDetected,
    onScrollUpdate,
    onDropEnd,
  } = options;

  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);
  const [detectedErrors, setDetectedErrors] = useState<ErrorInfo[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const { type, payload } = event.data ?? {};

      if (type === MESSAGE_TYPES.ELEMENT_CLICKED) {
        setSelectedElement(payload ?? null);

        if (iframeRef.current?.contentWindow) {
          const updateMessage = {
            type: MESSAGE_TYPES.UPDATE_SELECTED_ELEMENTS,
            payload: payload ? [payload] : [],
          };
          iframeRef.current.contentWindow.postMessage(updateMessage, '*');
        }

        onElementSelect?.(payload);
      } else if (type === MESSAGE_TYPES.SELECTOR_SCRIPT_LOADED) {
        if (inspectorActive && iframeRef.current?.contentWindow) {
          const syncMessage = { type: MESSAGE_TYPES.TOGGLE_SELECTOR, payload: true };
          iframeRef.current.contentWindow.postMessage(syncMessage, '*');
        }
      } else if (type === MESSAGE_TYPES.RUNTIME_ERROR) {
        const errorInfo = (event.data.error ?? payload) as ErrorInfo;

        if (
          errorInfo?.message === 'Script error.' &&
          errorInfo?.filename === '' &&
          errorInfo?.lineno === 0 &&
          errorInfo?.colno === 0
        ) {
          if (errorInfo?.blankScreen) {
            const crossOriginError: ErrorInfo = {
              ...errorInfo,
              message: 'Cross-origin error detected - page may not be loading properly',
            };
            setDetectedErrors((prev) => [crossOriginError, ...prev.slice(0, 9)]);
            onErrorDetected?.(crossOriginError);
          }
          return;
        }

        setDetectedErrors((prev) => [errorInfo, ...prev.slice(0, 9)]);
        onErrorDetected?.(errorInfo);
      } else if (type === MESSAGE_TYPES.UNHANDLED_PROMISE_REJECTION) {
        const errorInfo = (event.data.error ?? payload) as ErrorInfo;
        setDetectedErrors((prev) => [errorInfo, ...prev.slice(0, 9)]);
        onErrorDetected?.(errorInfo);
      } else if (type === MESSAGE_TYPES.SCROLL_UPDATE) {
        const rect = payload?.rect ?? null;
        onScrollUpdate?.(rect ?? null);
      } else if (type === MESSAGE_TYPES.DROP_END) {
        onDropEnd?.(payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef, onElementSelect, inspectorActive, onErrorDetected, onScrollUpdate, onDropEnd]);

  return {
    selectedElement,
    detectedErrors,
  };
}
