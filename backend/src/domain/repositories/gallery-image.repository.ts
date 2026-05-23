import { GalleryImage } from '../entities';

export interface IGalleryImageRepository {
  create(image: Partial<GalleryImage>): Promise<GalleryImage>;
  findAll(): Promise<GalleryImage[]>;
  findById(id: string): Promise<GalleryImage | null>;
  delete(id: string): Promise<void>;
}
