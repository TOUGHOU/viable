/**
 * @file conversationHistorySidebar.tsx
 * @description 历史对话列表容器
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand } from './brand';
import { ButtonNewChat } from './buttonNewChat';
import { ConversationHistoryItem } from './conversationHistoryItem';
import { useChatStore } from '@/store/chatStore';
import type { Conversation } from '@/types/chat';
import { getConversations as getConversationsApi } from '@/lib/api/chatApi';
import { createConversation as createConversationApi } from '@/lib/api/chatApi';
import { getMessages as getMessagesApi } from '@/lib/api/chatApi';
import { updateConversation as updateConversationApi } from '@/lib/api/chatApi';
import { deleteConversation as deleteConversationApi } from '@/lib/api/chatApi';

export interface ConversationHistorySidebarProps {
  onNewChat: () => void;
}

export function ConversationHistorySidebar({ onNewChat }: ConversationHistorySidebarProps) {
  const navigate = useNavigate();
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    setConversations,
    setMessages,
    startNewChat,
  } = useChatStore();

  useEffect(() => {
    getConversationsApi({ page: 1, pageSize: 100 })
      .then((res) => setConversations(res.data))
      .catch(() => {});
  }, [setConversations]);

  const handleSelect = async (c: Conversation) => {
    setCurrentConversationId(c.id);
    try {
      const res = await getMessagesApi({
        conversationId: c.id,
        page: 1,
        pageSize: 100,
      });
      setMessages(c.id, res.data);
    } catch {
      setMessages(c.id, []);
    }
    if (c.hasPreview) {
      navigate(`/workspace/${c.id}`);
    }
  };

  const handleOpenPreview = (c: Conversation) => {
    if (!c.hasPreview) return;
    setCurrentConversationId(c.id);
    navigate(`/workspace/${c.id}`);
  };

  const handleNewChatClick = async () => {
    try {
      const conv = await createConversationApi({ title: '新对话', hasPreview: false });
      setConversations([conv, ...conversations.filter((x) => x.id !== conv.id)]);
      setCurrentConversationId(conv.id);
      setMessages(conv.id, []);
      navigate(`/workspace/${conv.id}`);
    } catch {
      onNewChat();
    }
  };

  const handleRename = async (id: string, title: string) => {
    try {
      const updated = await updateConversationApi({ id, title });
      setConversations(
        conversations.map((c) => (c.id === id ? updated : c))
      );
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConversationApi({ id });
      setConversations(conversations.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        startNewChat();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Brand />
      <div className="px-3 pb-2">
        <ButtonNewChat onClick={handleNewChatClick}>新对话</ButtonNewChat>
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
                onRename={(title) => handleRename(c.id, title)}
                onDelete={() => handleDelete(c.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
