'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadLogo, updateSettings } from '@/app/settings/actions';
import { KrovSettings } from "@/lib/types";
import Image from 'next/image';

interface GeneralSettingsFormProps {
    settings: KrovSettings;
}

export function GeneralSettingsForm({ settings }: GeneralSettingsFormProps) {
    const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadLogo(formData);

        if (result.success && result.url) {
            setLogoUrl(result.url);

            // Auto-save settings with new logo URL
            const updateResult = await updateSettings({
                ...settings,
                logoUrl: result.url
            });

            if (updateResult.success) {
                toast({
                    title: "Sucesso",
                    description: "Logo atualizado com sucesso!",
                });
            } else {
                toast({
                    title: "Erro",
                    description: updateResult.message,
                    variant: "destructive",
                });
            }
        } else {
            toast({
                title: "Erro",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsUploading(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>Personalize a aparência do seu serviço.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Logo do QR Code (Pix)</Label>
                    <div className="flex items-center gap-4">
                        {logoUrl && (
                            <div className="relative w-20 h-20 border rounded-md overflow-hidden bg-gray-50">
                                <Image src={logoUrl} alt="Logo" fill className="object-contain" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                            </div>
                        )}
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Recomendado: PNG ou JPG, fundo transparente, máx 2MB.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
