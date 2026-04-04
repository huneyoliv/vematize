import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEnum(['active', 'blocked', 'inactive'])
  state?: string;

  @IsOptional()
  @IsString()
  plan?: string;
}
