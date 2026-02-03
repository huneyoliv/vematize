"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponSchema = exports.KrovSettingsSchema = exports.BotConfigSchema = exports.BotFlowSchema = exports.BotStepSchema = exports.BotButtonSchema = exports.BotActionSchema = exports.ProductSchema = exports.ProductPaymentMethodsSchema = exports.PaymentIntegrationsSchema = exports.EfiSettingsSchema = exports.StripeSettingsSchema = exports.PushinPaySettingsSchema = exports.MercadoPagoSettingsSchema = exports.PasswordSchema = void 0;
const zod_1 = require("zod");
exports.PasswordSchema = zod_1.z.string()
    .min(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
    .regex(/[a-z]/, { message: 'A senha deve conter pelo menos uma letra minúscula.' })
    .regex(/[A-Z]/, { message: 'A senha deve conter pelo menos uma letra maiúscula.' })
    .regex(/[0-9]/, { message: 'A senha deve conter pelo menos um número.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'A senha deve conter pelo menos um caractere especial.' });
exports.MercadoPagoSettingsSchema = zod_1.z.object({
    mode: zod_1.z.enum(['sandbox', 'production']).default('sandbox'),
    sandbox_public_key: zod_1.z.string().optional(),
    sandbox_access_token: zod_1.z.string().optional(),
    sandbox_webhook_secret: zod_1.z.string().optional(),
    production_public_key: zod_1.z.string().optional(),
    production_access_token: zod_1.z.string().optional(),
    production_webhook_secret: zod_1.z.string().optional(),
    success_url: zod_1.z.string().url({ message: "URL de sucesso inválida." }).optional().or(zod_1.z.literal('')),
    failure_url: zod_1.z.string().url({ message: "URL de falha inválida." }).optional().or(zod_1.z.literal('')),
    pending_url: zod_1.z.string().url({ message: "URL pendente inválida." }).optional().or(zod_1.z.literal('')),
}).refine(data => {
    if (data.mode === 'production') {
        return !!data.production_public_key && !!data.production_access_token;
    }
    return true;
}, {
    message: "As credenciais de Produção (Public Key e Access Token) são obrigatórias quando o modo de Produção está ativo.",
    path: ["production_public_key"],
});
exports.PushinPaySettingsSchema = zod_1.z.object({
    mode: zod_1.z.enum(['sandbox', 'production']).default('sandbox'),
    sandbox_api_key: zod_1.z.string().optional(),
    sandbox_webhook_secret: zod_1.z.string().optional(),
    production_api_key: zod_1.z.string().optional(),
    production_webhook_secret: zod_1.z.string().optional(),
    success_url: zod_1.z.string().url({ message: "URL de sucesso inválida." }).optional().or(zod_1.z.literal('')),
    failure_url: zod_1.z.string().url({ message: "URL de falha inválida." }).optional().or(zod_1.z.literal('')),
    pending_url: zod_1.z.string().url({ message: "URL pendente inválida." }).optional().or(zod_1.z.literal('')),
}).refine(data => {
    if (data.mode === 'production') {
        return !!data.production_api_key;
    }
    return true;
}, {
    message: "A API Key de produção é obrigatória quando o modo de produção está ativo.",
    path: ["production_api_key"],
});
exports.StripeSettingsSchema = zod_1.z.object({
    mode: zod_1.z.enum(['test', 'live']).default('test'),
    test_publishable_key: zod_1.z.string().optional(),
    test_secret_key: zod_1.z.string().optional(),
    test_webhook_secret: zod_1.z.string().optional(),
    live_publishable_key: zod_1.z.string().optional(),
    live_secret_key: zod_1.z.string().optional(),
    live_webhook_secret: zod_1.z.string().optional(),
    success_url: zod_1.z.string().url({ message: "URL de sucesso inválida." }).optional().or(zod_1.z.literal('')),
    cancel_url: zod_1.z.string().url({ message: "URL de cancelamento inválida." }).optional().or(zod_1.z.literal('')),
}).refine(data => {
    if (data.mode === 'live') {
        return !!data.live_publishable_key && !!data.live_secret_key;
    }
    return true;
}, {
    message: "As chaves de produção (Publishable Key e Secret Key) são obrigatórias quando o modo live está ativo.",
    path: ["live_publishable_key"],
});
exports.EfiSettingsSchema = zod_1.z.object({
    mode: zod_1.z.enum(['sandbox', 'production']).default('sandbox'),
    sandbox_client_id: zod_1.z.string().optional(),
    sandbox_client_secret: zod_1.z.string().optional(),
    production_client_id: zod_1.z.string().optional(),
    production_client_secret: zod_1.z.string().optional(),
    pix_key: zod_1.z.string().optional(),
    certificate: zod_1.z.string().optional(), // Caminho ou conteúdo do certificado .p12
}).refine(data => {
    if (data.mode === 'production') {
        return !!data.production_client_id && !!data.production_client_secret && !!data.certificate;
    }
    return true;
}, {
    message: "Credenciais de produção e certificado são obrigatórios no modo de produção.",
    path: ["production_client_id"],
});
exports.PaymentIntegrationsSchema = zod_1.z.object({
    mercadopago: exports.MercadoPagoSettingsSchema.optional(),
    pushinpay: exports.PushinPaySettingsSchema.optional(),
    stripe: exports.StripeSettingsSchema.optional(),
    efi: exports.EfiSettingsSchema.optional(),
});
exports.ProductPaymentMethodsSchema = zod_1.z.object({
    pix: zod_1.z.string().optional(),
    credit_card: zod_1.z.string().optional(),
});
exports.ProductSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(3, { message: 'O nome do produto deve ter pelo menos 3 caracteres.' }),
    description: zod_1.z.string().max(280, { message: "A descrição não pode ter mais de 280 caracteres." }).optional(),
    price: zod_1.z.coerce.number({ invalid_type_error: "O preço deve ser um número." }).min(0, { message: 'O preço não pode ser negativo.' }),
    paymentMethods: exports.ProductPaymentMethodsSchema.optional(),
    type: zod_1.z.enum(['product', 'subscription']).default('product'),
    durationDays: zod_1.z.coerce.number().int().positive().optional().nullable(),
    isTelegramGroupAccess: zod_1.z.boolean().optional(),
    telegramGroupId: zod_1.z.string().optional().nullable(),
    productSubtype: zod_1.z.enum(['standard', 'digital_file', 'activation_codes', 'media_pack']).optional(),
    stock: zod_1.z.coerce.number().int({ message: 'O estoque deve ser um número inteiro.' }).min(0, { message: 'O estoque não pode ser negativo.' }).optional().nullable(),
    activationCodes: zod_1.z.string().optional(),
    hostedFileUrl: zod_1.z.string().url().optional().nullable(),
    mediaUrls: zod_1.z.string().optional(), // Recebe string do textarea e converte depois
    discountPrice: zod_1.z.coerce.number().min(0, { message: 'O preço com desconto não pode ser negativo.' }).optional().nullable(),
    offerExpiresAt: zod_1.z.string().optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.type === 'subscription' && data.isTelegramGroupAccess && !data.telegramGroupId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "O ID do grupo do Telegram é obrigatório para esta opção.",
            path: ['telegramGroupId'],
        });
    }
    if (data.type === 'product' && data.productSubtype === 'activation_codes' && !data.activationCodes) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "É necessário adicionar ao menos um código.",
            path: ['activationCodes'],
        });
    }
    if (data.type === 'product' && data.productSubtype === 'media_pack' && !data.mediaUrls) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "É necessário adicionar ao menos uma URL de mídia.",
            path: ['mediaUrls'],
        });
    }
    if (data.discountPrice !== null && data.discountPrice !== undefined) {
        if (data.price !== null && data.price !== undefined && data.discountPrice >= data.price) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'O preço com desconto deve ser menor que o preço original.',
                path: ['discountPrice'],
            });
        }
        if (!data.offerExpiresAt) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'A data de expiração da oferta é obrigatória se um preço com desconto for definido.',
                path: ['offerExpiresAt'],
            });
        }
    }
});
exports.BotActionSchema = zod_1.z.object({
    type: zod_1.z.enum(['GO_TO_STEP', 'LINK_TO_PRODUCT', 'MAIN_MENU', 'SHOW_PROFILE']),
    payload: zod_1.z.string().optional(),
});
exports.BotButtonSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().or(zod_1.z.string().min(1)),
    text: zod_1.z.string().min(1, { message: "O texto do botão é obrigatório." }).max(40, { message: "Texto muito longo." }),
    action: exports.BotActionSchema,
});
exports.BotStepSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().or(zod_1.z.string().min(1)),
    name: zod_1.z.string().min(1, { message: "O nome do passo é obrigatório." }),
    message: zod_1.z.string().min(1, { message: "A mensagem é obrigatória." }),
    buttons: zod_1.z.array(exports.BotButtonSchema),
});
exports.BotFlowSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1, { message: "O nome do fluxo é obrigatório." }),
    trigger: zod_1.z.string().min(1, { message: "O comando de ativação é obrigatório." }),
    startStepId: zod_1.z.string().nullable(),
    steps: zod_1.z.array(exports.BotStepSchema),
});
exports.BotConfigSchema = zod_1.z.object({
    flows: zod_1.z.array(exports.BotFlowSchema),
    inactiveSubscriptionMessage: zod_1.z.string().optional(),
    deliveryMessage: zod_1.z.string().optional(),
});
exports.KrovSettingsSchema = zod_1.z.object({
    paymentIntegrations: exports.PaymentIntegrationsSchema.optional(),
    logoUrl: zod_1.z.string().optional().or(zod_1.z.literal('')),
});
exports.CouponSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    code: zod_1.z.string()
        .min(3, { message: "O código deve ter pelo menos 3 caracteres." })
        .max(50, { message: "O código deve ter no máximo 50 caracteres." })
        .regex(/^[A-Z0-9_-]+$/, { message: "Use apenas letras maiúsculas, números, hífens e underscores." }),
    type: zod_1.z.enum(['percentage', 'fixed_amount', 'free_days'], {
        errorMap: () => ({ message: "Tipo de desconto inválido." })
    }),
    value: zod_1.z.number()
        .positive({ message: "O valor deve ser positivo." }),
    description: zod_1.z.string().optional(),
    maxUses: zod_1.z.number().int().positive().optional(),
    currentUses: zod_1.z.number().int().default(0),
    expiresAt: zod_1.z.string().optional(), // ISO date string
    isActive: zod_1.z.boolean().default(true),
    tenantId: zod_1.z.string().optional(), // ID do tenant dono do cupom
    applicableProducts: zod_1.z.array(zod_1.z.string()).optional(), // IDs dos produtos específicos
    applicablePlans: zod_1.z.array(zod_1.z.string()).optional(), // Mantido para retrocompatibilidade ou uso futuro
}).refine((data) => {
    if (data.type === 'percentage' && data.value > 100) {
        return false;
    }
    return true;
}, {
    message: "O percentual deve ser entre 1 e 100.",
    path: ["value"],
});
