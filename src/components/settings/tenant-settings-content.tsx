'use client';

import { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, PartyPopper, Settings as SettingsIcon } from 'lucide-react';

import { UserNav } from "@/components/layout/user-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { MercadoPagoSettingsSchema } from '@/lib/schemas';
import { getMercadoPagoSettings, updateMercadoPagoSettings } from '@/app/(tenant)/settings/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from '@/components/ui/badge';

// --- Componente do Logo (solução alternativa) ---
function MercadoPagoLogo({ className }: { className?: string }) {
    return (
        <svg id="logos" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1048.82 425.2" className={className}>
            <defs><style>{`.cls-1{fill:#0a0080}.cls-1,.cls-2,.cls-3{stroke-width:0}.cls-2{fill:#fff}.cls-3{fill:#00bcff}`}</style></defs>
            <path className="cls-3" d="m274.38,116.94c-77.83,0-140.91,40.36-140.91,90.15s63.09,94.05,140.91,94.05,140.91-44.27,140.91-94.05-63.09-90.15-140.91-90.15Z" />
            <ellipse className="cls-1" cx="274.38" cy="207.1" rx="77.81" ry="51.75" />
            <path className="cls-2" d="m291.41,192.52c-1.55-5.98-7.18-10.11-13.44-10.11-5.02,0-9.52,2.59-11.85,6.58-2.33-3.99-6.83-6.58-11.85-6.58-6.26,0-11.9,4.13-13.44,10.11l-8.78,33.93c-1,3.87,1.33,7.86,5.2,8.86.6.16,1.21.23,1.82.23,3.22,0,6.15-2.18,7.04-5.43l8.78-33.93c.52-2,2.39-3.37,4.48-3.37s3.96,1.37,4.48,3.37l8.78,33.93c1,3.87,4.99,6.2,8.86,5.2,3.87-1,6.2-4.99,5.2-8.86l-8.78-33.93h0Zm-42.95,0c-1.55-5.98-7.18-10.11-13.44-10.11-7.63,0-13.83,6.2-13.83,13.83v33.93c0,3.99,3.23,7.22,7.22,7.22s7.22-3.23,7.22-7.22v-33.93c0-.79.65-1.44,1.44-1.44s1.28.53,1.44,1.44l8.78,33.93c1,3.87,4.99,6.2,8.86,5.2,3.87-1,6.2-4.99,5.2-8.86l-8.78-33.93h0Z" />
        </svg>
    );
}

export type MercadoPagoSettings = z.infer<typeof MercadoPagoSettingsSchema>;

export function TenantSettingsContent() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentSettings, setCurrentSettings] = useState<MercadoPagoSettings | null>(null);

    const form = useForm<MercadoPagoSettings>({
        resolver: zodResolver(MercadoPagoSettingsSchema),
        defaultValues: {
            mode: 'sandbox',
            sandbox_public_key: '',
            sandbox_access_token: '',
            sandbox_webhook_secret: '',
            production_public_key: '',
            production_access_token: '',
            production_webhook_secret: '',
            success_url: '',
            failure_url: '',
            pending_url: '',
        },
    });

    useEffect(() => {
        async function loadSettings() {
            try {
                const settings = await getMercadoPagoSettings();
                if (settings) {
                    setCurrentSettings(settings);
                    form.reset(settings);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar configurações",
                    description: "Não foi possível carregar as configurações do Mercado Pago.",
                });
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, [form, toast]);

    async function onSubmit(data: MercadoPagoSettings) {
        setIsSaving(true);
        try {
            const result = await updateMercadoPagoSettings(data);
            if (result.success) {
                toast({
                    title: "Configurações salvas!",
                    description: result.message,
                });
                setCurrentSettings(data);
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro ao salvar",
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro inesperado",
                description: "Não foi possível salvar as configurações.",
            });
        } finally {
            setIsSaving(false);
        }
    }

    const webhookUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.host}/api/webhook/mercadopago`
        : '';

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copiado!",
            description: "URL copiada para a área de transferência.",
        });
    };

    const currentMode = form.watch('mode');
    const isConfigured = currentSettings && (
        (currentMode === 'sandbox' && currentSettings.sandbox_public_key && currentSettings.sandbox_access_token) ||
        (currentMode === 'production' && currentSettings.production_public_key && currentSettings.production_access_token)
    );

    if (isLoading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
                    <UserNav userType="tenant" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
                    <p className="text-sm text-muted-foreground">
                        Gerencie as configurações de pagamento do seu serviço
                    </p>
                </div>
                <UserNav userType="tenant" />
            </div>

            <Separator />

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <MercadoPagoLogo className="h-8 w-auto" />
                            <div className="flex-1">
                                <CardTitle>Integração Mercado Pago</CardTitle>
                                <CardDescription>
                                    Configure suas credenciais de pagamento
                                </CardDescription>
                            </div>
                            {isConfigured && (
                                <Badge variant={currentMode === 'production' ? 'default' : 'secondary'}>
                                    {currentMode === 'production' ? 'Produção' : 'Sandbox'}
                                </Badge>
                            )}
                            {!isConfigured && (
                                <Badge variant="outline">Não configurado</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* Mode Toggle */}
                                <FormField
                                    control={form.control}
                                    name="mode"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">
                                                    Modo de Produção
                                                </FormLabel>
                                                <FormDescription>
                                                    Ative para usar credenciais de produção
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value === 'production'}
                                                    onCheckedChange={(checked) => 
                                                        field.onChange(checked ? 'production' : 'sandbox')
                                                    }
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <Separator />

                                {/* Sandbox Credentials */}
                                {currentMode === 'sandbox' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Credenciais de Teste (Sandbox)</h3>
                                        <FormField
                                            control={form.control}
                                            name="sandbox_public_key"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Public Key (Sandbox)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="APP_USR-..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="sandbox_access_token"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Access Token (Sandbox)</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="APP_USR-..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="sandbox_webhook_secret"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Webhook Secret (Sandbox)</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="Segredo do webhook" {...field} />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Usado para validar a autenticidade dos webhooks
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Production Credentials */}
                                {currentMode === 'production' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Credenciais de Produção</h3>
                                        <FormField
                                            control={form.control}
                                            name="production_public_key"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Public Key (Produção)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="APP_USR-..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="production_access_token"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Access Token (Produção)</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="APP_USR-..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="production_webhook_secret"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Webhook Secret (Produção)</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="Segredo do webhook" {...field} />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Usado para validar a autenticidade dos webhooks
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                <Separator />

                                {/* Webhook URL */}
                                <div className="space-y-2">
                                    <Label>URL do Webhook</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={webhookUrl}
                                            readOnly
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(webhookUrl)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Configure esta URL no painel do Mercado Pago para receber notificações de pagamento
                                    </p>
                                </div>

                                <Separator />

                                {/* Redirect URLs */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">URLs de Redirecionamento</h3>
                                    <FormField
                                        control={form.control}
                                        name="success_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>URL de Sucesso</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Redireciona o cliente após pagamento aprovado
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="failure_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>URL de Falha</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Redireciona o cliente após pagamento rejeitado
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="pending_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>URL de Pendente</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Redireciona o cliente após pagamento pendente
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

