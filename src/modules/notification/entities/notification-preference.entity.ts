import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'browser_enabled', default: false })
  browserEnabled: boolean;

  @Column({ name: 'reminders_enabled', default: true })
  remindersEnabled: boolean;

  @Column({ name: 'task_workflow_enabled', default: true })
  taskWorkflowEnabled: boolean;

  @Column({ name: 'success_enabled', default: true })
  successEnabled: boolean;

  @Column({ name: 'errors_warnings_enabled', default: true })
  errorsWarningsEnabled: boolean;

  @Column({ name: 'messages_activity_enabled', default: true })
  messagesActivityEnabled: boolean;

  @Column({ name: 'account_security_enabled', default: true })
  accountSecurityEnabled: boolean;

  @Column({ name: 'product_system_enabled', default: false })
  productSystemEnabled: boolean;

  @Column({ name: 'immediate_enabled', default: true })
  immediateEnabled: boolean;

  @Column({ name: 'grouping_enabled', default: true })
  groupingEnabled: boolean;

  @Column({ name: 'quiet_hours_enabled', default: false })
  quietHoursEnabled: boolean;

  @Column({
    name: 'quiet_hours_start',
    type: 'time without time zone',
    default: '22:00',
  })
  quietHoursStart: string;

  @Column({
    name: 'quiet_hours_end',
    type: 'time without time zone',
    default: '07:00',
  })
  quietHoursEnd: string;

  @Column({ type: 'varchar', length: 80, default: 'UTC' })
  timezone: string;

  @Column({ name: 'sound_enabled', default: true })
  soundEnabled: boolean;

  @Column({ name: 'detailed_preview_enabled', default: false })
  detailedPreviewEnabled: boolean;

  @Column({ name: 'suppress_duplicates_enabled', default: true })
  suppressDuplicatesEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
