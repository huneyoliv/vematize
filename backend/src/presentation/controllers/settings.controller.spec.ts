import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsRepo: SettingsRepository;

  const mockSettingsRepo = {
    get: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsRepository,
          useValue: mockSettingsRepo,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    settingsRepo = module.get<SettingsRepository>(SettingsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve rejeitar ativacao do Mercado Pago sem credenciais configuradas', async () => {
    mockSettingsRepo.get.mockResolvedValue({
      mercadopagoConfig: null,
      efiConfig: null,
    });

    await expect(
      controller.update({
        activeGateway: 'mercadopago',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve aceitar ativacao do Mercado Pago se credenciais de producao estiverem presentes', async () => {
    mockSettingsRepo.get.mockResolvedValue({
      mercadopagoConfig: {
        production_access_token: 'valid-prod-token',
      },
    });
    mockSettingsRepo.upsert.mockResolvedValue({ success: true });

    const res = await controller.update({
      activeGateway: 'mercadopago',
    });

    expect(res).toBeDefined();
    expect(mockSettingsRepo.upsert).toHaveBeenCalled();
  });

  it('deve rejeitar ativacao do Efi Bank sem credenciais configuradas', async () => {
    mockSettingsRepo.get.mockResolvedValue({
      mercadopagoConfig: null,
      efiConfig: null,
    });

    await expect(
      controller.update({
        activeGateway: 'efi',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve aceitar ativacao do Efi Bank se credenciais de producao estiverem presentes', async () => {
    mockSettingsRepo.get.mockResolvedValue({
      efiConfig: {
        production_client_id: 'valid-prod-client-id',
      },
    });
    mockSettingsRepo.upsert.mockResolvedValue({ success: true });

    const res = await controller.update({
      activeGateway: 'efi',
    });

    expect(res).toBeDefined();
    expect(mockSettingsRepo.upsert).toHaveBeenCalled();
  });
});
