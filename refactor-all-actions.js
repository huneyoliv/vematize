// Script Node.js para refatorar todos os actions.ts de uma vez
const fs = require('fs');
const path = require('path');

const files = [
  'src/app/products/actions.ts',
  'src/app/bots/actions.ts',
  'src/app/plan/actions.ts',
  'src/app/settings/actions.ts',
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Atualizar import
  content = content.replace(
    /import { requireTenantAccess } from ['"]@\/lib\/auth['"];?/g,
    "import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';"
  );
  
  // 2. Remover parâmetro subdomain das funções (primeira ocorrência)
  content = content.replace(
    /export async function (\w+)\(subdomain: string,?\s*/g,
    'export async function $1('
  );
  
  // 3. Substituir lógica de validação
  content = content.replace(
    /await requireTenantAccess\(subdomain\);?\s*\n\s*const client = await clientPromise;\s*\n\s*const db = client\.db\('vematize'\);\s*\n\s*const tenant = await db\.collection[^;]+\.findOne\(\{\s*\$or:\s*\[\{\s*username:\s*subdomain\s*\},\s*\{\s*subdomain\s*\}\s*\]\s*\}[^\)]*\);?\s*/gs,
    'const tenant = await getTenantFromSession();\n        const client = await clientPromise;\n        const db = client.db(\'vematize\');\n        '
  );

  // 4. Substituir outras variações de busca de tenant
  content = content.replace(
    /const tenant = await (?:db\.collection\(?(?:'|")tenants(?:'|")\)?|tenantsCollection)\.findOne\(\{\s*\$or:\s*\[\{\s*username:\s*subdomain\s*\},\s*\{\s*subdomain\s*\}\s*\]\s*\}[^\)]*\);?/g,
    '// Tenant já obtido da sessão'
  );
  
  // 5. Atualizar revalidatePath
  content = content.replace(
    /revalidatePath\(`\/\$\{subdomain\}\/(\w+)`\)/g,
    "revalidatePath('/$1')"
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Refatorado: ${filePath}`);
});

console.log('\n🎉 Refatoração concluída!');

