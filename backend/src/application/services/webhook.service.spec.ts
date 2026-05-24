import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { SaleRepository } from '../../infrastructure/database/repositories/sale.repository';
import { ProductRepository } from '../../infrastructure/database/repositories/product.repository';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';
import { CouponRepository } from '../../infrastructure/database/repositories/coupon.repository';
import { MercadoPagoService } from './mercadopago.service';
import { EfiService } from './efi.service';
import { DeliveryService } from './delivery.service';
import { createHmac } from 'crypto';

describe('WebhookService', () => {
  let service: WebhookService;
  let settingsRepo: SettingsRepository;
  let saleRepo: SaleRepository;
  let mpService: MercadoPagoService;
  let efiService: EfiService;
  let deliveryService: DeliveryService;

  const mockSaleRepo = {
    findByPaymentId: jest.fn(),
    findByExternalReference: jest.fn(),
    findByTxid: jest.fn(),
    update: jest.fn(),
  };

  const mockProductRepo = {
    findById: jest.fn(),
    releaseStock: jest.fn(),
  };

  const mockMpService = {
    getPaymentStatus: jest.fn(),
  };

  const mockEfiService = {
    getPixCharge: jest.fn(),
  };

  const mockDeliveryService = {
    deliver: jest.fn(),
  };

  const mockSettingsRepo = {
    get: jest.fn(),
  };

  const mockCouponRepo = {
    findByCode: jest.fn(),
    incrementUses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: SaleRepository, useValue: mockSaleRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: MercadoPagoService, useValue: mockMpService },
        { provide: EfiService, useValue: mockEfiService },
        { provide: DeliveryService, useValue: mockDeliveryService },
        { provide: SettingsRepository, useValue: mockSettingsRepo },
        { provide: CouponRepository, useValue: mockCouponRepo },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    settingsRepo = module.get<SettingsRepository>(SettingsRepository);
    saleRepo = module.get<SaleRepository>(SaleRepository);
    mpService = module.get<MercadoPagoService>(MercadoPagoService);
    efiService = module.get<EfiService>(EfiService);
    deliveryService = module.get<DeliveryService>(DeliveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve validar assinatura do MercadoPago com sucesso', async () => {
    const secret = 'my-webhook-secret';
    mockSettingsRepo.get.mockResolvedValue({
      mercadopagoConfig: { webhook_secret: secret },
    });

    const dataId = '123456';
    const xRequestId = 'req-abc';
    const ts = '1680000000';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const signature = createHmac('sha256', secret).update(manifest).digest('hex');
    const xSignature = `ts=${ts},v1=${signature}`;

    const headers = {
      'x-signature': xSignature,
      'x-request-id': xRequestId,
    };

    mockSaleRepo.findByPaymentId.mockResolvedValue({ id: 'sale-999', productId: 'prod-1', status: 'pending' });
    mockMpService.getPaymentStatus.mockResolvedValue({ status: 'approved' });

    await service.processMercadoPago({ data: { id: dataId } }, headers);

    expect(mockSettingsRepo.get).toHaveBeenCalled();
    expect(mockSaleRepo.findByPaymentId).toHaveBeenCalledWith(dataId);
    expect(mockDeliveryService.deliver).toHaveBeenCalledWith('sale-999');
  });

  it('deve validar assinatura do MercadoPago com sucesso quando o ID de pagamento vem no query param "id"', async () => {
    const secret = 'my-webhook-secret';
    mockSettingsRepo.get.mockResolvedValue({
      mercadopagoConfig: { webhook_secret: secret },
    });

    const dataId = '123456';
    const xRequestId = 'req-abc';
    const ts = '1680000000';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const signature = createHmac('sha256', secret).update(manifest).digest('hex');
    const xSignature = `ts=${ts},v1=${signature}`;

    const headers = {
      'x-signature': xSignature,
      'x-request-id': xRequestId,
    };

    const query = { id: dataId };

    mockSaleRepo.findByPaymentId.mockResolvedValue({ id: 'sale-999', productId: 'prod-1', status: 'pending' });
    mockMpService.getPaymentStatus.mockResolvedValue({ status: 'approved' });

    await service.processMercadoPago({}, headers, query);

    expect(mockSettingsRepo.get).toHaveBeenCalled();
    expect(mockSaleRepo.findByPaymentId).toHaveBeenCalledWith(dataId);
    expect(mockDeliveryService.deliver).toHaveBeenCalledWith('sale-999');
  });

  it('deve pular a validacao de assinatura do MercadoPago se for IPN (topic presente)', async () => {
    const secret = 'my-webhook-secret';
    mockSettingsRepo.get.mockResolvedValue({
      mercadopagoConfig: { webhook_secret: secret },
    });

    const headers = {
      'x-signature': 'ts=1680000000,v1=invalid-signature',
      'x-request-id': 'req-abc',
    };

    const query = { id: '123456', topic: 'payment' };

    mockSaleRepo.findByPaymentId.mockResolvedValue({ id: 'sale-999', productId: 'prod-1', status: 'pending' });
    mockMpService.getPaymentStatus.mockResolvedValue({ status: 'approved' });

    await service.processMercadoPago({}, headers, query);

    expect(mockDeliveryService.deliver).toHaveBeenCalledWith('sale-999');
  });

  it('deve falhar ao validar assinatura do MercadoPago invalida', async () => {
    const secret = 'my-webhook-secret';
    mockSettingsRepo.get.mockResolvedValue({
      mercadopagoConfig: { webhook_secret: secret },
    });

    const headers = {
      'x-signature': 'ts=1680000000,v1=invalid-signature',
      'x-request-id': 'req-abc',
    };

    await expect(
      service.processMercadoPago({ data: { id: '123456' } }, headers)
    ).rejects.toThrow('Assinatura do webhook inválida');

    expect(mockDeliveryService.deliver).not.toHaveBeenCalled();
  });

  it('deve validar mTLS da Efi com sucesso', async () => {
    const headers = { 'x-ssl-client-verify': 'SUCCESS' };
    const body = {
      pix: [{ txid: 'tx-abc' }],
    };

    mockSaleRepo.findByTxid.mockResolvedValue({ id: 'sale-1', status: 'pending' });
    mockEfiService.getPixCharge.mockResolvedValue({ status: 'CONCLUIDA' });

    await service.processEfi(body, headers);

    expect(mockSaleRepo.findByTxid).toHaveBeenCalledWith('tx-abc');
    expect(mockDeliveryService.deliver).toHaveBeenCalledWith('sale-1');
  });

  it('deve falhar se mTLS da Efi for invalido', async () => {
    const headers = { 'x-ssl-client-verify': 'FAILED' };
    const body = {
      pix: [{ txid: 'tx-abc' }],
    };

    await expect(service.processEfi(body, headers)).rejects.toThrow('Falha na validação mTLS da Efí');
    expect(mockSaleRepo.findByTxid).not.toHaveBeenCalled();
  });
});
