/**
 * @file app.exception.ts
 * @author houfujian houfujian@jd.com
 * @description 业务异常基类，统一携带 errorCode 与可选 meta
 */

import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    statusCode: number = HttpStatus.BAD_REQUEST,
    public readonly meta?: Record<string, unknown>
  ) {
    super(
      {
        errorCode,
        message,
      },
      statusCode
    );
  }
}

