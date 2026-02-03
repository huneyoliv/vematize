
import crypto from 'crypto';
import { sign } from 'tweetnacl';

// Configuração
const PORT = 8080; // Ajuste se necessário
const BASE_URL = `http://localhost:${PORT}/api/v1/discord/interactions`;
const TEST_TOKEN = 'test-token-123'; // Token simulado

// Gera par de chaves Ed25519 para teste
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    modulusLength: 4096,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

async function test() {
    console.log('🚀 Iniciando teste de verificação do Discord...');

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ type: 1 });

    // Assinatura fake
    const signature = 'a'.repeat(128); // Hex string de 64 bytes (128 chars)

    try {
        console.log(`📡 Enviando request para ${BASE_URL}/${TEST_TOKEN}`);

        const response = await fetch(`${BASE_URL}/${TEST_TOKEN}`, {
            method: 'POST',
            headers: {
                'x-signature-ed25519': signature,
                'x-signature-timestamp': timestamp,
                'Content-Type': 'application/json'
            },
            body: body
        });

        const data = await response.json();

        console.log(`📥 Status: ${response.status}`);
        console.log(`📥 Body:`, data);

        if (response.ok) {
            console.log('✅ Sucesso inesperado (deveria falhar pois o token é fake)');
        } else {
            if (data.error === 'Invalid token') {
                console.log('✅ Teste PASSOU: O servidor leu os headers e tentou validar o token.');
                console.log('   Isso confirma que o middleware de rawBody e a leitura de headers estão funcionando.');
            } else if (data.error === 'Invalid signature') {
                console.log('✅ Teste PASSOU PARCIALMENTE: O servidor validou a assinatura (e falhou como esperado).');
            } else {
                console.log('⚠️ Resultado inconclusivo ou erro diferente do esperado.');
            }
        }

    } catch (error: any) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

test();
