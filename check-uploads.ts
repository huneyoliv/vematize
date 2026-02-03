
import 'dotenv/config';
import clientPromise from './src/lib/mongodb';
import { ObjectId } from 'mongodb';

async function check() {
    try {
        const client = await clientPromise;
        const db = client.db('vematize');
        const uploads = await db.collection('uploads').find({}).toArray();
        console.log('Total uploads:', uploads.length);
        if (uploads.length > 0) {
            console.log('Sample upload:', JSON.stringify(uploads[0], null, 2));
            console.log('TenantId type:', typeof uploads[0].tenantId);
        } else {
            console.log('No uploads found.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
