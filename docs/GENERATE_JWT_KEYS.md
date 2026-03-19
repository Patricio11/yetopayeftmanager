# 🔑 Generate JWT Keys for EFT Service

## ⚠️ **Error You're Seeing:**
```
{"success":false,"message":"EFT Service authentication not configured"}
```

This means the JWT private key is missing from your environment variables.

---

## 🚀 **Quick Fix - Generate Keys**

### **Option 1: Generate Keys (Recommended)**

Run these commands in PowerShell:

```powershell
# Navigate to your project
cd "c:\Users\patri\Downloads\PayLink Pro\project\fyropay"

# Generate private key
openssl genrsa -out eft-jwt-private.pem 2048

# Generate public key
openssl rsa -in eft-jwt-private.pem -pubout -out eft-jwt-public.pem

# Display private key (copy this)
Get-Content eft-jwt-private.pem
```

### **Option 2: Use Node.js to Generate**

If you don't have OpenSSL, create this file:

**File:** `generate-keys.js`
```javascript
const crypto = require('crypto');
const fs = require('fs');

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Save keys
fs.writeFileSync('eft-jwt-private.pem', privateKey);
fs.writeFileSync('eft-jwt-public.pem', publicKey);

console.log('✅ Keys generated successfully!');
console.log('\n📋 Copy this to your .env.local:\n');
console.log('EFT_JWT_PRIVATE_KEY="' + privateKey.replace(/\n/g, '\\n') + '"');
```

Run it:
```bash
node generate-keys.js
```

---

## 📝 **Add to .env.local**

### **Method 1: Use File Path (Development)**

Add to `.env.local`:
```env
EFT_JWT_PRIVATE_KEY_PATH=./eft-jwt-private.pem
NEXT_PUBLIC_EFT_SERVICE_URL=http://localhost:8080/v1/eft
```

### **Method 2: Use Environment Variable (Production)**

Add to `.env.local`:
```env
EFT_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
NEXT_PUBLIC_EFT_SERVICE_URL=http://localhost:8080/v1/eft
```

**⚠️ Important:** 
- Replace `\n` with actual newlines when copying
- Or use the file path method for development

---

## 🔒 **Security Notes**

1. **Never commit private keys to Git!**
   ```bash
   # Add to .gitignore
   echo "*.pem" >> .gitignore
   echo ".env.local" >> .gitignore
   ```

2. **For Production:**
   - Use environment variables
   - Store in secure vault (AWS Secrets Manager, etc.)
   - Rotate keys periodically

3. **Public Key:**
   - Share with EFT Service
   - They use it to verify JWT signatures

---

## ✅ **After Adding Keys**

1. **Restart dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Test payment link:**
   - Create new payment link
   - Open in browser
   - Should see bank selection screen

3. **Verify in console:**
   - Should see: `✅ JWT generated for public payment: {id}`
   - No more "authentication not configured" error

---

## 🧪 **Quick Test**

```bash
# 1. Generate keys
node generate-keys.js

# 2. Add to .env.local
# EFT_JWT_PRIVATE_KEY_PATH=./eft-jwt-private.pem

# 3. Restart server
npm run dev

# 4. Test payment link
# Should work now! ✅
```

---

## 📋 **Complete .env.local Example**

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_xxx@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=your_secret_here
BETTER_AUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Payment Tokens
PAYMENT_TOKEN_SECRET=your_token_secret

# EFT Service JWT (ADD THESE)
EFT_JWT_PRIVATE_KEY_PATH=./eft-jwt-private.pem
NEXT_PUBLIC_EFT_SERVICE_URL=http://localhost:8080/v1/eft
```

---

## 🎯 **That's It!**

Once you add the JWT keys, the payment flow will work perfectly! 🚀
