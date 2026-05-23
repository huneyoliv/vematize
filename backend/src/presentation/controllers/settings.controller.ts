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
    console.log('[Debug] Iniciando atualizacao de configuracoes', { dto });
    const current = await this.settingsRepo.get();
    const mpConfig = dto.mercadopagoConfig !== undefined ? dto.mercadopagoConfig : current?.mercadopagoConfig;
    const efiConfig = dto.efiConfig !== undefined ? dto.efiConfig : current?.efiConfig;

    const isMpConfigured = () => {
      console.log('[Debug] Verificando se Mercado Pago esta configurado', { mpConfig });
      if (!mpConfig) {
        console.log('[Debug] Mercado Pago nao configurado: mpConfig e nulo');
        return false;
      }
      const mode = mpConfig.mode || 'production';
      console.log('[Debug] Modo de operacao do Mercado Pago:', { mode });
      if (mode === 'production' && mpConfig.production_access_token) {
        console.log('[Debug] Mercado Pago configurado com production_access_token');
        return true;
      }
      if (mpConfig.sandbox_access_token) {
        console.log('[Debug] Mercado Pago configurado com sandbox_access_token');
        return true;
      }
      if (mpConfig.production_access_token) {
        console.log('[Debug] Mercado Pago configurado com production_access_token (fallback)');
        return true;
      }
      console.log('[Debug] Mercado Pago nao configurado: nenhuma credencial encontrada');
      return false;
    };

    const isEfiConfigured = () => {
      console.log('[Debug] Verificando se Efi Bank esta configurado', { efiConfig });
      if (!efiConfig) {
        console.log('[Debug] Efi Bank nao configurado: efiConfig e nulo');
        return false;
      }
      console.log('[Debug] Modo de operacao do Efi Bank:', { mode: efiConfig.mode });
      if (efiConfig.mode === 'production' && efiConfig.production_client_id) {
        console.log('[Debug] Efi Bank configurado com production_client_id');
        return true;
      }
      if (efiConfig.sandbox_client_id) {
        console.log('[Debug] Efi Bank configurado com sandbox_client_id');
        return true;
      }
      console.log('[Debug] Efi Bank nao configurado: nenhuma credencial encontrada');
      return false;
    };

    if (dto.activeGateway === 'mercadopago' && !isMpConfigured()) {
      console.log('[Debug] Rejeitando ativacao: activeGateway Mercado Pago nao configurado');
      throw new BadRequestException('Configure as credenciais do Mercado Pago primeiro.');
    }
    if (dto.activeGateway === 'efi' && !isEfiConfigured()) {
      console.log('[Debug] Rejeitando ativacao: activeGateway Efi Bank nao configurado');
      throw new BadRequestException('Configure as credenciais do Efí Bank primeiro.');
    }

    if (dto.preferredPixGateway === 'mercadopago' && !isMpConfigured()) {
      console.log('[Debug] Rejeitando ativacao: preferredPixGateway Mercado Pago nao configurado');
      throw new BadRequestException('Configure as credenciais do Mercado Pago primeiro.');
    }
    if (dto.preferredPixGateway === 'efi' && !isEfiConfigured()) {
      console.log('[Debug] Rejeitando ativacao: preferredPixGateway Efi Bank nao configurado');
      throw new BadRequestException('Configure as credenciais do Efí Bank primeiro.');
    }

    console.log('[Debug] Salvando configuracoes via repository');
    return this.settingsRepo.upsert(dto as any);
  }

  @Get('domain')
  getDomain() {
    const domain = process.env.DOMAIN || 'localhost';
    return { domain, isLocalhost: domain === 'localhost' || domain === '127.0.0.1' };
  }

  @Post('upload-certificate')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.originalname.endsWith('.p12')) {
          return cb(new BadRequestException('Apenas arquivos .p12 sao aceitos'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadCertificate(
    @UploadedFile() file: Express.Multer.File,
    @Body('environment') environment: string,
  ) {
    console.log('[Debug] uploadCertificate acionado', { filename: file?.originalname, environment });
    if (!file) {
      console.log('[Debug] Erro no upload: Arquivo nao enviado');
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    if (!file.originalname.endsWith('.p12')) {
      console.log('[Debug] Erro no upload: Tipo do arquivo invalido');
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
    console.log('[Debug] registerEfiWebhook acionado', { webhookUrl });
    const domain = process.env.DOMAIN || 'localhost';
    if (domain === 'localhost' || domain === '127.0.0.1') {
      console.log('[Debug] Erro ao registrar webhook Efi: localhost detectado');
      throw new BadRequestException('Webhook nao pode ser configurado em localhost. Configure um dominio valido.');
    }

    if (!webhookUrl) {
      console.log('[Debug] Erro ao registrar webhook Efi: webhookUrl nao enviado');
      throw new BadRequestException('webhookUrl e obrigatorio');
    }

    try {
      const parsedUrl = new URL(webhookUrl);
      if (parsedUrl.protocol !== 'https:') {
        console.log('[Debug] Erro ao registrar webhook Efi: protocolo invalido', { protocol: parsedUrl.protocol });
        throw new BadRequestException('Apenas protocolo https e permitido para webhook');
      }
      if (parsedUrl.hostname !== domain) {
        console.log('[Debug] Erro ao registrar webhook Efi: hostname invalido', { hostname: parsedUrl.hostname, expected: domain });
        throw new BadRequestException(`O webhookUrl deve apontar para o dominio configurado: ${domain}`);
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      console.log('[Debug] Erro ao registrar webhook Efi: URL malformada', { error: e?.message });
      throw new BadRequestException('URL invalida');
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
