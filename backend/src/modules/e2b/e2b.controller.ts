import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { OptionalAuthGuard } from '@/common/guards/optional-auth.guard';
import { AuthGuard } from '@/common/guards/auth.guard';
import { E2BService } from '@/lib/e2b.service';

@Controller('api/e2b')
export class E2BController {
  constructor(private readonly e2b: E2BService) {}

  @Post('attach')
  @UseGuards(OptionalAuthGuard)
  async attach(@Body() body: { sandboxId?: string }) {
    if (!body.sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const data = await this.e2b.attach(body.sandboxId);
    if (!data) throw new HttpException({ success: false, error: 'SANDBOX_GONE', code: 'SANDBOX_GONE' }, HttpStatus.GONE);
    return { success: true, recovered: true, sandboxData: data };
  }

  @Post('clone-repo')
  @UseGuards(OptionalAuthGuard)
  async cloneRepo(@Body() body: { sandboxId?: string; repoUrl?: string }) {
    if (!body.sandboxId || !body.repoUrl) {
      throw new HttpException({ success: false, error: 'sandboxId and repoUrl required' }, HttpStatus.BAD_REQUEST);
    }
    const result = await this.e2b.runCommand(
      body.sandboxId,
      `cd /home/user/app && rm -rf .[!.]* ..?* * 2>/dev/null || true && git clone ${body.repoUrl} .`,
    );
    const files = await this.e2b.readFiles(body.sandboxId);
    return { success: result.exitCode === 0, files: files.files, structure: files.structure, fileCount: files.fileCount };
  }

  @Get('sandboxes')
  @UseGuards(OptionalAuthGuard)
  async sandboxes(@Query('state') state?: string, @Query('limit') limit?: string) {
    const sandboxes = await this.e2b.listRunning();
    let filtered = sandboxes;
    if (state) filtered = filtered.filter((s) => s.state === state);
    const n = parseInt(limit ?? '25', 10);
    return { success: true, sandboxes: filtered.slice(0, n) };
  }

  @Post('terminate')
  @UseGuards(OptionalAuthGuard)
  async terminate(@Body() body: { sandboxId?: string }) {
    if (!body.sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const killed = await this.e2b.kill(body.sandboxId);
    return { success: true, sandboxKilled: killed };
  }
}
