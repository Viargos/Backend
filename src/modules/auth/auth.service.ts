import {
  Injectable,
  BadRequestException,
  Logger,
  ConflictException,
  InternalServerErrorException,
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
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
      });

      await this.userRepo.save(user);
      return { message: 'User registered successfully' };
    } catch (error) {
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

  // User Signin
  async signIn(user: User): Promise<{ accessToken: string }> {
    try {
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
      throw new InternalServerErrorException('Login failed');
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
}
