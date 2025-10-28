'use client';

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, TestTube, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveBotConnection, getBotConnectionDetails } from '../../actions';
import { Platform, platformConfigMap } from "../../platform-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PlatformConnectionManager() {
    return <GenericConnectionManager />;
}

function GenericConnectionManager() {
    const params = useParams();
    const platform = params.platform as Platform;
    const config = platformConfigMap[platform];
    const { toast } = useToast();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
        data?: any;
    } | null>(null);

    useEffect(() => {
        async function fetchConfig() {
            const connectionDetails = await getBotConnectionDetails(platform);
            if (connectionDetails) {
                const initialFormData = config.fields.reduce((acc, field) => {
                    acc[field.id] = connectionDetails[field.id] || '';
                    return acc;
                }, {} as Record<string, string>);
                setFormData(initialFormData);
                
                const connectionKey = config.connectionCheckKey;
                if (connectionDetails[connectionKey]) {
                    setIsConnected(true);
                }
            }
        }
        fetchConfig();
    }, [platform, config]);

    const handleInputChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
        setTestResult(null); // Limpa resultado de teste ao editar
    };

    const handleTestConnection = async () => {
        if (platform !== 'discord') return;
        
        const botToken = formData.botToken;
        if (!botToken) {
            toast({
                variant: "destructive",
                title: "Campo vazio",
                description: "Preencha o token do bot antes de testar.",
            });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            // Testa a conexão com o Discord API
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                headers: {
                    'Authorization': `Bot ${botToken}`,
                },
            });

            if (response.ok) {
                const botData = await response.json();
                setTestResult({
                    success: true,
                    message: `Conexão bem-sucedida! Bot: ${botData.username}#${botData.discriminator}`,
                    data: botData,
                });
                toast({
                    title: "Sucesso!",
                    description: `Bot ${botData.username} conectado!`,
                });
            } else {
                const error = await response.json();
                setTestResult({
                    success: false,
                    message: error.message || 'Token inválido ou expirado.',
                });
                toast({
                    variant: "destructive",
                    title: "Falha na conexão",
                    description: error.message || 'Verifique se o token está correto.',
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Erro ao conectar com o Discord.',
            });
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Erro ao testar conexão.",
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const result = await saveBotConnection(platform, formData);

        if (result.success) {
            toast({ title: "Sucesso", description: result.message || "Configuração salva com sucesso!" });
            setIsConnected(true);
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.message || "Não foi possível salvar a configuração." });
        }
        setIsSaving(false);
    };

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle>{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {platform === 'discord' && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Como configurar?</AlertTitle>
                        <AlertDescription className="space-y-2">
                            <p className="text-sm">1. Acesse o <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">Discord Developer Portal <ExternalLink className="h-3 w-3 ml-1" /></a></p>
                            <p className="text-sm font-semibold text-orange-600">2. Em "General Information" → copie a PUBLIC KEY</p>
                            <p className="text-sm">3. Vá em "Bot" → copie o Token</p>
                            <p className="text-sm">4. Habilite as intents: Server Members e Message Content</p>
                            <p className="text-sm">5. Cole as credenciais abaixo e teste a conexão</p>
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {config.fields.map(field => (
                        <div key={field.id} className="space-y-2">
                            <Label htmlFor={field.id}>{field.label}</Label>
                            <Input
                                id={field.id}
                                type={field.type || 'text'}
                                value={formData[field.id] || ''}
                                onChange={e => handleInputChange(field.id, e.target.value)}
                                placeholder={field.placeholder}
                            />
                        </div>
                    ))}

                    {platform === 'discord' && formData.botToken && (
                        <div className="space-y-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                className="w-full"
                            >
                                {isTesting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Testando conexão...
                                    </>
                                ) : (
                                    <>
                                        <TestTube className="mr-2 h-4 w-4" />
                                        Testar Conexão com Discord
                                    </>
                                )}
                            </Button>

                            {testResult && (
                                <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
                                    {testResult.success ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    <AlertDescription>
                                        {testResult.message}
                                        {testResult.data && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Bot ID: {testResult.data.id}
                                            </p>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                         <Button type="submit" disabled={isSaving || (platform === 'discord' && !testResult?.success)}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar e Conectar"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
