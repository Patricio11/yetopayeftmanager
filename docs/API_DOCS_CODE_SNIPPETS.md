# 📝 API Documentation - Code Snippets Reference

**All code examples for the updated API documentation**

---

## 🎯 SDK Integration Examples

### **Installation**
```bash
npm install @yetopayeft/sdk
```

### **Basic Usage** (TypeScript/JavaScript)
```typescript
import { YetoPayEFTClient } from '@yetopayeft/sdk';

// Initialize client
const client = new YetoPayEFTClient({
  apiKey: process.env.YETOPAY_API_KEY,
});

// Create payment
const payment = await client.createPaymentToken({
  amount: 100.50,
  reference: 'ORDER-12345',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
});

// Redirect customer
console.log('Payment URL:', payment.paymentUrl);
// Redirect to: payment.paymentUrl
```

### **With All Options**
```typescript
const payment = await client.createPaymentToken({
  amount: 250.00,
  reference: 'INV-2024-001',
  customerEmail: 'john@example.com',
  customerName: 'John Doe',
  customerPhone: '+27123456789',
  metadata: {
    orderId: '12345',
    productName: 'Premium Subscription',
  },
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
  webhookUrl: 'https://yoursite.com/webhooks/payment',
  expiryMinutes: 60,
});
```

### **Get Payment Status**
```typescript
const token = await client.getPaymentToken('token-id');
console.log('Status:', token.status);
```

### **List Transactions**
```typescript
const result = await client.listTransactions({
  page: 1,
  limit: 20,
  status: 'completed',
});

console.log(`Found ${result.pagination.total} transactions`);
```

### **Get Banks**
```typescript
const banks = await client.getBanks();
banks.forEach(bank => {
  console.log(`${bank.name} (${bank.code})`);
});
```

---

## 🌐 Direct API Integration Examples

### **Node.js** (axios)
```javascript
const axios = require('axios');

const response = await axios.post('https://yetopayeft.com/api/payment-tokens', {
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
console.log('Redirect to:', paymentUrl);
```

### **Python** (requests)
```python
import requests
import os

response = requests.post('https://yetopayeft.com/api/payment-tokens', 
  json={
    'amount': 100.50,
    'reference': 'ORDER-12345',
    'customerEmail': 'customer@example.com'
  },
  headers={
    'X-API-Key': os.environ['YETOPAY_API_KEY'],
    'Content-Type': 'application/json'
  }
)

payment_url = response.json()['data']['paymentUrl']
print(f'Redirect to: {payment_url}')
```

### **PHP** (cURL)
```php
<?php
$ch = curl_init('https://yetopayeft.com/api/payment-tokens');

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  'amount' => 100.50,
  'reference' => 'ORDER-12345',
  'customerEmail' => 'customer@example.com'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'X-API-Key: ' . getenv('YETOPAY_API_KEY'),
  'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);

$paymentUrl = $data['data']['paymentUrl'];
echo "Redirect to: $paymentUrl";
?>
```

### **cURL** (Command Line)
```bash
curl -X POST https://yetopayeft.com/api/payment-tokens \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.50,
    "reference": "ORDER-12345",
    "customerEmail": "customer@example.com"
  }'
```

---

## 🔔 Webhook Integration Examples

### **Webhook Signature Verification - SDK**
```typescript
import { YetoPayEFTClient } from '@yetopayeft/sdk';

const client = new YetoPayEFTClient({ apiKey: 'your-key' });

app.post('/webhooks/payment', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.WEBHOOK_SECRET;

  const isValid = client.verifyWebhookSignature(payload, signature, secret);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  const event = req.body;
  console.log('Event:', event.type);
  
  res.status(200).send('OK');
});
```

### **Webhook Signature Verification - Node.js**
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
  
  if (!verifySignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
  res.status(200).send('OK');
});
```

### **Webhook Signature Verification - Python**
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
    event = request.get_json()
    print(f'Event: {event["type"]}')
    
    return 'OK', 200
```

### **Webhook Signature Verification - PHP**
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
$event = json_decode($payload, true);
error_log('Event: ' . $event['type']);

