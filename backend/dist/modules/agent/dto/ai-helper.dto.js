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
exports.FilePlanDto = exports.UiUxBlueprintDto = exports.SummarizeSpecDto = exports.DesignTokensDto = exports.CodePageDto = exports.CodeComponentDto = exports.AnalyzeEditIntentDto = exports.ChatDto = void 0;
const class_validator_1 = require("class-validator");
class ChatDto {
}
exports.ChatDto = ChatDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatDto.prototype, "provider", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatDto.prototype, "prompt", void 0);
class AnalyzeEditIntentDto {
}
exports.AnalyzeEditIntentDto = AnalyzeEditIntentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyzeEditIntentDto.prototype, "prompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], AnalyzeEditIntentDto.prototype, "manifest", void 0);
class CodeComponentDto {
}
exports.CodeComponentDto = CodeComponentDto;
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CodeComponentDto.prototype, "section", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CodeComponentDto.prototype, "tokens", void 0);
class CodePageDto {
}
exports.CodePageDto = CodePageDto;
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CodePageDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CodePageDto.prototype, "sections", void 0);
class DesignTokensDto {
}
exports.DesignTokensDto = DesignTokensDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DesignTokensDto.prototype, "spec", void 0);
class SummarizeSpecDto {
}
exports.SummarizeSpecDto = SummarizeSpecDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SummarizeSpecDto.prototype, "prompt", void 0);
class UiUxBlueprintDto {
}
exports.UiUxBlueprintDto = UiUxBlueprintDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UiUxBlueprintDto.prototype, "spec", void 0);
class FilePlanDto {
}
exports.FilePlanDto = FilePlanDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], FilePlanDto.prototype, "spec", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], FilePlanDto.prototype, "blueprint", void 0);
//# sourceMappingURL=ai-helper.dto.js.map