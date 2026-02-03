'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KrovSettings } from '@/lib/types';
import { MercadoPagoLogo } from '@/components/icons/mercadopago-logo';
import { MercadoPagoConfigDialog } from './mercadopago-config-dialog';
import { EfiConfigDialog } from './efi-config-dialog';
import { StripeConfigDialog } from './stripe-config-dialog';
import { CreditCard, Wallet, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface PaymentSettingsFormProps {
    settings: KrovSettings;
}

export function PaymentSettingsForm({ settings }: PaymentSettingsFormProps) {
    const [isMercadoPagoDialogOpen, setMercadoPagoDialogOpen] = useState(false);
    const [isEfiDialogOpen, setEfiDialogOpen] = useState(false);
    const [isPushinPayDialogOpen, setPushinPayDialogOpen] = useState(false);
    const [isStripeDialogOpen, setStripeDialogOpen] = useState(false);

    const [preferredPix, setPreferredPix] = useState<'mercadopago' | 'efi' | 'pushinpay'>(settings.preferredPixGateway || 'mercadopago');
    const [preferredCard, setPreferredCard] = useState<'mercadopago' | 'efi' | 'stripe'>(settings.preferredCardGateway || 'mercadopago');
    const [isSaving, setIsSaving] = useState(false);

    const { toast } = useToast();

    const mpSettings = settings.paymentIntegrations?.mercadopago;
    const efiSettings = settings.paymentIntegrations?.efi;
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

    async function handleSavePreferences() {
        setIsSaving(true);
        try {
            const { updateSettings } = await import('@/app/settings/actions');
            const result = await updateSettings({
                ...settings,
                preferredPixGateway: preferredPix,
                preferredCardGateway: preferredCard
            });

            if (result.success) {
                toast({
                    title: "Sucesso",
                    description: "Preferências de gateway salvas com sucesso!",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Ocorreu um erro ao salvar as preferências.",
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <MercadoPagoConfigDialog
                open={isMercadoPagoDialogOpen}
                onOpenChange={setMercadoPagoDialogOpen}
                settings={settings}
            />
            <EfiConfigDialog
                open={isEfiDialogOpen}
                onOpenChange={setEfiDialogOpen}
                settings={settings}
            />
            <StripeConfigDialog
                open={isStripeDialogOpen}
                onOpenChange={setStripeDialogOpen}
                settings={settings}
            />
            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle>Integrações de Pagamento</CardTitle>
                    <CardDescription>
                        Gerencie as integrações de gateway de pagamento para o sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Gateway Preferences Section */}
                    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Preferências de Roteamento</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Gateway Preferencial para PIX</label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={preferredPix}
                                    onChange={(e) => setPreferredPix(e.target.value as any)}
                                >
                                    <option value="mercadopago">Mercado Pago</option>
                                    <option value="efi">Efí Bank</option>
                                    <option value="pushinpay">PushinPay</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Gateway Preferencial para Cartão</label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={preferredCard}
                                    onChange={(e) => setPreferredCard(e.target.value as any)}
                                >
                                    <option value="mercadopago">Mercado Pago</option>
                                    <option value="efi">Efí Bank</option>
                                    <option value="stripe">Stripe</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSavePreferences} disabled={isSaving} size="sm">
                                {isSaving ? 'Salvando...' : 'Salvar Preferências'}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Card className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="relative h-16 w-16">
                                    <Image
                                        src="/images/payments/mercadopago.svg"
                                        alt="Mercado Pago"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
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
                                <div className="relative h-16 w-16">
                                    <Image
                                        src="/images/payments/efi.svg"
                                        alt="Efí Bank"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Efí Bank</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Pagamentos via Pix e Assinaturas (Boletos/Pix).
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge variant={
                                    efiSettings?.mode === 'production' && efiSettings.production_client_id ? 'default' :
                                        efiSettings?.mode === 'sandbox' && efiSettings.sandbox_client_id ? 'outline' :
                                            'secondary'
                                }>
                                    {efiSettings?.mode === 'production' && efiSettings.production_client_id ? 'Produção' :
                                        efiSettings?.mode === 'sandbox' && efiSettings.sandbox_client_id ? 'Sandbox' :
                                            'Inativo'}
                                </Badge>
                                <Button
                                    variant="outline"
                                    onClick={() => setEfiDialogOpen(true)}
                                >
                                    Configurar
                                </Button>
                            </div>
                        </Card>

                        <Card className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="relative h-16 w-16">
                                    <Image
                                        src="/images/payments/pushinpay.png"
                                        alt="PushinPay"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
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
                                <div className="relative h-16 w-16">
                                    <Image
                                        src="/images/payments/stripe.png"
                                        alt="Stripe"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
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
                                >
                                    Configurar
                                </Button>
                            </div>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}