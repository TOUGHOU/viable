/**
 * @file: previewCodeTabs.tsx
 * @description 预览 / 代码 Tab 切换 + 多版本 UI（状态来自 workspaceStore）
 * 遵循 Vercel React 实践：子组件按需订阅 store 减少重渲染、过渡动效、视觉分组
 */

import { memo } from 'react';
import { Monitor, Smartphone, SquareDashedMousePointer, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, type PreviewCodeTab, type DeviceType } from '@/store/workspaceStore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type { PreviewCodeTab };

const DEVICE_CYCLE: Record<DeviceType, DeviceType> = {
  phone: 'tablet',
  tablet: 'desktop',
  desktop: 'phone',
};

const DEVICE_META: Record<DeviceType, { label: string; Icon: typeof Smartphone }> = {
  phone: { label: '手机', Icon: Smartphone },
  tablet: { label: '平板', Icon: Tablet },
  desktop: { label: 'PC', Icon: Monitor },
};

const TAB_TRIGGER_CLASS =
  'rounded-[5px] px-3 py-1.5 text-sm transition-colors duration-200 data-[state=active]:shadow-sm';
const ICON_BUTTON_CLASS =
  'rounded p-1.5 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** 仅订阅 activeTab / setActiveTab，避免设备/高亮变化时重渲染 */
const PreviewCodeTabsSegment = memo(function PreviewCodeTabsSegment({
  activeTab,
  setActiveTab,
}: {
  activeTab: PreviewCodeTab;
  setActiveTab: (tab: PreviewCodeTab) => void;
}) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PreviewCodeTab)}>
      <TabsList className="h-8 rounded-md border border-input bg-muted/60 px-0.5 py-0.5 shadow-sm">
        <TabsTrigger value="preview">预览</TabsTrigger>
        <TabsTrigger value="code">代码</TabsTrigger>
      </TabsList>
    </Tabs>
  );
});

/** 仅订阅 deviceType / inspectorActive，避免 tab 或右侧变化时重渲染 */
const CenterToolbarActions = memo(function CenterToolbarActions() {
  const deviceType = useWorkspaceStore((s) => s.deviceType);
  const setDeviceType = useWorkspaceStore((s) => s.setDeviceType);
  const inspectorActive = useWorkspaceStore((s) => s.inspectorActive);
  const toggleInspectorActive = useWorkspaceStore((s) => s.toggleInspectorActive);
  const DeviceIcon = DEVICE_META[deviceType].Icon;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setDeviceType(DEVICE_CYCLE[deviceType])}
        className={cn(
          ICON_BUTTON_CLASS,
          'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 hover:opacity-90'
        )}
        title={`${DEVICE_META[deviceType].label}（点击切换）`}
        aria-label={`设备：${DEVICE_META[deviceType].label}，点击切换`}
      >
        <DeviceIcon className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={toggleInspectorActive}
        className={cn(
          ICON_BUTTON_CLASS,
          inspectorActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        title={inspectorActive ? '取消高亮' : '高亮'}
        aria-pressed={inspectorActive}
      >
        <SquareDashedMousePointer className="size-5" aria-hidden />
      </button>
    </div>
  );
});

/** 右侧版本/下载：纯展示与回调，无 store 订阅时可由父组件控制是否渲染 */
const RightToolbarActions = memo(function RightToolbarActions({
  showVersionSelect,
}: {
  showVersionSelect: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {showVersionSelect ? (
        <select
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="版本"
        >
          <option>V2</option>
          <option>V1</option>
        </select>
      ) : null}
      <button
        type="button"
        className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        title="下载"
      >
        下载
      </button>
    </div>
  );
});

export interface PreviewCodeTabsProps {
  /** 可选：受控时由外部传入，不传则用 store */
  activeTab?: PreviewCodeTab;
  onTabChange?: (tab: PreviewCodeTab) => void;
  showVersionSelect?: boolean;
  className?: string;
}

export function PreviewCodeTabs({
  activeTab: activeTabProp,
  onTabChange: onTabChangeProp,
  showVersionSelect = true,
  className,
}: PreviewCodeTabsProps) {
  const storeActiveTab = useWorkspaceStore((s) => s.activeTab);
  const storeSetActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const activeTab = activeTabProp ?? storeActiveTab;
  const setActiveTab = onTabChangeProp ?? storeSetActiveTab;

  return (
    <div
      className={cn(
        'flex h-12 items-center gap-3 border-b border-border bg-muted/30 px-3 py-2',
        className
      )}
    >
      <PreviewCodeTabsSegment activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-1 items-center justify-center">
        <CenterToolbarActions />
      </div>
      <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
      <div className="flex items-center gap-3">
        <RightToolbarActions showVersionSelect={showVersionSelect} />
      </div>
    </div>
  );
}
