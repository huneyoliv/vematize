import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponEntity } from '../entities/coupon.orm-entity';

@Injectable()
export class CouponRepository {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly repo: Repository<CouponEntity>,
  ) {}

  async findAll(): Promise<CouponEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<CouponEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<CouponEntity | null> {
    return this.repo.findOne({ where: { code } });
  }

  async create(data: Partial<CouponEntity>): Promise<CouponEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<CouponEntity>): Promise<CouponEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async incrementUses(id: string): Promise<void> {
    await this.repo.increment({ id }, 'currentUses', 1);
  }
}
