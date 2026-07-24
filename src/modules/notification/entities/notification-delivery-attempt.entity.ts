import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Notification } from './notification.entity';
import { PushSubscription } from './push-subscription.entity';

@Entity('notification_delivery_attempts')
@Index('IDX_notification_delivery_attempts_notification', ['notificationId'])
export class NotificationDeliveryAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  notificationId: string;

  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId: string;

  @Column()
  attempt: number;

  @Column({ type: 'varchar', length: 16 })
  status: 'delivered' | 'failed' | 'retrying';

  @Column({ name: 'status_code', nullable: true })
  statusCode: number | null;

  @Column({ name: 'error_code', type: 'varchar', length: 80, nullable: true })
  errorCode: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @ManyToOne(() => PushSubscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription: PushSubscription;
}
