/**
 * @file getMessage.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsNotEmpty, IsString } from 'class-validator';

export class GetMessageRequestDto {
  @IsNotEmpty({ message: 'projectId 不能为空' })
  @IsString()
  projectId!: string;

  @IsNotEmpty({ message: 'messageId 不能为空' })
  @IsString()
  messageId!: string;
}
