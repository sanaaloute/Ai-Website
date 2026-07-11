import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from '@/lib/supabase.service';
import { E2BService } from '@/lib/e2b.service';

@Controller()
export class HealthController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly e2b: E2BService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', version: '1.0.0' };
  }

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(@Res() res: Response) {
    let supabaseOk = false;
    try {
      const { error } = await this.supabase.admin.auth.getSession();
      supabaseOk = !error;
    } catch {
      supabaseOk = false;
    }

    const e2bOk = this.e2b.configured;
    const ready = supabaseOk && e2bOk;

    res.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: ready ? 'ok' : 'not ready',
      supabase: supabaseOk,
      e2b: e2bOk,
    });
  }
}
