# Architecture Decision: Monolith vs Microservices for YETOPAYEFT

## 🎯 **Decision Question**

Should we:
1. **Option A:** Create a separate Express serverAPI specifically for YETOPAYEFT
2. **Option B:** Use Next.js API routes and consolidate everything into one Next.js application
3. **Option C:** Keep Express server but extract only YETOPAYEFT-specific endpoints

## 📊 **Current State Analysis**

### Express Server (serverAPI) - Current Services

Based on analysis of `server.js` (4,322 lines), the Express server handles:

#### **1. Authentication (Lines 129-350)**
- `/api/v1/auth/signin` - User login
- `/api/v1/auth/signup` - User registration
- `/api/v1/auth/session` - Session validation
- `/api/v1/auth/signout` - Logout
- `/api/v1/auth/verify-email` - Email verification
- `/api/v1/auth/reset-password` - Password reset
- `/api/v1/auth/change-password` - Password change

#### **2. Payment Links (Multiple Gateways)**
- `/api/v1/create-payment-link` - Generic payment links
- `/api/v1/create-stripe-payment-link` - Stripe integration
- `/api/v1/create-merchant-payment-link` - **YETOPAYEFT + CALLPAYEFT + CARD**
- `/api/v1/payment-links` - List payment links
- `/api/v1/payment-links/:id/send` - Send payment link

#### **3. Invoices**
- `/api/v1/create-invoice` - Create invoice
- `/api/v1/invoices` - List invoices
- `/api/v1/invoices/:id` - Get/Update/Delete invoice
- `/api/v1/invoice-customers` - Customer management

#### **4. EFT Specific (YETOPAYEFT)**
- `/api/v1/eft-payment-link` - **Create EFT payment link**
- `/api/v1/transaction/:txnId/init` - **Initialize EFT transaction**
- `/api/v1/eft-test-payment` - Test endpoint
- `/api/v1/eft-webhook` - Webhook handler

#### **5. CallPay Integration**
- `/api/v1/callpay-webhook` - CallPay webhook
- CallPay payment link creation (within unified endpoint)

#### **6. User Management**
- `/api/v1/users/me` - Get current user
- `/api/v1/users/:userId` - Get/Update user
- User services management
- Bank account management

#### **7. Admin Functions**
- User management (admin-only)
- System logs
- KYC submissions
- Service enablement

#### **8. Notifications**
- `/api/v1/notify-user` - User notifications
- `/api/v1/send-email` - Email sending
- `/api/v1/send-sms` - SMS sending

#### **9. Webhooks**
- EFT webhooks
- CallPay webhooks
- Stripe webhooks

### Dependencies Analysis

**Express Server Uses:**
- `express` - Web framework
- `drizzle-orm` - Database ORM (PostgreSQL)
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `stripe` - Stripe integration
- `axios` - HTTP client
- Custom services: `authService`, `databaseService`, `notificationService`

**YETOPAYEFT Uses:**
- `Next.js 15` - Full-stack framework
- `drizzle-orm` - Database ORM (Neon PostgreSQL)
- `better-auth` - Authentication
- `zod` - Validation
- Same database schema (compatible)

## 🔍 **Detailed Analysis**

### **Option A: Separate Express Server for YETOPAYEFT**

#### ✅ **Pros:**
1. **Service Isolation**
   - YETOPAYEFT runs independently
   - Can scale separately
   - Easier to deploy to different environments

2. **Technology Flexibility**
   - Keep Express if team prefers it
   - Can use different Node.js versions
   - Independent dependency management

3. **Gradual Migration**
   - Don't need to migrate everything at once
   - Lower risk
   - Can test in parallel

#### ❌ **Cons:**
1. **Code Duplication**
   - Need to duplicate auth logic
   - Duplicate database service
   - Duplicate validation schemas
   - Duplicate middleware

2. **Maintenance Overhead**
   - Two codebases to maintain
   - Two deployment pipelines
   - Two sets of environment variables
   - Double the infrastructure costs

3. **Complexity**
   - Need to sync database schemas
   - Need to coordinate deployments
   - More moving parts = more failure points

