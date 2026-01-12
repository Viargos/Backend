import { ApiProperty } from '@nestjs/swagger';

export class LikeResponseDto {
  @ApiProperty({
    description: 'Whether the like/unlike operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'The updated like count for the post',
    example: 42,
  })
  likeCount: number;

  @ApiProperty({
    description: 'Whether the current user has liked the post after this operation',
    example: true,
  })
  isLiked: boolean;
}
