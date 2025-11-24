# Tokenization Feature - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Generate Encryption Key

Run the key generation script:
```bash
npm run generate:encryption-key
```

This will output something like:
```
CREDENTIAL_ENCRYPTION_KEY=a1b2c3d4e5f6...64_character_hex_string
```

### Step 2: Update Environment Variables

Copy the generated key and add it to your `.env.local` file:

```env
# Credential Tokenization Encryption (AES-256)
CREDENTIAL_ENCRYPTION_KEY=<paste_your_64_character_key_here>
CREDENTIAL_ENCRYPTION_SALT=yetopay-credential-salt-v1
```

### Step 3: Run Database Migration

Generate and push the new database schema:

```bash
npm run db:generate
npm run db:push
```

This creates two new tables:
- `customer_bank_tokens` - Stores encrypted credentials
- `tokenization_audit_log` - Tracks all tokenization events

### Step 4: Test the Feature

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Create a test payment link:**
   - Go to http://localhost:3000/dashboard
   - Click "Create Payment Link"
   - Fill in the details and create

3. **Test first-time payment (save credentials):**
   - Open the payment link
   - Select a bank (e.g., ABSA, FNB)
   - Enter your bank credentials
   - ✅ **Check the "Save my credentials" checkbox**
   - Complete the payment

4. **Test returning customer (use saved credentials):**
   - Create another payment link
   - Open it in the **same browser**
   - Select the **same bank**
   - 🎉 You should see "Use Saved Credentials" panel
   - Click "Use" to auto-fill and submit

### Step 5: Verify in Database

Check that credentials were saved:

```sql
-- View saved tokens
SELECT 
  id,
  customer_email,
  bank_code,
  usage_count,
  last_used_at,
  created_at
FROM customer_bank_tokens
WHERE is_active = true;

-- View audit log
SELECT 
  action,
  customer_email,
  created_at
FROM tokenization_audit_log
ORDER BY created_at DESC
LIMIT 10;
```

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Encryption key is set in `.env.local`
- [ ] Database tables created successfully
- [ ] "Save credentials" checkbox appears on auth step
- [ ] Credentials save after successful payment
- [ ] Saved credentials appear on next payment
- [ ] "Use" button auto-fills and submits form
- [ ] "Delete" button removes saved credentials
- [ ] Audit log entries are created
- [ ] Different device doesn't show saved credentials
- [ ] Different customer email doesn't show saved credentials

## 🔒 Security Checklist

Before going to production:

- [ ] Generate a **new** encryption key for production
- [ ] Store encryption key in secure vault (AWS KMS, Azure Key Vault)
- [ ] Never commit `.env.local` to git
- [ ] Use different keys for dev/staging/production
- [ ] Set up key rotation schedule (every 90 days)
- [ ] Implement rate limiting on decrypt endpoint
- [ ] Set up monitoring for failed decryption attempts
- [ ] Review and comply with PCI DSS requirements
- [ ] Implement data retention policy
- [ ] Set up automated cleanup of expired tokens

## 🎯 Usage Tips

### For Merchants
- Tokenization increases conversion rates (faster checkout)
- Reduces cart abandonment
- Improves customer experience
- No additional cost or complexity

### For Customers
- **Optional**: Choose whether to save credentials
- **Secure**: Military-grade encryption (AES-256)
- **Device-specific**: Only works on your device
- **Deletable**: Remove anytime
- **Auto-expires**: After 90 days of inactivity

## 🐛 Troubleshooting

### Credentials not saving?

**Check browser console for errors:**
```javascript
// Should see these logs:
✅ Credentials saved for future use
```

**Verify environment variable:**
```bash
# In your terminal
echo $CREDENTIAL_ENCRYPTION_KEY
# Should output your 64-character key
```

**Check database:**
```sql
SELECT COUNT(*) FROM customer_bank_tokens;
-- Should be > 0 after saving
```

### Saved credentials not appearing?

**Possible reasons:**
1. Different device/browser
2. Different customer email
3. Token expired (>90 days old)
4. Token was deleted
5. Device fingerprint changed (browser update, VPN)

**Debug:**
```javascript
// Check device fingerprint in browser console
import { getDeviceFingerprint } from '@/lib/utils/device-fingerprint';
const fp = await getDeviceFingerprint();
console.log('Device Fingerprint:', fp);
```

### Decryption fails?

**Check:**
1. Encryption key hasn't changed
2. Database connection is working
3. Token is not corrupted

**Test encryption/decryption:**
```javascript
// In Node.js console or test file
const { encryptCredentials, decryptCredentials } = require('./lib/security/credential-encryption');

const testCreds = { username: 'test', password: 'test123' };
const encrypted = encryptCredentials(testCreds);
console.log('Encrypted:', encrypted);

const decrypted = decryptCredentials(encrypted);
console.log('Decrypted:', decrypted);
// Should match testCreds
```

## 📊 Monitoring

### Key Metrics to Track

1. **Adoption Rate**
   ```sql
   SELECT 
     COUNT(DISTINCT customer_email) as unique_customers,
     COUNT(*) as total_tokens
   FROM customer_bank_tokens
   WHERE is_active = true;
   ```

2. **Usage Rate**
   ```sql
   SELECT 
     bank_code,
     AVG(usage_count::int) as avg_usage,
     MAX(usage_count::int) as max_usage
   FROM customer_bank_tokens
   WHERE is_active = true
   GROUP BY bank_code;
   ```

3. **Recent Activity**
   ```sql
   SELECT 
     action,
     COUNT(*) as count
   FROM tokenization_audit_log
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY action;
   ```

## 🎓 Learn More

- **Full Documentation**: See `TOKENIZATION_FEATURE.md`
- **Security Details**: Review encryption implementation
- **API Reference**: Check API endpoint documentation
- **Database Schema**: Review table structures

## 🆘 Need Help?

If you encounter issues:

1. Check the logs: `npm run dev` output
2. Review browser console for errors
3. Check database for data
4. Verify environment variables
5. Test encryption/decryption manually
6. Review audit logs for clues

---

**Happy tokenizing! 🎉🔐**
