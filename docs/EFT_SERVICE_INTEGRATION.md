# EFT Service Integration Analysis

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     YETOPAYEFT (Next.js 15)                     │
│                      EFT Manager/Dashboard                       │
│  - Merchant Dashboard                                            │
│  - Payment Link Creation                                         │
│  - Transaction Management                                        │
│  - Token-based Security                                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │ API Calls (JWT Auth)
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│              Express.js Server (serverAPI)                       │
│                   Port: 3001                                     │
│  - /api/v1/eft-payment-link (Create payment link)              │
│  - /api/v1/transaction/:txnId/init (Initialize transaction)    │
│  - /api/v1/create-merchant-payment-link (Unified endpoint)     │
│  - Authentication: HMAC Signature (SHA-256)                     │
└──────────────────┬──────────────────────────────────────────────┘
                   │ JWT Token + Session Management
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│              EFT Service (Hono.js)                              │
│                   Port: 8080                                     │
│  - /v1/eft/:bank/session/init                                  │
│  - /v1/eft/:bank/auth                                          │
│  - /v1/eft/:bank/setup                                         │
│  - /v1/eft/:bank/payment                                       │
│  - /v1/eft/:bank/final                                         │
│  - Authentication: JWT (RS256)                                  │
│  - Banks: afribank, nedbank, fnb                               │
└─────────────────────────────────────────────────────────────────┘
```

## 🔑 Current Authentication Flow

### 1. Express Server (serverAPI) Authentication

**Method:** HMAC Signature
```javascript
// testDirectEft.js example
const timestamp = Math.floor(Date.now() / 1000);
const apiSecretKey = '660d6b8dc187ddee0cc98ecda21c921527fb6e7107e7f798axa451650d8a0312';
const orgId = '51262f9a-98fa-4618-850a-38431a85482d';

// Generate signature
const stringToHash = `${apiSecretKey}_${orgId}_${timestamp}`;
const signature = crypto.createHash('sha256').update(stringToHash).digest('hex');

// Headers
{
  'Auth-Token': signature,
  'OrgId': orgId,
  'Timestamp': timestamp.toString()
}
```

### 2. EFT Service Authentication

**Method:** JWT (RS256)
```javascript
// EFT Service expects:
{
  'Authorization': 'Bearer <JWT_TOKEN>',
  'Content-Type': 'application/json'
}

// JWT Payload:
{
  audience: 'eft-service',
  issuer: 'https://manager.paylinkpro.co.za'
}

// Keys location: ./src/keys/public.key (RSA public key)
```

## 📊 Current Express Server Flow

### Payment Link Creation (Line 3456-3483)

```javascript
async function createEftPaymentLink(params) {
  const { merchantId, amount, reference, notify_url } = params;

  // 1. Create EFT transaction in database
  const newTransaction = await databaseService.createEftTransaction({
      merchantId: merchantId,
      amount: amount,
      reference: reference,
      notifyUrl: notify_url,
      status: 'not_started',
      metadata: { type, split_times, currency, description, expires_at }
  });

  // 2. Generate payment link (OLD - uses transaction ID)
  const eftPaymentLink = `${process.env.EFT_FRONTEND_URL}/payment?general=${newTransaction.id}`;

  return {
      id: newTransaction.id,
      link: eftPaymentLink,
      service: 'YETOPAYEFT'
  };
}
```

**⚠️ SECURITY ISSUE:** Exposes transaction ID in URL

### Transaction Initialization (Line 3570-3661)

```javascript
app.get('/api/v1/transaction/:txnId/init', async (req, res) => {
  const { txnId } = req.params;

  // 1. Fetch transaction details
  const transaction = await databaseService.getEftTransactionById(txnId);
  
  // 2. Fetch merchant details
  const merchant = await databaseService.getUserById(transaction.merchantId);
  
  // 3. Fetch merchant's primary bank account
  const merchantBankAccounts = await databaseService.getEftBankAccounts(transaction.merchantId);
  const primaryBankAccount = merchantBankAccounts.find(account => account.isPrimary);
  
  // 4. Fetch enabled banks
  const eft_banks = await databaseService.getEftBanks();
  
  // 5. Return initialization data
  return res.json({
      success: true,
      data: {
          sessionId: transaction.id,
          paymentDetails: { amount, reference, notify_url },
          merchant: { /* merchant details */ },
          banks: mappedBanks,
          step: 'init'
      }
  });
});
```

## 🔄 EFT Service Flow

### Session-Based Payment Flow

```
1. POST /v1/eft/:bank/session/init
   - Creates session with merchant/transaction data
   - Returns session_id
   
2. POST /v1/eft/:bank/auth
   - Authenticates with bank using customer credentials
   - Returns auth status
   
3. POST /v1/eft/:bank/setup
   - Sets up payment details
   - Returns setup confirmation
   
4. POST /v1/eft/:bank/payment
   - Executes payment
   - Returns payment status
   
