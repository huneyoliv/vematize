'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StripeSettingsSchema } from '@/lib/schemas';
import { StripeSettings, updateSettings } from '@/app/settings/actions';
import { KrovSettings } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy } from 'lucide-react';

interface StripeConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: KrovSettings;
}

export function StripeConfigDialog({ open, onOpenChange, settings }: StripeConfigDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        setBaseUrl(window.location.origin);
    }, []);

    const webhookUrl = `${getApiUrl(baseUrl)}/global/webhook/stripe`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast({ title: 'Copiado!', description: 'URL do Webhook copiada.' });
    };

    const defaultValues: StripeSettings = {
        mode: settings.paymentIntegrations?.stripe?.mode || 'test',
        test_publishable_key: settings.paymentIntegrations?.stripe?.test_publishable_key || '',
        test_secret_key: settings.paymentIntegrations?.stripe?.test_secret_key || '',
        test_webhook_secret: settings.paymentIntegrations?.stripe?.test_webhook_secret || '',
        live_publishable_key: settings.paymentIntegrations?.stripe?.live_publishable_key || '',
        live_secret_key: settings.paymentIntegrations?.stripe?.live_secret_key || '',
        live_webhook_secret: settings.paymentIntegrations?.stripe?.live_webhook_secret || '',
        success_url: settings.paymentIntegrations?.stripe?.success_url || '',
        cancel_url: settings.paymentIntegrations?.stripe?.cancel_url || '',
    };

    const form = useForm<StripeSettings>({
        resolver: zodResolver(StripeSettingsSchema),
        defaultValues,
    });

    const mode = form.watch('mode');

    async function onSubmit(data: StripeSettings) {
        setIsLoading(true);
        try {
            const settingsToUpdate: KrovSettings = {
                ...settings,
                paymentIntegrations: {
                    ...settings.paymentIntegrations,
                    stripe: data,
                },
            };

            const result = await updateSettings(settingsToUpdate);

            if (result.success) {
                toast({
                    title: 'Sucesso',
                    description: 'Configurações do Stripe atualizadas com sucesso.',
                });
                onOpenChange(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Ocorreu um erro ao salvar as configurações.',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configurar Stripe</DialogTitle>
                    <DialogDescription>
                        Configure as credenciais da sua conta Stripe para processar pagamentos internacionais e assinaturas.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="mode"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Modo de Operação</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="test" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Test (Sandbox)
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="live" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Live (Produção)
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid gap-4 py-4">
                            {mode === 'test' ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="test_publishable_key"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Publishable Key (Test)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="pk_test_..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="test_secret_key"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Secret Key (Test)</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="sk_test_..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="test_webhook_secret"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Webhook Secret (Test)</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="whsec_..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="live_publishable_key"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Publishable Key (Live)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="pk_live_..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="live_secret_key"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Secret Key (Live)</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="sk_live_..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="live_webhook_secret"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Webhook Secret (Live)</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="whsec_..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <FormLabel>URL de Webhook</FormLabel>
                            <div className="flex items-center space-x-1.5">
                                <Input readOnly value={webhookUrl} className="bg-secondary text-xs h-8" />
                                <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={copyToClipboard}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground leading-tight">
                                Configure no Stripe → Developers → Webhooks
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function getApiUrl(baseUrl: string) {
    try {
        const url = new URL(baseUrl);
        if (!url.hostname.startsWith('api.')) {
            url.hostname = `api.${url.hostname}`;
        }
        url.pathname = '';
        return url.toString().replace(/\/$/, '');
    } catch (e) {
        return baseUrl.replace('://', '://api.');
    }
}
