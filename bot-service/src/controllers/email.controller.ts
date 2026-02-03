import { Request, Response } from 'express';
import { emailService } from '../services/email.service';
import logger from '../utils/logger';

export class EmailController {
    async sendEmail(req: Request, res: Response) {
        try {
            const { to, subject, htmlContent } = req.body;

            if (!to || !subject || !htmlContent) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: to, subject, htmlContent',
                });
            }

            const success = await emailService.sendEmail({ to, subject, htmlContent });

            if (success) {
                return res.status(200).json({
                    success: true,
                    message: 'Email sent successfully',
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send email',
                });
            }
        } catch (error) {
            logger.error('Error in sendEmail controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }
}

export const emailController = new EmailController();
