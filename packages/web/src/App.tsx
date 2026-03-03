/**
 * @file App.tsx
 * @author houfujian (houfujian@jd.com)
 * @description 应用根组件，配置路由
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/appLayout';
import { ChatPage } from '@/pages/chatPage';
import { WorkspacePage } from '@/pages/workspacePage';

function App() {
  return (
    <AppLayout>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/workspace/:conversationId" element={<WorkspacePage />} />
        </Routes>
      </BrowserRouter>
    </AppLayout>
  );
}

export default App;
