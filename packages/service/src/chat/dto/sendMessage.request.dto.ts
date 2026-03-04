/**
 * @file sendMessage.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageRequestDto {
  @IsNotEmpty({ message: 'conversationId 不能为空' })
  @IsString()
  conversationId!: string;

  @IsNotEmpty({ message: 'content 不能为空' })
  @IsString()
  content!: string;
}
