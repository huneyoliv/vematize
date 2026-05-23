import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsRepository } from './settings.repository';
import { SettingsEntity } from '../entities/settings.orm-entity';
import { encrypt, decrypt } from '../../crypto/field-encryptor';

describe('SettingsRepository', () => {
  let repository: SettingsRepository;
  let ormRepo: Repository<SettingsEntity>;

  const mockSettings = {
    id: 'settings-123',
    mercadopagoConfig: {
      production_access_token: 'raw-mp-token',
      webhook_secret: 'raw-mp-secret',
      other_field: 'public-field',
    },
    efiConfig: {
      production_client_id: 'raw-efi-id',
      production_client_secret: 'raw-efi-secret',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsRepository,
        {
          provide: getRepositoryToken(SettingsEntity),
          useValue: {
            find: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<SettingsRepository>(SettingsRepository);
    ormRepo = module.get<Repository<SettingsEntity>>(getRepositoryToken(SettingsEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve buscar configuracoes e descriptografar campos sensiveis', async () => {
    const encryptedMpToken = encrypt('raw-mp-token');
    const encryptedMpSecret = encrypt('raw-mp-secret');
    const encryptedEfiId = encrypt('raw-efi-id');
    const encryptedEfiSecret = encrypt('raw-efi-secret');

    const dbSettings = {
      id: 'settings-123',
      mercadopagoConfig: {
        production_access_token: encryptedMpToken,
        webhook_secret: encryptedMpSecret,
        other_field: 'public-field',
      },
      efiConfig: {
        production_client_id: encryptedEfiId,
        production_client_secret: encryptedEfiSecret,
      },
    };

    jest.spyOn(ormRepo, 'find').mockResolvedValue([dbSettings] as any);

    const result = await repository.get();

    expect(result).toBeDefined();
    expect(result?.mercadopagoConfig.production_access_token).toBe('raw-mp-token');
    expect(result?.mercadopagoConfig.webhook_secret).toBe('raw-mp-secret');
    expect(result?.mercadopagoConfig.other_field).toBe('public-field');
    expect(result?.efiConfig.production_client_id).toBe('raw-efi-id');
    expect(result?.efiConfig.production_client_secret).toBe('raw-efi-secret');
  });

  it('deve criptografar campos sensiveis ao atualizar configuracoes existentes', async () => {
    jest.spyOn(ormRepo, 'find').mockResolvedValue([{ id: 'settings-123' }] as any);
    jest.spyOn(ormRepo, 'update').mockResolvedValue({} as any);
    
    jest.spyOn(repository, 'get').mockResolvedValue({
      id: 'settings-123',
      mercadopagoConfig: mockSettings.mercadopagoConfig,
      efiConfig: mockSettings.efiConfig,
    } as any);

    const inputData = {
      mercadopagoConfig: {
        production_access_token: 'raw-mp-token',
        webhook_secret: 'raw-mp-secret',
        other_field: 'public-field',
      },
      efiConfig: {
        production_client_id: 'raw-efi-id',
        production_client_secret: 'raw-efi-secret',
      },
    };

    await repository.upsert(inputData as any);

    expect(ormRepo.update).toHaveBeenCalledWith('settings-123', expect.any(Object));
    const passedData = (ormRepo.update as jest.Mock).mock.calls[0][1];

    expect(passedData.mercadopagoConfig.production_access_token).not.toBe('raw-mp-token');
    expect(passedData.mercadopagoConfig.production_access_token).toContain(':');
    expect(passedData.mercadopagoConfig.webhook_secret).not.toBe('raw-mp-secret');
    expect(passedData.mercadopagoConfig.other_field).toBe('public-field');
    expect(passedData.efiConfig.production_client_id).not.toBe('raw-efi-id');

    expect(decrypt(passedData.mercadopagoConfig.production_access_token)).toBe('raw-mp-token');
    expect(decrypt(passedData.mercadopagoConfig.webhook_secret)).toBe('raw-mp-secret');
  });

  it('deve criar novas configuracoes e criptografar campos sensiveis', async () => {
    jest.spyOn(ormRepo, 'find').mockResolvedValue([] as any);
    jest.spyOn(ormRepo, 'create').mockImplementation((data) => data as any);
    jest.spyOn(ormRepo, 'save').mockResolvedValue({} as any);
    
    jest.spyOn(repository, 'get').mockResolvedValue({
      id: 'settings-new',
      mercadopagoConfig: mockSettings.mercadopagoConfig,
      efiConfig: mockSettings.efiConfig,
    } as any);

    const inputData = {
      mercadopagoConfig: {
        production_access_token: 'raw-mp-token',
        webhook_secret: 'raw-mp-secret',
        other_field: 'public-field',
      },
      efiConfig: {
        production_client_id: 'raw-efi-id',
        production_client_secret: 'raw-efi-secret',
      },
    };

    await repository.upsert(inputData as any);

    expect(ormRepo.create).toHaveBeenCalledWith(expect.any(Object));
    const passedData = (ormRepo.create as jest.Mock).mock.calls[0][0];

    expect(passedData.mercadopagoConfig.production_access_token).not.toBe('raw-mp-token');
    expect(passedData.mercadopagoConfig.production_access_token).toContain(':');
    expect(passedData.mercadopagoConfig.webhook_secret).not.toBe('raw-mp-secret');
    expect(decrypt(passedData.mercadopagoConfig.production_access_token)).toBe('raw-mp-token');
  });
});
