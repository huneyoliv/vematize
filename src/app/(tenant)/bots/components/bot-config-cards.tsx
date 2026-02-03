'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import type { BotConnections } from "../actions";
import { platformConfigMap, supportedPlatforms, type Platform } from '../platform-config';


interface BotConfigCardsProps {
    initialConnections: BotConnections;
    allowedPlatforms: string[];
}

export function BotConfigCards({ initialConnections, allowedPlatforms }: BotConfigCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {supportedPlatforms.map(platform => {
                const config = platformConfigMap[platform];
                const connection = initialConnections?.[platform];
                const isConnected = !!(connection && (connection as any)[config.connectionCheckKey]);
                const Icon = config.icon;
                
                // 🔒 Verifica se o tenant tem acesso a esta plataforma
                const hasAccess = allowedPlatforms.length === 0 || allowedPlatforms.includes(platform);

                return (
                    <Card 
                        key={platform} 
                        className={`flex flex-col ${!hasAccess ? 'opacity-50 relative' : ''}`}
                    >
                        {!hasAccess && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                <div className="text-center space-y-2">
                                    <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Não disponível no seu plano
                                    </p>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/plan">
                                            Ver Planos
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )}
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Icon className="h-10 w-10" />
                                    <div>
                                        <CardTitle>{platform.charAt(0).toUpperCase() + platform.slice(1)}</CardTitle>
                                        <CardDescription>
                                            {platform === 'telegram' ? 'Bot pessoal' : platform === 'discord' ? 'Bot de servidor' : 'Bot automatizado'}
                                        </CardDescription>
                                    </div>
                                </div>
                                {hasAccess && (
                                    <Badge variant={isConnected ? 'default' : 'destructive'}>
                                        {isConnected ? 'Conectado' : 'Desconectado'}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <p className="text-sm text-muted-foreground">
                                {config.description}
                            </p>
                        </CardContent>
                        {hasAccess && (
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href={`/bots/${platform}`}>
                                      {isConnected ? 'Ver Configuração' : 'Configurar Conexão'}
                                    </Link>
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                )
            })}
        </div>
    );
}
