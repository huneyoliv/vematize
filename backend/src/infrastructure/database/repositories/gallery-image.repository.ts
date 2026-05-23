import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalleryImageEntity } from '../entities/gallery-image.orm-entity';
import { GalleryImage } from '../../../domain/entities';
import { IGalleryImageRepository } from '../../../domain/repositories/gallery-image.repository';

@Injectable()
export class GalleryImageRepository implements IGalleryImageRepository {
  constructor(
    @InjectRepository(GalleryImageEntity)
    private readonly repo: Repository<GalleryImageEntity>,
  ) {}

  private mapToDomain(entity: GalleryImageEntity): GalleryImage {
    return new GalleryImage(entity);
  }

  async create(image: Partial<GalleryImage>): Promise<GalleryImage> {
    const entity = this.repo.create(image);
    const saved = await this.repo.save(entity);
    return this.mapToDomain(saved);
  }

  async findAll(): Promise<GalleryImage[]> {
    const entities = await this.repo.find({ order: { createdAt: 'DESC' } });
    return entities.map(this.mapToDomain);
  }

  async findById(id: string): Promise<GalleryImage | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapToDomain(entity) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
