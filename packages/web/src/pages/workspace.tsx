/**
 * @file: workspace.tsx
 * @description 页面二：对话 + 预览工作台（一次对话即一个项目）
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { useChatStore } from '@/store/chatStore';
import { WorkspaceLayout } from '@/components/layout/workspaceLayout';
import { ConversationPanel } from '@/components/workspace/conversationPanel';
import { PreviewCodePanel } from '@/components/workspace/previewCodePanel';
import { getProject, getMessages } from '@/lib/api/chatApi';

const POLL_INTERVAL_MS = 2000;

const projectKey = (id: string) => ['workspace-project', id] as const;

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, updateProject, addProject, setMessages } = useChatStore();
  const [hasChecked, setHasChecked] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const project = projectId ? projects.find((p) => p.id === projectId) : null;

  const { data: projectData, error: projectError, isLoading: projectLoading } = useSWR(
    projectId ? projectKey(projectId) : null,
    () => getProject({ id: projectId! }),
    { dedupingInterval: 2000 }
  );

  useEffect(() => {
    if (!projectId || !projectData) return;
    let cancelled = false;
    addProject(projectData);
    getMessages({ projectId, page: 1, pageSize: 100 })
      .then((res) => {
        if (!cancelled) setMessages(projectId, res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
        if (!cancelled) setHasChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, projectData, addProject, setMessages]);

  useEffect(() => {
    if (projectError && projectId) {
      setDetailError(true);
      setHasChecked(true);
    }
  }, [projectError, projectId]);

  useEffect(() => {
    if (projectLoading && !project) {
      setDetailLoading(true);
    }
  }, [projectLoading, project]);

  useEffect(() => {
    if (!projectId) return;
    const inStore = useChatStore.getState().projects.some((p) => p.id === projectId);
    if (inStore) setHasChecked(true);
    const unsub = useChatStore.subscribe(() => {
      const found = useChatStore.getState().projects.some((p) => p.id === projectId);
      if (found) setHasChecked(true);
    });
    const t = setTimeout(() => setHasChecked(true), 150);
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !project || project.previewStatus !== 'pending') {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }
    const tick = async () => {
      try {
        const updated = await getProject({ id: projectId });
        updateProject(projectId, {
          previewPort: updated.previewPort,
          previewUrl: updated.previewUrl,
          previewStatus: updated.previewStatus,
        });
      } catch {
        // ignore
      }
    };
    pollTimerRef.current = setInterval(tick, POLL_INTERVAL_MS);
    tick();
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [projectId, project?.previewStatus, updateProject]);

  useEffect(() => {
    if (!hasChecked) return;
    if (!projectId || detailError || !project) {
      navigate('/chat', { replace: true });
    }
  }, [hasChecked, projectId, project, detailError, navigate]);

  if (!hasChecked || !projectId) {
    return null;
  }

  if (detailLoading && !project) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        加载项目详情…
      </div>
    );
  }

  if (detailError || !project) {
    return null;
  }

  const previewUrl =
    project.previewStatus === 'running' ? (project.previewUrl ?? null) : null;

  return (
    <WorkspaceLayout
      conversationPanel={
        <ConversationPanel projectId={project.id} title={project.name} />
      }
      previewPanel={
        <PreviewCodePanel
          previewUrl={previewUrl}
          previewStatus={project.previewStatus}
          codeFiles={[]}
        />
      }
    />
  );
}