4. **Development Speed**
   - Slower to add features (need to update both)
   - More context switching
   - Harder to debug cross-service issues

---

### **Option B: Next.js API Routes (Consolidate Everything)**

#### ✅ **Pros:**
1. **Single Codebase**
   - All code in one place
   - Easier to maintain
   - Faster development
   - Better code reuse

2. **Modern Stack**
   - Next.js 15 with App Router
   - Server Components + API Routes
   - Built-in TypeScript support
   - Better developer experience

3. **Simplified Deployment**
   - One deployment (Vercel/Netlify)
   - One environment config
   - Automatic scaling
   - Edge functions support

4. **Better Auth Integration**
   - Better Auth built for Next.js
   - No middleware conflicts
   - Session management handled
   - Vercel-optimized

5. **Type Safety**
   - End-to-end TypeScript
   - Shared types between frontend/backend
   - Better IDE support
   - Fewer runtime errors

6. **Performance**
   - Server Components reduce client JS
   - Automatic code splitting
   - Built-in caching
   - Edge runtime support

7. **Cost Effective**
   - Single hosting (Vercel free tier)
   - No separate server costs
   - Better resource utilization

#### ❌ **Cons:**
1. **Migration Effort**
   - Need to port all Express endpoints
   - Need to convert middleware
   - Need to test everything
   - Time investment upfront

2. **Learning Curve**
   - Team needs to learn Next.js API routes
   - Different patterns than Express
   - Server Actions vs traditional REST

3. **Vendor Lock-in**
   - Optimized for Vercel
   - Harder to self-host
   - Platform-specific features

4. **Initial Complexity**
   - Need to understand App Router
   - Server Components vs Client Components
   - Different caching strategies

---

### **Option C: Keep Express, Extract YETOPAYEFT Endpoints**

#### ✅ **Pros:**
1. **Minimal Changes**
   - Keep existing Express server
   - Only extract YETOPAYEFT endpoints
   - Other services unaffected

2. **Clear Separation**
   - YETOPAYEFT is isolated
   - Other services (invoices, CallPay) stay in Express
   - Easy to understand boundaries

#### ❌ **Cons:**
1. **Still Two Codebases**
   - Same maintenance issues as Option A
   - Still need to sync schemas
   - Still need two deployments

2. **Partial Solution**
   - Doesn't solve the fundamental problem
   - Still have code duplication
   - Still have complexity

## 🎯 **Recommendation: Option B (Next.js API Routes)**

### **Why This Is The Best Choice:**

#### **1. Long-Term Vision**
You're building **YETOPAYEFT** as the **EFT Manager** - this should be the primary application. The Express server was built for the old React app with multiple services (invoices, CallPay, Stripe). For YETOPAYEFT, you only need:
- EFT payment links
- EFT transactions
- EFT webhooks
- User/merchant management
- Authentication

#### **2. Modern Stack Advantages**
```typescript
// Next.js API Route - Clean, Type-Safe, Modern
export async function POST(request: NextRequest) {
  const session = await getSession(); // Better Auth
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await request.json();
  const validated = schema.parse(body); // Zod validation
  
  const result = await db.insert(eftTransactions).values(validated); // Drizzle ORM
  
  return NextResponse.json({ success: true, data: result });
}
```

vs

```javascript
// Express - Verbose, No Type Safety
app.post('/api/v1/endpoint', authenticateUser, async (req, res) => {
  try {
    const user_id = req.user_id;
    // Manual validation
    if (!req.body.field) {
      return res.status(400).json({ error: 'Missing field' });
    }
    // Database call
    const result = await databaseService.create(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### **3. Deployment Simplicity**
```
CURRENT (2 servers):
- Express Server → Railway/Heroku ($7-20/month)
- Next.js App → Vercel (free tier)
- Total: $7-20/month + complexity

PROPOSED (1 app):
- Next.js App → Vercel (free tier)
- Total: $0/month (free tier) or $20/month (Pro)
- Automatic scaling, edge functions, analytics
```

#### **4. Development Speed**
```
CURRENT:
1. Update Express endpoint
2. Update Next.js frontend
3. Deploy Express server
4. Deploy Next.js app
5. Test integration

