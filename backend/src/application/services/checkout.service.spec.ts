import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { CouponRepository } from '../../infrastructure/database/repositories/coupon.repository';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';
import { PaymentGatewayService } from './payment-gateway.service';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqr'),
}));

const mockUser = { id: 'user-1', name: 'Test' };
const mockProduct = { id: 'prod-1', name: 'Produto', price: 100, stock: null };
const mockSale = { id: 'sale-1', status: 'pending' };
const mockCharge = { success: true, gateway: 'mercadopago', qrCode: 'pix-code', paymentId: 'pay-1' };

describe('CheckoutService', () => {
  let service: CheckoutService;
  let userRepo: jest.Mocked<UserRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let saleRepo: jest.Mocked<SaleRepository>;
  let couponRepo: jest.Mocked<CouponRepository>;
  let settingsRepo: jest.Mocked<SettingsRepository>;
  let paymentGateway: jest.Mocked<PaymentGatewayService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: UserRepository, useValue: { findById: jest.fn() } },
        { provide: ProductRepository, useValue: { findById: jest.fn(), reserveStock: jest.fn(), releaseStock: jest.fn() } },
        { provide: SaleRepository, useValue: { create: jest.fn(), update: jest.fn(), findById: jest.fn(), findByCouponAndUser: jest.fn() } },
        { provide: CouponRepository, useValue: { findByCode: jest.fn() } },
        { provide: SettingsRepository, useValue: { get: jest.fn().mockResolvedValue(null) } },
        { provide: PaymentGatewayService, useValue: { createCharge: jest.fn() } },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    userRepo = module.get(UserRepository);
    productRepo = module.get(ProductRepository);
    saleRepo = module.get(SaleRepository);
    couponRepo = module.get(CouponRepository);
    settingsRepo = module.get(SettingsRepository);
    paymentGateway = module.get(PaymentGatewayService);

    userRepo.findById.mockResolvedValue(mockUser as any);
    productRepo.findById.mockResolvedValue(mockProduct as any);
    saleRepo.create.mockResolvedValue(mockSale as any);
    saleRepo.update.mockResolvedValue(null as any);
    saleRepo.findById.mockResolvedValue(mockSale as any);
    saleRepo.findByCouponAndUser.mockResolvedValue(null);
    paymentGateway.createCharge.mockResolvedValue(mockCharge as any);
    settingsRepo.get.mockResolvedValue(null);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve criar checkout com sucesso', async () => {
    const result = await service.createCheckout({ productId: 'prod-1', userId: 'user-1', platform: 'telegram' });

    expect(result.saleId).toBe('sale-1');
    expect(result.qrCode).toBe('pix-code');
    expect(result.gateway).toBe('mercadopago');
  });

  it('deve lançar erro se usuário não encontrado', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(service.createCheckout({ productId: 'prod-1', userId: 'user-x', platform: 'telegram' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve lançar erro se produto sem estoque', async () => {
    productRepo.findById.mockResolvedValue({ ...mockProduct, stock: 0 } as any);

    await expect(service.createCheckout({ productId: 'prod-1', userId: 'user-1', platform: 'telegram' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve lançar erro se usuário já usou o cupom e limitToOneUsePerUser=true', async () => {
    couponRepo.findByCode.mockResolvedValue({
      code: 'DESC10',
      isActive: true,
      type: 'percentage',
      value: 10,
      limitToOneUsePerUser: true,
      currentUses: 1,
    } as any);
    saleRepo.findByCouponAndUser.mockResolvedValue({ id: 'sale-old', status: 'approved' } as any);

    await expect(
      service.createCheckout({ productId: 'prod-1', userId: 'user-1', platform: 'telegram', couponCode: 'DESC10' }),
    ).rejects.toThrow('Você já utilizou este cupom anteriormente.');
  });

  it('deve aplicar desconto percentual via cupom', async () => {
    couponRepo.findByCode.mockResolvedValue({
      code: 'DESC10',
      isActive: true,
      type: 'percentage',
      value: 10,
      limitToOneUsePerUser: false,
      currentUses: 0,
    } as any);

    await service.createCheckout({ productId: 'prod-1', userId: 'user-1', platform: 'telegram', couponCode: 'DESC10' });

    expect(saleRepo.create).toHaveBeenCalledWith(expect.objectContaining({ totalPrice: 90 }));
  });

  it('deve cancelar venda após 30 minutos', async () => {
    const onExpired = jest.fn().mockResolvedValue(undefined);

    await service.createCheckout({ productId: 'prod-1', userId: 'user-1', platform: 'telegram', onExpired });

    expect(onExpired).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(30 * 60 * 1000);

    expect(saleRepo.update).toHaveBeenCalledWith('sale-1', { status: 'cancelled' });
  });

  it('deve reverter estoque e marcar como falha se gateway falhar', async () => {
    productRepo.findById.mockResolvedValue({ ...mockProduct, stock: 5 } as any);
    productRepo.reserveStock.mockResolvedValue(true);
    paymentGateway.createCharge.mockResolvedValue({ success: false, message: 'Gateway offline' } as any);

    await expect(service.createCheckout({ productId: 'prod-1', userId: 'user-1', platform: 'telegram' })).rejects.toThrow(
      'Gateway offline',
    );

    expect(saleRepo.update).toHaveBeenCalledWith('sale-1', { status: 'failed' });
    expect(productRepo.releaseStock).toHaveBeenCalledWith('prod-1', 1);
  });
});
