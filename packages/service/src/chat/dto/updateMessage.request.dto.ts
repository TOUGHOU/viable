/**
 * @file updateMessage.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMessageRequestDto {
  @IsNotEmpty({ message: 'conversationId 不能为空' })
  @IsString()
  conversationId!: string;

  @IsNotEmpty({ message: 'messageId 不能为空' })
  @IsString()
  messageId!: string;

  @IsNotEmpty({ message: 'content 不能为空' })
  @IsString()
  content!: string;
}
