'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Server } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DiscordSettingsSchema } from "@/lib/schemas";
import { saveDiscordSettings } from "../../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DiscordSettingsFormProps {
    initialData: z.infer<typeof DiscordSettingsSchema> | null;
    botToken?: string; // Token do bot vindo da conexão
}

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
}

interface Channel {
    id: string;
    name: string;
    parentId: string | null;
}

interface Category {
    id: string;
    name: string;
}

interface Role {
    id: string;
    name: string;
    color: string;
    position: number;
}

export function DiscordSettingsForm({ initialData, botToken }: DiscordSettingsFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingGuilds, setIsLoadingGuilds] = useState(false);
    const [isLoadingGuildData, setIsLoadingGuildData] = useState(false);
    
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [selectedGuildId, setSelectedGuildId] = useState<string>('');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    const form = useForm<z.infer<typeof DiscordSettingsSchema>>({
        resolver: zodResolver(DiscordSettingsSchema),
        defaultValues: initialData || {
            deliveryType: 'automatic',
            panels: [],
        }
    });

    const deliveryType = form.watch('deliveryType');

    // Buscar servidores quando o componente carrega
    useEffect(() => {
        if (botToken) {
            loadGuilds();
        }
    }, [botToken]);

    async function loadGuilds() {
        if (!botToken) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Conecte o bot primeiro na aba 'Conexão'",
            });
            return;
        }

        setIsLoadingGuilds(true);
        try {
            const response = await fetch('/bots/api/discord-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botToken }),
            });

            const data = await response.json();

            if (data.success) {
                setGuilds(data.guilds);
                toast({
                    title: "Sucesso!",
                    description: `${data.guilds.length} servidor(es) encontrado(s)`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: data.error || "Erro ao buscar servidores",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Erro ao conectar ao Discord",
            });
        } finally {
            setIsLoadingGuilds(false);
        }
    }

    async function loadGuildData(guildId: string) {
        if (!botToken || !guildId) return;

        setIsLoadingGuildData(true);
        try {
            const response = await fetch('/bots/api/discord-guild-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botToken, guildId }),
            });

            const data = await response.json();

            if (data.success) {
                setChannels(data.channels);
                setCategories(data.categories);
                setRoles(data.roles);
                toast({
                    title: "Dados carregados!",
                    description: `${data.channels.length} canais, ${data.categories.length} categorias e ${data.roles.length} cargos encontrados`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: data.error || "Erro ao buscar dados do servidor",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Erro ao buscar dados do servidor",
            });
        } finally {
            setIsLoadingGuildData(false);
        }
    }

    function handleGuildChange(guildId: string) {
        setSelectedGuildId(guildId);
        loadGuildData(guildId);
    }

    async function onSubmit(values: z.infer<typeof DiscordSettingsSchema>) {
        setIsSubmitting(true);
        try {
            const result = await saveDiscordSettings(values);
            if (result.success) {
                toast({ title: "Sucesso!", description: result.message });
                router.refresh();
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.message });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Erro Inesperado", description: "Ocorreu um erro ao salvar." });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!botToken) {
        return (
            <Alert>
                <Server className="h-4 w-4" />
                <AlertDescription>
                    Por favor, conecte o bot primeiro na aba <strong>"Conexão"</strong> para configurar os painéis de vendas.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Seleção de Servidor */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Selecionar Servidor
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={loadGuilds}
                                disabled={isLoadingGuilds}
                            >
                                {isLoadingGuilds ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-2">Atualizar</span>
                            </Button>
                        </CardTitle>
                        <CardDescription>
                            Escolha o servidor Discord onde você deseja configurar as vendas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {guilds.length > 0 ? (
                            <Select value={selectedGuildId} onValueChange={handleGuildChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um servidor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {guilds.map(guild => (
                                        <SelectItem key={guild.id} value={guild.id}>
                                            {guild.name} ({guild.memberCount} membros)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Alert>
                                <AlertDescription>
                                    Nenhum servidor encontrado. Clique em "Atualizar" para buscar os servidores onde o bot está presente.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Configurações de Entrega - Só aparece se um servidor foi selecionado */}
                {selectedGuildId && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Configurações de Entrega</CardTitle>
                                <CardDescription>
                                    Defina como os produtos serão entregues após a confirmação do pagamento.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="deliveryType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Entrega</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o tipo de entrega" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="automatic">Automática (Bot entrega no carrinho)</SelectItem>
                                                    <SelectItem value="manual_role">Manual com Staff (Adiciona membros do cargo ao carrinho)</SelectItem>
                                                    <SelectItem value="manual_notify">Manual com Notificação (Apenas menciona o cargo)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Automática: Para produtos digitais. Manual: Para produtos padrão que precisam de ação humana.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {deliveryType === 'manual_role' && (
                                    <FormField
                                        control={form.control}
                                        name="deliveryRoleId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cargo de Staff</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione um cargo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {roles.length > 0 ? (
                                                            roles.map(role => (
                                                                <SelectItem key={role.id} value={role.id}>
                                                                    <span style={{ color: role.color || 'inherit' }}>
                                                                        {role.name}
                                                                    </span>
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="loading" disabled>
                                                                {isLoadingGuildData ? "Carregando..." : "Nenhum cargo encontrado"}
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Membros com este cargo serão adicionados ao carrinho para entregar produtos padrão.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {deliveryType === 'manual_notify' && (
                                    <FormField
                                        control={form.control}
                                        name="notifyRoleId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cargo de Vendedor</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione um cargo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {roles.length > 0 ? (
                                                            roles.map(role => (
                                                                <SelectItem key={role.id} value={role.id}>
                                                                    <span style={{ color: role.color || 'inherit' }}>
                                                                        {role.name}
                                                                    </span>
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="loading" disabled>
                                                                {isLoadingGuildData ? "Carregando..." : "Nenhum cargo encontrado"}
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Este cargo será mencionado quando houver uma nova venda.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {deliveryType === 'automatic' && (
                                    <FormField
                                        control={form.control}
                                        name="deliveryMessage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mensagem de Entrega (Opcional)</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        {...field} 
                                                        rows={4}
                                                        placeholder="Obrigado pela compra! Aqui está seu produto..."
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Mensagem que será enviada junto com o produto digital.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <FormField
                                    control={form.control}
                                    name="cartCategoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Categoria de Carrinhos (Opcional)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione uma categoria" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">Nenhuma (usar canal padrão)</SelectItem>
                                                    {categories.map(category => (
                                                        <SelectItem key={category.id} value={category.id}>
                                                            📁 {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Categoria onde os threads de carrinho serão criados.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="salesLogChannelId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Canal de Logs (Opcional)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um canal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">Nenhum</SelectItem>
                                                    {channels.map(channel => (
                                                        <SelectItem key={channel.id} value={channel.id}>
                                                            # {channel.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Canal onde serão enviados logs de vendas e compras.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isSubmitting} size="lg">
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Salvar Configurações"}
                                </Button>
                            </CardFooter>
                        </Card>
                    </>
                )}
            </form>
        </Form>
    );
}
