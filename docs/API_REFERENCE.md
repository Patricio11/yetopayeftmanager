# YetoPay API Reference

**Version:** 2.0.0  
**Base URL:** `https://your-domain.com` or `http://localhost:3000`  
**Protocol:** HTTPS (Production) / HTTP (Development)

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [Security](#security)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)
7. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [Payment Links](#payment-links)
   - [Transactions](#transactions)
8. [Payment Methods](#payment-methods)
9. [Webhook Integration](#webhook-integration)
10. [Code Examples](#code-examples)
11. [Migration Guide (v1 → v2)](#migration-guide)
12. [Testing](#testing)

---

## Overview

YetoPay provides a secure REST API for creating payment links that support **multiple payment methods** — EFT (Pay by Bank) and Card payments — through a single integration. The API uses JSON for request and response bodies.

### How It Works

```
1. You create a payment link via the API         →  POST /api/payment-links
2. You redirect your customer to the payment URL  →  https://pay.yetopay.co.za/pay/{token}
3. Customer chooses a payment method and pays      →  EFT or Card (if enabled)
4. You receive a webhook when payment completes    →  POST to your notifyUrl
5. You verify the webhook and fulfill the order
```

That's it. Your integration is the same regardless of which method the customer uses. YetoPay handles the payment method selection, bank redirects, card processing, and status tracking.

### Key Features

- **One integration, multiple payment methods** — EFT and Card through the same API
- Token-based payment links with cryptographic security
- Automatic expiration (24 hours default, up to 7 days)
- Webhook notifications with HMAC signature verification
- Complete transaction history with payment method filtering
- Real-time payment tracking
- Bank credential tokenization for repeat EFT payments

### Supported Payment Methods

| Method | Code | Description |
|--------|------|-------------|
| Pay by Bank (EFT) | `eft_direct` | Customer pays directly from their bank account (FNB, Standard Bank, ABSA, Nedbank, Capitec) |
| Card Payments | `card_callpay` | Credit/debit card via secure hosted payment page |

> **Note:** Payment methods are enabled per merchant by your administrator. If only one method is enabled, customers go straight to that flow. If multiple methods are enabled, customers see a payment method picker.

---

## Quick Start

Create a payment link in 3 steps:

### Step 1: Get Your API Credentials

Go to **Dashboard → Settings → API Keys** and create an API key. Save the key and secret — the secret is only shown once.

### Step 2: Create a Payment Link

```bash
# Generate signature
TIMESTAMP=$(date +%s)
MERCHANT_ID="your-merchant-uuid"
API_KEY="yp_live_abc123..."
API_SECRET="your-api-secret"
BODY='{"amount":250.00,"reference":"INV-001","successUrl":"https://yoursite.com/thanks","notifyUrl":"https://yoursite.com/webhooks/yetopay"}'

SIGNATURE=$(echo -n "${MERCHANT_ID}${TIMESTAMP}${BODY}" | openssl dgst -sha256 -hmac "${API_SECRET}" | awk '{print $2}')

curl -X POST https://your-domain.com/api/payment-links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "X-Merchant-ID: ${MERCHANT_ID}" \
  -H "X-Timestamp: ${TIMESTAMP}" \
  -H "X-Signature: sha256=${SIGNATURE}" \
  -d "${BODY}"
```

### Step 3: Redirect Your Customer

```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://your-domain.com/pay/abc123xyz...",
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "reference": "INV-001",
    "amount": 250.00,
    "status": "not_started"
  }
}
```

Redirect the customer to `paymentUrl`. They'll choose their payment method (if multiple are enabled), complete payment, and get redirected back to your `successUrl` or `failureUrl`.

You'll receive a webhook at your `notifyUrl` confirming the payment status.

---

## Authentication

YetoPay supports **two authentication methods**:

### 1. API Key Authentication (Recommended for Production)

**Best for**: Server-to-server integrations, production applications

**Required Headers:**
```http
Authorization: Bearer yp_live_abc123...
X-Merchant-ID: your-merchant-uuid
X-Timestamp: 1638360000
X-Signature: sha256=hmac-signature
```

**Generating the Signature:**

```javascript
const crypto = require('crypto');

const timestamp = Math.floor(Date.now() / 1000).toString();
const payload = merchantId + timestamp + JSON.stringify(requestBody);
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(payload)
  .digest('hex');
```

**See complete guide**: [`API_KEY_AUTHENTICATION.md`](API_KEY_AUTHENTICATION.md)

---

### 2. Session-Based Authentication

**Best for**: Dashboard UI, web applications

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "SecurePass123!"
}
```

Session tokens expire in 15 minutes and are sent via cookies. Not suitable for server-to-server integrations.

---

### Which Method to Use?

| Use Case | Method |
|----------|--------|
| Production API integration | **API Key** |
| Dashboard/Web UI | **Session** |
| Mobile app backend | **API Key** |
| Testing/Development | **Either** |

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

---

## Rate Limiting

| Scope | Limit |
|-------|-------|
| Authenticated requests | 100 requests/minute |
| Payment token access | 10 attempts per token |
| Webhook delivery | 5 retries with exponential backoff |

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Request successful |
| 201 | Resource created |
| 400 | Invalid request data |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Duplicate resource (e.g., duplicate reference) |
| 410 | Resource expired or already processed |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Endpoints

### Payment Links

#### Create Payment Link

```http
POST /api/payment-links
```

This is the primary endpoint for your integration. Create a payment link, then redirect your customer to the returned `paymentUrl`. YetoPay handles everything from there — payment method selection, bank redirects, card processing, and webhooks.

**Request:**
```json
{
  "amount": 250.00,
  "reference": "INV-2024-001",
  "description": "Payment for services rendered",
  "customerEmail": "customer@example.com",
  "customerName": "Jane Customer",
  "notifyUrl": "https://your-domain.com/webhooks/yetopay",
  "successUrl": "https://your-domain.com/payment/success",
  "failureUrl": "https://your-domain.com/payment/failed",
  "cancelledUrl": "https://your-domain.com/payment/cancelled",
  "expiresInHours": 48,
  "metadata": {
    "orderId": "ORD-12345"
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Payment amount in ZAR (min: 1.00) |
| `reference` | string | Yes | Your unique reference (max 255 chars). Must be unique per merchant. |
| `description` | string | No | Payment description shown to customer (max 500 chars) |
| `customerEmail` | string | No | Customer email for receipts |
| `customerName` | string | No | Customer name (max 255 chars) |
| `notifyUrl` | string | No | Your webhook URL — receives POST when payment status changes. Falls back to your default Notify URL in Settings if not provided. |
| `successUrl` | string | No | Where to redirect customer after successful payment. Falls back to your default Success URL. |
| `failureUrl` | string | No | Where to redirect customer after failed payment. Falls back to your default Failure URL. |
| `cancelledUrl` | string | No | Where to redirect customer after cancellation. Falls back to `failureUrl` if not set. |
| `expiresInHours` | number | No | Link expiry in hours (default: 24, max: 168 / 7 days) |
| `metadata` | object | No | Custom key-value pairs. Preserved through the entire lifecycle and included in webhooks. |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payment link created successfully",
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentUrl": "https://your-domain.com/pay/abc123xyz789...",
    "token": "abc123xyz789...",
    "reference": "INV-2024-001",
    "amount": 250.00,
    "expiresAt": "2024-12-03T15:00:00Z",
    "status": "not_started",
    "createdAt": "2024-12-01T15:00:00Z"
  }
}
```

> **Tip:** You don't need to do anything different for EFT vs Card payments. The same `POST /api/payment-links` creates a link that works for all enabled payment methods. The customer chooses their method on the YetoPay payment page.

**Error (409 Conflict — Duplicate Reference):**
```json
{
  "success": false,
  "error": "Duplicate reference",
  "message": "A payment link with this reference already exists"
}
```

---

#### List Payment Links

```http
GET /api/payment-links?limit=50&offset=0&status=completed&from=2024-12-01
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Results per page (default: 50, max: 100) |
| `offset` | number | No | Pagination offset (default: 0) |
| `status` | string | No | Filter by status (see [Status Values](#status-values)) |
| `from` | string | No | Filter from date (ISO 8601) |

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
      "notifyUrl": "https://your-domain.com/webhooks/yetopay",
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

#### List Transactions

```http
GET /api/merchant/transactions?status=completed&paymentMethod=card_callpay&limit=20
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status |
| `paymentMethod` | string | No | Filter by payment method: `eft_direct`, `card_callpay` |
| `limit` | number | No | Results per page (default: 50, max: 100) |
| `offset` | number | No | Pagination offset |
| `from` | string | No | Start date (ISO 8601) |
| `to` | string | No | End date (ISO 8601) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "amount": "250.00",
      "reference": "INV-2024-001",
      "status": "completed",
      "paymentMethod": "card_callpay",
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

> **New in v2:** The `paymentMethod` field tells you how the customer paid. Use the `paymentMethod` query parameter to filter transactions by method.

| `paymentMethod` value | Meaning |
|-----------------------|---------|
| `eft_direct` | Customer paid via EFT (Pay by Bank) |
| `card_callpay` | Customer paid via credit/debit card |
| `null` | Legacy transaction (before multi-method support) — treat as EFT |

---

#### Get Transaction by ID or Reference

```http
GET /api/merchant/transactions/{id}
```

Look up a single transaction by its UUID **or** reference string. Only returns transactions belonging to the authenticated merchant.

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
    "paymentMethod": "eft_direct",
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

> **Note:** The `bank` field is populated for EFT payments. For card payments, `bank` will be `null` — the card network details are handled by the payment provider.

---

### Status Values

Transactions go through this lifecycle:

```
not_started → initiated → completed
                        → failed
                        → cancelled
                        → aborted
                        → expired
```

| Status | Description |
|--------|-------------|
| `not_started` | Payment link created, customer hasn't opened it yet |
| `initiated` | Customer opened the link and started the payment flow |
| `completed` | Payment successful |
| `failed` | Payment failed (bank declined, card declined, etc.) |
| `cancelled` | Customer cancelled the payment |
| `aborted` | Payment was aborted mid-flow |
| `expired` | Payment link expired before completion |

The status lifecycle is the same regardless of payment method. Whether the customer pays via EFT or Card, you handle the status the same way in your system.

---

## Payment Methods

### How Multi-Method Works

You don't need to change your integration to support multiple payment methods. Here's what happens:

1. **You** call `POST /api/payment-links` — same as always, no new fields needed
2. **Your customer** opens the payment URL
3. **YetoPay** checks which payment methods you have enabled
4. If **multiple methods** are enabled → customer sees a payment method picker
5. If **only one method** is enabled → customer goes straight to that flow
6. **You** receive the same webhook regardless of which method was used

### Enabling Payment Methods

Go to **Dashboard → Settings → Payment Methods** to enable or disable methods. Your administrator must first activate a payment method at the platform level before it appears in your settings.

### Redirect URL Behavior

After the customer completes (or cancels/fails) a payment, they are redirected to your URLs with query parameters appended:

**Success redirect:**
```
https://yoursite.com/payment/success?status=success&reference=INV-001&amount=250.00&payment_method=card
```

**Failure redirect:**
```
https://yoursite.com/payment/failed?status=failed&reference=INV-001&amount=250.00&payment_method=eft
```

**Cancelled redirect:**
```
https://yoursite.com/payment/cancelled?status=cancelled&reference=INV-001&amount=250.00&payment_method=card
```

| Query Parameter | Description |
|-----------------|-------------|
| `status` | `success`, `failed`, or `cancelled` |
| `reference` | Your transaction reference |
| `amount` | Payment amount |
| `payment_method` | `eft` or `card` |

> **Important:** Do **not** rely solely on the redirect to confirm payment. Always verify via the webhook or by querying the transaction status via the API. Redirects can be spoofed by a customer.

---

## Webhook Integration

### Overview

When a payment status changes, YetoPay sends a POST request to the `notifyUrl` you provided when creating the payment link (or your default Notify URL configured in Settings).

**The webhook payload and format are the same regardless of payment method.** You handle EFT and Card webhooks identically.

### Webhook Payload

```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "reference": "INV-2024-001",
  "amount": 250.00,
  "status": "completed",
  "payment_method": "card_callpay",
  "timestamp": "2024-12-01T15:30:00Z",
  "gateway_result": "success",
  "message": "Payment completed successfully"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `transaction_id` | string | YetoPay transaction UUID |
| `reference` | string | Your reference from the payment link |
| `amount` | number | Payment amount in ZAR |
| `status` | string | `completed`, `failed`, `cancelled`, or `aborted` |
| `payment_method` | string | `eft_direct` or `card_callpay`. May be absent for legacy transactions. |
| `timestamp` | string | ISO 8601 timestamp |
| `gateway_result` | string | Result from the payment gateway |
| `message` | string | Human-readable status message |

### Webhook Headers

```
Content-Type: application/json
X-YETOPAYEFT-Signature: sha256-hmac-of-payload
X-Webhook-Signature: hmac-hex-signature
X-Webhook-Timestamp: unix-timestamp
X-Webhook-ID: unique-event-id
X-Webhook-Event: event-type
```

### Verifying Webhook Signatures

Always verify the signature before trusting a webhook. This prevents attackers from sending fake payment confirmations.

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler
app.post('/webhooks/yetopay', (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { transaction_id, reference, status, amount, payment_method } = req.body;

  // Process the payment — same logic for EFT and Card
  if (status === 'completed') {
    // Fulfill the order
  } else if (status === 'failed') {
    // Handle failure
  }

  // Respond quickly — process async if needed
  res.status(200).json({ received: true });
});
```

### Webhook Retry Schedule

If your endpoint fails (non-2xx response or timeout), YetoPay retries:

| Retry | Delay |
|-------|-------|
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 15 minutes |
| 4 | 1 hour |
| 5 | 6 hours |

**Timeout:** 30 seconds per attempt  
**Total attempts:** 5

### Webhook Best Practices

1. **Respond with 200 immediately** — process the order asynchronously
2. **Verify the signature** on every request
3. **Handle duplicates** — use `transaction_id` as an idempotency key
4. **Don't rely on redirects** — the webhook is the authoritative payment confirmation
5. **Log everything** — store the full webhook payload for debugging
6. **Use HTTPS** — webhook URLs must use HTTPS in production

### Dashboard Webhooks (Event Subscriptions)

In addition to the per-transaction `notifyUrl`, you can set up persistent webhook endpoints in **Dashboard → Settings → Webhooks**. These receive all events matching your subscription (e.g., all `payment.completed` events) and include their own secret for signature verification.

Available events: `payment.completed`, `payment.failed`, `payment.cancelled`, `payment.pending`, `transaction.created`, `transaction.updated`, or `*` (wildcard — all events).

---

## Code Examples

### Node.js / Express

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const API_KEY = process.env.YETOPAY_API_KEY;
const API_SECRET = process.env.YETOPAY_API_SECRET;
const MERCHANT_ID = process.env.YETOPAY_MERCHANT_ID;
const WEBHOOK_SECRET = process.env.YETOPAY_WEBHOOK_SECRET;
const API_BASE = process.env.YETOPAY_API_URL || 'https://your-domain.com';

// Helper: generate auth headers
function getAuthHeaders(body) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = MERCHANT_ID + timestamp + JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(payload)
    .digest('hex');

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'X-Merchant-ID': MERCHANT_ID,
    'X-Timestamp': timestamp,
    'X-Signature': `sha256=${signature}`,
  };
}

// Create a payment link
app.post('/create-payment', async (req, res) => {
  const body = {
    amount: req.body.amount,
    reference: `ORD-${Date.now()}`,
    description: req.body.description,
    customerEmail: req.body.email,
    successUrl: 'https://yoursite.com/payment/success',
    failureUrl: 'https://yoursite.com/payment/failed',
    cancelledUrl: 'https://yoursite.com/payment/cancelled',
    notifyUrl: 'https://yoursite.com/webhooks/yetopay',
    metadata: { orderId: req.body.orderId },
  };

  const response = await fetch(`${API_BASE}/api/payment-links`, {
    method: 'POST',
    headers: getAuthHeaders(body),
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data.success) {
    // Redirect customer to payment page
    res.json({ paymentUrl: data.data.paymentUrl });
  } else {
    res.status(400).json({ error: data.message });
  }
});

// Handle webhook — works for both EFT and Card payments
app.post('/webhooks/yetopay', (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  if (signature && !verifySignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { transaction_id, reference, status, amount, payment_method } = req.body;
  console.log(`Payment ${reference}: ${status} via ${payment_method || 'eft'} — R${amount}`);

  if (status === 'completed') {
    // Mark order as paid in your database
    // Send confirmation email to customer
  } else if (status === 'failed' || status === 'cancelled') {
    // Handle failure — notify customer, allow retry
  }

  res.json({ received: true });
});

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.listen(3000);
```

### Python / Flask

```python
import requests
import hashlib
import hmac
import time
import json
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

API_KEY = os.environ['YETOPAY_API_KEY']
API_SECRET = os.environ['YETOPAY_API_SECRET']
MERCHANT_ID = os.environ['YETOPAY_MERCHANT_ID']
WEBHOOK_SECRET = os.environ['YETOPAY_WEBHOOK_SECRET']
API_BASE = os.environ.get('YETOPAY_API_URL', 'https://your-domain.com')


def get_auth_headers(body_dict):
    timestamp = str(int(time.time()))
    payload = MERCHANT_ID + timestamp + json.dumps(body_dict, separators=(',', ':'))
    signature = hmac.new(
        API_SECRET.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}',
        'X-Merchant-ID': MERCHANT_ID,
        'X-Timestamp': timestamp,
        'X-Signature': f'sha256={signature}',
    }


@app.route('/create-payment', methods=['POST'])
def create_payment():
    body = {
        'amount': request.json['amount'],
        'reference': f"ORD-{int(time.time())}",
        'customerEmail': request.json.get('email'),
        'successUrl': 'https://yoursite.com/payment/success',
        'failureUrl': 'https://yoursite.com/payment/failed',
        'notifyUrl': 'https://yoursite.com/webhooks/yetopay',
    }

    resp = requests.post(
        f'{API_BASE}/api/payment-links',
        json=body,
        headers=get_auth_headers(body),
    )
    data = resp.json()

    if data.get('success'):
        return jsonify({'paymentUrl': data['data']['paymentUrl']})
    return jsonify({'error': data.get('message')}), 400


@app.route('/webhooks/yetopay', methods=['POST'])
def webhook():
    data = request.json
    status = data['status']
    reference = data['reference']
    amount = data['amount']
    method = data.get('payment_method', 'eft_direct')

    print(f"Payment {reference}: {status} via {method} — R{amount}")

    if status == 'completed':
        pass  # Mark order as paid

    return jsonify({'received': True})


if __name__ == '__main__':
    app.run(port=3000)
```

### PHP / Laravel

```php
<?php

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

// Create payment link
Route::post('/create-payment', function (Request $request) {
    $merchantId = config('services.yetopay.merchant_id');
    $apiKey = config('services.yetopay.api_key');
    $apiSecret = config('services.yetopay.api_secret');

    $body = [
        'amount' => $request->input('amount'),
        'reference' => 'ORD-' . time(),
        'customerEmail' => $request->input('email'),
        'successUrl' => url('/payment/success'),
        'failureUrl' => url('/payment/failed'),
        'notifyUrl' => url('/webhooks/yetopay'),
    ];

    $timestamp = (string) time();
    $payload = $merchantId . $timestamp . json_encode($body);
    $signature = hash_hmac('sha256', $payload, $apiSecret);

    $response = Http::withHeaders([
        'Authorization' => "Bearer {$apiKey}",
        'X-Merchant-ID' => $merchantId,
        'X-Timestamp' => $timestamp,
        'X-Signature' => "sha256={$signature}",
    ])->post(config('services.yetopay.api_url') . '/api/payment-links', $body);

    $data = $response->json();

    if ($data['success'] ?? false) {
        return response()->json(['paymentUrl' => $data['data']['paymentUrl']]);
    }
    return response()->json(['error' => $data['message'] ?? 'Failed'], 400);
});

// Handle webhook — same handler for EFT and Card
Route::post('/webhooks/yetopay', function (Request $request) {
    $data = $request->all();
    $status = $data['status'];
    $reference = $data['reference'];
    $amount = $data['amount'];
    $method = $data['payment_method'] ?? 'eft_direct';

    Log::info("Payment {$reference}: {$status} via {$method} — R{$amount}");

    if ($status === 'completed') {
        // Mark order as paid
    }

    return response()->json(['received' => true]);
});
```

---

## Migration Guide

### Upgrading from v1 (EFT-only) to v2 (Multi-Method)

**The short answer: you don't have to change anything.** Your existing integration works as-is. All changes are backward compatible.

Here's what's new if you want to take advantage of multi-method support:

### What Changed (All Additive)

| Change | Impact | Action Required |
|--------|--------|-----------------|
| `paymentMethod` field added to transaction responses | New optional field | None — ignore it or use it for reporting |
| `paymentMethod` query parameter on `GET /api/merchant/transactions` | New optional filter | None — use it if you want to filter by method |
| `payment_method` field added to webhook payloads | New optional field | None — may be absent for legacy transactions |
| `payment_method` query param on redirect URLs | New query param appended to your success/failure/cancelled URLs | None — your URL handler should already ignore unknown params |
| New payment methods on payment page | Customers may see a method picker | None — this is automatic when methods are enabled |

### What Did NOT Change

- `POST /api/payment-links` request schema — **identical**
- `POST /api/payment-links` response schema — **identical**
- Webhook signature format — **identical** (both old and new formats accepted)
- Transaction status lifecycle — **identical**
- Authentication — **identical**
- All existing API endpoints — **fully backward compatible**

### Optional: Using the New Fields

If you want to know how a customer paid:

```javascript
// In your webhook handler
app.post('/webhooks/yetopay', (req, res) => {
  const { status, reference, payment_method } = req.body;

  if (status === 'completed') {
    const method = payment_method || 'eft_direct'; // fallback for legacy

    // Optional: track payment method in your system
    db.orders.update({ reference }, {
      status: 'paid',
      paymentMethod: method === 'card_callpay' ? 'card' : 'eft',
    });
  }

  res.json({ received: true });
});
```

If you want to filter transactions by method:

```bash
# Get only card payments
GET /api/merchant/transactions?paymentMethod=card_callpay&status=completed

# Get only EFT payments
GET /api/merchant/transactions?paymentMethod=eft_direct&status=completed
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

1. Create a test payment link via the API
2. Open the `paymentUrl` in your browser
3. If Card payments are enabled, you'll see a method picker — try both
4. For EFT: select a bank and complete the flow
5. For Card: you'll be redirected to the card payment page
6. Check your webhook endpoint received the notification
7. Verify the transaction status via `GET /api/merchant/transactions/{id}`

### Webhook Testing

Use tools like:
- **ngrok**: Expose localhost to the internet
- **webhook.site**: Quick test webhook receiver
- **Postman**: Mock webhook requests

```bash
# Expose your local server
npx ngrok http 3000

# Use the ngrok URL as your notifyUrl
# https://abc123.ngrok.io/webhooks/yetopay
```

---

## Appendix

### Payment Link Lifecycle

```
not_started → initiated → completed
                        → failed
                        → cancelled
                        → aborted
                        → expired
```

### Transaction Metadata

Custom metadata is preserved through the entire payment lifecycle and included in webhooks:

```json
{
  "metadata": {
    "orderId": "ORD-12345",
    "customerId": "CUST-789",
    "plan": "premium"
  }
}
```

### Checklist: Going Live

- [ ] Use HTTPS for all API calls and webhook endpoints
- [ ] Store API credentials in environment variables (never in code)
- [ ] Verify webhook signatures on every request
- [ ] Handle duplicate webhooks (idempotency)
- [ ] Set up your `successUrl`, `failureUrl`, and `cancelledUrl`
- [ ] Don't rely on redirects alone — use webhooks as the source of truth
- [ ] Test the full flow with both EFT and Card (if enabled)
- [ ] Monitor your webhook endpoint for failures

---

**Last Updated**: May 2026  
**API Version**: 2.0.0  
**Support**: support@yetopayeft.com
