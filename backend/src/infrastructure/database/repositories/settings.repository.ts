import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from '../entities/settings.orm-entity';

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly repo: Repository<SettingsEntity>,
  ) {}

  async get(): Promise<SettingsEntity | null> {
    const all = await this.repo.find();
    return all[0] || null;
  }

  async upsert(data: Partial<SettingsEntity>): Promise<SettingsEntity> {
    const existing = await this.get();
    if (existing) {
      await this.repo.update(existing.id, data);
      return this.repo.findOne({ where: { id: existing.id } }) as Promise<SettingsEntity>;
    }
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
}
