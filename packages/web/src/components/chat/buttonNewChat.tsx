/**
 * @file buttonNewChat.tsx
 * @description 新对话按钮
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ButtonNewChatProps {
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function ButtonNewChat({ onClick, className, children }: ButtonNewChatProps) {
  return (
    <Button
      variant="secondary"
      className={cn('w-full justify-start gap-2', className)}
      onClick={onClick}
    >
      <span className="text-base" aria-hidden>
        ✏️
      </span>
      <span>{children ?? '新对话'}</span>
      <span className="ml-auto text-muted-foreground" aria-hidden>
        +
      </span>
    </Button>
  );
}
