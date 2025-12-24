# Migration Guide: Using New Utilities & Constants

This guide shows how to gradually migrate your existing code to use the new enums, constants, and utility functions **without breaking anything**.

## 📁 What We've Added (100% Safe - No Breaking Changes)

### New Directory Structure
```
src/common/
├── enums/
│   ├── user.enum.ts
│   ├── post.enum.ts
│   ├── journey.enum.ts
│   ├── chat.enum.ts
│   ├── auth.enum.ts
│   ├── file.enum.ts
│   └── index.ts
├── constants/
│   ├── file.constants.ts
│   ├── pagination.constants.ts
│   ├── time.constants.ts
│   ├── validation.constants.ts
│   ├── error-messages.constants.ts
│   ├── success-messages.constants.ts
│   ├── http-status.constants.ts
│   └── index.ts
└── utils/
    ├── date.util.ts
    ├── string.util.ts
    ├── crypto.util.ts
    ├── pagination.util.ts
    ├── response.util.ts
    ├── logger.util.ts
    ├── file-validator.util.ts
    └── index.ts
```

---

## 🚀 Migration Strategy (Step by Step)

### Phase 1: Start Using Logger (Instead of console.log)

**Before (Current Code - Still Works)**:
```typescript
console.log(otp, '------otp------');
console.log('email sent successfully');
console.error('Connection error:', error);
```

**After (Recommended - Add alongside existing)**:
```typescript
import { Logger } from '@/common/utils';

// Instead of console.log
Logger.info('OTP generated', { userId: user.id });
Logger.info('Email sent successfully', { to: email });
Logger.error('Connection error', { error: error.message });

// For exceptions with stack traces
Logger.exception(error, { context: 'Email sending' });
```

