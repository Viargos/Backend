import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatRepository } from './chat.repository';
import { UserRepository } from '../user/user.repository';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<ChatMessage> {
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

  async getMessagesBetweenUsers(userId1: string, userId2: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    // Validate users exist
    const [user1, user2] = await Promise.all([
      this.userRepository.getUserById(userId1),
      this.userRepository.getUserById(userId2),
    ]);

    if (!user1 || !user2) {
      throw new NotFoundException('User not found');
    }

    return this.chatRepository.getMessagesBetweenUsers(userId1, userId2, limit, offset);
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
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

  async getRecentChats(userId: string): Promise<{ userId: string; lastMessage: ChatMessage }[]> {
    // Validate user exists
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.chatRepository.getRecentChats(userId);
  }
} 