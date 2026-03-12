/**
 * @file: chatInputBar.tsx
 * @description 底部输入栏：玻璃质感 + 青色发光
 */

import { useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SkillId } from '@/types/chat';

export interface ChatInputBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  selectedSkill: SkillId | null;
  onSelectSkill: (skill: SkillId | null) => void;
  className?: string;
  disabled?: boolean;
}

export function ChatInputBar({
  placeholder = '输入你的需求',
  value,
  onChange,
  onSend,
  className,
  disabled = false,
}: ChatInputBarProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) onSend();
  };

  return (
    <form
      className={cn(
        'flex flex-col gap-2 border-t border-border/80 bg-background/80 px-4 py-3 backdrop-blur-md',
        className
      )}
      onSubmit={handleSubmit}
    >
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border border-border/80 bg-card/60 px-3 py-2.5 backdrop-blur-sm',
          'transition-all duration-200',
          'focus-within:border-accent/50 focus-within:shadow-glow-sm focus-within:ring-2 focus-within:ring-accent/25 focus-within:ring-offset-2 focus-within:ring-offset-background'
        )}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="min-h-[24px] max-h-[200px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          className="h-9 w-9 shrink-0 rounded-lg bg-accent text-accent-foreground shadow-glow-sm transition-all hover:bg-accent/90 hover:shadow-glow disabled:opacity-40"
          aria-label="发送"
        >
          {disabled ? (
            <span className="text-accent-foreground/70">…</span>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
