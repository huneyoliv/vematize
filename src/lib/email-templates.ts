export const styles = `
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #51545e; margin: 0; padding: 0; -webkit-text-size-adjust: none; height: 100%; line-height: 1.4; }
  .email-wrapper { width: 100%; background-color: #f4f4f7; padding: 20px; }
  .email-content { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
  .email-header { background-color: #000000; padding: 20px; text-align: center; }
  .email-header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; }
  .email-body { padding: 40px 30px; }
  .email-body h2 { margin-top: 0; color: #333333; font-size: 20px; font-weight: bold; }
  .email-body p { margin: 20px 0; font-size: 16px; color: #51545e; }
  .button-container { text-align: center; margin: 30px 0; }
  .button { display: inline-block; background-color: #0070f3; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; }
  .email-footer { background-color: #f4f4f7; padding: 20px; text-align: center; font-size: 12px; color: #6b6e76; }
  .email-footer a { color: #6b6e76; text-decoration: underline; }
`;

const baseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <div class="email-header">
        <h1>Vematize</h1>
      </div>
      <div class="email-body">
        ${content}
      </div>
    </div>
    <div class="email-footer">
      <p>&copy; ${new Date().getFullYear()} Vematize. Todos os direitos reservados.</p>
      <p>Este é um e-mail automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
`;

export function getVerificationEmailHtml(name: string, url: string) {
    const content = `
    <h2>Bem-vindo(a), ${name}!</h2>
    <p>Obrigado por se cadastrar no Vematize. Estamos muito felizes em tê-lo conosco.</p>
    <p>Para garantir a segurança da sua conta e acessar todos os recursos, por favor confirme seu endereço de e-mail clicando no botão abaixo:</p>
    <div class="button-container">
      <a href="${url}" class="button">Verificar E-mail</a>
    </div>
    <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Este link é válido por 24 horas.</p>
  `;
    return baseTemplate('Verifique seu e-mail', content);
}

export function getPasswordResetEmailHtml(url: string) {
    const content = `
    <h2>Recuperação de Senha</h2>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta Vematize.</p>
    <p>Se foi você quem solicitou, clique no botão abaixo para criar uma nova senha:</p>
    <div class="button-container">
      <a href="${url}" class="button">Redefinir Senha</a>
    </div>
    <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
    <p><a href="${url}">${url}</a></p>
    <p>Este link expira em 1 hora.</p>
    <p>Se você não solicitou esta alteração, pode ignorar este e-mail com segurança. Sua senha permanecerá a mesma.</p>
  `;
    return baseTemplate('Redefinição de Senha', content);
}

export function getLegalUpdateEmailHtml(type: 'terms_of_service' | 'privacy_policy', effectiveDate: Date, url: string) {
    const title = type === 'terms_of_service' ? 'Termos de Uso' : 'Política de Privacidade';
    const dateStr = effectiveDate.toLocaleDateString('pt-BR');

    const content = `
    <h2>Atualização nos ${title}</h2>
    <p>Olá,</p>
    <p>Gostaríamos de informar que realizamos atualizações importantes em nossos documentos legais.</p>
    <p>As novas regras dos nossos <strong>${title}</strong> entrarão em vigor em <strong>${dateStr}</strong>.</p>
    <p>Recomendamos que você leia o documento atualizado para entender as mudanças:</p>
    <div class="button-container">
      <a href="${url}" class="button">Ler Documento Atualizado</a>
    </div>
    <p>Ou acesse diretamente: <a href="${url}">${url}</a></p>
    <p>Ao continuar usando nossos serviços após esta data, você concorda com as atualizações.</p>
  `;
    return baseTemplate(`Atualização: ${title}`, content);
}
