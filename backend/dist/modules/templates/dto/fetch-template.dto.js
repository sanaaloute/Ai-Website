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
exports.FetchTemplateDto = void 0;
const class_validator_1 = require("class-validator");
class FetchTemplateDto {
}
exports.FetchTemplateDto = FetchTemplateDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-z0-9_-]+$/, {
        message: 'category must be a lowercase slug (a-z, 0-9, _ and -)',
    }),
    __metadata("design:type", String)
], FetchTemplateDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_.-]+$/, {
        message: 'template must be a directory name or catalog id',
    }),
    __metadata("design:type", String)
], FetchTemplateDto.prototype, "template", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['auto', 'local', 'github']),
    __metadata("design:type", String)
], FetchTemplateDto.prototype, "source", void 0);
//# sourceMappingURL=fetch-template.dto.js.map