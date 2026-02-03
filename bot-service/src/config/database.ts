import { MongoClient } from 'mongodb';
import { env } from './env';

if (!env.MONGODB_URI) {
  throw new Error('❌ MONGODB_URI não está definido no .env');
}

const client = new MongoClient(env.MONGODB_URI);

const clientPromise = client.connect().then((connectedClient) => {
  console.log(`✅ MongoDB connected (${env.NODE_ENV} mode)`);
  return connectedClient;
});

export default clientPromise;


