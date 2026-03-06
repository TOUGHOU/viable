/**
 * @file useIframeManager.ts
 * @description 管理 iframe 与 Inspector 状态同步（TOGGLE_SELECTOR / UPDATE_SELECTED_ELEMENTS）
 */

import { useCallback, useEffect, useState } from 'react';
import { MESSAGE_TYPES } from '@jd/vibe-inspector-plugin/shared';
import type { UseIframeManagerOptions } from './inspector.types';

export function useIframeManager(options: UseIframeManagerOptions) {
  const { src, inspectorActive = true, iframeRef } = options;
  const [isLoading, setIsLoading] = useState(false);

  const sendInspectorStateToIframe = useCallback(
    (isActive: boolean) => {
      if (!iframeRef?.current?.contentWindow) {
        return;
      }

      const message = { type: MESSAGE_TYPES.TOGGLE_SELECTOR, payload: isActive };

      try {
        iframeRef.current.contentWindow.postMessage(message, '*');
        if (!isActive) {
          const clearMessage = {
            type: MESSAGE_TYPES.UPDATE_SELECTED_ELEMENTS,
            payload: [],
          };
          iframeRef.current.contentWindow.postMessage(clearMessage, '*');
        }
      } catch (error) {
        console.error('[PreviewFrame] Cannot communicate with iframe:', error);
      }
    },
    [iframeRef]
  );

  const refreshIframe = useCallback(() => {
    if (src) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [src]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    sendInspectorStateToIframe(inspectorActive);
  }, [inspectorActive, sendInspectorStateToIframe]);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
    }
  }, [src]);

  useEffect(() => {
    const iframe = iframeRef?.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      return () => iframe.removeEventListener('load', handleIframeLoad);
    }
  }, [handleIframeLoad, iframeRef]);

  return {
    isLoading,
    refreshIframe,
    sendInspectorStateToIframe,
    handleIframeLoad,
  };
}
