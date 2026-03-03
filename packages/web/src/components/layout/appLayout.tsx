/**
 * @file appLayout.tsx
 * @description 整体应用左右分栏布局容器
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div className={cn('flex h-screen w-full flex-col bg-background text-foreground', className)}>
      {children}
    </div>
  );
}
