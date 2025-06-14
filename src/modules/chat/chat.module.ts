import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    UserModule,
  ],
  providers: [ChatRepository, ChatService],
  exports: [ChatService],
})
export class ChatModule {} 