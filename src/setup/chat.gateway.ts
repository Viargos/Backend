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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Socket> = new Map();

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.validateConnection(client);
      if (user) {
        this.userSockets.set(user.id, client);
        client.data.user = user;
        console.log(`User ${user.id} connected`);
      }
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.userSockets.delete(user.id);
      console.log(`User ${user.id} disconnected`);
    }
  }

  private async validateConnection(client: Socket): Promise<User | null> {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        throw new Error('No token provided');
      }
      // Implement token validation logic here
      // Return user if valid, null if invalid
      return null; // Replace with actual validation
    } catch (error) {
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

    try {
      const message = await this.chatService.sendMessage(
        sender.id,
        receiverId,
        content,
      );

      // Send to receiver if online
      const receiverSocket = this.userSockets.get(receiverId);
      if (receiverSocket) {
        receiverSocket.emit('newMessage', message);
      }

      // Send confirmation to sender
      client.emit('messageSent', message);
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
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
      await this.chatService.markMessagesAsRead(senderId, receiver.id);
      
      // Notify sender that messages were read
      const senderSocket = this.userSockets.get(senderId);
      if (senderSocket) {
        senderSocket.emit('messagesRead', { receiverId: receiver.id });
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to mark messages as read' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    try {
      const count = await this.chatService.getUnreadMessageCount(user.id);
      client.emit('unreadCount', { count });
    } catch (error) {
      client.emit('error', { message: 'Failed to get unread count' });
    }
  }
} 