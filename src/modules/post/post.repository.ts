import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostMedia } from './entities/post-media.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { AddMediaDto } from './dto/add-media.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class PostRepository {
  private readonly logger = new Logger(PostRepository.name);

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

  async createPost(user: User, createPostDto: CreatePostDto): Promise<Post> {
    const post = this.postRepo.create({
      user,
      description: createPostDto.description,
      journeyId: createPostDto.journeyId,
      location: createPostDto.location,
      latitude: createPostDto.latitude,
      longitude: createPostDto.longitude,
      likeCount: 0,
      commentCount: 0,
    });
    return await this.postRepo.save(post);
  }

  async addMediaToPost(
    post: Post,
    addMediaDto: AddMediaDto,
  ): Promise<PostMedia> {
    const media = this.postMediaRepo.create({
      post,
      type: addMediaDto.type,
      url: addMediaDto.url,
      thumbnailUrl: addMediaDto.thumbnailUrl,
      duration: addMediaDto.duration,
      order: addMediaDto.order,
    });
    return await this.postMediaRepo.save(media);
  }

  async getPostById(postId: string): Promise<Post> {
    return await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user', 'media', 'likes', 'comments', 'journey'],
    });
  }

  async getPublicPosts(limit: number = 10): Promise<Post[]> {
    return await this.postRepo.find({
      relations: ['user', 'media', 'likes', 'comments', 'journey'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPostsByUserId(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Post[]> {
    return await this.postRepo.find({
      where: { user: { id: userId } },
      relations: ['user', 'media', 'likes', 'comments', 'journey'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getPostCountByUserId(userId: string): Promise<number> {
    return await this.postRepo.count({
      where: { user: { id: userId } },
    });
  }

  async deletePost(postId: string): Promise<void> {
    // Delete associated media first
    await this.postMediaRepo.delete({ post: { id: postId } });

    // Delete associated likes
    await this.postLikeRepo.delete({ post: { id: postId } });

    // Delete associated comments (including replies)
    await this.postCommentRepo.delete({ post: { id: postId } });

    // Finally delete the post
    await this.postRepo.delete(postId);
  }

  async updatePost(
    postId: string,
    updatePostDto: CreatePostDto,
  ): Promise<Post> {
    await this.postRepo.update(postId, {
      description: updatePostDto.description,
      journeyId: updatePostDto.journeyId,
      location: updatePostDto.location,
      latitude: updatePostDto.latitude,
      longitude: updatePostDto.longitude,
    });

    return this.getPostById(postId);
  }

  async likePost(post: Post, user: User): Promise<void> {
    const existingLike = await this.postLikeRepo.findOne({
      where: { post: { id: post.id }, user: { id: user.id } },
    });

    if (!existingLike) {
      await this.postLikeRepo.save({
        post,
        user,
      });

      await this.postRepo.increment({ id: post.id }, 'likeCount', 1);
    }
  }

  async unlikePost(post: Post, user: User): Promise<void> {
    const result = await this.postLikeRepo.delete({
      post: { id: post.id },
      user: { id: user.id },
    });

    if (result.affected > 0) {
      await this.postRepo.decrement({ id: post.id }, 'likeCount', 1);
    }
  }

  async addComment(
    post: Post,
    user: User,
    content: string,
    parentComment?: PostComment,
  ): Promise<PostComment> {
    const comment = this.postCommentRepo.create({
      post,
      user,
      content,
      parent: parentComment,
      replyCount: 0,
    });

    const savedComment = await this.postCommentRepo.save(comment);

    if (parentComment) {
      await this.postCommentRepo.increment(
        { id: parentComment.id },
        'replyCount',
        1,
      );
    }

    await this.postRepo.increment({ id: post.id }, 'commentCount', 1);

    return savedComment;
  }

  async deleteComment(comment: PostComment): Promise<void> {
    if (comment) {
      if (comment.parent) {
        await this.postCommentRepo.decrement(
          { id: comment.parent.id },
          'replyCount',
          1,
        );
      }

      await this.postRepo.decrement({ id: comment.post.id }, 'commentCount', 1);
      await this.postCommentRepo.delete(comment.id);
    }
  }

  async getComments(
    postId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PostComment[]> {
    return await this.postCommentRepo.find({
      where: { post: { id: postId }, parent: null },
      relations: ['user', 'post'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getReplies(
    commentId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<PostComment[]> {
    return await this.postCommentRepo.find({
      where: { parent: { id: commentId } },
      relations: ['user', 'post'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });
  }
}
