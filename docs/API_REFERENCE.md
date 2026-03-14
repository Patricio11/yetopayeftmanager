# YETOPAYEFT API Reference

**Version:** 1.0.0  
**Base URL:** `https://your-domain.com` or `http://localhost:3000`  
**Protocol:** HTTPS (Production) / HTTP (Development)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Security](#security)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [Payment Links](#payment-links)
   - [Transactions](#transactions)
   - [Webhooks](#webhooks)
7. [Webhook Integration](#webhook-integration)
8. [Code Examples](#code-examples)
9. [Testing](#testing)

---

## Overview

YETOPAYEFT provides a secure REST API for creating and managing EFT (Electronic Funds Transfer) payment links. The API uses JSON for request and response bodies.

### Key Features
- ✅ Token-based payment links with cryptographic security
- ✅ Automatic expiration (24 hours default, up to 7 days)
- ✅ Webhook notifications for payment status
- ✅ Complete transaction history
- ✅ Bank credential tokenization for repeat payments
- ✅ Real-time payment tracking

### Supported Banks
- FNB (First National Bank)
- Standard Bank
- ABSA
- Nedbank
- Capitec

---

## Authentication

YETOPAYEFT supports **two authentication methods**:

### 1. API Key Authentication (Recommended for Production)

**Best for**: Server-to-server integrations, production applications

✅ **Long-lived** - No expiration  
✅ **Secure** - HMAC signature verification  
✅ **Standard** - Industry-standard approach  
✅ **Scalable** - Perfect for high-volume

**Required Headers:**
```http
Authorization: Bearer yp_live_abc123...
X-Merchant-ID: your-merchant-uuid
X-Timestamp: 1638360000
X-Signature: sha256=hmac-signature
```

**See complete guide**: [`API_KEY_AUTHENTICATION.md`](API_KEY_AUTHENTICATION.md)

**Quick Example:**
```javascript
const crypto = require('crypto');

// Generate signature
const timestamp = Math.floor(Date.now() / 1000).toString();
const payload = merchantId + timestamp + JSON.stringify(requestBody);
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(payload)
  .digest('hex');

// Make request
fetch('/api/payment-links', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'X-Merchant-ID': merchantId,
    'X-Timestamp': timestamp,
    'X-Signature': `sha256=${signature}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});
```

---

### 2. Session-Based Authentication

**Best for**: Dashboard UI, web applications

⚠️ **Expires in 15 minutes**  
⚠️ **Cookie-based**  
⚠️ **Not suitable for server-to-server**

#### Login

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "merchanteft@yetopayeft.com",
  "password": "Merchant@123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "merchanteft@yetopayeft.com",
    "name": "John Merchant",
    "role": "merchant"
  },
  "session": {
    "token": "session-token",
    "expiresAt": "2024-12-01T15:00:00Z"
  }
}
```

#### Get Current Session

```http
GET /api/auth/session
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "merchanteft@yetopayeft.com",
    "name": "John Merchant",
    "role": "merchant"
  },
  "session": {
    "expiresAt": "2024-12-01T15:00:00Z"
  }
}
```

#### Logout

```http
POST /api/auth/sign-out
```

**Response:**
```json
{
  "success": true
}
```

---

### Which Method to Use?

| Use Case | Method | Why |
|----------|--------|-----|
| Production API integration | **API Key** | Long-lived, secure, standard |
| Dashboard/Web UI | **Session** | Browser-friendly, auto-managed |
| Mobile app backend | **API Key** | Server-to-server |
| Testing/Development | **Either** | Both work |

---

## Security

### Payment Token Security

Payment links use cryptographically secure tokens:

1. **Generation**: 32-byte random tokens via `crypto.randomBytes()`
2. **Storage**: SHA-256 hashed in database
3. **Format**: URL-safe base64 encoding
4. **Expiration**: Configurable (default 24h, max 7 days)
5. **Rate Limiting**: Max 10 access attempts per token
6. **Tracking**: IP address and User-Agent logged
7. **Revocable**: Merchants can cancel anytime

### HTTPS Requirements

**Production:** All API requests MUST use HTTPS  
**Development:** HTTP allowed on localhost only

### CORS Policy

```
Access-Control-Allow-Origin: https://your-frontend-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Rate Limiting

### Global Limits
- **Authenticated requests**: 100 requests/minute
- **Payment token access**: 10 attempts per token
- **Webhook delivery**: 5 retries with exponential backoff

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

### Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {} // Optional additional details
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Errors

#### Validation Error
```json
{
  "error": "Validation error",
  "message": "Invalid request data",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be at least 1"
    }
  ]
}
```

#### Authentication Error
```json
{
  "error": "Unauthorized",
  "message": "Please sign in to access this resource"
}
```

#### Token Error
```json
{
  "error": "Invalid token",
  "message": "This payment link has expired"
}
```

---

## Endpoints

### Authentication Endpoints

#### Register New Merchant

```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "SecurePass123!",
  "name": "John Merchant"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "merchant@example.com",
    "name": "John Merchant",
    "role": "merchant",
    "emailVerified": false
  }
}
```

---

### Payment Links

#### Create Payment Link

```http
POST /api/payment-links
Content-Type: application/json
Cookie: better-auth.session_token=...

