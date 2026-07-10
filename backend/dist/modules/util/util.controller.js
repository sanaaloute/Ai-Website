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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UtilController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilController = void 0;
const common_1 = require("@nestjs/common");
let UtilController = UtilController_1 = class UtilController {
    constructor() {
        this.logger = new common_1.Logger(UtilController_1.name);
    }
    async screenshot(url, res) {
        if (!url) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ success: false, error: 'url query param required' });
        }
        try {
            const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&screenshot=true`;
            const pagespeed = await fetch(apiUrl);
            const json = await pagespeed.json();
            const screenshotB64 = json?.lighthouseResult?.fullPageScreenshot?.screenshot?.data ?? '';
            if (!screenshotB64) {
                return res.status(common_1.HttpStatus.NOT_FOUND).json({ success: false, error: 'Screenshot unavailable' });
            }
            const buffer = Buffer.from(screenshotB64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            res.setHeader('Content-Type', 'image/png');
            res.send(buffer);
        }
        catch (err) {
            this.logger.error(`screenshot error: ${err instanceof Error ? err.message : String(err)}`);
            res.status(common_1.HttpStatus.NOT_FOUND).json({ success: false, error: 'Screenshot unavailable' });
        }
    }
    search() {
        return {
            results: [],
            message: 'URL search is disabled. Use the AI agent instead.',
        };
    }
};
exports.UtilController = UtilController;
__decorate([
    (0, common_1.Get)('screenshot'),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UtilController.prototype, "screenshot", null);
__decorate([
    (0, common_1.Post)('search'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UtilController.prototype, "search", null);
exports.UtilController = UtilController = UtilController_1 = __decorate([
    (0, common_1.Controller)('api')
], UtilController);
//# sourceMappingURL=util.controller.js.map