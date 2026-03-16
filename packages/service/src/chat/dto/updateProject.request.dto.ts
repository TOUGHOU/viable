/**
 * @file updateProject.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProjectRequestDto {
  @IsNotEmpty({ message: 'id 不能为空' })
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  hasPreview?: boolean;

  @IsOptional()
  @IsString()
  previewStatus?: 'pending' | 'running' | 'failed';
}
