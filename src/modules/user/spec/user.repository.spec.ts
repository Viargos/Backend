import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { User } from '../entities/user.entity';
import { PostgresErrorCode } from '../../../utils/constants';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockUserRepo: Repository<User>;

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpassword',
    phoneNumber: '1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
    mockUserRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return a user when found', async () => {
      jest.spyOn(mockUserRepo, 'findOne').mockResolvedValue(mockUser);

      const result = await userRepository.getUserById('1');
      expect(result).toEqual(mockUser);
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(mockUserRepo, 'findOne').mockResolvedValue(null);

      await expect(userRepository.getUserById('1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      jest
        .spyOn(mockUserRepo, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      await expect(userRepository.getUserById('1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUsers', () => {
    it('should return array of users based on condition', async () => {
      const condition = { email: 'test@example.com' };
      const users = [mockUser];
      jest.spyOn(mockUserRepo, 'find').mockResolvedValue(users);

      const result = await userRepository.getUsers(condition);
      expect(result).toEqual(users);
      expect(mockUserRepo.find).toHaveBeenCalledWith({ where: condition });
    });

    it('should throw InternalServerErrorException on database error', async () => {
      const condition = { email: 'test@example.com' };
      jest
        .spyOn(mockUserRepo, 'find')
        .mockRejectedValue(new Error('Database error'));

      await expect(userRepository.getUsers(condition)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('createUser', () => {
    it('should successfully create a user', async () => {
      const newUser = { username: 'newuser', email: 'new@example.com' };
      jest.spyOn(mockUserRepo, 'save').mockResolvedValue(mockUser);

      const result = await userRepository.createUser(newUser);
      expect(result).toEqual(mockUser);
      expect(mockUserRepo.save).toHaveBeenCalledWith(newUser);
    });

    it('should throw ConflictException for duplicate username', async () => {
      const newUser = { username: 'existinguser', email: 'new@example.com' };
      const error = {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        detail: 'Key (username)=(existinguser) already exists',
      };
      jest.spyOn(mockUserRepo, 'save').mockRejectedValue(error);

      await expect(userRepository.createUser(newUser)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepo.save).toHaveBeenCalledWith(newUser);
    });

    it('should throw ConflictException for duplicate email', async () => {
      const newUser = { username: 'newuser', email: 'existing@example.com' };
      const error = {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        detail: 'Key (email)=(existing@example.com) already exists',
      };
      jest.spyOn(mockUserRepo, 'save').mockRejectedValue(error);

      await expect(userRepository.createUser(newUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException for duplicate phone number', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        phoneNumber: '1234567890',
      };
      const error = {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        detail: 'Key (phonenumber)=(1234567890) already exists',
      };
      jest.spyOn(mockUserRepo, 'save').mockRejectedValue(error);

      await expect(userRepository.createUser(newUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException for other database errors', async () => {
      const newUser = { username: 'newuser', email: 'new@example.com' };
      jest
        .spyOn(mockUserRepo, 'save')
        .mockRejectedValue(new Error('Database error'));

      await expect(userRepository.createUser(newUser)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateUser', () => {
    it('should successfully update a user', async () => {
      const updateData = { username: 'updateduser' };
      const updatedUser = { ...mockUser, ...updateData };

      jest.spyOn(userRepository, 'getUserById').mockResolvedValue(mockUser);
      jest.spyOn(mockUserRepo, 'save').mockResolvedValue(updatedUser);

      const result = await userRepository.updateUser('1', updateData);
      expect(result).toEqual(updatedUser);
      expect(userRepository.getUserById).toHaveBeenCalledWith('1');
      expect(mockUserRepo.save).toHaveBeenCalledWith(updatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateData = { username: 'updateduser' };
      jest
        .spyOn(userRepository, 'getUserById')
        .mockRejectedValue(new NotFoundException());

      await expect(userRepository.updateUser('1', updateData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate username', async () => {
      const updateData = { username: 'existinguser' };
      const error = {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        detail: 'Key (username)=(existinguser) already exists',
      };

      jest.spyOn(userRepository, 'getUserById').mockResolvedValue(mockUser);
      jest.spyOn(mockUserRepo, 'save').mockRejectedValue(error);

      await expect(userRepository.updateUser('1', updateData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException for other database errors', async () => {
      const updateData = { username: 'updateduser' };
      jest.spyOn(userRepository, 'getUserById').mockResolvedValue(mockUser);
      jest
        .spyOn(mockUserRepo, 'save')
        .mockRejectedValue(new Error('Database error'));

      await expect(userRepository.updateUser('1', updateData)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a user', async () => {
      jest.spyOn(userRepository, 'getUserById').mockResolvedValue(mockUser);
      jest.spyOn(mockUserRepo, 'remove').mockResolvedValue(mockUser);

      await userRepository.deleteUser('1');
      expect(userRepository.getUserById).toHaveBeenCalledWith('1');
      expect(mockUserRepo.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest
        .spyOn(userRepository, 'getUserById')
        .mockRejectedValue(new NotFoundException());

      await expect(userRepository.deleteUser('1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      jest.spyOn(userRepository, 'getUserById').mockResolvedValue(mockUser);
      jest
        .spyOn(mockUserRepo, 'remove')
        .mockRejectedValue(new Error('Database error'));

      await expect(userRepository.deleteUser('1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('handleUniqueViolation', () => {
    it('should throw ConflictException for username conflict', () => {
      const error = {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        detail: 'Key (username)=(existing) already exists',
      };

      expect(() =>
        (userRepository as any).handleUniqueViolation(error),
      ).toThrow(ConflictException);
    });

    it('should throw ConflictException for email conflict', () => {
      const error = {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        detail: 'Key (email)=(existing@example.com) already exists',
      };

      expect(() =>
        (userRepository as any).handleUniqueViolation(error),
      ).toThrow(ConflictException);
    });

    it('should throw ConflictException for phone number conflict', () => {
      const error = {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        detail: 'Key (phonenumber)=(1234567890) already exists',
      };

      expect(() =>
        (userRepository as any).handleUniqueViolation(error),
      ).toThrow(ConflictException);
    });

    it('should throw generic ConflictException for other unique violations', () => {
      const error = {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        detail: 'Some other unique violation',
      };

      expect(() =>
        (userRepository as any).handleUniqueViolation(error),
      ).toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException for non-unique violation errors', () => {
      const error = {
        code: 'OTHER_ERROR',
        message: 'Some other error',
      };

      expect(() =>
        (userRepository as any).handleUniqueViolation(error),
      ).toThrow(InternalServerErrorException);
    });
  });
});
