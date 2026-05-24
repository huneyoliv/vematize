import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionRepository } from '../../infrastructure/database/repositories/subscription.repository';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processExpirations() {
    this.logger.log('Verificando assinaturas expiradas...');
    const expired = await this.subscriptionRepo.findExpiredActive();
    
    if (expired.length > 0) {
      this.logger.log(`Encontradas ${expired.length} assinaturas para expirar.`);
      for (const sub of expired) {
        await this.subscriptionService.expire(sub.id);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processExpirationWarnings() {
    this.logger.log('Verificando avisos de expiração (3 dias)...');
    const expiring = await this.subscriptionRepo.findExpiringInDays(3);

    if (expiring.length > 0) {
      this.logger.log(`Encontradas ${expiring.length} assinaturas precisando de aviso.`);
      for (const sub of expiring) {
        await this.subscriptionService.sendExpirationWarning(sub.id);
      }
    }
  }
}
