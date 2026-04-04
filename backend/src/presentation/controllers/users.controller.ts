import { Controller, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserRepository } from '../../infrastructure/database/repositories/user.repository';
import { UpdateUserDto } from '../../application/dtos/update-user.dto';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly userRepo: UserRepository) {}

  @Get()
  async findAll() {
    return this.userRepo.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userRepo.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userRepo.update(id, dto as any);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.userRepo.delete(id);
    return { success: deleted };
  }
}

