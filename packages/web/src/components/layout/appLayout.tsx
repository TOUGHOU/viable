/**
 * @file: appLayout.tsx
 * @description 整体应用左右分栏布局容器
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
// import LightRays from '@/components/LightRays';

export interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div
      className={cn(
        'relative flex h-screen w-full flex-col bg-background text-foreground',
        'bg-mystery',
        className
      )}
    >
      {/* <div className="pointer-events-none absolute inset-0 z-[1] h-full w-full">
        <LightRays
          alwaysVisible
          raysOrigin="top-center"
          raysColor="#f5f7fa"
          raysSpeed={0.6}
          lightSpread={1.2}
          rayLength={1.8}
          pulsating={false}
          followMouse={true}
          mouseInfluence={0.08}
          className="h-full w-full"
        />
      </div> */}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
