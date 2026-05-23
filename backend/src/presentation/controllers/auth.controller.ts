import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../../application/dtos/login.dto';
import { Throttle } from '@nestjs/throttler';
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
      throw new Error('ADMIN_PASSWORD deve ter no minimo 8 caracteres');
    }
    this.adminUser = this.config.get('ADMIN_USER', 'admin');
    this.initPassword(adminPassword);
  }

  private async initPassword(rawPassword: string) {
    this.adminPasswordHash = await bcrypt.hash(rawPassword, 12);
    this.initialized = true;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    console.log('[Debug] Tentativa de login recebida', { username: dto.username });
    if (!this.initialized) {
      console.log('[Debug] Erro no login: Servidor nao inicializado');
      throw new UnauthorizedException('Servidor ainda inicializando');
    }

    if (dto.username !== this.adminUser) {
      console.log('[Debug] Erro no login: Usuario invalido', { username: dto.username });
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const isValid = await bcrypt.compare(dto.password, this.adminPasswordHash);
    if (!isValid) {
      console.log('[Debug] Erro no login: Senha incorreta', { username: dto.username });
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const payload = { username: dto.username, sub: 'admin' };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '4h' }),
      user: { username: dto.username },
    };
  }
}
