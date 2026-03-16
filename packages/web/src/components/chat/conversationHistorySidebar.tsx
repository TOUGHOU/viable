/**
 * @file: conversationHistorySidebar.tsx
 * @description 历史项目列表容器（一次对话即一个项目）
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { Brand } from './brand';
import { ButtonNewChat } from './buttonNewChat';
import { ConversationHistoryItem } from './conversationHistoryItem';
import { useChatStore } from '@/store/chatStore';
import type { Project } from '@/types/chat';
import { getProjects as getProjectsApi } from '@/lib/api/chatApi';
import { createProject as createProjectApi } from '@/lib/api/chatApi';
import { getMessages as getMessagesApi } from '@/lib/api/chatApi';
import { updateProject as updateProjectApi } from '@/lib/api/chatApi';
import { deleteProject as deleteProjectApi } from '@/lib/api/chatApi';

const PROJECTS_KEY = 'projects';

export interface ConversationHistorySidebarProps {
  onNewChat: () => void;
}

export function ConversationHistorySidebar({ onNewChat }: ConversationHistorySidebarProps) {
  const navigate = useNavigate();
  const {
    projects,
    currentProjectId,
    setCurrentProjectId,
    setProjects,
    setMessages,
    startNewChat,
  } = useChatStore();

  const { data, mutate } = useSWR(
    PROJECTS_KEY,
    () => getProjectsApi({ page: 1, pageSize: 100 }),
    { dedupingInterval: 2000 }
  );

  useEffect(() => {
    if (data?.data) {
      setProjects(data.data);
    }
  }, [data, setProjects]);

  const handleSelect = async (p: Project) => {
    setCurrentProjectId(p.id);
    try {
      const res = await getMessagesApi({
        projectId: p.id,
        page: 1,
        pageSize: 100,
      });
      setMessages(p.id, res.data);
    } catch {
      setMessages(p.id, []);
    }
    navigate(`/workspace/${p.id}`);
  };

  const handleOpenPreview = (p: Project) => {
    if (!p.hasPreview) return;
    setCurrentProjectId(p.id);
    navigate(`/workspace/${p.id}`);
  };

  const handleNewChatClick = async () => {
    try {
      const project = await createProjectApi({ name: '新项目', hasPreview: false });
      setProjects([project, ...projects.filter((x) => x.id !== project.id)]);
      setCurrentProjectId(project.id);
      setMessages(project.id, []);
      navigate(`/workspace/${project.id}`);
      void mutate();
    } catch {
      onNewChat();
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      const updated = await updateProjectApi({ id, name });
      setProjects(projects.map((p) => (p.id === id ? updated : p)));
      void mutate();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProjectApi({ id });
      setProjects(projects.filter((p) => p.id !== id));
      if (currentProjectId === id) {
        startNewChat();
      }
      void mutate();
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Brand />
      <div className="px-3 pt-2">
        <ButtonNewChat onClick={handleNewChatClick}>新对话</ButtonNewChat>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <h2 className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          历史对话
        </h2>
        <ul className="mt-1 space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <ConversationHistoryItem
                project={p}
                isActive={currentProjectId === p.id}
                onSelect={() => handleSelect(p)}
                onOpenPreview={p.hasPreview ? () => handleOpenPreview(p) : undefined}
                onRename={(name) => handleRename(p.id, name)}
                onDelete={() => handleDelete(p.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
