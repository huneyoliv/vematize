import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";

interface AccessDeniedProps {
  platform: string;
  planName?: string;
  allowedPlatforms?: string[];
}

export function AccessDenied({ platform, planName, allowedPlatforms }: AccessDeniedProps) {
  const platformNames: Record<string, string> = {
    telegram: 'Telegram',
    discord: 'Discord',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
  };

  const allowedPlatformNames = allowedPlatforms?.map(p => platformNames[p] || p).join(', ');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
          <CardDescription>
            A plataforma {platformNames[platform] || platform} não está disponível no seu plano atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {planName && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Plano Atual</p>
              <p className="text-lg font-bold">{planName}</p>
              {allowedPlatformNames && (
                <p className="text-sm text-muted-foreground mt-1">
                  Plataformas disponíveis: {allowedPlatformNames}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Para acessar a configuração do {platformNames[platform] || platform}, faça upgrade do seu plano.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/plan">
                Ver Planos Disponíveis
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/bots">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Meus Bots
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




