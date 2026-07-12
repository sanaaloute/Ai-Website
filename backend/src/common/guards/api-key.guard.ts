import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderKeysService } from '@/modules/profile/provider-keys.service';
import { RequestWithUser } from '@/types';
import { env } from '@/config/env';

export class AiWebsiteApiKeyException extends HttpException {
  constructor() {
    super(
      {
        success: false,
        error: `Missing AI provider API key. Add one in your profile or get a key at ${env().aiWebsiteApiKeySiteUrl}`,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly providerKeys: ProviderKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException({ success: false, error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }

    let credentials;
    try {
      credentials = await this.providerKeys.resolveCredentials(userId);
    } catch (e) {
      throw new HttpException(
        { success: false, error: e instanceof Error ? e.message : String(e) },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (credentials.length === 0) {
      throw new AiWebsiteApiKeyException();
    }

    return true;
  }
}
