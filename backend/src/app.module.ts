import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './infrastructure/database/database.module';
import {
  UserRepository,
  ProductRepository,
  SaleRepository,
  BotConfigRepository,
  CouponRepository,
  SettingsRepository,
  GalleryImageRepository,
  SubscriptionRepository,
} from './infrastructure/database/repositories';
import { JwtStrategy } from './presentation/guards/jwt.strategy';
import { AuthController } from './presentation/controllers/auth.controller';
import { ProductsController } from './presentation/controllers/products.controller';
import { UsersController } from './presentation/controllers/users.controller';
import { SalesController } from './presentation/controllers/sales.controller';
import { BotsController } from './presentation/controllers/bots.controller';
import { CouponsController } from './presentation/controllers/coupons.controller';
import { DashboardController } from './presentation/controllers/dashboard.controller';
import { SettingsController } from './presentation/controllers/settings.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { CheckoutController } from './presentation/controllers/checkout.controller';
import { WebhookController } from './presentation/controllers/webhook.controller';
import { TelegramWebhookController } from './presentation/controllers/telegram-webhook.controller';
import { DiscordInteractionsController } from './presentation/controllers/discord-interactions.controller';
import { CampaignController } from './presentation/controllers/campaign.controller';
import { GalleryController } from './presentation/controllers/gallery.controller';
import { MercadoPagoService } from './application/services/mercadopago.service';
import { EfiService } from './application/services/efi.service';
import { PaymentGatewayService } from './application/services/payment-gateway.service';
import { CheckoutService } from './application/services/checkout.service';
import { WebhookService } from './application/services/webhook.service';
import { DeliveryService } from './application/services/delivery.service';
import { TelegramBotService } from './application/telegram/telegram-bot.service';
import { TelegramFlowService } from './application/telegram/telegram-flow.service';
import { TelegramDeliveryService } from './application/telegram/telegram-delivery.service';
import { DiscordBotService } from './application/discord/discord-bot.service';
import { DiscordPanelService } from './application/discord/discord-panel.service';
import { DiscordDeliveryService } from './application/discord/discord-delivery.service';
import { ImgbbService } from './application/services/imgbb.service';
import { SubscriptionService } from './application/services/subscription.service';
import { SubscriptionSchedulerService } from './application/services/subscription-scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '4h' },
      }),
    }),
    DatabaseModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    HealthController,
    AuthController,
    ProductsController,
    UsersController,
    SalesController,
    BotsController,
    CouponsController,
    DashboardController,
    SettingsController,
    CheckoutController,
    WebhookController,
    TelegramWebhookController,
    DiscordInteractionsController,
    CampaignController,
    GalleryController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    JwtStrategy,
    UserRepository,
    ProductRepository,
    SaleRepository,
    BotConfigRepository,
    CouponRepository,
    SettingsRepository,
    MercadoPagoService,
    EfiService,
    PaymentGatewayService,
    CheckoutService,
    WebhookService,
    DeliveryService,
    TelegramBotService,
    TelegramFlowService,
    TelegramDeliveryService,
    DiscordBotService,
    DiscordPanelService,
    DiscordDeliveryService,
    ImgbbService,
    GalleryImageRepository,
    SubscriptionRepository,
    SubscriptionService,
    SubscriptionSchedulerService,
  ],
})
export class AppModule {}
