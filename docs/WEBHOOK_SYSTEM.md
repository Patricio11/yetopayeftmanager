# ✅ YETOPAYEFT Webhook System - Complete Implementation

**Production-ready webhook subscription system with event dispatching, security, and delivery tracking**

---

## 🎯 What Was Built

A comprehensive webhook system that allows merchants to subscribe to payment events and receive real-time notifications with proper security and delivery tracking.

### Core Features

✅ **Event Subscription** - Subscribe to specific payment events  
✅ **HMAC Signature** - Secure webhook verification with SHA-256  
✅ **Delivery Tracking** - Complete logs of all webhook deliveries  
✅ **Retry Mechanism** - Automatic retries with exponential backoff  
✅ **Test Endpoints** - Test webhooks before going live  
✅ **Secret Management** - Regenerate secrets anytime  
✅ **UI Management** - Complete webhook CRUD in settings  
✅ **Documentation** - Built-in security guide  

---

## 📁 Files Created

### 1. **Webhook API Endpoints**

#### `app/api/webhooks/route.ts`
**CRUD operations for webhook configurations**

```typescript
GET    /api/webhooks              // List all webhooks
POST   /api/webhooks              // Create new webhook
PATCH  /api/webhooks              // Update webhook
DELETE /api/webhooks?id=xxx       // Delete webhook
```

**Features**:
- ✅ List merchant's webhooks (secrets masked)
- ✅ Create webhook with auto-generated secret
- ✅ Update URL, events, or active status
- ✅ Delete webhook (cascades to deliveries)
- ✅ Event validation
- ✅ URL validation

---

#### `app/api/webhooks/regenerate-secret/route.ts`
**Regenerate webhook secrets**

```typescript
POST /api/webhooks/regenerate-secret
Body: { webhookId: string }
```

**Features**:
- ✅ Generate new 64-character secret
- ✅ Invalidates old secret
- ✅ Returns new secret (one-time view)

---

#### `app/api/webhooks/test/route.ts`
**Test webhook endpoints**

```typescript
POST /api/webhooks/test
Body: { webhookId: string }
```

**Features**:
- ✅ Sends test payload
- ✅ Measures response time
- ✅ Validates endpoint availability
- ✅ Returns success/failure status

---

#### `app/api/webhooks/deliveries/route.ts`
**View webhook delivery logs**

```typescript
GET /api/webhooks/deliveries?webhookId=xxx&limit=50&offset=0
```

**Features**:
- ✅ Paginated delivery history
- ✅ Success/failure stats
- ✅ Response codes and errors
- ✅ Delivery timestamps

---

### 2. **Webhook Dispatcher**

#### `lib/webhooks/dispatcher.ts`
**Event dispatching and delivery management**

**Functions**:
```typescript
// Dispatch event to all subscribed webhooks
dispatchWebhookEvent(
  merchantId: string,
  eventType: WebhookEventType,
  eventData: any
): Promise<void>

// Retry failed delivery
retryWebhookDelivery(
  deliveryId: string
): Promise<boolean>

// Test webhook endpoint
testWebhookEndpoint(
  url: string,
  secret: string
): Promise<TestResult>
```

**Features**:
- ✅ HMAC-SHA256 signature generation
- ✅ Automatic delivery logging
- ✅ Exponential backoff for retries
- ✅ 30-second timeout
- ✅ Custom headers
- ✅ Error handling

---

### 3. **Webhook UI**

#### Settings Page - Webhooks Tab
**Complete webhook management interface**

**Features**:
- ✅ List all webhooks with status
- ✅ Create new webhook modal
- ✅ Event subscription checkboxes
- ✅ Test webhook button
- ✅ View delivery logs
- ✅ Regenerate secret
- ✅ Delete webhook
- ✅ Security documentation
- ✅ Code examples

---

## 🔐 Security Implementation

### HMAC Signature Generation

```typescript
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}
```

