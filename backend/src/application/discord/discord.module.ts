import { Module } from '@nestjs/common';
import { DiscordBotService } from './discord-bot.service';
import { DiscordPanelService } from './discord-panel.service';
import { DiscordDeliveryService } from './discord-delivery.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DiscordBotService, DiscordPanelService, DiscordDeliveryService],
  exports: [DiscordBotService, DiscordPanelService, DiscordDeliveryService],
})
export class DiscordModule {}
