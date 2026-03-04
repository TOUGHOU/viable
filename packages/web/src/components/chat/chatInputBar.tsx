/**
 * @file chatInputBar.tsx
 * @description 底部输入栏：占位符、@、技能按钮、发送
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SkillButtonGroup } from './skillButtonGroup';
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
  placeholder = "发消息或输入'/'选择技能",
  value,
  onChange,
  onSend,
  selectedSkill,
  onSelectSkill,
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
      className={cn('flex flex-col gap-2 border-t border-border bg-background p-3', className)}
      onSubmit={handleSubmit}
    >
      <div className="flex items-end gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="提及或命令"
        >
          @
        </button>
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
          variant="ghost"
          disabled={!canSend}
          className="shrink-0"
          aria-label="发送"
        >
          <span className="text-muted-foreground">{disabled ? '…' : '✈️'}</span>
        </Button>
      </div>
      <SkillButtonGroup selectedSkill={selectedSkill} onSelectSkill={onSelectSkill} />
    </form>
  );
}
