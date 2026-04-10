# Web-Based Tokenization (Browser Storage)

## 🎯 Overview

This is a **pure web-based tokenization system** that stores encrypted credentials **ONLY in the user's browser** (localStorage), not in the database. The database stores only non-sensitive metadata for audit trails.

## 🔐 Why Web-Based Storage?

### Compliance Benefits
✅ **PCI DSS Friendly** - No credentials on server  
✅ **POPIA Compliant** - User has full control  
✅ **Data Minimization** - Only metadata stored  
✅ **Right to Erasure** - Clear browser = clear data  

### Security Benefits
✅ **Client-Side Encryption** - Encrypted before storage  
✅ **Device-Specific** - Can't be accessed from other devices  
✅ **User Control** - User can clear anytime  
✅ **No Server Breach Risk** - Credentials never on server  

### User Experience
✅ **Faster Payments** - One-click checkout  
✅ **Transparent** - User knows where data is stored  
✅ **Privacy** - No server-side credential storage  

## 🏗️ Architecture

### Storage Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                       │
├─────────────────────────────────────────────────────────┤
│  localStorage (Encrypted with Web Crypto API)          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Key: yetopay_cred_v1_merchant_email_bank          │ │
│  │ Value: {                                          │ │
│  │   id: "uuid",                                     │ │
│  │   credentials: { encrypted },                     │ │
│  │   accountInfo: { ... },                           │ │
│  │   isDefault: true,                                │ │
│  │   lastUsedAt: "2025-11-24",                       │ │
│  │   usageCount: 5                                   │ │
│  │ }                                                  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
                    (Metadata Only)
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    DATABASE                             │
├─────────────────────────────────────────────────────────┤
│  customer_bank_tokens (NO CREDENTIALS)                  │
│  ┌───────────────────────────────────────────────────┐ │
│  │ id, merchantId, customerEmail, bankCode           │ │
│  │ deviceFingerprint, lastUsedAt, usageCount         │ │
│  │ isDefault, accountNumber (last 4 digits only)     │ │
│  │ accountType, accountName                          │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  tokenization_audit_log                                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │ action, timestamp, ipAddress, deviceFingerprint   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### What's Stored Where

#### Browser localStorage (Encrypted)
- ✅ Full bank credentials (username, password, etc.)
- ✅ Account information
- ✅ Usage statistics
- ✅ Default flag

#### Database (Metadata Only)
- ✅ Token ID (reference)
- ✅ Merchant ID
- ✅ Customer email
- ✅ Bank code
- ✅ Device fingerprint
- ✅ Last 4 digits of account number (optional)
- ✅ Account type/name (optional, for display)
- ✅ Usage count
- ✅ Default flag
- ✅ Timestamps
- ❌ **NO CREDENTIALS**

## 🔒 Encryption Details

### Web Crypto API (Browser-Native)

```typescript
// Encryption Process:
1. Generate salt (16 bytes random)
2. Derive key from password using PBKDF2 (100,000 iterations)
3. Generate IV (12 bytes random)
4. Encrypt with AES-256-GCM
5. Combine: salt + iv + encrypted data
6. Store as base64 in localStorage

// Password Generation:
deviceFingerprint + "_" + merchantId + "_" + customerEmail
```

### Security Properties
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: 16 bytes random per encryption
- **IV**: 12 bytes random per encryption
- **Authentication**: Built-in with GCM mode

## 🎬 User Flow

### 1. First-Time Payment (Save Credentials)

```
Customer completes payment successfully
         ↓
"Save credentials?" checkbox was checked
         ↓
Credentials encrypted with Web Crypto API
         ↓
Stored in browser localStorage
         ↓
Metadata sent to database (no credentials)
         ↓
Audit log entry created
         ↓
Dialog: "Set as default account?" appears
         ↓
User chooses: [Yes, Set as Default] or [Not Now]
         ↓
If Yes: isDefault flag set to true
         ↓
Success! Credentials saved for next time
```

### 2. Returning Customer (Use Saved Credentials)

