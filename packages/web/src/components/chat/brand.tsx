/**
 * @file brand.tsx
 * @description 顶部品牌 / Logo
 */

import { cn } from '@/lib/utils';

export interface BrandProps {
  name?: string;
  className?: string;
}

export function Brand({ name = 'Vibe Coding', className }: BrandProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3.5',
        className
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent)_/0.5)]"
        aria-hidden
      />
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">
        {name}
      </span>
    </div>
  );
}
