'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, Trash2, Copy } from 'lucide-react';
import { CouponFormDialog } from './coupon-form-dialog';
import { deleteCoupon, toggleCouponStatus } from '../actions';
import { useToast } from '@/hooks/use-toast';
import type { Coupon } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CouponsManagerProps {
  initialCoupons: Coupon[];
}

export function CouponsManager({ initialCoupons }: CouponsManagerProps) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreate = () => {
    setSelectedCoupon(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCoupon(id);
    toast({
      title: result.success ? 'Sucesso!' : 'Erro!',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });
    
    if (result.success) {
      setCoupons(coupons.filter(c => ((c as any)._id?.toString() || c.id) !== id));
    }
    setCouponToDelete(null);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const result = await toggleCouponStatus(id, !currentStatus);
    toast({
      title: result.success ? 'Sucesso!' : 'Erro!',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });
    
    if (result.success) {
      setCoupons(coupons.map(c => 
        ((c as any)._id?.toString() || c.id) === id ? { ...c, isActive: !currentStatus } : c
      ));
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copiado!',
      description: 'Código do cupom copiado para a área de transferência.',
    });
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      percentage: 'Percentual',
      fixed_amount: 'Valor Fixo',
      free_days: 'Dias Grátis'
    };
    return types[type] || type;
  };

  const getValueDisplay = (coupon: Coupon) => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}%`;
    } else if (coupon.type === 'fixed_amount') {
      return `R$ ${coupon.value.toFixed(2)}`;
    } else if (coupon.type === 'free_days') {
      return `${coupon.value} dias`;
    }
    return coupon.value.toString();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Total de cupons: {coupons.length}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum cupom cadastrado. Clique em "Novo Cupom" para criar um.
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={((coupon as any)._id?.toString() || coupon.id)}>
                  <TableCell className="font-mono font-semibold">
                    <div className="flex items-center gap-2">
                      {coupon.code}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyCode(coupon.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(coupon.type)}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {getValueDisplay(coupon)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {coupon.currentUses}
                      {coupon.maxUses && ` / ${coupon.maxUses}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    {coupon.expiresAt ? (
                      <span className="text-sm">
                        {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem expiração</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={coupon.isActive}
                        onCheckedChange={() => handleToggleStatus(((coupon as any)._id?.toString() || coupon.id), coupon.isActive)}
                      />
                      <span className="text-sm">
                        {coupon.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCouponToDelete(((coupon as any)._id?.toString() || coupon.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CouponFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        coupon={selectedCoupon}
        onSuccess={(newCoupon) => {
          if (selectedCoupon) {
            setCoupons(coupons.map(c => 
              ((c as any)._id?.toString() || c.id) === ((newCoupon as any)._id?.toString() || newCoupon.id) ? newCoupon : c
            ));
          } else {
            setCoupons([newCoupon, ...coupons]);
          }
        }}
      />

      <AlertDialog open={!!couponToDelete} onOpenChange={() => setCouponToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => couponToDelete && handleDelete(couponToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}





