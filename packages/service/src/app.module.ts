/**
 * @file: app.module.ts
 * @author: houfujian houfujian@jd.com
 */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
