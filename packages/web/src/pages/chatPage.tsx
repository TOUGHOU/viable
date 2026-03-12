/**
 * @file: chatPage.tsx
 * @description 页面一：Chat 首页（左侧历史 + 右侧欢迎/对话 + 输入栏）
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore, createMessage } from '@/store/chatStore';
import { createConversation as createConversationApi } from '@/lib/api/chatApi';
import { SidebarLayout } from '@/components/layout/sidebarLayout';
import { ConversationHistorySidebar } from '@/components/chat/conversationHistorySidebar';
import { ChatWelcome } from '@/components/chat/chatWelcome';
import { ChatInputBar } from '@/components/chat/chatInputBar';
import { MessageList } from '@/components/chat/messageList';

export function ChatPage() {
  const navigate = useNavigate();
  const {
    currentConversationId,
    setCurrentConversationId,
    addConversation,
    addMessage,
    getMessages,
    selectedSkill,
    setSelectedSkill,
    startNewChat,
  } = useChatStore();

  const [input, setInput] = useState('');
  const messages = currentConversationId ? getMessages(currentConversationId) : [];

  const handleNewChat = () => {
    startNewChat();
    setInput('');
  };

  const handleQuickQuestion = async (text: string) => {
    try {
      const conv = await createConversationApi({
        title: text.slice(0, 30) || '新对话',
        hasPreview: false,
      });
      addConversation(conv);
      setCurrentConversationId(conv.id);
      addMessage(conv.id, createMessage('user', text));
      setInput('');
      navigate(`/workspace/${conv.id}`);
    } catch {
      setInput('');
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    let conversationId: string;
    try {
      if (!currentConversationId) {
        const conv = await createConversationApi({
          title: text.slice(0, 30) || '新对话',
          hasPreview: false,
        });
        addConversation(conv);
        setCurrentConversationId(conv.id);
        addMessage(conv.id, createMessage('user', text));
        conversationId = conv.id;
      } else {
        addMessage(currentConversationId, createMessage('user', text));
        conversationId = currentConversationId;
      }
      setInput('');
      navigate(`/workspace/${conversationId}`);
    } catch {
      setInput('');
    }
  };

  return (
    <SidebarLayout
      sidebar={<ConversationHistorySidebar onNewChat={handleNewChat} />}
      main={
        <div className="flex h-full flex-col">
          <ChatWelcome
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onQuickQuestion={handleQuickQuestion}
          />
        </div>
      }
    />
  );
}
