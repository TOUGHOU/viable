/**
 * @file chat.module.ts
 * @author houfujian houfujian@jd.com
 */
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatFileStorage } from './storage/chat.file.storage';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: 'IChatStorage',
      useClass: ChatFileStorage,
    },
  ],
})
export class ChatModule {}
