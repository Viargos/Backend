# Backend Refactoring & Production Readiness Plan

**Project**: Viargos Backend (NestJS)
**Version**: 1.0.0
**Last Updated**: 2025-11-27

---

## 📋 Table of Contents

1. [Security Critical Fixes](#phase-1-security-critical-fixes)
2. [Code Organization & Architecture](#phase-2-code-organization--architecture)
3. [Performance & Optimization](#phase-3-performance--optimization)
4. [Production Readiness](#phase-4-production-readiness)
5. [Testing & Quality](#phase-5-testing--quality)
6. [Documentation](#phase-6-documentation)

---

## 🎯 Overall Goals

- ✅ Fix all critical security vulnerabilities
- ✅ Implement clean architecture with proper separation of concerns
- ✅ Add comprehensive error handling and logging
- ✅ Optimize database queries and add caching
- ✅ Prepare for production deployment
- ✅ Achieve 85+ security score

---

## PHASE 1: Security Critical Fixes (Week 1)

### 🔴 Priority: CRITICAL - Must complete before any deployment

### Step 1.1: Environment & Secrets Management
**Time**: 2 hours

**Tasks**:
- [ ] Create `.env.example` template file
- [ ] Remove real credentials from `.env`
- [ ] Add `.env` to `.gitignore` (verify)
- [ ] Generate strong JWT secret (256-bit)
- [ ] Rotate all compromised credentials:
  - [ ] Database password
  - [ ] AWS Access Keys
  - [ ] Gmail app password
  - [ ] JWT secret
  - [ ] OTP encryption key
- [ ] Create environment-specific files:
  - [ ] `.env.development`
  - [ ] `.env.staging`
  - [ ] `.env.production` (add to .gitignore)

**Files to create**:
```
src/config/
├── env.validation.ts       # Joi schema for env validation
└── secrets.config.ts       # Secrets configuration service
```

**Implementation**:
```typescript
// src/config/env.validation.ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().min(32).required(),
  DATABASE_URL: Joi.string().required(),
  // ... all other env vars
});
```

---

### Step 1.2: Remove Console Logs & Add Proper Logging
**Time**: 3 hours

**Tasks**:
- [ ] Create logging utility with Winston
- [ ] Remove ALL `console.log` statements
- [ ] Replace with proper logging levels
- [ ] Add request ID middleware
- [ ] Configure log rotation
- [ ] Add sensitive data masking

**Files to modify**:
```
src/utils/
├── logger.util.ts          # Centralized logger
├── log-masker.util.ts      # Mask sensitive data
└── request-id.middleware.ts
```

**Files to update**:
- [ ] `src/modules/auth/auth.service.ts` - Remove OTP console.log (line 87)
- [ ] `src/setup/chat.gateway.ts` - Replace console logs
- [ ] All other files with console.log

**Implementation**:
```typescript
// src/utils/logger.util.ts
import { createLogger, format, transports } from 'winston';

export class Logger {
  private static instance: Logger;
  private logger;

  private constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      defaultMeta: { service: 'viargos-api' },
      transports: [
        new transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          level: 'error',
          maxFiles: '30d'
        }),
        new transports.DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          maxFiles: '30d'
        })
      ]
    });
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Methods: debug, info, warn, error
}
```

---

### Step 1.3: Implement Rate Limiting
**Time**: 2 hours

**Tasks**:
- [ ] Install `@nestjs/throttler`
- [ ] Configure global rate limiting
- [ ] Add strict limits for auth endpoints
- [ ] Add custom throttler for OTP endpoints
- [ ] Configure IP-based throttling

**Dependencies**:
```bash
npm install @nestjs/throttler
```

**Implementation**:
```typescript
// app.module.ts
ThrottlerModule.forRoot([{
  name: 'short',
  ttl: 1000,
  limit: 3,
}, {
  name: 'medium',
  ttl: 10000,
  limit: 20
}, {
  name: 'long',
  ttl: 60000,
  limit: 100
}])

// auth.controller.ts
@Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 per minute
@Post('signin')

@Throttle({ short: { limit: 5, ttl: 300000 } }) // 5 per 5 minutes
@Post('signup')

@Throttle({ short: { limit: 3, ttl: 300000 } }) // 3 per 5 minutes
@Post('verify-otp')
```

---

### Step 1.4: File Upload Security
**Time**: 4 hours

**Tasks**:
- [ ] Install file validation libraries
- [ ] Add file size limits
- [ ] Validate MIME types
- [ ] Validate file content (magic bytes)
- [ ] Add malware scanning (optional)
- [ ] Implement upload quota per user
- [ ] Add file name sanitization

**Dependencies**:
```bash
npm install file-type sharp
```

**Files to create**:
```
src/utils/
├── file-validator.util.ts
├── file-size.constants.ts
└── mime-type.constants.ts
```

**Implementation**:
```typescript
// src/utils/file-validator.util.ts
import { BadRequestException } from '@nestjs/common';
import { FileTypeResult, fileTypeFromBuffer } from 'file-type';

export class FileValidator {
  private static readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  static async validateImageUpload(file: Express.Multer.File): Promise<void> {
    // Validate size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Validate MIME type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP, and GIF allowed');
    }

    // Validate actual file content (magic bytes)
    const fileType: FileTypeResult | undefined = await fileTypeFromBuffer(file.buffer);
    if (!fileType || !this.ALLOWED_IMAGE_TYPES.includes(fileType.mime)) {
      throw new BadRequestException('File content does not match declared type');
    }

    // Validate dimensions (optional)
    // Use sharp library to check image dimensions
  }

  static sanitizeFileName(originalName: string): string {
    return originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
  }
}

// Update s3.service.ts
async uploadFile(file: Express.Multer.File, folder: string, userId: string): Promise<string> {
  await FileValidator.validateImageUpload(file);
  // ... rest of upload logic
}
```

---

### Step 1.5: Password Security
**Time**: 2 hours

**Tasks**:
- [ ] Update password validation rules
- [ ] Add password strength checker
- [ ] Implement password history (prevent reuse)
- [ ] Add account lockout after failed attempts
- [ ] Add password breach check (optional)

**Implementation**:
```typescript
// src/modules/auth/dto/signup.dto.ts
@Matches(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  {
    message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
  }
)
readonly password: string;

// src/utils/password-strength.util.ts
export class PasswordStrengthChecker {
  static calculateStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    // Implement zxcvbn-like password strength checking
  }
}
```

---

### Step 1.6: Input Sanitization (XSS Protection)
**Time**: 3 hours

**Tasks**:
- [ ] Install sanitization library
- [ ] Create sanitization decorator
- [ ] Apply to all text inputs
- [ ] Sanitize HTML in user content
- [ ] Add output encoding

**Dependencies**:
```bash
npm install class-sanitizer xss
```

**Files to create**:
```
src/decorators/
└── sanitize.decorator.ts

src/pipes/
└── sanitization.pipe.ts
```

**Implementation**:
```typescript
// src/pipes/sanitization.pipe.ts
import { PipeTransform, Injectable } from '@nestjs/common';
import * as xss from 'xss';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return xss(value);
    }
    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }
    return value;
  }

  private sanitizeObject(obj: any): any {
    const sanitized = {};
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = xss(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = this.sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }
}

// Apply globally in main.ts
app.useGlobalPipes(new SanitizationPipe());
```

---

## PHASE 2: Code Organization & Architecture (Week 2)

### Step 2.1: Create Enums & Constants
**Time**: 3 hours

**Tasks**:
- [ ] Extract all magic strings/numbers to constants
- [ ] Create enums for all categorical values
- [ ] Organize by domain

**Files to create**:
```
src/common/
├── enums/
│   ├── user.enum.ts
│   ├── post.enum.ts
│   ├── journey.enum.ts
│   ├── chat.enum.ts
│   ├── auth.enum.ts
│   └── index.ts
└── constants/
    ├── file.constants.ts
    ├── pagination.constants.ts
    ├── time.constants.ts
    ├── error-messages.constants.ts
    └── index.ts
```

**Implementation**:
```typescript
// src/common/enums/user.enum.ts
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED'
}

export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

// src/common/enums/post.enum.ts
export enum PostMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED'
}

// src/common/enums/journey.enum.ts
export enum JourneyPlaceType {
  STAY = 'STAY',
  ACTIVITY = 'ACTIVITY',
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  NOTE = 'NOTE'
}

export enum JourneyStatus {
  PLANNING = 'PLANNING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// src/common/enums/auth.enum.ts
export enum OtpType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FACTOR_AUTH = 'TWO_FACTOR_AUTH'
}

export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET'
}

// src/common/constants/file.constants.ts
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  PROFILE_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  POST_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

// src/common/constants/pagination.constants.ts
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// src/common/constants/time.constants.ts
export const TIME = {
  OTP_EXPIRY_MINUTES: 10,
  JWT_ACCESS_TOKEN_EXPIRY: '7d',
  JWT_REFRESH_TOKEN_EXPIRY: '30d',
  PASSWORD_RESET_TOKEN_EXPIRY: '15m',
} as const;

// src/common/constants/error-messages.constants.ts
export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  USERNAME_ALREADY_EXISTS: 'Username already taken',
  OTP_EXPIRED: 'OTP has expired',
  INVALID_OTP: 'Invalid OTP',
  POST_NOT_FOUND: 'Post not found',
  JOURNEY_NOT_FOUND: 'Journey not found',
  PERMISSION_DENIED: 'You do not have permission to perform this action',
} as const;
```

---

### Step 2.2: Create Helper/Utility Functions
**Time**: 4 hours

**Tasks**:
- [ ] Create date/time helpers
- [ ] Create string manipulation helpers
- [ ] Create validation helpers
- [ ] Create transformation helpers
- [ ] Create encryption/hashing helpers

**Files to create**:
```
src/utils/
├── date.util.ts
├── string.util.ts
├── validation.util.ts
├── crypto.util.ts
├── pagination.util.ts
├── response.util.ts
└── index.ts
```

**Implementation**:
```typescript
// src/utils/date.util.ts
export class DateUtil {
  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static isExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  static formatToISO(date: Date): string {
    return date.toISOString();
  }
}

// src/utils/string.util.ts
export class StringUtil {
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// src/utils/crypto.util.ts
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export class CryptoUtil {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static encrypt(text: string, key: string): string {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  static decrypt(text: string, key: string): string {
    const algorithm = 'aes-256-cbc';
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

// src/utils/pagination.util.ts
import { PAGINATION } from '../common/constants';

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total?: number;
    page?: number;
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export class PaginationUtil {
  static validateLimit(limit?: number): number {
    const parsedLimit = Number(limit) || PAGINATION.DEFAULT_LIMIT;
    return Math.min(
      Math.max(parsedLimit, PAGINATION.MIN_LIMIT),
      PAGINATION.MAX_LIMIT
    );
  }

  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static createPaginationResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T> {
    return {
      data,
      pagination: {
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    };
  }
}

// src/utils/response.util.ts
export class ResponseUtil {
  static success<T>(data: T, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message: string, errors?: any) {
    return {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

### Step 2.3: Service Layer Refactoring
**Time**: 6 hours

**Tasks**:
- [ ] Extract business logic from controllers
- [ ] Create service interfaces
- [ ] Implement dependency injection properly
- [ ] Add service-level validation
- [ ] Create DTOs for internal service communication

**Structure**:
```
src/modules/[module]/
├── controllers/
│   └── [module].controller.ts
├── services/
│   ├── [module].service.ts
│   └── [module].service.interface.ts
├── repositories/
│   ├── [module].repository.ts
│   └── [module].repository.interface.ts
├── dto/
│   ├── request/
│   │   ├── create-[module].dto.ts
│   │   └── update-[module].dto.ts
│   └── response/
│       └── [module]-response.dto.ts
├── entities/
│   └── [module].entity.ts
└── [module].module.ts
```

**Example**:
```typescript
// src/modules/user/services/user.service.interface.ts
export interface IUserService {
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  create(dto: CreateUserDto): Promise<User>;
  update(id: string, dto: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
  uploadProfileImage(userId: string, file: Express.Multer.File): Promise<string>;
}

// src/modules/user/services/user.service.ts
@Injectable()
export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly s3Service: S3Service,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  // ... implement all interface methods
}
```

---

### Step 2.4: Create Custom Decorators
**Time**: 2 hours

**Tasks**:
- [ ] Create `@CurrentUser()` decorator
- [ ] Create `@Roles()` decorator
- [ ] Create `@Public()` decorator
- [ ] Create `@ApiPagination()` decorator

**Files to create**:
```
src/decorators/
├── current-user.decorator.ts
├── roles.decorator.ts
├── public.decorator.ts
├── api-pagination.decorator.ts
└── index.ts
```

**Implementation**:
```typescript
// src/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

// Usage in controller
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}

@Get('profile-id')
async getProfileId(@CurrentUser('id') userId: string) {
  return userId;
}

// src/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../common/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// src/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

---

### Step 2.5: Implement Guards Properly
**Time**: 3 hours

**Tasks**:
- [ ] Create RolesGuard
- [ ] Update JwtAuthGuard with IS_PUBLIC check
- [ ] Create OwnershipGuard
- [ ] Create ThrottlerBehindProxyGuard

**Files to create**:
```
src/guards/
├── roles.guard.ts
├── ownership.guard.ts
├── throttler-behind-proxy.guard.ts
└── index.ts
```

**Implementation**:
```typescript
// src/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}

// Update JwtAuthGuard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

---

### Step 2.6: Exception Filters & Interceptors
**Time**: 4 hours

**Tasks**:
- [ ] Create global exception filter
- [ ] Create HTTP exception filter
- [ ] Create transform interceptor
- [ ] Create logging interceptor
- [ ] Create timeout interceptor

**Files to create**:
```
src/filters/
├── global-exception.filter.ts
├── http-exception.filter.ts
└── index.ts

src/interceptors/
├── transform.interceptor.ts
├── logging.interceptor.ts
├── timeout.interceptor.ts
└── index.ts
```

**Implementation**:
```typescript
// src/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Logger } from '../utils/logger.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = Logger.getInstance();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    this.logger.error('Exception caught', {
      exception: errorResponse,
      requestId: request.id,
    });

    response.status(status).json(errorResponse);
  }
}

// src/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// src/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Logger } from '../utils/logger.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = Logger.getInstance();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;

        this.logger.info('HTTP Request', {
          method,
          url,
          statusCode: response.statusCode,
          duration: `${delay}ms`,
          requestId: request.id,
        });
      }),
    );
  }
}
```

---

## PHASE 3: Performance & Optimization (Week 3)

### Step 3.1: Database Optimization
**Time**: 5 hours

**Tasks**:
- [ ] Add database indices
- [ ] Implement connection pooling
- [ ] Add query optimization
- [ ] Implement soft deletes
- [ ] Add database migrations properly

**Implementation**:
```typescript
// Update entities with indices
@Entity('users')
@Index('idx_user_email', ['email'])
@Index('idx_user_username', ['username'])
@Index('idx_user_created', ['createdAt'])
export class User {
  // ... existing fields

  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity('posts')
@Index('idx_post_user_created', ['userId', 'createdAt'])
@Index('idx_post_location', ['location'])
@Index('idx_post_journey', ['journeyId'])
export class Post {
  @DeleteDateColumn()
  deletedAt?: Date;
}

@Entity('chat_messages')
@Index('idx_chat_sender_receiver', ['senderId', 'receiverId'])
@Index('idx_chat_created', ['createdAt'])
@Index('idx_chat_read', ['isRead'])
export class ChatMessage {
  // ... fields
}

// src/config/database.config.ts
export const databaseConfig = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // NEVER true in production
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: true,
  logging: process.env.NODE_ENV === 'development',
  poolSize: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  maxQueryExecutionTime: 1000, // Log slow queries
};
```

---

### Step 3.2: Implement Caching
**Time**: 4 hours

**Tasks**:
- [ ] Install Redis
- [ ] Configure cache module
- [ ] Cache user profiles
- [ ] Cache popular posts
- [ ] Implement cache invalidation

**Dependencies**:
```bash
npm install @nestjs/cache-manager cache-manager
npm install cache-manager-redis-store
npm install @types/cache-manager-redis-store -D
```

**Files to create**:
```
src/config/
└── cache.config.ts

