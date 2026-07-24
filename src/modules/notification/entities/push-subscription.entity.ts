import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('push_subscriptions')
@Unique('UQ_push_subscription_user_device', ['userId', 'deviceId'])
@Index('IDX_push_subscriptions_active_user', ['userId', 'revokedAt'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId: string;

  @Column({ name: 'endpoint_hash', type: 'varchar', length: 64, unique: true })
  endpointHash: string;

  @Column({ name: 'endpoint_encrypted', type: 'text' })
  endpointEncrypted: string;

  @Column({ name: 'p256dh_encrypted', type: 'text' })
  p256dhEncrypted: string;

  @Column({ name: 'auth_encrypted', type: 'text' })
  authEncrypted: string;

  @Column({ type: 'varchar', length: 16, default: 'granted' })
  permission: 'default' | 'denied' | 'granted';

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ name: 'last_used_at', type: 'timestamptz' })
  lastUsedAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'failure_count', default: 0 })
  failureCount: number;

  @Column({ name: 'last_failure_at', type: 'timestamptz', nullable: true })
  lastFailureAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
