import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { E2BNotConfiguredError, SandboxGoneError, SandboxNotFoundError, E2BProviderError } from '@/lib/e2b.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = { success: false, error: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        body = { success: false, error: res };
      } else if (typeof res === 'object' && res !== null) {
        body = { success: false, ...(res as Record<string, unknown>) };
      }
    } else if (exception instanceof E2BNotConfiguredError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      body = { success: false, error: 'E2B_NOT_CONFIGURED', code: 'E2B_NOT_CONFIGURED' };
    } else if (exception instanceof SandboxNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      body = { success: false, error: 'SANDBOX_NOT_FOUND', code: 'SANDBOX_NOT_FOUND' };
    } else if (exception instanceof SandboxGoneError) {
      status = HttpStatus.GONE;
      body = { success: false, error: 'SANDBOX_GONE', code: 'SANDBOX_GONE' };
    } else if (exception instanceof E2BProviderError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      body = { success: false, error: exception.message, code: 'E2B_PROVIDER_ERROR' };
    } else if (exception instanceof Error) {
      body = { success: false, error: exception.message };
    }

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${body.error ?? 'unknown'}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    if (!response.headersSent) {
      response.status(status).json(body);
    }
  }
}
