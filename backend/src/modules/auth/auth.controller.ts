import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  Res,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@/types';
import { SupabaseService } from '@/lib/supabase.service';
import { CookieService } from '@/lib/cookie.service';
import { env } from '@/config/env';

interface AuthResponse {
  success: boolean;
  user: User;
}

interface SignInDto {
  email: string;
  password: string;
}

interface SignUpDto {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

interface ResetPasswordDto {
  email: string;
  redirectTo?: string;
}

const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

@Controller('api')
export class AuthController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly cookies: CookieService,
  ) {}

  private async ensureUserProfile(user: User, fullName?: string, phone?: string): Promise<void> {
    // Keep a public.users row in sync with Supabase Auth so the AuthGuard
    // profile check does not reject legitimate sessions. Only overwrite name/phone
    // when we actually have a value, so existing profile data is preserved.
    try {
      const profile: Record<string, unknown> = {
        id: user.id,
        email: user.email,
        updated_at: new Date().toISOString(),
      };
      const fullNameValue = fullName ?? (user.user_metadata?.full_name as string | undefined);
      const phoneValue = phone ?? (user.user_metadata?.phone as string | undefined);
      if (fullNameValue) profile.full_name = fullNameValue;
      if (phoneValue) profile.phone = phoneValue;

      await this.supabase.admin.from('users').upsert(profile, { onConflict: 'id' });
    } catch {
      // Best-effort: some projects create the profile via database trigger.
    }
  }

  private extractTokenFromRequest(req: Request): string | undefined {
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

  @Get('auth/session')
  @UseGuards(AuthGuard)
  session(@CurrentUser() user: User) {
    return { user };
  }

  @Post('auth/signin')
  async signIn(
    @Body() body: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    if (!body.email || !body.password) {
      throw new HttpException({ success: false, error: 'email and password required' }, HttpStatus.BAD_REQUEST);
    }

    const { data, error } = await this.supabase.anon.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.session || !data.user) {
      throw new HttpException(
        { success: false, error: error?.message || 'sign in failed' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.ensureUserProfile(data.user);

    this.cookies.setAccessToken(res, data.session.access_token, data.session.expires_in, req);
    this.cookies.setRefreshToken(res, data.session.refresh_token, REFRESH_COOKIE_MAX_AGE_SECONDS, req);

    return { success: true, user: data.user };
  }

  @Post('auth/signup')
  async signUp(
    @Body() body: SignUpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    if (!body.email || !body.password) {
      throw new HttpException({ success: false, error: 'email and password required' }, HttpStatus.BAD_REQUEST);
    }

    const { data, error } = await this.supabase.anon.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          full_name: body.fullName,
          phone: body.phone,
        },
      },
    });

    if (error || !data.session || !data.user) {
      throw new HttpException(
        { success: false, error: error?.message || 'sign up failed' },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.ensureUserProfile(data.user, body.fullName, body.phone);

    this.cookies.setAccessToken(res, data.session.access_token, data.session.expires_in, req);
    this.cookies.setRefreshToken(res, data.session.refresh_token, REFRESH_COOKIE_MAX_AGE_SECONDS, req);

    return { success: true, user: data.user };
  }

  @Post('auth/signout')
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Revoke the session server-side if a valid access token is present.
    const token = this.extractTokenFromRequest(req);
    if (token) {
      const { data } = await this.supabase.admin.auth.getUser(token);
      if (data.user) {
        await this.supabase.admin.auth.admin.signOut(token).catch(() => {
          // Best-effort revocation.
        });
      }
    }

    this.cookies.clearAuthCookies(res, req);
    return { success: true };
  }

  @Post('auth/refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.headers['cookie'];
    const e = env();
    let refreshToken: string | undefined;
    if (cookies) {
      const match = cookies.match(new RegExp(`(?:^|;\\s*)${e.refreshTokenCookieName}=([^;]+)`));
      if (match) refreshToken = decodeURIComponent(match[1]);
    }

    // Legacy fallback for clients still sending the token in the body.
    if (!refreshToken && typeof req.body === 'object' && req.body !== null && 'refresh_token' in req.body) {
      refreshToken = (req.body as { refresh_token?: string }).refresh_token;
    }

    if (!refreshToken) {
      throw new HttpException({ success: false, error: 'refresh_token required' }, HttpStatus.BAD_REQUEST);
    }

    const { data, error } = await this.supabase.anon.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      const msg = (error?.message ?? '').toLowerCase();
      const isDeadSession =
        msg.includes('invalid refresh token') ||
        msg.includes('refresh token not found') ||
        msg.includes('token has been revoked') ||
        msg.includes('jwt expired');

      if (isDeadSession) {
        // Clear stale cookies so the client stops sending a dead refresh token.
        this.cookies.clearAuthCookies(res, req);
      }

      throw new HttpException(
        { success: false, error: error?.message || 'session refresh failed' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.cookies.setAccessToken(res, data.session.access_token, data.session.expires_in, req);
    this.cookies.setRefreshToken(res, data.session.refresh_token, REFRESH_COOKIE_MAX_AGE_SECONDS, req);

    return { success: true };
  }

  @Post('auth/reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    if (!body.email) {
      throw new HttpException({ success: false, error: 'email required' }, HttpStatus.BAD_REQUEST);
    }
    const { error } = await this.supabase.anon.auth.resetPasswordForEmail(body.email, {
      redirectTo: body.redirectTo,
    });
    if (error) {
      throw new HttpException({ success: false, error: error.message }, HttpStatus.BAD_REQUEST);
    }
    return { success: true, message: 'Password reset email sent' };
  }

  @Post('reset')
  async legacyReset(@Body() body: { email?: string; redirectTo?: string }) {
    if (!body.email) {
      throw new HttpException({ success: false, error: 'email required' }, HttpStatus.BAD_REQUEST);
    }
    const { error } = await this.supabase.anon.auth.resetPasswordForEmail(body.email, {
      redirectTo: body.redirectTo,
    });
    if (error) {
      throw new HttpException({ success: false, error: error.message }, HttpStatus.BAD_REQUEST);
    }
    return { success: true, message: 'Password reset email sent' };
  }
}
