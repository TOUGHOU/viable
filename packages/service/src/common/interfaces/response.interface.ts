/**
 * @file response.interface.ts
 * @author houfujian houfujian@jd.com
 * @description 后端统一响应结构定义（成功 / 失败）
 */

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp: string;
  traceId: string;
  errors?: FieldError[];
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  traceId: string;
}

