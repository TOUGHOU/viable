/**
 * @file createConversation.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateConversationRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  hasPreview?: boolean;
}
