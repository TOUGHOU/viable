/**
 * @file: app.controller.ts
 * @author: houfujian houfujian@jd.com
 */
import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

@Controller()
export class AppController {
  @Post()
  @HttpCode(HttpStatus.OK)
  getHello(): { status: string; message: string } {
    return { status: 'ok', message: 'Vibe Coding Service' };
  }

  @Post('health')
  @HttpCode(HttpStatus.OK)
  health(): { status: string } {
    return { status: 'ok' };
  }
}
