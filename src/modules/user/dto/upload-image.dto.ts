import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
  @ApiProperty({
    description: 'URL of the uploaded image',
    example:
      'https://your-bucket.s3.amazonaws.com/profile-images/user-id/image.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Image uploaded successfully',
  })
  message: string;
}

export class UpdateProfileImageDto {
  @ApiProperty({
    description: 'Profile image URL',
    example:
      'https://your-bucket.s3.amazonaws.com/profile-images/user-id/image.jpg',
  })
  profileImage: string;
}

export class UpdateBannerImageDto {
  @ApiProperty({
    description: 'Banner image URL',
    example:
      'https://your-bucket.s3.amazonaws.com/banner-images/user-id/image.jpg',
  })
  bannerImage: string;
}
