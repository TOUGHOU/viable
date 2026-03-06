/**
 * @file sideBarOverlay.tsx
 * @description 选中元素时在 iframe 两侧展示的侧栏浮层，位置随 scrollRect 与容器计算
 */

import { useEffect, useState } from 'react';
import type { ElementData } from '@jd/vibe-inspector-plugin/shared';

export interface SideBarOverlayProps {
  selectedElement: ElementData | null;
  sideBarRender: (selectedNode: ElementData) => [React.ReactNode, React.ReactNode];
  scrollRect: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null;
  frameViewerId?: string;
}

export function SideBarOverlay({
  selectedElement,
  sideBarRender,
  scrollRect,
  frameViewerId = 'frame-viewer',
}: SideBarOverlayProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    right: number;
    bottom?: number;
  } | null>(null);
  const [sideBars, setSideBars] = useState<[React.ReactNode, React.ReactNode] | null>(null);
  const [leftBarRef, setLeftBarRef] = useState<HTMLDivElement | null>(null);
  const [rightBarRef, setRightBarRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedElement || !scrollRect) {
      setPosition(null);
      setSideBars(null);
      return;
    }

    const bars = sideBarRender(selectedElement);
    setSideBars(bars);

    const frameViewerContainer = document.getElementById(frameViewerId);
    if (!frameViewerContainer) {
      return;
    }

    const iframe = frameViewerContainer.querySelector('iframe');
    if (!iframe) {
      return;
    }

    const containerRect = frameViewerContainer.getBoundingClientRect();
    const iframeRect = iframe.getBoundingClientRect();

    const iframeOffsetLeft = iframeRect.left - containerRect.left;
    const iframeOffsetTop = iframeRect.top - containerRect.top;

    const elementTop = iframeOffsetTop + scrollRect.top;
    const elementBottom = iframeOffsetTop + scrollRect.bottom;
    const elementLeft = iframeOffsetLeft + scrollRect.left;
    const elementRight = iframeOffsetLeft + scrollRect.right;

    const containerHeight = containerRect.height;
    const leftBarHeight = leftBarRef?.offsetHeight ?? 0;
    const rightBarHeight = rightBarRef?.offsetHeight ?? 0;

    const useBottomAlign =
      (leftBarHeight > 0 && elementTop + leftBarHeight > containerHeight) ||
      (rightBarHeight > 0 && elementTop + rightBarHeight > containerHeight);

    if (useBottomAlign) {
      setPosition({
        top: elementTop,
        left: elementLeft,
        right: elementRight,
        bottom: containerHeight - elementBottom,
      });
    } else {
      setPosition({
        top: elementTop,
        left: elementLeft,
        right: elementRight,
      });
    }
  }, [selectedElement, sideBarRender, scrollRect, leftBarRef, rightBarRef, frameViewerId]);

  if (!position || !sideBars) {
    return null;
  }

  const [leftBar, rightBar] = sideBars;

  return (
    <>
      {leftBar && (
        <div
          ref={setLeftBarRef}
          data-side-bar="left"
          className="absolute left-0 z-[9999] pointer-events-auto"
          style={{
            ...(position.bottom !== undefined
              ? { bottom: position.bottom }
              : { top: position.top }),
          }}
        >
          {leftBar}
        </div>
      )}
      {rightBar && (
        <div
          ref={setRightBarRef}
          data-side-bar="right"
          className="absolute right-0 z-[9999] pointer-events-auto"
          style={{
            ...(position.bottom !== undefined
              ? { bottom: position.bottom }
              : { top: position.top }),
          }}
        >
          {rightBar}
        </div>
      )}
    </>
  );
}
