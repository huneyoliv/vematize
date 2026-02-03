import type { ObjectId } from 'mongodb';
import { z } from 'zod';
import { BotConfigSchema } from './schemas';

export interface User {
  _id: ObjectId;
  tenantId: string;
  telegramId?: number;
  whatsappId?: string;
  discordId?: string;
  name?: string;
  email?: string;
  username?: string;
  password?: string;
  state?: 'active' | 'inactive' | 'expired';
  plan?: string;
  purchases?: Purchase[];
  createdAt: Date;
  updatedAt?: Date;
  interactionState?: string;
  interactionData?: any;
}

export interface Purchase {
  purchaseId: string;
  productId: string;
  productName: string;
  purchaseDate: Date;
  type: 'product' | 'subscription';
  status: 'approved' | 'pending' | 'failed' | 'refunded' | 'expired';
  expiresAt?: Date;
  lastNotified?: Date;
}

export type BotActionType = 'GO_TO_STEP' | 'LINK_TO_PRODUCT' | 'MAIN_MENU' | 'SHOW_PROFILE';

export interface BotAction {
  type: BotActionType;
  payload?: string;
}

export interface BotButton {
  id: string;
  text: string;
  action: BotAction;
}

export interface BotStep {
  id: string;
  name: string;
  message: string;
  buttons: BotButton[];
}

export type BotConfig = z.infer<typeof BotConfigSchema>;

export interface Tenant {
  _id: ObjectId;
  ownerName: string;
  subdomain: string;
  ownerEmail: string;
  emailVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  passwordHash: string;
  cpfCnpj: string;
  trialEndsAt?: string;
  planId?: string;
  subscriptionProvider?: 'mercadopago';
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'trialing' | 'canceled';
  subscriptionEndsAt?: string;
  connections?: {
    whatsapp?: {
      evolutionApiUrl?: string;
      evolutionApiKey?: string;
      evolutionApiInstance?: string;
    };
    instagram?: {
      pageId: string;
      accessToken: string;
    };
    telegram?: {
      botToken: string;
    };
    discord?: {
      botToken: string;
      clientId: string;
      publicKey?: string;
    };
  };
  botConfig?: BotConfig;
  discordSettings?: z.infer<typeof import('./schemas').DiscordSettingsSchema>;
  webhooks?: {
    untrusted?: boolean; // Marcado como true quando webhook não tem secret configurado
    lastUntrustedAlert?: Date; // Última vez que alerta foi mostrado
  };
  paymentIntegrations?: PaymentIntegrations;
}

export interface SaasPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
  allowedPlatforms?: string[]; // ['telegram', 'discord', 'whatsapp', 'instagram']
  efiPlanId?: string;
}

export interface ProductPaymentMethods {
  pix?: string;
  credit_card?: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  paymentMethods?: ProductPaymentMethods;
  type: 'product' | 'subscription';

  durationDays?: number | null;
  isTelegramGroupAccess?: boolean;
  telegramGroupId?: string | null;

  productSubtype?: 'standard' | 'digital_file' | 'activation_codes' | 'media_pack';
  stock?: number | null;
  activationCodes?: string[];
  activationCodesUsed?: string[];
  hostedFileUrl?: string | null;
  mediaUrls?: string[];

  discountPrice?: number | null;
  offerExpiresAt?: string | null;
}

export interface Sale {
  _id: ObjectId;
  tenantId: string;
  productId: string;
  userId: string;
  telegramChatId?: number;
  telegramMessageId?: number;
  discordChannelId?: string;
  discordMessageId?: string;
  discordThreadId?: string;
  quantity?: number;
  couponCode?: string;
  status: 'pending' | 'approved' | 'failed' | 'refunded' | 'cancelled';
  paymentGateway: string;
  createdAt: Date;
  updatedAt?: Date;
  webhookVerified?: boolean; // true se webhook foi verificado com assinatura
  providerVerified?: boolean; // true se status foi verificado diretamente com o provedor
  paymentDetails?: {
    init_point?: string;
    preferenceId?: string;
    qrCode?: string;
    qrCodeBase64?: string;
    paymentId?: string;
  };
}

export interface MercadoPagoSettings {
  mode: 'sandbox' | 'production';
  sandbox_public_key?: string;
  sandbox_access_token?: string;
  sandbox_webhook_secret?: string;
  production_public_key?: string;
  production_access_token?: string;
  production_webhook_secret?: string;
  webhook_secret?: string;
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
}

export interface PushinPaySettings {
  mode: 'sandbox' | 'production';
  sandbox_api_key?: string;
  sandbox_api_secret?: string;
  sandbox_webhook_secret?: string;
  production_api_key?: string;
  production_api_secret?: string;
  production_webhook_secret?: string;
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
}

export interface StripeSettings {
  mode: 'test' | 'live';
  test_publishable_key?: string;
  test_secret_key?: string;
  test_webhook_secret?: string;
  live_publishable_key?: string;
  live_secret_key?: string;
  live_webhook_secret?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface EfiSettings {
  mode: 'sandbox' | 'production';
  sandbox_client_id?: string;
  sandbox_client_secret?: string;
  sandbox_webhook_secret?: string;
  production_client_id?: string;
  production_client_secret?: string;
  production_webhook_secret?: string;
  pix_key?: string;
  certificate?: string;
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
}

export interface PaymentIntegrations {
  mercadopago?: MercadoPagoSettings;
  pushinpay?: PushinPaySettings;
  stripe?: StripeSettings;
  efi?: EfiSettings;
}

export interface KrovSettings {
  paymentIntegrations?: PaymentIntegrations;
  logoUrl?: string;
  preferredPixGateway?: 'mercadopago' | 'efi' | 'pushinpay';
  preferredCardGateway?: 'mercadopago' | 'efi' | 'stripe';
}

export type Coupon = z.infer<typeof import('./schemas').CouponSchema>;

export interface Upload {
  _id: ObjectId;
  tenantId: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  context: 'media_pack' | 'logo' | 'message_attachment' | 'digital_file' | 'other';
  createdAt: Date;
}

export interface LegalDocument {
  _id: ObjectId;
  type: 'terms_of_service' | 'privacy_policy';
  content: string;
  version: number;
  effectiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
}


