/**
 * @file deleteProject.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteProjectRequestDto {
  @IsNotEmpty({ message: 'id 不能为空' })
  @IsString()
  id!: string;
}
