"use strict";
/**
 * Raw Body Middleware
 * Captura o corpo da requisição em formato bruto para validação de assinatura
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawBodyMiddleware = rawBodyMiddleware;
/**
 * Middleware que captura o raw body da requisição
 * Essencial para validação de assinatura do Discord
 *
 * IMPORTANTE: Deve ser aplicado ANTES do body parser do Express
 */
function rawBodyMiddleware(req, res, next) {
    const chunks = [];
    // Captura os chunks de dados
    req.on('data', (chunk) => {
        chunks.push(chunk);
    });
    // Quando terminar de receber, junta os chunks
    req.on('end', () => {
        try {
            const rawBody = Buffer.concat(chunks);
            const rawBodyString = rawBody.toString('utf8');
            // Salva o raw body para validação de assinatura
            req.rawBody = rawBodyString;
            // Também tenta parsear como JSON para facilitar o uso
            try {
                if (rawBodyString.length > 0) {
                    req.body = JSON.parse(rawBodyString);
                }
                else {
                    req.body = {};
                }
            }
            catch (parseError) {
                // Se não for JSON válido, mantém como string
                req.body = rawBodyString;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    });
    // Em caso de erro no stream
    req.on('error', (err) => {
        next(err);
    });
}
