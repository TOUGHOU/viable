/**
 * @file sendMessage.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SelectedElementDto } from './selectedElement.dto';

export class SendMessageRequestDto {
  @IsNotEmpty({ message: 'projectId 不能为空' })
  @IsString()
  projectId!: string;

  @IsNotEmpty({ message: 'content 不能为空' })
  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedElementDto)
  selectedElements?: SelectedElementDto[];
}
