import { IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  new_password: string;
}
