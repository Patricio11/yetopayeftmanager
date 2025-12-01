# Merchant User Setup Guide

Complete guide to creating and managing merchant users in the YetoPay EFT system.

## Table of Contents
- [System Overview](#system-overview)
- [Quick Start](#quick-start)
- [Method 1: Web Registration](#method-1-web-registration-recommended)
- [Method 2: Script Setup](#method-2-script-setup)
- [Login & Access](#login--access)
- [Troubleshooting](#troubleshooting)

---

## System Overview

### Authentication System
- **Framework**: Better Auth (modern authentication library)
- **Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM
- **Password Hashing**: Argon2 (via Better Auth)
- **Session Management**: JWT tokens with 15-minute expiry

### User Roles
- **merchant**: Standard merchant user (default)
- **admin**: Administrator with full access

### User Schema
```typescript
{
  id: string (UUID)
  name: string
  email: string (unique)
  emailVerified: boolean
  fullName: string
  phone: string
  role: 'merchant' | 'admin'
  companyName: string
  kycStatus: 'pending' | 'approved' | 'rejected'
  isActive: boolean
  // ... additional fields
}
```

---

## Quick Start

### Prerequisites
1. Database is running and connected
2. Environment variables are set in `.env.local`
3. Development server is running: `npm run dev`

---

## Method 1: Web Registration (Recommended)

### Step 1: Access Registration Page
Navigate to: **http://localhost:3000/auth/register**

### Step 2: Fill Registration Form
```
Full Name: Test Merchant
Email: merchant@yetopay.com
Phone: +27 12 345 6789
Company Name: YetoPay Test Company (Pty) Ltd
Password: Merchant123!
Confirm Password: Merchant123!
☑ I agree to the Terms and Conditions
```

### Step 3: Submit
Click **"Create Account"** button

### Step 4: Auto-Login
- User is automatically logged in after registration
- Redirected to dashboard: `/dashboard`
- Session is created with 15-minute expiry

### Step 5: Verify User (Optional)
Run the update script to set role and verify email:
```bash
npm run create:merchant
```

This will:
- ✅ Set role to 'merchant'
- ✅ Verify email address
- ✅ Approve KYC status
- ✅ Activate account

---

## Method 2: Script Setup

### Step 1: Register via Web First
You must register via the web interface first (see Method 1, Steps 1-4)

### Step 2: Run Update Script
```bash
npm run create:merchant
```

### What the Script Does
1. Checks if user exists with email: `merchant@yetopay.com`
2. If exists: Updates user with:
   - Role: `merchant`
   - Email Verified: `true`
   - KYC Status: `approved`
   - Active: `true`
   - Phone and Company details
3. If not exists: Shows registration instructions

### Script Output
```
🚀 Creating merchant user via Better Auth API...

📋 Merchant Details:
   Name: Test Merchant
   Email: merchant@yetopay.com
   Password: Merchant123!
   Phone: +27 12 345 6789
   Company: YetoPay Test Company (Pty) Ltd
   Role: merchant

✅ User updated successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 USER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 User ID: abc123-def456-...
👤 Name: Test Merchant
📧 Email: merchant@yetopay.com
📱 Phone: +27 12 345 6789
🏢 Company: YetoPay Test Company (Pty) Ltd
🎭 Role: merchant
✅ Email Verified: true
📊 KYC Status: approved
🔓 Active: true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: merchant@yetopay.com
Password: Merchant123!

🌐 Login URL: http://localhost:3000/auth/login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Done!
```

---

## Login & Access

### Login Credentials
```
Email: merchant@yetopay.com
Password: Merchant123!
```

### Login Process
1. Navigate to: **http://localhost:3000/auth/login**
2. Enter email and password
3. Click **"Sign In"**
4. Redirected to: `/dashboard`

### Session Details
- **Duration**: 15 minutes
- **Auto-refresh**: Every 5 minutes (if active)
- **Storage**: HTTP-only cookies
- **Security**: CSRF protection enabled

### Accessing Protected Routes
```typescript
// Server Component
import { requireAuth } from '@/lib/auth-server';

export default async function DashboardPage() {
  const session = await requireAuth();
  // User is authenticated
  return <Dashboard user={session.user} />;
}

// Client Component
'use client';
import { useSession } from '@/lib/auth-client';

export default function ProfilePage() {
  const { data: session } = useSession();
  // session.user contains user data
}
```

---

## Troubleshooting

### Issue: "User already exists"
**Solution**: User was already registered. Run the update script:
```bash
npm run create:merchant
```

### Issue: "Database connection failed"
**Solution**: Check `.env.local` file:
```bash
DATABASE_URL=postgresql://...
```

Test connection:
```bash
npm run db:test
```

### Issue: "Cannot login"
**Possible Causes**:
1. Wrong password
2. Email not verified
3. Account not active
4. Session expired

**Solution**: Run update script to verify and activate:
```bash
npm run create:merchant
```

### Issue: "Registration failed"
**Check**:
1. Email format is valid
2. Password meets requirements:
   - Minimum 8 characters
   - Contains uppercase letter
   - Contains lowercase letter
   - Contains number
3. All required fields filled
4. Terms checkbox checked

### Issue: "Redirected to /unauthorized"
**Cause**: User doesn't have required role

**Solution**: Update user role in database:
```sql
UPDATE "user" SET role = 'merchant' WHERE email = 'merchant@yetopay.com';
```

Or run the update script:
```bash
npm run create:merchant
```

---

## Database Queries

### Check User Exists
```sql
SELECT id, name, email, role, "emailVerified", "isActive", "kycStatus"
FROM "user"
WHERE email = 'merchant@yetopay.com';
```

### Update User Role
```sql
UPDATE "user"
SET role = 'merchant', "emailVerified" = true, "kycStatus" = 'approved'
WHERE email = 'merchant@yetopay.com';
```

### Check User Sessions
```sql
SELECT s.id, s.token, s."expiresAt", s."userId", u.email
FROM "session" s
JOIN "user" u ON s."userId" = u.id
WHERE u.email = 'merchant@yetopay.com';
```

### Check User Accounts (Password)
```sql
SELECT a.id, a."providerId", a."userId", u.email
FROM "account" a
JOIN "user" u ON a."userId" = u.id
WHERE u.email = 'merchant@yetopay.com';
```

---

## API Endpoints

### Better Auth Endpoints
All authentication handled by Better Auth at: `/api/auth/*`

**Key Endpoints**:
- `POST /api/auth/sign-up/email` - Register new user
- `POST /api/auth/sign-in/email` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session

### Custom Endpoints
- `GET /api/admin/users` - List all users (admin only)
- `GET /api/admin/tokens` - List saved tokens (admin only)

---

## Security Notes

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Stored as Argon2 hash

### Session Security
- HTTP-only cookies
- Secure flag in production
- CSRF protection
- 15-minute expiry
- Auto-refresh every 5 minutes

### Email Verification
- Disabled in development (`requireEmailVerification: false`)
- Should be enabled in production

---

## Next Steps

After creating merchant user:

1. **Test Login**: Verify you can login at `/auth/login`
2. **Access Dashboard**: Check dashboard loads at `/dashboard`
3. **Create Payment Link**: Test creating a payment link
4. **Test Payment Flow**: Complete a test payment
5. **Check Tokenization**: Save credentials and test auto-fill

---

## Support

For issues or questions:
1. Check this guide
2. Review error logs in console
3. Check database connection
4. Verify environment variables
5. Run database tests: `npm run db:test`

---

**Last Updated**: December 2024
**Version**: 1.0.0
