'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EfiSettingsSchema } from '@/lib/schemas';
import { EfiSettings, updateSettings, getUnmaskedSettings, uploadCertificate, removePaymentIntegration, getBotServiceUrlAction } from '@/app/settings/actions';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, LockOpen, Upload, Trash2 } from 'lucide-react';

interface EfiConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: KrovSettings;
}

export function EfiConfigDialog({ open, onOpenChange, settings }: EfiConfigDialogProps) {
    const { toast } = useToast();
    const [baseUrl, setBaseUrl] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [password, setPassword] = useState('');
    const lastActivityRef = useRef<number>(Date.now());
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

    const form = useForm<EfiSettings>({
        resolver: zodResolver(EfiSettingsSchema),
        defaultValues: settings.paymentIntegrations?.efi || {
            mode: 'sandbox',
            sandbox_client_id: '',
            sandbox_client_secret: '',
            production_client_id: '',
            production_client_secret: '',
            pix_key: '',
            certificate: '',
        },
    });

    const { isSubmitting } = form.formState;
    const mode = form.watch('mode');
    const [botServiceUrl, setBotServiceUrl] = useState<string | null>(null);

    useEffect(() => {
        getBotServiceUrlAction().then(setBotServiceUrl);
    }, []);

    const webhookUrl = botServiceUrl
        ? `${botServiceUrl}/api/v1/efi/webhook`
        : `${getApiUrl(baseUrl)}/api/v1/efi/webhook`;

    // Reseta inatividade timer
    const resetInactivityTimer = useCallback(() => {
        lastActivityRef.current = Date.now();

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }

        if (isUnlocked) {
            inactivityTimerRef.current = setTimeout(() => {
                setIsUnlocked(false);
                toast({
                    title: 'Sessão Expirada',
                    description: 'O editor foi bloqueado por inatividade.',
                    variant: 'default'
                });
            }, 30000);
        }
    }, [isUnlocked, toast]);

    // Detecta atividade
    useEffect(() => {
        if (!isUnlocked) return;

        const handleActivity = () => resetInactivityTimer();

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity, true);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity, true);
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [isUnlocked, resetInactivityTimer]);

    useEffect(() => {
        if (open) {
            const currentEfiSettings = settings.paymentIntegrations?.efi;
            form.reset(currentEfiSettings || { mode: 'sandbox' });
            setIsUnlocked(false);
            setShowPasswordPrompt(false);
            setPassword('');
        } else {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
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
        const result = await getUnmaskedSettings(password);
        setIsValidating(false);

        if (result.success && result.data) {
            setIsUnlocked(true);
            setShowPasswordPrompt(false);
            setPassword('');

            // Carrega as credenciais reais (não mascaradas) do banco de dados
            const unmaskedEfiSettings = result.data.paymentIntegrations?.efi;
            if (unmaskedEfiSettings) {
                form.reset(unmaskedEfiSettings);
            }

            resetInactivityTimer();
            toast({ title: 'Desbloqueado!', description: 'Agora você pode editar as credenciais.' });
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.message });
        }
    }

    async function onSubmit(data: EfiSettings) {
        if (!isUnlocked) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa desbloquear para salvar.' });
            return;
        }

        try {
            const settingsToUpdate: KrovSettings = {
                ...settings,
                paymentIntegrations: {
                    ...settings.paymentIntegrations,
                    efi: data,
                },
            };

            const result = await updateSettings(settingsToUpdate);

            if (result.success) {
                // Register Webhook automatically
                try {
                    // botServiceUrl is already fetched from server action
                    const webhookUrl = botServiceUrl
                        ? `${botServiceUrl}/api/v1/efi/webhook`
                        : `${getApiUrl(baseUrl)}/api/v1/efi/webhook`;

                    const registerUrl = botServiceUrl
                        ? `${botServiceUrl}/api/v1/efi/webhook/register`
                        : `${getApiUrl(baseUrl)}/api/v1/efi/webhook/register`;

                    // Skip registration if on localhost
                    if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
                        console.log('[Efí] Skipping webhook registration (Localhost detected)');
                        toast({
                            title: 'Sucesso',
                            description: 'Configurações salvas! (Webhook não registrado em localhost)',
                        });
                    } else {
                        await fetch(registerUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                tenantId: 'global',
                                webhookUrl: webhookUrl
                            })
                        });
                        toast({
                            title: 'Sucesso',
                            description: 'Configurações salvas e Webhook registrado na Efí!',
                        });
                    }

                } catch (webhookError) {
                    console.error('Failed to register webhook:', webhookError);
                    toast({
                        title: 'Aviso',
                        description: 'Configurações salvas, mas falha ao registrar webhook automaticamente.',
                        variant: 'destructive'
                    });
                }
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
        }
    }



    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.p12')) {
            toast({
                variant: 'destructive',
                title: 'Arquivo inválido',
                description: 'Por favor, selecione um arquivo .p12',
            });
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const result = await uploadCertificate(formData);
            if (result.success && result.path) {
                form.setValue('certificate', result.path);
                toast({
                    title: 'Sucesso',
                    description: 'Certificado enviado com sucesso.',
                });
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
                description: 'Erro ao enviar certificado.',
            });
        } finally {
            setIsUploading(false);
            // Reset input value to allow selecting the same file again if needed
            e.target.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col" hideCloseButton>
                <DialogHeader className="space-y-1 pr-10 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg">Configurar Efí Bank</DialogTitle>
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
                        Configure as credenciais da sua conta Efí Bank para processar pagamentos Pix e assinaturas.
                    </DialogDescription>
                </DialogHeader>

                {showPasswordPrompt && !isUnlocked && (
                    <Alert className="border-yellow-500/50 bg-yellow-500/10 py-2 flex-shrink-0">
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
                                    control={form.control}
                                    name={mode === 'sandbox' ? 'sandbox_client_id' : 'production_client_id'}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Client ID</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={isUnlocked ? "Client_Id_..." : "••••••••"}
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
                                    control={form.control}
                                    name={mode === 'sandbox' ? 'sandbox_client_secret' : 'production_client_secret'}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Client Secret</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type={isUnlocked ? "text" : "password"}
                                                    placeholder={isUnlocked ? "Client_Secret_..." : "••••••••"}
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
                            </div>

                            <Separator className="my-2" />

                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Configurações Pix</h3>
                                <FormField
                                    control={form.control}
                                    name="pix_key"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Chave Pix</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={isUnlocked ? "Sua chave Pix..." : "••••••••"}
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    disabled={!isUnlocked}
                                                    className="text-sm"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Necessário para receber pagamentos via Pix.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="certificate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Certificado (.p12)</FormLabel>
                                            <div className="flex gap-2">
                                                <FormControl>
                                                    <Input
                                                        placeholder={isUnlocked ? "/caminho/para/certificado.p12" : "••••••••"}
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        disabled={!isUnlocked}
                                                        className="text-sm flex-1"
                                                    />
                                                </FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="file"
                                                        accept=".p12"
                                                        className="hidden"
                                                        id="cert-upload"
                                                        onChange={handleFileUpload}
                                                        disabled={!isUnlocked || isUploading}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-10 w-10"
                                                        disabled={!isUnlocked || isUploading}
                                                        asChild
                                                    >
                                                        <label htmlFor="cert-upload" className="cursor-pointer flex items-center justify-center">
                                                            {isUploading ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Upload className="h-4 w-4" />
                                                            )}
                                                        </label>
                                                    </Button>
                                                </div>
                                            </div>
                                            <FormDescription className="text-xs">
                                                Caminho absoluto para o arquivo .p12 no servidor. Você pode digitar o caminho ou fazer upload.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>


                        </div>

                        <DialogFooter className="gap-2 flex-shrink-0 mt-3 sm:justify-between">
                            {isUnlocked && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    disabled={isSubmitting}
                                    onClick={async () => {
                                        if (confirm('Tem certeza que deseja remover esta configuração? Isso impedirá o processamento de novos pagamentos.')) {
                                            const result = await removePaymentIntegration('efi');
                                            if (result.success) {
                                                toast({ title: 'Sucesso', description: result.message });
                                                onOpenChange(false);
                                            } else {
                                                toast({ variant: 'destructive', title: 'Erro', description: result.message });
                                            }
                                        }
                                    }}
                                >
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    Remover
                                </Button>
                            )}
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                                <Button type="submit" size="sm" disabled={!isUnlocked || isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                                    Salvar
                                </Button>
                            </div>
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
