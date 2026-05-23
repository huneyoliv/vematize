import { Controller, Post, UseInterceptors, UploadedFile, Get, Delete, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImgbbService } from '../../application/services/imgbb.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/gallery')
@UseGuards(JwtAuthGuard)
export class GalleryController {
  constructor(private readonly imgbbService: ImgbbService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    return this.imgbbService.uploadImage(file);
  }

  @Get()
  async getAllImages() {
    return this.imgbbService.getAllImages();
  }

  @Delete(':id')
  async deleteImage(@Param('id') id: string) {
    await this.imgbbService.deleteImage(id);
    return { success: true };
  }
}
