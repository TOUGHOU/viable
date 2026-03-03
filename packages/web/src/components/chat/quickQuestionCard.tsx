/**
 * @file quickQuestionCard.tsx
 * @description 单条快捷问题卡片
 */

import { cn } from '@/lib/utils';

export interface QuickQuestionCardProps {
  text: string;
  onClick: () => void;
  className?: string;
}

export function QuickQuestionCard({ text, onClick, className }: QuickQuestionCardProps) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
        className
      )}
      onClick={onClick}
    >
      {text}
    </button>
  );
}
