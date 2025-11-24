# Bank Credential Tokenization Feature

## Overview

The tokenization feature allows customers to securely save their bank login credentials for faster repeat payments. This is a **web-based tokenization system** that encrypts and stores credentials locally per device, scoped to merchant + customer + device.

## Key Features

### 🔐 Security
- **AES-256-GCM Encryption**: Military-grade encryption for credential storage
- **Device Fingerprinting**: Credentials tied to specific device/browser
- **Merchant Scoping**: Credentials only work for the merchant who saved them
- **Customer Scoping**: Tied to customer email address
- **SHA-256 Hashing**: Deduplication without decryption
- **Auto-Expiry**: Credentials expire after 90 days of inactivity (auto-renewed on use)

### 🚀 User Experience
- **Optional**: Users choose whether to save credentials
- **One-Click Payment**: Returning customers can pay with one click
- **Saved Credentials List**: Shows previously saved credentials for the bank
- **Manual Entry Option**: Users can always enter credentials manually
- **Delete Anytime**: Users can remove saved credentials

### 📊 Tracking & Audit
- **Usage Statistics**: Track how many times credentials are used
- **Last Used Timestamp**: Show when credentials were last used
- **Audit Logs**: Complete audit trail of all tokenization events
- **Device Info**: Store device metadata for security analysis

## Architecture

### Database Schema

#### `customer_bank_tokens` Table
Stores encrypted bank credentials:
- `id` - UUID primary key
- `merchantId` - Reference to merchant (user)
- `customerEmail` - Customer's email (not a user account)
- `customerName` - Optional customer name
- `bankId` / `bankCode` - Bank identification
- `encryptedCredentials` - AES-256-GCM encrypted JSON
- `credentialHash` - SHA-256 hash for deduplication
- `deviceFingerprint` - Browser/device fingerprint
- `deviceInfo` - JSON with device metadata
- `ipAddress` - IP when token was created
- `lastUsedAt` - Last usage timestamp
- `usageCount` - Number of times used
- `isActive` - Soft delete flag
- `expiresAt` - Expiry timestamp (90 days from last use)

#### `tokenization_audit_log` Table
Tracks all tokenization events:
- `id` - UUID primary key
- `tokenId` - Reference to token
- `merchantId` - Merchant ID
- `customerEmail` - Customer email
- `action` - Event type (created, used, deleted, expired, failed_auth)
- `ipAddress` - IP address
- `userAgent` - Browser user agent
- `deviceFingerprint` - Device fingerprint
- `metadata` - Additional event data

### Security Components

#### Encryption (`lib/security/credential-encryption.ts`)
- `encryptCredentials()` - Encrypt credentials with AES-256-GCM
- `decryptCredentials()` - Decrypt credentials
- `hashCredentials()` - Create SHA-256 hash for deduplication
- `generateDeviceFingerprint()` - Generate device fingerprint
- `validateCredentials()` - Validate credential structure
- `sanitizeCredentialsForLog()` - Remove sensitive data for logging

#### Device Fingerprinting (`lib/utils/device-fingerprint.ts`)
- `collectDeviceInfo()` - Collect browser/device information
- `generateDeviceFingerprint()` - Create unique device hash
- `getDeviceDescription()` - Human-readable device description
- `getDeviceFingerprint()` - Get or generate with caching

### API Endpoints

#### `GET /api/tokenization`
Retrieve saved credentials for a customer
```typescript
Query params:
- merchantId: string
- customerEmail: string
- deviceFingerprint: string

Response:
{
  success: true,
  tokens: [
    {
      id: string,
      bankCode: string,
      bankName: string,
      bankColor: string,
      customerName: string,
      lastUsedAt: Date,
      createdAt: Date
    }
  ]
}
```

#### `POST /api/tokenization`
Save new bank credentials
```typescript
Body:
{
  merchantId: string,
  customerEmail: string,
  customerName?: string,
  bankCode: string,
  credentials: Record<string, any>,
  deviceFingerprint: string,
  deviceInfo: DeviceInfo
}

Response:
{
  success: true,
  tokenId: string,
  isNew: boolean
}
```

#### `DELETE /api/tokenization`
Delete saved credentials
```typescript
Query params:
- tokenId: string
- merchantId: string
- customerEmail: string

Response:
{
  success: true,
  message: string
}
```

#### `POST /api/tokenization/[tokenId]/decrypt`
Decrypt and return credentials for use
```typescript
Body:
{
  merchantId: string,
  customerEmail: string,
  deviceFingerprint: string
}

Response:
{
  success: true,
  credentials: Record<string, any>,
  bankCode: string,
  customerName: string
}
```

## User Flow

### First-Time Payment (Save Credentials)

1. **Customer selects bank** → Proceeds to auth step
2. **Auth form displays** with:
   - Bank login fields (username, password, etc.)
   - **"Save my credentials for faster payments"** checkbox
   - Terms & Conditions checkbox
3. **Customer enters credentials** and checks "Save" option
4. **Customer submits form**:
   - Credentials sent to EFT service for authentication
   - If successful, credentials are encrypted and saved
   - Device fingerprint generated and stored
5. **Payment completes** → Credentials saved for next time

### Returning Customer (Use Saved Credentials)

1. **Customer selects same bank** on same device
2. **Saved credentials detected** → Shows:
   ```
   ┌─────────────────────────────────────┐
   │ 🕐 Use Saved Credentials            │
   ├─────────────────────────────────────┤
   │ ┌─────────────────────────────────┐ │
   │ │ Saved Credentials               │ │
   │ │ Last used: Nov 24, 2025         │ │
   │ │                    [Use] [🗑️]   │ │
   │ └─────────────────────────────────┘ │
   │                                     │
   │ Enter credentials manually          │
   └─────────────────────────────────────┘
   ```