{
  "amount": 250.00,
  "reference": "INV-2024-001",
  "description": "Payment for services rendered",
  "customerEmail": "customer@example.com",
  "customerName": "Jane Customer",
  "notifyUrl": "https://your-domain.com/webhooks/payment",
  "successUrl": "https://your-domain.com/payment/success",
  "failureUrl": "https://your-domain.com/payment/failed",
  "cancelledUrl": "https://your-domain.com/payment/cancelled",
  "expiresInHours": 48,
  "metadata": {
    "orderId": "ORD-12345",
    "customField": "value"
  }
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | ✅ | Payment amount (min: 1.00) |
| reference | string | ✅ | Unique reference (max: 255 chars) |
| description | string | ❌ | Payment description (max: 500 chars) |
| customerEmail | string | ❌ | Customer email address |
| customerName | string | ❌ | Customer full name |
| notifyUrl | string | ❌ | Webhook URL for status updates |
| successUrl | string | ❌ | Redirect URL on success |
| failureUrl | string | ❌ | Redirect URL on failure |
| cancelledUrl | string | ❌ | Redirect URL on cancellation |
| expiresInHours | number | ❌ | Link expiry (default: 24, max: 168) |
| metadata | object | ❌ | Custom key-value pairs |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payment link created successfully",
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentUrl": "https://your-domain.com/pay/abc123xyz789...token...",
    "token": "abc123xyz789...token...",
    "reference": "INV-2024-001",
    "amount": 250.00,
    "expiresAt": "2024-12-03T15:00:00Z",
    "status": "not_started",
    "createdAt": "2024-12-01T15:00:00Z"
  }
}
```

**Example cURL:**
```bash
curl -X POST https://your-domain.com/api/payment-links \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "amount": 250.00,
    "reference": "INV-2024-001",
    "customerEmail": "customer@example.com",
    "notifyUrl": "https://your-domain.com/webhooks/payment"
  }'
```

---

#### List Payment Links

```http
GET /api/payment-links?limit=50&offset=0&status=completed&from=2024-12-01
Cookie: better-auth.session_token=...
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | ❌ | Results per page (default: 50, max: 100) |
| offset | number | ❌ | Pagination offset (default: 0) |
| status | string | ❌ | Filter by status |
| from | string | ❌ | Filter from date (ISO 8601) |

