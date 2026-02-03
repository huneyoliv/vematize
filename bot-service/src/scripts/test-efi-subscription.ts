
import { efiService } from '../services/efi.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testEfiSubscription() {
    try {
        console.log('Starting Efí Subscription Test...');

        const tenantId = 'global';
        const customer = {
            name: 'Test User',
            cpf: '06266858066', // Valid CPF
            email: 'test@example.com',
            phone: '11999999999'
        };
        const items = [
            {
                name: 'Test Plan',
                value: 100, // R$ 1.00
                amount: 1
            }
        ];
        const customId = 'test_sub_' + Date.now();
        const planId = '12345'; // Mock plan ID, might fail if not real, but we check for other errors first

        console.log('--- Testing Pix Subscription ---');
        try {
            const pixResult: any = await efiService.createSubscription(tenantId, planId, customer, items, customId, 'pix');
            console.log('Pix Result:', JSON.stringify(pixResult, null, 2));
            if (pixResult.payment?.pix?.qrcode) {
                console.log('✅ Pix QR Code generated');
            } else {
                console.error('❌ Pix QR Code missing');
            }
        } catch (e: any) {
            console.error('Pix Test Error:', e.message);
            if (e.response) console.error('Efí Error:', e.response.data);
        }

        console.log('\n--- Testing Link Subscription (Card/Boleto) ---');
        try {
            // 'link' is the default if we pass 'card' or anything else not 'pix'
            const linkResult: any = await efiService.createSubscription(tenantId, planId, customer, items, customId, 'link');
            console.log('Link Result:', JSON.stringify(linkResult, null, 2));
            if (linkResult.payment?.data?.payment_url) {
                console.log('✅ Payment Link generated');
            } else {
                console.error('❌ Payment Link missing');
            }
        } catch (e: any) {
            console.error('Link Test Error:', e.message);
            // Plan ID might be invalid, which is expected if we don't have a real one
            if (e.response) console.error('Efí Error:', e.response.data);
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        process.exit();
    }
}

testEfiSubscription();
