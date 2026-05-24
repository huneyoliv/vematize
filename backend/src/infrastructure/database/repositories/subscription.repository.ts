import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, LessThanOrEqual, IsNull, Raw } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.orm-entity';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repo: Repository<SubscriptionEntity>,
  ) {}

  async create(data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findActiveByUserAndProduct(userId: string, productId: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({ 
      where: { userId, productId, status: 'active' },
      order: { expiresAt: 'DESC' }
    });
  }

  async findByUserId(userId: string): Promise<SubscriptionEntity[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findExpiredActive(): Promise<SubscriptionEntity[]> {
    return this.repo.find({
      where: {
        status: 'active',
        expiresAt: LessThan(new Date()),
      },
    });
  }

  async findExpiringInDays(days: number): Promise<SubscriptionEntity[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    return this.repo.find({
      where: {
        status: 'active',
        expiresAt: LessThanOrEqual(targetDate),
        notifiedAt: IsNull(),
      },
    });
  }

  async update(id: string, data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }
}
