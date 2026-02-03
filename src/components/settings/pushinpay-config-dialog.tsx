'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Loader2, Lock, LockOpen } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PushinPaySettingsSchema } from '@/lib/schemas';
import { updatePushinPaySettings, getTenantUnmaskedSettings } from '@/app/settings/actions';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

type PushinPaySettings = z.infer<typeof PushinPaySettingsSchema>;

interface PushinPayConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: PushinPaySettings | null;
    subdomain: string;
}

export function PushinPayConfigDialog({ open, onOpenChange, settings, subdomain }: PushinPayConfigDialogProps) {
    const { toast } = useToast();
    const [baseUrl, setBaseUrl] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [password, setPassword] = useState('');
    const [useCustomRedirects, setUseCustomRedirects] = useState(
        !!(settings?.success_url || settings?.failure_url || settings?.pending_url)
    );

    const form = useForm<PushinPaySettings>({
        resolver: zodResolver(PushinPaySettingsSchema),
        defaultValues: settings || {
            mode: 'sandbox',
            sandbox_api_key: '',
            sandbox_webhook_secret: '',
            production_api_key: '',
            production_webhook_secret: '',
        },
    });

    const { isSubmitting } = form.formState;
    const mode = form.watch('mode');
    const webhookUrl = `${getApiUrl(baseUrl)}/${subdomain}/webhook/${mode === 'sandbox' ? 'sandpushinpay' : 'pushinpay'}`;

    useEffect(() => {
        if (open) {
            form.reset(settings || { mode: 'sandbox' });
            setUseCustomRedirects(!!(settings?.success_url || settings?.failure_url || settings?.pending_url));
            setIsUnlocked(false);
            setShowPasswordPrompt(false);
            setPassword('');
        }
        setBaseUrl(window.location.origin);
    }, [open, settings, form]);

    const handleLockClick = () => {
        if (isUnlocked) {
            setIsUnlocked(false);
            toast({ title: 'Bloqueado', description: 'Edição bloqueada novamente.' });
        } else {
            setShowPasswordPrompt(true);
        }
    };

    async function handleUnlock() {
        if (!password) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Digite sua senha.' });
            return;
        }

        setIsValidating(true);
        const result = await getTenantUnmaskedSettings(password);
        setIsValidating(false);

        if (result.success && result.data?.pushinpay) {
            setIsUnlocked(true);
            setShowPasswordPrompt(false);
            setPassword('');
            form.reset(result.data.pushinpay);
            toast({ title: 'Desbloqueado!', description: 'Agora você pode editar as credenciais.' });
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.message || 'Erro ao desbloquear.' });
        }
    }

    async function onSubmit(data: PushinPaySettings) {
        if (!isUnlocked) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa desbloquear para salvar.' });
            return;
        }
        let submissionData = { ...data };
        if (!useCustomRedirects) {
            submissionData = {
                ...submissionData,
                success_url: '',
                failure_url: '',
                pending_url: '',
            };
        }

        const result = await updatePushinPaySettings(submissionData);
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
                <DialogHeader className="space-y-1 flex-shrink-0 pr-10">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg">Configurar PushinPay</DialogTitle>
                        <Button
                            type="button"
                            variant={isUnlocked ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={handleLockClick}
                            title={isUnlocked ? "Bloquear edição" : "Desbloquear edição"}
                        >
                            {isUnlocked ? (
                                <LockOpen className="h-3.5 w-3.5" />
                            ) : (
                                <Lock className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </div>
                    <DialogDescription className="text-xs">
                        Configure as credenciais do PushinPay para processar pagamentos PIX
                    </DialogDescription>
                </DialogHeader>

                {showPasswordPrompt && !isUnlocked && (
                    <Alert className="border-yellow-500/50 bg-yellow-500/10 py-2 flex-shrink-0 mb-4">
                        <Lock className="h-3.5 w-3.5 text-yellow-500" />
                        <AlertDescription className="space-y-2">
                            <p className="text-xs font-medium">Digite sua senha para desbloquear:</p>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                    disabled={isValidating}
                                    autoFocus
                                    className="h-8 text-sm"
                                />
                                <Button
                                    onClick={handleUnlock}
                                    disabled={isValidating}
                                    size="sm"
                                    className="h-8"
                                >
                                    {isValidating ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        'OK'
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                        setShowPasswordPrompt(false);
                                        setPassword('');
                                    }}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

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
                                                    disabled={!isUnlocked}
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
                                    key={`api_key_${mode}`}
                                    control={form.control}
                                    name={mode === 'sandbox' ? 'sandbox_api_key' : 'production_api_key'}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">API Key</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type={isUnlocked ? "text" : "password"}
                                                    placeholder={isUnlocked ? "Sua API Key..." : "••••••••"}
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    disabled={!isUnlocked}
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
                                    name={mode === 'sandbox' ? 'sandbox_webhook_secret' : 'production_webhook_secret'}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Webhook Secret</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type={isUnlocked ? "text" : "password"}
                                                    placeholder={isUnlocked ? "Seu secret..." : "••••••••"}
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    disabled={!isUnlocked}
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
                                    Configure no painel do PushinPay → Webhooks
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 flex-shrink-0 mt-3">
                            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" size="sm" disabled={!isUnlocked || isSubmitting}>
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





