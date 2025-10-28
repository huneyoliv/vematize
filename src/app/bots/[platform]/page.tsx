import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getBotConfig, getDiscordSettings, getBotConnectionDetails } from "../actions";
import { platformConfigMap, supportedPlatforms, type Platform } from '../platform-config';
import { PlatformConnectionManager } from "./components/config-form";
import { FlowBuilder } from "./components/flow-builder";
import { DiscordSettingsForm } from "./components/discord-settings-form";
import { DiscordPanelsManager } from "./components/discord-panels-manager";
import { DiscordInteractionsSetup } from "./components/discord-interactions-setup";
import { getProducts } from "../../products/actions";
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';

export default async function BotPlatformPage({ params }: { params: { platform: string } }) {
    const { platform } = params;
    
    // Protege a rota - requer autenticação
    try {
        await getTenantFromSession();
    } catch (error) {
        redirect('/login');
    }
    
    const platformKey = platform as Platform;

    if (!supportedPlatforms.includes(platformKey)) {
        notFound();
    }
    
    const config = platformConfigMap[platformKey];

    const [botConfigData, productsData, discordSettingsData, botConnectionData] = await Promise.all([
        getBotConfig(),
        getProducts(),
        platformKey === 'discord' ? getDiscordSettings() : Promise.resolve(null),
        getBotConnectionDetails(platformKey)
    ]);

    // Para Discord, usa layout diferente com sistema de painéis de vendas
    if (platformKey === 'discord') {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center space-x-2">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/bots">
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Voltar</span>
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
                </div>
                <Tabs defaultValue="connection" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                        <TabsTrigger value="connection">Conexão</TabsTrigger>
                        <TabsTrigger value="settings">Configurações</TabsTrigger>
                        <TabsTrigger value="panels">Painéis de Vendas</TabsTrigger>
                        <TabsTrigger value="flow">Fluxo (Opcional)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="connection" className="pt-6 space-y-6">
                        <PlatformConnectionManager />
                        
                        {/* Card de Interactions Endpoint URL */}
                        <DiscordInteractionsSetup 
                            isConnected={!!botConnectionData?.botToken}
                        />
                    </TabsContent>
                    <TabsContent value="settings" className="pt-6">
                        <DiscordSettingsForm 
                            initialData={discordSettingsData}
                            botToken={botConnectionData?.botToken}
                        />
                    </TabsContent>
                    <TabsContent value="panels" className="pt-6">
                        <DiscordPanelsManager 
                            initialData={discordSettingsData}
                            products={productsData}
                            botToken={botConnectionData?.botToken}
                        />
                    </TabsContent>
                    <TabsContent value="flow" className="pt-6">
                        <FlowBuilder
                            initialData={botConfigData}
                            products={productsData}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // Para outras plataformas (Telegram), mantém o layout original
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <div className="flex items-center space-x-2">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/bots">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Voltar</span>
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
            </div>
            <Tabs defaultValue="connection" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="connection">Conexão</TabsTrigger>
                    <TabsTrigger value="flow">Fluxo do Bot</TabsTrigger>
                </TabsList>
                <TabsContent value="connection" className="pt-6">
                   <PlatformConnectionManager />
                </TabsContent>
                <TabsContent value="flow" className="pt-6">
                    <FlowBuilder
                        initialData={botConfigData}
                        products={productsData}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
