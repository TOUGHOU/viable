/**
 * @file: chatWelcome.tsx
 * @description 欢迎页：科技感标题、发光输入框
 */

import { useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatWelcomeProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuickQuestion?: (text: string) => void;
  className?: string;
}

export function ChatWelcome({ value, onChange, onSend, className }: ChatWelcomeProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) onSend();
  };

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-y-auto',
        'bg-mystery-translucent grain-overlay',
        className
      )}
    >
      <div className="flex min-h-full shrink-0 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[720px]">
          <div
            className="animate-fade-in-up opacity-0"
            style={{ animationDelay: '0.05s', animationFillMode: 'forwards' }}
          >
            <p className="font-display text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              从灵感到应用
            </p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              输入需求，零门槛生成网站、工具或游戏
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="mt-8 animate-fade-in-up opacity-0"
            style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}
          >
            <div
              className={cn(
                'rounded-xl border border-border/80 bg-card/80 shadow-lg backdrop-blur-sm',
                'transition-all duration-200',
                'focus-within:border-accent/60 focus-within:shadow-glow focus-within:ring-2 focus-within:ring-accent/30 focus-within:ring-offset-2 focus-within:ring-offset-background'
              )}
            >
              <div className="flex flex-col gap-3 p-4">
                <textarea
                  ref={inputRef}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="例如：做一个个人作品集首页，深色科技风..."
                  rows={2}
                  className="min-h-[56px] w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend) onSend();
                    }
                  }}
                />
                <div className="flex items-center justify-end">
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!canSend}
                    className="h-9 w-9 rounded-lg bg-accent text-accent-foreground shadow-glow-sm transition-all hover:bg-accent/90 hover:shadow-glow disabled:opacity-40"
                    aria-label="发送"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
