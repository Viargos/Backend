# Resend OTP Endpoint - Implementation

## Overview
Added the missing `/api/auth/resend-otp` endpoint to handle OTP resending for email verification and password reset.

## Endpoint Details

**Route:** `POST /api/auth/resend-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email"
}
```

## Implementation

### 1. Created DTO
**File:** `viargos-be/src/modules/auth/dto/resend-otp.dto.ts`
- Validates email format
- Required field validation

### 2. Added Service Method
**File:** `viargos-be/src/modules/auth/auth.service.ts`
- `resendOtp(resendOtpDto: ResendOtpDto)` method
- Determines OTP type based on user status:
  - `EMAIL_VERIFICATION` if user is not active (unverified)
  - `PASSWORD_RESET` if user is active
- Generates new OTP
- Invalidates old OTPs of the same type
- Sends OTP email
- Returns appropriate success message

### 3. Added Controller Route
**File:** `viargos-be/src/modules/auth/auth.controller.ts`
- `@Post('resend-otp')` endpoint
- Public endpoint (no auth required)
- Swagger documentation

## How It Works

1. User requests OTP resend with email
2. Backend finds user by email
3. Determines OTP type (email verification or password reset)
4. Generates new 6-digit OTP
5. Invalidates any existing OTPs of the same type
6. Stores new OTP in database
7. Sends OTP to user's email
8. Returns success message

## Usage

### For Email Verification (Unverified Users)
```typescript
POST /api/auth/resend-otp
{
  "email": "user@example.com"
}
```

### For Password Reset (Verified Users)
```typescript
POST /api/auth/resend-otp
{
  "email": "user@example.com"
}
```

The system automatically determines the OTP type based on user's `isActive` status.

## Files Created/Modified

1. **Created:** `viargos-be/src/modules/auth/dto/resend-otp.dto.ts`
2. **Modified:** `viargos-be/src/modules/auth/auth.service.ts` - Added `resendOtp` method
3. **Modified:** `viargos-be/src/modules/auth/auth.controller.ts` - Added `resendOtp` endpoint

## Important Notes

⚠️ **Server Restart Required:** After adding this endpoint, the backend server must be restarted for the route to be registered.

## Testing

1. Start backend server
2. Test endpoint:
```bash
curl -X POST http://localhost:3000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

3. Should return:
```json
{
  "message": "OTP sent to your email"
}
```

4. Check user's email for OTP









