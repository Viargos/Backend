import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserOtp, UserRelationship]),
  ],
  controllers: [UserController, UserRelationshipController],
  providers: [
    UserRepository,
    UserService,
    UserOtpRepository,
    UserRelationshipRepository,
    UserRelationshipService,
  ],
  exports: [UserRepository, UserService, UserOtpRepository, UserRelationshipService, UserRelationshipRepository],
})
export class UserModule {}
