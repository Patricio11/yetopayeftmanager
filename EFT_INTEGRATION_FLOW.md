# EFT Integration Flow — YetoPay Manager ↔ EFT Service

Complete documentation of how the YetoPay web platform communicates with the external EFT service, from authentication through to payment completion and webhook delivery.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER BROWSER                            │
│                                                                     │
│   /pay/[token]  →  Bank Selection  →  Auth Form  →  Result Page    │
│        │                │                 │               │         │
│        ▼                ▼                 ▼               ▼         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │               YetoPayEFT Component (Client)                │   │
│   │   • Renders bank list                                       │   │
│   │   • Renders EFT service forms (inputs, captcha, OTP)       │   │
│   │   • SSE listener for real-time status                      │   │
│   └───────────────────────┬─────────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
              ┌─────────────┼──────────────────┐
              ▼                                ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│   YETOPAY NEXT.JS API    │    │     EFT SERVICE (External)   │
│                          │    │                              │
│  /api/eft/transactions/  │    │  /{bankCode}/load_bank       │
│    [token]/init          │    │  /{bankCode}/auth            │
│    [token]/jwt           │    │  /{bankCode}/setup           │
│    [token]/update-bank   │    │  /{bankCode}/payment         │
│    [token]/complete      │    │  /{bankCode}/final           │
│  /api/eft/jwt            │    │  /{bankCode}/events (SSE)    │
│  /api/eft/webhooks       │◄───│  Webhook callback            │
│                          │    │                              │
│  Database (Neon PG)      │    │  Hosted on AWS EC2           │
│  • eftTransactions       │    │                              │
│  • eftBanks              │    │                              │
│  • paymentTokens         │    │                              │
│  • eftBankAccounts       │    │                              │
└──────────────────────────┘    └──────────────────────────────┘
```

---

## 1. Payment Link Creation

Before any EFT flow starts, a merchant creates a payment link via the dashboard or API.

**Endpoint:** `POST /api/payment-links`

**What happens:**
1. Create an `eftTransactions` record with status `not_started`
2. Generate a cryptographically secure payment token (32 random bytes, base64url)
3. Store the SHA-256 hash of the token in the `paymentTokens` table (plain token is never stored)
4. Return the payment URL: `https://yourdomain.co.za/pay/{token}`

**Token properties:**
- Expires after configurable hours (default: 24, max: 168)
- Max 10 access attempts before lockout
- Can be single-use or reusable (configured in `eftSettings`)
- Revocable by merchant

---

## 2. Payment Page Load (/pay/[token])

When a customer clicks the payment link:

### 2a. Server-Side Initialization

**File:** `app/pay/[token]/page.tsx` (Server Component)

Calls the init endpoint internally:

**Endpoint:** `GET /api/eft/transactions/[token]/init`

**Steps:**
1. Hash the token with SHA-256
2. Look up the hash in `paymentTokens` table
3. Validate: not revoked, not used, not expired, access_count < 10
4. Increment `accessCount`, update `lastAccessedAt`
5. Fetch the `eftTransactions` record
6. Block if already in terminal state (completed, failed, aborted, cancelled, expired)
7. Fetch merchant info from `users` table
8. Fetch merchant's primary bank account from `eftBankAccounts`
9. Fetch all enabled banks from `eftBanks` (ordered by `displayOrder`)

