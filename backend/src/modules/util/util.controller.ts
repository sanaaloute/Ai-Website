import { Controller, Get, Post, Query, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Controller('api')
export class UtilController {
  private readonly logger = new Logger(UtilController.name);

  @Get('screenshot')
  async screenshot(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'url query param required' });
    }

    try {
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&screenshot=true`;
      const pagespeed = await fetch(apiUrl);
      const json = await pagespeed.json();
      const screenshotB64 = (json?.lighthouseResult?.fullPageScreenshot?.screenshot?.data as string) ?? '';
      if (!screenshotB64) {
        return res.status(HttpStatus.NOT_FOUND).json({ success: false, error: 'Screenshot unavailable' });
      }
      const buffer = Buffer.from(screenshotB64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    } catch (err) {
      this.logger.error(`screenshot error: ${err instanceof Error ? err.message : String(err)}`);
      res.status(HttpStatus.NOT_FOUND).json({ success: false, error: 'Screenshot unavailable' });
    }
  }

  @Post('search')
  search() {
    return {
      results: [],
      message: 'URL search is disabled. Use the AI agent instead.',
    };
  }
}