5. POST /v1/eft/:bank/final
   - Polls for completion
   - Fires webhook to notify_url
   - Returns final status
```

### Session Data Structure

```javascript
{
  merchant_account_number: string,
  merchant_account_name: string,
  merchant_account_type: string,
  merchant_reference: string,
  merchant_name: string,
  merchant_bank: string,
  amount: string,
  transaction_id: string,
  notify_url: string,
  // ... more fields
}
```

## 🔐 Security Improvements Needed

### Current Issues

1. **❌ Transaction ID Exposure**
   ```javascript
   // OLD (serverAPI/server.js:3476)
   const eftPaymentLink = `${process.env.EFT_FRONTEND_URL}/payment?general=${newTransaction.id}`;
   ```

2. **❌ No Token-Based Access Control**
   - Anyone with transaction ID can access payment page
   - No expiration mechanism
   - No rate limiting

### Proposed Solution (Already Implemented in YETOPAYEFT)

1. **✅ Token-Based Payment Links**
   ```javascript
   // NEW (YETOPAYEFT)
   const token = await generatePaymentToken({
     transactionId: transaction.id,
     merchantId: session.user.id,
     amount: validatedData.amount,
     expiresInHours: 24
   });
   
   const paymentUrl = `${appUrl}/pay/${token}`;
   ```

2. **✅ Token Verification**
   ```javascript
   // Verify token before showing payment page
   const { transactionId } = await verifyPaymentToken(token);
   // - Checks expiration
   // - Checks usage count
   // - Checks revocation status
   // - Tracks IP & user agent
   ```

## 🔌 Integration Strategy

### Phase 1: Update Express Server (serverAPI)

#### 1.1 Update `createEftPaymentLink` Function

```javascript
// serverAPI/server.js (Update line 3456-3483)
async function createEftPaymentLink(params) {
  const { merchantId, amount, reference, notify_url, expires_at } = params;

  // 1. Create EFT transaction
  const newTransaction = await databaseService.createEftTransaction({
      merchantId,
      amount,
      reference,
      notifyUrl: notify_url,
      status: 'not_started',
      metadata: { /* ... */ }
  });

  // 2. Generate secure payment token (NEW)
  const token = await generatePaymentToken({
      transactionId: newTransaction.id,
      merchantId,
      amount: parseFloat(amount),
      expiresInHours: expires_at ? calculateHours(expires_at) : 24
  });

  // 3. Generate secure payment link (NEW)
  const eftPaymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${token}`;

  return {
      id: newTransaction.id,
      link: eftPaymentLink,
      token, // Return token for reference
      service: 'YETOPAYEFT'
  };
}
```

#### 1.2 Add Payment Token Table to Express Database

```javascript
// Add to serverAPI/lib/db.js or equivalent
CREATE TABLE payment_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    transaction_id UUID NOT NULL REFERENCES eft_transactions(id),
    merchant_id TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_tokens_hash ON payment_tokens(token_hash);
CREATE INDEX idx_payment_tokens_transaction ON payment_tokens(transaction_id);
```

#### 1.3 Update Transaction Init Endpoint

```javascript
// serverAPI/server.js (Update line 3570-3661)
app.get('/api/v1/transaction/:token/init', async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Verify token (NEW)
    const { transactionId } = await verifyPaymentToken(token, req.ip, req.get('user-agent'));
    
    // 2. Fetch transaction details
    const transaction = await databaseService.getEftTransactionById(transactionId);
    
    // ... rest of the logic remains the same
  } catch (error) {
    if (error.message.includes('expired')) {
      return res.status(410).json({ success: false, message: 'Payment link has expired' });
    }
    if (error.message.includes('revoked')) {
      return res.status(403).json({ success: false, message: 'Payment link has been cancelled' });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
});
```

### Phase 2: Connect YETOPAYEFT to Express Server

#### 2.1 Update YETOPAYEFT API Route

```typescript
// fyropay/app/api/payment-links/route.ts
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validatedData = createPaymentLinkSchema.parse(body);

  // Call Express Server to create payment link
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateHMACSignature(session.user.apiSecretKey, session.user.id, timestamp);

  const response = await fetch(`${process.env.EXPRESS_API_URL}/api/v1/eft-payment-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Auth-Token': signature,
      'OrgId': session.user.id,
      'Timestamp': timestamp.toString()
    },
    body: JSON.stringify({
      amount: validatedData.amount,
      reference: validatedData.reference,
      notify_url: validatedData.notifyUrl,
      expires_at: validatedData.expiresInHours
    })
  });

  const data = await response.json();
  
  return NextResponse.json({
    success: true,
    data: {
      transactionId: data.id,
      paymentUrl: data.link,
      reference: validatedData.reference,
      amount: validatedData.amount,
      expiresAt: data.expires_at,
      status: 'not_started'
    }
  });
}
```

### Phase 3: Connect Express Server to EFT Service

#### 3.1 Generate JWT Token for EFT Service

```javascript
// serverAPI/lib/eftServiceAuth.js (NEW FILE)
const jwt = require('jsonwebtoken');
const fs = require('fs');

