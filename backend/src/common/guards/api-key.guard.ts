import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '@/lib/supabase.service';
import { RequestWithUser } from '@/types';
import { env } from '@/config/env';

export class AiWebsiteApiKeyException extends HttpException {
  constructor() {
    super(
      {
        success: false,
        error: `Missing AI-Website API key. Get one at ${env().aiWebsiteApiKeySiteUrl}`,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException({ success: false, error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }

    const { data, error } = await this.supabase.admin
      .from('users')
      .select('ai_website_api_key')
      .eq('id', userId)
      .single();

    if (error) {
      throw new HttpException({ success: false, error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data?.ai_website_api_key) {
      throw new AiWebsiteApiKeyException();
    }

    return true;
  }
}