src/decorators/
└── cache-key.decorator.ts
```

**Implementation**:
```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      ttl: 60 * 60, // 1 hour default
    }),
  ],
})

// user.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findById(id: string): Promise<User> {
    const cacheKey = `user:${id}`;
    const cached = await this.cacheManager.get<User>(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findById(id);
    await this.cacheManager.set(cacheKey, user, 3600); // 1 hour

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(id, dto);

    // Invalidate cache
    await this.cacheManager.del(`user:${id}`);

    return user;
  }
}
```

---

### Step 3.3: Query Optimization
**Time**: 3 hours

**Tasks**:
- [ ] Fix N+1 query problems
- [ ] Add eager/lazy loading strategy
- [ ] Implement query builders
- [ ] Add database query logging

**Implementation**:
```typescript
// Fix N+1 in post repository
async getDashboardPosts(userId: string, limit: number): Promise<Post[]> {
  return this.postRepository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .leftJoinAndSelect('post.media', 'media')
    .leftJoinAndSelect('post.journey', 'journey')
    .where('post.userId IN (SELECT followingId FROM user_relationships WHERE followerId = :userId)', { userId })
    .orWhere('post.userId = :userId', { userId })
    .orderBy('post.createdAt', 'DESC')
    .take(limit)
    .getMany();
}
```

---

### Step 3.4: Add Compression & Response Optimization
**Time**: 2 hours

**Tasks**:
- [ ] Enable gzip compression (already done, verify)
- [ ] Implement response pagination
- [ ] Add field selection (sparse fieldsets)
- [ ] Implement ETags for caching

---

## PHASE 4: Production Readiness (Week 4)

### Step 4.1: Environment Configuration
**Time**: 3 hours

**Tasks**:
- [ ] Create environment-specific configs
- [ ] Add config validation
- [ ] Setup secrets management
- [ ] Configure for containerization

**Files to create**:
```
config/
├── .env.development
├── .env.staging
├── .env.production.example
└── docker-compose.yml
```

---

### Step 4.2: Health Checks & Monitoring
**Time**: 4 hours

**Tasks**:
- [ ] Add health check endpoint
- [ ] Add readiness probe
- [ ] Add liveness probe
- [ ] Setup application metrics
- [ ] Integrate Sentry for error tracking

**Dependencies**:
```bash
npm install @nestjs/terminus
npm install @sentry/node
```

**Implementation**:
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

---

### Step 4.3: Graceful Shutdown
**Time**: 2 hours

**Tasks**:
- [ ] Implement shutdown hooks
- [ ] Handle SIGTERM/SIGINT
- [ ] Close database connections
- [ ] Complete pending requests

**Implementation**:
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks
  app.enableShutdownHooks();

  await app.listen(3000);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing gracefully...');
    await app.close();
    process.exit(0);
  });
}
```

