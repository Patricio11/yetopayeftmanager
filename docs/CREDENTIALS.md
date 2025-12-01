# 🔐 YETOPAYEFT - Login Credentials

## 📋 **Test Accounts**

### **👨‍💼 ADMIN USER**
```
Email:    admineft@yetopayeft.com
Password: Admin@123456
Role:     admin
Company:  YETOPAYEFT Admin
```

**Bank Account Details:**
- Bank: FNB (First National Bank)
- Account Number: 99999999999
- Account Name: Admin Test Account
- Account Type: Cheque
- Branch Code: 250655
- Branch: FNB Head Office
- Status: ✅ Verified & Primary

**Admin Capabilities:**
- ✅ Create payment links (for testing)
- ✅ View all merchants and transactions
- ✅ Manage EFT banks
- ✅ View system logs
- ✅ Manage user accounts
- ✅ Access admin dashboard
- ✅ Full system access

**Services Enabled:**
- ✅ YETOPAYEFT (EFT Payments)

---

### **👤 MERCHANT 1 - Acme Corporation**
```
Email:    merchanteft@yetopayeft.com
Password: Merchant@123
Role:     merchant
Company:  Acme Corporation
```

**Bank Account Details:**
- Bank: FNB (First National Bank)
- Account Number: 62123456789
- Account Name: Acme Corporation
- Account Type: Cheque
- Branch Code: 250655
- Branch: FNB Sandton
- Status: ✅ Verified & Primary

**Services Enabled:**
- ✅ YETOPAYEFT (EFT Payments)

---

### **👤 MERCHANT 2 - Tech Store SA**
```
Email:    saraheft@techstore.com
Password: Sarah@123456
Role:     merchant
Company:  Tech Store SA
```

**Bank Account Details:**
- Bank: Standard Bank
- Account Number: 12345678901
- Account Name: Tech Store SA
- Account Type: Cheque
- Branch Code: 051001
- Branch: Standard Bank Rosebank
- Status: ✅ Verified & Primary

**Services Enabled:**
- ✅ YETOPAYEFT (EFT Payments)

---

## 🏦 **Available Banks**

The following banks are configured and enabled in the system:

1. **FNB (First National Bank)**
   - Code: `fnb`
   - Color: #007DC5 (Blue)
   - Branch Code: 250655

2. **Standard Bank**
   - Code: `standardbank`
   - Color: #0033A1 (Dark Blue)
   - Branch Code: 051001

3. **ABSA**
   - Code: `absa`
   - Color: #E30613 (Red)
   - Branch Code: 632005

4. **Nedbank**
   - Code: `nedbank`
   - Color: #007A4D (Green)
   - Branch Code: 198765

5. **Capitec**
   - Code: `capitec`
   - Color: #0066B3 (Blue)
   - Branch Code: 470010

---

## 🚀 **How to Use**

### **Step 1: Run Database Migration**
```bash
npm run db:push
```

### **Step 2: Seed the Database**
```bash
npm install tsx  # If not already installed
npm run db:seed
```

### **Step 3: Sign Up Users**

Since we're using Better Auth, you need to create the users through the sign-up process:

1. Go to `http://localhost:3000/auth/register`
2. Sign up with the credentials above
3. The seed script has already set up:
   - User roles
   - Bank accounts
   - Service enablement

**OR** if users already exist, just sign in at:
`http://localhost:3000/auth/login`

---

## 📝 **Testing Scenarios**

### **Scenario 1: Create Payment Link (Merchant)**
1. Login as `merchant@yetopayeft.com`
2. Go to Dashboard
3. Click "Create Payment Link"
4. Fill in:
   - Amount: 100.00
   - Reference: TEST-001
   - Customer Email: customer@example.com
5. Generate link
6. Copy payment URL

### **Scenario 2: Complete Payment (Customer)**
1. Open payment URL in incognito/private window
2. See payment details for "Acme Corporation"
3. Select bank (e.g., FNB)
4. See Terms & Conditions in Step 2
5. Agree to T&C
6. Proceed to bank login
7. Complete payment

### **Scenario 3: Admin Dashboard**
1. Login as `admin@yetopayeft.com`
2. View all merchants
3. View all transactions
4. Manage banks
5. View system logs

---

## 🔒 **Security Notes**

### **Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@, #, $, etc.)

### **Test Passwords:**
All test passwords meet these requirements:
- `Admin@123456` ✅
- `Merchant@123` ✅
- `Sarah@123456` ✅

---

## 🎯 **Quick Reference**

| User Type | Email | Password | Company | Bank |
|-----------|-------|----------|---------|------|
| Admin | admineft@yetopayeft.com | Admin@123456 | YETOPAYEFT Admin | FNB |
| Merchant | merchanteft@yetopayeft.com | Merchant@123 | Acme Corporation | FNB |
| Merchant | saraheft@techstore.com | Sarah@123456 | Tech Store SA | Standard Bank |

---

## 📊 **Database Schema**

The seed script creates:

✅ **3 Users** (1 admin, 2 merchants)
✅ **5 EFT Banks** (FNB, Standard, ABSA, Nedbank, Capitec)
✅ **2 Bank Accounts** (1 per merchant, verified & primary)
✅ **2 User Services** (YETOPAYEFT enabled for both merchants)

---

## 🛠️ **Troubleshooting**

### **Issue: Users already exist**
```bash
# The seed script uses onConflictDoUpdate
# It will update existing users instead of creating duplicates
npm run db:seed
```

### **Issue: Can't login**
1. Make sure you've signed up through Better Auth first
2. Check that email is verified
3. Verify password meets requirements

### **Issue: No bank account**
```bash
# Re-run seed to create bank accounts
npm run db:seed
```

---

## 📞 **Support**

For issues or questions:
- Check `FUNCTIONALITY_ANALYSIS.md` for flow details
- Check `PHASE1_IMPLEMENTATION.md` for API details
- Check `CRITICAL_FIXES_COMPLETE.md` for recent fixes

---

**Last Updated:** November 16, 2024
**Version:** 1.0.0
