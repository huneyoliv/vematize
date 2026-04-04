import { IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  activeGateway?: string;

  @IsOptional()
  @IsString()
  preferredPixGateway?: string;

  @IsOptional()
  @IsString()
  preferredCardGateway?: string;

  @IsOptional()
  mercadopagoConfig?: Record<string, any>;

  @IsOptional()
  efiConfig?: Record<string, any>;

  @IsOptional()
  pushinpayConfig?: Record<string, any>;
}
