"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../utils/logger"));
class EmailService {
    constructor() {
        this.apiKey = env_1.env.BREVO_API_KEY || '';
        this.senderEmail = env_1.env.BREVO_SENDER_EMAIL || '';
        this.senderName = env_1.env.BREVO_SENDER_NAME || 'Vematize';
        if (!this.apiKey || !this.senderEmail) {
            logger_1.default.warn('Brevo API Key or Sender Email not configured in Bot Service');
        }
    }
    async sendEmail({ to, subject, htmlContent }) {
        if (!this.apiKey || !this.senderEmail) {
            logger_1.default.error('Cannot send email: Brevo configuration missing');
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
                logger_1.default.error('Error sending email via Brevo:', errorData);
                return false;
            }
            logger_1.default.info(`Email sent successfully to ${to}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Exception sending email:', error);
            return false;
        }
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
