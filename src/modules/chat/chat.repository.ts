import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatRepository {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
  ) {}

  async createMessage(senderId: string, receiverId: string, content: string): Promise<ChatMessage> {
    const message = this.chatMessageRepo.create({
      senderId,
      receiverId,
      content,
    });
    return this.chatMessageRepo.save(message);
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    return this.chatMessageRepo
      .createQueryBuilder('message')
      .where(
        '(message.senderId = :userId1 AND message.receiverId = :userId2) OR (message.senderId = :userId2 AND message.receiverId = :userId1)',
        { userId1, userId2 },
      )
      .orderBy('message.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    await this.chatMessageRepo.update(
      {
        senderId,
        receiverId,
        isRead: false,
      },
      { isRead: true },
    );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    return this.chatMessageRepo.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });
  }

  async getRecentChats(userId: string): Promise<{ userId: string; lastMessage: ChatMessage }[]> {
    const subQuery = this.chatMessageRepo
      .createQueryBuilder('message')
      .select('MAX(message.createdAt)', 'maxDate')
      .where(
        '(message.senderId = :userId OR message.receiverId = :userId)',
        { userId },
      )
      .groupBy(
        'CASE WHEN message.senderId = :userId THEN message.receiverId ELSE message.senderId END',
      );

    const messages = await this.chatMessageRepo
      .createQueryBuilder('message')
      .where('message.createdAt IN (' + subQuery.getQuery() + ')')
      .setParameters(subQuery.getParameters())
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    return messages.map(message => ({
      userId: message.senderId === userId ? message.receiverId : message.senderId,
      lastMessage: message,
    }));
  }
} 