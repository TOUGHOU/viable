/**
 * @file: app.module.ts
 * @author: houfujian houfujian@jd.com
 */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