---

### Step 4.4: API Versioning
**Time**: 2 hours

**Tasks**:
- [ ] Implement versioning strategy
- [ ] Update routes to v1
- [ ] Document versioning approach

**Implementation**:
```typescript
// main.ts
app.setGlobalPrefix('api/v1');

// Or URI versioning
app.enableVersioning({
  type: VersioningType.URI,
});

// controller
@Controller({
  version: '1',
  path: 'users',
})
```

---

### Step 4.5: Security Headers & HTTPS
**Time**: 2 hours

**Tasks**:
- [ ] Configure Helmet properly
- [ ] Add HSTS headers
- [ ] Configure CSP
- [ ] Add HTTPS redirect

**Implementation**:
```typescript
// main.ts
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://*.amazonaws.com'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'no-referrer' },
  }),
);

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

## PHASE 5: Testing & Quality (Week 5)

### Step 5.1: Unit Tests
**Time**: 8 hours

**Tasks**:
- [ ] Write unit tests for services
- [ ] Write unit tests for utils
- [ ] Write unit tests for guards
- [ ] Achieve 70%+ coverage

**Structure**:
```
src/modules/[module]/
├── services/
│   ├── [module].service.ts
│   └── [module].service.spec.ts
└── repositories/
    ├── [module].repository.ts
    └── [module].repository.spec.ts
