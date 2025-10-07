/**
 * Regra Custom de ESLint para Validação de Autorização
 * 
 * Esta regra verifica se server actions que recebem 'subdomain'
 * como parâmetro chamam requireTenantAccess() ou withTenantAuth().
 * 
 * USO: Adicionar ao .eslintrc.json
 */

module.exports = {
  rules: {
    'require-tenant-auth': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Server actions com parâmetro subdomain devem chamar requireTenantAccess()',
          category: 'Security',
          recommended: true,
        },
        messages: {
          missingAuth: 'Server action "{{name}}" recebe subdomain mas não chama requireTenantAccess(). VULNERABILIDADE IDOR!',
        },
        schema: [],
      },
      create(context) {
        return {
          // Detecta funções exportadas async
          ExportNamedDeclaration(node) {
            const declaration = node.declaration;
            
            // Verifica se é uma função
            if (declaration && declaration.type === 'FunctionDeclaration') {
              const funcName = declaration.id.name;
              const params = declaration.params;
              
              // Verifica se tem parâmetro 'subdomain'
              const hasSubdomainParam = params.some(param => 
                param.type === 'Identifier' && param.name === 'subdomain'
              );
              
              if (hasSubdomainParam) {
                // Verifica se chama requireTenantAccess no corpo
                const functionBody = declaration.body;
                const hasAuthCall = hasRequireTenantAccessCall(functionBody);
                
                if (!hasAuthCall) {
                  context.report({
                    node: declaration.id,
                    messageId: 'missingAuth',
                    data: {
                      name: funcName,
                    },
                  });
                }
              }
            }
          },
        };
      },
    },
  },
};

function hasRequireTenantAccessCall(node) {
  // Implementação simplificada - procura por chamadas a requireTenantAccess
  const sourceCode = node.toString();
  return sourceCode.includes('requireTenantAccess') || 
         sourceCode.includes('withTenantAuth');
}

/**
 * NOTA: Esta é uma implementação simplificada.
 * Para produção, usar AST walker completo para verificar
 * chamadas de função dentro do bloco try.
 * 
 * Exemplo de uso em .eslintrc.json:
 * 
 * {
 *   "plugins": ["./eslintrc.authz.js"],
 *   "rules": {
 *     "require-tenant-auth": "error"
 *   }
 * }
 */

