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
    <div className={cn('flex items-center gap-2 px-4 py-3', className)}>
      <span className="text-lg font-semibold text-foreground">{name}</span>
    </div>
  );
}
