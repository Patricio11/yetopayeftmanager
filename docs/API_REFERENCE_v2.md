# YetoPay API Reference

Complete server-to-server API documentation for integrating YetoPay Pay By Bank into your application.

## Authentication

All API requests require **API key authentication** with HMAC signatures.

### Getting Your Credentials

1. Log in to the dashboard at [yetopay.co.za](https://www.yetopay.co.za)
2. Go to **Settings > API Keys**
3. Click **Create API Key**
4. Save your **API Key** and **API Secret** — the secret is shown only once

### Required Headers

Every API request must include these 4 headers:

| Header | Description | Example |
|--------|-------------|---------|
| `Authorization` | Bearer token with your API key | `Bearer yp_live_abc123...` |
| `X-Merchant-ID` | Your merchant UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `X-Timestamp` | Current Unix timestamp (seconds) | `1638360000` |
| `X-Signature` | HMAC-SHA256 signature | `sha256=a1b2c3d4...` |

### Generating the Signature

The signature is computed as:

```
signature = HMAC-SHA256(
  key:  SHA256(apiSecret),
  data: merchantId + timestamp + requestBody
)
```

For GET requests with no body, `requestBody` is an empty string.

### Node.js Example

```javascript
const crypto = require('crypto');

const apiKey = 'yp_live_abc123...';
const apiSecret = 'your-api-secret';
const merchantId = 'your-merchant-id';

// Step 1: Hash the API secret
const secretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');

// Step 2: Build the signature
const timestamp = Math.floor(Date.now() / 1000).toString();
const requestBody = JSON.stringify({ amount: 250, reference: 'INV-001' }); // or '' for GET

const payload = merchantId + timestamp + requestBody;
const signature = crypto
  .createHmac('sha256', secretHash)
  .update(payload)
  .digest('hex');

// Step 3: Make the request
const response = await fetch('https://www.yetopay.co.za/api/payment-links', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'X-Merchant-ID': merchantId,
    'X-Timestamp': timestamp,
    'X-Signature': `sha256=${signature}`,
    'Content-Type': 'application/json',
  },
  body: requestBody,
});
```

### Python Example

```python
import hmac, hashlib, time, json, requests

api_key = 'yp_live_abc123...'
api_secret = 'your-api-secret'
merchant_id = 'your-merchant-id'

secret_hash = hashlib.sha256(api_secret.encode()).hexdigest()
timestamp = str(int(time.time()))
request_body = json.dumps({'amount': 250, 'reference': 'INV-001'})

payload_str = f"{merchant_id}{timestamp}{request_body}"
signature = hmac.new(secret_hash.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

response = requests.post('https://www.yetopay.co.za/api/payment-links', headers={
    'Authorization': f'Bearer {api_key}',
    'X-Merchant-ID': merchant_id,
    'X-Timestamp': timestamp,
    'X-Signature': f'sha256={signature}',
    'Content-Type': 'application/json',
}, data=request_body)
```

### PHP Example

```php
$apiKey = 'yp_live_abc123...';
$apiSecret = 'your-api-secret';
$merchantId = 'your-merchant-id';

$secretHash = hash('sha256', $apiSecret);
$timestamp = (string)time();
$requestBody = json_encode(['amount' => 250, 'reference' => 'INV-001']);

$payload = $merchantId . $timestamp . $requestBody;
$signature = hash_hmac('sha256', $payload, $secretHash);

$ch = curl_init('https://www.yetopay.co.za/api/payment-links');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer {$apiKey}",
    "X-Merchant-ID: {$merchantId}",
    "X-Timestamp: {$timestamp}",
    "X-Signature: sha256={$signature}",
    "Content-Type: application/json",
]);
$response = curl_exec($ch);
curl_close($ch);
```

---

## API Permissions

Each API key is created with the following permissions:

| Permission | Allows |
|-----------|--------|
| `payment_links.create` | Create payment links |
| `payment_links.read` | List payment links |
| `transactions.read` | List transactions |
| `analytics.read` | Get analytics data |
| `invoices.read` | List invoices |
| `banks.read` | List available banks |
| `bank_accounts.read` | List bank accounts |
| `bank_accounts.write` | Create bank accounts |
| `settings.read` | Read merchant settings |
| `settings.write` | Update merchant settings |
| `webhooks.read` | List webhooks and deliveries |
| `webhooks.write` | Create/update/delete webhooks |

> **Note:** API keys created before the full API rollout only have `payment_links.create`, `payment_links.read`, and `transactions.read`. Create a **new API key** to get all permissions.

---

## Endpoints

### Payment Links

#### POST /api/payment-links

Create a new payment link. Returns a URL to redirect your customer to.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number | Yes | Payment amount in ZAR (min: 1) |
| `reference` | string | Yes | Your unique internal reference |
| `description` | string | No | Payment description shown to customer |
| `customerName` | string | No | Customer's name |
| `customerEmail` | string | No | Customer's email |
| `successUrl` | string | No | Redirect URL after successful payment |
| `failureUrl` | string | No | Redirect URL after failed payment |
| `cancelledUrl` | string | No | Redirect URL when customer cancels |
| `notifyUrl` | string | No | Per-request webhook URL (prefer Settings > Webhooks) |
| `expiresInHours` | number | No | Link expiry in hours (default: 24, max: 168) |
| `metadata` | object | No | Custom key-value data returned in webhooks |
| `bank` | string | No | Pre-select a bank — the payment page opens directly on that bank's login, skipping the bank picker (see below) |
| `merchant` | object | No | **Partner accounts only.** Attribute this transaction to one of your merchants (see below) |

**Response:**

```json
{
  "success": true,
  "message": "Payment link created successfully",
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentUrl": "https://www.yetopay.co.za/pay/abc123...",
    "token": "abc123...",
    "reference": "INV-001",
    "amount": 250.00,
    "expiresAt": "2024-12-02T15:00:00Z",
    "status": "not_started",
    "createdAt": "2024-12-01T15:00:00Z"
  }
}
```

**cURL:**

```bash
curl -X POST https://www.yetopay.co.za/api/payment-links \
  -H "Authorization: Bearer yp_live_..." \
  -H "X-Merchant-ID: <merchant-id>" \
  -H "X-Timestamp: <unix-timestamp>" \
  -H "X-Signature: sha256=<hmac>" \
  -H "Content-Type: application/json" \
  -d '{"amount":250,"reference":"INV-001","description":"Order #123"}'
```

---

#### Bank-specific payment links

Pass a `bank` code to open the payment page **directly on that bank's login**,
skipping the "choose your bank" step. Useful when your platform already asked
the customer which bank they're paying from.

```json
{
  "amount": 250.00,
  "reference": "INV-001",
  "bank": "fnb"
}
```

**Bank codes:** `fnb`, `absa`, `nedbank`, `standardbank`, `capitec`, plus any
others enabled on the platform. Always fetch the authoritative list for your
account from `GET /api/merchant/banks` (each item's `code` is the value to send).

Notes:
- An unknown or disabled code returns `400`.
- If the code is valid but not enabled for the paying merchant, the page
  gracefully falls back to the normal bank picker.
- When both card and Pay-by-Bank are enabled on the account, a `bank` value
  implies Pay-by-Bank and skips the payment-method picker too.

---

#### Partner sub-merchants (connector integrations)

Partner accounts integrating on behalf of their merchants can pass a
`merchant` object. The payment page then shows **that merchant's** name and
logo, and the customer pays into **that merchant's** bank account — not the
partner's. The transaction is grouped under the merchant in all partner
analytics, recon, and invoicing.

The merchant `name` is unique per partner (case-insensitive). If the merchant
doesn't exist yet it is created automatically — no invitation is sent. After
the first call, you only need to send the name.

**merchant object:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `merchant.name` | string | Yes | Merchant name — unique per partner, used to match repeat calls |
| `merchant.reference` | string | No | The merchant's OWN reference for this payment. Buyer redirects use it as the `reference` query param (the payment-link reference moves to `link_reference`); webhooks keep `data.reference` = the payment-link reference and echo this under `data.merchant.reference` |
| `merchant.email` | string | No | Merchant contact email |
| `merchant.phone` | string | No | Merchant phone |
| `merchant.logoUrl` | string | No | Logo shown on the payment page |
| `merchant.bankAccount` | object | First call (live) | Payout account — required the first time a merchant is used in live mode |
| `merchant.bankAccount.accountHolderName` | string | Yes | Account holder name |
| `merchant.bankAccount.accountNumber` | string | Yes | Account number |
| `merchant.bankAccount.bankCode` | string | Yes | Bank code |
| `merchant.bankAccount.branchCode` | string | No | Branch code |
| `merchant.bankAccount.accountType` | string | No | `savings` \| `cheque` \| `transmission` \| `bond` \| `investment` (default `cheque`) |

**First call — full details:**

```json
{
  "amount": 150.00,
  "reference": "JB-889231",
  "description": "Wallet top-up",
  "merchant": {
    "name": "Jabula Bet",
    "email": "ops@jabulabet.com",
    "bankAccount": {
      "accountHolderName": "Jabula Bet (Pty) Ltd",
      "accountNumber": "62123456789",
      "bankCode": "FNB",
      "branchCode": "250655",
      "accountType": "cheque"
    }
  }
}
```

**Repeat calls — name only:**

```json
{
  "amount": 300.00,
  "reference": "JB-889232",
  "merchant": { "name": "Jabula Bet" }
}
```

The response `data` includes `merchant: { id, name, created }` so your
platform can store the YetoPay merchant id. Webhook events for these
transactions are delivered to **your (the partner's) webhook endpoints** and
include the `merchant` object for reconciliation, until the merchant sets up
their own webhooks.

**Errors:**

| Status | Meaning |
|--------|---------|
| 403 | `merchant` sent by a non-partner account |
| 400 | New live merchant without `bankAccount` |
| 409 | `merchant.email` already belongs to another account |

---

#### GET /api/payment-links

List your payment links with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Results per page (default: 50, max: 100) |
| `offset` | number | No | Skip first N results |
| `status` | string | No | Filter: `not_started`, `initiated`, `completed`, `failed`, `cancelled`, `aborted`, `expired` |
| `from` | string | No | ISO date — only show links created after this date |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "amount": 250.00,
      "reference": "INV-001",
      "status": "completed",
      "createdAt": "2024-12-01T15:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 120,
    "hasMore": true
  }
}
```

---

### Transactions

#### GET /api/merchant/transactions

Get a paginated list of your transactions.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Results per page (default: 50, max: 100) |
| `offset` | number | No | Skip first N results |
| `status` | string | No | Filter by status |
| `from` | string | No | ISO date start |
| `to` | string | No | ISO date end |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "amount": "250.00",
      "reference": "INV-001",
      "status": "completed",
      "customerName": "John Doe",
      "createdAt": "2024-12-01T15:00:00Z"
    }
  ],
  "pagination": {
    "total": 85,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### GET /api/merchant/transactions/{id}

Look up a single transaction by UUID or reference string. Only returns transactions belonging to the authenticated merchant.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Transaction UUID or reference string |

**Response:**

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

**Error (404):**

```json
{
  "error": "Transaction not found"
}
```

**cURL Example:**

```bash
# By transaction ID
curl /api/merchant/transactions/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer yp_live_..." \
  -H "X-Merchant-ID: <merchant-id>" \
  -H "X-Timestamp: $(date +%s)000" \
  -H "X-Signature: sha256=<hmac>"

# By reference
curl /api/merchant/transactions/INV-2024-001 \
  -H "Authorization: Bearer yp_live_..." \
  -H "X-Merchant-ID: <merchant-id>" \
  -H "X-Timestamp: $(date +%s)000" \
  -H "X-Signature: sha256=<hmac>"
```

---

### Analytics

#### GET /api/merchant/analytics

Comprehensive analytics: KPIs with growth tracking, daily/hourly breakdown, bank performance, failure reasons, and all-time stats.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | No | ISO date start (default: 30 days ago) |
| `to` | string | No | ISO date end (default: today) |

**Response:**

```json
{
  "success": true,
  "data": {
    "period": { "from": "2024-11-01T00:00:00Z", "to": "2024-11-30T23:59:59Z" },
    "kpis": {
      "revenue": 125000,
      "revenueGrowth": 12.5,
      "transactionCount": 340,
      "volumeGrowth": 8.2,
      "completedCount": 320,
      "failedCount": 15,
      "pendingCount": 5,
      "successRate": 94.1,
      "successRateChange": 2.3,
      "avgTransactionValue": 390.63,
      "maxTransaction": 5000,
      "minTransaction": 25,
      "totalVolume": 145000
    },
    "allTime": {
      "totalTransactions": 1200,
      "totalRevenue": 450000,
      "completedTransactions": 1120
    },
    "dailyBreakdown": [
      {
        "date": "2024-11-01",
        "completed": 15,
        "failed": 1,
        "pending": 0,
        "total": 16,
        "revenue": 5500,
        "volume": 5800
      }
    ],
    "hourlyBreakdown": [
      { "hour": 9, "dayOfWeek": 1, "count": 12, "completed": 11 }
    ],
    "bankPerformance": [
      {
        "bankName": "FNB",
        "bankCode": "fnb",
        "totalCount": 150,
        "completedCount": 145,
        "failedCount": 5,
        "successRate": 96.7,
        "revenue": 58000
      }
    ],
    "topFailureReasons": [
      { "reason": "Session timeout", "count": 5 },
      { "reason": "Insufficient funds", "count": 3 }
    ]
  }
}
```

---

### Bank Accounts

#### GET /api/merchant/banks

List available banks that customers can pay with.

**Response:**

```json
{
  "success": true,
  "data": {
    "banks": [
      { "id": "...", "bankName": "FNB", "code": "fnb", "color": "#009933", "branchCode": "250655" },
      { "id": "...", "bankName": "ABSA", "code": "absa", "color": "#AF1F2D", "branchCode": "632005" }
    ]
  }
}
```

---

#### GET /api/merchant/bank-accounts

List your configured bank accounts for receiving payments.

**Response:**

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "...",
        "accountNumber": "62123456789",
        "accountHolderName": "My Company",
        "accountType": "cheque",
        "branchCode": "250655",
        "bankName": "FNB",
        "isPrimary": true,
        "isVerified": true,
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

#### POST /api/merchant/bank-accounts

Add a new bank account for receiving payments.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `eftBanksId` | string | Yes | Bank UUID from `GET /api/merchant/banks` |
| `accountNumber` | string | Yes | Bank account number |
| `accountHolderName` | string | Yes | Account holder name |
| `accountName` | string | No | Friendly label for the account |
| `accountType` | string | No | `savings`, `cheque`, `transmission`, `bond`, `investment` (default: `cheque`) |
| `isPrimary` | boolean | No | Set as primary account (default: `false`) |

**Response:**

```json
{
  "success": true,
  "message": "Bank account created successfully",
  "data": {
    "account": {
      "id": "...",
      "accountNumber": "62123456789",
      "accountHolderName": "My Company",
      "bankName": "FNB",
      "isPrimary": true
    }
  }
}
```

---

### Settings

#### GET /api/merchant/settings

Retrieve your merchant profile, company, banking, notification, and URL settings.

**Response:**

```json
{
  "success": true,
  "data": {
    "profile": {
      "name": "John",
      "fullName": "John Smith",
      "email": "john@company.co.za",
      "phone": "+27821234567"
    },
    "company": {
      "companyName": "ACME Pty Ltd",
      "address": { "street": "123 Main St", "city": "Johannesburg", "postal_code": "2000" },
      "registrationNumber": "2024/123456/07",
      "vatNumber": "4123456789"
    },
    "banking": {
      "bankAccount": { "account_holder": "ACME", "account_number": "62123456789", "bank_name": "FNB" }
    },
    "notifications": {
      "notificationPreferences": {
        "payment_completed": true,
        "payment_failed": true,
        "weekly_summary": false,
        "security_alerts": true
      }
    },
    "eftSettings": {
      "notifyUrl": "https://example.com/webhook",
      "successUrl": "https://example.com/success",
      "failureUrl": "https://example.com/failure",
      "cancelledUrl": "https://example.com/cancelled"
    }
  }
}
```

---

#### PATCH /api/merchant/settings

Update merchant settings. Only include fields you want to change.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Display name |
| `fullName` | string | No | Full legal name |
| `phone` | string | No | Phone number |
| `companyName` | string | No | Company name |
| `address` | object | No | `{ street, city, state, postal_code, country }` |
| `bankAccount` | object | No | `{ account_holder, account_number, account_type, bank_name, branch_code }` |
| `notificationPreferences` | object | No | `{ payment_completed, payment_failed, weekly_summary, security_alerts }` |
| `eftSettings` | object | No | Default URLs: `{ notifyUrl, successUrl, failureUrl, cancelledUrl }` |

**Response:**

```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": { "name": "John", "companyName": "ACME Pty Ltd" }
}
```

---

### Invoices

#### GET /api/merchant/invoices

Retrieve your transaction fee invoices.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Results per page (default: 20) |
| `status` | string | No | Filter: `all`, `pending`, `paid`, `overdue` |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "invoiceNumber": "INV-2024-001",
      "totalAmount": "150.00",
      "status": "paid",
      "periodStart": "2024-11-01",
      "periodEnd": "2024-11-30",
      "createdAt": "2024-12-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

### Webhooks

#### GET /api/webhooks

List all your webhook configurations.

**Response:**

```json
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "id": "...",
        "url": "https://example.com/webhook",
        "events": ["payment.completed", "payment.failed"],
        "isActive": true,
        "secret": "whsec_****"
      }
    ],
    "count": 1
  }
}
```

---

#### POST /api/webhooks

Create a new webhook endpoint. The **secret is returned only once** on creation — save it securely.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Your HTTPS webhook endpoint URL |
| `events` | string[] | Yes | Events to subscribe to (see below) |
| `isActive` | boolean | No | Enable/disable (default: `true`) |

**Available Events:**

- `payment.completed` — Payment was successful
- `payment.failed` — Payment failed
- `payment.cancelled` — Customer cancelled
- `payment.pending` — Payment is pending
- `transaction.created` — New transaction created
- `transaction.updated` — Transaction status changed

**Response:**

```json
{
  "success": true,
  "data": {
    "webhook": {
      "id": "...",
      "url": "https://example.com/webhook",
      "secret": "abc123...full-secret-shown-only-once",
      "events": ["payment.completed", "payment.failed"],
      "isActive": true
    }
  }
}
```

---

#### PATCH /api/webhooks

Update an existing webhook configuration.

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookId` | string | Yes | Webhook UUID to update |
| `url` | string | No | New webhook URL |
| `events` | string[] | No | Updated events list |
| `isActive` | boolean | No | Enable or disable |

