/**
 * @file workspaceLayout.tsx
 * @description 页面二专用：左侧对话 + 右侧预览/代码区
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface WorkspaceLayoutProps {
  conversationPanel: ReactNode;
  previewPanel: ReactNode;
  conversationPanelClassName?: string;
  previewPanelClassName?: string;
  className?: string;
}

export function WorkspaceLayout({
  conversationPanel,
  previewPanel,
  conversationPanelClassName,
  previewPanelClassName,
  className,
}: WorkspaceLayoutProps) {
  return (
    <div className={cn('flex h-screen w-full overflow-hidden', className)}>
      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-border/80 bg-surface/95 backdrop-blur-sm',
          conversationPanelClassName ?? 'w-[400px]'
        )}
      >
        {conversationPanel}
      </aside>
      <section
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden bg-background',
          previewPanelClassName
        )}
      >
        {previewPanel}
      </section>
    </div>
  );
}
