import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  UserEntity,
  ProductEntity,
  SaleEntity,
  BotConfigEntity,
  CouponEntity,
  SettingsEntity,
  GalleryImageEntity,
  SubscriptionEntity,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [
          UserEntity,
          ProductEntity,
          SaleEntity,
          BotConfigEntity,
          CouponEntity,
          SettingsEntity,
          GalleryImageEntity,
          SubscriptionEntity,
        ],
        synchronize: config.get('DB_SYNC', 'false') === 'true',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      ProductEntity,
      SaleEntity,
      BotConfigEntity,
      CouponEntity,
      SettingsEntity,
      GalleryImageEntity,
      SubscriptionEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
