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
var SandboxLifecycleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxLifecycleService = void 0;
const common_1 = require("@nestjs/common");
const e2b_service_1 = require("../../lib/e2b.service");
const entitlements_service_1 = require("../billing/entitlements.service");
const env_1 = require("../../config/env");
const CHECK_INTERVAL_MS = 30 * 1000;
const RENEWAL_WINDOW_MS = 10 * 60 * 1000;
const DEAD_THRESHOLD_MS = 10 * 60 * 1000;
const RENEWING_STALE_MS = 15 * 60 * 1000;
let SandboxLifecycleService = SandboxLifecycleService_1 = class SandboxLifecycleService {
    constructor(e2b, entitlements) {
        this.e2b = e2b;
        this.entitlements = entitlements;
        this.logger = new common_1.Logger(SandboxLifecycleService_1.name);
        this.interval = null;
    }
    onModuleInit() {
        this.interval = setInterval(() => {
            void this.checkRenewals();
        }, CHECK_INTERVAL_MS);
    }
    onModuleDestroy() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    async checkRenewals() {
        if (!this.e2b.configured)
            return;
        const now = Date.now();
        const entries = await this.e2b.getSandboxInfos();
        for (const { sandboxId, endAt: endAtStr, renewing, renewingSince, userId } of entries) {
            if (renewing && renewingSince && now - renewingSince < RENEWING_STALE_MS)
                continue;
            const endAt = new Date(endAtStr).getTime();
            const expiresIn = endAt - now;
            if (expiresIn <= RENEWAL_WINDOW_MS) {
                if (expiresIn < -DEAD_THRESHOLD_MS) {
                    this.logger.warn(`Sandbox ${sandboxId} expired ${-expiresIn}ms ago; purging from tracking`);
                    await this.e2b.removeSandboxInfo(sandboxId);
                    continue;
                }
                const lastSeen = await this.e2b.getSandboxLastSeen(sandboxId);
                if (lastSeen === null || now - lastSeen > (0, env_1.env)().sandboxLivenessGraceMs) {
                    this.logger.warn(`Sandbox ${sandboxId} not renewed: no live session within ${(0, env_1.env)().sandboxLivenessGraceMs}ms grace; killing it`);
                    try {
                        await this.e2b.kill(sandboxId);
                    }
                    catch (e) {
                        this.logger.warn(`Failed to kill stale sandbox ${sandboxId}: ${e instanceof Error ? e.message : String(e)}`);
                    }
                    continue;
                }
                if (userId) {
                    try {
                        const remaining = await this.entitlements.sandboxSecondsRemaining(userId);
                        if (remaining <= 0) {
                            this.logger.warn(`Sandbox ${sandboxId} not renewed: monthly sandbox hours exhausted for user ${userId}`);
                            continue;
                        }
                    }
                    catch (e) {
                        this.logger.warn(`Could not check sandbox quota for ${sandboxId}: ${e instanceof Error ? e.message : String(e)}`);
                    }
                }
                this.logger.log(`Auto-renewing sandbox ${sandboxId} (expires in ${expiresIn}ms)`);
                await this.e2b.setRenewing(sandboxId, true);
                this.e2b
                    .renewSandbox(sandboxId)
                    .then((data) => {
                    this.logger.log(`Auto-renewed sandbox ${sandboxId} -> ${data.sandboxId} (${data.filesMigrated} files)`);
                })
                    .catch(async (err) => {
                    const msg = err instanceof Error ? err.message : String(err);
                    const isGone = err instanceof e2b_service_1.SandboxNotFoundError ||
                        err instanceof e2b_service_1.SandboxGoneError ||
                        /sandbox_not_found|sandbox_gone|_not_found|not found|gone|not running/i.test(msg);
                    if (isGone) {
                        this.logger.warn(`Auto-renewal found dead sandbox ${sandboxId}; purging it from tracking`);
                        await this.e2b.removeSandboxInfo(sandboxId);
                    }
                    else {
                        this.logger.error(`Auto-renewal failed for ${sandboxId}: ${msg}`);
                    }
                })
                    .finally(async () => {
                    await this.e2b.setRenewing(sandboxId, false);
                });
            }
        }
    }
};
exports.SandboxLifecycleService = SandboxLifecycleService;
exports.SandboxLifecycleService = SandboxLifecycleService = SandboxLifecycleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [e2b_service_1.E2BService,
        entitlements_service_1.EntitlementsService])
], SandboxLifecycleService);
//# sourceMappingURL=sandbox-lifecycle.service.js.map