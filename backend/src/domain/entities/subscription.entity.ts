export class Subscription {
  id: string;
  userId: string;
  productId: string;
  saleId: string;
  platform: 'telegram' | 'discord';
  status: 'active' | 'expired' | 'cancelled';
  startsAt: Date;
  expiresAt: Date;
  // Telegram
  telegramChatId?: number;
  telegramGroupId?: string;
  // Discord
  discordUserId?: string;
  discordGuildId?: string;
  discordRoleId?: string; // snapshot do roleId no momento da ativação
  // Controle de alertas
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}
