import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    description: 'Post description',
    example: 'This is my first post!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;
} 