import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('subscriptions')
@Index(['userId'])
@Index(['status'])
@Index(['expiresAt'])
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  productId: string;

  @Column()
  saleId: string;

  @Column({ type: 'varchar' })
  platform: 'telegram' | 'discord';

  @Column({ type: 'varchar', default: 'active' })
  status: 'active' | 'expired' | 'cancelled';

  @Column()
  startsAt: Date;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true, type: 'bigint' })
  telegramChatId: number;

  @Column({ nullable: true })
  telegramGroupId: string;

  @Column({ nullable: true })
  discordUserId: string;

  @Column({ nullable: true })
  discordGuildId: string;

  @Column({ nullable: true })
  discordRoleId: string;

  @Column({ nullable: true })
  notifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
