import { env } from '../config/env';
import logger from '../utils/logger';

interface SendEmailParams {
    to: string;
    subject: string;
    htmlContent: string;
}

export class EmailService {
    private apiKey: string;
    private senderEmail: string;
    private senderName: string;

    constructor() {
        this.apiKey = env.BREVO_API_KEY || '';
        this.senderEmail = env.BREVO_SENDER_EMAIL || '';
        this.senderName = env.BREVO_SENDER_NAME || 'Vematize';

        if (!this.apiKey || !this.senderEmail) {
            logger.warn('Brevo API Key or Sender Email not configured in Bot Service');
        }
    }

    async sendEmail({ to, subject, htmlContent }: SendEmailParams): Promise<boolean> {
        if (!this.apiKey || !this.senderEmail) {
            logger.error('Cannot send email: Brevo configuration missing');
            return false;
        }

        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': this.apiKey,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    sender: {
                        name: this.senderName,
                        email: this.senderEmail,
                    },
                    to: [
                        {
                            email: to,
                        },
                    ],
                    subject: subject,
                    htmlContent: htmlContent,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('Error sending email via Brevo:', errorData);
                return false;
            }

            logger.info(`Email sent successfully to ${to}`);
            return true;
        } catch (error) {
            logger.error('Exception sending email:', error);
            return false;
        }
    }
}

export const emailService = new EmailService();
