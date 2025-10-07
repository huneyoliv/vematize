'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CouponSchema } from '@/lib/schemas';
import { saveCoupon, getCoupons } from '../actions';
import type { Coupon } from '@/lib/types';
import { Loader2 } from 'lucide-react';

type CouponFormData = z.infer<typeof CouponSchema>;

interface CouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: Coupon | null;
  onSuccess: (coupon: Coupon) => void;
}

export function CouponFormDialog({ open, onOpenChange, coupon, onSuccess }: CouponFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CouponFormData>({
    resolver: zodResolver(CouponSchema),
    defaultValues: {
      code: '',
      type: 'percentage',
      value: 0,
      description: '',
      maxUses: undefined,
      expiresAt: '',
      isActive: true,
      applicablePlans: [],
    },
  });

  useEffect(() => {
    if (open && coupon) {
      form.reset({
        id: (coupon as any)._id?.toString() || coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description || '',
        maxUses: coupon.maxUses,
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
        isActive: coupon.isActive,
        applicablePlans: coupon.applicablePlans || [],
      });
    } else if (open) {
      form.reset({
        code: '',
        type: 'percentage',
        value: 0,
        description: '',
        maxUses: undefined,
        expiresAt: '',
        isActive: true,
        applicablePlans: [],
      });
    }
  }, [open, coupon, form]);

  const onSubmit = async (data: CouponFormData) => {
    setIsSubmitting(true);
    
    const formData = new FormData();
    if (data.id) formData.append('id', data.id);
    formData.append('code', data.code);
    formData.append('type', data.type);
    formData.append('value', data.value.toString());
    if (data.description) formData.append('description', data.description);
    if (data.maxUses) formData.append('maxUses', data.maxUses.toString());
    if (data.expiresAt) formData.append('expiresAt', data.expiresAt);
    formData.append('isActive', data.isActive.toString());
    if (data.applicablePlans) formData.append('applicablePlans', JSON.stringify(data.applicablePlans));

    const result = await saveCoupon(formData, 'admin'); // TODO: Get actual admin ID
    
    setIsSubmitting(false);

    toast({
      title: result.success ? 'Sucesso!' : 'Erro!',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });

    if (result.success) {
      // Busca os cupons atualizados para retornar o cupom salvo
      const coupons = await getCoupons();
      const savedCoupon = coupons.find(c => c.code === data.code);
      
      if (savedCoupon) {
        onSuccess(savedCoupon);
      }
      
      onOpenChange(false);
    }
  };

  const watchType = form.watch('type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {coupon ? 'Editar Cupom' : 'Novo Cupom'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código do Cupom</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="DESCONTO10" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Use apenas letras maiúsculas, números, hífens e underscores.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Desconto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                      <SelectItem value="free_days">Dias Grátis</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchType === 'percentage' && 'Percentual (%)'}
                    {watchType === 'fixed_amount' && 'Valor (R$)'}
                    {watchType === 'free_days' && 'Dias Grátis'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step={watchType === 'fixed_amount' ? '0.01' : '1'}
                      min="0"
                      max={watchType === 'percentage' ? '100' : undefined}
                      placeholder={
                        watchType === 'percentage' ? '10' :
                        watchType === 'fixed_amount' ? '50.00' :
                        '30'
                      }
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cupom de desconto para Black Friday..."
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxUses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máximo de Usos</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ilimitado"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Deixe vazio para ilimitado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Expiração</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Deixe vazio para não expirar
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Cupom Ativo</FormLabel>
                    <FormDescription className="text-xs">
                      Cupons inativos não podem ser utilizados
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {coupon ? 'Salvar Alterações' : 'Criar Cupom'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}



