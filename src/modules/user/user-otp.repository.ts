import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOtp, OtpType } from './entities/user-otp.entity';

@Injectable()
export class UserOtpRepository {
  private readonly logger = new Logger(UserOtpRepository.name);

  constructor(
    @InjectRepository(UserOtp)
    private readonly userOtpRepo: Repository<UserOtp>,
  ) {}

  async createOtp(userId: string, otpHash: string, type: OtpType): Promise<UserOtp> {
    try {
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

      const otp = this.userOtpRepo.create({
        userId,
        otpHash,
        type,
        otpExpiry,
      });

      return await this.userOtpRepo.save(otp);
    } catch (error) {
      this.logger.error(
        `Failed to create OTP for user ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create OTP');
    }
  }

  async getLatestOtp(userId: string, type: OtpType): Promise<UserOtp> {
    try {
      const otp = await this.userOtpRepo.findOne({
        where: {
          userId,
          type,
          isUsed: false,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (!otp) {
        throw new NotFoundException('No active OTP found');
      }

      return otp;
    } catch (error) {
      this.logger.error(
        `Failed to get OTP for user ${userId}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get OTP');
    }
  }

  async markOtpAsUsed(otpId: string): Promise<void> {
    try {
      await this.userOtpRepo.update(otpId, { isUsed: true });
    } catch (error) {
      this.logger.error(
        `Failed to mark OTP ${otpId} as used`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update OTP status');
    }
  }

  async invalidateUserOtps(userId: string, type: OtpType): Promise<void> {
    try {
      await this.userOtpRepo.update(
        {
          userId,
          type,
          isUsed: false,
        },
        { isUsed: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to invalidate OTPs for user ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to invalidate OTPs');
    }
  }
} 