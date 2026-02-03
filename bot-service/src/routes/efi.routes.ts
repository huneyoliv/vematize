import { Router } from 'express';
import { efiController } from '../controllers/efi.controller';

const router = Router();

router.post('/plans', (req, res) => efiController.createPlan(req, res));
router.post('/subscribe', (req, res) => efiController.createSubscription(req, res));

router.post('/webhook', (req, res) => efiController.handleWebhook(req, res));
router.post('/webhook/register', (req, res) => efiController.registerWebhook(req, res));
router.post('/pix-charge', (req, res) => efiController.createPixCharge(req, res));
router.get('/pix-charge/:txid', (req, res) => efiController.getPixCharge(req, res));

export default router;
