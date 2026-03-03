import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): { status: string; message: string } {
    return { status: 'ok', message: 'Vibe Coding Service' };
  }

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
