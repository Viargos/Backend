import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';
import { Post } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { S3Service } from '../user/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostMedia, PostLike, PostComment]),
    ConfigModule,
  ],
  controllers: [PostController],
  providers: [PostService, PostRepository, S3Service],
  exports: [PostService],
})
export class PostModule {}
