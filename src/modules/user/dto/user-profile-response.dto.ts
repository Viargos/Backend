import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';
import { Post } from '../../post/entities/post.entity';
import { Journey } from '../../journey/entities/journey.entity';
import { User } from '../entities/user.entity';

export class UserStatsDto {
  @ApiProperty({ description: 'Total number of followers' })
  followersCount: number;

  @ApiProperty({ description: 'Total number of users following' })
  followingCount: number;

  @ApiProperty({ description: 'Total number of posts' })
  postsCount: number;

  @ApiProperty({ description: 'Total number of journeys' })
  journeysCount: number;
}

export class RelationshipStatusDto {
  @ApiProperty({ description: 'Whether current user is following this user' })
  isFollowing: boolean;

  @ApiProperty({ description: 'Whether this user is following current user back' })
  isFollowedBy: boolean;
}

export class PostSummaryDto {
  @ApiProperty({ description: 'Post ID' })
  id: string;

  @ApiProperty({ description: 'Post description' })
  description: string;

  @ApiProperty({ description: 'Number of likes' })
  likeCount: number;

  @ApiProperty({ description: 'Number of comments' })
  commentCount: number;

  @ApiProperty({ description: 'Post creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Post media URLs', type: [String] })
  mediaUrls: string[];

  constructor(post: Post) {
    this.id = post.id;
    this.description = post.description;
    this.likeCount = post.likeCount;
    this.commentCount = post.commentCount;
    this.createdAt = post.createdAt;
    this.mediaUrls = post.media?.map(media => media.url) || [];
  }
}

export class JourneySummaryDto {
  @ApiProperty({ description: 'Journey ID' })
  id: string;

  @ApiProperty({ description: 'Journey title' })
  title: string;

  @ApiProperty({ description: 'Journey description' })
  description: string;

  @ApiProperty({ description: 'Journey cover image URL' })
  coverImage: string;

  @ApiProperty({ description: 'Number of days in journey' })
  daysCount: number;

  @ApiProperty({ description: 'Journey creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Journey author information' })
  author: {
    id: string;
    username: string;
    profileImage?: string;
  };

  @ApiProperty({ description: 'First few places from the journey for preview', type: [String] })
  previewPlaces: string[];

  @ApiProperty({ description: 'Journey difficulty/type if available' })
  type: string;

  constructor(journey: Journey) {
    this.id = journey?.id;
    this.title = journey?.title;
    this.description = journey?.description;
    this.coverImage = journey?.coverImage;
    this.daysCount = journey?.days?.length || 0;
    this.createdAt = journey?.createdAt;
    
    // Author information
    this.author = {
      id: journey?.user?.id,
      username: journey?.user?.username,
      profileImage: journey?.user?.profileImage
    };

    // Extract first few place names for preview
    this.previewPlaces = journey?.days
      ?.slice(0, 2) // First 2 days
      ?.flatMap(day => day?.places?.slice(0, 2)?.map(place => place?.name)) // First 2 places per day
      ?.filter(Boolean) // Remove undefined/null values
      ?.slice(0, 4) || []; // Maximum 4 places for preview

    // Journey type based on first place type or default
    this.type = journey?.days?.[0]?.places?.[0]?.type || 'ACTIVITY';
  }
}

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User information' })
  user: UserDto;

  @ApiProperty({ description: 'User statistics' })
  stats: UserStatsDto;

  @ApiProperty({ description: 'Relationship status with current user' })
  relationshipStatus: RelationshipStatusDto;

  @ApiProperty({ description: 'Recent followers', type: [UserDto] })
  recentFollowers: UserDto[];

  @ApiProperty({ description: 'Recently followed users', type: [UserDto] })
  recentFollowing: UserDto[];

  @ApiProperty({ description: 'Recent posts', type: [PostSummaryDto] })
  recentPosts: PostSummaryDto[];

  @ApiProperty({ description: 'Recent journeys', type: [JourneySummaryDto] })
  recentJourneys: JourneySummaryDto[];

  constructor(
    user: User,
    stats: UserStatsDto,
    relationshipStatus: RelationshipStatusDto,
    recentFollowers: User[],
    recentFollowing: User[],
    recentPosts: Post[],
    recentJourneys: Journey[]
  ) {
    this.user = new UserDto(user);
    this.stats = stats;
    this.relationshipStatus = relationshipStatus;
    this.recentFollowers = recentFollowers.map(follower => new UserDto(follower));
    this.recentFollowing = recentFollowing.map(following => new UserDto(following));
    this.recentPosts = recentPosts.map(post => new PostSummaryDto(post));
    this.recentJourneys = recentJourneys.map(journey => new JourneySummaryDto(journey));
  }
}
