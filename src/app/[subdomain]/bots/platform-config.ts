import { TelegramIcon, DiscordIcon } from "@/components/icons/platform-icons";
import type { ComponentType, SVGProps } from "react";

type Field = {
    id: string;
    label: string;
    placeholder: string;
    type?: string;
};

interface PlatformConfig {
    title: string;
    description: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    fields: Field[];
    connectionCheckKey: string;
}

export const platformConfigMap: Record<string, PlatformConfig> = {
    telegram: {
        title: "Configuração do Telegram",
        description: "Crie um bot personalizado para interagir com seus usuários.",
        icon: TelegramIcon,
        fields: [
            { id: "botToken", label: "Token do Bot do Telegram", placeholder: "Seu token do BotFather...", type: "password" }
        ],
        connectionCheckKey: "botToken"
    },
    discord: {
        title: "Configuração do Discord",
        description: "Crie um bot do Discord para gerenciar sua comunidade.",
        icon: DiscordIcon,
        fields: [
            { id: "botToken", label: "Token do Bot do Discord", placeholder: "Seu token do bot...", type: "password" }
        ],
        connectionCheckKey: "botToken"
    }
};

export const supportedPlatforms: Platform[] = ['telegram', 'discord'];

export type Platform = keyof typeof platformConfigMap;
