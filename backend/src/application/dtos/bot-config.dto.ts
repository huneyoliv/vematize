import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';

export class UpdateBotConfigDto {
  @IsOptional()
  @IsString()
  botToken?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsArray()
  flows?: any[];

  @IsOptional()
  @IsString()
  inactiveSubscriptionMessage?: string;

  @IsOptional()
  @IsString()
  deliveryMessage?: string;

  @IsOptional()
  @IsEnum(['automatic', 'manual_role', 'manual_notify'])
  discordDeliveryType?: string;

  @IsOptional()
  @IsString()
  discordDeliveryRoleId?: string;

  @IsOptional()
  @IsString()
  discordNotifyRoleId?: string;

  @IsOptional()
  @IsString()
  discordCartCategoryId?: string;

  @IsOptional()
  @IsString()
  discordSalesLogChannelId?: string;

  @IsOptional()
  @IsArray()
  discordPanels?: any[];

  @IsOptional()
  @IsBoolean()
  discordCouponsEnabled?: boolean;

  @IsOptional()
  @IsString()
  discordSubscriptionRoleId?: string;

  @IsOptional()
  @IsString()
  discordSupportRoleId?: string;

  @IsOptional()
  discordThreadArchiveMinutes?: number;
}
