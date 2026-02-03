import { ObjectId } from 'mongodb';

export interface Tenant {
  _id: ObjectId;
  username: string;
  discordInteractionsToken?: string;
  connections?: {
    discord?: {
      botToken?: string;
      publicKey?: string;
    };
    telegram?: {
      botToken?: string;
    };
  };
  subscriptionEndsAt?: Date;
  planId?: ObjectId;
  [key: string]: any;
}



export interface Sale {
  _id?: ObjectId;
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
  webhookVerified?: boolean;
  providerVerified?: boolean;
  paymentDetails?: {
    init_point?: string;
    preferenceId?: string;
    qrCode?: string;
    qrCodeBase64?: string;
    paymentId?: string; // Changed to string to match MP ID
    ticketUrl?: string;
    sessionId?: string;
  };
}

export interface BotAction {
  type: 'GO_TO_STEP' | 'LINK_TO_PRODUCT' | 'MAIN_MENU' | 'SHOW_PROFILE';
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

export interface Product {
  _id: ObjectId;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  paymentMethods?: {
    pix?: string;
    credit_card?: string;
  };
  type: 'product' | 'subscription';
  durationDays?: number;
  isTelegramGroupAccess?: boolean;
  telegramGroupId?: string;
  productSubtype?: 'standard' | 'digital_file' | 'activation_codes' | 'media_pack';
  stock?: number;
  activationCodes?: string;
  hostedFileUrl?: string;
  mediaUrls?: string[]; // Array of strings for media pack
  discountPrice?: number;
  offerExpiresAt?: string;
  [key: string]: any;
}

export interface Purchase {
  _id?: ObjectId;
  purchaseDate: string;
  productName: string;
  type: 'product' | 'subscription';
  expiresAt?: string;
  [key: string]: any;
}

export interface User {
  _id: ObjectId;
  telegramId: number;
  tenantId: string;
  name?: string;
  username?: string;
  purchases?: Purchase[];
  interactionState?: string;
  interactionData?: any;
  [key: string]: any;
}

export interface Coupon {
  _id: ObjectId;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_days';
  value: number;
  description?: string;
  maxUses?: number;
  currentUses: number;
  expiresAt?: string;
  isActive: boolean;
  tenantId: string;
  applicableProducts?: string[];
  [key: string]: any;
}
