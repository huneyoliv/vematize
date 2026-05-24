export const MOCK_DASHBOARD = {
  totalUsers: 127,
  activeUsers: 89,
  totalProducts: 6,
  totalSales: 56,
  approvedSales: 43,
};

export const MOCK_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'VIP Mensal — Telegram',
    price: 29.90,
    type: 'subscription',
    productSubtype: 'standard',
    stock: null,
    description: 'Acesso ao grupo VIP por 30 dias',
    durationDays: 30,
    telegramGroupId: '-1001234567890',
    isTelegramGroupAccess: true,
    discordSubscriptionRoleId: null,
    activationCodes: [],
    activationCodesUsed: [],
    createdAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'prod-002',
    name: 'VIP Mensal — Discord',
    price: 19.90,
    type: 'subscription',
    productSubtype: 'standard',
    stock: null,
    description: 'Cargo VIP no servidor por 30 dias',
    durationDays: 30,
    telegramGroupId: null,
    isTelegramGroupAccess: false,
    discordSubscriptionRoleId: '987654321098765432',
    activationCodes: [],
    activationCodesUsed: [],
    createdAt: '2024-11-05T14:00:00Z',
  },
  {
    id: 'prod-003',
    name: 'Pack de Chaves Steam',
    price: 49.90,
    type: 'product',
    productSubtype: 'activation_codes',
    stock: 12,
    description: 'Chaves de ativação Steam',
    durationDays: null,
    telegramGroupId: null,
    isTelegramGroupAccess: false,
    discordSubscriptionRoleId: null,
    activationCodes: ['KEY-AAAA-BBBB', 'KEY-CCCC-DDDD'],
    activationCodesUsed: ['KEY-EEEE-FFFF'],
    createdAt: '2024-11-10T09:00:00Z',
  },
  {
    id: 'prod-004',
    name: 'E-book Estratégias',
    price: 9.90,
    type: 'product',
    productSubtype: 'standard',
    stock: null,
    description: 'Entrega manual via mensagem',
    durationDays: null,
    telegramGroupId: null,
    isTelegramGroupAccess: false,
    discordSubscriptionRoleId: null,
    activationCodes: [],
    activationCodesUsed: [],
    createdAt: '2024-11-15T11:00:00Z',
  },
];

export const MOCK_SALES = [
  { id: 'sale-001', productId: 'prod-001', userId: 'user-001', status: 'approved', paymentGateway: 'mercadopago', quantity: 1, totalPrice: 29.90, couponCode: null, telegramChatId: 123456789, discordThreadId: null, createdAt: '2025-01-15T14:22:00Z' },
  { id: 'sale-002', productId: 'prod-002', userId: 'user-002', status: 'approved', paymentGateway: 'efi', quantity: 1, totalPrice: 19.90, couponCode: 'DESCONTO10', telegramChatId: null, discordThreadId: '1234567890123456789', createdAt: '2025-01-14T10:05:00Z' },
  { id: 'sale-003', productId: 'prod-003', userId: 'user-003', status: 'pending', paymentGateway: 'mercadopago', quantity: 1, totalPrice: 49.90, couponCode: null, telegramChatId: 987654321, discordThreadId: null, createdAt: '2025-01-14T09:30:00Z' },
  { id: 'sale-004', productId: 'prod-004', userId: 'user-004', status: 'approved', paymentGateway: 'efi', quantity: 1, totalPrice: 9.90, couponCode: null, telegramChatId: 111222333, discordThreadId: null, createdAt: '2025-01-13T18:00:00Z' },
  { id: 'sale-005', productId: 'prod-001', userId: 'user-005', status: 'failed', paymentGateway: 'mercadopago', quantity: 1, totalPrice: 29.90, couponCode: null, telegramChatId: null, discordThreadId: '9876543210987654321', createdAt: '2025-01-13T12:00:00Z' },
  { id: 'sale-006', productId: 'prod-002', userId: 'user-006', status: 'approved', paymentGateway: 'efi', quantity: 1, totalPrice: 19.90, couponCode: 'FRETE20', telegramChatId: null, discordThreadId: '1111222233334444555', createdAt: '2025-01-12T16:45:00Z' },
  { id: 'sale-007', productId: 'prod-003', userId: 'user-007', status: 'approved', paymentGateway: 'mercadopago', quantity: 1, totalPrice: 49.90, couponCode: null, telegramChatId: 444555666, discordThreadId: null, createdAt: '2025-01-12T11:20:00Z' },
  { id: 'sale-008', productId: 'prod-001', userId: 'user-008', status: 'approved', paymentGateway: 'mercadopago', quantity: 1, totalPrice: 29.90, couponCode: null, telegramChatId: 777888999, discordThreadId: null, createdAt: '2025-01-11T08:00:00Z' },
];

