import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../entities/product.orm-entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<ProductEntity>): Promise<ProductEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<ProductEntity>): Promise<ProductEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async count(): Promise<number> {
    return this.repo.count();
  }

  async reserveStock(id: string, qty: number): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(ProductEntity)
      .set({ stock: () => `stock - ${qty}` })
      .where('id = :id AND stock >= :qty', { id, qty })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async releaseStock(id: string, qty: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(ProductEntity)
      .set({ stock: () => `stock + ${qty}` })
      .where('id = :id', { id })
      .execute();
  }
}
