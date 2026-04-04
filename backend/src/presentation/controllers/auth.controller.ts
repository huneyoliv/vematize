import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../../application/dtos/login.dto';
import * as bcrypt from 'bcryptjs';

@Controller('api/auth')
export class AuthController {
  private adminUser: string;
  private adminPasswordHash: string;
  private initialized = false;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    const adminPassword = this.config.getOrThrow<string>('ADMIN_PASSWORD');
    if (adminPassword.length < 8) {
      throw new Error('ADMIN_PASSWORD deve ter no mínimo 8 caracteres');
    }
    this.adminUser = this.config.get('ADMIN_USER', 'admin');
    this.initPassword(adminPassword);
  }

  private async initPassword(rawPassword: string) {
    this.adminPasswordHash = await bcrypt.hash(rawPassword, 12);
    this.initialized = true;
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    if (!this.initialized) {
      throw new UnauthorizedException('Servidor ainda inicializando');
    }

    if (dto.username !== this.adminUser) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isValid = await bcrypt.compare(dto.password, this.adminPasswordHash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { username: dto.username, sub: 'admin' };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '4h' }),
      user: { username: dto.username },
    };
  }
}
