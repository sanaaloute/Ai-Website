import { IsString, MinLength } from 'class-validator';

export class CancelSubscriptionDto {
  @IsString()
  @MinLength(1)
  reason: string;
}
