export class Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: 'product' | 'subscription';
  durationDays?: number;
  isTelegramGroupAccess?: boolean;
  telegramGroupId?: string | null;
  discordSubscriptionRoleId?: string | null;
  productSubtype?: 'standard' | 'digital_file' | 'activation_codes' | 'media_pack';
  stock?: number;
  activationCodes?: string[];
  activationCodesUsed?: string[];
  hostedFileUrl?: string;
  mediaUrls?: string[];
  discountPrice?: number;
  offerExpiresAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}
