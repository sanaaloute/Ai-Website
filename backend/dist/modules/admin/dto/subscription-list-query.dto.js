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
exports.SubscriptionListQueryDto = exports.SUBSCRIPTION_STATUSES = exports.SUBSCRIPTION_PLANS = void 0;
const class_validator_1 = require("class-validator");
const pagination_query_dto_1 = require("./pagination-query.dto");
exports.SUBSCRIPTION_PLANS = ['Basic', 'Pro', 'Enterprise'];
exports.SUBSCRIPTION_STATUSES = ['Active', 'Canceled', 'Past Due'];
class SubscriptionListQueryDto extends pagination_query_dto_1.PaginationQueryDto {
}
exports.SubscriptionListQueryDto = SubscriptionListQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(exports.SUBSCRIPTION_PLANS),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SubscriptionListQueryDto.prototype, "plan", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(exports.SUBSCRIPTION_STATUSES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SubscriptionListQueryDto.prototype, "status", void 0);
//# sourceMappingURL=subscription-list-query.dto.js.map