**Status Values:**
- `not_started` - Payment link created, not accessed
- `initiated` - Customer started payment process
- `completed` - Payment successful
- `failed` - Payment failed
- `cancelled` - Payment cancelled by customer
- `aborted` - Payment aborted
- `expired` - Payment link expired

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "merchantId": "merchant-uuid",
      "amount": 250.00,
      "reference": "INV-2024-001",
      "description": "Payment for services",
      "customerEmail": "customer@example.com",
      "customerName": "Jane Customer",
      "status": "completed",
      "createdAt": "2024-12-01T15:00:00Z",
      "completedAt": "2024-12-01T15:30:00Z",
      "notifyUrl": "https://your-domain.com/webhooks/payment",
      "successUrl": "https://your-domain.com/payment/success",
      "metadata": {
        "orderId": "ORD-12345"
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

---

### Transactions

#### Get Merchant Transactions

```http
GET /api/merchant/transactions?status=completed&limit=20&offset=0
Cookie: better-auth.session_token=...
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | ❌ | Filter by status |
| limit | number | ❌ | Results per page (default: 50, max: 100) |
| offset | number | ❌ | Pagination offset |
| from | string | ❌ | Start date (ISO 8601) |
| to | string | ❌ | End date (ISO 8601) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "merchantId": "merchant-uuid",
      "amount": "250.00",
      "reference": "INV-2024-001",
      "status": "completed",
      "customerEmail": "customer@example.com",
      "customerName": "Jane Customer",
      "createdAt": "2024-12-01T15:00:00Z",
      "completedAt": "2024-12-01T15:30:00Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get Transaction by ID or Reference

```http
GET /api/merchant/transactions/{id}
Authorization: Bearer yp_live_...
```

Look up a single transaction by its UUID or reference string. Only returns transactions belonging to the authenticated merchant.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | ✅ | Transaction UUID or reference string |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "amount": "250.00",
    "reference": "INV-2024-001",
    "description": "Order #1234",
    "customerEmail": "customer@example.com",
    "customerName": "Jane Doe",
    "failureReason": null,
    "statusReason": null,
    "bank": { "name": "FNB", "code": "fnb" },
    "createdAt": "2024-12-01T15:00:00Z",
    "updatedAt": "2024-12-01T15:30:00Z",
    "completedAt": "2024-12-01T15:30:00Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Transaction not found"
}
```

---

### Webhooks

#### Webhook Endpoint (Your Server)

YETOPAYEFT will send POST requests to your `notifyUrl` when payment status changes.

**Webhook Payload:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "reference": "INV-2024-001",
  "amount": 250.00,
  "status": "completed",
  "timestamp": "2024-12-01T15:30:00Z",
  "gateway_result": "success",
  "message": "Payment completed successfully"
}
```

**Headers:**
```
Content-Type: application/json
X-YETOPAYEFT-Signature: sha256-hash-of-payload
```

**Status Values:**
- `completed` - Payment successful
- `failed` - Payment failed
- `cancelled` - Payment cancelled
- `aborted` - Payment aborted

**Your Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "received": true
}
```

---

## Webhook Integration

### Verifying Webhook Signatures

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256-${expectedSignature}` === signature;
}

// Usage
app.post('/webhooks/payment', (req, res) => {
  const signature = req.headers['x-yetopayeft-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  const { transaction_id, status, amount } = req.body;
  
  // Update your database
  // Send confirmation email
  // etc.
  
  res.json({ received: true });
});
```

### Webhook Retry Logic

If your webhook endpoint fails, YETOPAYEFT will retry:
- **Retry 1**: After 1 minute
- **Retry 2**: After 5 minutes
- **Retry 3**: After 15 minutes
- **Retry 4**: After 1 hour
- **Retry 5**: After 6 hours

**Total attempts**: 5  
**Timeout**: 30 seconds per attempt

### Webhook Best Practices

1. ✅ **Respond quickly** (< 5 seconds)
2. ✅ **Return 200 OK** immediately
3. ✅ **Process asynchronously** (use queue)
4. ✅ **Verify signatures** always
5. ✅ **Handle duplicates** (idempotency)
6. ✅ **Log all webhooks** for debugging

---

## Code Examples

### Node.js / Express

