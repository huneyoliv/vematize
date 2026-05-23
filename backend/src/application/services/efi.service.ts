import { Injectable } from '@nestjs/common';
import { SettingsRepository } from '../../infrastructure/database/repositories/settings.repository';

export interface EfiPixResult {
  success: boolean;
  message: string;
  txid?: string;
  qrCode?: string;
  qrCodeBase64?: string;
}

@Injectable()
export class EfiService {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  private async getEfiInstance() {
    const EfiPay = (await import('sdk-node-apis-efi')).default;

    const settings = await this.settingsRepo.get();
    if (!settings?.efiConfig) {
      throw new Error('Efí não configurada');
    }

    const config = settings.efiConfig;
    console.log('[Debug] Inicializando instancia Efi Pay em producao');
    const options = {
      sandbox: false,
      client_id: config.production_client_id as string,
      client_secret: config.production_client_secret as string,
      certificate: config.certificate,
      pem: true,
    };

    return new EfiPay(options);
  }

  async createPixCharge(
    amount: number,
    description: string,
    saleId: string,
    expireSeconds = 600,
  ): Promise<EfiPixResult> {
    try {
      const efi = await this.getEfiInstance();

      const settings = await this.settingsRepo.get();
      const pixKey = settings?.efiConfig?.pix_key;

      if (!pixKey) {
        return { success: false, message: 'Chave Pix não configurada na Efí.' };
      }

      const body = {
        calendario: {
          expiracao: expireSeconds,
        },
        valor: {
          original: amount.toFixed(2),
        },
        chave: pixKey,
        solicitacaoPagador: description,
        infoAdicionais: [
          {
            nome: 'Ref',
            valor: saleId,
          },
        ],
      };

      const response = await efi.pixCreateImmediateCharge({}, body);

      const params = { id: response.loc.id };
      const qrCodeResponse = await efi.pixGenerateQRCode(params);

      return {
        success: true,
        message: 'Cobrança Pix criada.',
        txid: response.txid,
        qrCode: qrCodeResponse.qrcode,
        qrCodeBase64: qrCodeResponse.imagemQrcode,
      };
    } catch (error: any) {
      console.error('[Efí] Erro ao criar cobrança Pix:', error?.message);
      return { success: false, message: 'Erro ao criar cobrança Pix: ' + (error?.message || 'desconhecido') };
    }
  }

  async getPixCharge(txid: string) {
    const efi = await this.getEfiInstance();
    return efi.pixDetailCharge({ txid });
  }

  async registerWebhook(webhookUrl: string) {
    const efi = await this.getEfiInstance();
    const settings = await this.settingsRepo.get();
    const pixKey = settings?.efiConfig?.pix_key;

    if (!pixKey) throw new Error('Chave Pix não configurada');

    return efi.pixConfigWebhook({ chave: pixKey }, { webhookUrl });
  }
}
