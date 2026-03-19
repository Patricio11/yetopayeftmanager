# 🚀 API Documentation Update Plan

**Comprehensive update to include SDK integration, Direct API integration, and Webhooks section**

---

## 🎯 Objectives

1. ✅ Add **Integration Flows** section (SDK vs Direct API)
2. ✅ Update **Quick Start** with both integration methods
3. ✅ Add comprehensive **Webhooks** section
4. ✅ Improve navigation and user experience
5. ✅ Add code examples for both flows

---

## 📋 New Sections to Add

### **1. Integration Flows Section** (New)

**Location**: After hero, before Quick Start

**Content**:
- Two integration options: SDK and Direct API
- Side-by-side comparison cards
- Step-by-step guides for each method
- Pros/cons for each approach

**SDK Flow**:
```
1. Install SDK: npm install @fyropay/sdk
2. Initialize client with API key
3. Create payment with one method call
4. Benefits: Type-safe, error handling, webhook verification
```

**Direct API Flow**:
```
1. Get API key from settings
2. Make HTTP POST to /api/payment-tokens
3. Handle response manually
4. Benefits: Any language, no dependencies, full control
```

---

### **2. Enhanced Quick Start**

**Updates**:
- Add tab/toggle for SDK vs Direct API
- Show installation steps for SDK
- Show HTTP request examples for Direct API
- Language selector for Direct API (Node, Python, PHP, cURL)

**SDK Example** (TypeScript):
```typescript
import { FyroPayEFTClient } from '@fyropay/sdk';

const client = new FyroPayEFTClient({
  apiKey: process.env.YETOPAY_API_KEY,
});

const payment = await client.createPaymentToken({
  amount: 100.50,
  reference: 'ORDER-12345',
  customerEmail: 'customer@example.com',
});

// Redirect to: payment.paymentUrl
```

**Direct API Example** (Node.js):
```javascript
const axios = require('axios');

const response = await axios.post('https://fyropay.com/api/payment-tokens', {
  amount: 100.50,
  reference: 'ORDER-12345',
  customerEmail: 'customer@example.com'
}, {
  headers: {
    'X-API-Key': process.env.YETOPAY_API_KEY,
    'Content-Type': 'application/json'
  }
});

const paymentUrl = response.data.data.paymentUrl;
```

---

### **3. Comprehensive Webhooks Section** (New)

**Location**: After API Endpoints

**Subsections**:

#### **A. What are Webhooks?**
- Real-time event notifications
- Automatic updates when payments complete/fail
- Secure HMAC-SHA256 signatures

#### **B. Setting Up Webhooks**
```
1. Go to Settings → Webhooks
2. Click "Add Webhook"
3. Enter your endpoint URL (HTTPS only)
4. Select events to subscribe
5. Save the webhook secret (shown once!)
```

#### **C. Available Events**
| Event | Description |
|-------|-------------|
| `payment.completed` | Payment successfully completed |
| `payment.failed` | Payment failed |
| `payment.cancelled` | Payment cancelled by customer |
| `payment.pending` | Payment pending verification |
| `transaction.created` | New transaction created |
| `transaction.updated` | Transaction updated |

#### **D. Webhook Payload Structure**
```json
{
  "id": "event-uuid",
  "type": "payment.completed",
  "data": {
    "id": "transaction-uuid",
    "reference": "ORDER-123",
    "amount": 100.50,
    "status": "completed",
    "customerEmail": "customer@example.com",
    ...
  },
  "timestamp": "2024-12-02T10:00:00Z",
  "merchantId": "merchant-uuid"
}
```

#### **E. Webhook Headers**
```
X-Webhook-Signature: <hmac-sha256-signature>
X-Webhook-Timestamp: <unix-timestamp>
X-Webhook-ID: <unique-event-id>
X-Webhook-Event: <event-type>
```

#### **F. Verifying Webhook Signatures**

**Using SDK**:
```typescript
import { FyroPayEFTClient } from '@fyropay/sdk';

const client = new FyroPayEFTClient({ apiKey: 'your-key' });

app.post('/webhooks/payment', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.WEBHOOK_SECRET;

  const isValid = client.verifyWebhookSignature(payload, signature, secret);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.status(200).send('OK');
});
```

**Without SDK** (Node.js):
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

**Python**:
```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/payment', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)
    
    if not verify_signature(payload, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401
    
    # Process webhook...
    return 'OK', 200
```

**PHP**:
```php
<?php
function verifySignature($payload, $signature, $secret) {
    $expectedSignature = hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expectedSignature);
}

$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$payload = file_get_contents('php://input');

if (!verifySignature($payload, $signature, WEBHOOK_SECRET)) {
    http_response_code(401);
    exit('Invalid signature');
}

// Process webhook...
http_response_code(200);
echo 'OK';
?>
```

#### **G. Handling Webhook Events**

**Complete Example** (Express.js):
```javascript
app.post('/webhooks/payment', (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifySignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // 2. Get event data
  const event = req.body;
  
  // 3. Handle different event types
  switch (event.type) {
    case 'payment.completed':
      // Update order status
      // Send confirmation email
      // Fulfill order
      handlePaymentCompleted(event.data);
      break;
      
    case 'payment.failed':
      // Update order status
      // Send notification
      handlePaymentFailed(event.data);
      break;
      
    case 'payment.cancelled':
      // Update order status
      handlePaymentCancelled(event.data);
      break;
  }
  
  // 4. Always return 200 OK quickly
  res.status(200).send('OK');
});
```