---

#### DELETE /api/webhooks?id={webhookId}

Delete a webhook configuration permanently.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Webhook UUID to delete |

---

#### GET /api/webhooks/deliveries

List webhook delivery history for a specific webhook.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookId` | string | Yes | Webhook UUID |
| `limit` | number | No | Results per page (default: 50) |
| `offset` | number | No | Skip first N results |

---

#### POST /api/webhooks/regenerate-secret

Regenerate the signing secret for a webhook. The new secret is returned once.

**Request Body:**

```json
{ "webhookId": "<webhook-uuid>" }
```

---

#### POST /api/webhooks/test

Send a test payload to your webhook endpoint.

**Request Body:**

```json
{ "webhookId": "<webhook-uuid>" }
```

---

## Webhook Verification

When YetoPay sends a webhook to your endpoint, it includes an `X-Webhook-Signature` header containing an HMAC-SHA256 hex digest of the request body, signed with your webhook secret.

### Node.js

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(req, webhookSecret) {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
```

### Python

```python
import hmac, hashlib

def verify_webhook_signature(request, webhook_secret):
    signature = request.headers.get('X-Webhook-Signature', '')
    payload = request.get_data(as_text=True)

    expected = hmac.new(
        webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)
```

### PHP

```php
function verifyWebhookSignature($payload, $signature, $webhookSecret) {
    $expected = hash_hmac('sha256', $payload, $webhookSecret);
    return hash_equals($expected, $signature);
}

$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$payload = file_get_contents('php://input');

if (!verifyWebhookSignature($payload, $signature, $webhookSecret)) {
    http_response_code(401);
    exit('Invalid signature');
}
```

