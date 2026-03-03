/**
 * @file previewCodePanel.tsx
 * @description 右侧预览/代码容器：Tab + 工具栏 + 主内容
 */

import { useState } from 'react';
import { PreviewCodeTabs, type PreviewCodeTab } from './previewCodeTabs';
import { PreviewFrame } from './previewFrame';
import { CodeView } from './codeView';
import { cn } from '@/lib/utils';

export interface PreviewCodePanelProps {
  previewUrl?: string | null;
  codeFiles?: { path: string; content?: string }[];
  className?: string;
}

export function PreviewCodePanel({
  previewUrl,
  codeFiles = [],
  className,
}: PreviewCodePanelProps) {
  const [activeTab, setActiveTab] = useState<PreviewCodeTab>('preview');

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <PreviewCodeTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showVersionSelect
      />
      <div className="min-h-0 flex-1">
        {activeTab === 'preview' ? (
          <PreviewFrame src={previewUrl} className="h-full w-full" />
        ) : (
          <CodeView files={codeFiles} className="h-full" />
        )}
      </div>
    </div>
  );
}
