import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { PostgresErrorCode } from 'src/utils/constants';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getUserById(userId: string): Promise<User> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });

      if (!user)
        throw new NotFoundException(`User with ID ${userId} not found`);

      return user;
    } catch (error) {
      this.logger.error(`Failed to get user by ID: ${userId}`, error.stack);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(error.message);
    }
  }

  async getUserByEmail(email: string): Promise<User> {
    try {
      const user = await this.userRepo.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      return user;
    } catch (error) {
      this.logger.error(`Failed to get user by email: ${email}`, error.stack);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(error.message);
    }
  }

  async getUsers(findCondition: FindOptionsWhere<User> = {}): Promise<User[]> {
    try {
      return await this.userRepo.find({ where: findCondition });
    } catch (error) {
      this.logger.error(
        `Failed to get users with condition: ${JSON.stringify(findCondition)}`,
        error.stack,
      );
      throw new InternalServerErrorException(error.message);
    }
  }

  async createUser(user: Partial<User>): Promise<User> {
    try {
      return await this.userRepo.save(user);
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${JSON.stringify(user)}`,
        error.stack,
      );
      this.handleUniqueViolation(error);
    }
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      const user = await this.getUserById(userId);
      Object.assign(user, updateData);
      return await this.userRepo.save(user);
    } catch (error) {
      this.logger.error(
        `Failed to update user ID: ${userId} with data: ${JSON.stringify(updateData)}`,
        error.stack,
      );
      if (!(error instanceof NotFoundException)) {
        this.handleUniqueViolation(error);
      }
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      await this.userRepo.remove(user);
    } catch (error) {
      this.logger.error(
        `Failed to delete user with ID: ${userId}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(error.message);
    }
  }

  private handleUniqueViolation(error: any): never {
    if (error.code === PostgresErrorCode.UNIQUE_VIOLATION) {
      const detail = error.detail?.toLowerCase() || '';

      if (detail.includes('username'))
        throw new ConflictException('Username already exists');

      if (detail.includes('email'))
        throw new ConflictException('Email already exists');

      if (detail.includes('phonenumber'))
        throw new ConflictException('Phone number already exists');

      throw new ConflictException('User already exists with given credentials');
    }

    throw new InternalServerErrorException(error.message);
  }
}
