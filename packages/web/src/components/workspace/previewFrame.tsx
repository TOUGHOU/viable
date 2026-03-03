/**
 * @file previewFrame.tsx
 * @description iframe 或内嵌预览
 */

import { cn } from '@/lib/utils';

export interface PreviewFrameProps {
  src?: string | null;
  className?: string;
}

export function PreviewFrame({ src, className }: PreviewFrameProps) {
  if (!src) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center bg-muted/20 text-muted-foreground',
          className
        )}
      >
        暂无预览
      </div>
    );
  }
  return (
    <iframe
      title="预览"
      src={src}
      className={cn('h-full w-full border-0', className)}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
