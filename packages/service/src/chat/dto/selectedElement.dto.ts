/**
 * @file selectedElement.dto.ts
 * @author houfujian houfujian@jd.com
 * @description 选中元素结构，与前端 Inspector 上报一致
 */

import { IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SelectedElementRectDto {
  @IsNumber()
  left!: number;
  @IsNumber()
  top!: number;
  @IsNumber()
  width!: number;
  @IsNumber()
  height!: number;
  @IsNumber()
  right!: number;
  @IsNumber()
  bottom!: number;
}

export class SelectedElementDto {
  @IsString()
  id!: string;
  @IsString()
  name!: string;
  @IsString()
  type!: string;
  @IsString()
  filePath!: string;
  @IsString()
  fileName!: string;
  @IsNumber()
  lineNumber!: number;
  @IsNumber()
  col!: number;
  @IsOptional()
  @IsString()
  floorId?: string;
  @ValidateNested()
  @Type(() => SelectedElementRectDto)
  rect!: SelectedElementRectDto;
}
