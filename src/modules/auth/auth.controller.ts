import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { LocalAuthGuard } from 'src/security/local-auth.guard';
import { GetUser } from 'src/core/decorators/user.decorator';
import { UserDto } from '../user/dto/user.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // User Sign-Up
  @Post('registration')
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  // User Sign-In
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK) // Prevents 201 response for sign-in
  async signIn(
    @Body() signInDto: SignInDto,
    @GetUser() user,
    @Res({ passthrough: true }) res: Response,
  ) {
    const loginResponse = await this.authService.signIn(user);

    res.setHeader('access-token', `Bearer ${loginResponse.accessToken}`);

    return new UserDto(user);
  }
}
