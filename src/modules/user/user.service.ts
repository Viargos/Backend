import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from '../user/entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findUserById(id: string): Promise<User> {
    return this.userRepository.getUserById(id);
  }

  async findUsers(condition: Partial<User> = {}): Promise<User[]> {
    return this.userRepository.getUsers(condition);
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return this.userRepository.createUser(userData);
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    return this.userRepository.updateUser(userId, updateData);
  }

  async deleteUser(userId: string): Promise<void> {
    return await this.userRepository.deleteUser(userId);
  }
}
