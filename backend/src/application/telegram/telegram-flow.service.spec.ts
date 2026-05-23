import { Test, TestingModule } from '@nestjs/testing';
import { TelegramFlowService } from './telegram-flow.service';
import { BotConfigRepository } from '../../infrastructure/database/repositories/bot-config.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { CouponRepository } from '../../infrastructure/database/repositories/coupon.repository';
import { CheckoutService } from '../services/checkout.service';

describe('TelegramFlowService', () => {
  let service: TelegramFlowService;
  let botConfigRepo: any;
  let userRepo: any;
  let productRepo: any;
  let couponRepo: any;
  let checkoutService: any;

  const mockBotConfigRepo = {
    findByPlatform: jest.fn(),
  };

  const mockUserRepo = {
    update: jest.fn(),
    findByTelegramId: jest.fn(),
  };

  const mockProductRepo = {
    findById: jest.fn(),
  };

  const mockCouponRepo = {
    findByCode: jest.fn(),
  };

  const mockCheckoutService = {
    createCheckout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramFlowService,
        { provide: BotConfigRepository, useValue: mockBotConfigRepo },
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: CouponRepository, useValue: mockCouponRepo },
        { provide: CheckoutService, useValue: mockCheckoutService },
      ],
    }).compile();

    service = module.get<TelegramFlowService>(TelegramFlowService);
    botConfigRepo = module.get(BotConfigRepository);
    userRepo = module.get(UserRepository);
    productRepo = module.get(ProductRepository);
    couponRepo = module.get(CouponRepository);
    checkoutService = module.get(CheckoutService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve aplicar CART_APPLY_COUPON deletando a mensagem anterior e enviando o prompt do cupom', async () => {
    const ctx = {
      callbackQuery: {
        data: 'CART_APPLY_COUPON:prod-123',
        message: { message_id: 999 },
      },
      from: { id: 111, first_name: 'Usuario' },
      deleteMessage: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue({ message_id: 1000 }),
      answerCbQuery: jest.fn().mockResolvedValue(true),
    };

    const user = { id: 'u-1', telegramId: 111 };
    mockUserRepo.findByTelegramId.mockResolvedValue(user);
    mockBotConfigRepo.findByPlatform.mockResolvedValue({ flows: [{ trigger: '/start' }] });

    await service.handleCallbackQuery(ctx);

    expect(ctx.deleteMessage).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Digite o código do cupom'),
      expect.any(Object),
    );
    expect(userRepo.update).toHaveBeenCalledWith('u-1', {
      interactionState: 'WAITING_COUPON',
      interactionData: {
        productId: 'prod-123',
        couponPromptMessageId: 1000,
      },
    });
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Aguardando cupom...');
  });

  it('deve cancelar o input de cupom deletando o prompt e reexibindo o produto', async () => {
    const ctx = {
      callbackQuery: {
        data: 'CANCEL_COUPON_INPUT:prod-123',
      },
      from: { id: 111 },
      deleteMessage: jest.fn().mockResolvedValue(true),
      answerCbQuery: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue(true),
      editMessageText: jest.fn().mockResolvedValue(true),
    };

    const user = { id: 'u-1', telegramId: 111, interactionData: { couponPromptMessageId: 1000 } };
    mockUserRepo.findByTelegramId.mockResolvedValue(user);
    mockProductRepo.findById.mockResolvedValue({
      id: 'prod-123',
      name: 'Produto Teste',
      price: 10.0,
    });
    mockBotConfigRepo.findByPlatform.mockResolvedValue({ flows: [{ trigger: '/start' }] });

    await service.handleCallbackQuery(ctx);

    expect(ctx.deleteMessage).toHaveBeenCalled();
    expect(userRepo.update).toHaveBeenCalledWith('u-1', {
      interactionState: undefined,
      interactionData: {},
    });
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Cancelado.');
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Produto Teste'),
      expect.any(Object),
    );
  });

  it('deve remover o cupom aplicado com sucesso', async () => {
    const ctx = {
      callbackQuery: {
        data: 'REMOVE_COUPON:prod-123',
      },
      from: { id: 111 },
      answerCbQuery: jest.fn().mockResolvedValue(true),
      editMessageText: jest.fn().mockResolvedValue(true),
    };

    const user = { id: 'u-1', telegramId: 111, interactionData: { appliedCoupon: 'CUPOM10' } };
    mockUserRepo.findByTelegramId.mockResolvedValue(user);
    mockProductRepo.findById.mockResolvedValue({
      id: 'prod-123',
      name: 'Produto Teste',
      price: 10.0,
    });
    mockBotConfigRepo.findByPlatform.mockResolvedValue({ flows: [{ trigger: '/start' }] });

    await service.handleCallbackQuery(ctx);

    expect(userRepo.update).toHaveBeenCalledWith('u-1', {
      interactionState: undefined,
      interactionData: {},
    });
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Cupom removido.');
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining('Produto Teste'),
      expect.any(Object),
    );
  });

  it('deve tratar input de cupom invalido editando a mensagem de prompt com erro', async () => {
    const ctx = {
      message: { text: 'CUPOM_INVALIDO' },
      from: { id: 111 },
      chat: { id: 222 },
      deleteMessage: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue(true),
      telegram: {
        editMessageText: jest.fn().mockResolvedValue(true),
      },
    };

    const user = {
      id: 'u-1',
      telegramId: 111,
      interactionState: 'WAITING_COUPON',
      interactionData: {
        productId: 'prod-123',
        couponPromptMessageId: 1000,
      },
    };

    mockUserRepo.findByTelegramId.mockResolvedValue(user);
    mockCouponRepo.findByCode.mockResolvedValue(null);
    mockBotConfigRepo.findByPlatform.mockResolvedValue({ flows: [{ trigger: '/start' }] });

    await service.handleTextMessage(ctx);

    expect(ctx.deleteMessage).toHaveBeenCalled();
    expect(couponRepo.findByCode).toHaveBeenCalledWith('CUPOM_INVALIDO');
    expect(ctx.telegram.editMessageText).toHaveBeenCalledWith(
      222,
      1000,
      undefined,
      expect.stringContaining('Cupom inválido ou inativo'),
      expect.any(Object),
    );
  });

  it('deve tratar input de cupom valido aplicando o desconto e reexibindo o produto', async () => {
    const ctx = {
      message: { text: 'CUPOM10' },
      from: { id: 111 },
      chat: { id: 222 },
      deleteMessage: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue(true),
      telegram: {
        deleteMessage: jest.fn().mockResolvedValue(true),
      },
    };

    const user = {
      id: 'u-1',
      telegramId: 111,
      interactionState: 'WAITING_COUPON',
      interactionData: {
        productId: 'prod-123',
        couponPromptMessageId: 1000,
      },
    };

    const mockCoupon = {
      code: 'CUPOM10',
      isActive: true,
      type: 'percentage',
      value: 10,
    };

    mockUserRepo.findByTelegramId.mockResolvedValue(user);
    mockCouponRepo.findByCode.mockResolvedValue(mockCoupon);
    mockProductRepo.findById.mockResolvedValue({
      id: 'prod-123',
      name: 'Produto Teste',
      price: 100.0,
    });
    mockBotConfigRepo.findByPlatform.mockResolvedValue({ flows: [{ trigger: '/start' }] });

    await service.handleTextMessage(ctx);

    expect(ctx.deleteMessage).toHaveBeenCalled();
    expect(ctx.telegram.deleteMessage).toHaveBeenCalledWith(222, 1000);
    expect(userRepo.update).toHaveBeenCalledWith('u-1', {
      interactionState: undefined,
      interactionData: {
        appliedCoupon: 'CUPOM10',
      },
    });
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Preço: R\\$ 90,00'),
      expect.any(Object),
    );
  });
});
