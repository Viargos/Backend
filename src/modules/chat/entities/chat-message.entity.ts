import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('chat_messages')
// 🔄 FIX: Add composite index for faster message queries
@Index('IDX_chat_messages_sender_receiver', ['senderId', 'receiverId'])
@Index('IDX_chat_messages_receiver_sender', ['receiverId', 'senderId'])
@Index('IDX_chat_messages_created_at', ['createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id' })
  @Index('IDX_chat_messages_sender')
  senderId: string;

  @Column({ name: 'receiver_id' })
  @Index('IDX_chat_messages_receiver')
  receiverId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  @Index('IDX_chat_messages_is_read')
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;
}
