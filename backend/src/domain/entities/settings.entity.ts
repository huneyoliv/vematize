export class Settings {
  id: string;
  logoUrl?: string;
  activeGateway?: 'mercadopago' | 'efi';
  preferredPixGateway?: 'mercadopago' | 'efi' | 'pushinpay';
  preferredCardGateway?: 'mercadopago' | 'efi';
  mercadopagoConfig?: Record<string, any>;
  efiConfig?: Record<string, any>;
  pushinpayConfig?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}
