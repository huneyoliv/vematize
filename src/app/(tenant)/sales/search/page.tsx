'use client';

import { useState, useEffect } from 'react';
import { searchSale } from './actions';
import { getBotUsers, BotUser } from '../../users/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle, XCircle, Clock, AlertCircle, MoreHorizontal, PlusCircle, Copy, User, CreditCard, Calendar, Activity, Smartphone } from 'lucide-react';
import { Sale } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function SearchSalePage() {
    const [query, setQuery] = useState('');
    const [sale, setSale] = useState<Sale | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Users state
    const [users, setUsers] = useState<BotUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedUser, setSelectedUser] = useState<BotUser | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await getBotUsers();
                setUsers(data);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(false);
        setSale(null);

        try {
            const result = await searchSale(query);
            setSale(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Aprovado</Badge>;
            case 'pending':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
            case 'failed':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
            case 'refunded':
                return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Reembolsado</Badge>;
            case 'cancelled':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string | Date) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Vendas & Usuários</h1>
                <p className="text-muted-foreground">
                    Gerencie suas vendas e visualize seus clientes.
                </p>
            </div>

            <Tabs defaultValue="search" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="search">Pesquisar Venda</TabsTrigger>
                    <TabsTrigger value="users">Clientes</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Buscar</CardTitle>
                            <CardDescription>
                                Cole o ID da transação fornecido pelo gateway (ex: ID do MercadoPago) ou o ID interno da venda.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input
                                    placeholder="Ex: 1234567890"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="max-w-md"
                                />
                                <Button type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                    Pesquisar
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {searched && !sale && (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">Nenhuma venda encontrada</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                    Verifique se o ID está correto. O ID de transação geralmente é um número longo fornecido no comprovante do Pix.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {sale && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Detalhes da Venda</CardTitle>
                                        <CardDescription>ID Interno: {sale._id?.toString()}</CardDescription>
                                    </div>
                                    {getStatusBadge(sale.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Informações do Produto</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">Produto ID:</span>
                                        <span className="font-mono">{sale.productId}</span>

                                        <span className="text-muted-foreground">Quantidade:</span>
                                        <span>{sale.quantity || 1}</span>

                                        <span className="text-muted-foreground">Cupom:</span>
                                        <span>{sale.couponCode || '-'}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Pagamento</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">Gateway:</span>
                                        <span className="capitalize">{sale.paymentGateway}</span>

                                        <span className="text-muted-foreground">ID Transação:</span>
                                        <span className="font-mono">{sale.paymentDetails?.paymentId || '-'}</span>

                                        <span className="text-muted-foreground">Data Criação:</span>
                                        <span>{formatDate(sale.createdAt)}</span>

                                        <span className="text-muted-foreground">Última Atualização:</span>
                                        <span>{formatDate(sale.updatedAt || sale.createdAt)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Cliente</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">User ID:</span>
                                        <span className="font-mono">{sale.userId}</span>

                                        <span className="text-muted-foreground">Plataforma:</span>
                                        <span className="capitalize">
                                            {sale.discordChannelId ? 'Discord' : sale.telegramChatId ? 'Telegram' : 'Desconhecido'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Entrega</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <span className="text-muted-foreground">Canal Discord:</span>
                                        <span className="font-mono">{sale.discordChannelId || '-'}</span>

                                        <span className="text-muted-foreground">Thread Privada:</span>
                                        <span className="font-mono">{sale.discordThreadId || '-'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Clientes</CardTitle>
                            <CardDescription>
                                Visualize os usuários que realizaram compras ou possuem assinaturas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Buscar por nome ou telefone..."
                                        className="pl-8"
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Plataforma</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Produto / Plano</TableHead>
                                            <TableHead>Status / Entrega</TableHead>
                                            <TableHead>Duração</TableHead>
                                            <TableHead>Desde</TableHead>
                                            <TableHead><span className="sr-only">Ações</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingUsers ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : users.length > 0 ? (
                                            users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{user.name}</span>
                                                            <span className="text-xs text-muted-foreground">{user.identifier}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {user.platform}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={user.type === 'Assinatura' ? 'default' : 'secondary'}>
                                                            {user.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{user.productName}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant={
                                                                user.status === 'Ativo' || user.status === 'Aprovado' ? 'default' :
                                                                    user.status === 'Expirado' || user.status === 'Falha' ? 'destructive' : 'secondary'
                                                            }>
                                                                {user.status}
                                                            </Badge>
                                                            {user.deliveryStatus !== 'N/A' && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Entrega: {user.deliveryStatus}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {user.subscriptionDuration || '-'}
                                                    </TableCell>
                                                    <TableCell>{user.joinDate}</TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                    <span className="sr-only">Toggle menu</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => setSelectedUser(user)}>Ver Detalhes</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center">
                                                    Nenhum cliente encontrado.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <SheetContent className="overflow-y-auto sm:max-w-md">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Detalhes do Cliente</SheetTitle>
                        <SheetDescription>
                            Visão geral do perfil e atividades do usuário.
                        </SheetDescription>
                    </SheetHeader>
                    {selectedUser && (
                        <div className="space-y-6">
                            {/* Header Profile */}
                            <div className="flex flex-col items-center justify-center space-y-3 pb-6 border-b">
                                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedUser.identifier}</p>
                                </div>
                                <Badge variant="outline" className="mt-2">
                                    {selectedUser.platform === 'Telegram' && <Smartphone className="w-3 h-3 mr-1" />}
                                    {selectedUser.platform}
                                </Badge>
                            </div>

                            {/* ID Section */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Identificação</h4>
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">ID do Usuário (Interno)</span>
                                        <p className="font-mono text-sm font-medium">{selectedUser.id}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedUser.id);
                                            toast({
                                                title: "Sucesso",
                                                description: "ID copiado para a área de transferência.",
                                            });
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Status & Product */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Status e Produto
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 border rounded-lg space-y-1">
                                        <span className="text-xs text-muted-foreground">Tipo</span>
                                        <div className="font-medium">{selectedUser.type}</div>
                                    </div>
                                    <div className="p-3 border rounded-lg space-y-1">
                                        <span className="text-xs text-muted-foreground">Status</span>
                                        <div>
                                            <Badge variant={
                                                selectedUser.status === 'Ativo' || selectedUser.status === 'Aprovado' ? 'default' :
                                                    selectedUser.status === 'Expirado' || selectedUser.status === 'Falha' ? 'destructive' : 'secondary'
                                            }>
                                                {selectedUser.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="col-span-2 p-3 border rounded-lg space-y-1">
                                        <span className="text-xs text-muted-foreground">Produto / Plano Atual</span>
                                        <div className="font-medium flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                                            {selectedUser.productName}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subscription Details */}
                            {selectedUser.type === 'Assinatura' && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Assinatura
                                    </h4>
                                    <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Duração</span>
                                            <span className="font-medium">{selectedUser.subscriptionDuration || '-'}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Expira em</span>
                                            <span className="font-medium">{selectedUser.subscriptionExpiresAt || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* History */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Histórico</h4>
                                <div className="flex items-center gap-3 text-sm p-3 border rounded-lg">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Cliente desde:</span>
                                    <span className="font-medium ml-auto">{selectedUser.joinDate}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
