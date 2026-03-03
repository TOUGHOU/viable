/**
 * @file conversationPanel.tsx
 * @description 页面二左侧对话面板：消息列表 + 输入栏
 */

import { MessageList } from '@/components/chat/messageList';
import { ChatInputBar } from '@/components/chat/chatInputBar';
import { useChatStore, createMessage } from '@/store/chatStore';
import type { SkillId } from '@/types/chat';
import { useState } from 'react';

export interface ConversationPanelProps {
  conversationId: string;
  title?: string;
  showVersionSelect?: boolean;
}

export function ConversationPanel({
  conversationId,
  title,
  showVersionSelect = true,
}: ConversationPanelProps) {
  const { getMessages, addMessage, selectedSkill, setSelectedSkill } = useChatStore();
  const [input, setInput] = useState('');
  const messages = getMessages(conversationId);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    addMessage(conversationId, createMessage('user', text));
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      {(title || showVersionSelect) && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          {title && <span className="text-sm font-medium truncate">{title}</span>}
          {showVersionSelect && (
            <select
              className="rounded border border-input bg-background px-2 py-1 text-xs"
              aria-label="版本"
            >
              <option>V2</option>
              <option>V1</option>
            </select>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} className="p-4" />
      </div>
      <ChatInputBar
        value={input}
        onChange={setInput}
        onSend={handleSend}
        selectedSkill={selectedSkill}
        onSelectSkill={setSelectedSkill as (s: SkillId | null) => void}
      />
    </div>
  );
}
