import { z } from 'zod';

export const PasswordSchema = z.string()
    .min(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
    .regex(/[a-z]/, { message: 'A senha deve conter pelo menos uma letra minúscula.' })
    .regex(/[A-Z]/, { message: 'A senha deve conter pelo menos uma letra maiúscula.' })
    .regex(/[0-9]/, { message: 'A senha deve conter pelo menos um número.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'A senha deve conter pelo menos um caractere especial.' });

export const MercadoPagoSettingsSchema = z.object({
    mode: z.enum(['sandbox', 'production']).default('sandbox'),
    sandbox_public_key: z.string().optional(),
    sandbox_access_token: z.string().optional(),
    sandbox_webhook_secret: z.string().optional(),
    production_public_key: z.string().optional(),
    production_access_token: z.string().optional(),
    production_webhook_secret: z.string().optional(),
    success_url: z.string().url({ message: "URL de sucesso inválida." }).optional().or(z.literal('')),
    failure_url: z.string().url({ message: "URL de falha inválida." }).optional().or(z.literal('')),
    pending_url: z.string().url({ message: "URL pendente inválida." }).optional().or(z.literal('')),
}).refine(data => {
    if (data.mode === 'production') {
        return !!data.production_public_key && !!data.production_access_token;
    }
    return true;
}, {
    message: "As credenciais de Produção (Public Key e Access Token) são obrigatórias quando o modo de Produção está ativo.",
    path: ["production_public_key"],
});

export const PushinPaySettingsSchema = z.object({
    mode: z.enum(['sandbox', 'production']).default('sandbox'),
    sandbox_api_key: z.string().optional(),
    sandbox_webhook_secret: z.string().optional(),
    production_api_key: z.string().optional(),
    production_webhook_secret: z.string().optional(),
    success_url: z.string().url({ message: "URL de sucesso inválida." }).optional().or(z.literal('')),
    failure_url: z.string().url({ message: "URL de falha inválida." }).optional().or(z.literal('')),
    pending_url: z.string().url({ message: "URL pendente inválida." }).optional().or(z.literal('')),
}).refine(data => {
    if (data.mode === 'production') {
        return !!data.production_api_key;
    }
    return true;
}, {
    message: "A API Key de produção é obrigatória quando o modo de produção está ativo.",
    path: ["production_api_key"],
});

export const StripeSettingsSchema = z.object({
    mode: z.enum(['test', 'live']).default('test'),
    test_publishable_key: z.string().optional(),
    test_secret_key: z.string().optional(),
    test_webhook_secret: z.string().optional(),
    live_publishable_key: z.string().optional(),
    live_secret_key: z.string().optional(),
    live_webhook_secret: z.string().optional(),
    success_url: z.string().url({ message: "URL de sucesso inválida." }).optional().or(z.literal('')),
    cancel_url: z.string().url({ message: "URL de cancelamento inválida." }).optional().or(z.literal('')),
}).refine(data => {
    if (data.mode === 'live') {
        return !!data.live_publishable_key && !!data.live_secret_key;
    }
    return true;
}, {
    message: "As chaves de produção (Publishable Key e Secret Key) são obrigatórias quando o modo live está ativo.",
    path: ["live_publishable_key"],
});

export const EfiSettingsSchema = z.object({
    mode: z.enum(['sandbox', 'production']).default('sandbox'),
    sandbox_client_id: z.string().optional(),
    sandbox_client_secret: z.string().optional(),
    production_client_id: z.string().optional(),
    production_client_secret: z.string().optional(),
    pix_key: z.string().optional(),
    certificate: z.string().optional(), // Caminho ou conteúdo do certificado .p12
}).refine(data => {
    if (data.mode === 'production') {
        return !!data.production_client_id && !!data.production_client_secret && !!data.certificate;
    }
    return true;
}, {
    message: "Credenciais de produção e certificado são obrigatórios no modo de produção.",
    path: ["production_client_id"],
});

export const PaymentIntegrationsSchema = z.object({
    mercadopago: MercadoPagoSettingsSchema.optional(),
    pushinpay: PushinPaySettingsSchema.optional(),
    stripe: StripeSettingsSchema.optional(),
    efi: EfiSettingsSchema.optional(),
});

export const ProductPaymentMethodsSchema = z.object({
    pix: z.string().optional(),
    credit_card: z.string().optional(),
});

export const ProductSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, { message: 'O nome do produto deve ter pelo menos 3 caracteres.' }),
    description: z.string().max(280, { message: "A descrição não pode ter mais de 280 caracteres." }).optional(),
    price: z.coerce.number({ invalid_type_error: "O preço deve ser um número." }).min(0, { message: 'O preço não pode ser negativo.' }),

    paymentMethods: ProductPaymentMethodsSchema.optional(),

    type: z.enum(['product', 'subscription']).default('product'),

    durationDays: z.coerce.number().int().positive().optional().nullable(),
    isTelegramGroupAccess: z.boolean().optional(),
    telegramGroupId: z.string().optional().nullable(),

    productSubtype: z.enum(['standard', 'digital_file', 'activation_codes', 'media_pack']).optional(),
    stock: z.coerce.number().int({ message: 'O estoque deve ser um número inteiro.' }).min(0, { message: 'O estoque não pode ser negativo.' }).optional().nullable(),
    activationCodes: z.string().optional(),
    hostedFileUrl: z.string().url().optional().nullable(),
    mediaUrls: z.string().optional(), // Recebe string do textarea e converte depois

    discountPrice: z.coerce.number().min(0, { message: 'O preço com desconto não pode ser negativo.' }).optional().nullable(),
    offerExpiresAt: z.string().optional().nullable(),

}).superRefine((data, ctx) => {
    if (data.type === 'subscription' && data.isTelegramGroupAccess && !data.telegramGroupId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O ID do grupo do Telegram é obrigatório para esta opção.",
            path: ['telegramGroupId'],
        });
    }
    if (data.type === 'product' && data.productSubtype === 'activation_codes' && !data.activationCodes) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "É necessário adicionar ao menos um código.",
            path: ['activationCodes'],
        });
    }
    if (data.type === 'product' && data.productSubtype === 'media_pack' && !data.mediaUrls) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "É necessário adicionar ao menos uma URL de mídia.",
            path: ['mediaUrls'],
        });
    }
    if (data.discountPrice !== null && data.discountPrice !== undefined) {
        if (data.price !== null && data.price !== undefined && data.discountPrice >= data.price) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'O preço com desconto deve ser menor que o preço original.',
                path: ['discountPrice'],
            });
        }
        if (!data.offerExpiresAt) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'A data de expiração da oferta é obrigatória se um preço com desconto for definido.',
                path: ['offerExpiresAt'],
            });
        }
    }
});


