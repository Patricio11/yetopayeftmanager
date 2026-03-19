# 🚀 YETOPAYEFT - Setup Instructions

## ⚠️ **IMPORTANT: User Registration Required**

The seed script creates user records in the database, but **Better Auth requires users to sign up** to create authentication accounts with hashed passwords.

---

## 📋 **Step-by-Step Setup**

### **1. Run Database Seed**
```bash
npm run db:seed
```

This creates:
- ✅ User records (admin + 2 merchants)
- ✅ Bank accounts
- ✅ EFT banks
- ✅ Service enablement

### **2. Register Users via UI**

You **MUST** register each user through the sign-up page to create Better Auth accounts.

#### **Register Admin:**
```
1. Go to: http://localhost:3000/auth/register
2. Fill in:
   - Full Name: Admin User
   - Email: admin@fyropay.com
   - Phone: +27123456789
   - Company: YETOPAYEFT Admin
   - Password: Admin@123456
   - Confirm Password: Admin@123456
   - ✅ Agree to terms
3. Click "Create Account"
4. ✅ Auto-login and redirect to dashboard
```

#### **Register Merchant 1:**
```
1. Sign out (if logged in as admin)
2. Go to: http://localhost:3000/auth/register
3. Fill in:
   - Full Name: John Merchant
   - Email: merchant@fyropay.com
   - Phone: +27123456790
   - Company: Acme Corporation
   - Password: Merchant@123
   - Confirm Password: Merchant@123
   - ✅ Agree to terms
4. Click "Create Account"
```

#### **Register Merchant 2:**
```
1. Sign out
2. Go to: http://localhost:3000/auth/register
3. Fill in:
   - Full Name: Sarah Johnson
   - Email: sarah@techstore.com
   - Phone: +27123456791
   - Company: Tech Store SA
   - Password: Sarah@123456
   - Confirm Password: Sarah@123456
   - ✅ Agree to terms
4. Click "Create Account"
```

---

## 🔐 **Why This Is Needed**

Better Auth uses a two-table system:
1. **`user` table** - User profile data (created by seed)
2. **`account` table** - Authentication credentials (created by sign-up)

The `account` table stores:
- Hashed passwords (bcrypt)
- Provider info (email/password)
- Account ID
- User ID reference

**The seed script cannot create hashed passwords securely**, so users must register through the UI.

---

## ✅ **After Registration**

Once registered, the user will have:
- ✅ User record (from seed)
- ✅ Account record (from registration)
- ✅ Bank account (from seed)
- ✅ Services enabled (from seed)
- ✅ Proper role assigned

**Then you can login normally!**

---

## 🎯 **Login Credentials (After Registration)**

### **Admin:**
```
Email: admin@fyropay.com
Password: Admin@123456
```

### **Merchant 1:**
```
Email: merchant@fyropay.com
Password: Merchant@123
```

### **Merchant 2:**
```
Email: sarah@techstore.com
Password: Sarah@123456
```

---

## 🔧 **Alternative: Manual Account Creation**

If you want to avoid the UI registration, you can manually insert accounts:

```sql
-- Admin account (password: Admin@123456)
INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@fyropay.com',
  'credential',
  'admin-001',
  '$2b$10$YourHashedPasswordHere', -- Use bcrypt to hash
  NOW(),
  NOW()
);
```

**But it's easier to just register via UI!** 😊

---

## 📝 **Summary**

1. ✅ Run `npm run db:seed`
2. ✅ Register admin via `/auth/register`
3. ✅ Register merchants via `/auth/register`
4. ✅ Login with credentials
5. ✅ Start using the system!

---

## 🐛 **Troubleshooting**

### **Error: "Credential account not found"**
- **Cause:** User exists but no account record
- **Fix:** Register the user via `/auth/register`

### **Error: "Email already exists"**
- **Cause:** User already registered
- **Fix:** Just login with the password you used

### **Error: "Invalid credentials"**
- **Cause:** Wrong password
- **Fix:** Use the correct password or reset it

---

**Status:** ✅ **Ready to register users!**
