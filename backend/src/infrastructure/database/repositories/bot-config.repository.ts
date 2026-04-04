import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotConfigEntity } from '../entities/bot-config.orm-entity';

@Injectable()
export class BotConfigRepository {
  constructor(
    @InjectRepository(BotConfigEntity)
    private readonly repo: Repository<BotConfigEntity>,
  ) {}

  async findAll(): Promise<BotConfigEntity[]> {
    return this.repo.find();
  }

  async findById(id: string): Promise<BotConfigEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByPlatform(platform: string): Promise<BotConfigEntity | null> {
    return this.repo.findOne({ where: { platform } });
  }

  async create(data: Partial<BotConfigEntity>): Promise<BotConfigEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<BotConfigEntity>): Promise<BotConfigEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async upsertByPlatform(platform: string, data: Partial<BotConfigEntity>): Promise<BotConfigEntity> {
    const existing = await this.findByPlatform(platform);
    if (existing) {
      await this.repo.update(existing.id, data);
      return this.findById(existing.id) as Promise<BotConfigEntity>;
    }
    return this.create({ ...data, platform });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
