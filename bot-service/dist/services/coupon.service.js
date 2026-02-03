"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.couponService = exports.CouponService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
class CouponService {
    async getCouponByCode(code, tenantId) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const couponsCollection = db.collection('coupons');
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
        }
        catch (error) {
            logger_1.default.error('Error fetching coupon by code:', error);
            return { success: false, message: 'Erro ao buscar cupom.' };
        }
    }
    async validateCouponForProduct(code, productId, tenantId) {
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
        }
        catch (error) {
            logger_1.default.error('Error validating coupon:', error);
            return { success: false, message: 'Erro ao validar cupom.' };
        }
    }
    async incrementCouponUse(code) {
        try {
            const client = await database_1.default;
            const db = client.db('vematize');
            const couponsCollection = db.collection('coupons');
            await couponsCollection.updateOne({ code: code.toUpperCase() }, {
                $inc: { currentUses: 1 },
                $set: { updatedAt: new Date() }
            });
        }
        catch (error) {
            logger_1.default.error('Error incrementing coupon use:', error);
        }
    }
}
exports.CouponService = CouponService;
exports.couponService = new CouponService();
