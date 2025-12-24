import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { User } from '../modules/user/entities/user.entity';
import { ChatService } from 'src/modules/chat/chat.service';
import { JwtService } from '@nestjs/jwt';

// ✅ NEW: Import logger and constants
import { Logger } from '../common/utils';
import { ERROR_MESSAGES } from '../common/constants';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // ✅ NEW: Use Winston logger instead of console
  private readonly logger = Logger.child({
    service: 'ChatGateway',
  });

  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Socket> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // userId -> Set of users they're typing to

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const payload = await this.validateConnection(client);
      if (payload) {
        // Remove any existing socket for this user (handles reconnections)
        const existingSocket = this.userSockets.get(payload.sub);
        if (existingSocket && existingSocket.id !== client.id) {
          // ✅ NEW: Structured logging instead of console.log
          this.logger.info('Replacing existing socket connection', {
            userId: payload.sub,
            oldSocketId: existingSocket.id,
            newSocketId: client.id,
          });
          existingSocket.disconnect();
        }

        this.userSockets.set(payload.sub, client);
        client.data.user = payload;

        // Update user status to online
        await this.chatService.updateUserStatus(payload.sub, true);

        // Notify other users that this user is online
        this.broadcastUserStatus(payload.sub, true);

        // ✅ NEW: Structured connection log
        this.logger.info('User connected to chat', {
          userId: payload.sub,
          socketId: client.id,
          totalConnections: this.userSockets.size,
        });
      }
    } catch (error) {
      // ✅ NEW: Better error logging with context
      this.logger.error('WebSocket connection failed', {
        socketId: client.id,
        error: error.message,
        remoteAddress: client.handshake.address,
      });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.userSockets.delete(user.sub);

      // Update user status to offline
      await this.chatService.updateUserStatus(user.sub, false);

      // Notify other users that this user is offline
      this.broadcastUserStatus(user.sub, false);

      // Clear typing status
      this.typingUsers.delete(user.sub);

      // ✅ NEW: Structured disconnection log
      this.logger.info('User disconnected from chat', {
        userId: user.sub,
        socketId: client.id,
        totalConnections: this.userSockets.size,
      });
    }
  }

  private async validateConnection(client: Socket): Promise<any | null> {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        throw new Error('No token provided');
      }

      // Validate JWT token
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        throw new Error('Invalid token - missing sub field');
      }

      // Return the payload with user ID
      return payload;
    } catch (error) {
      // ✅ NEW: Better error logging for token validation
      this.logger.warn('WebSocket token validation failed', {
        socketId: client.id,
        error: error.message,
        remoteAddress: client.handshake.address,
      });
      return null;
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    const sender = client.data.user;
    const { receiverId, content } = data;

    if (!sender || !sender.sub) {
      // ✅ NEW: Structured error logging
      this.logger.error('Message send failed: Sender not authenticated', {
        socketId: client.id,
        receiverId,
      });
      client.emit('error', { message: ERROR_MESSAGES.UNAUTHORIZED });
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Create the message
      const message = await this.chatService.sendMessage(
        sender.sub,
        receiverId,
        content,
      );

      // Send to receiver if online
      const receiverSocket = this.userSockets.get(receiverId);
      if (receiverSocket) {
        receiverSocket.emit('newMessage', message);
        // ✅ NEW: Structured log for message delivery
        this.logger.info('Message delivered to online user', {
          messageId: message.id,
          senderId: sender.sub,
          receiverId,
          contentLength: content.length,
        });
      } else {
        // ✅ NEW: Structured log for offline message
        this.logger.info('Message saved for offline user', {
          messageId: message.id,
          senderId: sender.sub,
          receiverId,
          contentLength: content.length,
        });
      }

      // Send confirmation to sender with the created message
      client.emit('messageSent', message);

      return { success: true, message };
    } catch (error) {
      // ✅ NEW: Better error logging with context
      this.logger.error('Failed to send message', {
        senderId: sender.sub,
        receiverId,
        error: error.message,
        socketId: client.id,
      });
      client.emit('error', { message: 'Failed to send message' });
      return { success: false, error: error.message };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: string },
  ) {
    const receiver = client.data.user;
    const { senderId } = data;

    try {
      await this.chatService.markMessagesAsReadBetweenUsers(
        senderId,
        receiver.sub,
      );

      // Notify sender that messages were read
      const senderSocket = this.userSockets.get(senderId);
      if (senderSocket) {
        senderSocket.emit('messagesRead', { receiverId: receiver.sub });
      }

      // ✅ NEW: Log message read event
      this.logger.info('Messages marked as read', {
        senderId,
        receiverId: receiver.sub,
      });
    } catch (error) {
      // ✅ NEW: Log mark as read failure
      this.logger.error('Failed to mark messages as read', {
        senderId,
        receiverId: receiver.sub,
        error: error.message,
      });
      client.emit('error', { message: 'Failed to mark messages as read' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    try {
      const count = await this.chatService.getUnreadMessageCount(user.sub);
      client.emit('unreadCount', { count });

      // ✅ NEW: Log unread count request
      this.logger.debug('Unread count requested', {
        userId: user.sub,
        count,
      });
    } catch (error) {
      // ✅ NEW: Log unread count failure
      this.logger.error('Failed to get unread count', {
        userId: user.sub,
        error: error.message,
      });
      client.emit('error', { message: 'Failed to get unread count' });
    }
  }

  // New WebSocket events

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('join_chat')
  async handleJoinChat(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    try {
      // User is already connected, just confirm
      client.emit('connection_status', { connected: true });
      // ✅ NEW: Structured log for chat join
      this.logger.info('User joined chat room', {
        userId: user.sub,
        socketId: client.id,
      });
    } catch (error) {
      // ✅ NEW: Log join chat failure
      this.logger.error('Failed to join chat', {
        userId: user.sub,
        error: error.message,
      });
      client.emit('error', { message: 'Failed to join chat' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string },
  ) {
    const user = client.data.user;
    const { receiverId } = data;

    try {
      // Add to typing users
      if (!this.typingUsers.has(user.sub)) {
        this.typingUsers.set(user.sub, new Set());
      }
      this.typingUsers.get(user.sub)!.add(receiverId);

      // Notify receiver
      const receiverSocket = this.userSockets.get(receiverId);
      if (receiverSocket) {
        receiverSocket.emit('user_typing', {
          userId: user.sub,
          isTyping: true,
        });
      }

      // ✅ NEW: Debug log for typing indicator
      this.logger.debug('Typing indicator started', {
        userId: user.sub,
        receiverId,
        receiverOnline: !!receiverSocket,
      });
    } catch (error) {
      // ✅ NEW: Log typing start failure
      this.logger.error('Failed to start typing indicator', {
        userId: user.sub,
        receiverId,
        error: error.message,
      });
      client.emit('error', { message: 'Failed to start typing indicator' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string },
  ) {
    const user = client.data.user;
    const { receiverId } = data;

    try {
      // Remove from typing users
      if (this.typingUsers.has(user.sub)) {
        this.typingUsers.get(user.sub)!.delete(receiverId);
        if (this.typingUsers.get(user.sub)!.size === 0) {
          this.typingUsers.delete(user.sub);
        }
      }

      // Notify receiver
      const receiverSocket = this.userSockets.get(receiverId);
      if (receiverSocket) {
        receiverSocket.emit('user_typing', {
          userId: user.sub,
          isTyping: false,
        });
      }

      // ✅ NEW: Debug log for typing indicator stop
      this.logger.debug('Typing indicator stopped', {
        userId: user.sub,
        receiverId,
        receiverOnline: !!receiverSocket,
      });
    } catch (error) {
      // ✅ NEW: Log typing stop failure
      this.logger.error('Failed to stop typing indicator', {
        userId: user.sub,
        receiverId,
        error: error.message,
      });
      client.emit('error', { message: 'Failed to stop typing indicator' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('user_online')
  async handleUserOnline(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    try {
      await this.chatService.updateUserStatus(user.sub, true);
      this.broadcastUserStatus(user.sub, true);

      // ✅ NEW: Log online status update
      this.logger.info('User status updated to online', {
        userId: user.sub,
      });
    } catch (error) {
      // ✅ NEW: Log online status failure
      this.logger.error('Failed to update online status', {
        userId: user.sub,
        error: error.message,
      });
      client.emit('error', { message: 'Failed to update online status' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('user_offline')
  async handleUserOffline(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    try {
      await this.chatService.updateUserStatus(user.sub, false);
      this.broadcastUserStatus(user.sub, false);

      // ✅ NEW: Log offline status update
      this.logger.info('User status updated to offline', {
        userId: user.sub,
      });
    } catch (error) {
      // ✅ NEW: Log offline status failure
      this.logger.error('Failed to update offline status', {
        userId: user.sub,
        error: error.message,
      });
      client.emit('error', { message: 'Failed to update offline status' });
    }
  }

  // Helper methods

  private broadcastUserStatus(userId: string, isOnline: boolean) {
    this.server.emit('user_status', {
      userId,
      isOnline,
      lastSeen: new Date(),
    });
  }

  private broadcastMessage(message: any, conversation: any) {
    // Send to all users in the conversation
    const participants = [message.senderId, message.receiverId];
    participants.forEach((participantId) => {
      const socket = this.userSockets.get(participantId);
      if (socket) {
        socket.emit('message_received', { message, conversation });
      }
    });
  }

  private broadcastMessageSent(message: any) {
    const senderSocket = this.userSockets.get(message.senderId);
    if (senderSocket) {
      senderSocket.emit('message_sent', { message, status: 'sent' });
    }
  }

  private broadcastMessageRead(messageId: string, readAt: Date) {
    this.server.emit('message_read', { messageId, readAt });
  }
}
