# 🚀 YETOPAYEFT - Complete API Structure

## ✅ **Implemented Structure**

```
/api
├── /auth/[...all]              # ✅ Better Auth (exists)
│
├── /payment-links              # ✅ Shared (exists)
│   ├── GET  - List (filtered by role)
│   └── POST - Create (both can create)
│
├── /eft                        # ✅ Shared (exists)
│   ├── /transactions/[token]/init
│   ├── /jwt
│   └── /webhooks
│
├── /admin                      # 🆕 Admin-only
│   ├── /merchants              # ✅ Created
│   │   ├── GET    - List all merchants
│   │   ├── POST   - Create merchant
│   │   ├── PATCH  - Update merchant
│   │   └── DELETE - Delete merchant
│   ├── /banks                  # 🔜 To create
│   │   ├── GET    - List all banks
│   │   ├── POST   - Add bank
│   │   ├── PATCH  - Update bank
│   │   └── DELETE - Remove bank
│   ├── /transactions           # 🔜 To create
│   │   └── GET    - All transactions (all merchants)
│   ├── /system-logs            # 🔜 To create
│   │   └── GET    - System audit logs
│   └── /stats                  # 🔜 To create
│       └── GET    - System-wide statistics
│
└── /merchant                   # 🆕 Merchant-specific
    ├── /transactions           # ✅ Created
    │   ├── GET    - List own transactions
    │   ├── GET /[id] - Get transaction details
    │   └── PATCH /[id] - Update transaction (cancel, etc.)
    ├── /team                   # 🔜 To create
    │   ├── GET    - List team members
    │   ├── POST   - Invite team member
    │   └── DELETE - Remove team member
    ├── /bank-accounts          # 🔜 To create
    │   ├── GET    - List own bank accounts
    │   ├── POST   - Add bank account
    │   └── PATCH  - Update bank account
    └── /webhooks               # 🔜 To create
        ├── GET    - List webhook configs
        └── POST   - Create webhook config
```

---

## 📋 **Files Created**

### **1. Authorization Helpers** ✅
**File:** `lib/auth/authorization.ts`

```typescript
// Functions:
- requireAuth()      // Any authenticated user
- requireAdmin()     // Admin only
- requireMerchant()  // Merchant or Admin
- isAdmin(role)      // Check if admin
- isMerchant(role)   // Check if merchant
```

### **2. Admin Endpoints** ✅

#### **Merchants Management**
**File:** `app/api/admin/merchants/route.ts`

```typescript
GET  /api/admin/merchants
POST /api/admin/merchants

// Returns all merchants (admin only)
// Can create new merchants
```

### **3. Merchant Endpoints** ✅

#### **Transactions Management**
**File:** `app/api/merchant/transactions/route.ts`

```typescript
GET /api/merchant/transactions
  ?status=completed
  &limit=50
  &offset=0
  &from=2024-01-01
  &to=2024-12-31

// Returns:
// - Merchant: Only own transactions
// - Admin: All transactions
```

---

## 🔧 **Schema Issues to Fix**

### **Issue 1: User ID Generation**
The `users` table requires `id` field, but it should be auto-generated.

**Fix needed in:** `lib/db/schema/users.ts`
```typescript
// Change from:
id: text('id').notNull().primaryKey()

// To:
id: text('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID())
```

### **Issue 2: Transaction Status Values**
Schema has: `initiated`, `expired` but API uses: `pending`

**Fix needed:** Align status values between schema and API

---

## 🎯 **Remaining Endpoints to Create**

### **Priority 1: Core Admin Features**

1. **Admin Banks** (`/api/admin/banks/route.ts`)
   ```typescript
   GET    /api/admin/banks           // List all banks
   POST   /api/admin/banks           // Add new bank
   PATCH  /api/admin/banks/[id]      // Update bank
   DELETE /api/admin/banks/[id]      // Remove bank
   ```

2. **Admin Transactions** (`/api/admin/transactions/route.ts`)
   ```typescript
   GET /api/admin/transactions       // All transactions
     ?merchantId=xxx                 // Filter by merchant
     &status=completed
     &limit=100
   ```

3. **Admin Stats** (`/api/admin/stats/route.ts`)
   ```typescript
   GET /api/admin/stats
   // Returns:
   {
     totalMerchants: 10,
     totalTransactions: 1000,
     totalRevenue: 50000,
     transactionsByStatus: {...},
     recentActivity: [...]
   }
   ```

### **Priority 2: Merchant Features**