function generateEftServiceJWT(merchantData) {
  const privateKey = fs.readFileSync('./keys/private.key');
  
  const payload = {
    merchant_id: merchantData.id,
    merchant_name: merchantData.companyName,
    transaction_id: merchantData.transactionId,
    // ... other claims
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    audience: 'eft-service',
    issuer: 'https://manager.paylinkpro.co.za',
    expiresIn: '1h'
  });
}

module.exports = { generateEftServiceJWT };
```

#### 3.2 Update Payment Interface to Call EFT Service

```typescript
// fyropay/components/payment/PaymentInterface.tsx
async function initializeEftSession(bank: string, sessionData: any) {
  // Get JWT token from Express server
  const jwtResponse = await fetch('/api/eft/get-jwt', {
    method: 'POST',
    body: JSON.stringify({ transactionId: sessionData.transactionId })
  });
  
  const { jwt_token } = await jwtResponse.json();

  // Call EFT Service
  const response = await fetch(`${EFT_SERVICE_URL}/v1/eft/${bank}/session/init?session_id=${sessionData.transactionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      merchant_account_number: sessionData.merchant.merchant_account_number,
      merchant_account_name: sessionData.merchant.merchant_account_name,
      merchant_account_type: sessionData.merchant.merchant_account_type,
      merchant_reference: sessionData.merchant.merchant_reference,
      merchant_name: sessionData.merchant.merchant_name,
      merchant_bank: sessionData.merchant.merchant_bank,
      amount: sessionData.paymentDetails.amount,
      transaction_id: sessionData.transactionId,
      notify_url: sessionData.paymentDetails.notify_url
    })
  });

  return await response.json();
}
```

## 📝 Environment Variables Needed

### YETOPAYEFT (.env.local)
```env
# Database
DATABASE_URL=your_neon_database_url
DIRECT_URL=your_neon_direct_url

# Auth
BETTER_AUTH_SECRET=your_secret_here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Security
PAYMENT_TOKEN_SECRET=your_token_secret

# Express API
EXPRESS_API_URL=http://localhost:3001
```

### Express Server (.env)
```env
# Database
DATABASE_URL=your_postgres_url

# Frontend URLs
EFT_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# EFT Service
EFT_SERVICE_URL=http://localhost:8080
EFT_SERVICE_JWT_PRIVATE_KEY_PATH=./keys/private.key

# Security
JWT_SECRET=your_jwt_secret
```

### EFT Service (.env)
```env
# Server
PORT=8080
NODE_ENV=development

# CORS
MERCHANT_ORIGIN=http://localhost:3000,http://localhost:3001

# JWT Keys
PUBLIC_KEY_PATH=./src/keys/public.key
```

## 🚀 Implementation Checklist

### Step 1: Express Server Updates
- [ ] Add `payment_tokens` table to database
- [ ] Implement `generatePaymentToken()` function
- [ ] Implement `verifyPaymentToken()` function
- [ ] Update `createEftPaymentLink()` to use tokens
- [ ] Update `/api/v1/transaction/:token/init` endpoint
- [ ] Generate RSA key pair for JWT signing
- [ ] Implement `generateEftServiceJWT()` function

### Step 2: YETOPAYEFT Updates
- [ ] Add Express API URL to environment variables
- [ ] Implement HMAC signature generation
- [ ] Update payment link API to call Express server
- [ ] Add JWT token retrieval endpoint
- [ ] Update PaymentInterface to call EFT Service
- [ ] Implement all 5 EFT flow steps (init, auth, setup, payment, final)

### Step 3: Testing
- [ ] Test token generation and verification
- [ ] Test payment link creation end-to-end
- [ ] Test EFT Service integration with all banks
- [ ] Test webhook notifications
- [ ] Test token expiration
- [ ] Test token revocation
- [ ] Load test with multiple concurrent payments

## 🔒 Security Considerations

1. **Token Storage**: Store only SHA-256 hashed tokens in database
2. **Rate Limiting**: Max 10 access attempts per token
3. **IP Tracking**: Log all access attempts with IP and user agent
4. **Expiration**: Default 24 hours, max 7 days
5. **Revocation**: Merchants can cancel payment links anytime
6. **JWT Security**: Use RS256 with proper key rotation
7. **HMAC Security**: Use strong secret keys (256-bit minimum)
8. **CORS**: Strict origin validation in production

## 📊 Monitoring & Logging

### Key Metrics to Track
- Payment link creation rate
- Token verification success/failure rate
- EFT Service response times
- Webhook delivery success rate
- Failed payment attempts
- Token expiration events

### Logging Strategy
- All token generation events
- All token verification attempts
- All EFT Service API calls
- All webhook deliveries
- All security violations (expired tokens, rate limits, etc.)

---

**Next Steps:** Implement Step 1 (Express Server Updates) first, then proceed to Step 2 (YETOPAYEFT integration).
