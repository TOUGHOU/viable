/**
 * @file chatPage.tsx
 * @description 页面一：Chat 首页（左侧历史 + 右侧欢迎/对话 + 输入栏）
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore, createNewConversation, createMessage } from '@/store/chatStore';
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
    setMessages,
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

  const handleQuickQuestion = (text: string) => {
    const conv = createNewConversation(text.slice(0, 30), false);
    addConversation(conv);
    setCurrentConversationId(conv.id);
    setMessages(conv.id, [createMessage('user', text)]);
    setInput('');
    navigate(`/workspace/${conv.id}`);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    let conversationId: string;
    if (!currentConversationId) {
      const conv = createNewConversation(text.slice(0, 30), false);
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
  };

  return (
    <SidebarLayout
      sidebar={<ConversationHistorySidebar onNewChat={handleNewChat} />}
      main={
        <div className="flex h-full flex-col">
          {messages.length === 0 ? (
            <ChatWelcome onQuickQuestion={handleQuickQuestion} />
          ) : (
            <MessageList messages={messages} className="flex-1 overflow-y-auto p-4" />
          )}
          <ChatInputBar
            value={input}
            onChange={setInput}
            onSend={handleSend}
            selectedSkill={selectedSkill}
            onSelectSkill={setSelectedSkill}
          />
        </div>
      }
    />
  );
}
