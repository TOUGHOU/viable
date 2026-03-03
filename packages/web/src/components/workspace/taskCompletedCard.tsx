/**
 * @file taskCompletedCard.tsx
 * @description 任务完成等状态卡片
 */

import { cn } from '@/lib/utils';

export interface TaskCompletedCardProps {
  title: string;
  createdAt?: string;
  className?: string;
}

export function TaskCompletedCard({ title, createdAt, className }: TaskCompletedCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm',
        className
      )}
    >
      <p className="font-medium text-foreground">任务已完成</p>
      <p className="text-muted-foreground">{title}</p>
      {createdAt && (
        <p className="mt-1 text-xs text-muted-foreground">{createdAt}</p>
      )}
    </div>
  );
}
