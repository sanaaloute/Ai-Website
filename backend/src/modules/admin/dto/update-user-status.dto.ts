import { IsIn, IsString } from 'class-validator';

export const USER_STATUSES = ['Active', 'Inactive', 'Suspended'] as const;

export class UpdateUserStatusDto {
  @IsString()
  @IsIn(USER_STATUSES)
  status: (typeof USER_STATUSES)[number];
}
