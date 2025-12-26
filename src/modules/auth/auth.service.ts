import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { ResendOtpDto } from './dto/resend-otp.dto';

// ✅ NEW: Import utilities and constants
import { Logger, CryptoUtil, DateUtil, StringUtil } from '../../common/utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, TIME } from '../../common/constants';

@Injectable()
export class AuthService {
  // ✅ NEW: Use our custom logger instead of NestJS Logger
  private readonly logger = Logger.child({
    service: 'AuthService',
  });

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

      // ✅ NEW: Log signup attempt (with masked data)
      this.logger.info('User signup attempt', {
        email: StringUtil.maskEmail(email),
        username,
      });

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
      if (emailExists) {
        errors.email = ERROR_MESSAGES.USER.EMAIL_ALREADY_EXISTS;
      }
      if (usernameExists) {
        errors.username = ERROR_MESSAGES.USER.USERNAME_ALREADY_EXISTS;
      }
      if (phoneExists) {
        errors.phoneNumber = ERROR_MESSAGES.USER.PHONE_ALREADY_EXISTS;
      }

      // If any errors exist, throw them
      if (Object.keys(errors).length > 0) {
        this.logger.warn('Signup validation failed', {
          email: StringUtil.maskEmail(email),
          errors: Object.keys(errors),
        });

        const errorValues = Object.values(errors).join('. ');
        throw new BadRequestException({
          message: `Validation failed: ${errorValues}`,
          errors,
        });
      }

      // ✅ NEW: Use CryptoUtil for password hashing
      const hashedPassword = await CryptoUtil.hashPassword(password);

      const user = this.userRepo.create({
        username,
        email,
        phoneNumber,
        password: hashedPassword,
        isActive: false,
      });

      await this.userRepo.save(user);

      // ✅ NEW: Use CryptoUtil to generate OTP
      const otp = CryptoUtil.generateOTP(6);

      // ✅ REMOVED: console.log(otp, '------otp------'); - SECURITY ISSUE FIXED!

      // ✅ NEW: Log OTP generation safely (without exposing the actual OTP)
      this.logger.info('OTP generated for email verification', {
        userId: user.id,
        email: StringUtil.maskEmail(email),
        expiresIn: `${TIME.OTP_EXPIRY_MINUTES} minutes`,
      });

      const otpHash = OtpHelper.encodeOtp(otp);
      await this.userOtpRepository.createOtp(
        user.id,
        otpHash,
        OtpType.EMAIL_VERIFICATION,
      );

      // Send OTP email
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

