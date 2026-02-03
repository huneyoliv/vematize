'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Send, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DiscordSettingsSchema, DiscordSalesPanelSchema } from "@/lib/schemas";
import { saveDiscordSettings } from "../../actions";
import type { Product } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MediaPickerDialog } from "@/components/media-picker-dialog";
import { publishPanels } from "../../actions";

interface DiscordPanelsManagerProps {
    initialData: z.infer<typeof DiscordSettingsSchema> | null;
    products: Product[];
    botToken?: string;
    tenantId: string;
}

export function DiscordPanelsManager({ initialData, products, botToken, tenantId }: DiscordPanelsManagerProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activePanelIndex, setActivePanelIndex] = useState<number | null>(null);

    const form = useForm<z.infer<typeof DiscordSettingsSchema>>({
        resolver: zodResolver(DiscordSettingsSchema),
        defaultValues: initialData || {
            deliveryType: 'automatic',
            panels: [],
        }
    });

    const { fields: panels, append: appendPanel, remove: removePanel } = useFieldArray({
        control: form.control,
        name: "panels",
        keyName: "key",
    });

    async function onSubmit(values: z.infer<typeof DiscordSettingsSchema>) {
        setIsSubmitting(true);
        try {
            const result = await saveDiscordSettings(values);
            if (result.success) {
                toast({ title: "Sucesso!", description: result.message });


                // ...

                // Publica os painéis automaticamente via API
                try {
                    const publishResult = await publishPanels();

                    if (publishResult.success) {
                        toast({ title: "Painéis Publicados!", description: publishResult.message });
                    } else {
                        toast({ variant: "destructive", title: "Erro ao publicar", description: publishResult.message });
                    }
                } catch (publishError: any) {
                    console.error('[Publish] Error:', publishError);
                    toast({ variant: "destructive", title: "Erro ao publicar", description: "Erro ao conectar com o Discord." });
                }

                router.refresh();
                setActivePanelIndex(null);
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.message });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Erro Inesperado", description: "Ocorreu um erro ao salvar." });
        } finally {
            setIsSubmitting(false);
        }
    }

    const createNewPanel = () => {
        const newPanel: z.infer<typeof DiscordSalesPanelSchema> = {
            id: uuidv4(),
            name: `Painel ${panels.length + 1}`,
            channelId: '',
            productIds: [],
            embedConfig: {
                title: 'Produtos Disponíveis',
                description: 'Selecione o produto que deseja comprar:',
                color: '#5865F2',
            },
            isActive: true,
        };
        appendPanel(newPanel);
        setActivePanelIndex(panels.length);
    };

    const handleRemovePanel = (index: number) => {
        removePanel(index);
        if (activePanelIndex === index) {
            setActivePanelIndex(null);
        } else if (activePanelIndex !== null && activePanelIndex > index) {
            setActivePanelIndex(activePanelIndex - 1);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Painéis de Vendas</CardTitle>
                                <CardDescription>
                                    Crie painéis de produtos em canais específicos do seu servidor Discord.
                                </CardDescription>
                            </div>
                            <Button type="button" onClick={createNewPanel} variant="outline">
                                <Plus className="mr-2 h-4 w-4" />
                                Novo Painel
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {panels.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>Nenhum painel criado ainda.</p>
                                <p className="text-sm mt-2">Clique em "Novo Painel" para começar.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {panels.map((panel, index) => (
                                    <Card key={panel.key} className="bg-background/40">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold">
                                                        {form.watch(`panels.${index}.name`) || `Painel ${index + 1}`}
                                                    </h3>
                                                    {form.watch(`panels.${index}.messageId`) && (
                                                        <Badge variant="outline">Publicado</Badge>
                                                    )}
                                                    {!form.watch(`panels.${index}.isActive`) && (
                                                        <Badge variant="destructive">Inativo</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setActivePanelIndex(activePanelIndex === index ? null : index)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        {activePanelIndex === index ? 'Ocultar' : 'Editar'}
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button type="button" variant="destructive" size="sm">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tem certeza que deseja excluir este painel? Esta ação não pode ser desfeita.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRemovePanel(index)}>
                                                                    Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        {activePanelIndex === index && (
                                            <CardContent className="space-y-4">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`panels.${index}.name`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Nome do Painel</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Ex: Produtos VIP" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name={`panels.${index}.channelId`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>ID do Canal</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Ex: 1234567890" />
                                                                </FormControl>
                                                                <FormDescription className="text-xs">
                                                                    Clique com botão direito no canal e copie o ID
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <Separator />

                                                <div>
                                                    <FormLabel>Configuração do Embed</FormLabel>
                                                    <div className="mt-3 space-y-4">
                                                        <FormField
                                                            control={form.control}
                                                            name={`panels.${index}.embedConfig.title`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Título</FormLabel>
                                                                    <FormControl>
                                                                        <Input {...field} placeholder="Ex: Produtos Disponíveis" />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name={`panels.${index}.embedConfig.description`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <div className="flex justify-between items-center">
                                                                        <FormLabel>Descrição</FormLabel>
                                                                        <MediaPickerDialog
                                                                            tenantId={tenantId}
                                                                            onSelect={(url) => {
                                                                                const current = field.value || '';
                                                                                const toInsert = ` [Mídia](${url}) `;
                                                                                field.onChange(current + toInsert);
                                                                            }}
                                                                            trigger={<Button type="button" variant="ghost" size="sm" className="h-6 text-xs"><Plus className="w-3 h-3 mr-1" /> Add Mídia</Button>}
                                                                        />
                                                                    </div>
                                                                    <FormControl>
                                                                        <Textarea {...field} rows={3} placeholder="Selecione o produto que deseja comprar..." />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <div className="grid md:grid-cols-3 gap-4">
                                                            <FormField
                                                                control={form.control}
                                                                name={`panels.${index}.embedConfig.color`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Cor</FormLabel>
                                                                        <FormControl>
                                                                            <div className="flex gap-2">
                                                                                <Input {...field} placeholder="#5865F2" />
                                                                                <input
                                                                                    type="color"
                                                                                    value={field.value || '#5865F2'}
                                                                                    onChange={(e) => field.onChange(e.target.value)}
                                                                                    className="h-10 w-10 rounded border cursor-pointer"
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={form.control}
                                                                name={`panels.${index}.embedConfig.imageUrl`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>URL da Imagem</FormLabel>
                                                                        <div className="flex gap-2">
                                                                            <FormControl>
                                                                                <Input {...field} placeholder="https://..." />
                                                                            </FormControl>
                                                                            <MediaPickerDialog
                                                                                tenantId={tenantId}
                                                                                onSelect={(url) => field.onChange(url)}
                                                                                trigger={<Button type="button" variant="outline" size="icon"><Eye className="h-4 w-4" /></Button>}
                                                                            />
                                                                        </div>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={form.control}
                                                                name={`panels.${index}.embedConfig.thumbnailUrl`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>URL do Thumbnail</FormLabel>
                                                                        <div className="flex gap-2">
                                                                            <FormControl>
                                                                                <Input {...field} placeholder="https://..." />
                                                                            </FormControl>
                                                                            <MediaPickerDialog
                                                                                tenantId={tenantId}
                                                                                onSelect={(url) => field.onChange(url)}
                                                                                trigger={<Button type="button" variant="outline" size="icon"><Eye className="h-4 w-4" /></Button>}
                                                                            />
                                                                        </div>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <Separator />

                                                <FormField
                                                    control={form.control}
                                                    name={`panels.${index}.productIds`}
                                                    render={() => (
                                                        <FormItem>
                                                            <div className="mb-4">
                                                                <FormLabel className="text-base">Produtos</FormLabel>
                                                                <FormDescription>
                                                                    Selecione os produtos que aparecerão neste painel.
                                                                </FormDescription>
                                                            </div>
                                                            {products.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground">
                                                                    Nenhum produto cadastrado. Crie produtos primeiro.
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {products.map((product) => (
                                                                        <FormField
                                                                            key={product.id}
                                                                            control={form.control}
                                                                            name={`panels.${index}.productIds`}
                                                                            render={({ field }) => {
                                                                                return (
                                                                                    <FormItem
                                                                                        key={product.id}
                                                                                        className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                                                                    >
                                                                                        <FormControl>
                                                                                            <Checkbox
                                                                                                checked={field.value?.includes(product.id!)}
                                                                                                onCheckedChange={(checked) => {
                                                                                                    return checked
                                                                                                        ? field.onChange([...field.value, product.id])
                                                                                                        : field.onChange(
                                                                                                            field.value?.filter(
                                                                                                                (value) => value !== product.id
                                                                                                            )
                                                                                                        )
                                                                                                }}
                                                                                            />
                                                                                        </FormControl>
                                                                                        <div className="space-y-1 leading-none">
                                                                                            <FormLabel className="font-normal cursor-pointer">
                                                                                                {product.name}
                                                                                            </FormLabel>
                                                                                            <FormDescription>
                                                                                                R$ {product.price.toFixed(2).replace('.', ',')} - {product.description || 'Sem descrição'}
                                                                                            </FormDescription>
                                                                                        </div>
                                                                                    </FormItem>
                                                                                )
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <Separator />

                                                <FormField
                                                    control={form.control}
                                                    name={`panels.${index}.isActive`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-base">
                                                                    Painel Ativo
                                                                </FormLabel>
                                                                <FormDescription>
                                                                    Painéis inativos não processarão vendas.
                                                                </FormDescription>
                                                            </div>
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    {panels.length > 0 && (
                        <CardFooter className="flex justify-between">
                            <p className="text-sm text-muted-foreground">
                                {panels.length} painel(is) configurado(s)
                            </p>
                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                                Salvar e Publicar Painéis
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </form>
        </Form>
    );
}
