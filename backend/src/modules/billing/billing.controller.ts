import {
  Controller,
  Get,
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
import { PaddleService } from '@/lib/paddle.service';
import { EntitlementsService } from './entitlements.service';
import { FEATURE_LABELS, FEATURE_REQUIRED_PLAN, PAID_PLAN_IDS, PLANS } from '@/lib/plans';
import { env } from '@/config/env';

@Controller('api')
export class BillingController {
  constructor(
    private readonly paddle: PaddleService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Post('checkout')
  @UseGuards(AuthGuard)
  async checkout(
    @CurrentUser() user: User,
    @Body() body: { priceId: string; billingMode?: string; successUrl: string; cancelUrl: string },
  ) {
    if (!body.priceId) throw new HttpException({ success: false, error: 'priceId required' }, HttpStatus.BAD_REQUEST);
    const url = await this.paddle.createCheckoutSession({
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
    const url = await this.paddle.createCustomerPortalSession(user.id, body.returnUrl);
    return { url };
  }

  @Post('billing/sync-checkout-session')
  @UseGuards(AuthGuard)
  async syncCheckout(@Body() body: { transactionId?: string; sessionId?: string }) {
    const transactionId = body.transactionId ?? body.sessionId;
    if (!transactionId) throw new HttpException({ success: false, error: 'transactionId required' }, HttpStatus.BAD_REQUEST);
    const ok = await this.paddle.syncCheckoutSession(transactionId);
    return { ok };
  }

  @Get('entitlements')
  @UseGuards(AuthGuard)
  async getEntitlements(@CurrentUser() user: User) {
    return { ok: true, ...(await this.entitlements.getEntitlements(user.id)) };
  }

  /** Public plan catalog for the pricing UI (Paddle price IDs from env). */
  @Get('billing/plans')
  async getBillingPlans() {
    const e = env();
    const catalogPrices = await this.paddle.getCatalogPrices();

    const plans = PAID_PLAN_IDS.map((id) => {
      const def = PLANS[id];
      const key = id.toUpperCase();
      const catalog = catalogPrices[id];
      return {
        id,
        label: def.label,
        priceMonthly: catalog?.monthly ?? def.priceMonthly,
        priceYearly: catalog?.yearly ?? def.priceYearly,
        priceIdMonthly: e.paddlePrices[`${key}_MONTHLY`] ?? null,
        priceIdYearly: e.paddlePrices[`${key}_YEARLY`] ?? null,
        features: def.features.map((f) => ({
          id: f,
          label: FEATURE_LABELS[f],
          requiredPlan: FEATURE_REQUIRED_PLAN[f],
        })),
        limits: def.limits,
      };
    });
    return {
      ok: true,
      trial: {
        id: 'trial',
        label: PLANS.trial.label,
        priceMonthly: 0,
        priceYearly: 0,
        features: [],
        limits: PLANS.trial.limits,
      },
      plans,
    };
  }

  @Post('paddle/webhook')
  async webhook(@Req() req: Request, @Headers('paddle-signature') signature: string, @Res() res: Response) {
    if (!signature) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Missing paddle-signature' });
    }
    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('');
      const result = await this.paddle.handleWebhook(rawBody, signature);
      return res.json(result);
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
