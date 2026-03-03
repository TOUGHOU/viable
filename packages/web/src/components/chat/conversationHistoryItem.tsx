/**
 * @file conversationHistoryItem.tsx
 * @description 单条历史：图标、标题、角标
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat';

export interface ConversationHistoryItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onSelect: () => void;
  onOpenPreview?: () => void;
  className?: string;
}

export function ConversationHistoryItem({
  conversation,
  isActive,
  onSelect,
  onOpenPreview,
  className,
}: ConversationHistoryItemProps) {
  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
        isActive && 'bg-accent',
        className
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        💬
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">{conversation.title}</span>
      {conversation.unread != null && conversation.unread > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
          {conversation.unread}
        </span>
      )}
      {conversation.hasPreview && onOpenPreview && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPreview();
          }}
        >
          查看预览
        </Button>
      )}
    </div>
  );
}
