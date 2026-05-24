import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 'product' })
  type: string;

  @Column({ nullable: true })
  durationDays: number;

  @Column({ default: false })
  isTelegramGroupAccess: boolean;

  @Column({ nullable: true })
  telegramGroupId: string | null;

  @Column({ nullable: true })
  discordSubscriptionRoleId: string | null;

  @Column({ default: 'standard' })
  productSubtype: string;

  @Column({ nullable: true })
  stock: number;

  @Column({ type: 'jsonb', nullable: true })
  activationCodes: string[];

  @Column({ type: 'jsonb', nullable: true })
  activationCodesUsed: string[];

  @Column({ nullable: true })
  hostedFileUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  mediaUrls: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountPrice: number;

  @Column({ nullable: true })
  offerExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
