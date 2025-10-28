'use client';

import { useState, useEffect } from "react";
import { useToast } from '@/hooks/use-toast';
import {
    getMercadoPagoSettings,
    getPushinPaySettings,
    getStripeSettings,
    MercadoPagoSettings,
    PushinPaySettings,
    StripeSettings
} from '@/app/settings/actions';
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

    useEffect(() => {
        async function loadSettings() {
            try {
                const [mpSettings, ppSettings, strSettings] = await Promise.all([
                    getMercadoPagoSettings(),
                    getPushinPaySettings(),
                    getStripeSettings(),
                ]);

                setMercadoPagoSettings(mpSettings);
                setPushinPaySettings(ppSettings);
                setStripeSettings(strSettings);
            } catch (error) {
                console.error('Failed to load settings:', error);
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar configurações",
                    description: "Não foi possível carregar as configurações de pagamento.",
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
                    Gerencie as configurações de pagamento do seu serviço
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