**Response payload:**
```json
{
  "sessionId": "transaction-uuid",
  "paymentDetails": {
    "amount": 150.00,
    "reference": "INV-001",
    "description": "Payment for order #123",
    "notifyUrl": "https://merchant.com/webhooks",
    "successUrl": "https://merchant.com/success",
    "failureUrl": "https://merchant.com/failure",
    "cancelledUrl": "https://merchant.com/cancelled"
  },
  "merchant": {
    "id": "merchant-uuid",
    "name": "Acme Store",
    "logo": null,
    "email": "billing@acme.com",
    "bankAccount": {
      "accountNumber": "****5678",
      "accountHolderName": "Acme Store (Pty) Ltd",
      "bankCode": "fnb"
    }
  },
  "banks": [
    { "code": "fnb", "name": "FNB", "color": "#009FDA", "eftServiceUrl": null },
    { "code": "absa", "name": "ABSA", "color": "#AF1F2D", "eftServiceUrl": null },
    { "code": "africanbank", "name": "African Bank", "color": "#FF6600", "eftServiceUrl": "https://other-service.com/v1/eft" }
  ],
  "isDemo": false,
  "token": "payment-token"
}
```

### 2b. JWT Token Generation

Before interacting with the EFT service, the frontend requests a JWT.

**Endpoint:** `POST /api/eft/transactions/[token]/jwt`

**Steps:**
1. Verify the payment token (same as init)
2. Load the RSA private key (from `EFT_JWT_PRIVATE_KEY` env var or `./keys/private.key` file)
3. Fetch merchant's primary bank account details
4. Build JWT payload:

```json
{
  "merchant_account_number": "1234567890",
  "merchant_account_name": "Acme Store",
  "merchant_account_type": "cheque",
  "merchant_bank": "fnb",
  "merchant_reference": "INV-001",
  "notify_url": "https://yourdomain.co.za/api/eft/webhooks",
  "iat": 1712505600,
  "exp": 1712509200
}
```

5. Sign with RS256 algorithm (RSA-SHA256)
6. Return token with 1-hour expiry

**Response:**
```json
{
  "jwt_token": "eyJhbGciOiJSUzI1NiJ9...",
  "expires_in": 3600,
  "eft_service_url": "https://api.yetopayeft.com/v1/eft"
}
```

> **Key sharing:** The EFT service holds the corresponding `public.key` to verify JWT signatures. Only YetoPay can issue tokens; only the EFT service can verify them.

---

## 3. Per-Bank URL Routing

Each bank can use a different EFT service instance.

**How it works:**
- The `eftBanks` table has an optional `eftServiceUrl` column
- If set: the frontend calls that URL for the bank
- If null: falls back to the `NEXT_PUBLIC_EFT_SERVICE_URL` environment variable

**Example:**
```
FNB:          eftServiceUrl = null          → https://api.yetopayeft.com/v1/eft
ABSA:         eftServiceUrl = null          → https://api.yetopayeft.com/v1/eft
African Bank: eftServiceUrl = "https://other-eft-service.up.railway.app/v1/eft"
```

**Managed in:** Dashboard > Settings > EFT > Banks (admin only)

---

## 4. Bank Selection

Customer selects their bank on the payment page.

**Endpoint:** `POST /api/eft/transactions/[token]/update-bank`

**Steps:**
1. Verify payment token
2. Update `eftTransactions`:
   - `status` → `initiated`
   - `eftBankId` → selected bank's UUID
   - `metadata` → `{ bank_selected_at, bank_code, bank_name }`
3. Dispatch `transaction.updated` webhook to merchant

---

## 5. EFT Service Step Chain

After bank selection, the frontend communicates directly with the EFT service. YetoPay acts as the auth issuer — the EFT service trusts the JWT.

### Request Pattern

All EFT service calls follow this format:

```
POST {eftServiceUrl}/{bankCode}/{step}?session_id={transactionId}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{ ...form data from previous step... }
```

### Step Sequence

```
load_bank  →  auth  →  setup  →  select/payment  →  final
```

Each response contains:
```json
{
  "step": "auth",
  "next_step": "setup",
  "inputs": [
    { "type": "text", "name": "username", "label": "Internet Banking Username" },
    { "type": "password", "name": "password", "label": "Password" },
    { "type": "captcha", "name": "captcha", "image": "data:image/png;base64,..." }
  ],
  "status": "processing",
  "message": "Enter your banking credentials"
}
```

