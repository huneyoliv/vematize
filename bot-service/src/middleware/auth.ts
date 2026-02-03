import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Middleware para logar requisições públicas
export function logPublicRequest(req: Request, res: Response, next: NextFunction) {
  logger.info('Public endpoint accessed');
  next();
}


