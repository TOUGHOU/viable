/**
 * @file sidebarLayout.tsx
 * @description 左侧边栏 + 右侧主区通用布局
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SidebarLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  sidebarClassName?: string;
  mainClassName?: string;
  className?: string;
}

export function SidebarLayout({
  sidebar,
  main,
  sidebarClassName,
  mainClassName,
  className,
}: SidebarLayoutProps) {
  return (
    <div className={cn('flex h-screen w-full overflow-hidden', className)}>
      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-border bg-muted/30',
          sidebarClassName ?? 'w-[280px]'
        )}
      >
        {sidebar}
      </aside>
      <main className={cn('flex min-w-0 flex-1 flex-col overflow-hidden', mainClassName)}>
        {main}
      </main>
    </div>
  );
}