### Input Types

| Type | Description |
|------|-------------|
| `text` | Standard text input |
| `password` | Masked password input |
| `select` | Dropdown (account selection) |
| `checkbox` | Boolean toggle |
| `hidden` | Hidden field (passed through) |
| `captcha` | Image captcha with text input |
| `tc` | Terms and conditions acceptance |
| `submit` | Action button |
| `input-group` | Grouped inputs (e.g., OTP fields) |

### Terminal Detection

A step is terminal when any of:
- `status` = `"success"` or `"failed"`
- `type` = `"result"`
- `category` = `"done"`

---

## 6. Real-Time Status Updates

### Option A: Server-Sent Events (Primary)

**Connection:**
```
GET {eftServiceUrl}/{bankCode}/events?session_id={transactionId}&token={jwtToken}
```

**Events received:**

| Event | Meaning | Action |
|-------|---------|--------|
| `connected` | SSE connection established | Update UI indicator |
| `payment_success` | Payment completed at bank | Call complete endpoint, redirect |
| `payment_failed` | Payment failed at bank | Call complete endpoint, show error |
| `step_update` | New form/status from bank | Render new inputs or processing state |
| `heartbeat` | Keep-alive | No action |

### Option B: Polling Fallback

If SSE fails (browser/proxy limitation), falls back to polling:

```
POST {eftServiceUrl}/{bankCode}/final?session_id={transactionId}
Authorization: Bearer {jwt_token}
```

Polls every 3 seconds until a terminal status is detected.

---

## 7. Transaction Completion

When the EFT service reports success or failure, the frontend finalizes the transaction.

**Endpoint:** `POST /api/eft/transactions/[token]/complete`

**Request body:**
```json
{
  "status": "completed",
  "eftSignature": "a1b2c3d4e5...",
  "metadata": {
    "gateway_result": "Payment successful",
    "transaction_status": "SUCCESS",
    "destination_account": "****5678",
    "destination_bank": "FNB",
    "customer_bank": "ABSA",
    "session_id": "eft-session-uuid"
  }
}
```

**Signature verification (for `completed` status only):**

The EFT service provides an HMAC-SHA256 signature that proves the payment actually succeeded:

```
signature = HMAC-SHA256(
  key: EFT_WEBHOOK_SECRET,
  data: "{transactionId}|{amount}|{reference}|completed"
)
```

YetoPay verifies this with timing-safe comparison to prevent:
- Frontend spoofing a "completed" status
- Timing attacks on the signature check

**After verification:**
1. Update `eftTransactions.status` in database
2. Set `completedAt` timestamp
3. Store all metadata
4. Dispatch webhook: `payment.completed`, `payment.failed`, or `payment.cancelled`
5. Frontend redirects customer to merchant's `successUrl` or `failureUrl` after 4 seconds

---

## 8. Webhook Flow (EFT Service → YetoPay → Merchant)

### 8a. Inbound: EFT Service Webhook

The EFT service sends a webhook when payment status changes server-side.

**Endpoint:** `POST /api/eft/webhooks`

**Request from EFT service:**
```json
{
  "transaction_id": "uuid",
  "status": "completed",
  "amount": 150.00,
  "timestamp": "2026-04-07T14:30:00Z",
  "metadata": { ... }
}
```

**Header:**
```
X-Signature: HMAC-SHA256(EFT_WEBHOOK_SECRET, JSON.stringify({transaction_id, status, amount, timestamp}))
```

**Verification steps:**
1. Validate signature with timing-safe comparison
2. Check timestamp is within 5 minutes (prevent replay attacks)
3. Verify amount matches the transaction amount in DB (prevent tampering)
4. Check transaction is not already in a terminal state
5. Update transaction status in database

### 8b. Outbound: Merchant Webhook

After updating the transaction, YetoPay dispatches webhooks to the merchant.

