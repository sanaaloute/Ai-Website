import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SupabaseService } from '@/lib/supabase.service';
import { env } from '@/config/env';
import { RequestWithUser } from '@/types';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(req);

    if (token) {
      try {
        const { data, error } = await this.supabase.admin.auth.getUser(token);
        if (!error && data.user) {
          req.user = data.user;
        }
      } catch {
        // ignore
      }
    }

    return true;
  }

  private extractToken(req: RequestWithUser): string | undefined {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const cookies = req.headers['cookie'];
    if (!cookies) return undefined;

    const e = env();
    const names = [e.accessTokenCookieName, 'sb-access-token', 'supabase-auth-token'];
    for (const name of names) {
      const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
      if (match) return decodeURIComponent(match[1]);
    }

    return undefined;
  }
}
