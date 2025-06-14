import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';

@Injectable()
export class PostRepository {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostMedia)
    private readonly postMediaRepo: Repository<PostMedia>,
    @InjectRepository(PostLike)
    private readonly postLikeRepo: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly postCommentRepo: Repository<PostComment>,
  ) {}

  async createPost(userId: string, description: string): Promise<Post> {
    const post = this.postRepo.create({
      userId,
      description,
    });
    return this.postRepo.save(post);
  }

  async addMediaToPost(postId: string, mediaData: Partial<PostMedia>): Promise<PostMedia> {
    const media = this.postMediaRepo.create({
      postId,
      ...mediaData,
    });
    return this.postMediaRepo.save(media);
  }

  async getPostById(postId: string): Promise<Post> {
    return this.postRepo.findOne({
      where: { id: postId },
      relations: ['user', 'media', 'likes', 'comments'],
    });
  }

  async getPostsByUserId(userId: string, limit: number = 10, offset: number = 0): Promise<Post[]> {
    return this.postRepo.find({
      where: { userId },
      relations: ['user', 'media', 'likes', 'comments'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
  }

  async likePost(postId: string, userId: string): Promise<PostLike> {
    const like = this.postLikeRepo.create({
      postId,
      userId,
    });
    await this.postLikeRepo.save(like);
    await this.postRepo.increment({ id: postId }, 'likeCount', 1);
    return like;
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    await this.postLikeRepo.delete({ postId, userId });
    await this.postRepo.decrement({ id: postId }, 'likeCount', 1);
  }

  async addComment(postId: string, userId: string, content: string, parentId?: string): Promise<PostComment> {
    const comment = this.postCommentRepo.create({
      postId,
      userId,
      content,
      parentId,
    });
    await this.postCommentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    if (parentId) {
      await this.postCommentRepo.increment({ id: parentId }, 'replyCount', 1);
    }
    return comment;
  }

  async deleteComment(commentId: string): Promise<void> {
    const comment = await this.postCommentRepo.findOne({
      where: { id: commentId },
    });
    if (comment) {
      await this.postCommentRepo.delete({ id: commentId });
      await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1);
      if (comment.parentId) {
        await this.postCommentRepo.decrement({ id: comment.parentId }, 'replyCount', 1);
      }
    }
  }

  async getComments(postId: string, limit: number = 10, offset: number = 0): Promise<PostComment[]> {
    return this.postCommentRepo.find({
      where: { postId, parentId: null },
      relations: ['user', 'parent'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
  }

  async getReplies(commentId: string, limit: number = 10, offset: number = 0): Promise<PostComment[]> {
    return this.postCommentRepo.find({
      where: { parentId: commentId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip: offset,
      take: limit,
    });
  }
} 