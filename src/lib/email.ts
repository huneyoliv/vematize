import { logAuth } from '@/lib/logger';
import { getVerificationEmailHtml, getPasswordResetEmailHtml, getLegalUpdateEmailHtml } from '@/lib/email-templates';
import { BotServiceClient } from '@/lib/bot-service-client';

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailParams): Promise<boolean> {
  try {
    const botService = new BotServiceClient();
    const response = await botService.post('/api/v1/email/send', {
      to,
      subject,
      htmlContent,
    });

    if (!response.success) {
      console.error('Error sending email via Bot Service:', response.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception sending email:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, token: string, name: string): Promise<boolean> {
  const verificationUrl = `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  const htmlContent = getVerificationEmailHtml(name, verificationUrl);

  return sendEmail({
    to: email,
    subject: 'Verifique seu e-mail - Vematize',
    htmlContent,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  const htmlContent = getPasswordResetEmailHtml(resetUrl);

  return sendEmail({
    to: email,
    subject: 'Redefinição de Senha - Vematize',
    htmlContent,
  });
}

export async function sendLegalUpdateEmail(emails: string[], type: 'terms_of_service' | 'privacy_policy', effectiveDate: Date): Promise<void> {
  const subject = type === 'terms_of_service' ? 'Atualização nos Termos de Uso' : 'Atualização na Política de Privacidade';
  const docUrl = `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL}/${type === 'terms_of_service' ? 'terms' : 'privacy'}`;
  const htmlContent = getLegalUpdateEmailHtml(type, effectiveDate, docUrl);

  // Send to each email individually
  // Note: In a production environment with many users, this should be handled by a queue or bulk email endpoint.
  // For now, we use Promise.all to send them in parallel.
  await Promise.all(emails.map(email => sendEmail({ to: email, subject, htmlContent })));
}
