import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';
import { USER_STATUSES } from './update-user-status.dto';

export class UserListQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsIn(USER_STATUSES)
  @IsOptional()
  status?: string;
}
