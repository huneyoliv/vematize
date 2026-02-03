import { Request, Response } from 'express';
import { mercadoPagoService } from '../services/mercadopago.service';
import logger from '../utils/logger';

class MercadoPagoController {
    async createSaasSubscription(req: Request, res: Response) {
        try {
            const { tenantId, plan, customer, backUrl, reason, externalReference } = req.body;

            if (!tenantId || !plan || !customer) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const result = await mercadoPagoService.createSaasSubscription(
                tenantId,
                plan,
                customer,
                backUrl,
                reason,
                externalReference
            );
            res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error('Error in createSaasSubscription controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to create SaaS subscription' });
        }
    }

    async createSaasPreference(req: Request, res: Response) {
        try {
            const { tenantId, items, payer, backUrls, externalReference, notificationUrl } = req.body;

            if (!tenantId || !items || !payer) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const result = await mercadoPagoService.createSaasPreference(
                tenantId,
                items,
                payer,
                backUrls,
                externalReference,
                notificationUrl
            );
            res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error('Error in createSaasPreference controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to create SaaS preference' });
        }
    }

    async createSaasPixPayment(req: Request, res: Response) {
        try {
            const { tenantId, transactionAmount, description, payer, externalReference, notificationUrl } = req.body;

            if (!tenantId || !transactionAmount || !payer) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const result = await mercadoPagoService.createSaasPixPayment(
                tenantId,
                transactionAmount,
                description,
                payer,
                externalReference,
                notificationUrl
            );
            res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error('Error in createSaasPixPayment controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to create SaaS Pix payment' });
        }
    }

    async getSaasPaymentStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { tenantId } = req.query;

            if (!id || !tenantId) {
                return res.status(400).json({ success: false, message: 'Missing required fields (id or tenantId)' });
            }

            const result = await mercadoPagoService.getSaasPaymentStatus(tenantId as string, id);
            res.json({ success: true, data: result });
        } catch (error: any) {
            logger.error('Error in getSaasPaymentStatus controller:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to get payment status' });
        }
    }
}

export const mercadoPagoController = new MercadoPagoController();
