"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const env_1 = require("./env");
if (!env_1.env.MONGODB_URI) {
    throw new Error('❌ MONGODB_URI não está definido no .env');
}
const client = new mongodb_1.MongoClient(env_1.env.MONGODB_URI);
const clientPromise = client.connect().then((connectedClient) => {
    console.log(`✅ MongoDB connected (${env_1.env.NODE_ENV} mode)`);
    return connectedClient;
});
exports.default = clientPromise;