          // ✅ REPLACED: console.log with Logger
          this.logger.info('Email sent successfully', {
            to: StringUtil.maskEmail(email),
            type: 'email-verification',
          });
        };
        await sendEmail(typeOfTemplate);
      } catch (emailError) {
        // ✅ NEW: Better error logging
        this.logger.error('Email sending failed', {
          to: StringUtil.maskEmail(email),
          error: emailError.message,
        });
        // Don't fail signup if email fails, just log it
      }

      // ✅ NEW: Log successful signup
      this.logger.info('User registered successfully', {
        userId: user.id,
        email: StringUtil.maskEmail(email),
      });

      return {
        message: SUCCESS_MESSAGES.AUTH.SIGNUP_SUCCESS,
      };
    } catch (error) {
      // ✅ REMOVED: console.log(error, '-----error--------');

      // ✅ NEW: Use Logger.exception for proper error logging with stack trace
      this.logger.exception(error, {
        context: 'signUp',
        email: signUpDto.email
          ? StringUtil.maskEmail(signUpDto.email)
          : 'unknown',
      });

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        ERROR_MESSAGES.AUTH.SIGNUP_FAILED || 'Registration failed',
      );
    }
  }

  // Verify OTP
  async verifyOtp(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ message: string; accessToken?: string }> {
    try {
      const { email, otp } = verifyOtpDto;

      // ✅ NEW: Log verification attempt
      this.logger.info('OTP verification attempt', {
        email: StringUtil.maskEmail(email),
      });

      const user = await this.userRepository.getUserByEmail(email);

      if (!user) {
        this.logger.warn('OTP verification failed: user not found', {
          email: StringUtil.maskEmail(email),
        });
        throw new UnauthorizedException(ERROR_MESSAGES.USER.NOT_FOUND);
      }

      // Get the latest OTP for the user
      const userOtp = await this.userOtpRepository.getLatestOtp(
        user.id,
        user.isActive ? OtpType.PASSWORD_RESET : OtpType.EMAIL_VERIFICATION,
      );

      // ✅ NEW: Use DateUtil for date comparison
      if (DateUtil.isExpired(userOtp.otpExpiry)) {
        this.logger.warn('OTP expired', {
          userId: user.id,
          expiredAt: DateUtil.formatToISO(userOtp.otpExpiry),
        });
        throw new BadRequestException(ERROR_MESSAGES.OTP.EXPIRED);
      }

      const decodedOtp = OtpHelper.decodeOtp(userOtp.otpHash);
      if (decodedOtp !== otp) {
        this.logger.warn('Invalid OTP provided', {
          userId: user.id,
          email: StringUtil.maskEmail(email),
        });
        throw new UnauthorizedException(ERROR_MESSAGES.OTP.INVALID);
      }

      // Mark OTP as used
      await this.userOtpRepository.markOtpAsUsed(userOtp.id);

      // Generate access token for both email verification and password reset
      const payload = {
        email: user.email,
        sub: user.id, // Use 'sub' for JWT standard
        purpose: user.isActive ? 'password_reset' : 'login',
      };

      // Short-lived for password reset, longer for login (delegated to constants)
      const expiresIn = user.isActive
        ? TIME.PASSWORD_RESET_TOKEN_EXPIRY
        : TIME.JWT_ACCESS_TOKEN_EXPIRY;
      const accessToken = this.jwtService.sign(payload, {
        expiresIn,
      });

      // If this is email verification, activate the account
      if (!user.isActive) {
        await this.userRepository.updateUser(user.id, {
          isActive: true,
        });

        // ✅ NEW: Log successful verification
        this.logger.info('Email verified successfully', {
          userId: user.id,
          email: StringUtil.maskEmail(email),
        });

        return {
          message: SUCCESS_MESSAGES.AUTH.EMAIL_VERIFIED,
          accessToken,
        };
      }

      // If this is password reset verification, return token
      this.logger.info('OTP verified for password reset', {
        userId: user.id,
        email: StringUtil.maskEmail(email),
      });

      return {
        message: SUCCESS_MESSAGES.AUTH.OTP_VERIFIED,
        accessToken,
      };
    } catch (error) {
      // ✅ NEW: Better error logging
      this.logger.exception(error, {
        context: 'verifyOtp',
        email: verifyOtpDto.email
          ? StringUtil.maskEmail(verifyOtpDto.email)
          : 'unknown',
      });

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        ERROR_MESSAGES.OTP.VERIFICATION_FAILED || 'OTP verification failed',
      );
    }
  }

  // Forgot Password
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const { email } = forgotPasswordDto;

      // ✅ NEW: Log password reset request
      this.logger.info('Password reset requested', {
        email: StringUtil.maskEmail(email),
      });

      const user = await this.userRepository.getUserByEmail(email);

      if (!user) {
        this.logger.warn('Password reset failed: user not found', {
          email: StringUtil.maskEmail(email),
        });
        throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND);
      }

      if (!user.isActive) {
        this.logger.warn('Password reset failed: email not verified', {
          userId: user.id,
          email: StringUtil.maskEmail(email),
        });
        throw new BadRequestException(ERROR_MESSAGES.AUTH.ACCOUNT_NOT_ACTIVE);
      }

      // ✅ NEW: Use CryptoUtil to generate OTP
      const otp = CryptoUtil.generateOTP(6);
      const otpHash = OtpHelper.encodeOtp(otp);

      // ✅ NEW: Log OTP generation (without exposing OTP)
      this.logger.info('Password reset OTP generated', {
        userId: user.id,
        email: StringUtil.maskEmail(email),
        expiresIn: `${TIME.OTP_EXPIRY_MINUTES} minutes`,
      });

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

      // Send OTP email
      try {
        await this.mailerService.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Password Reset Request',
          template: 'password-reset',
          context: {
            username: user.username,
            otp,
          },
        });

        // ✅ NEW: Log email sent successfully
        this.logger.info('Password reset email sent successfully', {
          to: StringUtil.maskEmail(email),
          type: 'password-reset',
        });
      } catch (emailError) {
        // ✅ NEW: Better error logging
        this.logger.error('Password reset email sending failed', {
          to: StringUtil.maskEmail(email),
          error: emailError.message,
        });
        // Don't fail password reset request if email fails, just log it
        // The OTP is still generated and stored, user can request resend if needed
      }

      return { message: SUCCESS_MESSAGES.AUTH.PASSWORD_RESET_REQUESTED };
    } catch (error) {
      // ✅ NEW: Better error logging
      this.logger.exception(error, {
        context: 'forgotPassword',
        email: forgotPasswordDto.email
          ? StringUtil.maskEmail(forgotPasswordDto.email)
          : 'unknown',
      });

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

  // Resend OTP for email verification
  async resendOtp(resendOtpDto: ResendOtpDto): Promise<{ message: string }> {
    try {
      const { email } = resendOtpDto;

      // ✅ NEW: Log OTP resend request
      this.logger.info('OTP resend requested', {
        email: StringUtil.maskEmail(email),
      });

      const user = await this.userRepository.getUserByEmail(email);

      if (!user) {
        this.logger.warn('OTP resend failed: user not found', {
          email: StringUtil.maskEmail(email),
        });
        throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND);
      }

      // Determine OTP type based on user status
      const otpType = user.isActive
        ? OtpType.PASSWORD_RESET
        : OtpType.EMAIL_VERIFICATION;

      // ✅ NEW: Use CryptoUtil to generate OTP
      const otp = CryptoUtil.generateOTP(6);
      const otpHash = OtpHelper.encodeOtp(otp);

      // ✅ NEW: Log OTP generation (without exposing OTP)
      this.logger.info('OTP generated for resend', {
        userId: user.id,
        email: StringUtil.maskEmail(email),
        otpType,
        expiresIn: `${TIME.OTP_EXPIRY_MINUTES} minutes`,
      });

      // Invalidate any existing OTPs of the same type
      await this.userOtpRepository.invalidateUserOtps(user.id, otpType);

      // Create new OTP
      await this.userOtpRepository.createOtp(user.id, otpHash, otpType);

      // Send OTP email
      try {
        const template = user.isActive
          ? 'password-reset'
          : 'email-verification';
        const subject = user.isActive
          ? 'Password Reset Request'
          : 'Verify your email address';

        await this.mailerService.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject,
          template,
          context: {
            username: user.username,
            otp,
          },
        });

        // ✅ NEW: Log email sent successfully
        this.logger.info('OTP email sent successfully', {
          to: StringUtil.maskEmail(email),
          type: template,
        });
      } catch (emailError) {
        // ✅ NEW: Better error logging
        this.logger.error('OTP email sending failed', {
          to: StringUtil.maskEmail(email),
          error: emailError.message,
        });
        // Don't fail OTP resend if email fails, just log it
        // The OTP is still generated and stored, user can try again if needed
      }

      return {
        message: user.isActive
          ? SUCCESS_MESSAGES.AUTH.PASSWORD_RESET_REQUESTED
          : SUCCESS_MESSAGES.AUTH.OTP_SENT,
      };
    } catch (error) {
      // ✅ NEW: Better error logging
      this.logger.exception(error, {
        context: 'resendOtp',
        email: resendOtpDto.email
          ? StringUtil.maskEmail(resendOtpDto.email)
          : 'unknown',
      });

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to resend OTP');
    }
  }

  // Reset Password
  async resetPassword(
    userId: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const { newPassword } = resetPasswordDto;

      // ✅ NEW: Log password reset attempt
      this.logger.info('Password reset attempt', { userId });

      const user = await this.userRepository.getUserById(userId);

      if (!user) {
        this.logger.warn('Password reset failed: user not found', { userId });
        throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND);
      }

      // ✅ NEW: Use CryptoUtil for password hashing
      const hashedPassword = await CryptoUtil.hashPassword(newPassword);

      // Update password
      await this.userRepository.updateUser(user.id, {
        password: hashedPassword,
      });

      // ✅ NEW: Log successful password reset
      this.logger.info('Password reset successful', {
        userId: user.id,
        email: StringUtil.maskEmail(user.email),
      });

      return { message: SUCCESS_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS };
    } catch (error) {
      // ✅ NEW: Better error logging
      this.logger.exception(error, {
        context: 'resetPassword',
        userId,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  // User Signin
  async signIn(user: User): Promise<{ accessToken: string }> {
    try {
      // ✅ NEW: Log signin attempt
      this.logger.info('User signin attempt', {
        userId: user.id,
        email: StringUtil.maskEmail(user.email),
      });

      if (!user.isActive) {
        // ✅ NEW: Use CryptoUtil to generate OTP
        const otp = CryptoUtil.generateOTP(6);
        const otpHash = OtpHelper.encodeOtp(otp);

        await this.userOtpRepository.createOtp(
          user.id,
          otpHash,
          OtpType.EMAIL_VERIFICATION,
        );

        // ✅ NEW: Log OTP generation
        this.logger.warn('Signin blocked: email not verified', {
          userId: user.id,
          email: StringUtil.maskEmail(user.email),
        });

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

        throw new UnauthorizedException(ERROR_MESSAGES.AUTH.ACCOUNT_NOT_ACTIVE);
      }

      const payload = { email: user.email, sub: user.id }; // Use 'sub' for JWT standard
      const expiresIn =
        this.configService.get<AuthKeyConfig>(AuthKeyConfigName);

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: expiresIn.expiresIn,
      });

      // ✅ NEW: Log successful signin
      this.logger.info('User signin successful', {
        userId: user.id,
        email: StringUtil.maskEmail(user.email),
      });

      return { accessToken };
    } catch (error) {
      // ✅ NEW: Better error logging
      this.logger.exception(error, {
        context: 'signIn',
        userId: user?.id,
        email: user?.email ? StringUtil.maskEmail(user.email) : 'unknown',
      });

      throw new InternalServerErrorException(error.message || 'Login failed');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.getUserByEmail(email);

    // ✅ NEW: Use CryptoUtil for password comparison
    if (user && (await CryptoUtil.comparePassword(password, user.password))) {
      // ✅ NEW: Log successful validation
      this.logger.info('User credentials validated', {
        userId: user.id,
        email: StringUtil.maskEmail(email),
      });

      const { password, ...result } = user;
      return result;
    }

    // ✅ NEW: Log failed validation
    this.logger.warn('Invalid credentials', {
      email: StringUtil.maskEmail(email),
    });

    return null;
  }

  async signup(signUpDto: SignUpDto) {
    return this.signUp(signUpDto);
  }

  async signin(user: User) {
    return this.signIn(user);
  }
}
