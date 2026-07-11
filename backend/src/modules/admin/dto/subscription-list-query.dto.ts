import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export const SUBSCRIPTION_PLANS = ['Basic', 'Pro', 'Enterprise'] as const;
export const SUBSCRIPTION_STATUSES = ['Active', 'Canceled', 'Past Due'] as const;

export class SubscriptionListQueryDto extends PaginationQueryDto {
  @IsString()
  @IsIn(SUBSCRIPTION_PLANS)
  @IsOptional()
  plan?: string;

  @IsString()
  @IsIn(SUBSCRIPTION_STATUSES)
  @IsOptional()
  status?: string;
}
