import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('sales')
@Index(['userId'])
@Index(['productId'])
@Index(['status'])

export class SaleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  userId: string;

  @Column({ 
    type: 'bigint', 
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => value ? parseInt(value, 10) : null,
    }
  })
  telegramChatId: number;

  @Column({ 
    type: 'bigint', 
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => value ? parseInt(value, 10) : null,
    }
  })
  telegramMessageId: number;

  @Column({ nullable: true })
  discordChannelId: string;

  @Column({ nullable: true })
  discordMessageId: string;

  @Column({ nullable: true })
  discordThreadId: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice: number;

  @Column({ nullable: true })
  couponCode: string;

  @Column({ default: 'pending' })
  status: string;

  @Column()
  paymentGateway: string;

  @Column({ default: false })
  webhookVerified: boolean;

  @Column({ default: false })
  providerVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  paymentDetails: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
