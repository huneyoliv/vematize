"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailController = exports.EmailController = void 0;
const email_service_1 = require("../services/email.service");
const logger_1 = __importDefault(require("../utils/logger"));
class EmailController {
    async sendEmail(req, res) {
        try {
            const { to, subject, htmlContent } = req.body;
            if (!to || !subject || !htmlContent) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: to, subject, htmlContent',
                });
            }
            const success = await email_service_1.emailService.sendEmail({ to, subject, htmlContent });
            if (success) {
                return res.status(200).json({
                    success: true,
                    message: 'Email sent successfully',
                });
            }
            else {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send email',
                });
            }
        }
        catch (error) {
            logger_1.default.error('Error in sendEmail controller:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }
}
exports.EmailController = EmailController;
exports.emailController = new EmailController();
