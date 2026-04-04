import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(['product', 'subscription'])
  type: 'product' | 'subscription';

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  @IsBoolean()
  isTelegramGroupAccess?: boolean;

  @IsOptional()
  @IsString()
  telegramGroupId?: string;

  @IsOptional()
  @IsEnum(['standard', 'digital_file', 'activation_codes', 'media_pack'])
  productSubtype?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsArray()
  activationCodes?: string[];

  @IsOptional()
  @IsString()
  hostedFileUrl?: string;

  @IsOptional()
  @IsArray()
  mediaUrls?: string[];

  @IsOptional()
  @IsNumber()
  discountPrice?: number;

  @IsOptional()
  @IsString()
  offerExpiresAt?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(['product', 'subscription'])
  type?: 'product' | 'subscription';

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  @IsBoolean()
  isTelegramGroupAccess?: boolean;

  @IsOptional()
  @IsString()
  telegramGroupId?: string;

  @IsOptional()
  @IsEnum(['standard', 'digital_file', 'activation_codes', 'media_pack'])
  productSubtype?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsArray()
  activationCodes?: string[];

  @IsOptional()
  @IsString()
  hostedFileUrl?: string;

  @IsOptional()
  @IsArray()
  mediaUrls?: string[];

  @IsOptional()
  @IsNumber()
  discountPrice?: number;

  @IsOptional()
  @IsString()
  offerExpiresAt?: string;
}
