/**
 * @file: previewFrame.tsx
 * @description 预览 iframe：加载/错误/重试、Inspector 状态同步、选中元素与侧栏浮层
 */

'use client';

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ElementData } from '@vibe/utils-inspector/shared';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useIframeManager } from './useIframeManager';
import { useMessageHandler } from './useMessageHandler';

const MAX_RETRIES = 3;
const LOAD_TIMEOUT = 15000;
const RETRY_DELAY = 2000;

export interface PreviewFrameProps {
  src?: string | null;
  isLoading?: boolean;
  onLoad?: () => void;
  onDrop?: (payload?: unknown) => void;
  onElementSelect?: (elementInfo: ElementData | null) => void;
  className?: string;
  /** 拖拽时是否覆盖 iframe 以在父页接收 dragover（需与外部 isDragging 状态联动） */
  isDragging?: boolean;
}

export const PreviewFrame = forwardRef<HTMLIFrameElement, PreviewFrameProps>(
  (
    {
      src,
      isLoading: externalLoading = false,
      onLoad,
      onDrop,
      onElementSelect,
      className,
    },
    ref
  ) => {
    const inspectorActive = useWorkspaceStore((s) => s.inspectorActive);
    const [isContentLoaded, setIsContentLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [scrollRect, setScrollRect] = useState<{
      top: number;
      left: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    } | null>(null);

    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const internalIframeRef = useRef<HTMLIFrameElement>(null);

    const iframeRef = (ref as React.RefObject<HTMLIFrameElement>) ?? internalIframeRef;
    const shouldShowLoading = !isContentLoaded || externalLoading;

    const { sendInspectorStateToIframe } = useIframeManager({
      src: src ?? null,
      iframeRef,
      inspectorActive,
    });

    const onDropEnd = useCallback(
      (payload?: unknown) => {
        onDrop?.(payload);
      },
      [onDrop]
    );

    const { selectedElement } = useMessageHandler({
      iframeRef,
      onElementSelect,
      inspectorActive,
      onScrollUpdate: setScrollRect,
      onDropEnd,
    });

    const handleRetry = useCallback(() => {
      if (retryCount >= MAX_RETRIES) {
        setHasError(true);
        setErrorMessage(`加载失败: ${src ?? ''}`);
        setIsContentLoaded(true);
        return;
      }
      setRetryCount((prev) => prev + 1);
      setHasError(false);
      setErrorMessage('');
      setIsContentLoaded(false);
    }, [retryCount, src]);

    const handleIframeLoad = useCallback(() => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      onLoad?.();
      setHasError(false);
      setErrorMessage('');
      setIsContentLoaded(true);
      setRetryCount(0);
      setTimeout(() => {
        sendInspectorStateToIframe(inspectorActive);
      }, 500);
    }, [onLoad, sendInspectorStateToIframe, inspectorActive]);

    const handleIframeError = useCallback(() => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (retryCount < MAX_RETRIES) {
        retryTimeoutRef.current = setTimeout(handleRetry, RETRY_DELAY);
      } else {
        setHasError(true);
        setIsContentLoaded(true);
        setErrorMessage(`加载失败: ${src ?? ''}`);
      }
    }, [src, retryCount, handleRetry]);

    useEffect(() => {
      setHasError(false);
      setErrorMessage('');
      setIsContentLoaded(false);
      setRetryCount(0);
    }, [src]);

    useEffect(() => {
      if (src && !isContentLoaded && !hasError) {
        loadTimeoutRef.current = setTimeout(handleIframeError, LOAD_TIMEOUT);
        return () => {
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
        };
      }
    }, [src, isContentLoaded, hasError, handleIframeError]);

    useEffect(() => {
      return () => {
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      };
    }, []);

    if (!src) {
      return (
        <div
          className={cn(
            'flex flex-1 items-center justify-center bg-muted/20 text-muted-foreground',
            className
          )}
        >
          暂无预览
        </div>
      );
    }

    if (hasError) {
      return (
        <div
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-3 bg-muted/20 p-4 text-muted-foreground',
            className
          )}
        >
          <p className="text-sm">{errorMessage}</p>
          {retryCount < MAX_RETRIES && (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
            >
              重试
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="relative flex flex-1 h-full w-full">
        <iframe
          ref={iframeRef}
          src={src}
          title="预览"
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          className={cn(
            'h-full w-full border-0 bg-white transition-opacity duration-300 dark:bg-gray-900',
            isContentLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
        />

        {shouldShowLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    );
  }
);

PreviewFrame.displayName = 'PreviewFrame';
