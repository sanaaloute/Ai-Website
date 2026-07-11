import { PaginationQueryDto } from './pagination-query.dto';
export declare const SUBSCRIPTION_PLANS: readonly ["Basic", "Pro", "Enterprise"];
export declare const SUBSCRIPTION_STATUSES: readonly ["Active", "Canceled", "Past Due"];
export declare class SubscriptionListQueryDto extends PaginationQueryDto {
    plan?: string;
    status?: string;
}
