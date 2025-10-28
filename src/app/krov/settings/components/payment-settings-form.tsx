'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KrovSettings } from '@/lib/types';
import { MercadoPagoLogo } from '@/components/icons/mercadopago-logo';
import { MercadoPagoConfigDialog } from './mercadopago-config-dialog';
import { CreditCard, Wallet } from 'lucide-react';

interface PaymentSettingsFormProps {
  settings: KrovSettings;
}

export function PaymentSettingsForm({ settings }: PaymentSettingsFormProps) {
  const [isMercadoPagoDialogOpen, setMercadoPagoDialogOpen] = useState(false);
  const [isPushinPayDialogOpen, setPushinPayDialogOpen] = useState(false);
  const [isStripeDialogOpen, setStripeDialogOpen] = useState(false);

  const mpSettings = settings.paymentIntegrations?.mercadopago;
  const ppSettings = settings.paymentIntegrations?.pushinpay;
  const stripeSettings = settings.paymentIntegrations?.stripe;

  let statusText: 'Produção' | 'Sandbox' | 'Inativo' = 'Inativo';
  let badgeVariant: 'default' | 'secondary' | 'outline' = 'secondary';

  // Verifica o modo ativo e se as credenciais necessárias existem
  if (mpSettings?.mode === 'production') {
    if (mpSettings.production_access_token && mpSettings.production_public_key) {
      statusText = 'Produção';
      badgeVariant = 'default';
    }
  } else if (mpSettings?.mode === 'sandbox') {
    if (mpSettings.sandbox_access_token && mpSettings.sandbox_public_key) {
      statusText = 'Sandbox';
      badgeVariant = 'outline';
    }
  }

  return (
    <>
      <MercadoPagoConfigDialog 
        open={isMercadoPagoDialogOpen} 
        onOpenChange={setMercadoPagoDialogOpen}
        settings={settings}
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Integrações de Pagamento</CardTitle>
          <CardDescription>
            Gerencie as integrações de gateway de pagamento para o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Card className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    <MercadoPagoLogo className="h-8 w-auto" />
                    <div>
                        <h3 className="font-semibold">Mercado Pago</h3>
                        <p className="text-sm text-muted-foreground">
                            O gateway de pagamento principal/fallback.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant={badgeVariant}>
                        {statusText}
                    </Badge>
                    <Button 
                        variant="outline" 
                        onClick={() => setMercadoPagoDialogOpen(true)}
                    >
                        Configurar
                    </Button>
                </div>
            </Card>

            <Card className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    <Wallet className="h-8 w-8 text-green-500" />
                    <div>
                        <h3 className="font-semibold">PushinPay</h3>
                        <p className="text-sm text-muted-foreground">
                            Gateway de pagamento via PIX instantâneo.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant={
                        ppSettings?.mode === 'production' && ppSettings.production_api_key ? 'default' :
                        ppSettings?.mode === 'sandbox' && ppSettings.sandbox_api_key ? 'outline' :
                        'secondary'
                    }>
                        {ppSettings?.mode === 'production' && ppSettings.production_api_key ? 'Produção' :
                         ppSettings?.mode === 'sandbox' && ppSettings.sandbox_api_key ? 'Sandbox' :
                         'Inativo'}
                    </Badge>
                    <Button 
                        variant="outline" 
                        onClick={() => setPushinPayDialogOpen(true)}
                        disabled
                    >
                        Em Breve
                    </Button>
                </div>
            </Card>

            <Card className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-purple-500" />
                    <div>
                        <h3 className="font-semibold">Stripe</h3>
                        <p className="text-sm text-muted-foreground">
                            Processamento internacional de pagamentos.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant={
                        stripeSettings?.mode === 'live' && stripeSettings.live_secret_key ? 'default' :
                        stripeSettings?.mode === 'test' && stripeSettings.test_secret_key ? 'outline' :
                        'secondary'
                    }>
                        {stripeSettings?.mode === 'live' && stripeSettings.live_secret_key ? 'Live' :
                         stripeSettings?.mode === 'test' && stripeSettings.test_secret_key ? 'Test' :
                         'Inativo'}
                    </Badge>
                    <Button 
                        variant="outline" 
                        onClick={() => setStripeDialogOpen(true)}
                        disabled
                    >
                        Em Breve
                    </Button>
                </div>
            </Card>
        </CardContent>
      </Card>
    </>
  );
} 