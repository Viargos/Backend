import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PostRepository } from './post.repository';
import { CreatePostDto } from './dto/create-post.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { Post } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostComment } from './entities/post-comment.entity';

@Injectable()
export class PostService {
  constructor(private readonly postRepository: PostRepository) {}

  async createPost(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    return this.postRepository.createPost(userId, createPostDto.description);
  }

  async addMediaToPost(postId: string, addMediaDto: AddMediaDto): Promise<PostMedia> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.postRepository.addMediaToPost(postId, addMediaDto);
  }

  async getPost(postId: string): Promise<Post> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async getPostsByUser(userId: string, limit: number = 10, offset: number = 0): Promise<Post[]> {
    return this.postRepository.getPostsByUserId(userId, limit, offset);
  }

  async likePost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postRepository.likePost(postId, userId);
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postRepository.unlikePost(postId, userId);
  }

  async addComment(postId: string, userId: string, content: string, parentId?: string): Promise<PostComment> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (parentId) {
      const parentComment = await this.postRepository.getComments(postId);
      const parentExists = parentComment.some(comment => comment.id === parentId);
      if (!parentExists) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    return this.postRepository.addComment(postId, userId, content, parentId);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.postRepository.getComments(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment[0].userId !== userId) {
      throw new BadRequestException('You can only delete your own comments');
    }

    await this.postRepository.deleteComment(commentId);
  }

  async getComments(postId: string, limit: number = 10, offset: number = 0): Promise<PostComment[]> {
    const post = await this.postRepository.getPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.postRepository.getComments(postId, limit, offset);
  }

  async getReplies(commentId: string, limit: number = 10, offset: number = 0): Promise<PostComment[]> {
    return this.postRepository.getReplies(commentId, limit, offset);
  }
}