3. **Customer clicks "Use"**:
   - Credentials decrypted
   - Auto-filled into form
   - Form auto-submitted
4. **Payment completes** → Last used timestamp updated

### Manual Entry Option

At any time, customer can:
- Click "Enter credentials manually"
- Saved credentials panel closes
- Standard auth form appears
- Option to save credentials available

## UI Components

### Saved Credentials Panel
Displays when:
- Customer is on auth step
- Saved credentials exist for this bank
- Device fingerprint matches

Features:
- List of saved credentials
- "Use" button for each
- "Delete" button for each
- "Enter manually" link
- Close button (X)

### Save Credentials Checkbox
Displays when:
- Customer is on auth step
- No saved credentials being used
- After all credential input fields

Design:
```
┌─────────────────────────────────────────────┐
│ ☑️ Save my credentials for faster payments │
│ Your credentials will be securely          │
│ encrypted and stored on this device        │
└─────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Generate Encryption Key

Run this command to generate a secure 256-bit key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update Environment Variables

Add to `.env.local`:
```env
# Credential Tokenization Encryption (AES-256)
CREDENTIAL_ENCRYPTION_KEY=<your_64_character_hex_key>
CREDENTIAL_ENCRYPTION_SALT=yetopay-credential-salt-v1
```

### 3. Run Database Migration

```bash
npm run db:generate
npm run db:push
```

This creates:
- `customer_bank_tokens` table
- `tokenization_audit_log` table

### 4. Test the Feature

1. Start the dev server: `npm run dev`
2. Create a payment link
3. Select a bank
4. Enter credentials and check "Save credentials"
5. Complete payment
6. Create another payment link
7. Select same bank → See saved credentials

## Security Considerations

### ✅ What's Protected
- Credentials encrypted at rest (AES-256-GCM)
- Device-specific (can't use on different device)
- Merchant-specific (can't use for different merchant)
- Customer-specific (tied to email)
- Auto-expiry after 90 days inactivity
- Complete audit trail

### ⚠️ Important Notes
1. **Encryption Key Security**: Store `CREDENTIAL_ENCRYPTION_KEY` securely
   - Use environment variables
   - Never commit to git
   - Rotate periodically
   - Consider using AWS KMS or Azure Key Vault in production

2. **Device Fingerprinting Limitations**:
   - Browser updates may change fingerprint
   - Incognito mode creates different fingerprint
   - VPN/proxy changes may affect fingerprint

3. **Compliance**:
   - Ensure compliance with PCI DSS if storing card data
   - Check local regulations (POPIA in South Africa)
   - Implement data retention policies
   - Provide user data export/deletion

4. **Rate Limiting**:
   - Implement rate limits on decrypt endpoint
   - Monitor for suspicious activity
   - Alert on multiple failed decryption attempts

## Monitoring & Maintenance

### Metrics to Track
- Number of saved credentials
- Usage rate (saved vs manual entry)
- Decryption success rate
- Token expiry rate
- Device fingerprint collision rate

### Cleanup Tasks
Run periodically:
```sql
-- Delete expired tokens (older than 90 days)
DELETE FROM customer_bank_tokens 
WHERE expires_at < NOW() AND is_active = true;

-- Archive old audit logs (older than 1 year)
DELETE FROM tokenization_audit_log 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Monitoring Queries
```sql
-- Active tokens by bank
SELECT bank_code, COUNT(*) as token_count
FROM customer_bank_tokens
WHERE is_active = true
GROUP BY bank_code;

-- Usage statistics
SELECT 
  bank_code,
  AVG(usage_count::int) as avg_usage,
  MAX(last_used_at) as last_activity
FROM customer_bank_tokens
WHERE is_active = true
GROUP BY bank_code;

-- Recent tokenization events
SELECT action, COUNT(*) as count
FROM tokenization_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action;
```

## Troubleshooting

### Issue: Credentials not saving
**Check:**
1. `CREDENTIAL_ENCRYPTION_KEY` is set in `.env.local`
2. Database tables exist (`customer_bank_tokens`)
3. Device fingerprint is being generated
4. Customer email is captured from form
5. Browser console for errors

### Issue: Saved credentials not appearing
**Check:**
1. Same device/browser being used
2. Same customer email
3. Same merchant
4. Token hasn't expired
5. Token is active (`is_active = true`)

### Issue: Decryption fails
**Check:**
1. Encryption key hasn't changed
2. Token data is not corrupted
3. Device fingerprint matches
4. Customer email matches

## Future Enhancements

### Potential Improvements
1. **Multi-Device Sync**: Allow credentials across devices (with 2FA)
2. **Biometric Auth**: Use fingerprint/face ID for decryption
3. **Credential Rotation**: Auto-rotate credentials periodically
4. **Risk Scoring**: Analyze usage patterns for fraud detection
5. **Merchant Dashboard**: Show tokenization statistics
6. **Customer Portal**: Manage saved credentials across merchants
7. **Push Notifications**: Alert on credential usage
8. **Geolocation**: Restrict usage by location

## Testing Checklist

- [ ] Save credentials on first payment
- [ ] Use saved credentials on second payment
- [ ] Delete saved credentials
- [ ] Manual entry after saved credentials shown
- [ ] Expired token handling
- [ ] Different device (should not show saved)
- [ ] Different customer email (should not show saved)
- [ ] Decryption error handling
- [ ] Audit log entries created
- [ ] Usage count increments
- [ ] Last used timestamp updates
- [ ] Device fingerprint generation
- [ ] Encryption/decryption works
- [ ] Hash deduplication works

---

**Built with security and user experience in mind! 🔐✨**
