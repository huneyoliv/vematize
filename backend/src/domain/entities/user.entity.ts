export class User {
  id: string;
  telegramId?: number;
  whatsappId?: string;
  discordId?: string;
  name?: string;
  email?: string;
  username?: string;
  password?: string;
  state: 'active' | 'inactive' | 'expired';
  plan?: string;
  createdAt: Date;
  updatedAt?: Date;
  interactionState?: string;
  interactionData?: Record<string, any>;
}
