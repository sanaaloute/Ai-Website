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
var EncryptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
let EncryptionService = EncryptionService_1 = class EncryptionService {
    constructor() {
        this.logger = new common_1.Logger(EncryptionService_1.name);
        const raw = (0, env_1.env)().tokenEncryptionKey;
        if (raw) {
            let buf = Buffer.from(raw, 'base64');
            if (buf.length !== 32) {
                buf = Buffer.from(raw, 'hex');
            }
            if (buf.length !== 32) {
                buf = (0, crypto_1.createHash)('sha256').update(raw).digest();
            }
            this.key = buf;
        }
        else {
            this.logger.warn('TOKEN_ENCRYPTION_KEY is not set; falling back to a key derived from ADMIN_JWT_SECRET. ' +
                'Set a dedicated TOKEN_ENCRYPTION_KEY in production.');
            this.key = (0, crypto_1.createHash)('sha256').update((0, env_1.env)().adminJwtSecret).digest();
        }
    }
    encrypt(plainText) {
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', this.key, iv);
        const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]).toString('base64');
    }
    decrypt(cipherText) {
        try {
            const data = Buffer.from(cipherText, 'base64');
            const iv = data.subarray(0, 16);
            const authTag = data.subarray(16, 32);
            const encrypted = data.subarray(32);
            const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', this.key, iv);
            decipher.setAuthTag(authTag);
            return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
        }
        catch (err) {
            this.logger.warn(`Token decryption failed: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = EncryptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EncryptionService);
//# sourceMappingURL=encryption.service.js.map