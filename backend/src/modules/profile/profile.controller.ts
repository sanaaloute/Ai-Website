import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Post,
  Body,
  Param,
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
import { ProviderKeysService } from './provider-keys.service';
import { isProviderId, listProviders } from '@/lib/llm-providers';

@Controller('api')
export class ProfileController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly providerKeys: ProviderKeysService,
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

  @Get('llm-providers')
  @UseGuards(AuthGuard)
  getLlmProviders() {
    return {
      ok: true,
      providers: listProviders().map((p) => ({
        id: p.id,
        label: p.label,
        keySiteUrl: p.keySiteUrl,
        models: p.models,
      })),
    };
  }

  @Get('provider-keys')
  @UseGuards(AuthGuard)
  async getProviderKeys(@CurrentUser() user: User) {
    const state = await this.providerKeys.listKeys(user.id);
    return { ok: true, ...state };
  }

  @Put('provider-keys/:provider')
  @UseGuards(AuthGuard)
  async saveProviderKey(
    @CurrentUser() user: User,
    @Param('provider') provider: string,
    @Body() body: { api_key?: string; apiKey?: string },
  ) {
    if (!isProviderId(provider)) {
      throw new HttpException({ success: false, error: `Unknown provider: ${provider}` }, HttpStatus.BAD_REQUEST);
    }
    const apiKey = String(body.api_key ?? body.apiKey ?? '').trim();
    if (!apiKey) throw new HttpException({ success: false, error: 'api_key is required' }, HttpStatus.BAD_REQUEST);

    const result = await this.providerKeys.saveKey(user.id, provider, apiKey);
    if (!result.ok) {
      throw new HttpException({ success: false, error: result.error }, HttpStatus.BAD_REQUEST);
    }
    return { provider, ...result };
  }

  @Delete('provider-keys/:provider')
  @UseGuards(AuthGuard)
  async deleteProviderKey(@CurrentUser() user: User, @Param('provider') provider: string) {
    if (!isProviderId(provider)) {
      throw new HttpException({ success: false, error: `Unknown provider: ${provider}` }, HttpStatus.BAD_REQUEST);
    }
    const { activeProvider } = await this.providerKeys.deleteKey(user.id, provider);
    return { ok: true, provider, activeProvider };
  }

  @Put('provider-keys-active')
  @UseGuards(AuthGuard)
  async setActiveProvider(@CurrentUser() user: User, @Body() body: { provider?: string }) {
    const provider = String(body.provider ?? '').trim();
    if (!isProviderId(provider)) {
      throw new HttpException({ success: false, error: `Unknown provider: ${provider}` }, HttpStatus.BAD_REQUEST);
    }
    const result = await this.providerKeys.setActiveProvider(user.id, provider);
    if (!result.ok) {
      throw new HttpException({ success: false, error: result.error }, HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Get('ai-website-api-key')
  @UseGuards(AuthGuard)
  async getApiKey(@CurrentUser() user: User) {
    const state = await this.providerKeys.listKeys(user.id);
    const tokenfree = state.keys.find((k) => k.provider === 'tokenfree');
    return {
      ok: true,
      hasApiKey: !!tokenfree,
      keyPreview: tokenfree?.keyPreview ?? null,
    };
  }

  @Put('ai-website-api-key')
  @UseGuards(AuthGuard)
  async saveApiKey(@CurrentUser() user: User, @Body() body: { api_key?: string; apiKey?: string }) {
    const apiKey = String(body.api_key ?? body.apiKey ?? '').trim();
    if (!apiKey) throw new HttpException({ success: false, error: 'api_key is required' }, HttpStatus.BAD_REQUEST);

    const result = await this.providerKeys.saveKey(user.id, 'tokenfree', apiKey);
    if (!result.ok) {
      throw new HttpException({ success: false, error: result.error }, HttpStatus.BAD_REQUEST);
    }
    return {
      ok: true,
      hasApiKey: true,
      keyPreview: result.keyPreview,
      validated: result.validated,
      validationWarning: result.validationWarning,
    };
  }

  @Delete('ai-website-api-key')
  @UseGuards(AuthGuard)
  async deleteApiKey(@CurrentUser() user: User) {
    await this.providerKeys.deleteKey(user.id, 'tokenfree');
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
