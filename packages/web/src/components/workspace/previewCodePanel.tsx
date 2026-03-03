/**
 * @file: previewCodePanel.tsx
 * @description 右侧预览/代码容器：Tab + 工具栏 + 主内容（Tab/Inspector/设备类型 来自 workspaceStore）
 */

import { useEffect } from 'react';
import { PreviewCodeTabs } from './previewCodeTabs';
import { PreviewFrame } from './previewFrame';
import { CodeView } from './codeView';
import { useWorkspaceStore, type DeviceType } from '@/store/workspaceStore';
import { cn } from '@/lib/utils';

/** 各设备预览区域最大宽度（px），desktop 不限制 */
const DEVICE_MAX_WIDTH: Record<DeviceType, string | undefined> = {
  phone: '375px',
  tablet: '768px',
  desktop: undefined,
};

/** 仅手机有高度限制（px），模拟竖屏视口 */
const DEVICE_MAX_HEIGHT: Record<DeviceType, string | undefined> = {
  phone: '812px',
  tablet: undefined,
  desktop: undefined,
};

export interface PreviewCodePanelProps {
  previewUrl?: string | null;
  codeFiles?: { path: string; content?: string }[];
  className?: string;
}

export function PreviewCodePanel({ previewUrl, codeFiles = [], className }: PreviewCodePanelProps) {
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const deviceType = useWorkspaceStore((s) => s.deviceType);
  const setPreviewUrl = useWorkspaceStore((s) => s.setPreviewUrl);

  useEffect(() => {
    setPreviewUrl(previewUrl ?? null);
    return () => setPreviewUrl(null);
  }, [previewUrl, setPreviewUrl]);

  const previewMaxWidth = DEVICE_MAX_WIDTH[deviceType];
  const previewMaxHeight = DEVICE_MAX_HEIGHT[deviceType];

  return (
    <div className={cn('flex h-full flex-col rounded-md', className)}>
      <PreviewCodeTabs showVersionSelect />
      <div className="min-h-0 flex-1 bg-gray-50">
        {activeTab === 'preview' ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-muted/20">
            <div
              className="h-full w-full transition-[max-width,max-height] duration-200 ease-out"
              style={
                previewMaxWidth || previewMaxHeight
                  ? {
                      ...(previewMaxWidth && { maxWidth: previewMaxWidth }),
                      ...(previewMaxHeight && { maxHeight: previewMaxHeight }),
                    }
                  : undefined
              }
            >
              <PreviewFrame src="http://localhost:9876/" className="h-full w-full" />
            </div>
          </div>
        ) : (
          <CodeView files={codeFiles} className="h-full" />
        )}
      </div>
    </div>
  );
}