export const MOCK_USERS = [
  { id: 'user-001', name: 'Carlos Mendes', email: '', username: 'carlos_mendes', state: 'active', plan: 'vip', telegramId: 123456789, discordId: '', createdAt: '2024-12-01T10:00:00Z' },
  { id: 'user-002', name: 'Ana Souza', email: '', username: 'ana_souza', state: 'active', plan: 'vip', telegramId: 0, discordId: '111111111111111111', createdAt: '2024-12-03T14:00:00Z' },
  { id: 'user-003', name: 'Pedro Costa', email: '', username: 'pedro_costa', state: 'expired', plan: 'vip', telegramId: 987654321, discordId: '', createdAt: '2024-12-05T09:00:00Z' },
  { id: 'user-004', name: 'Maria Lima', email: '', username: 'maria_lima', state: 'active', plan: 'free', telegramId: 111222333, discordId: '', createdAt: '2024-12-10T11:00:00Z' },
  { id: 'user-005', name: 'João Ferreira', email: '', username: 'joao_ferreira', state: 'inactive', plan: 'free', telegramId: 0, discordId: '222222222222222222', createdAt: '2024-12-15T16:00:00Z' },
  { id: 'user-006', name: 'Luísa Martins', email: '', username: 'luisa_martins', state: 'active', plan: 'vip', telegramId: 0, discordId: '333333333333333333', createdAt: '2024-12-20T13:00:00Z' },
  { id: 'user-007', name: 'Rafael Alves', email: '', username: 'rafael_alves', state: 'active', plan: 'vip', telegramId: 444555666, discordId: '', createdAt: '2025-01-02T10:00:00Z' },
  { id: 'user-008', name: 'Camila Rocha', email: '', username: 'camila_rocha', state: 'expired', plan: 'vip', telegramId: 777888999, discordId: '', createdAt: '2025-01-05T15:00:00Z' },
];

export const MOCK_COUPONS = [
  { id: 'coup-001', code: 'DESCONTO10', type: 'percentage', value: 10, isActive: true, currentUses: 23, maxUses: 100, expiresAt: null },
  { id: 'coup-002', code: 'FRETE20', type: 'fixed_amount', value: 20, isActive: true, currentUses: 8, maxUses: 50, expiresAt: '2025-06-30T23:59:59Z' },
  { id: 'coup-003', code: 'TRIAL7', type: 'free_days', value: 7, isActive: false, currentUses: 15, maxUses: 15, expiresAt: null },
];

export const MOCK_BOTS = [
  { platform: 'telegram', botToken: 'mock-token-telegram-123456:ABC', clientId: null, publicKey: null },
];

export const MOCK_BOT_TELEGRAM = {
  id: 'bot-tg-001',
  platform: 'telegram',
  botToken: 'mock-token-telegram-123456:ABC',
  clientId: null,
  publicKey: null,
  interactionsToken: null,
  flows: [
    {
      id: 'flow-001',
      trigger: 'start',
      steps: [
        { type: 'message', content: 'Olá! Bem-vindo ao bot. Use /produtos para ver o catálogo.' },
      ],
    },
  ],
  deliveryMessage: 'Sua compra foi aprovada! Aqui está o seu acesso: {access}',
  inactiveSubscriptionMessage: 'Sua assinatura expirou. Renove em /renovar.',
  discordDeliveryType: null,
  discordDeliveryRoleId: null,
  discordNotifyRoleId: null,
  discordCartCategoryId: null,
  discordSalesLogChannelId: null,
  discordCouponsEnabled: null,
  discordSupportRoleId: null,
  discordThreadArchiveMinutes: null,
  discordPanels: [],
};

export const MOCK_BOT_DISCORD = {
  id: 'bot-dc-001',
  platform: 'discord',
  botToken: '',
  clientId: '',
  publicKey: '',
  interactionsToken: '',
  flows: [],
  deliveryMessage: '',
  inactiveSubscriptionMessage: '',
  discordDeliveryType: 'automatic',
  discordDeliveryRoleId: '',
  discordNotifyRoleId: '',
  discordCartCategoryId: '',
  discordSalesLogChannelId: '',
  discordCouponsEnabled: true,
  discordSupportRoleId: '',
  discordThreadArchiveMinutes: 1440,
  discordPanels: [],
};

export const MOCK_SETTINGS = {
  logoUrl: '',
  activeGateway: 'mercadopago',
  mercadopagoConfig: { mode: 'production', production_access_token: 'APP_USR-mock-token' },
  efiConfig: { mode: 'production' },
};

export const MOCK_GALLERY = [
  { id: 'img-001', url: 'https://placehold.co/400x300/1a1a2e/7c3aed?text=Banner+VIP', name: 'banner-vip.jpg', createdAt: '2025-01-10T10:00:00Z' },
  { id: 'img-002', url: 'https://placehold.co/400x300/1a1a2e/10b981?text=Promo+Mensal', name: 'promo-mensal.jpg', createdAt: '2025-01-12T14:00:00Z' },
  { id: 'img-003', url: 'https://placehold.co/400x300/1a1a2e/f59e0b?text=Logo+Bot', name: 'logo-bot.png', createdAt: '2025-01-14T09:00:00Z' },
];
