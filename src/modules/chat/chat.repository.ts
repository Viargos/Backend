import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class ChatRepository {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createMessage(
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepo.create({
      senderId,
      receiverId,
      content,
    });
    return this.chatMessageRepo.save(message);
  }

  async getMessagesBetweenUsers(
    userId1: string,
    userId2: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ChatMessage[]> {
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

  async markMessagesAsRead(
    senderId: string,
    receiverId: string,
  ): Promise<void> {
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

  async getRecentChats(
    userId: string,
  ): Promise<{ userId: string; lastMessage: ChatMessage }[]> {
    const subQuery = this.chatMessageRepo
      .createQueryBuilder('message')
      .select('MAX(message.createdAt)', 'maxDate')
      .where('(message.senderId = :userId OR message.receiverId = :userId)', {
        userId,
      })
      .groupBy(
        'CASE WHEN message.senderId = :userId THEN message.receiverId ELSE message.senderId END',
      );

    const messages = await this.chatMessageRepo
      .createQueryBuilder('message')
      .where('message.createdAt IN (' + subQuery.getQuery() + ')')
      .setParameters(subQuery.getParameters())
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    return messages.map((message) => ({
      userId:
        message.senderId === userId ? message.receiverId : message.senderId,
      lastMessage: message,
    }));
  }

  // New methods for enhanced functionality

  async searchUsers(
    query?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<User[]> {
    const qb = this.userRepo.createQueryBuilder('user');

    if (query) {
      qb.where('user.username ILIKE :query OR user.email ILIKE :query', {
        query: `%${query}%`,
      });
    }

    return qb
      .orderBy('user.username', 'ASC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  async getConversations(userId: string): Promise<any[]> {
    // Get all conversations for a user with last message and unread count
    const conversations = await this.chatMessageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where('(message.senderId = :userId OR message.receiverId = :userId)', {
        userId,
      })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    // Group by conversation partner and get latest message
    const conversationMap = new Map();

    for (const message of conversations) {
      const partnerId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const partner =
        message.senderId === userId ? message.receiver : message.sender;

      if (!conversationMap.has(partnerId)) {
        // Create conversation ID in format: userId__partnerId (sorted to ensure consistency)
        // Using __ as separator to avoid conflicts with UUID hyphens
        const conversationId =
          userId < partnerId
            ? `${userId}__${partnerId}`
            : `${partnerId}__${userId}`;

        conversationMap.set(partnerId, {
          id: conversationId,
          user: partner,
          lastMessage: message,
          unreadCount: 0,
          updatedAt: message.createdAt,
        });
      }
    }

    // Calculate unread counts
    for (const [partnerId, conversation] of conversationMap) {
      const unreadCount = await this.chatMessageRepo.count({
        where: {
          senderId: partnerId,
          receiverId: userId,
          isRead: false,
        },
      });
      conversation.unreadCount = unreadCount;
    }

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async createConversation(userId: string, otherUserId: string): Promise<any> {
    // For now, just return a conversation object
    // In a real implementation, you might want to create a conversation entity
    const otherUser = await this.userRepo.findOne({
      where: { id: otherUserId },
    });
    if (!otherUser) {
      throw new Error('User not found');
    }

    // Create conversation ID in sorted format for consistency
    // Using __ as separator to avoid conflicts with UUID hyphens
    const conversationId =
      userId < otherUserId
        ? `${userId}__${otherUserId}`
        : `${otherUserId}__${userId}`;

    return {
      id: conversationId,
      user: otherUser,
      lastMessage: null,
      unreadCount: 0,
      updatedAt: new Date(),
    };
  }

  async getConversation(userId: string, conversationId: string): Promise<any> {
    // Extract partner ID from conversation ID
    // Using __ as separator to avoid conflicts with UUID hyphens
    const [id1, id2] = conversationId.split('__');
    const partnerId = id1 === userId ? id2 : id1;

    const partner = await this.userRepo.findOne({ where: { id: partnerId } });
    if (!partner) {
      return null;
    }

    const lastMessage = await this.chatMessageRepo.findOne({
      where: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
      order: { createdAt: 'DESC' },
      relations: ['sender', 'receiver'],
    });

    const unreadCount = await this.chatMessageRepo.count({
      where: {
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
      },
    });

    return {
      id: conversationId,
      user: partner,
      lastMessage,
      unreadCount,
      updatedAt: lastMessage?.createdAt || new Date(),
    };
  }

  async markConversationAsRead(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const [id1, id2] = conversationId.split('__');
    const partnerId = id1 === userId ? id2 : id1;

    await this.chatMessageRepo.update(
      {
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
      },
      { isRead: true },
    );
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // In a real implementation, you might want to soft delete or archive
    // For now, we'll just mark messages as deleted or remove them
    const [userId, partnerId] = conversationId.split('__');

    await this.chatMessageRepo.delete([
      { senderId: userId, receiverId: partnerId },
      { senderId: partnerId, receiverId: userId },
    ]);
  }

  async getMessages(
    conversationId: string,
    limit: number,
    offset: number,
  ): Promise<ChatMessage[]> {
    const [userId, partnerId] = conversationId.split('__');

    return this.chatMessageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where(
        '(message.senderId = :userId AND message.receiverId = :partnerId) OR (message.senderId = :partnerId AND message.receiverId = :userId)',
        { userId, partnerId },
      )
      .orderBy('message.createdAt', 'ASC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  async getMessageCount(conversationId: string): Promise<number> {
    const [userId, partnerId] = conversationId.split('__');

    return this.chatMessageRepo.count({
      where: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
    });
  }

  async getMessageById(messageId: string): Promise<ChatMessage> {
    return this.chatMessageRepo.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    });
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await this.chatMessageRepo.update(messageId, { isRead: true });
  }

  async getMessagesByIds(messageIds: string[]): Promise<ChatMessage[]> {
    return this.chatMessageRepo.findBy({
      id: In(messageIds),
    });
  }

  async markMessagesAsReadByIds(messageIds: string[]): Promise<void> {
    await this.chatMessageRepo.update(messageIds, { isRead: true });
  }

  async updateMessage(
    messageId: string,
    content: string,
  ): Promise<ChatMessage> {
    await this.chatMessageRepo.update(messageId, { content });
    return this.getMessageById(messageId);
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.chatMessageRepo.delete(messageId);
  }

  async getOnlineUsers(): Promise<User[]> {
    // For now, return active users since isOnline is not in the User entity
    return this.userRepo.find({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        email: true,
        profileImage: true,
        isActive: true,
      },
    });
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    // Update isActive status instead of isOnline since it's not in the User entity
    await this.userRepo.update(userId, {
      isActive: isOnline,
      updatedAt: new Date(),
    });
  }
}