**Webhook lookup:**
1. Query `webhookConfigurations` where `merchantId` matches and `isActive = true`
2. Filter by event type — supports patterns:
   - Exact: `payment.completed`
   - Wildcard: `payment.*` or `*`
   - Group: `payment.all`

**Delivery:**
```
POST {merchant_webhook_url}

Headers:
  Content-Type: application/json
  X-Webhook-Signature: HMAC-SHA256(merchant_webhook_secret, body)
  X-Webhook-Timestamp: 1712505600
  X-Webhook-ID: unique-delivery-id
  X-Webhook-Event: payment.completed

Body:
{
  "event": "payment.completed",
  "timestamp": "2026-04-07T14:30:00Z",
  "data": {
    "transactionId": "uuid",
    "reference": "INV-001",
    "amount": 150.00,
    "status": "completed",
    "bankCode": "fnb",
    "completedAt": "2026-04-07T14:30:00Z",
    "metadata": { ... }
  }
}
```

**Retry policy:**
- Failed deliveries stored in `webhookDeliveries` table
- Exponential backoff: 2^n seconds between retries
- Configurable max retries per webhook configuration
- Retries processed when `nextRetryAt <= now()`

**Legacy notify URL:**
- If the transaction has a `notifyUrl` set (from payment link creation), a separate fire-and-forget webhook is sent there too
- Header: `X-ONEGATEEFT-Signature`

---

## 9. Transaction State Machine

```
                    ┌──────────────┐
                    │  not_started │
                    └──────┬───────┘
                           │ bank selected
                           ▼
                    ┌──────────────┐
                    │  initiated   │
                    └──────┬───────┘
                           │ credentials submitted
                           ▼
                    ┌──────────────┐
              ┌─────│   pending    │─────┐
              │     └──────────────┘     │
              ▼              │           ▼
     ┌──────────────┐       │    ┌──────────────┐
     │   completed  │       │    │    failed     │
     └──────────────┘       │    └──────────────┘
                            ▼
                  ┌──────────────────┐
                  │ cancelled/aborted│
                  │    /expired      │
                  └──────────────────┘
```

**Terminal states** (no further transitions): `completed`, `failed`, `aborted`, `cancelled`, `expired`

---

## 10. Security Summary

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| JWT signing | RS256 (RSA-2048) | Only YetoPay can issue tokens; EFT service verifies with public key |
| Webhook inbound | HMAC-SHA256 + timing-safe compare | Verify EFT service identity |
| Webhook replay | 5-minute timestamp window | Prevent old webhooks from being replayed |
| Amount verification | Compare webhook amount vs DB | Prevent amount tampering |
| Completion signature | HMAC-SHA256 (`eftSignature`) | Prevent frontend from spoofing success |
| Payment token | SHA-256 hash stored, plain returned once | Token can't be extracted from DB |
| Token rate limit | Max 10 access attempts | Prevent brute-force token guessing |
| Webhook outbound | HMAC-SHA256 per merchant secret | Merchant can verify YetoPay identity |
| Credential storage | AES-256 + device fingerprint | Browser-side encrypted credential vault |

---

## 11. Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_EFT_SERVICE_URL` | Default EFT service URL (fallback when bank has no custom URL) |
| `EFT_JWT_PRIVATE_KEY_PATH` | Path to RSA private key file (dev: `./keys/private.key`) |
| `EFT_JWT_PRIVATE_KEY` | Full RSA private key as string (production, takes priority over path) |
| `EFT_WEBHOOK_SECRET` | Shared secret between YetoPay and EFT service for webhook signing |
| `PAYMENT_TOKEN_SECRET` | Secret used in payment token generation |
| `CREDENTIAL_ENCRYPTION_KEY` | AES-256 key for credential tokenization |
| `CREDENTIAL_ENCRYPTION_SALT` | Salt for credential encryption |

---

## 12. Key Files

