# Credential Rotation Guide

**IMPORTANT**: Your credentials were exposed in the codebase. Follow this guide to rotate them securely.

## 🔴 CRITICAL: Exposed Credentials

The following credentials were found in `.env` and need to be rotated IMMEDIATELY:

1. **Database Password**: `npg_u9Zy3taNKkYP`
2. **AWS Access Key**: `AKIASWCZD5DTLZYANMAL`
3. **AWS Secret Key**: `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`
4. **Gmail App Password**: `jyuq mnfo xaar fnll`
5. **JWT Secret**: `viargos1234567890010` (weak)
6. **OTP Encryption Key**: `viargos@savan` (weak)

---

## Step-by-Step Rotation Process

### 1. Generate New JWT Secret

```bash
# Run this in your terminal to generate a strong 512-bit secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and update `JWT_SECRET` in your `.env` file.

**Note**: This will invalidate all existing user sessions. Users will need to log in again.

---

### 2. Generate New OTP Encryption Key

```bash
# Generate a 256-bit encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update `OTP_ENCRYPTION_KEY` in your `.env` file.

**Note**: Existing OTPs will be invalidated. This is acceptable as OTPs are short-lived.

---

### 3. Rotate AWS Credentials

#### Steps:
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Users** → Select your user
3. Go to **Security Credentials** tab
4. Click **Create access key**
5. Copy the new **Access Key ID** and **Secret Access Key**
6. Update your `.env` file:
   ```
   AWS_ACCESS_KEY_ID=new-access-key-id
   AWS_SECRET_ACCESS_KEY=new-secret-access-key
   ```
7. **IMPORTANT**: After confirming the new keys work, **DELETE** the old access key:
   - Click **Actions** → **Delete** on the old key (`AKIASWCZD5DTLZYANMAL`)

#### Test the New Keys:
```bash
# After updating .env, restart your backend and test file upload
npm run start:dev
# Try uploading a profile image or post image
```

---

### 4. Rotate Database Password (Neon)

#### Steps:
1. Go to [Neon Console](https://console.neon.tech/)
2. Select your project
3. Navigate to **Settings** → **Security**
4. Click **Reset password**
5. Copy the new password
6. Update your `.env` file:
   ```
   DB_PWD=new-password
   DATABASE_URL=postgresql://neondb_owner:new-password@ep-damp-sky-aerflkll-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### Test Database Connection:
```bash
# Restart backend
npm run start:dev
# Check logs for successful database connection
```

---

### 5. Rotate Gmail App Password

#### Steps:
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Navigate to **App passwords**
3. **Delete** the old app password
4. Click **Create new app password**
5. Select **Mail** and **Other (Custom name)** → Enter "Viargos Backend"
6. Copy the generated 16-character password
7. Update your `.env` file:
   ```
   MAIL_PASS=xxxx xxxx xxxx xxxx
   ```

#### Test Email Sending:
```bash
# After restarting backend, test signup flow
# Check if OTP email is sent successfully
```

---

## Verification Checklist

After rotating all credentials:

- [ ] New JWT secret is at least 64 characters (512 bits)
- [ ] New OTP encryption key is at least 32 characters (256 bits)
- [ ] Old AWS access key has been deleted from AWS Console
- [ ] New AWS credentials work (test file upload)
- [ ] Database connection works with new password
- [ ] Email sending works with new Gmail app password
- [ ] All existing user sessions are invalidated (users need to re-login)
- [ ] `.env` file is NOT committed to Git
- [ ] `.env` is listed in `.gitignore`

---

## Post-Rotation Steps

### 1. Update `.gitignore`
Ensure `.env` is in `.gitignore`:
```
# Environment files
.env
.env.local
.env.development
.env.production
.env.test
```

### 2. Remove `.env` from Git History (If Committed)

**⚠️ WARNING**: If you previously committed `.env` to Git, you need to remove it from history:

```bash
# Install BFG Repo-Cleaner (if not installed)
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env from all commits
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push origin --force --all
```

**Note**: If this is a shared repository, coordinate with your team before force pushing.

### 3. Notify Team Members

If working in a team:
- Inform all developers that credentials have been rotated
- Ensure everyone pulls latest `.env.example`
- Each developer should create their own `.env` with new credentials
- Consider using a secrets manager for team environments

---

## Best Practices Going Forward

### 1. Use Environment-Specific Files

Create separate env files for different environments:
- `.env.development` - Local development
- `.env.staging` - Staging server
- `.env.production` - Production server (NEVER commit)

### 2. Use Secrets Manager in Production

For production, use a proper secrets manager:
- **AWS Secrets Manager**
- **AWS Systems Manager Parameter Store**
- **HashiCorp Vault**
- **Azure Key Vault**

### 3. Implement Secrets Rotation Policy

- Rotate JWT secrets every 90 days
- Rotate database passwords every 90 days
- Rotate API keys every 180 days
- Monitor AWS CloudTrail for unauthorized access

### 4. Add Pre-commit Hooks

Install git-secrets or similar tools to prevent credential commits:

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run check-secrets"
```

---

## Emergency Contact

If credentials are leaked in production:
1. Immediately rotate ALL credentials
2. Check CloudWatch/logs for unauthorized access
3. Notify security team
4. Monitor for suspicious activity
5. Consider invalidating all user sessions

---

## Timeline

- **Immediate (Today)**: Rotate JWT secret, OTP key, AWS keys
- **Within 24 hours**: Rotate database password, Gmail password
- **Within 48 hours**: Verify all systems working, remove from Git history
- **Within 1 week**: Implement secrets manager for production

---

**Last Updated**: 2025-11-27
**Status**: 🔴 URGENT - Credentials Exposed
