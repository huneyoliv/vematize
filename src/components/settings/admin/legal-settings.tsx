'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { getLegalDocument, saveLegalDocument } from '@/app/settings/actions';

export function LegalSettings() {
    const [activeTab, setActiveTab] = useState<'terms_of_service' | 'privacy_policy'>('terms_of_service');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function loadDoc() {
            setIsLoading(true);
            try {
                const doc = await getLegalDocument(activeTab);
                setContent(doc?.content || '');
            } catch (error) {
                console.error('Failed to load document', error);
                toast({ variant: 'destructive', title: 'Erro ao carregar documento' });
            } finally {
                setIsLoading(false);
            }
        }
        loadDoc();
    }, [activeTab, toast]);

    const handleSave = async () => {
        if (!confirm('Salvar e notificar todos os usuários sobre a atualização?')) return;

        setIsSaving(true);
        try {
            const result = await saveLegalDocument(activeTab, content);
            if (result.success) {
                toast({ title: 'Sucesso', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: result.message });
            }
        } catch (error) {
            console.error('Failed to save document', error);
            toast({ variant: 'destructive', title: 'Erro ao salvar' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Documentos Legais</CardTitle>
                <CardDescription>
                    Edite os Termos de Uso e Política de Privacidade. Ao salvar, os usuários serão notificados por e-mail e as alterações entrarão em vigor em 15 dias.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="terms_of_service">Termos de Uso</TabsTrigger>
                        <TabsTrigger value="privacy_policy">Política de Privacidade</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[400px] font-mono text-sm"
                                placeholder="Cole o conteúdo do documento aqui..."
                            />
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={isSaving || isLoading}>
                                {isSaving ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                ) : (
                                    <><Save className="mr-2 h-4 w-4" /> Salvar e Notificar</>
                                )}
                            </Button>
                        </div>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
