import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { User } from '../user/entities/user.entity';

// ✅ NEW: Import logger and constants
import { Logger } from '../../common/utils';
import { SUCCESS_MESSAGES } from '../../common/constants';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  // ✅ NEW: Add logger
  private readonly logger = Logger.child({
    service: 'ChatController',
  });

  constructor(private readonly chatService: ChatService) {}

  // Get current user info
  @Get('me')
  async getCurrentUser(@Request() req: any) {
    return {
      user: req.user,
    };
  }

  // Search users
  @Get('users/search')
  async searchUsers(@Query() searchUsersDto: SearchUsersDto) {
    // ✅ NEW: Log user search
    this.logger.debug('Searching users for chat');

    const result = await this.chatService.searchUsers(searchUsersDto);

    // ✅ NEW: Log results
    this.logger.debug('User search completed', {
      resultCount: result.users?.length || 0,
    });

    return result;
  }

  // Get user by ID
  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    // ✅ NEW: Log user fetch
    this.logger.debug('Fetching user for chat', {
      userId: id,
    });

    return this.chatService.getUserById(id);
  }

  // Get user conversations
  @Get('conversations')
  async getConversations(@Request() req: any) {
    // ✅ NEW: Log conversations fetch
    this.logger.info('Fetching user conversations', {
      userId: req.user.id,
    });

    const result = await this.chatService.getConversations(req.user.id);

    // ✅ NEW: Log results
    this.logger.info('Conversations retrieved', {
      userId: req.user.id,
      conversationCount: result.conversations?.length || 0,
    });

    return result;
  }

  // Create new conversation
  @Post('conversations')
  async createConversation(
    @Request() req: any,
    @Body() body: { userId: string },
  ) {
    // ✅ NEW: Log conversation creation
    this.logger.info('Creating new conversation', {
      userId: req.user.id,
      withUserId: body.userId,
    });

    const result = await this.chatService.createConversation(req.user.id, body.userId);

    // ✅ NEW: Log success
    this.logger.info('Conversation created', {
      conversationId: result.conversation?.id,
      userId: req.user.id,
      withUserId: body.userId,
    });

    return result;
  }

  // Get conversation details
  @Get('conversations/:id')
  async getConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    // ✅ NEW: Log conversation fetch
    this.logger.debug('Fetching conversation details', {
      userId: req.user.id,
      conversationId,
    });

    return this.chatService.getConversation(req.user.id, conversationId);
  }

  // Mark conversation as read
  @Put('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  async markConversationAsRead(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    // ✅ NEW: Log mark as read
    this.logger.info('Marking conversation as read', {
      userId: req.user.id,
      conversationId,
    });

    await this.chatService.markConversationAsRead(req.user.id, conversationId);

    // ✅ NEW: Log success
    this.logger.info('Conversation marked as read', {
      userId: req.user.id,
      conversationId,
    });

    return { success: true };
  }

  // Delete conversation
  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  async deleteConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    // ✅ NEW: Log conversation deletion
    this.logger.info('Deleting conversation', {
      userId: req.user.id,
      conversationId,
    });

    await this.chatService.deleteConversation(req.user.id, conversationId);

    // ✅ NEW: Log success
    this.logger.info('Conversation deleted', {
      userId: req.user.id,
      conversationId,
    });

    return { success: true };
  }

  // Get conversation messages
  @Get('conversations/:id/messages')
  async getMessages(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Query() getMessagesDto: GetMessagesDto,
  ) {
    // ✅ NEW: Log messages fetch
    this.logger.debug('Fetching conversation messages', {
      userId: req.user.id,
      conversationId,
      limit: getMessagesDto.limit,
      offset: getMessagesDto.offset,
    });

    const result = await this.chatService.getMessages(
      req.user.id,
      conversationId,
      getMessagesDto.limit,
      getMessagesDto.offset,
    );

    // ✅ NEW: Log results
    this.logger.debug('Messages retrieved', {
      userId: req.user.id,
      conversationId,
      messageCount: result.messages?.length || 0,
    });

    return result;
  }

  // Send a message
  @Post('messages')
  async sendMessage(
    @Request() req: any,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    // ✅ NEW: Log message send
    this.logger.info('Sending message', {
      senderId: req.user.id,
      receiverId: createMessageDto.receiverId,
      contentLength: createMessageDto.content?.length,
    });

    const message = await this.chatService.sendMessage(
      req.user.id,
      createMessageDto.receiverId,
      createMessageDto.content,
    );

    // ✅ NEW: Log success
    this.logger.info('Message sent successfully', {
      messageId: message.id,
      senderId: req.user.id,
      receiverId: createMessageDto.receiverId,
    });

    return { message };
  }

  // Mark message as read
  @Put('messages/:id/read')
  @HttpCode(HttpStatus.OK)
  async markMessageAsRead(@Request() req: any, @Param('id') messageId: string) {
    // ✅ NEW: Log mark as read
    this.logger.debug('Marking message as read', {
      userId: req.user.id,
      messageId,
    });

    await this.chatService.markMessageAsRead(req.user.id, messageId);

    return { success: true };
  }

  // Mark multiple messages as read
  @Put('messages/read')
  @HttpCode(HttpStatus.OK)
  async markMessagesAsRead(
    @Request() req: any,
    @Body() markReadDto: MarkReadDto,
  ) {
    // ✅ NEW: Log bulk mark as read
    this.logger.info('Marking multiple messages as read', {
      userId: req.user.id,
      messageCount: markReadDto.messageIds?.length,
    });

    await this.chatService.markMessagesAsRead(
      req.user.id,
      markReadDto.messageIds,
    );

    // ✅ NEW: Log success
    this.logger.info('Messages marked as read', {
      userId: req.user.id,
      messageCount: markReadDto.messageIds?.length,
    });

    return { success: true };
  }

  // Update message
  @Put('messages/:id')
  async updateMessage(
    @Request() req: any,
    @Param('id') messageId: string,
    @Body() body: { content: string },
  ) {
    // ✅ NEW: Log message update
    this.logger.info('Updating message', {
      userId: req.user.id,
      messageId,
      contentLength: body.content?.length,
    });

    const message = await this.chatService.updateMessage(
      req.user.id,
      messageId,
      body.content,
    );

    // ✅ NEW: Log success
    this.logger.info('Message updated successfully', {
      userId: req.user.id,
      messageId,
    });

    return { message };
  }

  // Delete message
  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(@Request() req: any, @Param('id') messageId: string) {
    // ✅ NEW: Log message deletion
    this.logger.info('Deleting message', {
      userId: req.user.id,
      messageId,
    });

    await this.chatService.deleteMessage(req.user.id, messageId);

    // ✅ NEW: Log success
    this.logger.info('Message deleted successfully', {
      userId: req.user.id,
      messageId,
    });

    return { success: true };
  }

  // Get online users
  @Get('users/online')
  async getOnlineUsers() {
    // ✅ NEW: Log online users request
    this.logger.debug('Fetching online users');

    const result = await this.chatService.getOnlineUsers();

    // ✅ NEW: Log results
    this.logger.debug('Online users retrieved', {
      onlineCount: result.users?.length || 0,
    });

    return result;
  }

  // Update user status
  @Put('users/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Request() req: any,
    @Body() body: { isOnline: boolean },
  ) {
    // ✅ NEW: Log status update
    this.logger.info('Updating user status', {
      userId: req.user.id,
      isOnline: body.isOnline,
    });

    await this.chatService.updateUserStatus(req.user.id, body.isOnline);

    return { success: true };
  }
}
