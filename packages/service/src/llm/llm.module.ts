/**
 * @file llm.module.ts
 * @author houfujian houfujian@jd.com
 */
import { Module } from '@nestjs/common';
import { PreviewModule } from '../preview/preview.module';
import { LlmService } from './llm.service';
import { ToolsService } from './tools.service';

@Module({
  imports: [PreviewModule],
  providers: [LlmService, ToolsService],
  exports: [LlmService],
})
export class LlmModule {}
