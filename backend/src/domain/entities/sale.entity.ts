export class Sale {
  id: string;
  productId: string;
  userId: string;
  telegramChatId?: number;
  telegramMessageId?: number;
  discordChannelId?: string;
  discordMessageId?: string;
  discordThreadId?: string;
  quantity: number;
  couponCode?: string;
  status: 'pending' | 'approved' | 'failed' | 'refunded' | 'cancelled';
  paymentGateway: string;
  webhookVerified?: boolean;
  providerVerified?: boolean;
  paymentDetails?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}
