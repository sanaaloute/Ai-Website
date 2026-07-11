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
exports.DeployService = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../../config/env");
const vercel_service_1 = require("../vercel.service");
const docker_runner_1 = require("./docker.runner");
const coolify_runner_1 = require("./coolify.runner");
let DeployService = class DeployService {
    constructor(vercel, docker, coolify) {
        this.vercel = vercel;
        this.docker = docker;
        this.coolify = coolify;
    }
    get activeProvider() {
        return (0, env_1.env)().deployProvider;
    }
    get configured() {
        return this.provider().configured;
    }
    async checkDomain(domain) {
        return this.provider().checkDomain(domain);
    }
    async deploy(params) {
        return this.provider().deploy(params);
    }
    async status(deploymentUuid, appUuid) {
        return this.provider().status(deploymentUuid, appUuid);
    }
    provider() {
        switch ((0, env_1.env)().deployProvider) {
            case 'docker':
                return this.docker;
            case 'coolify':
                return this.coolify;
            case 'vercel':
            default:
                return this.vercel;
        }
    }
};
exports.DeployService = DeployService;
exports.DeployService = DeployService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [vercel_service_1.VercelService,
        docker_runner_1.DockerDeployRunner,
        coolify_runner_1.CoolifyDeployRunner])
], DeployService);
//# sourceMappingURL=deploy.service.js.map