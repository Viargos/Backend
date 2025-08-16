import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserOtp } from './entities/user-otp.entity';
import { UserOtpRepository } from './user-otp.repository';
import { UserRelationship } from './entities/user-relationship.entity';
import { UserRelationshipRepository } from './user-relationship.repository';
import { UserRelationshipService } from './user-relationship.service';
import { UserRelationshipController } from './user-relationship.controller';
import { S3Service } from './s3.service';
import { PostModule } from '../post/post.module';
import { JourneyModule } from '../journey/journey.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserOtp, UserRelationship]),
    ConfigModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
    forwardRef(() => PostModule),
    forwardRef(() => JourneyModule),
  ],
  controllers: [UserController, UserRelationshipController],
  providers: [
    UserRepository,
    UserService,
    UserOtpRepository,
    UserRelationshipRepository,
    UserRelationshipService,
    S3Service,
  ],
  exports: [
    UserRepository,
    UserService,
    UserOtpRepository,
    UserRelationshipService,
    UserRelationshipRepository,
  ],
})
export class UserModule {}
