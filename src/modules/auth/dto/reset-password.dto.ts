import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'newPassword123',
    description: 'New password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  readonly newPassword: string;
} 