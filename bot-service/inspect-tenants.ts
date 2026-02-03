import clientPromise from './src/config/database';

async function checkTenants() {
    try {
        const client = await clientPromise;
        const db = client.db('vematize');
        const tenants = await db.collection('tenants').find({}).limit(5).toArray();

        console.log('Checking Tenants Data Structure:');
        tenants.forEach(t => {
            console.log(`Tenant ID: ${t._id}`);
            console.log('Connections:', JSON.stringify(t.connections, null, 2));
            console.log('Discord Interactions Token:', t.discordInteractionsToken ? 'PRESENT' : 'MISSING');
            console.log('---');
        });
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTenants();
