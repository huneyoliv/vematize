'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, QrCode, Check, Loader2, Tag } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface PaymentMethodDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (method: 'pix' | 'card', couponCode?: string) => void;
    planName: string;
    planId: string;
    price: number;
    isLoading?: boolean;
}

export function PaymentMethodDialog({ isOpen, onClose, onConfirm, planName, planId, price, isLoading }: PaymentMethodDialogProps) {
    const { toast } = useToast();
    const [selectedMethod, setSelectedMethod] = useState<'pix' | 'card'>('card');
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: string; value: number } | null>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    const applyCoupon = async () => {
        if (!couponCode) return;

        setIsValidatingCoupon(true);
        try {
            const response = await fetch('/api/validate-coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode, planId })
            });

            const result = await response.json();

            if (result.success && result.discount) {
                setAppliedCoupon({
                    code: couponCode,
                    type: result.discount.type,
                    value: result.discount.value
                });
                toast({
                    title: 'Cupom aplicado!',
                    description: 'Desconto aplicado com sucesso.',
                    variant: 'default'
                });
            } else {
                toast({
                    title: 'Cupom inválido',
                    description: result.message || 'O cupom não é válido.',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Erro ao validar cupom.',
                variant: 'destructive'
            });
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const calculateDiscount = () => {
        if (!appliedCoupon) return 0;

        if (appliedCoupon.type === 'percentage') {
            return price * (appliedCoupon.value / 100);
        } else if (appliedCoupon.type === 'fixed_amount') {
            return Math.min(appliedCoupon.value, price);
        }
        return 0;
    };

    const discount = calculateDiscount();
    const finalPrice = Math.max(price - discount, 0);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Checkout - {planName}</DialogTitle>
                    <DialogDescription>
                        Selecione o método de pagamento e aplique um cupom se tiver
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Resumo do pedido */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Plano {planName}</span>
                            <span>{formatCurrency(price)}/mês</span>
                        </div>
                        {appliedCoupon && discount > 0 && (
                            <>
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Desconto ({appliedCoupon.code})</span>
                                    <span>-{formatCurrency(discount)}</span>
                                </div>
                                {appliedCoupon.type === 'free_days' && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Período gratuito</span>
                                        <span>{appliedCoupon.value} dias grátis</span>
                                    </div>
                                )}
                            </>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span>{formatCurrency(finalPrice)}/mês</span>
                        </div>
                        {appliedCoupon && appliedCoupon.type === 'free_days' && (
                            <p className="text-xs text-muted-foreground">
                                Após {appliedCoupon.value} dias: {formatCurrency(price)}/mês
                            </p>
                        )}
                    </div>

                    {/* Campo de cupom */}
                    <div className="space-y-2">
                        <Label htmlFor="coupon" className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Cupom de Desconto
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="coupon"
                                placeholder="Digite o código"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                disabled={!!appliedCoupon || isValidatingCoupon}
                                className="font-mono"
                            />
                            <Button
                                type="button"
                                variant={appliedCoupon ? "secondary" : "outline"}
                                onClick={applyCoupon}
                                disabled={!couponCode || !!appliedCoupon || isValidatingCoupon}
                                className="min-w-[100px]"
                            >
                                {isValidatingCoupon && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {appliedCoupon ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Aplicado
                                    </>
                                ) : (
                                    'Aplicar'
                                )}
                            </Button>
                        </div>
                        {appliedCoupon && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setAppliedCoupon(null);
                                    setCouponCode('');
                                }}
                                className="text-xs"
                            >
                                Remover cupom
                            </Button>
                        )}
                    </div>

                    {/* Método de pagamento */}
                    <div className="space-y-3">
                        <Label>Método de Pagamento</Label>
                        <RadioGroup 
                            defaultValue="card" 
                            className="grid grid-cols-2 gap-4" 
                            onValueChange={(value: 'pix' | 'card') => setSelectedMethod(value)}
                        >
                            <div>
                                <RadioGroupItem value="card" id="card" className="peer sr-only" />
                                <Label
                                    htmlFor="card"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                    <CreditCard className="mb-3 h-6 w-6" />
                                    <span className="text-sm font-medium">Cartão de Crédito</span>
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="pix" id="pix" className="peer sr-only" />
                                <Label
                                    htmlFor="pix"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                    <QrCode className="mb-3 h-6 w-6" />
                                    <span className="text-sm font-medium">PIX</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button 
                        disabled={isLoading} 
                        onClick={() => onConfirm(selectedMethod, appliedCoupon?.code)}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            'Finalizar Pagamento'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 