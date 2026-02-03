import { getVerificationEmailHtml, getPasswordResetEmailHtml, getLegalUpdateEmailHtml } from '../src/lib/email-templates';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const outputDir = path.join(process.cwd(), 'tmp', 'email-previews');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate templates
const verificationHtml = getVerificationEmailHtml('João Silva', 'http://localhost:3000/verify-email?token=123');
const resetPasswordHtml = getPasswordResetEmailHtml('http://localhost:3000/reset-password?token=123');
const legalUpdateHtml = getLegalUpdateEmailHtml('terms_of_service', new Date(), 'http://localhost:3000/terms');

// Save to files
const verificationPath = path.join(outputDir, 'verification.html');
const resetPasswordPath = path.join(outputDir, 'reset-password.html');
const legalUpdatePath = path.join(outputDir, 'legal-update.html');

fs.writeFileSync(verificationPath, verificationHtml);
fs.writeFileSync(resetPasswordPath, resetPasswordHtml);
fs.writeFileSync(legalUpdatePath, legalUpdateHtml);

console.log('Templates generated in:', outputDir);

// Open in Brave
const command = `brave-browser "${verificationPath}" "${resetPasswordPath}" "${legalUpdatePath}"`;
console.log('Opening in Brave...');

exec(command, (error) => {
    if (error) {
        console.error('Failed to open Brave:', error);
        console.log('You can manually open the files:');
        console.log(verificationPath);
        console.log(resetPasswordPath);
        console.log(legalUpdatePath);
    } else {
        console.log('Opened successfully!');
    }
});
