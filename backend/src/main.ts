import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { json, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { env, resetEnvCache } from './config/env';

async function bootstrap() {
  resetEnvCache();
  const e = env();
  const logger = new Logger('Bootstrap');

  const adapter = new ExpressAdapter();
  const app = await NestFactory.create(AppModule, adapter);

  const configuredOrigins = e.frontendOrigin
    ? e.frontendOrigin.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  // Always allow the configured app/site URLs so production deployments are not
  // locked out when FRONTEND_ORIGIN/CORS_ORIGINS still contain dev values.
  const extraOrigins = [e.appUrl, e.siteUrl]
    .filter((o): o is string => Boolean(o) && !configuredOrigins.includes(o));

  const allowedOrigins = [...configuredOrigins, ...extraOrigins];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin ?? true);
      } else {
        callback(new Error(`CORS blocked origin: ${origin}`), false);
      }
    },
    credentials: e.corsCredentials,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
  });

  app.use(cookieParser());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  // Raw body for Stripe webhook only
  app.use(
    '/api/stripe/webhook',
    json({
      verify: (req: Request, _res: Response, buf: Buffer) => {
        (req as Request & { rawBody: Buffer }).rawBody = buf;
      },
      limit: '10mb',
    }),
  );

  app.use(
    json({
      limit: '10mb',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(e.port, e.host);
  logger.log(`LoveCode API Gateway running on http://${e.host}:${e.port}`);
}

bootstrap();
