import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  telegramId: number;

  @Column({ nullable: true })
  whatsappId: string;

  @Column({ nullable: true })
  discordId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: 'active' })
  state: string;

  @Column({ nullable: true })
  plan: string;

  @Column({ nullable: true })
  interactionState: string;

  @Column({ type: 'jsonb', nullable: true })
  interactionData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
