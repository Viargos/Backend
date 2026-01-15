import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, ILike } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { PostgresErrorCode } from 'src/utils/constants';
import { SearchUserDto, SearchUserResult } from './dto/search-user.dto';

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

  async searchUsers(searchDto: SearchUserDto): Promise<SearchUserResult> {
    try {
      const {
        search,
        username,
        email,
        location,
        isActive,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = searchDto;

      const queryBuilder = this.userRepo.createQueryBuilder('user');

      // Global search across multiple fields
      if (search) {
        queryBuilder.andWhere(
          '(LOWER(user.username) LIKE LOWER(:search) OR ' +
            'LOWER(user.email) LIKE LOWER(:search) OR ' +
            'LOWER(user.bio) LIKE LOWER(:search) OR ' +
            'LOWER(user.location) LIKE LOWER(:search))',
          { search: `%${search}%` },
        );
      }

      // Specific field filters
      if (username) {
        queryBuilder.andWhere('LOWER(user.username) LIKE LOWER(:username)', {
          username: `%${username}%`,
        });
      }

      if (email) {
        queryBuilder.andWhere('LOWER(user.email) LIKE LOWER(:email)', {
          email: `%${email}%`,
        });
      }

      if (location) {
        queryBuilder.andWhere('LOWER(user.location) LIKE LOWER(:location)', {
          location: `%${location}%`,
        });
      }

      if (typeof isActive === 'boolean') {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive });
      }

      // Exclude password field from results
      queryBuilder.select([
        'user.id',
        'user.username',
        'user.email',
        'user.phoneNumber',
        'user.bio',
        'user.profileImage',
        'user.bannerImage',
        'user.location',
        'user.isActive',
        'user.createdAt',
        'user.updatedAt',
      ]);

      // Sorting
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

      // Get total count before applying pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // Execute query
      const users = await queryBuilder.getMany();

      const totalPages = Math.ceil(total / limit);

      return {
        users,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to search users with params: ${JSON.stringify(searchDto)}`,
        error.stack,
      );
      throw new InternalServerErrorException(error.message);
    }
  }

  async searchUsersByTerm(
    searchTerm: string,
    limit: number = 10,
  ): Promise<User[]> {
    try {
      const queryBuilder = this.userRepo.createQueryBuilder('user');

      queryBuilder
        .where(
          '(LOWER(user.username) LIKE LOWER(:searchTerm) OR ' +
            'LOWER(user.email) LIKE LOWER(:searchTerm) OR ' +
            'LOWER(user.bio) LIKE LOWER(:searchTerm) OR ' +
            'LOWER(user.location) LIKE LOWER(:searchTerm))',
          { searchTerm: `%${searchTerm}%` },
        )
        .select([
          'user.id',
          'user.username',
          'user.email',
          'user.phoneNumber',
          'user.bio',
          'user.profileImage',
          'user.bannerImage',
          'user.location',
          'user.isActive',
          'user.createdAt',
          'user.updatedAt',
        ])
        .orderBy('user.createdAt', 'DESC')
        .limit(limit);

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(
        `Failed to search users by term: ${searchTerm}`,
        error.stack,
      );
      throw new InternalServerErrorException(error.message);
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
