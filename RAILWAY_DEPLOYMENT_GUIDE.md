# Railway Deployment Guide - Email Configuration

## 🎯 Solution Overview

Your app now supports **two email sending methods**:
1. **Resend API** (HTTP-based) - ⭐ **Recommended for Railway**
2. **Gmail SMTP** (Traditional) - Fallback option

The app automatically chooses Resend API if `RESEND_API_KEY` is configured, otherwise falls back to SMTP.

---

## ✅ Option 1: Use Resend API (Recommended)

### Why Resend?
- ✅ Uses HTTP API (no SMTP port blocking issues)
- ✅ Faster and more reliable on cloud platforms
- ✅ Better deliverability
- ✅ Free tier: 100 emails/day, 3,000/month

### Setup Steps:

1. **Get Resend API Key:**
   - Go to https://resend.com/signup
   - Verify your email
   - Get your API key (starts with `re_`)

2. **Configure Railway Environment Variables:**

```bash
# Required for Resend API
RESEND_API_KEY=re_YourActualResendApiKey

# Keep these for fallback SMTP (optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=viargo001@gmail.com
MAIL_PASS=jyuq mnfo xaar fnll
EMAIL_USER=viargo001@gmail.com
MAIL_FROM=viargo001@gmail.com

# Other required variables
OTP_ENCRYPTION_KEY=your-secure-secret-key
JWT_SECRET=your-jwt-secret
# ... other variables ...
```

3. **Important: Resend Domain Configuration**

For **testing** (free tier):
- You can only send TO your verified email: `viargo001@gmail.com`
- This is fine for development/testing

For **production** (sending to any email):
- Add and verify a domain: https://resend.com/domains
- Update `EMAIL_USER` or `MAIL_FROM` to use your domain:
  ```bash
  EMAIL_USER=noreply@yourdomain.com
  MAIL_FROM=noreply@yourdomain.com
  ```

4. **Deploy:**
```bash
git add .
git commit -m "feat: add Resend API support for reliable email delivery"
git push origin sandbox
```

---

## 🔄 Option 2: Use Gmail SMTP (Fallback)

If you want to stick with Gmail SMTP (less reliable on Railway):

### Configure Railway Environment Variables:

```bash
# Gmail SMTP Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=viargo001@gmail.com
MAIL_PASS=jyuq mnfo xaar fnll
EMAIL_USER=viargo001@gmail.com
MAIL_FROM=viargo001@gmail.com

# DO NOT set RESEND_API_KEY (or leave it empty)
# This will force the app to use SMTP

# Other required variables
OTP_ENCRYPTION_KEY=your-secure-secret-key
JWT_SECRET=your-jwt-secret
```

### Troubleshooting SMTP on Railway:

If still getting timeouts:

1. **Try Port 587:**
   ```bash
   MAIL_PORT=587
   MAIL_SECURE=false
   ```

2. **Generate New Gmail App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Create new app password
   - Update `MAIL_PASS` in Railway

3. **Check Railway Network:**
   - Some Railway regions may have SMTP restrictions
   - Try switching to Resend API instead

---

## 🚀 Deployment Checklist

- [ ] Choose Resend API or Gmail SMTP
- [ ] Configure environment variables in Railway
- [ ] Commit and push code changes
- [ ] Wait for Railway auto-deploy
- [ ] Test signup with your email
- [ ] Check Railway logs for errors

---

## 📊 How It Works

```typescript
// The EmailService automatically detects which method to use:

if (RESEND_API_KEY is set and starts with 're_') {
  → Use Resend API (HTTP)
} else {
  → Use Gmail SMTP (traditional)
}
```

---

## 🔍 Testing

1. **Check Railway Logs:**
```bash
railway logs
```

Look for:
- `"Using Resend API for email sending"` ✅
- OR `"Using SMTP for email sending"` ⚠️

2. **Test Signup:**
- Use your verified email for testing
- Check if OTP arrives within 5-10 seconds

3. **Monitor Errors:**
```bash
railway logs --filter error
```

---

## 💡 Recommendations

| Environment | Recommendation |
|------------|----------------|
| Development (Local) | Gmail SMTP ✅ |
| Sandbox (Railway) | **Resend API** ⭐ |
| Production (Railway) | **Resend API** ⭐ |

---

## 🆘 Still Having Issues?

1. Check Railway environment variables are saved
2. Restart Railway deployment manually
3. Check Resend dashboard for API quota
4. Verify Gmail app password hasn't expired
5. Check Railway logs for detailed error messages

---

## 📝 Environment Variables Summary

### Minimum Required (Resend):
```bash
RESEND_API_KEY=re_...
EMAIL_USER=viargo001@gmail.com
OTP_ENCRYPTION_KEY=...
```

### Minimum Required (SMTP):
```bash
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=viargo001@gmail.com
MAIL_PASS=...
EMAIL_USER=viargo001@gmail.com
OTP_ENCRYPTION_KEY=...
```

