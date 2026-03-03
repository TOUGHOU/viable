/**
 * @file: previewCodeTabs.tsx
 * @description 预览 / 代码 Tab 切换 + 多版本 UI
 */

import { useState } from 'react';
import { SquareDashedMousePointer } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PreviewCodeTab = 'preview' | 'code';

export interface PreviewCodeTabsProps {
  activeTab: PreviewCodeTab;
  onTabChange: (tab: PreviewCodeTab) => void;
  showVersionSelect?: boolean;
  className?: string;
}

export function PreviewCodeTabs({
  activeTab,
  onTabChange,
  showVersionSelect = true,
  className,
}: PreviewCodeTabsProps) {
  const [isPointerHighlight, setIsPointerHighlight] = useState(false);

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2',
        className
      )}
    >
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onTabChange('preview')}
          className={cn(
            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'preview'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          预览
        </button>
        <button
          type="button"
          onClick={() => onTabChange('code')}
          className={cn(
            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'code'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          代码
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsPointerHighlight((v) => !v)}
          className={cn(
            'rounded p-1.5 transition-colors',
            isPointerHighlight
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
          title={isPointerHighlight ? '取消高亮' : '高亮'}
          aria-pressed={isPointerHighlight}
        >
          <SquareDashedMousePointer className="size-5" aria-hidden />
        </button>
      </div>
      <div className="ml-auto flex items-center gap-1">
        {showVersionSelect && (
          <select
            className="rounded border border-input bg-background px-2 py-1 text-xs"
            aria-label="版本"
          >
            <option>V2</option>
            <option>V1</option>
          </select>
        )}

        <button
          type="button"
          className="rounded border border-input bg-background px-2 py-1 text-xs hover:bg-accent"
          title="下载"
        >
          下载
        </button>
      </div>
    </div>
  );
}
