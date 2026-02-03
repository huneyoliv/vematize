/**
 * Raw Body Middleware
 * Captura o corpo da requisição em formato bruto para validação de assinatura
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware que captura o raw body da requisição
 * Essencial para validação de assinatura do Discord
 *
 * IMPORTANTE: Deve ser aplicado ANTES do body parser do Express
 */
export function rawBodyMiddleware(req: Request, res: Response, next: NextFunction) {
  const chunks: Buffer[] = [];

  // Captura os chunks de dados
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  // Quando terminar de receber, junta os chunks
  req.on('end', () => {
    try {
      const rawBody = Buffer.concat(chunks);
      const rawBodyString = rawBody.toString('utf8');

      // Salva o raw body para validação de assinatura
      (req as any).rawBody = rawBodyString;

      // Também tenta parsear como JSON para facilitar o uso
      try {
        if (rawBodyString.length > 0) {
          req.body = JSON.parse(rawBodyString);
        } else {
          req.body = {};
        }
      } catch (parseError) {
        // Se não for JSON válido, mantém como string
        req.body = rawBodyString;
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // Em caso de erro no stream
  req.on('error', (err: Error) => {
    next(err);
  });
}
