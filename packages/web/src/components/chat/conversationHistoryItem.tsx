/**
 * @file: conversationHistoryItem.tsx
 * @description 单条历史：图标、标题、角标、重命名、删除
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat';
import { MessageCircleCode, Trash } from 'lucide-react';

export interface ConversationHistoryItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onSelect: () => void;
  onOpenPreview?: () => void;
  onRename?: (title: string) => void;
  onDelete?: () => void;
  className?: string;
}

export function ConversationHistoryItem({
  conversation,
  isActive,
  onSelect,
  onOpenPreview,
  onRename,
  onDelete,
  className,
}: ConversationHistoryItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const submitRename = () => {
    const t = editTitle.trim();
    if (t && t !== conversation.title && onRename) {
      onRename(t);
    } else {
      setEditTitle(conversation.title);
    }
    setEditing(false);
  };

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 hover:bg-accent/10 border border-transparent hover:border-accent/10',
        isActive && 'bg-accent/10 text-foreground border-accent/40 ',
        className
      )}
      onClick={() => !editing && onSelect()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (editing) {
          if (e.key === 'Enter') submitRename();
          if (e.key === 'Escape') {
            setEditTitle(conversation.title);
            setEditing(false);
          }
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span
        className="shrink-0 text-muted-foreground transition-colors group-hover:text-accent/90"
        aria-hidden
      >
        <MessageCircleCode className="h-[14px] w-[14px]" />
      </span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={submitRename}
          className="min-w-0 flex-1 rounded border border-input bg-card/80 px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/40"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="min-w-0 flex-1 truncate text-foreground"
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (onRename) {
              setEditTitle(conversation.title);
              setEditing(true);
            }
          }}
        >
          {conversation.title}
        </span>
      )}
      {conversation.unread != null && conversation.unread > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
          {conversation.unread}
        </span>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          aria-label="删除"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash className="h-[14px] w-[14px]" />
        </Button>
      )}
    </div>
  );
}
