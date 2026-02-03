'use client';

import { useState, useEffect } from "react";
import { useToast } from '@/hooks/use-toast';
import {
    getMercadoPagoSettings,
    getPushinPaySettings,
    getStripeSettings,
    getDiscordSettings,
    updateDiscordSettings,
    MercadoPagoSettings,
    PushinPaySettings,
    StripeSettings
} from '@/app/settings/actions';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentSettings } from './payment-settings';

interface TenantSettingsContentProps {
    subdomain: string;
}

export function TenantSettingsContent({ subdomain }: TenantSettingsContentProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [mercadoPagoSettings, setMercadoPagoSettings] = useState<MercadoPagoSettings | null>(null);
    const [pushinPaySettings, setPushinPaySettings] = useState<PushinPaySettings | null>(null);
    const [stripeSettings, setStripeSettings] = useState<StripeSettings | null>(null);
    const [discordSettings, setDiscordSettings] = useState<any>(null);

    useEffect(() => {
        async function loadSettings() {
            try {
                const [mpSettings, ppSettings, strSettings, discSettings] = await Promise.all([
                    getMercadoPagoSettings(),
                    getPushinPaySettings(),
                    getStripeSettings(),
                    getDiscordSettings(),
                ]);

                setMercadoPagoSettings(mpSettings);
                setPushinPaySettings(ppSettings);
                setStripeSettings(strSettings);
                setDiscordSettings(discSettings);
            } catch (error) {
                console.error('Failed to load settings:', error);
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar configurações",
                    description: "Não foi possível carregar as configurações.",
                });
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, [toast]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
                <p className="text-sm text-muted-foreground">
                    Gerencie as configurações do seu serviço
                </p>
            </div>

            <Separator />

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações do Discord</h3>
                <div className="flex items-center space-x-2">
                    <Switch
                        id="coupons-mode"
                        checked={discordSettings?.couponsEnabled !== false}
                        onCheckedChange={async (checked) => {
                            setDiscordSettings({ ...discordSettings, couponsEnabled: checked });
                            await updateDiscordSettings({ couponsEnabled: checked });
                            toast({ title: "Configurações atualizadas", description: `Cupons ${checked ? 'habilitados' : 'desabilitados'}.` });
                        }}
                    />
                    <Label htmlFor="coupons-mode">Habilitar Cupons</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                    Se desativado, o botão "Usar Cupom" não aparecerá para os clientes no Discord.
                </p>
            </div>

            <Separator />

            <PaymentSettings
                mercadoPagoSettings={mercadoPagoSettings}
                pushinPaySettings={pushinPaySettings}
                stripeSettings={stripeSettings}
                subdomain={subdomain}
            />
        </div>
    );
}