```
Customer selects same bank (same device)
         ↓
Check localStorage for saved credentials
         ↓
Check database metadata for validation
         ↓
Display: "Use Saved Credentials" panel
         ↓
Show: Account info, last used, [Use] [Delete]
         ↓
Customer clicks [Use]
         ↓
Decrypt credentials from localStorage
         ↓
Auto-fill form fields
         ↓
Auto-submit form
         ↓
Update usage count & timestamp
         ↓
Payment completes faster!
```

### 3. Set Default Account (After Successful Payment)

```
Payment successful
         ↓
Credentials saved in browser
         ↓
Dialog appears: "Set as default account?"
         ↓
Shows: Bank name, account info, benefits
         ↓
User clicks [Yes, Set as Default]
         ↓
Update isDefault flag in localStorage
         ↓
Update isDefault flag in database metadata
         ↓
Unset other accounts' default flags
         ↓
Next payment: This account pre-selected!
```

## 📁 File Structure

```
lib/utils/
├── browser-credential-storage.ts    # Browser storage logic
└── device-fingerprint.ts            # Device identification

app/api/tokenization/
└── metadata/
    └── route.ts                     # Metadata API (no credentials)

components/payment/
├── SetDefaultAccountDialog.tsx      # Default account dialog
└── EftServiceTheme/
    └── YetoPayEFT.tsx              # Payment component (updated)

lib/db/schema/
└── tokenization.ts                  # Metadata-only schema
```

## 🛠️ API Reference

### Browser Storage Functions

#### `saveCredentialsToBrowser()`
```typescript
await saveCredentialsToBrowser(
  merchantId: string,
  customerEmail: string,
  bankCode: string,
  bankName: string,
  credentials: Record<string, any>,
  accountInfo?: {
    accountNumber?: string,
    accountType?: string,
    accountName?: string
  }
): Promise<{ success: boolean; credentialId: string }>
```

#### `getCredentialFromBrowser()`
```typescript
await getCredentialFromBrowser(
  merchantId: string,
  customerEmail: string,
  bankCode: string
): Promise<StoredCredential | null>
```

#### `setDefaultCredential()`
```typescript
await setDefaultCredential(
  merchantId: string,
  customerEmail: string,
  bankCode: string
): Promise<boolean>
```

#### `deleteCredentialFromBrowser()`
```typescript
await deleteCredentialFromBrowser(
  merchantId: string,
  customerEmail: string,
  bankCode: string
): Promise<boolean>
```

### Metadata API Endpoints

#### `POST /api/tokenization/metadata`
Save metadata after successful payment
```typescript
Body: {
  merchantId: string,
  customerEmail: string,
  customerName?: string,
  bankCode: string,
  deviceFingerprint: string,
  deviceInfo: object,
  accountInfo?: {
    accountNumber: string, // Last 4 digits only
    accountType: string,
    accountName: string
  },
  isDefault?: boolean
}

Response: {
  success: true,
  tokenId: string,
  isNew: boolean
}
```

#### `GET /api/tokenization/metadata`
Retrieve metadata for validation
```typescript
Query: {
  merchantId: string,
  customerEmail: string,
  deviceFingerprint: string
}

Response: {
  success: true,
  tokens: [{
    id: string,
    bankCode: string,
    accountNumber: string, // Last 4 digits
    isDefault: boolean,
    lastUsedAt: Date,
    usageCount: number
  }]
}
```

## 🎨 UI Components

### Saved Credentials Panel
Shows when credentials exist in browser:
```
┌─────────────────────────────────────────┐
│ 🕐 Use Saved Credentials            [X] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ⭐ ABSA - Cheque Account (Default) │ │
│ │ John Doe                            │ │
│ │ •••• 1234                           │ │
│ │ Last used: Nov 24, 2025             │ │
│ │                        [Use] [🗑️]   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Enter credentials manually              │
└─────────────────────────────────────────┘
```

