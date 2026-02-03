import { Router } from 'express';
import { mercadoPagoController } from '../controllers/mercadopago.controller';

const router = Router();

router.post('/saas/subscribe', (req, res) => mercadoPagoController.createSaasSubscription(req, res));
router.post('/saas/preference', (req, res) => mercadoPagoController.createSaasPreference(req, res));
router.post('/saas/pix-payment', (req, res) => mercadoPagoController.createSaasPixPayment(req, res));
router.get('/saas/status/:id', (req, res) => mercadoPagoController.getSaasPaymentStatus(req, res));

export default router;
