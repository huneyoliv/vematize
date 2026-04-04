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

export interface BotFlow {
  id: string;
  name: string;
  trigger: string;
  startStepId: string | null;
  steps: BotStep[];
}

export class BotConfig {
  id: string;
  platform: 'telegram' | 'discord';
  botToken?: string;
  clientId?: string;
  publicKey?: string;
  flows: BotFlow[];
  inactiveSubscriptionMessage?: string;
  deliveryMessage?: string;
  discordDeliveryType?: 'automatic' | 'manual_role' | 'manual_notify';
  discordDeliveryRoleId?: string;
  discordNotifyRoleId?: string;
  discordCartCategoryId?: string;
  discordSalesLogChannelId?: string;
  discordPanels?: any[];
  discordCouponsEnabled?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
