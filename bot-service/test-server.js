/**
 * Script de teste rápido para verificar se o servidor consegue iniciar
 * Execute: node test-server.js
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Verificando configuração do Bot Service...\n');

// 1. Verifica se .env existe
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example.txt');

if (fs.existsSync(envPath)) {
  console.log('✅ .env encontrado');
  
  // Lê e valida variáveis críticas
  const envContent = fs.readFileSync(envPath, 'utf8');
  const required = [
    'DATABASE_URL',
    'API_SECRET_KEY',
    'CRON_SECRET',
    'NEXT_PUBLIC_BASE_URL'
  ];
  
  console.log('\n📋 Variáveis de ambiente:');
  required.forEach(key => {
    const regex = new RegExp(`^${key}=(.+)$`, 'm');
    const match = envContent.match(regex);
    if (match && match[1] && !match[1].includes('seu_') && !match[1].includes('usuario:senha')) {
      console.log(`  ✅ ${key} configurado`);
    } else {
      console.log(`  ❌ ${key} não configurado ou usando valor de exemplo`);
    }
  });
} else {
  console.log('❌ .env NÃO encontrado');
  console.log('\n📝 Execute:');
  console.log('  1. cp env.example.txt .env');
  console.log('  2. Edite o .env com suas credenciais');
  process.exit(1);
}

// 2. Verifica se node_modules existe
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('\n✅ node_modules instalado');
} else {
  console.log('\n❌ node_modules NÃO encontrado');
  console.log('Execute: npm install');
  process.exit(1);
}

// 3. Verifica se src/server.ts existe e não está vazio
const serverPath = path.join(__dirname, 'src', 'server.ts');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  if (serverContent.trim().length > 0) {
    console.log('✅ src/server.ts existe e não está vazio');
    console.log(`   Tamanho: ${serverContent.length} caracteres`);
  } else {
    console.log('❌ src/server.ts está VAZIO');
    process.exit(1);
  }
} else {
  console.log('❌ src/server.ts NÃO encontrado');
  process.exit(1);
}

// 4. Verifica TypeScript
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
if (fs.existsSync(tsConfigPath)) {
  console.log('✅ tsconfig.json encontrado');
} else {
  console.log('❌ tsconfig.json NÃO encontrado');
}

console.log('\n✨ Verificação completa!');
console.log('\n🚀 Para iniciar o servidor, execute:');
console.log('  npm run dev:tsx    (recomendado - mais rápido)');
console.log('  npm run dev        (nodemon + ts-node)');
console.log('  npm run dev:ts-node (ts-node direto)');

