/**
 * @file getMessages.request.dto.ts
 * @author houfujian houfujian@jd.com
 */
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetMessagesRequestDto {
  @IsNotEmpty({ message: 'projectId 不能为空' })
  @IsString()
  projectId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;
}
