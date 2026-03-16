/**
 * @file projectLimit.exception.ts
 * @author houfujian houfujian@jd.com
 * @description 项目数量达上限时抛出的 HTTP 异常，便于前端识别并展示提示
 */

import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';

export class ProjectLimitExceededException extends AppException {
  constructor(projectLimit: number, message?: string) {
    const defaultMessage = `项目数量已达上限（${projectLimit}），无法创建新项目`;
    super('PROJECT_LIMIT_EXCEEDED', message ?? defaultMessage, HttpStatus.TOO_MANY_REQUESTS, {
      projectLimit,
    });
  }
}
