import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import {
  NotificationCategory,
  NotificationEventType,
} from '../notification.constants';

export type NotificationAction = {
  action: string;
  title: string;
  url?: string;
};

@Entity('notifications')
@Index('IDX_notifications_user_created', ['userId', 'createdAt'])
@Index('IDX_notifications_user_read', ['userId', 'readAt'])
@Index('IDX_notifications_scheduled_delivery', ['scheduledAt', 'deliveredAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType: NotificationEventType;

  @Column({ type: 'varchar', length: 32 })
  category: NotificationCategory;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    name: 'destination_url',
    type: 'varchar',
    length: 2048,
    default: '/notifications',
  })
  destinationUrl: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  actions: NotificationAction[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, string> | null;

  @Column({ default: false })
  critical: boolean;

  @Column({ default: false })
  silent: boolean;

  @Column({
    name: 'dedupe_key',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  dedupeKey: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
