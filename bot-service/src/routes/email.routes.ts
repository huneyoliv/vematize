import { Router } from 'express';
import { emailController } from '../controllers/email.controller';

const router = Router();

router.post('/send', emailController.sendEmail.bind(emailController));

export default router;
