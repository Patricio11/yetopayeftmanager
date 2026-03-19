# API Key Authentication Guide

**Industry-standard server-to-server authentication for merchant integrations**

---

## Table of Contents

1. [Overview](#overview)
2. [Getting API Keys](#getting-api-keys)
3. [Authentication Flow](#authentication-flow)
4. [Making Authenticated Requests](#making-authenticated-requests)
5. [Code Examples](#code-examples)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Why API Keys?

✅ **Server-to-Server**: No browser/session required  
✅ **Long-lived**: No 15-minute expiration  
✅ **Secure**: HMAC signature verification  
✅ **Standard**: Industry-standard approach  
✅ **Scalable**: Perfect for high-volume integrations

### Authentication Methods

| Method | Use Case | Expiry | Best For |
|--------|----------|--------|----------|
| **API Key** | Server-to-server | Never (unless revoked) | Production integrations |
| **Session** | Dashboard UI | 15 minutes | Web applications |

---

## Getting API Keys

### Step 1: Login to Dashboard

```bash
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "merchanteft@fyropay.com",
  "password": "Merchant@123"
}
```

### Step 2: Create API Key

```bash
POST /api/merchant/api-keys
Content-Type: application/json
Cookie: better-auth.session_token=...

{
  "name": "Production Server",
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "apiKey": "yp_live_abc123def456...",
    "apiSecret": "base64url-secret-string...",
    "keyPrefix": "yp_live_abc123...",
    "createdAt": "2024-12-01T15:00:00Z",
    "warning": "Store these credentials securely. They will not be shown again."
  }
}
```

⚠️ **IMPORTANT**: Save both `apiKey` and `apiSecret` immediately. They will **never** be shown again!

### Step 3: Store Securely

```bash
# Environment variables (recommended)
YETOPAY_API_KEY=yp_live_abc123def456...
YETOPAY_API_SECRET=base64url-secret-string...
YETOPAY_MERCHANT_ID=your-merchant-uuid
```

---

## Authentication Flow

### Request Signature Process

```
1. Prepare Request
   ├─ merchantId
   ├─ timestamp (Unix)
   └─ requestBody (JSON string)

2. Generate Signature
   payload = merchantId + timestamp + requestBody
   signature = HMAC-SHA256(payload, apiSecret)
   
3. Send Request
   Headers:
   ├─ Authorization: Bearer {apiKey}
   ├─ X-Merchant-ID: {merchantId}
   ├─ X-Timestamp: {timestamp}
   └─ X-Signature: sha256={signature}
```

### Server Verification

```
1. Extract Headers
   ├─ API Key from Authorization
   ├─ Merchant ID from X-Merchant-ID
   ├─ Timestamp from X-Timestamp
   └─ Signature from X-Signature

2. Validate Timestamp
   ├─ Check not older than 5 minutes
   └─ Prevent replay attacks

3. Verify API Key
   ├─ Hash provided key
   ├─ Lookup in database
   └─ Check active & not expired

4. Verify Signature
   ├─ Recreate payload
   ├─ Generate expected signature
   └─ Compare (constant-time)

5. Check Permissions
   └─ Ensure key has required permission
```

---

## Making Authenticated Requests

### Required Headers

```http
Authorization: Bearer yp_live_abc123def456...
X-Merchant-ID: 550e8400-e29b-41d4-a716-446655440000
X-Timestamp: 1638360000
X-Signature: sha256=abcdef123456...
Content-Type: application/json
```

### Header Descriptions

| Header | Description | Example |
|--------|-------------|---------|
| `Authorization` | Bearer token with API key | `Bearer yp_live_abc123...` |
| `X-Merchant-ID` | Your merchant UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `X-Timestamp` | Unix timestamp (seconds) | `1638360000` |
| `X-Signature` | HMAC-SHA256 signature | `sha256=abcdef123456...` |

---

## Code Examples

### Node.js / JavaScript

```javascript
const crypto = require('crypto');
const fetch = require('node-fetch');

class FyroPayClient {
  constructor(apiKey, apiSecret, merchantId) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.merchantId = merchantId;
    this.baseUrl = 'https://your-domain.com';
  }
  
  // Generate HMAC signature
  generateSignature(timestamp, requestBody) {
    const payload = `${this.merchantId}${timestamp}${requestBody}`;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
    return `sha256=${signature}`;
  }
  
  // Make authenticated request
  async request(endpoint, method, body = null) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const requestBody = body ? JSON.stringify(body) : '';
    const signature = this.generateSignature(timestamp, requestBody);
    
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Merchant-ID': this.merchantId,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    };
    
    const options = {
      method,
      headers,
    };
    
    if (body) {
      options.body = requestBody;
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
    return response.json();
  }
  
  // Create payment link
  async createPaymentLink(data) {
    return this.request('/api/payment-links', 'POST', data);
  }
  
  // List transactions
  async listTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/merchant/transactions?${query}`, 'GET');
  }
}

// Usage
const client = new FyroPayClient(
  process.env.YETOPAY_API_KEY,
  process.env.YETOPAY_API_SECRET,
  process.env.YETOPAY_MERCHANT_ID
);

// Create payment
const payment = await client.createPaymentLink({
  amount: 250.00,
  reference: 'INV-2024-001',
  customerEmail: 'customer@example.com',
  notifyUrl: 'https://your-site.com/webhooks/payment'
});

console.log('Payment URL:', payment.data.paymentUrl);
```

### Python

```python
import hmac
import hashlib
import time
import json
import requests

class FyroPayClient:
    def __init__(self, api_key, api_secret, merchant_id):
        self.api_key = api_key
        self.api_secret = api_secret
        self.merchant_id = merchant_id
        self.base_url = 'https://your-domain.com'
    
    def generate_signature(self, timestamp, request_body):
        """Generate HMAC-SHA256 signature"""
        payload = f"{self.merchant_id}{timestamp}{request_body}"
        signature = hmac.new(
            self.api_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"
    
    def request(self, endpoint, method='GET', body=None):
        """Make authenticated request"""
        timestamp = str(int(time.time()))
        request_body = json.dumps(body) if body else ''
        signature = self.generate_signature(timestamp, request_body)
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'X-Merchant-ID': self.merchant_id,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
            'Content-Type': 'application/json'
        }
        
        url = f"{self.base_url}{endpoint}"
        
        if method == 'POST':
            response = requests.post(url, headers=headers, json=body)
        else:
            response = requests.get(url, headers=headers)
        
        return response.json()
    
    def create_payment_link(self, data):
        """Create payment link"""
        return self.request('/api/payment-links', 'POST', data)
    
    def list_transactions(self, params=None):
        """List transactions"""
        query = '?' + '&'.join(f"{k}={v}" for k, v in (params or {}).items())
        return self.request(f'/api/merchant/transactions{query}')

# Usage
client = FyroPayClient(
    api_key=os.getenv('YETOPAY_API_KEY'),
    api_secret=os.getenv('YETOPAY_API_SECRET'),
    merchant_id=os.getenv('YETOPAY_MERCHANT_ID')
)

# Create payment
payment = client.create_payment_link({
    'amount': 250.00,
    'reference': 'INV-2024-001',
    'customerEmail': 'customer@example.com',
    'notifyUrl': 'https://your-site.com/webhooks/payment'
})

print('Payment URL:', payment['data']['paymentUrl'])
```

### PHP

```php
<?php

class FyroPayClient {
    private $apiKey;
    private $apiSecret;
    private $merchantId;
    private $baseUrl;
    
    public function __construct($apiKey, $apiSecret, $merchantId) {
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->merchantId = $merchantId;
        $this->baseUrl = 'https://your-domain.com';
    }
    
    private function generateSignature($timestamp, $requestBody) {
        $payload = $this->merchantId . $timestamp . $requestBody;
        $signature = hash_hmac('sha256', $payload, $this->apiSecret);
        return "sha256={$signature}";
    }
    
    public function request($endpoint, $method = 'GET', $body = null) {
        $timestamp = (string)time();
        $requestBody = $body ? json_encode($body) : '';
        $signature = $this->generateSignature($timestamp, $requestBody);
        
        $headers = [
            "Authorization: Bearer {$this->apiKey}",
            "X-Merchant-ID: {$this->merchantId}",
            "X-Timestamp: {$timestamp}",
            "X-Signature: {$signature}",
            "Content-Type: application/json"
        ];
        
        $ch = curl_init($this->baseUrl . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
        }
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
    
    public function createPaymentLink($data) {
        return $this->request('/api/payment-links', 'POST', $data);
    }
    
    public function listTransactions($params = []) {
        $query = http_build_query($params);
        return $this->request("/api/merchant/transactions?{$query}");
    }
}

// Usage
$client = new FyroPayClient(
    getenv('YETOPAY_API_KEY'),
    getenv('YETOPAY_API_SECRET'),
    getenv('YETOPAY_MERCHANT_ID')
);

// Create payment
$payment = $client->createPaymentLink([
    'amount' => 250.00,
    'reference' => 'INV-2024-001',
    'customerEmail' => 'customer@example.com',
    'notifyUrl' => 'https://your-site.com/webhooks/payment'
]);

echo 'Payment URL: ' . $payment['data']['paymentUrl'];
```

---

## Security Best Practices

### ✅ DO

1. **Store credentials in environment variables**
   ```bash
   YETOPAY_API_KEY=yp_live_...
   YETOPAY_API_SECRET=...
   ```

2. **Use HTTPS in production**
   ```javascript
   const baseUrl = 'https://your-domain.com'; // ✅
   ```

3. **Validate timestamp on server**
   ```javascript
   const timeDiff = Math.abs(currentTime - requestTime);
   if (timeDiff > 300) throw new Error('Expired');
   ```

4. **Use constant-time comparison**
   ```javascript
   crypto.timingSafeEqual(Buffer.from(sig1), Buffer.from(sig2));
   ```

5. **Rotate keys periodically**
   - Create new key
   - Update applications
   - Revoke old key

6. **Monitor API usage**
   - Check `lastUsedAt` regularly
   - Review usage patterns
   - Alert on anomalies

### ❌ DON'T

1. **Never commit keys to Git**
   ```bash
   # .gitignore
   .env
   .env.local
   ```

2. **Never log API secrets**
   ```javascript
   console.log(apiSecret); // ❌ NEVER
   ```

3. **Never send keys in URL**
   ```javascript
   // ❌ WRONG
   fetch(`/api/payment?key=${apiKey}`);
   
   // ✅ CORRECT
   fetch('/api/payment', {
     headers: { 'Authorization': `Bearer ${apiKey}` }
   });
   ```

4. **Never use test keys in production**
   ```javascript
   // ❌ WRONG
   const apiKey = 'yp_test_...';
   
   // ✅ CORRECT
   const apiKey = process.env.YETOPAY_API_KEY;
   ```

---

## Troubleshooting

### Error: "Missing or invalid Authorization header"

**Cause**: API key not in Authorization header

**Solution**:
```javascript
headers: {
  'Authorization': `Bearer ${apiKey}` // Must start with "Bearer yp_"
}
```

### Error: "Request timestamp expired"

**Cause**: Timestamp older than 5 minutes

**Solution**:
```javascript
const timestamp = Math.floor(Date.now() / 1000).toString();
// Use immediately, don't cache
```

### Error: "Invalid signature"

**Cause**: Signature mismatch

**Solution**:
1. Check payload order: `merchantId + timestamp + requestBody`
2. Use exact request body (no whitespace changes)
3. Verify API secret is correct
4. Ensure HMAC-SHA256 algorithm

**Debug**:
```javascript
console.log('Merchant ID:', merchantId);
console.log('Timestamp:', timestamp);
console.log('Request Body:', requestBody);
console.log('Payload:', merchantId + timestamp + requestBody);
console.log('Signature:', signature);
```

### Error: "Missing required permission"

**Cause**: API key doesn't have permission

**Solution**:
1. Check key permissions in dashboard
2. Create new key with correct permissions
3. Update application with new key

---

## API Key Management

### List Your API Keys

```bash
GET /api/merchant/api-keys
Cookie: better-auth.session_token=...
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "key-uuid",
      "name": "Production Server",
      "keyPrefix": "yp_live_abc123...",
      "permissions": ["payment_links.create", "transactions.read"],
      "lastUsedAt": "2024-12-01T15:30:00Z",
      "expiresAt": null,
      "isActive": true,
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ]
}
```

### Revoke API Key

```bash
DELETE /api/merchant/api-keys/{id}
Cookie: better-auth.session_token=...
```

**Response**:
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

---

## Permissions

Available permissions for API keys:

| Permission | Description |
|------------|-------------|
| `payment_links.create` | Create payment links |
| `payment_links.read` | View payment links |
| `transactions.read` | View transactions |
| `*` | All permissions (admin) |

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Support**: support@fyropay.com
