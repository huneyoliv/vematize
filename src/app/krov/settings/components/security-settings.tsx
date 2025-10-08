'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';

export function SecuritySettings() {
    const { toast } = useToast();
    const [isRevoking, setIsRevoking] = useState(false);

    async function handleRevokeAllSessions() {
        setIsRevoking(true);
        try {
            const response = await fetch('/krov/api/revoke-all-sessions', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: '🚨 Sessões Revogadas!',
                    description: data.message,
                });

                // Aguarda 2 segundos e faz logout
                setTimeout(() => {
                    window.location.href = '/krov/login';
                }, 2000);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: data.error || 'Erro ao revogar sessões',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao conectar ao servidor',
            });
        } finally {
            setIsRevoking(false);
        }
    }

    return (
        <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-red-900">Segurança Crítica</CardTitle>
                </div>
                <CardDescription className="text-red-700">
                    Ferramentas de emergência para proteção do sistema
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border border-red-300 bg-white p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-red-900 mb-1">
                                Revogar Todas as Sessões Ativas
                            </h4>
                            <p className="text-sm text-red-700 mb-3">
                                Esta ação irá desconectar <strong>TODOS os usuários</strong> do sistema imediatamente, 
                                incluindo você. Use apenas em caso de violação de segurança detectada.
                            </p>
                            <ul className="text-sm text-red-600 mb-4 space-y-1 list-disc list-inside">
                                <li>Todos os clientes serão deslogados</li>
                                <li>Todos os administradores serão deslogados</li>
                                <li>Será necessário fazer login novamente</li>
                                <li>Sessões antigas não funcionarão mais</li>
                            </ul>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={isRevoking}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {isRevoking ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Revogando...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldAlert className="mr-2 h-4 w-4" />
                                                Revogar Todas as Sessões
                                            </>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2 text-red-900">
                                            <AlertTriangle className="h-5 w-5" />
                                            Tem certeza absoluta?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="space-y-2">
                                            <p className="font-semibold text-red-700">
                                                Esta ação é IRREVERSÍVEL e afetará TODOS os usuários!
                                            </p>
                                            <p>
                                                Você está prestes a desconectar todos os usuários do sistema. 
                                                Esta ação deve ser usada apenas em emergências de segurança.
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Após confirmar, você será redirecionado para a página de login.
                                            </p>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleRevokeAllSessions}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            Sim, Revogar Todas as Sessões
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


