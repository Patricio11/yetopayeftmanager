# 🔧 Fix EFT Service CORS Error

## 🚨 **Error:**
```
Access-Control-Allow-Origin header contains the invalid value 'true'
```

---

## 📍 **Problem Location:**

The EFT Service (running on `http://localhost:8080`) has incorrect CORS configuration.

**Current (WRONG):**
```javascript
res.setHeader('Access-Control-Allow-Origin', 'true');  // ❌ INVALID
```

**Should be:**
```javascript
res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');  // ✅ CORRECT
```

---

## 🔧 **How to Fix:**

### **Option 1: Update EFT Service Configuration**

Find the EFT service configuration file and update CORS settings:

```javascript
// Look for something like this in the EFT service code:
app.use(cors({
  origin: 'true',  // ❌ WRONG - this is the problem!
  credentials: true
}));

// Change to:
app.use(cors({
  origin: 'http://localhost:3000',  // ✅ CORRECT
  credentials: true
}));

// OR for multiple origins:
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// OR allow all origins (development only):
app.use(cors({
  origin: true,  // ✅ Boolean true (not string 'true')
  credentials: true
}));
```

---

## 📝 **Common EFT Service Files to Check:**

Look for CORS configuration in these files:

1. **Main server file:**
   - `server.js`
   - `index.js`
   - `app.js`

2. **Configuration files:**
   - `config/cors.js`
   - `config/server.js`
   - `.env` (might have CORS_ORIGIN setting)

3. **Middleware files:**
   - `middleware/cors.js`
   - `middleware/security.js`

---

## 🔍 **Search for the Issue:**

Run this in the EFT service directory:

```bash
# Search for CORS configuration
grep -r "Access-Control-Allow-Origin" .
grep -r "cors" . --include="*.js"

# Or in PowerShell:
Select-String -Path "*.js" -Pattern "cors" -Recurse
```

---

## ✅ **Correct CORS Configuration Examples:**

### **Express.js with CORS package:**
```javascript
const cors = require('cors');

// Development - Allow specific origin
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### **Express.js Manual CORS:**
```javascript
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

### **Production - Environment Variable:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));
```

---

## 🎯 **Quick Fix (Development Only):**

If you just want to test quickly, use this in the EFT service:

```javascript
const cors = require('cors');

// Allow all origins (DEVELOPMENT ONLY!)
app.use(cors({
  origin: true,  // Boolean true, not string 'true'
  credentials: true
}));
```

**⚠️ Warning:** Don't use `origin: true` in production!

---

## 📋 **After Fixing:**

1. **Restart EFT Service:**
   ```bash
   # Stop the EFT service
   # Then start it again
   ```

2. **Test Payment Flow:**
   - Open payment link
   - Select bank
   - Should connect without CORS error ✅

3. **Verify in Browser Console:**
   ```
   ✅ No CORS errors
   ✅ Request to http://localhost:8080/v1/eft/fnb/init succeeds
   ```

---

## 🔒 **Production CORS Settings:**

For production, use specific origins:

```javascript
const allowedOrigins = [
  'https://manager.fyropay.com',
  'https://pay.fyropay.com',
  'https://fyropay.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS not allowed'), false);
    }
    
    return callback(null, true);
  },
  credentials: true
}));
```

---

## 🐛 **Still Not Working?**

### **Check EFT Service Logs:**
Look for CORS-related errors or warnings when the service starts.

### **Verify EFT Service is Running:**
```bash
curl http://localhost:8080/health
# or
curl http://localhost:8080/v1/eft/status
```

### **Check Network Tab:**
1. Open DevTools → Network
2. Select the failed request
3. Check Response Headers
4. Look for `Access-Control-Allow-Origin`

---

## 📞 **Contact EFT Service Provider:**

If you don't have access to the EFT service code, contact the provider and ask them to:

1. **Update CORS configuration** to allow `http://localhost:3000`
2. **For production:** Add your production domain to allowed origins
3. **Verify** the `Access-Control-Allow-Origin` header is set correctly

---

## ✅ **Expected Result:**

After fixing, the response headers should include:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Then your payment flow will work!** 🚀
