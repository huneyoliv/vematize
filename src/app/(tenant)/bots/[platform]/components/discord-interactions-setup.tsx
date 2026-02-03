'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { CheckCircle2, Copy, ExternalLink, Info, RefreshCw, Shield } from "lucide-react";
import { getInteractionsUrl, regenerateInteractionsUrl } from '../../actions';
import { useToast } from "@/hooks/use-toast";

interface DiscordInteractionsSetupProps {
    isConnected: boolean;
}

export function DiscordInteractionsSetup({ isConnected }: DiscordInteractionsSetupProps) {
    const [copied, setCopied] = useState(false);
    const [testing, setTesting] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [interactionsUrl, setInteractionsUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadUrl();
    }, []);

    const loadUrl = async () => {
        setLoading(true);
        try {
            console.log('[Discord Interactions] Loading URL...');
            const result = await getInteractionsUrl();
            console.log('[Discord Interactions] Result:', result);
            if (result.success && result.url) {
                setInteractionsUrl(result.url);
                console.log('[Discord Interactions] URL loaded:', result.url);
            } else {
                console.error('[Discord Interactions] Failed to load URL:', result.message);
                toast({
                    variant: "destructive",
                    title: "❌ Erro",
                    description: result.message || "Não foi possível carregar a URL."
                });
            }
        } catch (error) {
            console.error('[Discord Interactions] Error:', error);
            toast({
                variant: "destructive",
                title: "❌ Erro",
                description: error instanceof Error ? error.message : "Erro desconhecido"
            });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(interactionsUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const testEndpoint = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const response = await fetch(interactionsUrl);
            const data = await response.json();
            if (data.status === 'ok') {
                setTestResult({ success: true, message: '✅ Endpoint funcionando!' });
            } else {
                setTestResult({ success: false, message: '❌ Endpoint respondeu, mas com erro.' });
            }
        } catch (error) {
            setTestResult({ success: false, message: `❌ Erro: ${error instanceof Error ? error.message : 'Desconhecido'}` });
        } finally {
            setTesting(false);
        }
    };

    const handleRegenerate = async () => {
        if (!confirm('⚠️ Isso vai invalidar a URL atual. O Discord precisará ser reconfigurado. Continuar?')) {
            return;
        }

        setRegenerating(true);
        const result = await regenerateInteractionsUrl();
        
        if (result.success && result.url) {
            setInteractionsUrl(result.url);
            toast({
                title: "✅ URL Regenerada",
                description: "Configure a nova URL no Discord Developer Portal."
            });
        } else {
            toast({
                variant: "destructive",
                title: "❌ Erro",
                description: result.message || "Não foi possível regenerar a URL."
            });
        }
        setRegenerating(false);
    };

    // Sempre mostrar quando estiver na aba de conexão
    // if (!isConnected) {
    //     return null;
    // }

    return (
        <Card className={isConnected ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900" : "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900"}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Info className={`h-5 w-5 ${isConnected ? 'text-blue-500' : 'text-yellow-500'}`} />
                            Configuração de Interactions
                            {isConnected && <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 ml-2">
                                Bot Conectado
                            </Badge>}
                        </CardTitle>
                        <CardDescription>
                            {isConnected 
                                ? "Configure esta URL no Discord Developer Portal para ativar os painéis de vendas" 
                                : "⚠️ Conecte o bot primeiro na seção acima, depois configure esta URL"}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={isConnected ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}>
                        Obrigatório
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* URL de Interactions */}
                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Interactions Endpoint URL
                    </label>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white dark:bg-gray-900 border rounded-md p-3 font-mono text-sm break-all">
                                {loading ? 'Carregando...' : interactionsUrl}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                                className="shrink-0"
                                disabled={loading || !interactionsUrl}
                            >
                                {copied ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={testEndpoint}
                                disabled={testing || loading || !interactionsUrl}
                            >
                                {testing ? 'Testando...' : '🧪 Testar Endpoint'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRegenerate}
                                disabled={regenerating || loading || !interactionsUrl}
                                className="gap-2"
                            >
                                <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
                                {regenerating ? 'Regenerando...' : 'Regenerar URL'}
                            </Button>
                            {testResult && (
                                <span className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {testResult.message}
                                </span>
                            )}
                        </div>
                        <Alert className="bg-blue-50 border-blue-200">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-sm text-blue-700">
                                <strong>🔒 URL Única e Segura:</strong> Esta URL é exclusiva para seu bot e contém um token de segurança.
                                Se ela for comprometida, você pode regenerá-la clicando em "Regenerar URL".
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>

                {/* Instruções */}
                <Alert>
                    <AlertDescription className="space-y-3">
                        <p className="font-semibold">📋 Como configurar:</p>
                        <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>
                                Acesse o{' '}
                                <a 
                                    href="https://discord.com/developers/applications" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
                                >
                                    Discord Developer Portal
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </li>
                            <li>Selecione sua aplicação/bot</li>
                            <li>Vá em <strong>General Information</strong></li>
                            <li>Cole a URL acima no campo <strong>Interactions Endpoint URL</strong></li>
                            <li>Clique em <strong>Save Changes</strong></li>
                        </ol>
                        <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                ✅ Após configurar, os painéis de vendas funcionarão automaticamente!
                            </p>
                        </div>
                    </AlertDescription>
                </Alert>

                {/* Link para documentação */}
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" asChild>
                        <a 
                            href="/DISCORD_BOT_INTERACTIONS_SETUP.md" 
                            target="_blank"
                            className="flex items-center gap-2"
                        >
                            📖 Ver documentação completa
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
