/**
 * @file llm.module.ts
 * @author houfujian houfujian@jd.com
 */
import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ToolsService } from './tools.service';

@Module({
  providers: [LlmService, ToolsService],
  exports: [LlmService],
})
export class LlmModule {}