---

## Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `400` | Bad Request | Invalid request parameters or validation error |
| `401` | Unauthorized | Missing or invalid API key / signature |
| `403` | Forbidden | Insufficient permissions for this endpoint |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Duplicate reference (payment links) |
| `429` | Too Many Requests | Rate limit exceeded — slow down |
| `500` | Internal Server Error | Something went wrong on our end |

**Error Response Format:**

```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header. Expected: Authorization: Bearer yp_live_..."
}
```

---

## Rate Limits

- **Payment link creation:** Rate limited per client identifier
- All other endpoints: Standard limits apply
- If you receive a `429` response, wait before retrying

---

## Integration Flow

### Redirect Flow (Recommended)

1. **Create payment link** via `POST /api/payment-links`
2. **Redirect customer** to the `paymentUrl` returned
3. Customer completes payment on the YetoPay hosted page
4. Customer is **redirected** to your `successUrl`, `failureUrl`, or `cancelledUrl`
5. **Webhook** is sent to your configured endpoint with the final status

### Iframe Flow

1. Create payment link as above
2. Embed the `paymentUrl` in an iframe on your checkout page
3. Listen for `postMessage` events from the iframe for status updates
4. Handle webhooks for server-side confirmation

---

## Support

- Dashboard: [www.yetopay.co.za](https://www.yetopay.co.za)
- API Docs (interactive): [www.yetopay.co.za/dashboard/api-docs](https://www.yetopay.co.za/dashboard/api-docs)
