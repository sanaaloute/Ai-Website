import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser, User } from '@/types';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
