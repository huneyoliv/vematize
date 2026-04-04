import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('bot_configs')
export class BotConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  platform: string;

  @Column({ nullable: true })
  botToken: string;

  @Column({ nullable: true })
  clientId: string;

  @Column({ nullable: true })
  publicKey: string;

  @Column({ type: 'jsonb', default: '[]' })
  flows: any[];

  @Column({ nullable: true })
  inactiveSubscriptionMessage: string;

  @Column({ nullable: true })
  deliveryMessage: string;

  @Column({ nullable: true })
  discordDeliveryType: string;

  @Column({ nullable: true })
  discordDeliveryRoleId: string;

  @Column({ nullable: true })
  discordNotifyRoleId: string;

  @Column({ nullable: true })
  discordCartCategoryId: string;

  @Column({ nullable: true })
  discordSalesLogChannelId: string;

  @Column({ type: 'jsonb', default: '[]' })
  discordPanels: any[];

  @Column({ nullable: true })
  interactionsToken: string;

  @Column({ default: true })
  discordCouponsEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
