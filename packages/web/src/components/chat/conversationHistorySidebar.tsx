/**
 * @file conversationHistorySidebar.tsx
 * @description 历史对话列表容器
 */

import { useNavigate } from 'react-router-dom';
import { Brand } from './brand';
import { ButtonNewChat } from './buttonNewChat';
import { ConversationHistoryItem } from './conversationHistoryItem';
import { useChatStore } from '@/store/chatStore';
import type { Conversation } from '@/types/chat';

export interface ConversationHistorySidebarProps {
  onNewChat: () => void;
}

export function ConversationHistorySidebar({ onNewChat }: ConversationHistorySidebarProps) {
  const navigate = useNavigate();
  const { conversations, currentConversationId, setCurrentConversationId } = useChatStore();

  const handleSelect = (c: Conversation) => {
    setCurrentConversationId(c.id);
    if (c.hasPreview) {
      navigate(`/workspace/${c.id}`);
    }
  };

  const handleOpenPreview = (c: Conversation) => {
    if (!c.hasPreview) return;
    setCurrentConversationId(c.id);
    navigate(`/workspace/${c.id}`);
  };

  return (
    <div className="flex h-full flex-col">
      <Brand />
      <div className="px-3 pb-2">
        <ButtonNewChat onClick={onNewChat}>新对话</ButtonNewChat>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        <h2 className="px-2 py-2 text-xs font-medium text-muted-foreground">历史对话</h2>
        <ul className="space-y-0.5">
          {conversations.map((c) => (
            <li key={c.id}>
              <ConversationHistoryItem
                conversation={c}
                isActive={currentConversationId === c.id}
                onSelect={() => handleSelect(c)}
                onOpenPreview={c.hasPreview ? () => handleOpenPreview(c) : undefined}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
