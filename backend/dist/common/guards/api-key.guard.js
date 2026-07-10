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
exports.ApiKeyGuard = exports.LoveCodeApiKeyException = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../lib/supabase.service");
const env_1 = require("../../config/env");
class LoveCodeApiKeyException extends common_1.HttpException {
    constructor() {
        super({
            success: false,
            error: `Missing LoveCode API key. Get one at ${(0, env_1.env)().lovecodeApiKeySiteUrl}`,
        }, common_1.HttpStatus.PAYMENT_REQUIRED);
    }
}
exports.LoveCodeApiKeyException = LoveCodeApiKeyException;
let ApiKeyGuard = class ApiKeyGuard {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const userId = req.user?.id;
        if (!userId) {
            throw new common_1.HttpException({ success: false, error: 'Unauthorized' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        const { data, error } = await this.supabase.admin
            .from('users')
            .select('lovecode_api_key')
            .eq('id', userId)
            .single();
        if (error) {
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (!data?.lovecode_api_key) {
            throw new LoveCodeApiKeyException();
        }
        return true;
    }
};
exports.ApiKeyGuard = ApiKeyGuard;
exports.ApiKeyGuard = ApiKeyGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ApiKeyGuard);
//# sourceMappingURL=api-key.guard.js.map