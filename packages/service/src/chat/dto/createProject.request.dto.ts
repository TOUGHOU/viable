/**
 * @file createProject.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateProjectRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  hasPreview?: boolean;
}
