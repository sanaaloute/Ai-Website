import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { env } from '@/config/env';
import { SupabaseService } from '@/lib/supabase.service';
import { AdminJwtPayload, RequestWithAdmin } from './admin.types';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException({ success: false, error: 'Unauthorized' });
    }

    let payload: AdminJwtPayload;
    try {
      payload = verify(token, env().adminJwtSecret, {
        algorithms: [env().adminJwtAlgorithm as 'HS256'],
      }) as AdminJwtPayload;
    } catch {
      throw new UnauthorizedException({ success: false, error: 'Invalid or expired token' });
    }

    const { data: admin, error } = await this.supabase.admin
      .from('admin_users')
      .select('*')
      .eq('id', payload.sub)
      .single();

    if (error || !admin) {
      throw new UnauthorizedException({ success: false, error: 'Admin not found' });
    }

    req.admin = admin as unknown as RequestWithAdmin['admin'];
    return true;
  }

  private extractToken(req: RequestWithAdmin): string | undefined {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const cookies = req.headers['cookie'];
    if (!cookies) return undefined;

    const e = env();
    const match = cookies.match(new RegExp(`(?:^|;\\s*)${e.adminTokenCookieName}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);

    return undefined;
  }
}
