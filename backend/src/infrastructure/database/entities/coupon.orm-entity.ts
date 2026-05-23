import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('coupons')
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  maxUses: number;

  @Column({ default: 0 })
  currentUses: number;

  @Column({ default: true })
  limitToOneUsePerUser: boolean;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  applicableProducts: string[];

  @Column({ default: 'forever' })
  durationType: string;

  @Column({ nullable: true })
  durationMonths: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
