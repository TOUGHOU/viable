/**
 * @file codeView.tsx
 * @description 代码展示（文件树 + 代码块占位）
 */

import { cn } from '@/lib/utils';

export interface CodeViewProps {
  files?: { path: string; content?: string }[];
  className?: string;
}

export function CodeView({ files = [], className }: CodeViewProps) {
  if (files.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center bg-muted/20 text-muted-foreground',
          className
        )}
      >
        暂无代码
      </div>
    );
  }
  return (
    <div className={cn('flex h-full overflow-hidden', className)}>
      <aside className="w-48 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-2 text-xs">
        <ul className="space-y-0.5">
          {files.map((f) => (
            <li key={f.path} className="truncate text-muted-foreground">
              {f.path}
            </li>
          ))}
        </ul>
      </aside>
      <pre className="min-w-0 flex-1 overflow-auto p-4 text-sm">
        <code>{files[0]?.content ?? '// 选择文件查看'}</code>
      </pre>
    </div>
  );
}