**Migration Steps**:
1. Import Logger in your service file
2. Add Logger calls alongside existing console.log (don't remove console.log yet)
3. Test that both work
4. Once confident, remove console.log statements

**Example Migration in `auth.service.ts`**:
```typescript
// OLD (line 87 - REMOVE THIS AFTER TESTING)
console.log(otp, '------otp------');

// NEW (ADD THIS)
import { Logger, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../common';

// In your method:
Logger.info('OTP generated for email verification', {
  email: StringUtil.maskEmail(email),
  expiresAt: DateUtil.formatToISO(otpExpiryDate)
});
```

---

### Phase 2: Use Constants Instead of Magic Strings

**Before**:
```typescript
const hashedPassword = await bcrypt.hash(password, 10);

if (file.size > 10 * 1024 * 1024) {
  throw new Error('File too large');
}

if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}
```

**After**:
```typescript
import { FILE_UPLOAD, ERROR_MESSAGES } from '@/common/constants';
import { CryptoUtil } from '@/common/utils';

const hashedPassword = await CryptoUtil.hashPassword(password);

if (file.size > FILE_UPLOAD.MAX_SIZE) {
  throw new BadRequestException(ERROR_MESSAGES.FILE.TOO_LARGE);
}

if (!FILE_UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
  throw new BadRequestException(ERROR_MESSAGES.FILE.INVALID_TYPE);
}
```

---

### Phase 3: Use File Validation Utilities

**Before (in `s3.service.ts`)**:
```typescript
async uploadFile(file: any, folder: string, userId: string): Promise<string> {
  // Validate file
  if (!file || !file.buffer) {
    throw new Error('No file or file buffer provided');
  }

  const fileExtension = file.originalname.split('.').pop();
  // ... rest of code
}
```

**After**:
```typescript
import { FileValidatorUtil } from '@/common/utils';
import { FileUploadFolder } from '@/common/enums';

async uploadFile(file: Express.Multer.File, folder: FileUploadFolder, userId: string): Promise<string> {
  // Validate file before upload
  FileValidatorUtil.validateImageFile(file);

  const fileExtension = FileValidatorUtil.getFileExtension(file.originalname);
  const sanitizedFilename = FileValidatorUtil.sanitizeFilename(file.originalname);

  // ... rest of code
}
```

---

### Phase 4: Use Enums for Type Safety

**Before**:
```typescript
// Hardcoded strings everywhere
if (post.status === 'PUBLISHED') { }
if (user.role === 'ADMIN') { }
if (otpType === 'EMAIL_VERIFICATION') { }
```

**After**:
```typescript
import { PostStatus, UserRole, OtpType } from '@/common/enums';

if (post.status === PostStatus.PUBLISHED) { }
if (user.role === UserRole.ADMIN) { }
if (otpType === OtpType.EMAIL_VERIFICATION) { }
```

**Update Entities**:
```typescript
// src/modules/user/entities/user-otp.entity.ts
import { OtpType } from '@/common/enums';

export enum OtpType { // REMOVE THIS OLD ENUM
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

// REPLACE WITH IMPORT
import { OtpType } from '@/common/enums';

@Entity('user_otps')
export class UserOtp {
  @Column({
    type: 'enum',
    enum: OtpType,
    default: OtpType.EMAIL_VERIFICATION,
  })
  type: OtpType;
}
```

---

### Phase 5: Use Utility Functions

#### Date Utilities

**Before**:
```typescript
const expiryDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

if (new Date() > userOtp.otpExpiry) {
  throw new BadRequestException('OTP has expired');
}
```

**After**:
```typescript
import { DateUtil } from '@/common/utils';
import { TIME } from '@/common/constants';

const expiryDate = DateUtil.addMinutes(new Date(), TIME.OTP_EXPIRY_MINUTES);

if (DateUtil.isExpired(userOtp.otpExpiry)) {
  throw new BadRequestException(ERROR_MESSAGES.OTP.EXPIRED);
}
```

#### Crypto Utilities

**Before**:
```typescript
import * as bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, user.password);
```

**After**:
```typescript
import { CryptoUtil } from '@/common/utils';

const hashedPassword = await CryptoUtil.hashPassword(password);
const isValid = await CryptoUtil.comparePassword(password, user.password);

// Generate OTP
const otp = CryptoUtil.generateOTP(6);
```

#### String Utilities

**Before**:
```typescript
// No consistent way to mask sensitive data
const maskedEmail = email.replace(/(.{2}).*(@.*)/, '$1***$2');
```

**After**:
```typescript
import { StringUtil } from '@/common/utils';

const maskedEmail = StringUtil.maskEmail(email);
const maskedPhone = StringUtil.maskPhone(phoneNumber);
const formattedCount = StringUtil.formatNumber(1500); // "1.5K"
```

#### Pagination Utilities

**Before**:
```typescript
const limit = Math.min(Number(query.limit) || 20, 100);
const page = Number(query.page) || 1;
const offset = (page - 1) * limit;
```

**After**:
```typescript
import { PaginationUtil } from '@/common/utils';

const { page, limit, offset } = PaginationUtil.extractPaginationParams(query);

// Or for cursor pagination
const { cursor, limit } = PaginationUtil.extractCursorPaginationParams(query);
```

#### Response Utilities

**Before**:
```typescript
return {
  statusCode: 200,
  message: 'Posts retrieved successfully',
  data: posts,
};
```

**After**:
```typescript
import { ResponseUtil, SUCCESS_MESSAGES } from '@/common';

return ResponseUtil.success(posts, SUCCESS_MESSAGES.POST.CREATED);

// Or for errors
throw new NotFoundException(ERROR_MESSAGES.POST.NOT_FOUND);
```

---

## 📝 Practical Migration Examples

### Example 1: Migrating `auth.service.ts`

**Current Code (Lines 86-88)**:
```typescript
const otp = OtpHelper.generateOtp();
console.log(otp, '------otp------'); // SECURITY ISSUE!
const otpHash = OtpHelper.encodeOtp(otp);
```

**Migrated Code**:
```typescript
import { CryptoUtil, Logger, DateUtil } from '@/common/utils';
import { TIME, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/common/constants';
import { OtpType } from '@/common/enums';

// Generate OTP
const otp = CryptoUtil.generateOTP(6);

// Log safely (without exposing OTP)
Logger.info('OTP generated for email verification', {
  email: StringUtil.maskEmail(email),
  expiresIn: `${TIME.OTP_EXPIRY_MINUTES} minutes`,
});

// Encrypt OTP (keep existing encode method for now)
const otpHash = OtpHelper.encodeOtp(otp);

// Calculate expiry
const otpExpiry = DateUtil.getOtpExpiryDate();

await this.userOtpRepository.createOtp(
  user.id,
  otpHash,
  OtpType.EMAIL_VERIFICATION,
);
```

---

### Example 2: Migrating `post.service.ts` File Upload

**Current Code**:
```typescript
async uploadPostMedia(userId: string, file: any): Promise<string> {
  return await this.s3Service.uploadFile(file, 'posts', userId);
}
```

**Migrated Code**:
```typescript
import { FileValidatorUtil, Logger } from '@/common/utils';
import { FileUploadFolder } from '@/common/enums';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/common/constants';

async uploadPostMedia(userId: string, file: Express.Multer.File): Promise<string> {
  try {
    // Validate file first
    FileValidatorUtil.validatePostMedia(file);

    Logger.info('Uploading post media', {
      userId,
      fileSize: FileValidatorUtil.formatFileSize(file.size),
      mimeType: file.mimetype,
    });

    const imageUrl = await this.s3Service.uploadFile(
      file,
      FileUploadFolder.POSTS,
      userId,
    );

    Logger.info('Post media uploaded successfully', {
      userId,
      imageUrl,
    });

    return imageUrl;
  } catch (error) {
    Logger.error('Failed to upload post media', {
      userId,
      error: error.message,
    });
    throw new BadRequestException(ERROR_MESSAGES.FILE.UPLOAD_FAILED);
  }
}
```

---

### Example 3: Migrating Pagination in `post.controller.ts`

**Current Code**:
```typescript
async getDashboardPosts(
  @Request() req,
  @Query() query: DashboardPostsDto,
) {
  const result = await this.postService.getDashboardPostsWithUserLikes(
    req.user.id,
    query.cursor,
    query.limit || 20,
    query.location,
    query.search,
  );

  return {
    statusCode: 200,
    message: 'Dashboard posts retrieved successfully',
    data: result,
  };
}
```

**Migrated Code**:
```typescript
import { PaginationUtil, ResponseUtil } from '@/common/utils';
import { SUCCESS_MESSAGES } from '@/common/constants';

async getDashboardPosts(
  @Request() req,
  @Query() query: DashboardPostsDto,
) {
  const { cursor, limit } = PaginationUtil.extractCursorPaginationParams(query);

  const result = await this.postService.getDashboardPostsWithUserLikes(
    req.user.id,
    cursor,
    limit,
    query.location,
    query.search,
  );

  return ResponseUtil.success(result, SUCCESS_MESSAGES.POST.CREATED);
}
```

---

## ✅ Testing Your Migration

### Step 1: Test Logger
```bash
# Start your backend
npm run start:dev

# Check that logs are being written to files
ls -la logs/
cat logs/combined-2025-11-27.log
cat logs/error-2025-11-27.log
```

### Step 2: Test File Validation
```bash
# Use Postman or curl to upload an image
# Should see validation working

# Try uploading an invalid file type - should get proper error message
```

### Step 3: Test Enums & Constants
```bash
# Run TypeScript compilation
npm run build

# Should compile without errors
```

---

## 🎯 Migration Checklist

### Phase 1: Foundation (Week 1)
- [ ] Replace console.log with Logger in auth.service.ts
- [ ] Replace console.log with Logger in chat.gateway.ts
- [ ] Add file validation to s3.service.ts
- [ ] Use CryptoUtil for password hashing in auth.service.ts
- [ ] Use DateUtil for OTP expiry calculation

### Phase 2: Constants & Enums (Week 2)
- [ ] Replace hardcoded error messages with ERROR_MESSAGES constants
- [ ] Replace hardcoded success messages with SUCCESS_MESSAGES constants
- [ ] Import and use OtpType enum in entities and services
- [ ] Import and use PostMediaType enum
- [ ] Import and use JourneyPlaceType enum

### Phase 3: Utilities (Week 3)
- [ ] Use PaginationUtil in all controllers
- [ ] Use ResponseUtil for consistent API responses
- [ ] Use StringUtil for text operations
- [ ] Use FileValidatorUtil for all file uploads

### Phase 4: Clean Up (Week 4)
- [ ] Remove all console.log statements
- [ ] Remove old enum definitions (after importing from @/common/enums)
- [ ] Remove magic numbers and strings
- [ ] Update documentation

---

## 🔄 Rollback Strategy

If something breaks:

1. **Logger Issues**: Comment out Logger calls, keep console.log temporarily
2. **File Validation Issues**: Wrap in try-catch, fall back to old validation
3. **Enum Issues**: Keep old enum definitions alongside new imports temporarily

**Example Safe Migration**:
```typescript
// Keep both during migration
import { OtpType as OtpTypeNew } from '@/common/enums';

export enum OtpType { // OLD - will remove later
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

// Test with new enum
const otpType = OtpTypeNew.EMAIL_VERIFICATION;

// Once tested and working, remove old enum
```

---

## 📚 Reference

### Importing Everything
```typescript
// Import all enums
import {
  UserStatus,
  UserRole,
  PostMediaType,
  JourneyPlaceType,
  OtpType
} from '@/common/enums';

// Import all constants
import {
  FILE_UPLOAD,
  PAGINATION,
  TIME,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '@/common/constants';

// Import all utils
import {
  DateUtil,
  StringUtil,
  CryptoUtil,
  PaginationUtil,
  ResponseUtil,
  Logger,
  FileValidatorUtil
} from '@/common/utils';
```

---

## 🆘 Need Help?

1. Check `REFACTORING_PLAN.md` for the complete plan
2. Check individual utility files for detailed documentation
3. Look at the examples in this guide
4. All changes are **additive only** - your existing code still works!

---

**Remember**: Migrate gradually, test frequently, and keep your existing code working!
