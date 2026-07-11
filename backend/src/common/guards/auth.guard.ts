import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '@/lib/supabase.service';
import { env } from '@/config/env';
import { RequestWithUser } from '@/types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException({ success: false, error: 'Unauthorized' });
    }

    const { data, error } = await this.supabase.admin.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException({ success: false, error: 'Invalid session' });
    }

    // Ensure the user profile still exists. If an admin deleted the account,
    // the JWT may still be technically valid until expiry, but the profile is gone.
    const { data: profile, error: profileError } = await this.supabase.admin
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new UnauthorizedException({ success: false, error: 'User no longer exists' });
    }

    req.user = data.user;
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
