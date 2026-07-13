"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const e2b_service_1 = require("../../lib/e2b.service");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let body = { success: false, error: 'Internal server error' };
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                body = { success: false, error: res };
            }
            else if (typeof res === 'object' && res !== null) {
                body = { success: false, ...res };
            }
        }
        else if (exception instanceof e2b_service_1.E2BNotConfiguredError) {
            status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
            body = { success: false, error: 'E2B_NOT_CONFIGURED', code: 'E2B_NOT_CONFIGURED' };
        }
        else if (exception instanceof e2b_service_1.SandboxNotFoundError) {
            status = common_1.HttpStatus.NOT_FOUND;
            body = { success: false, error: 'SANDBOX_NOT_FOUND', code: 'SANDBOX_NOT_FOUND' };
        }
        else if (exception instanceof e2b_service_1.SandboxGoneError) {
            status = common_1.HttpStatus.GONE;
            body = { success: false, error: 'SANDBOX_GONE', code: 'SANDBOX_GONE' };
        }
        else if (exception instanceof e2b_service_1.E2BProviderError) {
            status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
            body = { success: false, error: exception.message, code: 'E2B_PROVIDER_ERROR' };
        }
        else if (exception instanceof Error) {
            body = { success: false, error: exception.message };
        }
        this.logger.error(`${request.method} ${request.url} ${status} - ${body.error ?? 'unknown'}`, exception instanceof Error ? exception.stack : undefined);
        if (!response.headersSent) {
            response.status(status).json(body);
        }
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map