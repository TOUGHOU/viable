/**
 * @file: buttonNewChat.tsx
 * @description 新对话按钮
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageCirclePlus } from 'lucide-react';

export interface ButtonNewChatProps {
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function ButtonNewChat({ onClick, className, children }: ButtonNewChatProps) {
  return (
    <Button
      variant="secondary"
      className={cn(
        'w-full justify-start gap-2 rounded-lg border border-border/80 bg-card/50 font-medium backdrop-blur-sm',
        'transition-all duration-200 hover:border-accent/40 hover:bg-accent/10 hover:text-accent',
        className
      )}
      onClick={onClick}
    >
      <span className="text-base" aria-hidden>
        <MessageCirclePlus className="h-4 w-4" />
      </span>
      <span>{children ?? '新对话'}</span>
      <span className="ml-auto text-muted-foreground transition-colors group-hover:text-accent" aria-hidden>
        +
      </span>
    </Button>
  );
}