```javascript
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Create payment link
app.post('/create-payment', async (req, res) => {
  try {
    const response = await fetch('https://your-domain.com/api/payment-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `better-auth.session_token=${req.cookies.sessionToken}`
      },
      body: JSON.stringify({
        amount: 250.00,
        reference: 'INV-2024-001',
        customerEmail: 'customer@example.com',
        notifyUrl: 'https://your-domain.com/webhooks/payment'
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle webhook
app.post('/webhooks/payment', (req, res) => {
  const { transaction_id, status, amount } = req.body;
  
  console.log(`Payment ${transaction_id}: ${status} - R${amount}`);
  
  // Update your database
  // Send email notification
  
  res.json({ received: true });
});

app.listen(3000);
```

### Python / Flask

```python
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/create-payment', methods=['POST'])
def create_payment():
    response = requests.post(
        'https://your-domain.com/api/payment-links',
        json={
            'amount': 250.00,
            'reference': 'INV-2024-001',
            'customerEmail': 'customer@example.com',
            'notifyUrl': 'https://your-domain.com/webhooks/payment'
        },
        cookies={'better-auth.session_token': request.cookies.get('sessionToken')}
    )
    
    return jsonify(response.json())

@app.route('/webhooks/payment', methods=['POST'])
def webhook_payment():
    data = request.json
    transaction_id = data['transaction_id']
    status = data['status']
    amount = data['amount']
    
    print(f'Payment {transaction_id}: {status} - R{amount}')
    
    # Update database
    # Send email
    
    return jsonify({'received': True})

if __name__ == '__main__':
    app.run(port=3000)
```

### PHP / Laravel

```php
<?php

use Illuminate\Support\Facades\Http;

// Create payment link
Route::post('/create-payment', function (Request $request) {
    $response = Http::withCookies([
        'better-auth.session_token' => $request->cookie('sessionToken')
    ])->post('https://your-domain.com/api/payment-links', [
        'amount' => 250.00,
        'reference' => 'INV-2024-001',
        'customerEmail' => 'customer@example.com',
        'notifyUrl' => 'https://your-domain.com/webhooks/payment'
    ]);
    
    return $response->json();
});

// Handle webhook
Route::post('/webhooks/payment', function (Request $request) {
    $transactionId = $request->input('transaction_id');
    $status = $request->input('status');
    $amount = $request->input('amount');
    
    Log::info("Payment {$transactionId}: {$status} - R{$amount}");
    
    // Update database
    // Send email
    
    return response()->json(['received' => true]);
});
```

---

## Testing

### Test Credentials

```
Admin:
  Email: admineft@yetopayeft.com
  Password: Admin@123456

Merchant 1:
  Email: merchanteft@yetopayeft.com
  Password: Merchant@123

Merchant 2:
  Email: saraheft@techstore.com
  Password: Sarah@123456
```

### Test Payment Flow

1. **Create test payment link:**
```bash
curl -X POST http://localhost:3000/api/payment-links \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -d '{
    "amount": 100.00,
    "reference": "TEST-001",
    "customerEmail": "test@example.com"
  }'
```

2. **Open payment URL** in browser
3. **Select bank** (e.g., FNB)
4. **Complete payment** flow
5. **Check webhook** received

### Webhook Testing

Use tools like:
- **ngrok**: Expose localhost to internet
- **webhook.site**: Test webhook receiver
- **Postman**: Mock webhook requests

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000

# Use ngrok URL as notifyUrl
https://abc123.ngrok.io/webhooks/payment
```

---

## Appendix

### Payment Link Lifecycle

```
not_started → initiated → completed
                       ↓
                    failed
                       ↓
                   cancelled
                       ↓
                    aborted
                       ↓
                    expired
```

### Transaction Metadata

Custom metadata is preserved throughout the payment lifecycle:

```json
{
  "metadata": {
    "orderId": "ORD-12345",
    "customerId": "CUST-789",
    "department": "Sales",
    "notes": "Urgent order"
  }
}
```

### Security Checklist

- ✅ Use HTTPS in production
- ✅ Verify webhook signatures
- ✅ Store session tokens securely
- ✅ Implement rate limiting
- ✅ Validate all inputs
- ✅ Log security events
- ✅ Monitor for suspicious activity
- ✅ Keep dependencies updated

---

**Last Updated**: December 2024  
**API Version**: 1.0.0  
**Support**: support@yetopayeft.com
