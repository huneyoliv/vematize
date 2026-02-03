"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
async function checkSettings() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found');
        return;
    }
    const client = new mongodb_1.MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('vematize');
        const settings = await db.collection('settings').findOne({ _id: 'global' });
        console.log('Efí Settings:', JSON.stringify(settings?.paymentIntegrations?.efi, null, 2));
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await client.close();
    }
}
checkSettings();