http_response_code(200);
echo 'OK';
?>
```

### **Complete Webhook Handler** (Express.js)
```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

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
  // 1. Verify signature
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifySignature(payload, signature, secret)) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }
  
  // 2. Get event data
  const event = req.body;
  
  console.log('Webhook received:', event.type);
  console.log('Transaction ID:', event.data.id);
  
  // 3. Handle different event types
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
  
  // 4. Always return 200 OK quickly
  res.status(200).send('OK');
});

function handlePaymentCompleted(transaction) {
  // Update your database
  // Send confirmation email
  // Fulfill order
  console.log('Payment completed:', transaction.reference);
}

function handlePaymentFailed(transaction) {
  // Update your database
  // Send notification
  console.log('Payment failed:', transaction.reference);
}

function handlePaymentCancelled(transaction) {
  // Update your database
  // Send notification
  console.log('Payment cancelled:', transaction.reference);
}

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

---

## 📦 Webhook Payload Example

```json
{
  "id": "evt_abc123xyz789",
  "type": "payment.completed",
  "data": {
    "id": "txn_def456uvw012",
    "reference": "ORDER-12345",
    "amount": 100.50,
    "status": "completed",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "bankName": "FNB",
    "bankAccountNumber": "****1234",
    "proofOfPaymentUrl": "https://yetopayeft.com/proofs/abc123.pdf",
    "metadata": {
      "orderId": "12345",
      "productName": "Premium Subscription"
    },
    "createdAt": "2024-12-02T10:00:00Z",
    "updatedAt": "2024-12-02T10:05:00Z",
    "completedAt": "2024-12-02T10:05:00Z"
  },
  "timestamp": "2024-12-02T10:05:00Z",
  "merchantId": "mch_ghi789jkl345"
}
```

---

## 🔐 Authentication Examples

### **API Key Header**
```
X-API-Key: sk_live_abc123xyz789...
```

### **Example Request with Authentication**
```bash
curl -X GET https://yetopayeft.com/api/transactions \
  -H "X-API-Key: sk_live_abc123xyz789..." \
  -H "Content-Type: application/json"
```

---

## 📊 API Response Examples

### **Success Response**
```json
{
  "success": true,
  "data": {
    "id": "tok_abc123",
    "token": "pay_xyz789",
    "paymentUrl": "https://yetopayeft.com/pay/pay_xyz789",
    "amount": 100.50,
    "reference": "ORDER-12345",
    "status": "active",
    "expiresAt": "2024-12-02T11:00:00Z",
    "createdAt": "2024-12-02T10:00:00Z"
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount must be greater than 0",
    "details": {
      "field": "amount",
      "value": -10
    }
  }
}
```

---

## 🧪 Testing Examples

### **Test Payment Creation**
```typescript
// SDK
const payment = await client.createPaymentToken({
  amount: 1.00,
  reference: 'TEST-' + Date.now(),
  customerEmail: 'test@example.com',
});

console.log('Test payment URL:', payment.paymentUrl);
```

### **Test Webhook Endpoint**
```bash
# From Settings → Webhooks → Test button
# Or manually:
curl -X POST https://your-website.com/webhooks/payment \
  -H "X-Webhook-Signature: <signature>" \
  -H "X-Webhook-Timestamp: $(date +%s)" \
  -H "X-Webhook-ID: test-event-id" \
  -H "X-Webhook-Event: payment.completed" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-event-id",
    "type": "payment.completed",
    "data": {
      "id": "test-transaction-id",
      "reference": "TEST-WEBHOOK",
      "amount": 100,
      "status": "completed",
      "test": true
    },
    "timestamp": "2024-12-02T10:00:00Z",
    "merchantId": "test-merchant-id"
  }'
```

---

## 🎯 Quick Reference

### **SDK Installation**
```bash
npm install @yetopayeft/sdk
```

### **SDK Import**
```typescript
import { YetoPayEFTClient } from '@yetopayeft/sdk';
```

### **API Base URL**
```
https://yetopayeft.com/api
```

### **Webhook Headers**
```
X-Webhook-Signature
X-Webhook-Timestamp
X-Webhook-ID
X-Webhook-Event
```

### **Available Events**
- `payment.completed`
- `payment.failed`
- `payment.cancelled`
- `payment.pending`
- `transaction.created`
- `transaction.updated`

---

**All code snippets are production-ready and copy-pasteable!** 🚀

**Last Updated**: December 2, 2024
