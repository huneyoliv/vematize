
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkSettings() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found');
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('vematize');
        const settings = await db.collection('settings').findOne({ _id: 'global' as any });

        console.log('Efí Settings:', JSON.stringify(settings?.paymentIntegrations?.efi, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkSettings();
