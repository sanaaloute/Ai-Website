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
var IntegrationTokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationTokenService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const encryption_service_1 = require("./encryption.service");
let IntegrationTokenService = IntegrationTokenService_1 = class IntegrationTokenService {
    constructor(prisma, encryption) {
        this.prisma = prisma;
        this.encryption = encryption;
        this.logger = new common_1.Logger(IntegrationTokenService_1.name);
    }
    async upsert(userId, provider, accessToken, refreshToken, expiresAt) {
        try {
            await this.prisma.user_integrations.upsert({
                where: { user_id_provider: { user_id: userId, provider } },
                update: {
                    access_token: this.encryption.encrypt(accessToken),
                    refresh_token: refreshToken ? this.encryption.encrypt(refreshToken) : null,
                    expires_at: expiresAt ?? null,
                },
                create: {
                    user_id: userId,
                    provider,
                    access_token: this.encryption.encrypt(accessToken),
                    refresh_token: refreshToken ? this.encryption.encrypt(refreshToken) : null,
                    expires_at: expiresAt ?? null,
                },
            });
        }
        catch (err) {
            this.logger.error(`Failed to store ${provider} tokens for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async get(userId, provider) {
        try {
            const record = await this.prisma.user_integrations.findUnique({
                where: { user_id_provider: { user_id: userId, provider } },
            });
            if (!record)
                return null;
            const accessToken = this.encryption.decrypt(record.access_token);
            if (!accessToken)
                return null;
            return {
                accessToken,
                refreshToken: record.refresh_token ? this.encryption.decrypt(record.refresh_token) ?? undefined : undefined,
            };
        }
        catch (err) {
            this.logger.error(`Failed to load ${provider} tokens for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
    async delete(userId, provider) {
        try {
            await this.prisma.user_integrations.deleteMany({
                where: { user_id: userId, provider },
            });
        }
        catch (err) {
            this.logger.error(`Failed to delete ${provider} tokens for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
};
exports.IntegrationTokenService = IntegrationTokenService;
exports.IntegrationTokenService = IntegrationTokenService = IntegrationTokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService])
], IntegrationTokenService);
//# sourceMappingURL=integration-token.service.js.map