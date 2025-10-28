import { MongoClient, MongoClientOptions } from 'mongodb'

let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('CRITICAL_WARNING: Missing environment variable: "MONGODB_URI"');
  console.error('The application will not be able to connect to the database.');
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  
  clientPromise = Promise.reject(new Error('Missing environment variable: "MONGODB_URI"'));

} else {
    const uri = process.env.MONGODB_URI
    
    // Opções otimizadas de conexão
    const options: MongoClientOptions = {
      maxPoolSize: 10, // Máximo de conexões simultâneas
      minPoolSize: 2,  // Mínimo de conexões mantidas
      maxIdleTimeMS: 60000, // 60s - Fecha conexões ociosas
      serverSelectionTimeoutMS: 10000, // 10s - Timeout para selecionar servidor
      socketTimeoutMS: 45000, // 45s - Timeout de socket
      connectTimeoutMS: 10000, // 10s - Timeout de conexão
      retryWrites: false, // Desabilitado - deployment não suporta retryable writes
      retryReads: true, // Retry automático de leituras
    }

    let client: MongoClient;

    if (process.env.NODE_ENV === 'development') {
      let globalWithMongo = global as typeof global & {
        _mongoClientPromise?: Promise<MongoClient>
      }

      if (!globalWithMongo._mongoClientPromise) {
        console.log('[MongoDB] Creating new connection pool (development)...')
        client = new MongoClient(uri, options)
        globalWithMongo._mongoClientPromise = client.connect()
          .then(connectedClient => {
            console.log('[MongoDB] ✅ Connected successfully (development)')
            return connectedClient
          })
          .catch(err => {
            console.error('[MongoDB] ❌ Connection failed:', err.message)
            // Remove do cache para permitir nova tentativa
            globalWithMongo._mongoClientPromise = undefined
            throw err
          })
      }
      clientPromise = globalWithMongo._mongoClientPromise
    } else {
      console.log('[MongoDB] Creating new connection pool (production)...')
      client = new MongoClient(uri, options)
      clientPromise = client.connect()
        .then(connectedClient => {
          console.log('[MongoDB] ✅ Connected successfully (production)')
          return connectedClient
        })
        .catch(err => {
          console.error('[MongoDB] ❌ Connection failed:', err.message)
          throw err
        })
    }
}

export default clientPromise
