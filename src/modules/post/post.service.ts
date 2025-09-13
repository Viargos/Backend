import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PostRepository } from './post.repository';
import { CreatePostDto } from './dto/create-post.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { Post } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostComment } from './entities/post-comment.entity';
import { User } from '../user/entities/user.entity';
import { S3Service } from '../user/s3.service';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly s3Service: S3Service,
  ) {}

  async createPost(user: User, createPostDto: CreatePostDto): Promise<Post> {
    return this.postRepository.createPost(user, createPostDto);
  }

  async addMediaToPost(
    user: User,
    postId: string,
    addMediaDto: AddMediaDto,
  ): Promise<PostMedia> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.user.id !== user.id) {
      throw new BadRequestException('You can only add media to your own posts');
    }

    return this.postRepository.addMediaToPost(post, addMediaDto);
  }

  async getPost(postId: string): Promise<Post> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async getPostsByUser(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Post[]> {
    return this.postRepository.getPostsByUserId(userId, limit, offset);
  }

  async getPostCountByUser(userId: string): Promise<number> {
    return this.postRepository.getPostCountByUserId(userId);
  }

  async likePost(postId: string, user: User): Promise<void> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postRepository.likePost(post, user);
  }

  async unlikePost(postId: string, user: User): Promise<void> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postRepository.unlikePost(post, user);
  }

  async addComment(
    postId: string,
    user: User,
    content: string,
    parentId?: string,
  ): Promise<PostComment> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let parentComment: PostComment | undefined;
    if (parentId) {
      const comments = await this.postRepository.getComments(postId);
      parentComment = comments.find((comment) => comment.id === parentId);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    return this.postRepository.addComment(post, user, content, parentComment);
  }

  async deleteComment(commentId: string, user: User): Promise<void> {
    const comments = await this.postRepository.getComments(commentId);
    const comment = comments[0];
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user.id !== user.id) {
      throw new BadRequestException('You can only delete your own comments');
    }

    await this.postRepository.deleteComment(comment);
  }

  async getComments(
    postId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PostComment[]> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.postRepository.getComments(postId, limit, offset);
  }

  async getReplies(
    commentId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PostComment[]> {
    return this.postRepository.getReplies(commentId, limit, offset);
  }

  async uploadPostMedia(userId: string, file: any): Promise<string> {
    // Upload to S3 using the same pattern as profile images
    return await this.s3Service.uploadFile(file, 'posts', userId);
  }
}
