/**
 * @file chat.exception.ts
 * @author houfujian houfujian@jd.com
 * @description Chat 模块业务异常定义（项目 / 消息维度）
 */

import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';

export class ProjectNotFoundException extends AppException {
  constructor(projectId: string) {
    super('PROJECT_NOT_FOUND', '项目不存在', HttpStatus.NOT_FOUND, { projectId });
  }
}

export class MessageNotFoundException extends AppException {
  constructor(projectId: string, messageId: string) {
    super('MESSAGE_NOT_FOUND', '消息不存在', HttpStatus.NOT_FOUND, {
      projectId,
      messageId,
    });
  }
}

