import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Req,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@/types';
import { StripeService } from '@/lib/stripe.service';

@Controller('api')
export class BillingController {
  constructor(private readonly stripe: StripeService) {}

  @Post('checkout')
  @UseGuards(AuthGuard)
  async checkout(
    @CurrentUser() user: User,
    @Body() body: { priceId: string; billingMode?: string; successUrl: string; cancelUrl: string },
  ) {
    if (!body.priceId) throw new HttpException({ success: false, error: 'priceId required' }, HttpStatus.BAD_REQUEST);
    const url = await this.stripe.createCheckoutSession({
      userId: user.id,
      priceId: body.priceId,
      mode: body.billingMode === 'subscription' ? 'subscription' : 'payment',
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
    return { url };
  }

  @Post('billing/portal')
  @UseGuards(AuthGuard)
  async portal(@CurrentUser() user: User, @Body() body: { returnUrl: string }) {
    const url = await this.stripe.createPortalSession(user.id, body.returnUrl);
    return { url };
  }

  @Post('billing/sync-checkout-session')
  @UseGuards(AuthGuard)
  async syncCheckout(@Body() body: { sessionId: string }) {
    if (!body.sessionId) throw new HttpException({ success: false, error: 'sessionId required' }, HttpStatus.BAD_REQUEST);
    const ok = await this.stripe.syncCheckoutSession(body.sessionId);
    return { ok };
  }

  @Post('stripe/webhook')
  async webhook(@Req() req: Request, @Headers('stripe-signature') signature: string, @Res() res: Response) {
    if (!signature) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Missing stripe-signature' });
    }
    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('');
      const result = await this.stripe.handleWebhook(rawBody, signature);
      return res.json(result);
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
