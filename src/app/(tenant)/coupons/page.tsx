'use client';

import { useState, useEffect } from 'react';
import { getCoupons, createCoupon, toggleCouponStatus, deleteCoupon, getProducts } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage',
        value: '',
        maxUses: '',
        expiresAt: '',
        applicableProducts: [] as string[]
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [couponsData, productsData] = await Promise.all([getCoupons(), getProducts()]);
            setCoupons(couponsData);
            setProducts(productsData);
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                ...formData,
                value: Number(formData.value),
                maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
                expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
                applicableProducts: formData.applicableProducts.length > 0 ? formData.applicableProducts : undefined
            };

            const result = await createCoupon(payload);

            if (result.success) {
                toast({ title: 'Sucesso', description: 'Cupom criado com sucesso!' });
                setIsDialogOpen(false);
                setFormData({
                    code: '',
                    type: 'percentage',
                    value: '',
                    maxUses: '',
                    expiresAt: '',
                    applicableProducts: []
                });
                loadData();
            } else {
                toast({ title: 'Erro', description: result.error, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao criar cupom.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await toggleCouponStatus(id, !currentStatus);
            loadData();
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao atualizar status.', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
        try {
            await deleteCoupon(id);
            toast({ title: 'Sucesso', description: 'Cupom excluído.' });
            loadData();
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao excluir.', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cupons</h1>
                    <p className="text-muted-foreground">Gerencie os cupons de desconto da sua loja.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Novo Cupom</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Criar Novo Cupom</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Código</Label>
                                <Input
                                    placeholder="EX: PROMOCAO10"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={v => setFormData({ ...formData, type: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                            <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Valor</Label>
                                    <Input
                                        type="number"
                                        placeholder="10"
                                        value={formData.value}
                                        onChange={e => setFormData({ ...formData, value: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Produto Específico (Opcional)</Label>
                                <Select
                                    value={formData.applicableProducts[0] || 'all'}
                                    onValueChange={v => setFormData({ ...formData, applicableProducts: v === 'all' ? [] : [v] })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos os produtos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os produtos</SelectItem>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Limite de Usos (Opcional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="Infinito"
                                        value={formData.maxUses}
                                        onChange={e => setFormData({ ...formData, maxUses: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Expira em (Opcional)</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.expiresAt}
                                        onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Cupom'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Seus Cupons</CardTitle>
                    <CardDescription>Lista de todos os cupons ativos e inativos.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                    ) : coupons.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Nenhum cupom criado.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Desconto</TableHead>
                                    <TableHead>Usos</TableHead>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coupons.map((coupon) => (
                                    <TableRow key={coupon._id}>
                                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                                        <TableCell>
                                            {coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value.toFixed(2)}`}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.currentUses} / {coupon.maxUses || '∞'}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.applicableProducts?.length > 0
                                                ? <Badge variant="outline">{products.find(p => p.id === coupon.applicableProducts[0])?.name || 'Produto Específico'}</Badge>
                                                : <Badge variant="secondary">Todos</Badge>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={coupon.isActive}
                                                onCheckedChange={() => handleToggle(coupon._id, coupon.isActive)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon._id)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
