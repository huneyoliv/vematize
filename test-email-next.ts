import { sendEmail } from './src/lib/email';

async function testNextJsEmail() {
    console.log('Testing Next.js Email Integration...');
    const success = await sendEmail({
        to: 'holiv@vematize.com',
        subject: 'Test Email from Next.js via Bot Service',
        htmlContent: '<h1>It Works!</h1><p>This email was sent from Next.js, proxied through Bot Service.</p>',
    });

    if (success) {
        console.log('✅ Next.js Email sent successfully!');
        process.exit(0);
    } else {
        console.error('❌ Failed to send email from Next.js.');
        process.exit(1);
    }
}

testNextJsEmail();
