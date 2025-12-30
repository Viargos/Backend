import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ChatRepository } from './chat.repository';
import { UserRepository } from '../user/user.repository';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../user/entities/user.entity';
import { SearchUsersDto } from './dto/search-users.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<ChatMessage> {
    // Validate users exist
    const [sender, receiver] = await Promise.all([
      this.userRepository.getUserById(senderId),
      this.userRepository.getUserById(receiverId),
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException('User not found');
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // Create and save message
    return this.chatRepository.createMessage(senderId, receiverId, content);
  }

  async getMessagesBetweenUsers(
    userId1: string,
    userId2: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ChatMessage[]> {
    // Validate users exist
    const [user1, user2] = await Promise.all([
      this.userRepository.getUserById(userId1),
      this.userRepository.getUserById(userId2),
    ]);

    if (!user1 || !user2) {
      throw new NotFoundException('User not found');
    }

    return this.chatRepository.getMessagesBetweenUsers(
      userId1,
      userId2,
      limit,
      offset,
    );
  }

  async markMessagesAsReadBetweenUsers(
    senderId: string,
    receiverId: string,
  ): Promise<void> {
    // Validate users exist
    const [sender, receiver] = await Promise.all([
      this.userRepository.getUserById(senderId),
      this.userRepository.getUserById(receiverId),
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException('User not found');
    }

    await this.chatRepository.markMessagesAsRead(senderId, receiverId);
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    // Validate user exists
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.chatRepository.getUnreadMessageCount(userId);
  }

  async getRecentChats(
    userId: string,
  ): Promise<{ userId: string; lastMessage: ChatMessage }[]> {
    // Validate user exists
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.chatRepository.getRecentChats(userId);
  }

  // New methods for enhanced functionality

  async searchUsers(
    searchUsersDto: SearchUsersDto,
  ): Promise<{ users: User[] }> {
    const users = await this.chatRepository.searchUsers(
      searchUsersDto.q,
      searchUsersDto.limit,
      searchUsersDto.offset,
    );
    return { users };
  }

  async getUserById(userId: string): Promise<{ user: User }> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { user };
  }

  async getConversations(userId: string): Promise<{ conversations: any[] }> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const conversations = await this.chatRepository.getConversations(userId);
    return { conversations };
  }

  async createConversation(
    userId: string,
    otherUserId: string,
  ): Promise<{ conversation: any }> {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    const [user, otherUser] = await Promise.all([
      this.userRepository.getUserById(userId),
      this.userRepository.getUserById(otherUserId),
    ]);

    if (!user || !otherUser) {
      throw new NotFoundException('User not found');
    }

    const conversation = await this.chatRepository.createConversation(
      userId,
      otherUserId,
    );
    return { conversation };
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ conversation: any }> {
    const conversation = await this.chatRepository.getConversation(
      userId,
      conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return { conversation };
  }

  async markConversationAsRead(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.chatRepository.getConversation(
      userId,
      conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.chatRepository.markConversationAsRead(userId, conversationId);
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.chatRepository.getConversation(
      userId,
      conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.chatRepository.deleteConversation(conversationId);
  }

  async getMessages(
    userId: string,
    conversationId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ messages: ChatMessage[]; pagination: any }> {
    // 🔄 FIX: Validate that user is part of the conversation (lightweight check)
    const [id1, id2] = conversationId.split('__');
    if (userId !== id1 && userId !== id2) {
      throw new NotFoundException('Conversation not found');
    }

    // 🔄 FIX: Fetch messages and count in parallel for better performance
    const [messages, total] = await Promise.all([
      this.chatRepository.getMessages(conversationId, limit, offset),
      this.chatRepository.getMessageCount(conversationId),
    ]);

    return {
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async markMessageAsRead(userId: string, messageId: string): Promise<void> {
    const message = await this.chatRepository.getMessageById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.receiverId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own received messages as read',
      );
    }

    await this.chatRepository.markMessageAsRead(messageId);
  }

  async markMessagesAsRead(
    userId: string,
    messageIds: string[],
  ): Promise<void> {
    const messages = await this.chatRepository.getMessagesByIds(messageIds);

    // Filter messages that belong to the user
    const userMessages = messages.filter((msg) => msg.receiverId === userId);

    if (userMessages.length !== messageIds.length) {
      throw new ForbiddenException('Some messages do not belong to you');
    }

    await this.chatRepository.markMessagesAsReadByIds(messageIds);
  }

  async updateMessage(
    userId: string,
    messageId: string,
    content: string,
  ): Promise<ChatMessage> {
    const message = await this.chatRepository.getMessageById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only update your own messages');
    }

    return this.chatRepository.updateMessage(messageId, content);
  }

  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const message = await this.chatRepository.getMessageById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.chatRepository.deleteMessage(messageId);
  }

  async getOnlineUsers(): Promise<{ users: User[] }> {
    const users = await this.chatRepository.getOnlineUsers();
    return { users };
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.chatRepository.updateUserStatus(userId, isOnline);
  }
}
