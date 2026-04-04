import { Module, forwardRef } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramFlowService } from './telegram-flow.service';
import { TelegramDeliveryService } from './telegram-delivery.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [TelegramBotService, TelegramFlowService, TelegramDeliveryService],
  exports: [TelegramBotService, TelegramFlowService, TelegramDeliveryService],
})
export class TelegramModule {}
