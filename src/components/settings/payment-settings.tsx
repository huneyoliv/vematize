'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MercadoPagoLogo } from '@/components/icons/mercadopago-logo';
import { CreditCard, Wallet } from 'lucide-react';
import { MercadoPagoConfigDialog } from './mercadopago-config-dialog';
import { PushinPayConfigDialog } from './pushinpay-config-dialog';
import { StripeConfigDialog } from './stripe-config-dialog';
import { MercadoPagoSettings, PushinPaySettings, StripeSettings } from '@/app/settings/actions';

interface PaymentSettingsProps {
  mercadoPagoSettings: MercadoPagoSettings | null;
  pushinPaySettings: PushinPaySettings | null;
  stripeSettings: StripeSettings | null;
  subdomain: string;
}

export function PaymentSettings({ 
  mercadoPagoSettings, 
  pushinPaySettings, 
  stripeSettings, 
  subdomain 
}: PaymentSettingsProps) {
  const [isMercadoPagoDialogOpen, setMercadoPagoDialogOpen] = useState(false);
  const [isPushinPayDialogOpen, setPushinPayDialogOpen] = useState(false);
  const [isStripeDialogOpen, setStripeDialogOpen] = useState(false);

  return (
    <>
      <MercadoPagoConfigDialog 
        open={isMercadoPagoDialogOpen} 
        onOpenChange={setMercadoPagoDialogOpen}
        settings={mercadoPagoSettings}
        subdomain={subdomain}
      />
      <PushinPayConfigDialog 
        open={isPushinPayDialogOpen} 
        onOpenChange={setPushinPayDialogOpen}
        settings={pushinPaySettings}
        subdomain={subdomain}
      />
      <StripeConfigDialog 
        open={isStripeDialogOpen} 
        onOpenChange={setStripeDialogOpen}
        settings={stripeSettings}
        subdomain={subdomain}
      />

      <Card>
        <CardHeader>
          <CardTitle>Integrações de Pagamento</CardTitle>
          <CardDescription>
            Configure os métodos de pagamento que seus clientes poderão usar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mercado Pago */}
          <Card className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <MercadoPagoLogo className="h-8 w-auto" />
              <div>
                <h3 className="font-semibold">Mercado Pago</h3>
                <p className="text-sm text-muted-foreground">
                  Pagamentos via PIX e cartão de crédito
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={
                mercadoPagoSettings?.mode === 'production' && mercadoPagoSettings.production_access_token ? 'default' :
                mercadoPagoSettings?.mode === 'sandbox' && mercadoPagoSettings.sandbox_access_token ? 'outline' :
                'secondary'
              }>
                {mercadoPagoSettings?.mode === 'production' && mercadoPagoSettings.production_access_token ? 'Produção' :
                 mercadoPagoSettings?.mode === 'sandbox' && mercadoPagoSettings.sandbox_access_token ? 'Sandbox' :
                 'Inativo'}
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => setMercadoPagoDialogOpen(true)}
              >
                Configurar
              </Button>
            </div>
          </Card>

          {/* PushinPay */}
          <Card className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Wallet className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-semibold">PushinPay</h3>
                <p className="text-sm text-muted-foreground">
                  Pagamentos via PIX instantâneo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={
                pushinPaySettings?.mode === 'production' && pushinPaySettings.production_api_key ? 'default' :
                pushinPaySettings?.mode === 'sandbox' && pushinPaySettings.sandbox_api_key ? 'outline' :
                'secondary'
              }>
                {pushinPaySettings?.mode === 'production' && pushinPaySettings.production_api_key ? 'Produção' :
                 pushinPaySettings?.mode === 'sandbox' && pushinPaySettings.sandbox_api_key ? 'Sandbox' :
                 'Inativo'}
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => setPushinPayDialogOpen(true)}
              >
                Configurar
              </Button>
            </div>
          </Card>

          {/* Stripe */}
          <Card className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-purple-500" />
              <div>
                <h3 className="font-semibold">Stripe</h3>
                <p className="text-sm text-muted-foreground">
                  Pagamentos internacionais com cartão
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
              >
                Configurar
              </Button>
            </div>
          </Card>
        </CardContent>
      </Card>
    </>
  );
}





