/**
 * @file global-exception.filter.ts
 * @author houfujian houfujian@jd.com
 * @description 全局异常过滤器，统一错误响应结构与日志分级
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import type { ErrorResponse } from '../interfaces/response.interface';
import { traceStore } from '../middleware/trace.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.normalize(exception);

    const logPayload: Record<string, unknown> = {
      ...body,
      path: request.url,
      method: request.method,
    };

    if (exception instanceof AppException && exception.meta) {
      logPayload.meta = exception.meta;
    }

    if (exception instanceof Error && exception.stack) {
      logPayload.stack = exception.stack;
    }

    if (status >= 500) {
      this.logger.error(logPayload);
    } else {
      this.logger.warn(logPayload);
    }

    response.status(status).json(body);
  }

  private normalize(exception: unknown): { status: number; body: ErrorResponse } {
    // 1. 业务异常（AppException）
    if (exception instanceof AppException) {
      const httpStatus = exception.getStatus();
      const res = exception.getResponse() as { errorCode?: string; message?: string };
      return {
        status: httpStatus,
        body: this.build(res.errorCode ?? exception.errorCode, res.message ?? exception.message, httpStatus),
      };
    }

    // 2. Nest 内置 HttpException（包含 ValidationPipe 等）
    if (exception instanceof HttpException) {
      const httpStatus = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : Array.isArray((res as any).message)
            ? (res as any).message.join('; ')
            : (res as any).message ?? exception.message;

      const errorCode = httpStatus >= 500 ? 'INTERNAL_ERROR' : 'HTTP_EXCEPTION';

      return {
        status: httpStatus,
        body: this.build(errorCode, message, httpStatus),
      };
    }

    // 3. 未知异常（DB 崩溃、第三方超时等）
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: this.build('INTERNAL_ERROR', 'An unexpected error occurred', HttpStatus.INTERNAL_SERVER_ERROR),
    };
  }

  private build(errorCode: string, message: string, status: number): ErrorResponse {
    return {
      success: false,
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      traceId: traceStore.getStore()?.traceId ?? 'N/A',
    };
  }
}

