import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Post,
  Body,
  UseGuards,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthGuard } from '@/common/guards/auth.guard';
import { OptionalAuthGuard } from '@/common/guards/optional-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@/types';
import { SupabaseService } from '@/lib/supabase.service';
import { AiGatewayService } from '@/lib/ai-gateway.service';

@Controller('api')
export class ProfileController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai: AiGatewayService,
  ) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@CurrentUser() user: User) {
    const profile = (await this.supabase.getProfile(user.id)) ?? {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? null,
      phone: null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      subscribed: false,
      subscription_type: null,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    const { data: subscription } = await this.supabase.admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      profile,
      subscription: subscription
        ? {
            plan: subscription.plan ?? 'basic',
            plan_label: (subscription.plan ?? 'Basic').replace(/^\w/, (c: string) => c.toUpperCase()),
            billing_interval: subscription.billing_interval ?? 'month',
            status: subscription.status ?? 'incomplete',
            stripe_price_id: subscription.stripe_price_id ?? '',
            price_display: '',
          }
        : null,
    };
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    const allowed = ['full_name', 'phone', 'avatar_url'];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    patch.updated_at = new Date().toISOString();
    const ok = await this.supabase.updateProfile(user.id, patch);
    return { ok };
  }

  @Get('ai-website-api-key')
  @UseGuards(AuthGuard)
  async getApiKey(@CurrentUser() user: User) {
    const profile = await this.supabase.getProfile(user.id);
    const key = (profile?.ai_website_api_key as string) ?? '';
    return {
      ok: true,
      hasApiKey: !!key,
      keyPreview: key ? `${key.slice(0, 5)}...${key.slice(-4)}` : null,
    };
  }

  @Put('ai-website-api-key')
  @UseGuards(AuthGuard)
  async saveApiKey(@CurrentUser() user: User, @Body() body: { api_key?: string; apiKey?: string }) {
    const apiKey = String(body.api_key ?? body.apiKey ?? '').trim();
    if (!apiKey) throw new HttpException({ success: false, error: 'api_key is required' }, HttpStatus.BAD_REQUEST);

    const validation = await this.ai.validateApiKey(apiKey);
    if (!validation.valid && validation.authFailure) {
      // The gateway definitively rejected this key (401/403 on every model).
      // Refuse to persist it — saving it would let users into a generation
      // flow that fails on every request with "Invalid token".
      throw new HttpException(
        { success: false, error: 'Invalid API key. Please check the key and try again.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { error } = await this.supabase.admin.from('users').update({ ai_website_api_key: apiKey }).eq('id', user.id);
    if (error) throw new HttpException({ success: false, error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);

    return {
      ok: true,
      hasApiKey: true,
      keyPreview: `${apiKey.slice(0, 5)}...${apiKey.slice(-4)}`,
      validated: validation.valid,
      validationWarning: validation.warning,
    };
  }

  @Delete('ai-website-api-key')
  @UseGuards(AuthGuard)
  async deleteApiKey(@CurrentUser() user: User) {
    const { error } = await this.supabase.admin.from('users').update({ ai_website_api_key: null }).eq('id', user.id);
    if (error) throw new HttpException({ success: false, error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    return { ok: true, hasApiKey: false, keyPreview: null };
  }

  @Get('conversation-state')
  @UseGuards(OptionalAuthGuard)
  getConversationState(@CurrentUser() user: User | undefined, @Query('state') state?: string) {
    return { state: state ?? '', userId: user?.id ?? null };
  }

  @Post('conversation-state')
  @UseGuards(OptionalAuthGuard)
  postConversationState(@CurrentUser() user: User | undefined, @Body() body: { action?: string; state?: unknown }) {
    return { state: body.action === 'reset' ? {} : body.state ?? {}, cleared: body.action === 'reset', userId: user?.id ?? null };
  }

  @Delete('conversation-state')
  @UseGuards(OptionalAuthGuard)
  deleteConversationState(@CurrentUser() user: User | undefined) {
    return { state: {}, cleared: true, userId: user?.id ?? null };
  }
}