PROPOSED:
1. Update Next.js API route + frontend
2. Deploy once
3. Test (everything in one place)
```

#### **5. Database Schema Compatibility**
Both use Drizzle ORM with PostgreSQL - **schemas are already compatible!**
```typescript
// Can reuse exact same schema files
import { eftTransactions, users, paymentTokens } from '@/lib/db/schema';
```

## 📋 **Migration Strategy (Systematic Approach)**

### **Phase 1: Core EFT Endpoints (Week 1)**

#### **1.1 Authentication** ✅ ALREADY DONE
- Better Auth configured
- Session management working
- No migration needed

#### **1.2 Payment Link Creation**
```typescript
// app/api/eft/payment-links/route.ts
export async function POST(request: NextRequest) {
  const session = await requireAuth();
  
  // Validate request
  const body = await request.json();
  const validated = createPaymentLinkSchema.parse(body);
  
  // Create transaction
  const [transaction] = await db.insert(eftTransactions).values({
    merchantId: session.user.id,
    amount: validated.amount.toString(),
    reference: validated.reference,
    notifyUrl: validated.notifyUrl,
    status: 'not_started'
  }).returning();
  
  // Generate secure token
  const token = await generatePaymentToken({
    transactionId: transaction.id,
    merchantId: session.user.id,
    amount: validated.amount,
    expiresInHours: validated.expiresInHours || 24
  });
  
  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${token}`;
  
  return NextResponse.json({
    success: true,
    data: {
      transactionId: transaction.id,
      paymentUrl,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
}
```

#### **1.3 Transaction Initialization**
```typescript
// app/api/eft/transactions/[token]/init/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  // Verify token
  const { transactionId } = await verifyPaymentToken(
    params.token,
    request.ip,
    request.headers.get('user-agent')
  );
  
  // Fetch transaction + merchant + banks
  const [transaction, merchant, banks] = await Promise.all([
    db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, transactionId)
    }),
    db.query.users.findFirst({
      where: eq(users.id, transaction.merchantId)
    }),
    db.query.eftBanks.findMany({
      where: eq(eftBanks.enabled, true)
    })
  ]);
  
  // Get primary bank account
  const bankAccount = await db.query.eftBankAccounts.findFirst({
    where: and(
      eq(eftBankAccounts.userId, merchant.id),
      eq(eftBankAccounts.isPrimary, true)
    )
  });
  
  return NextResponse.json({
    success: true,
    data: {
      sessionId: transaction.id,
      paymentDetails: {
        amount: transaction.amount,
        reference: transaction.reference,
        notifyUrl: transaction.notifyUrl
      },
      merchant: {
        id: merchant.id,
        name: merchant.companyName || merchant.name,
        logo: merchant.companyLogoUrl,
        bankAccount: {
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountHolderName,
          branchCode: bankAccount.branchCode,
          bankCode: bankAccount.bankCode,
          accountType: bankAccount.accountType
        }
      },
      banks: banks.map(b => ({
        code: b.code,
        name: b.bankName,
        color: b.color
      }))
    }
  });
}
```

#### **1.4 EFT Service JWT Generation**
```typescript
// app/api/eft/jwt/route.ts
import jwt from 'jsonwebtoken';
import fs from 'fs';

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  const { transactionId } = await request.json();
  
  // Verify transaction belongs to merchant
  const transaction = await db.query.eftTransactions.findFirst({
    where: and(
      eq(eftTransactions.id, transactionId),
      eq(eftTransactions.merchantId, session.user.id)
    )
  });
  
  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }
  
  // Generate JWT for EFT Service
  const privateKey = fs.readFileSync(process.env.EFT_JWT_PRIVATE_KEY_PATH!);
  
  const token = jwt.sign(
    {
      merchant_id: session.user.id,
      transaction_id: transactionId,
      amount: transaction.amount,
      reference: transaction.reference
    },
    privateKey,
    {
      algorithm: 'RS256',
      audience: 'eft-service',
      issuer: process.env.NEXT_PUBLIC_APP_URL,
      expiresIn: '1h'
    }
  );
  
  return NextResponse.json({ jwt_token: token });
}
```

#### **1.5 Webhook Handler**
```typescript
// app/api/eft/webhooks/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validate webhook signature (if applicable)
  // ...
  
  // Update transaction status
  await db.update(eftTransactions)
    .set({
      status: body.status,
      completedAt: body.status === 'completed' ? new Date() : null,
      metadata: body.metadata
    })
    .where(eq(eftTransactions.id, body.transaction_id));
  
  // Send notification to merchant
  if (body.notify_url) {
    await fetch(body.notify_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
  
  return NextResponse.json({ success: true });
}
```

### **Phase 2: User Management (Week 2)**

```typescript
// app/api/users/route.ts - List users (admin only)
// app/api/users/[id]/route.ts - Get/Update/Delete user
// app/api/users/[id]/services/route.ts - Manage user services
// app/api/users/[id]/bank-accounts/route.ts - Manage bank accounts
```

### **Phase 3: Admin Functions (Week 3)**

```typescript
// app/api/admin/merchants/route.ts - Merchant management
// app/api/admin/banks/route.ts - EFT bank management
// app/api/admin/system-logs/route.ts - System logs
// app/api/admin/kyc/route.ts - KYC submissions
```

## 🛠️ **Implementation Plan**

### **Step 1: Setup (Day 1)**
```bash
# Install additional dependencies
npm install jsonwebtoken @types/jsonwebtoken
npm install crypto

# Create API route structure
mkdir -p app/api/eft/{payment-links,transactions,jwt,webhooks}
mkdir -p app/api/users
mkdir -p app/api/admin
```

### **Step 2: Port Core Endpoints (Days 2-3)**
- ✅ Payment link creation
- ✅ Transaction initialization
- ✅ JWT generation for EFT Service
- ✅ Webhook handler

### **Step 3: Test Integration (Day 4)**
- Test payment link creation
- Test token verification
- Test EFT Service connection
- Test webhook delivery

### **Step 4: Port Remaining Endpoints (Days 5-7)**
- User management
- Admin functions
- System logs

### **Step 5: Decommission Express Server (Day 8)**
- Update environment variables
- Redirect old URLs (if needed)
- Archive Express codebase

## 📊 **Comparison Matrix**

| Feature | Express Server | Next.js API Routes | Winner |
|---------|---------------|-------------------|--------|
| Type Safety | ❌ JavaScript | ✅ TypeScript | Next.js |
| Auth Integration | Custom JWT | ✅ Better Auth | Next.js |
| Deployment | Manual/Railway | ✅ Vercel (1-click) | Next.js |
| Cost | $7-20/month | Free tier | Next.js |
| Development Speed | Slower | ✅ Faster | Next.js |
| Code Reuse | Limited | ✅ Excellent | Next.js |
| Maintenance | 2 codebases | ✅ 1 codebase | Next.js |
| Scalability | Manual | ✅ Automatic | Next.js |
| Edge Functions | ❌ No | ✅ Yes | Next.js |
| Caching | Manual | ✅ Built-in | Next.js |

## ✅ **Final Recommendation**

**Go with Option B: Next.js API Routes**

### **Why:**
1. ✅ **Single codebase** - Faster development, easier maintenance
2. ✅ **Modern stack** - TypeScript, Better Auth, Drizzle ORM
3. ✅ **Cost effective** - Free Vercel tier vs paid Express hosting
4. ✅ **Better DX** - Type safety, hot reload, better tooling
5. ✅ **Vercel optimized** - No middleware issues, automatic scaling
6. ✅ **Future proof** - Built for modern web development

### **Migration Timeline:**
- **Week 1:** Core EFT endpoints (payment links, transactions, webhooks)
- **Week 2:** User management endpoints
- **Week 3:** Admin functions
- **Week 4:** Testing & decommission Express server

### **Risk Mitigation:**
- Keep Express server running during migration
- Test each endpoint thoroughly before switching
- Use feature flags to gradually roll out
- Can always roll back if issues arise

---

**Decision:** Proceed with Next.js API Routes consolidation. Start with Phase 1 (Core EFT Endpoints) immediately.