### Signature Verification (Merchant Side)

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In webhook handler
app.post('/webhooks/payment', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifySignature(payload, signature, YOUR_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
  res.status(200).send('OK');
});
```

---

## 📡 Webhook Events

### Available Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `payment.completed` | Payment successfully completed | Customer payment verified |
| `payment.failed` | Payment failed | Payment verification failed |
| `payment.cancelled` | Payment cancelled | Customer cancelled payment |
| `payment.pending` | Payment pending | Awaiting verification |
| `transaction.created` | New transaction created | Transaction initiated |
| `transaction.updated` | Transaction updated | Status or details changed |

---

## 📦 Webhook Payload Structure

```typescript
{
  id: string;              // Unique event ID
  type: WebhookEventType;  // Event type
  data: {
    // Transaction data
    id: string;
    reference: string;
    amount: number;
    status: string;
    customerEmail?: string;
    customerName?: string;
    bankName?: string;
    proofOfPaymentUrl?: string;
    metadata?: object;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
  };
  timestamp: string;       // ISO 8601 timestamp
  merchantId: string;      // Your merchant ID
}
```

---

## 🔄 Webhook Headers

All webhook requests include these headers:

```
X-Webhook-Signature: <hmac-sha256-signature>
X-Webhook-Timestamp: <unix-timestamp>
X-Webhook-ID: <unique-event-id>
X-Webhook-Event: <event-type>
Content-Type: application/json
User-Agent: FyroPayEFT-Webhooks/1.0
```

---

## 🔁 Retry Mechanism

### Retry Policy

```typescript
{
  maxRetries: 3,
  backoffMultiplier: 2
}
```

### Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1st | Immediate |
| 2nd | 1 minute |
| 3rd | 2 minutes |
| 4th | 4 minutes |

### Retry Triggers

Webhooks are retried when:
- ❌ Network error (timeout, connection refused)
- ❌ HTTP status 5xx (server error)
- ❌ HTTP status 4xx (except 401, 403, 404)

Webhooks are NOT retried when:
- ✅ HTTP status 200-299 (success)
- ❌ HTTP status 401, 403 (authentication/authorization)
- ❌ HTTP status 404 (endpoint not found)

---

## 🎨 Merchant Integration

### Step 1: Create Webhook

```typescript
// In Settings → Webhooks tab
1. Click "Add Webhook"
2. Enter your endpoint URL
3. Select events to subscribe
4. Click "Create Webhook"
5. SAVE THE SECRET (shown only once!)
```

### Step 2: Implement Endpoint

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Your webhook secret from dashboard
const WEBHOOK_SECRET = 'your-secret-here';

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhooks/payment', (req, res) => {
  // Get signature from header
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  if (!verifySignature(payload, signature, WEBHOOK_SECRET)) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }
  
  // Get event data
  const event = req.body;
  
  console.log('Webhook received:', event.type);
  console.log('Transaction ID:', event.data.id);
  
  // Handle different event types
  switch (event.type) {
    case 'payment.completed':
      handlePaymentCompleted(event.data);
      break;
      
    case 'payment.failed':
      handlePaymentFailed(event.data);
      break;
      
    case 'payment.cancelled':
      handlePaymentCancelled(event.data);
      break;
      
    default:
      console.log('Unknown event type:', event.type);
  }
  
  // Always return 200 OK quickly
  res.status(200).send('OK');
});

function handlePaymentCompleted(transaction) {
  // Update your database
  // Send confirmation email
  // Fulfill order
  // etc.
  console.log('Payment completed:', transaction.reference);
}

function handlePaymentFailed(transaction) {
  // Update your database
  // Send notification
  // etc.
  console.log('Payment failed:', transaction.reference);
}

function handlePaymentCancelled(transaction) {
  // Update your database
  // Send notification
  // etc.
  console.log('Payment cancelled:', transaction.reference);
}

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Step 3: Test Webhook

```typescript
// In Settings → Webhooks tab
1. Find your webhook
2. Click "Test" button
3. Check your endpoint receives test payload
4. Verify signature validation works
```

### Step 4: Monitor Deliveries

```typescript
// In Settings → Webhooks tab
1. Find your webhook
2. Click "View Logs"
3. See all delivery attempts
4. Check success/failure rates
5. Debug any issues
```

---

## 📊 Webhook Management UI

### Features

**List View**:
- ✅ All webhooks with status badges
- ✅ URL and subscribed events
- ✅ Masked secret (first 8 chars)
- ✅ Active/Inactive status

**Actions**:
- ✅ **Test** - Send test payload
- ✅ **View Logs** - See delivery history
- ✅ **Regenerate Secret** - Get new secret
- ✅ **Delete** - Remove webhook

**Create Modal**:
- ✅ URL input with validation
- ✅ Event checkboxes with descriptions
- ✅ Active toggle
- ✅ One-time secret display

**Delivery Logs**:
- ✅ Success/failure badges
- ✅ Event type and timestamp
- ✅ HTTP status codes
- ✅ Error messages
- ✅ Success rate stats

**Documentation**:
- ✅ Signature verification code
- ✅ Webhook headers list
- ✅ Best practices
- ✅ Security guidelines

---

## 🔍 Delivery Tracking

### Database Schema

```typescript
// webhook_deliveries table
{
  id: uuid;
  webhookConfigId: uuid;
  transactionId: uuid;
  event: string;
  payload: jsonb;
  response: jsonb;
  statusCode: number;
  success: boolean;
  errorMessage: string;
  attemptNumber: number;
  nextRetryAt: timestamp;
  createdAt: timestamp;
  deliveredAt: timestamp;
}
```

### Delivery Stats

```typescript
{
  total: number;
  successful: number;
  failed: number;
  successRate: string;  // e.g., "95.5%"
}
```

---

## 🛡️ Best Practices

### For Merchants

✅ **Always verify signatures** - Never trust unsigned webhooks  
✅ **Return 200 OK quickly** - Process async, don't block  
✅ **Use HTTPS only** - Never use HTTP endpoints  
✅ **Implement idempotency** - Check event IDs to prevent duplicates  
✅ **Handle retries gracefully** - Same event may arrive multiple times  
✅ **Log everything** - Keep webhook logs for debugging  
✅ **Monitor delivery rates** - Check logs regularly  
✅ **Rotate secrets periodically** - Use regenerate feature  

### For Platform

✅ **Generate strong secrets** - 64-character random hex  
✅ **Log all deliveries** - Success and failure  
✅ **Implement retries** - With exponential backoff  
✅ **Timeout requests** - 30 seconds max  
✅ **Mask secrets in UI** - Show only first 8 chars  
✅ **One-time secret display** - On creation/regeneration only  
✅ **Validate URLs** - Ensure HTTPS and valid format  
✅ **Rate limit** - Prevent abuse  

---

## 🚀 Usage Example

### Complete Flow

```typescript
// 1. Merchant creates webhook in dashboard
POST /api/webhooks
{
  "url": "https://merchant.com/webhooks/payment",
  "events": ["payment.completed", "payment.failed"],
  "isActive": true
}

