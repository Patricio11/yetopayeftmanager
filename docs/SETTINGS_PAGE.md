# Settings Page Documentation

**Beautiful, modern settings page for merchant account management**

---

## Overview

The Settings page provides a comprehensive interface for merchants to manage their account, security, API keys, company information, banking details, and notification preferences.

### Access

**URL**: `/dashboard/settings`

**Navigation**: Available in the dashboard navigation menu (Settings icon)

---

## Features

### 1. **Profile Settings** 👤

Manage personal information and contact details:

- ✅ Full Name
- ✅ Email Address
- ✅ Phone Number
- ✅ Timezone

**Actions:**
- Update profile information
- Save changes with validation

---

### 2. **Security Settings** 🔒

Comprehensive security management:

#### Password Management
- Change current password
- Password strength requirements:
  - Minimum 8 characters
  - Uppercase and lowercase letters
  - At least one number
  - At least one special character
- Show/hide password toggle
- Real-time validation

#### Two-Factor Authentication (2FA)
- Enable/disable 2FA
- Enhanced account security
- Status indicator

#### Active Sessions
- View current session details
- Device and location information
- Last active timestamp
- Session status badge

---

### 3. **API Keys Settings** 🔑

Complete API key management interface:

#### Features
- ✅ Create new API keys
- ✅ View all API keys
- ✅ Copy API key prefix
- ✅ Revoke keys instantly
- ✅ Usage tracking (last used)
- ✅ Status indicators

#### Create API Key Flow
1. Click "Create API Key" button
2. Enter descriptive name
3. View security notice
4. Generate key
5. **Copy credentials immediately** (shown once!)
6. Store securely

#### API Key Display
- Key name
- Key prefix (e.g., `yp_live_abc123...`)
- Created date
- Last used timestamp
- Active/Revoked status
- Quick copy button
- Revoke action

#### Security Notices
- ⚠️ Keys shown only once
- 🔒 Store securely warning
- 📚 Link to API documentation
- 🛡️ Security best practices

---

### 4. **Company Settings** 🏢

Business information management:

- Company Name
- Registration Number
- VAT Number
- Website URL
- Business Address
- City, Province, Postal Code

**Use Case**: KYC compliance, invoicing, legal documentation

---

### 5. **Banking Settings** 💳

Bank account management for receiving payments:

#### Fields
- Bank Name (e.g., FNB, Standard Bank)
- Account Number
- Account Type (Cheque, Savings)
- Branch Code

#### Verification Status
- ✅ Verified account indicator
- Status badges
- Verification date

**Security**: All banking details encrypted and secured

---

### 6. **Notification Settings** 🔔

Customize notification preferences:

#### Available Notifications
- ✅ **Payment Notifications** - When payments complete
- ✅ **Failed Payment Alerts** - When payments fail
- ⬜ **Weekly Summary** - Transaction summaries
- ✅ **Security Alerts** - Important security events

**Toggle**: Enable/disable each notification type individually

---

## UI/UX Features

### Design Elements

#### Modern Tabs Interface
- 6 main sections
- Icon + label navigation
- Responsive grid layout
- Active state highlighting
- Smooth transitions

#### Beautiful Cards
- Clean, modern card design
- Proper spacing and padding
- Shadow effects
- Hover states
- Gradient accents

#### Interactive Elements
- Toast notifications
- Copy-to-clipboard buttons
- Show/hide password toggles
- Status badges
- Loading states
- Confirmation dialogs

#### Responsive Design
- Mobile-friendly
- Tablet optimized
- Desktop full-featured
- Adaptive grid layouts
- Collapsible navigation

---

## Component Structure

```
settings/
└── page.tsx
    ├── ProfileSettings
    ├── SecuritySettings
    ├── ApiKeysSettings
    │   └── CreateApiKeyModal
    ├── CompanySettings
    ├── BankingSettings
    └── NotificationSettings
```

---

## Toast Notifications

### Success Messages
- ✅ "Profile updated"
- ✅ "Password updated"
- ✅ "API key created"
- ✅ "Settings saved"

### Error Messages
- ❌ "Validation error"
- ❌ "Update failed"
- ❌ "Invalid credentials"

### Info Messages
- ℹ️ "Copied to clipboard"
- ℹ️ "API key revoked"

---

## Security Features

### API Key Management
1. **One-time Display**: Keys shown only once during creation
2. **Secure Storage**: Hashed in database (SHA-256)
3. **Instant Revocation**: Immediate key deactivation
4. **Usage Tracking**: Monitor last used timestamp
5. **Copy Protection**: Clipboard-only access

### Password Security
1. **Strong Requirements**: Enforced password rules
2. **Current Password**: Required for changes
3. **Confirmation**: Double-entry validation
4. **Visual Feedback**: Strength indicator
5. **Show/Hide Toggle**: User-controlled visibility