4. **Merchant Bank Accounts** (`/api/merchant/bank-accounts/route.ts`)
   ```typescript
   GET  /api/merchant/bank-accounts  // List own accounts
   POST /api/merchant/bank-accounts  // Add account
   PATCH /api/merchant/bank-accounts/[id] // Update
   ```

5. **Merchant Team** (`/api/merchant/team/route.ts`)
   ```typescript
   GET    /api/merchant/team         // List team members
   POST   /api/merchant/team         // Invite member
   DELETE /api/merchant/team/[id]    // Remove member
   ```

6. **Merchant Webhooks** (`/api/merchant/webhooks/route.ts`)
   ```typescript
   GET  /api/merchant/webhooks       // List webhooks
   POST /api/merchant/webhooks       // Create webhook
   ```

---

## 📊 **Authorization Matrix**

| Endpoint | Admin | Merchant | Public |
|----------|-------|----------|--------|
| `/api/payment-links` (GET) | ✅ All | ✅ Own | ❌ |
| `/api/payment-links` (POST) | ✅ | ✅ | ❌ |
| `/api/eft/transactions/[token]/init` | ❌ | ❌ | ✅ |
| `/api/eft/jwt` (POST) | ✅ | ✅ | ❌ |
| `/api/eft/webhooks` (POST) | ❌ | ❌ | ✅ |
| `/api/admin/merchants` | ✅ | ❌ | ❌ |
| `/api/admin/banks` | ✅ | ❌ | ❌ |
| `/api/admin/transactions` | ✅ | ❌ | ❌ |
| `/api/admin/stats` | ✅ | ❌ | ❌ |
| `/api/merchant/transactions` | ✅ All | ✅ Own | ❌ |
| `/api/merchant/bank-accounts` | ✅ All | ✅ Own | ❌ |
| `/api/merchant/team` | ✅ All | ✅ Own | ❌ |
| `/api/merchant/webhooks` | ✅ All | ✅ Own | ❌ |

---

## 🔒 **Security Implementation**

### **1. Role-Based Access**
```typescript
// Admin only
const auth = await requireAdmin();
if (!auth.authorized) return auth.response;

// Merchant or Admin
const auth = await requireMerchant();
if (!auth.authorized) return auth.response;
```

### **2. Data Filtering**
```typescript
// Admin sees all
if (session.user.role === 'admin') {
  data = await db.select().from(table);
}

// Merchant sees only own
else {
  data = await db.select()
    .from(table)
    .where(eq(table.merchantId, session.user.id));
}
```

### **3. Input Validation**
```typescript
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
});

const validated = schema.parse(body);
```

---

## 🧪 **Testing Examples**

### **Admin: List All Merchants**
```bash
curl -X GET http://localhost:3000/api/admin/merchants \
  -H "Cookie: auth-token=ADMIN_TOKEN"

# Response:
{
  "success": true,
  "data": [...],
  "count": 10
}
```

### **Merchant: List Own Transactions**
```bash
curl -X GET "http://localhost:3000/api/merchant/transactions?status=completed&limit=10" \
  -H "Cookie: auth-token=MERCHANT_TOKEN"

# Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 50,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### **Admin: View All Transactions**
```bash
curl -X GET "http://localhost:3000/api/merchant/transactions" \
  -H "Cookie: auth-token=ADMIN_TOKEN"

# Admin sees ALL merchants' transactions
```

---

## 📝 **Next Steps**

1. **Fix Schema Issues**
   - Add UUID generation for user IDs
   - Align transaction status values
   - Run migration

2. **Complete Remaining Endpoints**
   - Admin: banks, transactions, stats, logs
   - Merchant: bank-accounts, team, webhooks

3. **Add Individual Resource Routes**
   - GET/PATCH/DELETE `/api/admin/merchants/[id]`
   - GET/PATCH `/api/merchant/transactions/[id]`
   - etc.

4. **Add Comprehensive Tests**
   - Unit tests for each endpoint
   - Integration tests for flows
   - Authorization tests

---

## ✅ **Summary**

**Created:**
- ✅ Authorization helpers (`lib/auth/authorization.ts`)
- ✅ Admin merchants endpoint (`/api/admin/merchants`)
- ✅ Merchant transactions endpoint (`/api/merchant/transactions`)

**To Create:**
- 🔜 Admin: banks, transactions, stats, logs
- 🔜 Merchant: bank-accounts, team, webhooks
- 🔜 Individual resource routes ([id] routes)

**The foundation is in place! The API structure is clean, scalable, and follows best practices.** 🎯