export const BotActionSchema = z.object({
    type: z.enum(['GO_TO_STEP', 'LINK_TO_PRODUCT', 'MAIN_MENU', 'SHOW_PROFILE']),
    payload: z.string().optional(),
});

export const BotButtonSchema = z.object({
    id: z.string().uuid().or(z.string().min(1)),
    text: z.string().min(1, { message: "O texto do botão é obrigatório." }).max(40, { message: "Texto muito longo." }),
    action: BotActionSchema,
});

export const BotStepSchema = z.object({
    id: z.string().uuid().or(z.string().min(1)),
    name: z.string().min(1, { message: "O nome do passo é obrigatório." }),
    message: z.string().min(1, { message: "A mensagem é obrigatória." }),
    buttons: z.array(BotButtonSchema),
});

export const BotFlowSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1, { message: "O nome do fluxo é obrigatório." }),
    trigger: z.string().min(1, { message: "O comando de ativação é obrigatório." }),
    startStepId: z.string().nullable(),
    steps: z.array(BotStepSchema),
});

export const BotConfigSchema = z.object({
    flows: z.array(BotFlowSchema),
    inactiveSubscriptionMessage: z.string().optional(),
    deliveryMessage: z.string().optional(),
});

export const KrovSettingsSchema = z.object({
    paymentIntegrations: PaymentIntegrationsSchema.optional(),
    logoUrl: z.string().optional().or(z.literal('')),
});

export const CouponSchema = z.object({
    id: z.string().optional(),
    code: z.string()
        .min(3, { message: "O código deve ter pelo menos 3 caracteres." })
        .max(50, { message: "O código deve ter no máximo 50 caracteres." })
        .regex(/^[A-Z0-9_-]+$/, { message: "Use apenas letras maiúsculas, números, hífens e underscores." }),
    type: z.enum(['percentage', 'fixed_amount', 'free_days'], {
        errorMap: () => ({ message: "Tipo de desconto inválido." })
    }),
    value: z.number()
        .positive({ message: "O valor deve ser positivo." }),
    description: z.string().optional(),
    maxUses: z.number().int().positive().optional(),
    currentUses: z.number().int().default(0),
    expiresAt: z.string().optional(), // ISO date string
    isActive: z.boolean().default(true),
    tenantId: z.string().optional(), // ID do tenant dono do cupom
    applicableProducts: z.array(z.string()).optional(), // IDs dos produtos específicos
    applicablePlans: z.array(z.string()).optional(), // Mantido para retrocompatibilidade ou uso futuro
}).refine((data) => {
    if (data.type === 'percentage' && data.value > 100) {
        return false;
    }
    return true;
}, {
    message: "O percentual deve ser entre 1 e 100.",
    path: ["value"],
});