### Session Management
1. **Active Sessions**: View all active sessions
2. **Device Info**: Track device and location
3. **Last Active**: Timestamp tracking
4. **Session Badges**: Visual status indicators

---

## User Flow Examples

### Creating an API Key

```
1. Navigate to Settings
2. Click "API Keys" tab
3. Click "Create API Key" button
4. Enter key name (e.g., "Production Server")
5. Review security notice
6. Click "Create API Key"
7. ⚠️ COPY both API Key and Secret immediately
8. Store in secure location (password manager)
9. Click "Done"
10. Key appears in list with status "Active"
```

### Changing Password

```
1. Navigate to Settings
2. Click "Security" tab
3. Enter current password
4. Enter new password
5. Confirm new password
6. Review password requirements
7. Click "Update Password"
8. See success toast notification
9. Password updated successfully
```

### Updating Company Info

```
1. Navigate to Settings
2. Click "Company" tab
3. Update company details
4. Fill in registration number, VAT, etc.
5. Click "Save Changes"
6. See success notification
7. Changes saved to database
```

---

## Integration with API

### API Endpoints Used

```typescript
// Create API Key
POST /api/merchant/api-keys
Body: { name: "Production Server" }

// List API Keys
GET /api/merchant/api-keys

// Revoke API Key
DELETE /api/merchant/api-keys/[id]

// Update Profile
PATCH /api/merchant/profile

// Change Password
POST /api/merchant/security/password

// Update Company
PATCH /api/merchant/company

// Update Banking
PATCH /api/merchant/banking

// Update Notifications
PATCH /api/merchant/notifications
```

---

## Styling

### Color Scheme
- **Primary**: Green (`from-green-500 to-emerald-600`)
- **Success**: Green (`bg-green-50 text-green-700`)
- **Error**: Red (`bg-red-50 text-red-700`)
- **Warning**: Yellow (`bg-yellow-50 text-yellow-700`)
- **Info**: Blue (`bg-blue-50 text-blue-700`)

### Icons (Lucide React)
- User, Lock, Key, Building2, CreditCard, Bell
- Eye, EyeOff, Copy, Trash2, Plus, Check, AlertCircle

### Components (shadcn/ui)
- Card, CardHeader, CardTitle, CardDescription, CardContent
- Tabs, TabsList, TabsTrigger, TabsContent
- Button, Input, Label, Badge
- Toast notifications

---

## Accessibility

- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ Focus indicators
- ✅ Screen reader support
- ✅ Color contrast (WCAG AA)
- ✅ Semantic HTML

---

## Future Enhancements

### Planned Features
- [ ] Profile picture upload
- [ ] Email verification flow
- [ ] Phone number verification (OTP)
- [ ] 2FA implementation (TOTP)
- [ ] Webhook configuration UI
- [ ] API usage analytics
- [ ] Team member management
- [ ] Audit log viewer
- [ ] Export settings
- [ ] Dark mode toggle

### API Key Enhancements
- [ ] Key permissions editor
- [ ] Expiration date setting
- [ ] IP whitelist configuration
- [ ] Rate limit customization
- [ ] Usage statistics chart
- [ ] Key rotation automation

---

## Testing

### Manual Testing Checklist

**Profile Tab:**
- [ ] Update name
- [ ] Update email
- [ ] Update phone
- [ ] Save changes
- [ ] Cancel changes

**Security Tab:**
- [ ] Change password
- [ ] Show/hide password
- [ ] Validate requirements
- [ ] View active sessions

**API Keys Tab:**
- [ ] Create new key
- [ ] Copy key prefix
- [ ] Revoke key
- [ ] View key list
- [ ] Check last used

**Company Tab:**
- [ ] Update company info
- [ ] Save changes

**Banking Tab:**
- [ ] View bank details
- [ ] Update account info

**Notifications Tab:**
- [ ] Toggle notifications
- [ ] Save preferences

---

## Troubleshooting

### Common Issues

**Issue**: Toast not showing
**Solution**: Ensure `<Toaster />` is in layout

**Issue**: API key not copying
**Solution**: Check clipboard permissions

**Issue**: Password validation failing
**Solution**: Review password requirements

**Issue**: Settings not saving
**Solution**: Check API endpoint responses

---

## Code Examples

### Using Toast Notifications

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

// Success
toast({
  title: "Success",
  description: "Your changes have been saved.",
});

// Error
toast({
  title: "Error",
  description: "Failed to save changes.",
  variant: "destructive",
});
```

### Creating API Key

```typescript
const handleCreate = async () => {
  const response = await fetch('/api/merchant/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: keyName }),
  });
  
  const data = await response.json();
  
  // Show success with credentials
  setGeneratedKey({
    apiKey: data.data.apiKey,
    apiSecret: data.data.apiSecret
  });
};
```

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
