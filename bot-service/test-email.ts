import { emailService } from './src/services/email.service';
import logger from './src/utils/logger';

async function testEmail() {
    console.log('Testing Email Service...');
    const success = await emailService.sendEmail({
        to: 'holiv@vematize.com', // Using a dummy or the user's email if known, but here I'll use a placeholder or try to read from env
        subject: 'Test Email from Bot Service',
        htmlContent: '<h1>It Works!</h1><p>This is a test email from the migrated Bot Service.</p>',
    });

    if (success) {
        console.log('✅ Email sent successfully!');
        process.exit(0);
    } else {
        console.error('❌ Failed to send email.');
        process.exit(1);
    }
}

testEmail();
