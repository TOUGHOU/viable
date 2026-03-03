/**
 * @file: workspaceStore.ts
 * @description Workspace 全局状态：预览/代码 Tab、Inspector 高亮、设备类型、预览 URL 等，供 Tabs / Frame 等直接消费，避免透传
 */

import { create } from 'zustand';

export type PreviewCodeTab = 'preview' | 'code';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

interface WorkspaceState {
  /** 当前 Tab：预览 | 代码 */
  activeTab: PreviewCodeTab;
  /** 是否开启 Inspector 指针高亮（选元素），会同步到 iframe */
  inspectorActive: boolean;
  /** 预览设备类型：手机 / 平板 / PC，用于 iframe 视口或样式 */
  deviceType: DeviceType;
  /** 预览 iframe 的 URL，可选，由外部设置 */
  previewUrl: string | null;
  setActiveTab: (tab: PreviewCodeTab) => void;
  setInspectorActive: (value: boolean) => void;
  toggleInspectorActive: () => void;
  setDeviceType: (device: DeviceType) => void;
  setPreviewUrl: (url: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeTab: 'preview',
  inspectorActive: true,
  deviceType: 'desktop',
  previewUrl: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setInspectorActive: (value) => set({ inspectorActive: value }),
  toggleInspectorActive: () => set((state) => ({ inspectorActive: !state.inspectorActive })),
  setDeviceType: (device) => set({ deviceType: device }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
}));
