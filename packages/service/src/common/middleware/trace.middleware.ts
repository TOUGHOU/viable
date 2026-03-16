/**
 * @file trace.middleware.ts
 * @author houfujian houfujian@jd.com
 * @description 为每个请求注入 traceId，使用 AsyncLocalStorage 贯穿调用链
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export interface TraceStore {
  traceId: string;
}

export const traceStore = new AsyncLocalStorage<TraceStore>();

export function traceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingTraceId = (req.headers['x-trace-id'] as string | undefined) ?? undefined;
  const traceId = incomingTraceId && incomingTraceId.trim().length > 0 ? incomingTraceId : randomUUID();

  res.setHeader('x-trace-id', traceId);

  traceStore.run({ traceId }, () => {
    next();
  });
}

