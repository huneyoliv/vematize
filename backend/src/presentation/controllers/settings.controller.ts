import { Controller, Get, Put, Post, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';
import { UpdateSettingsDto } from '../../application/dtos/settings.dto';

@Controller('api/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  @Get()
  async get() {
    return this.settingsRepo.get();
  }

  @Put()
  async update(@Body() dto: UpdateSettingsDto) {
    return this.settingsRepo.upsert(dto as any);
  }

  @Get('domain')
  getDomain() {
    const domain = process.env.DOMAIN || 'localhost';
    return { domain, isLocalhost: domain === 'localhost' || domain === '127.0.0.1' };
  }

  @Post('upload-certificate')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificate(
    @UploadedFile() file: Express.Multer.File,
    @Body('environment') environment: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    if (!file.originalname.endsWith('.p12')) {
      throw new BadRequestException('O arquivo deve ser .p12');
    }

    const validEnvs = ['sandbox', 'production'];
    if (!validEnvs.includes(environment)) {
      throw new BadRequestException('Environment deve ser sandbox ou production.');
    }

    const base64 = file.buffer.toString('base64');
    const fieldName = environment === 'production'
      ? 'production_certificate_base64'
      : 'sandbox_certificate_base64';

    const current = await this.settingsRepo.get();
    const efiConfig = current?.efiConfig || {};
    efiConfig[fieldName] = base64;

    await this.settingsRepo.upsert({ efiConfig });

    return {
      success: true,
      message: `Certificado ${environment === 'production' ? 'de produção' : 'de homologação'} enviado com sucesso.`,
      environment,
    };
  }

  @Post('efi-webhook')
  async registerEfiWebhook(@Body('webhookUrl') webhookUrl: string) {
    const domain = process.env.DOMAIN || 'localhost';
    if (domain === 'localhost' || domain === '127.0.0.1') {
      throw new BadRequestException('Webhook não pode ser configurado em localhost. Configure um domínio válido.');
    }

    const current = await this.settingsRepo.get();
    const efiConfig = current?.efiConfig;

    if (!efiConfig) {
      throw new BadRequestException('Configure as credenciais da Efí primeiro.');
    }

    const mode = efiConfig.mode || 'sandbox';
    const clientId = mode === 'production' ? efiConfig.production_client_id : efiConfig.sandbox_client_id;
    const clientSecret = mode === 'production' ? efiConfig.production_client_secret : efiConfig.sandbox_client_secret;
    const certBase64 = mode === 'production' ? efiConfig.production_certificate_base64 : efiConfig.sandbox_certificate_base64;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(`Credenciais de ${mode === 'production' ? 'produção' : 'homologação'} não configuradas.`);
    }

    if (!certBase64) {
      throw new BadRequestException(`Certificado de ${mode === 'production' ? 'produção' : 'homologação'} não enviado.`);
    }

    if (!efiConfig.pix_key) {
      throw new BadRequestException('Chave PIX não configurada.');
    }

    try {
      const https = await import('https');
      const certBuffer = Buffer.from(certBase64, 'base64');

      const baseUrl = mode === 'production'
        ? 'https://pix.api.efipay.com.br'
        : 'https://pix-h.api.efipay.com.br';

      const tokenResponse = await this.efiAuth(baseUrl, clientId, clientSecret, certBuffer);
      const accessToken = tokenResponse.access_token;

      const pixKey = efiConfig.pix_key;
      const encodedKey = encodeURIComponent(pixKey);

      const url = new URL(`${baseUrl}/v2/webhook/${encodedKey}`);

      const body = JSON.stringify({ webhookUrl });

      await new Promise<void>((resolve, reject) => {
        const req = https.request({
          method: 'PUT',
          hostname: url.hostname,
          path: url.pathname,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-skip-mtls-checking': 'true',
          },
          pfx: certBuffer,
          passphrase: '',
        }, (res) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve();
            } else {
              reject(new Error(`Efí retornou status ${res.statusCode}: ${data}`));
            }
          });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });

      return { success: true, message: 'Webhook registrado com sucesso na Efí!' };
    } catch (error: any) {
      throw new BadRequestException(`Erro ao registrar webhook: ${error.message}`);
    }
  }

  private async efiAuth(baseUrl: string, clientId: string, clientSecret: string, cert: Buffer): Promise<any> {
    const https = await import('https');
    const url = new URL(`${baseUrl}/oauth/token`);
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = JSON.stringify({ grant_type: 'client_credentials' });

    return new Promise((resolve, reject) => {
      const req = https.request({
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        pfx: cert,
        passphrase: '',
      }, (res) => {
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Erro ao parsear resposta de auth: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
