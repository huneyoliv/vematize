import { ObjectId } from 'mongodb';
import clientPromise from '../config/database';
import logger from '../utils/logger';

export interface Coupon {
    _id: ObjectId;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    description?: string;
    maxUses?: number;
    currentUses: number;
    expiresAt?: Date;
    isActive: boolean;
    tenantId?: string;
    applicableProducts?: string[];
    applicablePlans?: string[]; // IDs dos planos/produtos
    createdAt: Date;
    updatedAt?: Date;
}

export class CouponService {
    async getCouponByCode(code: string, tenantId: string): Promise<{ success: boolean; coupon?: Coupon; message?: string }> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const couponsCollection = db.collection<Coupon>('coupons');

            // Busca cupom pelo código E tenantId
            const coupon = await couponsCollection.findOne({
                code: code.toUpperCase(),
                tenantId: tenantId
            });

            if (!coupon) {
                return { success: false, message: 'Cupom não encontrado.' };
            }

            // Verifica se o cupom está ativo
            if (!coupon.isActive) {
                return { success: false, message: 'Este cupom não está mais ativo.' };
            }

            // Verifica se o cupom expirou
            if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
                return { success: false, message: 'Este cupom expirou.' };
            }

            // Verifica se atingiu o limite de usos
            if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
                return { success: false, message: 'Este cupom atingiu o limite de usos.' };
            }

            return { success: true, coupon };
        } catch (error) {
            logger.error('Error fetching coupon by code:', error);
            return { success: false, message: 'Erro ao buscar cupom.' };
        }
    }

    async validateCouponForProduct(code: string, productId: string, tenantId: string): Promise<{ success: boolean; discount?: { type: string; value: number }; message?: string }> {
        try {
            const result = await this.getCouponByCode(code, tenantId);

            if (!result.success || !result.coupon) {
                return { success: false, message: result.message };
            }

            const coupon = result.coupon;

            // Verifica se o cupom é aplicável ao produto
            if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
                if (!coupon.applicableProducts.includes(productId)) {
                    return { success: false, message: 'Este cupom não é válido para este produto.' };
                }
            }

            // Retrocompatibilidade
            if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
                if (!coupon.applicablePlans.includes(productId)) {
                    return { success: false, message: 'Este cupom não é válido para este produto.' };
                }
            }

            return {
                success: true,
                discount: {
                    type: coupon.type,
                    value: coupon.value
                }
            };
        } catch (error) {
            logger.error('Error validating coupon:', error);
            return { success: false, message: 'Erro ao validar cupom.' };
        }
    }

    async incrementCouponUse(code: string): Promise<void> {
        try {
            const client = await clientPromise;
            const db = client.db('vematize');
            const couponsCollection = db.collection<Coupon>('coupons');

            await couponsCollection.updateOne(
                { code: code.toUpperCase() },
                {
                    $inc: { currentUses: 1 },
                    $set: { updatedAt: new Date() }
                }
            );
        } catch (error) {
            logger.error('Error incrementing coupon use:', error);
        }
    }
}

export const couponService = new CouponService();
