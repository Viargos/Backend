import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LocalAuthGuard } from 'src/security/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { PasswordResetGuard } from './guards/password-reset.guard';
import { User } from '../user/entities/user.entity';
import { UserDto } from '../user/dto/user.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  setAuthCookies,
  setAccessCookie,
  clearAuthCookies,
} from './utils/cookie.util';
import { ConfigService } from '@nestjs/config';
import { COOKIE_NAMES } from '../../common/constants';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { NoTransform } from '../../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async signup(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('verify-otp')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP for email verification or password reset' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Request() req: { headers: any; ip?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(verifyOtpDto);

    // If OTP verification activated the account (email verification), set auth cookies
    if (result.user && result.user.isActive) {
      const userAgent = req.headers['user-agent'] || undefined;
      const ipAddress =
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.ip ||
        undefined;

      const { accessToken, refreshToken } =
        await this.authService.generateTokens(result.user, userAgent, ipAddress);

      setAuthCookies(res, accessToken, refreshToken, this.configService);

      return {
        message: result.message,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          profileImage: result.user.profileImage,
          isActive: result.user.isActive,
        },
      };
    }

    // For password reset, return the accessToken in body (not cookie) - it's short-lived
    return {
      message: result.message,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('verify-email')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP for email verification' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Request() req: { headers: any; ip?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.verifyOtp(verifyOtpDto, req, res);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'Password reset OTP sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('resend-otp')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend OTP for email verification or password reset' })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend OTP for email verification' })
  @ApiResponse({ status: 200, description: 'Verification OTP resent successfully' })
  async resendVerification(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  @Public()
  @UseGuards(PasswordResetGuard)
  @Post('reset-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resetPassword(
    @Request() req: { user: User },
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(req.user.id, resetPasswordDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @NoTransform()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async signin(
    @Body() _signInDto: SignInDto,
    @Request() req: { user: User; headers: any; ip?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.ip ||
      undefined;

    if (!req.user.isActive) {
      await this.authService.resendOtp({ email: req.user.email });
      const { accessToken, refreshToken } = await this.authService.generateTokens(
        req.user,
        userAgent,
        ipAddress,
      );
      setAuthCookies(res, accessToken, refreshToken, this.configService);

      return {
        message: 'Email verification required',
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          profileImage: req.user.profileImage,
          isActive: req.user.isActive,
        },
        verified: false,
        requiresVerification: true,
      };
    }

    const { accessToken, refreshToken } = await this.authService.generateTokens(
      req.user,
      userAgent,
      ipAddress,
    );

    setAuthCookies(res, accessToken, refreshToken, this.configService);

    return {
      message: 'Login successful',
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        profileImage: req.user.profileImage,
        isActive: req.user.isActive,
      },
      verified: true,
      requiresVerification: false,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    // Return plain data - Transform Interceptor will wrap it in { data: T }
    return new UserDto(user);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async refresh(
    @Request() req: { user: User & { tokenId: string }; cookies: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[COOKIE_NAMES.REFRESH_TOKEN];

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const { accessToken } = await this.authService.refreshAccessToken(
      refreshToken,
    );

    setAccessCookie(res, accessToken, this.configService);

    return {
      message: 'Token refreshed',
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Request() req: { cookies: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies[COOKIE_NAMES.REFRESH_TOKEN];

    // Try to revoke refresh token (may be expired, that's okay)
    if (refreshToken) {
      await this.authService.revokeRefreshTokenByToken(refreshToken);
    }

    clearAuthCookies(res, this.configService);

    return {
      message: 'Logged out successfully',
    };
  }
}
