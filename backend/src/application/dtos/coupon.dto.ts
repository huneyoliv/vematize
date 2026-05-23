import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, Min, Max, Matches } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @IsEnum(['percentage', 'fixed_amount', 'free_days'])
  type: 'percentage' | 'fixed_amount' | 'free_days';

  @IsNumber()
  @Min(0.01)
  value: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  maxUses?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  limitToOneUsePerUser?: boolean;

  @IsOptional()
  @IsArray()
  applicableProducts?: string[];

  @IsOptional()
  @IsEnum(['once', 'repeating', 'forever'])
  durationType?: string;

  @IsOptional()
  @IsNumber()
  durationMonths?: number;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/)
  code?: string;

  @IsOptional()
  @IsEnum(['percentage', 'fixed_amount', 'free_days'])
  type?: 'percentage' | 'fixed_amount' | 'free_days';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  value?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  maxUses?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  limitToOneUsePerUser?: boolean;

  @IsOptional()
  @IsArray()
  applicableProducts?: string[];

  @IsOptional()
  @IsEnum(['once', 'repeating', 'forever'])
  durationType?: string;

  @IsOptional()
  @IsNumber()
  durationMonths?: number;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
