import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithAdmin } from './admin.types';

export const CurrentAdmin = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<RequestWithAdmin>();
  return req.admin;
});
