"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStreamRateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const rate_limit_service_1 = require("./rate-limit.service");
let AgentStreamRateLimitGuard = class AgentStreamRateLimitGuard {
    constructor(rateLimitService) {
        this.rateLimitService = rateLimitService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user?.id) {
            throw new common_1.HttpException({ success: false, error: 'Unauthorized' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        const result = await this.rateLimitService.checkAgentStreamEnqueue(user.id);
        if (!result.allowed) {
            throw new common_1.HttpException({
                success: false,
                error: result.reason,
                retryAfterSeconds: result.retryAfterSeconds,
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
};
exports.AgentStreamRateLimitGuard = AgentStreamRateLimitGuard;
exports.AgentStreamRateLimitGuard = AgentStreamRateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rate_limit_service_1.RateLimitService])
], AgentStreamRateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map