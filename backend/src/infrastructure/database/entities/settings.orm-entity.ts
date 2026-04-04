import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  preferredPixGateway: string;

  @Column({ nullable: true })
  preferredCardGateway: string;

  @Column({ nullable: true })
  activeGateway: string;

  @Column({ type: 'jsonb', nullable: true })
  mercadopagoConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  efiConfig: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  pushinpayConfig: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