#### **H. Testing Webhooks**
```
1. Go to Settings → Webhooks
2. Find your webhook
3. Click "Test" button
4. Check your endpoint receives test payload
5. Verify signature validation works
```

#### **I. Webhook Best Practices**
✅ **Always verify signatures** - Never trust unsigned webhooks  
✅ **Return 200 OK quickly** - Process async, don't block  
✅ **Use HTTPS only** - Never use HTTP endpoints  
✅ **Implement idempotency** - Check event IDs to prevent duplicates  
✅ **Handle retries gracefully** - Same event may arrive multiple times  
✅ **Log everything** - Keep webhook logs for debugging  

#### **J. Retry Policy**
- Max 3 retries
- Exponential backoff (1min, 2min, 4min)
- Retries on network errors and 5xx responses
- No retry on 401, 403, 404

---

## 🎨 UI/UX Improvements

### **Navigation Updates**
Add to sidebar:
- Integration Flows (new)
- Webhooks (new)

### **Hero Section Updates**
Add buttons:
- "Integration Flows" → Scrolls to integration section
- "Setup Webhooks" → Navigates to Settings → Webhooks tab

### **Visual Enhancements**
- Color-coded sections (SDK = green, Direct API = blue, Webhooks = purple)
- Step-by-step numbered guides
- Comparison cards with checkmarks
- Code blocks with copy buttons
- Badge indicators (Recommended, Flexible, etc.)

---

## 📊 Content Structure

```
API Documentation
├── Hero Section
│   ├── Integration Flows button (new)
│   ├── Quick Start button
│   ├── Get API Keys button
│   └── Setup Webhooks button (new)
│
├── Sidebar Navigation
│   ├── Integration Flows (new)
│   ├── Quick Start
│   ├── Authentication
│   ├── API Endpoints
│   ├── Webhooks (new)
│   ├── Error Handling
│   └── Testing
│
├── Integration Flows Section (new)
│   ├── SDK Integration Card
│   │   ├── Benefits
│   │   ├── Installation
│   │   ├── Initialization
│   │   └── Usage Example
│   └── Direct API Card
│       ├── Benefits
│       ├── HTTP Request
│       └── Response Handling
│
├── Quick Start Section (enhanced)
│   ├── SDK Tab
│   │   ├── npm install
│   │   ├── Import & initialize
│   │   └── Create payment
│   └── Direct API Tab
│       ├── Language selector
│       ├── HTTP examples
│       └── Response parsing
│
├── Authentication Section
│   └── (existing content)
│
├── API Endpoints Section
│   └── (existing content)
│
├── Webhooks Section (new)
│   ├── What are Webhooks?
│   ├── Setting Up Webhooks
│   ├── Available Events
│   ├── Payload Structure
│   ├── Webhook Headers
│   ├── Signature Verification
│   │   ├── SDK Method
│   │   ├── Node.js
│   │   ├── Python
│   │   └── PHP
│   ├── Handling Events
│   ├── Testing Webhooks
│   ├── Best Practices
│   └── Retry Policy
│
├── Error Handling Section
│   └── (existing content)
│
└── Testing Section
    └── (existing content)
```

---

## 🔧 Implementation Steps

### **Step 1: Update Imports**
Add new icons:
```typescript
import { Package, Layers, Download } from "lucide-react";
```

### **Step 2: Add State Management**
```typescript
const [integrationFlow, setIntegrationFlow] = useState<"sdk" | "direct">("sdk");
```

### **Step 3: Update Hero Section**
Add new buttons for Integration Flows and Setup Webhooks

### **Step 4: Update Sidebar**
Add Integration Flows and Webhooks to navigation

### **Step 5: Create Integration Flows Component**
New component with SDK vs Direct API comparison

### **Step 6: Enhance Quick Start Component**
Add tabs for SDK and Direct API with code examples

### **Step 7: Create Webhooks Component**
Comprehensive webhook documentation with all subsections

### **Step 8: Add Helper Functions**
- `getSDKCode()`
- `getDirectAPICode(language)`
- `getWebhookVerificationCode(language)`
- `getWebhookHandlerCode(language)`

---

## ✅ Success Criteria

- [ ] Integration Flows section displays SDK and Direct API options
- [ ] Users can toggle between SDK and Direct API examples
- [ ] Quick Start shows appropriate code for selected flow
- [ ] Webhooks section is comprehensive and clear
- [ ] All code examples are copy-pasteable
- [ ] Signature verification examples for all languages
- [ ] Navigation includes new sections
- [ ] Hero buttons navigate correctly
- [ ] Mobile responsive
- [ ] All links work

---

## 📚 Reference Documents

- `SDK_IMPLEMENTATION.md` - SDK details
- `WEBHOOK_SYSTEM.md` - Webhook system details
- `sdk/README.md` - SDK usage guide
- `sdk/examples/` - SDK code examples

---

## 🎯 Key Messages

### **For SDK Users**:
"Get started in 5 minutes with our TypeScript SDK. Type-safe, error handling included, webhook verification built-in."

### **For Direct API Users**:
"Use our REST API with any language. Standard HTTP requests, full control, no dependencies required."

### **For Webhook Users**:
"Receive real-time notifications when payments complete. Secure HMAC signatures, automatic retries, comprehensive logging."

---

**This update will make the API documentation the most comprehensive and user-friendly payment API docs!** 🚀

**Implementation Date**: December 2, 2024  
**Status**: Ready to implement  
**Estimated Time**: 2-3 hours for complete implementation
