import { redirect } from "next/navigation";
import { getSaasPlans, getSettings } from "@/app/settings/actions";
import { PlansManager } from "./admin/plans-manager";
import { PaymentSettingsForm } from "./admin/payment-settings-form";
import { GeneralSettingsForm } from "./admin/general-settings-form";
import { SecuritySettings } from "./admin/security-settings";
import { LegalSettings } from "./admin/legal-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default async function AdminSettingsPage() {
    const plans = await getSaasPlans();
    const settings = await getSettings();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
                <p className="text-sm text-muted-foreground">
                    Gerencie as configurações globais do seu serviço, planos e integrações.
                </p>
            </div>
            <Separator />

            <PlansManager initialPlans={plans} />

            <Separator />

            <GeneralSettingsForm settings={settings} />

            <Separator />

            <PaymentSettingsForm settings={settings} />

            <Separator />

            <SecuritySettings />

            <Separator />

            <LegalSettings />

            <Separator />

            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle>Autenticação de Dois Fatores (2FA)</CardTitle>
                    <CardDescription>
                        Aumente a segurança da sua conta de administrador exigindo um código de verificação ao fazer login.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch id="2fa-switch" disabled />
                        <Label htmlFor="2fa-switch" className="text-muted-foreground">Ativar 2FA (Em breve)</Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
