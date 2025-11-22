# 🔐 Admin & Merchant Access Control

## ✅ **What's Implemented**

### **1. Admin User - Full Access**

**Capabilities:**
- ✅ Can create payment links (for testing)
- ✅ Has bank account (FNB - 99999999999)
- ✅ YETOPAYEFT service enabled
- ✅ Can view all merchants
- ✅ Can view all transactions
- ✅ Can manage EFT banks
- ✅ Can access admin dashboard
- ✅ Full system access

**Login:**
```
Email: admin@yetopayeft.com
Password: Admin@123456
```

**After Login:**
- Redirects to `/dashboard`
- Can access all merchant features
- Can access admin-only features
- Can create and test payment links

---

### **2. Merchant Users - Merchant Access**

**Capabilities:**
- ✅ Can create payment links
- ✅ Has bank account
- ✅ YETOPAYEFT service enabled
- ✅ Can view own transactions
- ✅ Can manage own payment links
- ✅ Can access merchant dashboard

**Login (Merchant 1):**
```
Email: merchant@yetopayeft.com
Password: Merchant@123
```

**Login (Merchant 2):**
```
Email: sarah@techstore.com
Password: Sarah@123456
```

**After Login:**
- Redirects to `/dashboard`
- Can only see own data
- Can create payment links
- Can view own transactions

---

## 🎯 **Access Control Matrix**

| Feature | Admin | Merchant |
|---------|-------|----------|
| Create Payment Links | ✅ | ✅ |
| View Own Transactions | ✅ | ✅ |
| View All Transactions | ✅ | ❌ |
| Manage Own Bank Account | ✅ | ✅ |
| View All Merchants | ✅ | ❌ |
| Manage EFT Banks | ✅ | ❌ |
| System Logs | ✅ | ❌ |
| User Management | ✅ | ❌ |

---

## 📊 **Database Setup**

### **Admin User:**
```sql
User:
- ID: admin-001
- Email: admin@yetopayeft.com
- Role: admin
- Company: YETOPAYEFT Admin

Bank Account:
- Account: 99999999999
- Bank: FNB
- Type: Cheque
- Status: Verified & Primary

Service:
- YETOPAYEFT: Enabled
```

### **Merchant Users:**
```sql
Merchant 1:
- ID: merchant-001
- Email: merchant@yetopayeft.com
- Role: merchant
- Company: Acme Corporation
- Bank: FNB - 62123456789

Merchant 2:
- ID: merchant-002
- Email: sarah@techstore.com
- Role: merchant
- Company: Tech Store SA
- Bank: Standard Bank - 12345678901
```

---

## 🚀 **How to Test**

### **Test 1: Admin Creates Payment Link**
```bash
1. Login as admin@yetopayeft.com
2. Go to /dashboard/payment-links/create
3. Create payment link
4. Verify it works
5. Test complete payment flow
```

### **Test 2: Merchant Creates Payment Link**
```bash
1. Login as merchant@yetopayeft.com
2. Go to /dashboard/payment-links/create
3. Create payment link
4. Verify it works
5. Test complete payment flow
```

### **Test 3: Admin Views All Transactions**
```bash
1. Login as admin@yetopayeft.com
2. Go to /dashboard/transactions
3. Should see transactions from ALL merchants
4. Can filter by merchant
```

### **Test 4: Merchant Views Own Transactions**
```bash
1. Login as merchant@yetopayeft.com
2. Go to /dashboard/transactions
3. Should ONLY see own transactions
4. Cannot see other merchants' data
```

---

## 🔒 **Security Implementation**

### **Dashboard Layout Protection:**
```typescript
// app/dashboard/layout.tsx
const session = await getSession();

if (!session) {
  redirect('/auth/login');
}

// Admin and Merchant both have access
// Role-based filtering happens at data level
```

### **Data Filtering:**
```typescript
// Admin sees all
if (session.user.role === 'admin') {
  transactions = await db.select().from(eftTransactions);
}

// Merchant sees only own
if (session.user.role === 'merchant') {
  transactions = await db.select()
    .from(eftTransactions)
    .where(eq(eftTransactions.merchantId, session.user.id));
}
```

---

## 📝 **Run Seed Script**

```bash
# Navigate to yetopayeft directory
cd yetopayeft

# Run seed
npm run db:seed
```

**Output:**
```
✅ Admin created: admin@yetopayeft.com
✅ YETOPAYEFT service enabled for admin
✅ Bank account created for Admin
✅ Merchant 1 created: merchant@yetopayeft.com
✅ Merchant 2 created: sarah@techstore.com
✅ Created 5 EFT banks
✅ Bank accounts created
✅ Services enabled
```

---

## ✅ **Summary**

**Admin User:**
- ✅ Can create payment links
- ✅ Has bank account for testing
- ✅ Can access all features
- ✅ Can view all data
- ✅ Perfect for testing

**Merchant Users:**
- ✅ Can create payment links
- ✅ Have bank accounts
- ✅ Can only see own data
- ✅ Standard merchant access

**Both roles redirect to `/dashboard` after login and have appropriate access based on their role!** 🎯
