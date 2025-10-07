'use client';

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveBotConnection, getBotConnectionDetails } from '../../actions';
import { Platform, platformConfigMap } from "../../platform-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlatformConnectionManagerProps {
    subdomain: string;
}

export function PlatformConnectionManager({ subdomain }: PlatformConnectionManagerProps) {
    return <GenericConnectionManager subdomain={subdomain} />;
}

function GenericConnectionManager({ subdomain }: { subdomain: string }) {
    const params = useParams();
    const platform = params.platform as Platform;
    const config = platformConfigMap[platform];
    const { toast } = useToast();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        async function fetchConfig() {
            const connectionDetails = await getBotConnectionDetails(subdomain, platform);
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
    }, [subdomain, platform, config]);

    const handleInputChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const result = await saveBotConnection(subdomain, platform, formData);

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
            <CardContent>
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
                    <div className="flex justify-end gap-2">
                         <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" /> : "Salvar e Conectar"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}