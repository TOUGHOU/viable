/**
 * @file updateConversation.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateConversationRequestDto {
  @IsNotEmpty({ message: 'id 不能为空' })
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  hasPreview?: boolean;
}
