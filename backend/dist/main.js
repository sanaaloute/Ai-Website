"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = require("express");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const env_1 = require("./config/env");
async function bootstrap() {
    (0, env_1.resetEnvCache)();
    const e = (0, env_1.env)();
    const logger = new common_1.Logger('Bootstrap');
    const adapter = new platform_express_1.ExpressAdapter();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter);
    const configuredOrigins = e.frontendOrigin
        ? e.frontendOrigin.split(',').map((o) => o.trim())
        : ['http://localhost:3000'];
    const extraOrigins = [e.appUrl, e.siteUrl]
        .filter((o) => Boolean(o) && !configuredOrigins.includes(o));
    const allowedOrigins = [...configuredOrigins, ...extraOrigins];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, origin ?? true);
            }
            else {
                callback(new Error(`CORS blocked origin: ${origin}`), false);
            }
        },
        credentials: e.corsCredentials,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
    });
    app.use((0, cookie_parser_1.default)());
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.use('/api/stripe/webhook', (0, express_1.json)({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
        limit: '10mb',
    }));
    app.use((0, express_1.json)({
        limit: '10mb',
    }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    await app.listen(e.port, e.host);
    logger.log(`AI-Website API Gateway running on http://${e.host}:${e.port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map