### Set Default Dialog
Appears after successful payment:
```
┌─────────────────────────────────────────┐
│ ⭐ Set as Default Account?          [X] │
│    Make future payments faster          │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ABSA                                │ │
│ │ John Doe                            │ │
│ │ Cheque Account                      │ │
│ │ •••• 1234                           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ✓ Pre-selected for future payments     │
│ ✓ Faster checkout with one-click       │
│ ✓ You can change this anytime          │
│                                         │
│ [⭐ Yes, Set as Default]                │
│ [Not Now]                               │
│                                         │
│ Your credentials are encrypted and      │
│ stored securely in your browser         │
└─────────────────────────────────────────┘
```

## ⚠️ Important Considerations

### Browser Storage Limitations

1. **Storage Quota**
   - localStorage: ~5-10MB per domain
   - Sufficient for hundreds of credentials

2. **Persistence**
   - ✅ Survives browser restart
   - ✅ Survives tab close
   - ❌ Lost if browser cache cleared
   - ❌ Lost if user clears site data
   - ❌ Lost in incognito mode

3. **Cross-Device**
   - ❌ Not synced across devices
   - Each device has its own storage
   - User must save on each device

### User Education

Inform users that:
- Credentials stored in **this browser only**
- Clearing browser data will remove credentials
- Incognito mode won't have saved credentials
- Must save separately on each device

### Fallback Strategy

If localStorage is unavailable:
```typescript
// Check if localStorage is available
if (typeof window !== 'undefined' && window.localStorage) {
  // Use browser storage
} else {
  // Fallback: Don't offer tokenization
  // Or: Use session storage (lost on tab close)
}
```

## 🧪 Testing Checklist

- [ ] Save credentials after successful payment
- [ ] Credentials encrypted in localStorage
- [ ] Metadata saved in database (no credentials)
- [ ] Retrieve and decrypt credentials
- [ ] Auto-fill form with saved credentials
- [ ] Set account as default
- [ ] Default account pre-selected
- [ ] Delete credentials (browser + metadata)
- [ ] Clear browser data removes credentials
- [ ] Incognito mode doesn't show saved credentials
- [ ] Different device doesn't show credentials
- [ ] Audit log entries created correctly

## 📊 Monitoring

### Metrics to Track

```sql
-- Adoption rate (metadata in database)
SELECT COUNT(DISTINCT customer_email) as users_with_saved_creds
FROM customer_bank_tokens
WHERE is_active = true;

-- Default account usage
SELECT 
  COUNT(*) as total_tokens,
  SUM(CASE WHEN is_default THEN 1 ELSE 0 END) as default_tokens,
  ROUND(100.0 * SUM(CASE WHEN is_default THEN 1 ELSE 0 END) / COUNT(*), 2) as default_percentage
FROM customer_bank_tokens
WHERE is_active = true;

-- Usage statistics
SELECT 
  bank_code,
  AVG(usage_count) as avg_usage,
  MAX(usage_count) as max_usage
FROM customer_bank_tokens
WHERE is_active = true
GROUP BY bank_code;
```

## 🚀 Advantages Over Server Storage

| Feature | Web-Based | Server-Based |
|---------|-----------|--------------|
| PCI DSS Compliance | ✅ Easier | ⚠️ Complex |
| Data Breach Risk | ✅ Lower | ⚠️ Higher |
| User Control | ✅ Full | ⚠️ Limited |
| Cross-Device Sync | ❌ No | ✅ Yes |
| Survives Cache Clear | ❌ No | ✅ Yes |
| Server Storage Cost | ✅ None | ⚠️ Yes |
| Audit Trail | ✅ Metadata | ✅ Full |

## 🎯 Best Practices

1. **Always encrypt** before storing in localStorage
2. **Never log** decrypted credentials
3. **Clear on logout** if user requests
4. **Validate metadata** from database before using browser credentials
5. **Handle errors gracefully** if decryption fails
6. **Educate users** about browser storage
7. **Provide export option** for user data portability
8. **Monitor usage** through metadata analytics

---

**This approach gives you the best balance of security, compliance, and user experience! 🔐✨**
