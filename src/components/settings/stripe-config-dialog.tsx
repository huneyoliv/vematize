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
import { StripeSettingsSchema } from '@/lib/schemas';
import { updateStripeSettings } from '@/app/settings/actions';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type StripeSettings = z.infer<typeof StripeSettingsSchema>;

interface StripeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: StripeSettings | null;
  subdomain: string;
}

export function StripeConfigDialog({ open, onOpenChange, settings, subdomain }: StripeConfigDialogProps) {
    const { toast } = useToast();
    const [baseUrl, setBaseUrl] = useState('');
    const [useCustomRedirects, setUseCustomRedirects] = useState(
        !!(settings?.success_url || settings?.cancel_url)
    );

    const form = useForm<StripeSettings>({
        resolver: zodResolver(StripeSettingsSchema),
        defaultValues: settings || {
            mode: 'test',
            test_publishable_key: '',
            test_secret_key: '',
            test_webhook_secret: '',
            live_publishable_key: '',
            live_secret_key: '',
            live_webhook_secret: '',
        },
    });
    
    const { isSubmitting } = form.formState;
    const mode = form.watch('mode');
    const webhookUrl = `${baseUrl}/api/webhook/stripe`;

    useEffect(() => {
        if (open) {
            form.reset(settings || { mode: 'test' });
            setUseCustomRedirects(!!(settings?.success_url || settings?.cancel_url));
        }
        setBaseUrl(window.location.origin);
    }, [open, settings, form]);
    
    async function onSubmit(data: StripeSettings) {
        let submissionData = { ...data };
        if (!useCustomRedirects) {
            submissionData = {
                ...submissionData,
                success_url: '',
                cancel_url: '',
            };
        }

        const result = await updateStripeSettings(submissionData);
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
                <DialogTitle className="text-lg">Configurar Stripe</DialogTitle>
                <DialogDescription className="text-xs">
                    Configure as credenciais do Stripe para processar pagamentos internacionais
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
                                            Test (teste) ou Live (produção)
                                        </FormDescription>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                        <Label className={`text-xs ${field.value === 'test' ? 'font-bold' : ''}`}>Test</Label>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value === 'live'}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked ? 'live' : 'test');
                                                    }}
                                                />
                                            </FormControl>
                                        <Label className={`text-xs ${field.value === 'live' ? 'font-bold' : ''}`}>Live</Label>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <Separator className="my-2" />
                        
                        <div className="space-y-2" key={mode}>
                            <h3 className="text-sm font-medium">
                                Credenciais de {mode === 'test' ? 'Teste' : 'Produção (Live)'}
                            </h3>
                            <FormField
                                key={`publishable_key_${mode}`}
                                control={form.control}
                                name={mode === 'test' ? 'test_publishable_key' : 'live_publishable_key'}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Publishable Key</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="pk_..." 
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
                                key={`secret_key_${mode}`}
                                control={form.control}
                                name={mode === 'test' ? 'test_secret_key' : 'live_secret_key'}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Secret Key</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                placeholder="sk_..." 
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
                                key={`webhook_secret_${mode}`}
                                control={form.control}
                                name={mode === 'test' ? 'test_webhook_secret' : 'live_webhook_secret'}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm">Webhook Secret</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                placeholder="whsec_..." 
                                                {...field} 
                                                value={field.value ?? ''} 
                                                className="text-sm"
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            Secret para validação de webhooks.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                        name="cancel_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">URL de Cancelamento</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="https://seusite.com/cancelado" 
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
                                Configure no Stripe → Developers → Webhooks
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





