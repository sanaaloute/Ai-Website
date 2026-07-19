"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CoolifyDeployRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoolifyDeployRunner = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../../config/env");
let CoolifyDeployRunner = CoolifyDeployRunner_1 = class CoolifyDeployRunner {
    constructor() {
        this.name = 'coolify';
        this.logger = new common_1.Logger(CoolifyDeployRunner_1.name);
    }
    get configured() {
        return !!(0, env_1.env)().coolifyUrl && !!(0, env_1.env)().coolifyToken;
    }
    async checkDomain(domain) {
        if (!this.configured) {
            return { available: true, message: 'Coolify not configured; domain appears available', conflictProjectName: null };
        }
        this.logger.debug(`coolify.checkDomain(${domain}) — implement against your Coolify API`);
        return { available: true, message: 'Coolify checkDomain not implemented', conflictProjectName: null };
    }
    async deploy(params) {
        const requestId = `coolify-${Date.now()}`;
        if (!this.configured) {
            return {
                ok: false,
                requestId,
                error: 'Coolify deploy is not configured. Set COOLIFY_URL and COOLIFY_TOKEN, ' +
                    'implement CoolifyDeployRunner against your Coolify /api/v1, or use DEPLOY_PROVIDER=docker.',
            };
        }
        this.logger.warn(`coolify.deploy(${params.projectName}) called but not implemented — ` +
            `would deploy ${params.repoUrl} via ${(0, env_1.env)().coolifyUrl}`);
        return {
            ok: false,
            requestId,
            error: 'CoolifyDeployRunner is an extension point and is not implemented yet. ' +
                'Implement it against your Coolify /api/v1 (see SELFHOST.md) or use DEPLOY_PROVIDER=docker.',
        };
    }
    async status(deploymentUuid, appUuid) {
        if (!this.configured) {
            return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
        }
        return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
    }
};
exports.CoolifyDeployRunner = CoolifyDeployRunner;
exports.CoolifyDeployRunner = CoolifyDeployRunner = CoolifyDeployRunner_1 = __decorate([
    (0, common_1.Injectable)()
], CoolifyDeployRunner);
//# sourceMappingURL=coolify.runner.js.map