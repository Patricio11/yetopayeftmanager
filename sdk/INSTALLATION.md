# 🚀 YETOPAYEFT SDK - Installation & Setup Guide

**Quick guide to build, test, and publish the SDK**

---

## 📦 Prerequisites

- Node.js 16+ 
- npm or yarn
- TypeScript knowledge (optional but helpful)

---

## 🔧 Initial Setup

### **Step 1: Install Dependencies**

```bash
cd sdk
npm install
```

This installs:
- `axios` - HTTP client
- `typescript` - TypeScript compiler
- `tsup` - Build tool
- Type definitions

---

## 🏗️ Build the SDK

### **Development Build**

```bash
npm run build
```

This creates:
- `dist/index.js` - CommonJS bundle
- `dist/index.mjs` - ES Module bundle  
- `dist/index.d.ts` - TypeScript definitions

### **Watch Mode** (for development)

```bash
npm run build -- --watch
```

Automatically rebuilds on file changes.

---

## 🧪 Testing Locally

### **Option 1: npm link** (Recommended for development)

```bash
# In SDK directory
cd sdk
npm link

# In your test project
cd ../your-test-project
npm link @yetopayeft/sdk
```

Now you can import and use the SDK:
```typescript
import { YetoPayEFTClient } from '@yetopayeft/sdk';
```

### **Option 2: Direct Path** (Quick testing)

```typescript
// In your test file
import { YetoPayEFTClient } from '../sdk/dist/index.js';
```

### **Option 3: Local npm install**

```bash
# In your test project
npm install ../path/to/sdk
```

---

## 📝 Quick Test

Create `test.ts`:

```typescript
import { YetoPayEFTClient } from '@yetopayeft/sdk';

const client = new YetoPayEFTClient({
  apiKey: 'your-test-api-key',
  debug: true,
});

async function test() {
  try {
    // Test connection
    const isConnected = await client.testConnection();
    console.log('Connected:', isConnected);
    
    // Create payment
    const payment = await client.createPaymentToken({
      amount: 100,
      reference: 'TEST-' + Date.now(),
      customerEmail: 'test@example.com',
    });
    
    console.log('Payment URL:', payment.paymentUrl);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

test();
```

Run it:
```bash
npx ts-node test.ts
```

---

## 📤 Publishing to npm

### **Step 1: Update package.json**

Ensure these fields are correct:
```json
{
  "name": "@yetopayeft/sdk",
  "version": "1.0.0",
  "description": "Official JavaScript/TypeScript SDK for YETOPAYEFT",
  "author": "YetoPayEFT",
  "license": "MIT"
}
```

### **Step 2: Build for Production**

```bash
npm run build
```

### **Step 3: Test the Package**

```bash
npm pack
```

This creates `yetopayeft-sdk-1.0.0.tgz`. Test it:
```bash
cd ../test-project
npm install ../sdk/yetopayeft-sdk-1.0.0.tgz
```

### **Step 4: Login to npm**

```bash
npm login
```

Enter your npm credentials.

### **Step 5: Publish**

```bash
# Dry run (see what will be published)
npm publish --dry-run

# Actual publish
npm publish --access public
```

**Note**: For scoped packages (@yetopayeft/sdk), use `--access public` unless you have a paid npm account.

---

## 🔄 Updating the SDK

### **Version Bump**

```bash
# Patch (1.0.0 → 1.0.1)
npm version patch

# Minor (1.0.0 → 1.1.0)
npm version minor

# Major (1.0.0 → 2.0.0)
npm version major
```

### **Publish Update**

```bash
npm run build
npm publish
```

---

## 🌐 Using Published SDK

Once published, users can install:

```bash
npm install @yetopayeft/sdk
```

And use it:

```typescript
import { YetoPayEFTClient } from '@yetopayeft/sdk';

const client = new YetoPayEFTClient({
  apiKey: process.env.YETOPAY_API_KEY,
});

const payment = await client.createPaymentToken({
  amount: 100,
  reference: 'ORDER-123',
});
```

---

## 🐛 Troubleshooting

### **Error: Cannot find module 'axios'**

```bash
cd sdk
npm install
```

### **Error: Cannot find module '@yetopayeft/sdk'**

Build and link the SDK:
```bash
cd sdk
npm run build
npm link
```

### **TypeScript errors in examples**

Examples are meant to be run after SDK is built and linked. They're reference code, not part of the SDK package.

### **Build fails**

Check TypeScript version:
```bash
npx tsc --version
```

Should be 5.0+. Update if needed:
```bash
npm install -D typescript@latest
```

---

## 📁 What Gets Published

The `.npmignore` file ensures only these are published:

✅ `dist/` - Compiled JavaScript and types  
✅ `README.md` - Documentation  
✅ `package.json` - Package metadata  
✅ `LICENSE` - License file  

❌ `src/` - Source TypeScript files  
❌ `examples/` - Example code  
❌ `node_modules/` - Dependencies  
❌ `tsconfig.json` - TypeScript config  

---

## 🎯 Development Workflow

### **Daily Development**

```bash
# 1. Make changes to src/
# 2. Build
npm run build

# 3. Test in linked project
cd ../test-project
npm test
```

### **Before Publishing**

```bash
# 1. Run tests
npm test

# 2. Build fresh
rm -rf dist
npm run build

# 3. Verify package contents
npm pack
tar -tzf yetopayeft-sdk-1.0.0.tgz

# 4. Bump version
npm version patch

# 5. Publish
npm publish
```

---

## 📚 Additional Resources

- **SDK Documentation**: `README.md`
- **Type Definitions**: `src/types.ts`
- **Examples**: `examples/`
- **API Reference**: `../SDK_IMPLEMENTATION.md`

---

## ✅ Checklist

Before publishing, ensure:

- [ ] All TypeScript errors fixed
- [ ] Build succeeds without warnings
- [ ] README.md is complete
- [ ] Version number is correct
- [ ] Examples work (after linking)
- [ ] Tests pass (if you have tests)
- [ ] `.npmignore` is configured
- [ ] License file exists

---

## 🎉 Success!

Your SDK is now ready to use and publish!

**Installation**: `npm install @yetopayeft/sdk`  
**Usage**: Import and use with API key  
**Support**: Full TypeScript support with IntelliSense  

Happy coding! 🚀
