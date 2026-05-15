import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { User } from '../modules/user/entities/user.entity';
import { ChatService } from 'src/modules/chat/chat.service';
import { JwtService } from '@nestjs/jwt';
import { AuthKeyConfig, AuthKeyConfigName } from '../config/authkey.config';

// ✅ NEW: Import logger and constants
import { Logger } from '../common/utils';
import { ERROR_MESSAGES } from '../common/constants';

type MessageSendPayload = {
  receiverId: string;
  content: string;
  tempId?: string;
  conversationId?: string;
};

type StructuredWsError = {
  code: string;
  details?: Record<string, unknown>;
  message: string;
};

type MessageSendAckPayload = {
  code?: string;
  error?: string;
  message?: unknown;
  success: boolean;
  tempId?: string | null;
};

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

  private readonly idempotencyCacheTtlMs = 10 * 60 * 1000;
  private readonly inFlightMessageSends = new Map<string, {
    content: string;
    conversationId: string;
    promise: Promise<unknown>;
    receiverId: string;
  }>();
  private readonly messageRateLimit = 10;
  private readonly messageRateWindowMs = 5 * 1000;
  private readonly messageSendIdempotencyCache = new Map<string, {
    content: string;
    conversationId: string;
    createdAt: number;
    message: unknown;
    receiverId: string;
  }>();
  private readonly socketMessageTimestamps = new Map<string, number[]>();
  private userSockets: Map<string, Socket> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // userId -> Set of users they're typing to

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private readTokenFromCookieHeader(cookieHeader?: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const tokenPair = cookieHeader
      .split(';')
      .map(item => item.trim())
      .find(item => item.startsWith('viargos_access_token='));

    if (!tokenPair) {
      return null;
    }

    const value = tokenPair.slice('viargos_access_token='.length);
    return value ? decodeURIComponent(value) : null;
  }

  private getSocketToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const headerValue = Array.isArray(client.handshake.headers.cookie)
      ? client.handshake.headers.cookie.join(';')
      : client.handshake.headers.cookie;

    return this.readTokenFromCookieHeader(headerValue);
  }

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
    this.socketMessageTimestamps.delete(client.id);

    const user = client.data.user;
    if (user) {
      const activeSocket = this.userSockets.get(user.sub);
      const isCurrentSocket = activeSocket?.id === client.id;

      if (isCurrentSocket) {
        this.userSockets.delete(user.sub);

        // Update user status to offline
        await this.chatService.updateUserStatus(user.sub, false);

        // Notify other users that this user is offline
        this.broadcastUserStatus(user.sub, false);
      }

      // Clear typing status
      this.typingUsers.delete(user.sub);

      // ✅ NEW: Structured disconnection log
      this.logger.info('User disconnected from chat', {
        ignoredStaleSocket: !isCurrentSocket,
        userId: user.sub,
        socketId: client.id,
        totalConnections: this.userSockets.size,
      });
    }
  }

  private parseConversationParticipants(conversationId: string): [string, string] {
    const trimmed = conversationId.trim();
    const [firstId, secondId, ...rest] = trimmed.split('__');
    if (!firstId || !secondId || rest.length > 0) {
      throw new WsException({
        code: 'BAD_REQUEST',
        message: 'Invalid conversation id format',
      } satisfies StructuredWsError);
    }

    return [firstId, secondId];
  }

  private normalizeWsError(error: unknown): StructuredWsError {
    if (error instanceof WsException) {
      const wsError = error.getError();
      if (typeof wsError === 'object' && wsError !== null) {
        const payload = wsError as Partial<StructuredWsError>;
        return {
          code: payload.code ?? 'WS_ERROR',
          details: payload.details,
          message: payload.message ?? 'WebSocket error',
        };
      }

      return {
        code: 'WS_ERROR',
        message: typeof wsError === 'string' ? wsError : 'WebSocket error',
      };
    }

    if (error instanceof Error) {
      return {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      };
    }

    return {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
  }

  private throwWsError(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): never {
    throw new WsException({
      code,
      details,
      message,
    } satisfies StructuredWsError);
  }

  private getIdempotencyKey(senderId: string, tempId: string): string {
    return `${senderId}:${tempId}`;
  }

  private pruneIdempotencyCache(): void {
    const now = Date.now();
    for (const [key, value] of this.messageSendIdempotencyCache.entries()) {
      if (now - value.createdAt > this.idempotencyCacheTtlMs) {
        this.messageSendIdempotencyCache.delete(key);
      }
    }
  }

  private assertMessageRateLimit(client: Socket): void {
    const now = Date.now();
    const socketId = client.id;
    const timestamps = (this.socketMessageTimestamps.get(socketId) ?? [])
      .filter(item => now - item < this.messageRateWindowMs);

    if (timestamps.length >= this.messageRateLimit) {
      this.throwWsError(
        'RATE_LIMITED',
        'Too many messages. Please wait and try again.',
      );
    }

    timestamps.push(now);
    this.socketMessageTimestamps.set(socketId, timestamps);
  }

  private getResolvedConversationId(userA: string, userB: string): string {
    return userA < userB ? `${userA}__${userB}` : `${userB}__${userA}`;
  }

  private async validateConversationMembership(params: {
    conversationId?: string;
    receiverId?: string;
    senderId: string;
  }): Promise<{ conversationId: string; receiverId: string }> {
    const {
      conversationId,
      receiverId,
      senderId,
    } = params;

    if (!senderId) {
      this.throwWsError('UNAUTHORIZED', 'User not authenticated');
    }

    if (conversationId?.trim()) {
      const [id1, id2] = this.parseConversationParticipants(conversationId);
      if (senderId !== id1 && senderId !== id2) {
        this.throwWsError('FORBIDDEN', 'Not a participant', {
          conversationId,
        });
      }

      const resolvedReceiverId = senderId === id1 ? id2 : id1;
      if (receiverId && receiverId !== resolvedReceiverId) {
        this.throwWsError('BAD_REQUEST', 'receiverId does not match conversation participants', {
          conversationId,
          receiverId,
        });
      }

      const conversation = await this.chatService.getConversation(
        senderId,
        conversationId,
      ).catch(() => null);
      if (!conversation?.conversation) {
        this.throwWsError('NOT_FOUND', 'Conversation not found', {
          conversationId,
        });
      }

      const conversationPolicy = conversation.conversation as Record<string, unknown>;
      if (
        conversationPolicy.isBlocked === true
        || conversationPolicy.blocked === true
      ) {
        this.throwWsError('FORBIDDEN', 'Messaging is blocked for this conversation');
      }

      if (
        conversationPolicy.isMuted === true
        || conversationPolicy.muted === true
      ) {
        this.throwWsError('FORBIDDEN', 'Messaging is muted for this conversation');
      }

      return {
        conversationId,
        receiverId: resolvedReceiverId,
      };
    }

    if (!receiverId?.trim()) {
      this.throwWsError('BAD_REQUEST', 'receiverId is required');
    }

    if (receiverId === senderId) {
      this.throwWsError('BAD_REQUEST', 'Cannot send message to yourself');
    }

    const resolvedConversationId = this.getResolvedConversationId(senderId, receiverId);
    const conversation = await this.chatService.getConversation(
      senderId,
      resolvedConversationId,
    ).catch(() => null);
    if (!conversation?.conversation) {
      this.throwWsError('NOT_FOUND', 'Conversation not found', {
        conversationId: resolvedConversationId,
      });
    }

    return {
      conversationId: resolvedConversationId,
      receiverId,
    };
  }

  private async validateConnection(client: Socket): Promise<any | null> {
    try {
      const token = this.getSocketToken(client);
      if (!token) {
        throw new Error('No token provided');
      }

      // Get JWT secret from config
      const jwtSecret =
        this.configService.get<AuthKeyConfig>(AuthKeyConfigName)?.jwtSecret;

      if (!jwtSecret) {
        this.logger.error('JWT secret not configured');
        throw new Error('JWT secret not configured');
      }

      // Validate JWT token with secret
      const payload = this.jwtService.verify(token, { secret: jwtSecret });
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
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MessageSendPayload,
  ) {
    return this.processMessageSend(client, data);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendMessage')
  async handleLegacySendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MessageSendPayload,
  ) {
    return this.processMessageSend(client, data);
  }

  private async processMessageSend(client: Socket, data: MessageSendPayload) {
    const sender = client.data.user;
    const {
      content,
      tempId,
    } = data;

    if (!sender || !sender.sub) {
      this.logger.error('Message send failed: Sender not authenticated', {
        socketId: client.id,
        tempId,
      });
      const unauthenticatedError: StructuredWsError = {
        code: 'UNAUTHORIZED',
        message: ERROR_MESSAGES.UNAUTHORIZED,
      };
      client.emit('error', unauthenticatedError);
      return {
        code: unauthenticatedError.code,
        error: unauthenticatedError.message,
        success: false,
        tempId: tempId ?? null,
      } satisfies MessageSendAckPayload;
    }

    try {
      this.pruneIdempotencyCache();
      this.assertMessageRateLimit(client);

      const resolvedConversation = await this.validateConversationMembership({
        conversationId: data.conversationId,
        receiverId: data.receiverId,
        senderId: sender.sub,
      });
      const {
        conversationId: resolvedConversationId,
        receiverId: resolvedReceiverId,
      } = resolvedConversation;

      if (tempId) {
        const idempotencyKey = this.getIdempotencyKey(sender.sub, tempId);
        const inFlight = this.inFlightMessageSends.get(idempotencyKey);
        if (inFlight) {
          if (
            inFlight.conversationId !== resolvedConversationId
            || inFlight.receiverId !== resolvedReceiverId
            || inFlight.content !== content
          ) {
            this.throwWsError(
              'CONFLICT',
              'Duplicate tempId with different payload',
              {
                tempId,
              },
            );
          }

          const inFlightMessage = await inFlight.promise as Record<string, unknown>;
          client.emit('message:ack', {
            tempId,
            id: inFlightMessage.id,
            createdAt: inFlightMessage.createdAt,
            message: inFlightMessage,
          });
          return {
            message: inFlightMessage,
            success: true,
            tempId,
          } satisfies MessageSendAckPayload;
        }

        const cached = this.messageSendIdempotencyCache.get(idempotencyKey);
        if (cached) {
          if (
            cached.conversationId !== resolvedConversationId
            || cached.receiverId !== resolvedReceiverId
            || cached.content !== content
          ) {
            this.throwWsError(
              'CONFLICT',
              'Duplicate tempId with different payload',
              {
                tempId,
              },
            );
          }

          this.logger.debug('Idempotent resend detected; returning cached ack', {
            senderId: sender.sub,
            tempId,
          });
          const cachedMessage = cached.message as Record<string, unknown>;
          client.emit('message:ack', {
            tempId,
            id: cachedMessage.id,
            createdAt: cachedMessage.createdAt,
            message: cachedMessage,
          });
          return {
            message: cachedMessage,
            success: true,
            tempId,
          } satisfies MessageSendAckPayload;
        }
      }

      // Join room only after membership validation.
      client.join(resolvedConversationId);

      const idempotencyKey = tempId
        ? this.getIdempotencyKey(sender.sub, tempId)
        : null;
      const messagePromise = this.chatService.sendMessage(
        sender.sub,
        resolvedReceiverId,
        content,
      );
      if (idempotencyKey) {
        this.inFlightMessageSends.set(idempotencyKey, {
          content,
          conversationId: resolvedConversationId,
          promise: messagePromise,
          receiverId: resolvedReceiverId,
        });
      }

      // Create the message
      const message = await messagePromise;
      if (idempotencyKey) {
        this.inFlightMessageSends.delete(idempotencyKey);
      }

      if (tempId) {
        this.messageSendIdempotencyCache.set(
          this.getIdempotencyKey(sender.sub, tempId),
          {
            content,
            conversationId: resolvedConversationId,
            createdAt: Date.now(),
            message,
            receiverId: resolvedReceiverId,
          },
        );
      }

      // ACK only after persistence.
      client.emit('messageSent', message);
      client.emit('message:ack', {
        tempId: tempId ?? null,
        id: message.id,
        createdAt: message.createdAt,
        message,
      });

      // Broadcast after ACK.
      const receiverSocket = this.userSockets.get(resolvedReceiverId);
      if (receiverSocket) {
        receiverSocket.join(resolvedConversationId);
        receiverSocket.emit('newMessage', message);
        receiverSocket.emit('message:new', message);

        this.logger.info('Message delivered to online user', {
          messageId: message.id,
          senderId: sender.sub,
          receiverId: resolvedReceiverId,
          contentLength: content.length,
        });
      } else {
        this.logger.info('Message saved for offline user', {
          messageId: message.id,
          senderId: sender.sub,
          receiverId: resolvedReceiverId,
          contentLength: content.length,
        });
      }

      this.logger.debug('Emitted message delivery acknowledgement', {
        tempId,
        messageId: message.id,
        senderId: sender.sub,
      });

      return { success: true, message, tempId: tempId ?? null } satisfies MessageSendAckPayload;
    } catch (error) {
      if (tempId) {
        this.inFlightMessageSends.delete(this.getIdempotencyKey(sender.sub, tempId));
      }
      const normalizedError = this.normalizeWsError(error);
      this.logger.error('Failed to send message', {
        senderId: sender.sub,
        receiverId: data.receiverId,
        error: normalizedError.message,
        errorCode: normalizedError.code,
        socketId: client.id,
        tempId,
      });
      client.emit('error', normalizedError);
      return {
        code: normalizedError.code,
        error: normalizedError.message,
        success: false,
        tempId: tempId ?? null,
      } satisfies MessageSendAckPayload;
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
  @SubscribeMessage('conversation:join')
  async handleConversationJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user;
    try {
      const conversation = await this.validateConversationMembership({
        conversationId: data?.conversationId,
        senderId: user?.sub,
      });
      client.join(conversation.conversationId);
      client.emit('conversation:joined', {
        conversationId: conversation.conversationId,
      });

      this.logger.debug('User joined conversation room', {
        conversationId: conversation.conversationId,
        socketId: client.id,
        userId: user.sub,
      });
    } catch (error) {
      const normalizedError = this.normalizeWsError(error);
      this.logger.warn('Failed conversation room join', {
        conversationId: data?.conversationId,
        errorCode: normalizedError.code,
        message: normalizedError.message,
        socketId: client.id,
        userId: user?.sub,
      });
      client.emit('error', normalizedError);
      throw new WsException(normalizedError);
    }
  }

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
    // Emit specific events that frontend expects
    if (isOnline) {
      this.server.emit('userOnline', {
        userId,
        isOnline: true,
        lastSeen: new Date(),
      });
    } else {
      this.server.emit('userOffline', {
        userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    }

    // Also emit generic user_status for backward compatibility
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
