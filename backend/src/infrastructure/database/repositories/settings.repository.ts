import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from '../entities/settings.orm-entity';
import { encrypt, decrypt } from '../../crypto/field-encryptor';

const MP_SENSITIVE_FIELDS = ['production_access_token', 'webhook_secret'];
const EFI_SENSITIVE_FIELDS = [
  'production_client_id',
  'production_client_secret',
  'sandbox_client_id',
  'sandbox_client_secret',
  'production_certificate_base64',
  'sandbox_certificate_base64',
  'certificate',
];

function encryptConfig(config: Record<string, any> | undefined, fields: string[]): any {
  if (!config) return config;
  const encrypted = { ...config };
  for (const field of fields) {
    if (encrypted[field] && typeof encrypted[field] === 'string' && !encrypted[field].includes(':')) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  }
  return encrypted;
}

function decryptConfig(config: Record<string, any> | undefined, fields: string[]): any {
  if (!config) return config;
  const decrypted = { ...config };
  for (const field of fields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = decrypt(decrypted[field]);
    }
  }
  return decrypted;
}

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly repo: Repository<SettingsEntity>,
  ) {}

  async get(): Promise<SettingsEntity | null> {
    console.log('[Debug] Buscando configuracoes no settings');
    const all = await this.repo.find();
    const settings = all[0] || null;
    if (settings) {
      settings.mercadopagoConfig = decryptConfig(settings.mercadopagoConfig, MP_SENSITIVE_FIELDS);
      settings.efiConfig = decryptConfig(settings.efiConfig, EFI_SENSITIVE_FIELDS);
    }
    return settings;
  }

  async upsert(data: Partial<SettingsEntity>): Promise<SettingsEntity> {
    console.log('[Debug] Salvando configuracoes no settings');
    const encryptedData = { ...data };
    if (encryptedData.mercadopagoConfig) {
      encryptedData.mercadopagoConfig = encryptConfig(encryptedData.mercadopagoConfig, MP_SENSITIVE_FIELDS);
    }
    if (encryptedData.efiConfig) {
      encryptedData.efiConfig = encryptConfig(encryptedData.efiConfig, EFI_SENSITIVE_FIELDS);
    }
    const existing = await this.repo.find();
    const first = existing[0] || null;
    if (first) {
      await this.repo.update(first.id, encryptedData);
      return this.get() as Promise<SettingsEntity>;
    }
    const entity = this.repo.create(encryptedData);
    await this.repo.save(entity);
    return this.get() as Promise<SettingsEntity>;
  }
}
