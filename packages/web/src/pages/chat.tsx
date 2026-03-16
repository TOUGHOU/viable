/**
 * @file: chat.tsx
 * @description 页面一：Chat 首页（左侧历史 + 右侧欢迎/对话 + 输入栏）
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore, createMessage } from '@/store/chatStore';
import { createProject as createProjectApi } from '@/lib/api/chatApi';
import { SidebarLayout } from '@/components/layout/sidebarLayout';
import { ConversationHistorySidebar } from '@/components/chat/conversationHistorySidebar';
import { ChatWelcome } from '@/components/chat/chatWelcome';
import { ThemeToggle } from '@/components/themeToggle';

export function ChatPage() {
  const navigate = useNavigate();
  const {
    currentProjectId,
    setCurrentProjectId,
    addProject,
    addMessage,
    startNewChat,
  } = useChatStore();

  const [input, setInput] = useState('');

  const handleNewChat = () => {
    startNewChat();
    setInput('');
  };

  const handleQuickQuestion = async (text: string) => {
    try {
      const project = await createProjectApi({
        name: text.slice(0, 30) || '新项目',
        hasPreview: false,
      });
      addProject(project);
      setCurrentProjectId(project.id);
      addMessage(project.id, createMessage('user', text));
      setInput('');
      navigate(`/workspace/${project.id}`);
    } catch {
      setInput('');
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    let projectId: string;
    try {
      if (!currentProjectId) {
        const project = await createProjectApi({
          name: text.slice(0, 30) || '新项目',
          hasPreview: false,
        });
        addProject(project);
        setCurrentProjectId(project.id);
        addMessage(project.id, createMessage('user', text));
        projectId = project.id;
      } else {
        addMessage(currentProjectId, createMessage('user', text));
        projectId = currentProjectId;
      }
      setInput('');
      navigate(`/workspace/${projectId}`);
    } catch {
      setInput('');
    }
  };

  const sidebar = useMemo(() => {
    return <ConversationHistorySidebar onNewChat={handleNewChat} />;
  }, []);

  return (
    <SidebarLayout
      sidebar={sidebar}
      main={
        <div className="flex h-full flex-col relative">
          <ChatWelcome
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onQuickQuestion={handleQuickQuestion}
          />

          <div className="absolute top-3 right-3 z-50">
            <ThemeToggle />
          </div>
        </div>
      }
    />
  );
}
