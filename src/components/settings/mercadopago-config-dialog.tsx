'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Loader2 } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MercadoPagoSettingsSchema } from '@/lib/schemas';
import { updateMercadoPagoSettings } from '@/app/settings/actions';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type MercadoPagoSettings = z.infer<typeof MercadoPagoSettingsSchema>;

interface MercadoPagoConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: MercadoPagoSettings | null;
  subdomain: string;
}

export function MercadoPagoConfigDialog({ open, onOpenChange, settings, subdomain }: MercadoPagoConfigDialogProps) {
    const { toast } = useToast();
    const [baseUrl, setBaseUrl] = useState('');
    const [useCustomRedirects, setUseCustomRedirects] = useState(
        !!(settings?.success_url || settings?.failure_url || settings?.pending_url)
    );

    const form = useForm<MercadoPagoSettings>({
        resolver: zodResolver(MercadoPagoSettingsSchema),
        defaultValues: settings || {
            mode: 'sandbox',
            sandbox_public_key: '',
            sandbox_access_token: '',
            production_public_key: '',
            production_access_token: '',
            sandbox_webhook_secret: '',
            production_webhook_secret: '',
        },
    });
    
    const { isSubmitting } = form.formState;
    const mode = form.watch('mode');
    const webhookUrl = `${baseUrl}/api/webhook/${mode === 'sandbox' ? 'sandmercadopago' : 'mercadopago'}`;

    useEffect(() => {
        if (open) {
            form.reset(settings || { mode: 'sandbox' });
            setUseCustomRedirects(!!(settings?.success_url || settings?.failure_url || settings?.pending_url));
        }
        setBaseUrl(window.location.origin);
    }, [open, settings, form]);
    
    async function onSubmit(data: MercadoPagoSettings) {
        let submissionData = { ...data };
        if (!useCustomRedirects) {
            submissionData = {
                ...submissionData,
                success_url: '',
                failure_url: '',
                pending_url: '',
            };
        }

        const result = await updateMercadoPagoSettings(submissionData);
        toast({
            title: result.success ? 'Sucesso!' : 'Erro!',
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
        });
        if (result.success) {
            onOpenChange(false);
            window.location.reload();
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast({ title: 'Copiado!', description: 'URL do Webhook copiada.' });
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
            <DialogHeader className="space-y-1 flex-shrink-0">
                <DialogTitle className="text-lg">Configurar Mercado Pago</DialogTitle>
                <DialogDescription className="text-xs">
                    Configure as credenciais do Mercado Pago para processar pagamentos
                </DialogDescription>
            </DialogHeader>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <div className="space-y-3 overflow-y-auto flex-1 pr-2" style={{
                        overflowY: 'scroll',
                        WebkitOverflowScrolling: 'touch'
                    }}>
                        <FormField
                            control={form.control}
                            name="mode"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                                    <div className="space-y-0">
                                        <FormLabel className="text-sm">Modo de Operação</FormLabel>
                                        <FormDescription className="text-xs leading-tight">
                                            Sandbox (teste) ou Produção (real)
                                        </FormDescription>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                        <Label className={`text-xs ${field.value === 'sandbox' ? 'font-bold' : ''}`}>Sandbox</Label>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value === 'production'}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked ? 'production' : 'sandbox');
                                                    }}
                                                />
                                            </FormControl>
                                        <Label className={`text-xs ${field.value === 'production' ? 'font-bold' : ''}`}>Produção</Label>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <Separator className="my-2" />
                        
                        <div className="space-y-2" key={mode}>
                            <h3 className="text-sm font-medium">
                                Credenciais de {mode === 'sandbox' ? 'Teste (Sandbox)' : 'Produção'}
                            </h3>
                            <FormField
                                key={`public_key_${mode}`}
                                control={form.control}
                                name={mode === 'sandbox' ? 'sandbox_public_key' : 'production_public_key'}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Public Key</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="APP_USR-..." 
                                                {...field} 
                                                value={field.value ?? ''} 
                                                className="text-sm"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                key={`access_token_${mode}`}
                                control={form.control}
                                name={mode === 'sandbox' ? 'sandbox_access_token' : 'production_access_token'}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Access Token</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                placeholder="TEST-..." 
                                                {...field} 
                                                value={field.value ?? ''} 
                                                className="text-sm"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {mode === 'sandbox' ? (
                                <FormField
                                    control={form.control}
                                    name="sandbox_webhook_secret"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Webhook Secret (Sandbox)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="password" 
                                                    placeholder="Seu secret..." 
                                                    {...field} 
                                                    value={field.value ?? ''} 
                                                    className="text-sm"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Secret para validação de webhooks em Sandbox.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="production_webhook_secret"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Webhook Secret (Produção)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="password" 
                                                    placeholder="Seu secret..." 
                                                    {...field} 
                                                    value={field.value ?? ''} 
                                                    className="text-sm"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Secret para validação de webhooks em Produção.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium">URLs de Redirecionamento</h3>
                                    <p className="text-xs text-muted-foreground leading-tight">
                                        URLs customizadas (opcional)
                                    </p>
                                </div>
                                <Switch
                                    checked={useCustomRedirects}
                                    onCheckedChange={setUseCustomRedirects}
                                />
                            </div>

                            {useCustomRedirects && (
                                <div className="space-y-2">
                                    <FormField
                                        control={form.control}
                                        name="success_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">URL de Sucesso</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="https://seusite.com/sucesso" 
                                                        {...field} 
                                                        value={field.value ?? ''} 
                                                        className="text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="failure_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">URL de Falha</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="https://seusite.com/falha" 
                                                        {...field} 
                                                        value={field.value ?? ''} 
                                                        className="text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="pending_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">URL Pendente</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="https://seusite.com/pendente" 
                                                        {...field} 
                                                        value={field.value ?? ''} 
                                                        className="text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-1.5">
                             <Label className="text-xs">URL de Webhook</Label>
                             <div className="flex items-center space-x-1.5">
                                <Input readOnly value={webhookUrl} className="bg-secondary text-xs h-8" />
                                <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={copyToClipboard}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                             </div>
                             <p className="text-xs text-muted-foreground leading-tight">
                                Configure no Mercado Pago → Webhooks → Pagamentos
                             </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 flex-shrink-0 mt-3">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}