| File | Purpose |
|------|---------|
| `app/api/eft/jwt/route.ts` | JWT generation (authenticated merchants) |
| `app/api/eft/transactions/[token]/jwt/route.ts` | JWT generation (public payment links) |
| `app/api/eft/transactions/[token]/init/route.ts` | Transaction initialization and data loading |
| `app/api/eft/transactions/[token]/complete/route.ts` | Finalize transaction with signature verification |
| `app/api/eft/transactions/[token]/update-bank/route.ts` | Record bank selection |
| `app/api/eft/webhooks/route.ts` | Receive and verify EFT service webhooks |
| `app/pay/[token]/page.tsx` | Server-rendered payment page |
| `components/payment/PaymentInterface.tsx` | Client wrapper — routes bank data to EFT component |
| `components/payment/EftServiceTheme/YetoPayEFT.tsx` | Main payment UI — step orchestration, SSE, forms |
| `lib/security/payment-token.ts` | Token generation, verification, revocation |
| `lib/webhooks/dispatcher.ts` | Outbound webhook dispatch with retry logic |
| `lib/db/schema/eft.ts` | Database schema for all EFT tables |
| `keys/private.key` | RSA private key (YetoPay keeps this) |
| `keys/public.key` | RSA public key (shared with EFT service) |

---

## 13. Complete Sequence Diagram

```
Customer          YetoPay (Next.js)              EFT Service (EC2)         Merchant
   │                     │                              │                     │
   │  GET /pay/[token]   │                              │                     │
   │────────────────────>│                              │                     │
   │                     │  verify token, load data     │                     │
   │                     │  fetch banks, merchant       │                     │
   │  payment page HTML  │                              │                     │
   │<────────────────────│                              │                     │
   │                     │                              │                     │
   │  POST /jwt          │                              │                     │
   │────────────────────>│                              │                     │
   │                     │  sign JWT (RS256)            │                     │
   │  { jwt_token }      │                              │                     │
   │<────────────────────│                              │                     │
   │                     │                              │                     │
   │  select bank (FNB)  │                              │                     │
   │────────────────────>│                              │                     │
   │                     │  update status→initiated     │                     │
   │                     │──── webhook: transaction.updated ─────────────────>│
   │                     │                              │                     │
   │  POST /fnb/load_bank (with JWT)                    │                     │
   │───────────────────────────────────────────────────>│                     │
   │  { inputs: [username, password, captcha] }         │                     │
   │<───────────────────────────────────────────────────│                     │
   │                     │                              │                     │
   │  POST /fnb/auth (credentials)                      │                     │
   │───────────────────────────────────────────────────>│                     │
   │  { next_step: "setup", inputs: [...] }             │                     │
   │<───────────────────────────────────────────────────│                     │
   │                     │                              │                     │
   │  ... more steps (setup, select, payment) ...       │                     │
   │                     │                              │                     │
   │  SSE: /fnb/events?session_id=xxx                   │                     │
   │───────────────────────────────────────────────────>│                     │
   │  event: payment_success                            │                     │
   │<───────────────────────────────────────────────────│                     │
   │                     │                              │                     │
   │                     │  POST /api/eft/webhooks      │                     │
   │                     │  (signed, with amount)       │                     │
   │                     │<─────────────────────────────│                     │
   │                     │  verify sig, update DB       │                     │
   │                     │──── webhook: payment.completed ───────────────────>│
   │                     │                              │                     │
   │  POST /complete     │                              │                     │
   │  (eftSignature)     │                              │                     │
   │────────────────────>│                              │                     │
   │                     │  verify signature            │                     │
   │                     │  update status→completed     │                     │
   │  redirect to        │                              │                     │
   │  merchant successUrl│                              │                     │
   │<────────────────────│                              │                     │
   │                     │                              │                     │
   │  GET /success?status=success&reference=INV-001     │                     │
   │────────────────────────────────────────────────────────────────────────>│
```