```

---

### Step 5.2: Integration Tests
**Time**: 6 hours

**Tasks**:
- [ ] Write E2E tests for auth flow
- [ ] Write E2E tests for CRUD operations
- [ ] Setup test database
- [ ] Add test fixtures

---

### Step 5.3: Code Quality Tools
**Time**: 2 hours

**Tasks**:
- [ ] Configure ESLint rules
- [ ] Add Prettier configuration
- [ ] Setup Husky pre-commit hooks
- [ ] Add commitlint

**Dependencies**:
```bash
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
```

---

## PHASE 6: Documentation (Week 6)

### Step 6.1: API Documentation
**Time**: 4 hours

**Tasks**:
- [ ] Enhance Swagger documentation
- [ ] Add examples to all endpoints
- [ ] Document error responses
- [ ] Add authentication flow docs

---

### Step 6.2: Code Documentation
**Time**: 3 hours

**Tasks**:
- [ ] Add JSDoc comments
- [ ] Document complex algorithms
- [ ] Create architecture diagrams
- [ ] Update README

---

## 📊 Progress Tracking

### Week 1: Security Critical ⬜
- [ ] Environment & Secrets (Step 1.1)
- [ ] Logging (Step 1.2)
- [ ] Rate Limiting (Step 1.3)
- [ ] File Upload Security (Step 1.4)
- [ ] Password Security (Step 1.5)
- [ ] Input Sanitization (Step 1.6)

### Week 2: Code Organization ⬜
- [ ] Enums & Constants (Step 2.1)
- [ ] Helper Functions (Step 2.2)
- [ ] Service Refactoring (Step 2.3)
- [ ] Custom Decorators (Step 2.4)
- [ ] Guards (Step 2.5)
- [ ] Filters & Interceptors (Step 2.6)

### Week 3: Performance ⬜
- [ ] Database Optimization (Step 3.1)
- [ ] Caching (Step 3.2)
- [ ] Query Optimization (Step 3.3)
- [ ] Response Optimization (Step 3.4)

### Week 4: Production Readiness ⬜
- [ ] Environment Configuration (Step 4.1)
- [ ] Health Checks (Step 4.2)
- [ ] Graceful Shutdown (Step 4.3)
- [ ] API Versioning (Step 4.4)
- [ ] Security Headers (Step 4.5)

### Week 5: Testing ⬜
- [ ] Unit Tests (Step 5.1)
- [ ] Integration Tests (Step 5.2)
- [ ] Code Quality (Step 5.3)

### Week 6: Documentation ⬜
- [ ] API Documentation (Step 6.1)
- [ ] Code Documentation (Step 6.2)

---

## 🎯 Success Metrics

- [ ] Security Score: 85+/100
- [ ] Test Coverage: 70%+
- [ ] API Response Time: <200ms (p95)
- [ ] Zero Critical Vulnerabilities
- [ ] All Sensitive Data Encrypted
- [ ] All Logs Properly Structured
- [ ] Health Checks Passing
- [ ] Documentation Complete

---

## 📝 Notes

- Each step should be completed in order
- Create feature branches for each major change
- Write tests as you refactor
- Document breaking changes
- Keep backward compatibility where possible
- Review and test thoroughly before merging

---

**Start Date**: _____________
**Target Completion**: 6 weeks
**Team**: _____________
**Review Frequency**: Weekly
