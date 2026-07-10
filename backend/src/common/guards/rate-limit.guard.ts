import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import { User } from '@/types';

interface RequestWithUser extends Request {
  user?: User;
}

@Injectable()
export class AgentStreamRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user?.id) {
      throw new HttpException({ success: false, error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }

    const result = await this.rateLimitService.checkAgentStreamEnqueue(user.id);
    if (!result.allowed) {
      throw new HttpException(
        {
          success: false,
          error: result.reason,
          retryAfterSeconds: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
