"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.E2BModule = void 0;
const common_1 = require("@nestjs/common");
const e2b_controller_1 = require("./e2b.controller");
const e2b_service_1 = require("./e2b.service");
let E2BModule = class E2BModule {
};
exports.E2BModule = E2BModule;
exports.E2BModule = E2BModule = __decorate([
    (0, common_1.Module)({
        controllers: [e2b_controller_1.E2BController],
        providers: [e2b_service_1.E2BManagerService],
    })
], E2BModule);
//# sourceMappingURL=e2b.module.js.map