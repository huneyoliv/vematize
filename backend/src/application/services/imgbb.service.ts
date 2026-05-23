import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GalleryImageRepository } from '../../infrastructure/database/repositories/gallery-image.repository';
import { GalleryImage } from '../../domain/entities';

@Injectable()
export class ImgbbService {
  private readonly logger = new Logger(ImgbbService.name);

  constructor(private readonly galleryRepo: GalleryImageRepository) {}

  async uploadImage(file: Express.Multer.File): Promise<GalleryImage> {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      this.logger.error('IMGBB_API_KEY não configurada no .env');
      throw new BadRequestException('Configuração de upload de imagem ausente (IMGBB_API_KEY).');
    }

    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer as any], { type: file.mimetype });
      formData.append('image', blob, file.originalname);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(`Erro do ImgBB: ${response.status}`, errorData);
        throw new BadRequestException('Falha ao fazer upload para o ImgBB.');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new BadRequestException('Erro retornado pelo ImgBB.');
      }

      const imageUrl = data.data.url;
      const deleteUrl = data.data.delete_url;
      const name = data.data.title || file.originalname;

      // Salva na galeria (banco de dados)
      const galleryImage = await this.galleryRepo.create({
        url: imageUrl,
        deleteUrl,
        name,
      });

      return galleryImage;
    } catch (error: any) {
      this.logger.error(`Erro ao fazer upload da imagem: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro interno ao processar o upload da imagem.');
    }
  }

  async getAllImages(): Promise<GalleryImage[]> {
    return this.galleryRepo.findAll();
  }

  async deleteImage(id: string): Promise<void> {
    // Nota: O ImgBB não tem API direta de delete que use apenas API KEY sem autenticação de usuário (OAuth),
    // a menos que chamemos a deleteUrl. Mas deleteUrl normalmente requer estar logado no ImgBB na web ou é um link web.
    // Vamos apenas remover do nosso banco de dados.
    await this.galleryRepo.delete(id);
  }
}
