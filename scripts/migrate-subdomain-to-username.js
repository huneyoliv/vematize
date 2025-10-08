/**
 * Script de Migração: Subdomain → Username
 * 
 * Este script:
 * 1. Busca todos os tenants sem campo 'username'
 * 2. Copia o valor de 'subdomain' para 'username'
 * 3. Garante que usernames sejam únicos (adiciona sufixo se necessário)
 * 
 * IMPORTANTE: Fazer backup do banco antes de executar!
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'vematize';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não encontrado no .env.local');
  process.exit(1);
}

async function migrateSubdomainToUsername() {
  console.log('🔄 Iniciando migração: subdomain → username\n');
  
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado ao MongoDB\n');

    const db = client.db(DB_NAME);
    const tenantsCollection = db.collection('tenants');

    // 1. Estatísticas antes da migração
    const totalTenants = await tenantsCollection.countDocuments();
    const tenantsWithoutUsername = await tenantsCollection.countDocuments({
      username: { $exists: false }
    });
    const tenantsWithoutSubdomain = await tenantsCollection.countDocuments({
      subdomain: { $exists: false }
    });

    console.log('📊 ESTATÍSTICAS ANTES DA MIGRAÇÃO:');
    console.log(`   Total de tenants: ${totalTenants}`);
    console.log(`   Sem username: ${tenantsWithoutUsername}`);
    console.log(`   Sem subdomain: ${tenantsWithoutSubdomain}\n`);

    if (tenantsWithoutUsername === 0) {
      console.log('✅ Nenhuma migração necessária! Todos os tenants já têm username.');
      return;
    }

    // 2. Buscar tenants que precisam de migração
    const tenantsToMigrate = await tenantsCollection.find({
      username: { $exists: false }
    }).toArray();

    console.log(`🔧 Migrando ${tenantsToMigrate.length} tenants...\n`);

    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    // 3. Migrar cada tenant
    for (const tenant of tenantsToMigrate) {
      try {
        // Se não tem subdomain, pula ou gera um username padrão
        if (!tenant.subdomain) {
          console.log(`⚠️  Tenant ${tenant._id} (${tenant.ownerEmail}) não tem subdomain. Gerando username...`);
          
          // Gera username a partir do email
          let baseUsername = tenant.ownerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
          let username = baseUsername;
          let suffix = 1;

          // Garante que é único
          while (await tenantsCollection.findOne({ username })) {
            username = `${baseUsername}_${suffix}`;
            suffix++;
          }

          await tenantsCollection.updateOne(
            { _id: tenant._id },
            { 
              $set: { 
                username,
                subdomain: username // Define subdomain também
              } 
            }
          );

          console.log(`   ✓ ${tenant.ownerEmail} → username: ${username} (gerado)`);
          migratedCount++;
          continue;
        }

        // Usa subdomain como base para username
        let username = tenant.subdomain;
        let suffix = 1;

        // Verifica se username já existe
        while (await tenantsCollection.findOne({ 
          _id: { $ne: tenant._id },
          username 
        })) {
          username = `${tenant.subdomain}_${suffix}`;
          suffix++;
        }

        // Atualiza o tenant
        await tenantsCollection.updateOne(
          { _id: tenant._id },
          { $set: { username } }
        );

        const suffixInfo = suffix > 1 ? ` (com sufixo _${suffix - 1})` : '';
        console.log(`   ✓ ${tenant.ownerEmail} → username: ${username}${suffixInfo}`);
        migratedCount++;

      } catch (error) {
        console.error(`   ✗ Erro ao migrar ${tenant.ownerEmail}:`, error.message);
        errorCount++;
        errors.push({ tenant: tenant.ownerEmail, error: error.message });
      }
    }

    // 4. Estatísticas após migração
    console.log('\n📊 ESTATÍSTICAS APÓS MIGRAÇÃO:');
    const finalTenantsWithoutUsername = await tenantsCollection.countDocuments({
      username: { $exists: false }
    });
    
    console.log(`   ✅ Migrados com sucesso: ${migratedCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📝 Sem username (restantes): ${finalTenantsWithoutUsername}\n`);

    // 5. Verificar duplicatas
    const duplicates = await tenantsCollection.aggregate([
      { $group: { _id: "$username", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log('⚠️  ATENÇÃO: Usernames duplicados encontrados:');
      duplicates.forEach(dup => {
        console.log(`   - "${dup._id}": ${dup.count} ocorrências`);
      });
      console.log('   Execute o script novamente para corrigir.\n');
    } else {
      console.log('✅ Nenhum username duplicado encontrado!\n');
    }

    // 6. Mostrar erros se houver
    if (errors.length > 0) {
      console.log('❌ ERROS DURANTE MIGRAÇÃO:');
      errors.forEach(err => {
        console.log(`   - ${err.tenant}: ${err.error}`);
      });
      console.log();
    }

    console.log('✅ Migração concluída!\n');

  } catch (error) {
    console.error('❌ Erro fatal durante migração:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Conexão com MongoDB fechada.');
  }
}

// Executar migração
if (require.main === module) {
  migrateSubdomainToUsername()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Erro:', err);
      process.exit(1);
    });
}

module.exports = { migrateSubdomainToUsername };

