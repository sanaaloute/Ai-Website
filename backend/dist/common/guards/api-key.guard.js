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
exports.ApiKeyGuard = exports.AiWebsiteApiKeyException = void 0;
const common_1 = require("@nestjs/common");
const provider_keys_service_1 = require("../../modules/profile/provider-keys.service");
const env_1 = require("../../config/env");
class AiWebsiteApiKeyException extends common_1.HttpException {
    constructor() {
        super({
            success: false,
            error: `Missing AI provider API key. Add one in your profile or get a key at ${(0, env_1.env)().aiWebsiteApiKeySiteUrl}`,
        }, common_1.HttpStatus.PAYMENT_REQUIRED);
    }
}
exports.AiWebsiteApiKeyException = AiWebsiteApiKeyException;
let ApiKeyGuard = class ApiKeyGuard {
    constructor(providerKeys) {
        this.providerKeys = providerKeys;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.HttpException({ success: false, error: 'Unauthorized' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        let credentials;
        try {
            credentials = await this.providerKeys.resolveCredentials(userId);
        }
        catch (e) {
            throw new common_1.HttpException({ success: false, error: e instanceof Error ? e.message : String(e) }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (credentials.length === 0) {
            throw new AiWebsiteApiKeyException();
        }
        return true;
    }
};
exports.ApiKeyGuard = ApiKeyGuard;
exports.ApiKeyGuard = ApiKeyGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provider_keys_service_1.ProviderKeysService])
], ApiKeyGuard);
//# sourceMappingURL=api-key.guard.js.map