import clientPromise from '../../config/database';
import logger from '../../utils/logger';

export async function validateInteractionsToken(token: string) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const tenant = await db.collection('tenants').findOne({
      discordInteractionsToken: token
    });

    if (!tenant) {
      logger.error('[Discord] Invalid token - No tenant found');
      return null;
    }

    logger.info(`[Interactions Token] Token validated for tenant: ${tenant._id}`);
    return tenant;
  } catch (error: any) {
    logger.error('[Interactions Token] Error validating token:', error);
    return null;
  }
}