Response:
{
  "success": true,
  "data": {
    "webhook": {
      "id": "webhook-uuid",
      "url": "https://merchant.com/webhooks/payment",
      "events": ["payment.completed", "payment.failed"],
      "secret": "abc123...xyz789",  // Save this!
      "isActive": true
    }
  }
}

// 2. Customer completes payment
// System automatically dispatches webhook

// 3. Webhook delivered to merchant
POST https://merchant.com/webhooks/payment
Headers:
  X-Webhook-Signature: hmac-sha256-signature
  X-Webhook-Timestamp: 1701234567890
  X-Webhook-ID: event-uuid
  X-Webhook-Event: payment.completed

Body:
{
  "id": "event-uuid",
  "type": "payment.completed",
  "data": {
    "id": "transaction-uuid",
    "reference": "ORDER-123",
    "amount": 100.50,
    "status": "completed",
    ...
  },
  "timestamp": "2024-12-02T10:00:00Z",
  "merchantId": "merchant-uuid"
}

// 4. Merchant verifies and processes
// Returns 200 OK

// 5. Delivery logged in database
// Merchant can view in dashboard
```

---

## 📚 API Reference

### Create Webhook

```typescript
POST /api/webhooks
Body: {
  url: string;              // HTTPS URL
  events: string[];         // Event types
  isActive?: boolean;       // Default: true
}
Response: {
  success: boolean;
  data: {
    webhook: {
      id: string;
      url: string;
      events: string[];
      secret: string;       // Full secret (one-time)
      isActive: boolean;
      createdAt: string;
    }
  }
}
```

### List Webhooks

```typescript
GET /api/webhooks
Response: {
  success: boolean;
  data: {
    webhooks: Webhook[];
    count: number;
  }
}
```

### Update Webhook

```typescript
PATCH /api/webhooks
Body: {
  webhookId: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
}
```

### Delete Webhook

```typescript
DELETE /api/webhooks?id=webhook-id
```

### Test Webhook

```typescript
POST /api/webhooks/test
Body: { webhookId: string }
Response: {
  success: boolean;
  data: {
    test: {
      success: boolean;
      statusCode?: number;
      responseTime?: number;
      errorMessage?: string;
    }
  }
}
```

### Regenerate Secret

```typescript
POST /api/webhooks/regenerate-secret
Body: { webhookId: string }
Response: {
  success: boolean;
  data: {
    webhookId: string;
    secret: string;  // New secret (one-time)
  }
}
```

### View Deliveries

```typescript
GET /api/webhooks/deliveries?webhookId=xxx&limit=50&offset=0
Response: {
  success: boolean;
  data: {
    deliveries: Delivery[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
    stats: {
      total: number;
      successful: number;
      failed: number;
      successRate: string;
    }
  }
}
```

---

## ✅ Summary

### What Was Built

**Complete Webhook System**:
- ✅ 4 API endpoints (CRUD + test + regenerate + deliveries)
- ✅ Event dispatcher with HMAC signatures
- ✅ Delivery tracking and logging
- ✅ Retry mechanism with exponential backoff
- ✅ Complete UI in settings page
- ✅ Security documentation
- ✅ Test functionality
- ✅ Secret management

**Security Features**:
- ✅ HMAC-SHA256 signatures
- ✅ 64-character random secrets
- ✅ Secret masking in UI
- ✅ One-time secret display
- ✅ HTTPS validation
- ✅ Signature verification guide

**Merchant Features**:
- ✅ Subscribe to specific events
- ✅ Test webhooks before going live
- ✅ View delivery logs
- ✅ Regenerate secrets anytime
- ✅ Enable/disable webhooks
- ✅ Multiple webhooks per merchant

**Platform Features**:
- ✅ Automatic event dispatching
- ✅ Delivery logging
- ✅ Retry with backoff
- ✅ Error tracking
- ✅ Success rate monitoring

---

**The webhook system is production-ready and fully secure!** 🎉

**Merchants can now**:
- Subscribe to payment events
- Receive real-time notifications
- Verify webhook authenticity
- Monitor delivery success

**Implementation Date**: December 2, 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
