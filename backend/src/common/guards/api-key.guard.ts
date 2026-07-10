import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '@/lib/supabase.service';
import { RequestWithUser } from '@/types';
import { env } from '@/config/env';

export class LoveCodeApiKeyException extends HttpException {
  constructor() {
    super(
      {
        success: false,
        error: `Missing LoveCode API key. Get one at ${env().lovecodeApiKeySiteUrl}`,
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
      .select('lovecode_api_key')
      .eq('id', userId)
      .single();

    if (error) {
      throw new HttpException({ success: false, error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!data?.lovecode_api_key) {
      throw new LoveCodeApiKeyException();
    }

    return true;
  }
}
