import {
  Injectable,
  BadRequestException,
  Logger,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';
import { SignUpDto } from './dto/signup.dto';
import { UserRepository } from '../user/user.repository';
import { ConfigService } from '@nestjs/config';
import { AuthKeyConfig, AuthKeyConfigName } from 'src/config/authkey.config';
import { OtpHelper } from 'src/utils/otp.helper';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { UserOtpRepository } from '../user/user-otp.repository';
import { OtpType } from '../user/entities/user-otp.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly userOtpRepository: UserOtpRepository,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  // User Signup
  async signUp(signUpDto: SignUpDto): Promise<{ message: string }> {
    try {
      const { username, email, phoneNumber, password } = signUpDto;

      // Check all unique fields in parallel
      const [emailExists, usernameExists, phoneExists] = await Promise.all([
        this.userRepo.findOne({ where: { email } }),
        this.userRepo.findOne({ where: { username } }),
        phoneNumber
          ? this.userRepo.findOne({ where: { phoneNumber } })
          : Promise.resolve(null),
      ]);

      // Build errors object
      const errors: Record<string, string> = {};
      if (emailExists) errors.email = 'Email already exists';
      if (usernameExists) errors.username = 'Username already exists';
      if (phoneExists) errors.phoneNumber = 'Phone number already exists';

      // If any errors exist, throw them
      if (Object.keys(errors).length > 0) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      }

      // Create new user if no errors
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = this.userRepo.create({
        username,
        email,
        phoneNumber,
        password: hashedPassword,
        isActive: false,
      });

      await this.userRepo.save(user);

      // Generate and save OTP
      const otp = OtpHelper.generateOtp();

      console.log(otp, '------otp------');

      const otpHash = OtpHelper.encodeOtp(otp);
      await this.userOtpRepository.createOtp(
        user.id,
        otpHash,
        OtpType.EMAIL_VERIFICATION,
      );

      // Send OTP email (disabled for development)
      try {
        const typeOfTemplate = 'email-verification';
        const sendEmail = async (typeOfTemplate: string) => {
          await this.mailerService.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify your email address',
            template: typeOfTemplate,
            context: {
              username,
              otp,
            },
          });
          console.log('email sent successfully');
        };
        sendEmail(typeOfTemplate);
      } catch (emailError) {
        this.logger.warn(`Email sending failed: ${emailError.message}`);
        // Don't fail signup if email fails, just log it
      }

      return {
        message: 'User registered successfully. Please verify your email.',
      };
    } catch (error) {
      console.log(error, '-----error--------');

      this.logger.error(`Signup failed: ${error.message}`, error.stack);
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Registration failed');
    }
  }

  // Verify OTP
  async verifyOtp(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ message: string; accessToken?: string }> {
    try {
      const { email, otp } = verifyOtpDto;
      const user = await this.userRepository.getUserByEmail(email);

      if (!user) {
        throw new UnauthorizedException('Invalid email address');
      }

      // Get the latest OTP for the user
      const userOtp = await this.userOtpRepository.getLatestOtp(
        user.id,
        user.isActive ? OtpType.PASSWORD_RESET : OtpType.EMAIL_VERIFICATION,
      );

      if (new Date() > userOtp.otpExpiry) {
        throw new BadRequestException(
          'OTP has expired. Please request a new one.',
        );
      }

      const decodedOtp = OtpHelper.decodeOtp(userOtp.otpHash);
      if (decodedOtp !== otp) {
        throw new UnauthorizedException('Invalid OTP');
      }

      // Mark OTP as used
      await this.userOtpRepository.markOtpAsUsed(userOtp.id);

      // If this is email verification, activate the account
      if (!user.isActive) {
        await this.userRepository.updateUser(user.id, {
          isActive: true,
        });
        return { message: 'Email verified successfully' };
      }

      // If this is password reset verification, generate and return token
      const payload = {
        email: user.email,
        id: user.id,
        purpose: 'password_reset',
      };
      const expiresIn =
        this.configService.get<AuthKeyConfig>(AuthKeyConfigName);
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '15m', // Short-lived token for password reset
      });

      return {
        message: 'OTP verified successfully',
        accessToken,
      };
    } catch (error) {
      this.logger.error(
        `OTP verification failed: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('OTP verification failed');
    }
  }

  // Forgot Password
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const { email } = forgotPasswordDto;
      const user = await this.userRepository.getUserByEmail(email);

      if (!user) {
        throw new NotFoundException('No account found with this email address');
      }

      if (!user.isActive) {
        throw new BadRequestException('Please verify your email first');
      }

      // Generate and save OTP
      const otp = OtpHelper.generateOtp();
      const otpHash = OtpHelper.encodeOtp(otp);

      // Invalidate any existing password reset OTPs
      await this.userOtpRepository.invalidateUserOtps(
        user.id,
        OtpType.PASSWORD_RESET,
      );

      // Create new OTP
      await this.userOtpRepository.createOtp(
        user.id,
        otpHash,
        OtpType.PASSWORD_RESET,
      );

      // Send OTP email (disabled for development)
      // await this.mailerService.sendMail({
      //   to: email,
      //   subject: 'Password Reset Request',
      //   template: 'password-reset',
      //   context: {
      //     username: user.username,
      //     otp,
      //   },
      // });

      return { message: 'Password reset OTP sent to your email' };
    } catch (error) {
      this.logger.error(
        `Forgot password failed: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to process password reset request',
      );
    }
  }

  // Reset Password
  async resetPassword(
    userId: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const { newPassword } = resetPasswordDto;
      const user = await this.userRepository.getUserById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.userRepository.updateUser(user.id, {
        password: hashedPassword,
      });

      return { message: 'Password reset successful' };
    } catch (error) {
      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  // User Signin
  async signIn(user: User): Promise<{ accessToken: string }> {
    try {
      if (!user.isActive) {
        const otp = OtpHelper.generateOtp();

        const otpHash = OtpHelper.encodeOtp(otp);
        await this.userOtpRepository.createOtp(
          user.id,
          otpHash,
          OtpType.EMAIL_VERIFICATION,
        );

        // Send OTP email (disabled for development)
        // await this.mailerService.sendMail({
        //   to: user?.email,
        //   subject: 'Verify your email address',
        //   template: 'email-verification',
        //   context: {
        //     username: user?.username,
        //     otp,
        //   },
        // });
        throw new UnauthorizedException('Please verify your email first');
      }

      const payload = { email: user.email, id: user.id };
      const expiresIn =
        this.configService.get<AuthKeyConfig>(AuthKeyConfigName);

      return {
        accessToken: this.jwtService.sign(payload, {
          expiresIn: expiresIn.expiresIn,
        }),
      };
    } catch (error) {
      this.logger.error(`Signin failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(error.message || 'Login failed');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.getUserByEmail(email);

    if (user && bcrypt.compareSync(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async signup(signUpDto: SignUpDto) {
    return this.signUp(signUpDto);
  }

  async signin(user: User) {
    return this.signIn(user);
  }
}
