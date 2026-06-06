# Multi-Payment Services Blueprint

> YetoPay evolves from EFT-only to a full payment aggregator. Merchants get one integration, multiple payment methods. YetoPay partners with providers (CallPay first) and resells services to merchants.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    ADMIN (Platform)                       │
│  - Enable/disable services globally (payment_services)   │
│  - Configure provider credentials (CallPay, future)      │
│  - Set platform fees per service (service_fees)          │
│  - Override merchant fees per service                    │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────┐
│              PAYMENT SERVICES (Registry)                  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  EFT Direct  │  │ Card (CallPay│  │ Card Direct  │   │
│  │  (internal)  │  │  / hosted)   │  │  (future)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  QR Payments │  │   Vouchers   │  │   Crypto     │   │
│  │ (SnapScan...)│  │ (OTT, 1V...)│  │  (future)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────┐
│            MERCHANT (user_services — existing)            │
│  - Toggle services available to them (isEnabled)         │
│  - Service-specific config in configuration jsonb        │
│  - One API integration covers all methods                │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────┐
│                PAYMENT PAGE (/pay/[token])                │
│                                                          │
│  Multiple services enabled?                              │
│  YES → Show method picker (Card / Pay by Bank / ...)     │
│  NO  → Go direct to that flow                            │
│                                                          │
│  EFT → bank selection → current flow                     │
│  Card → CallPay hosted redirect → webhook → complete     │
└──────────────────────────────────────────────────────────┘
```

---

## Existing Tables We Reuse

| Table | Location | How We Use It |
|-------|----------|---------------|
| `user_services` | `lib/db/schema/system.ts` | Already has serviceName, isEnabled, configuration jsonb per merchant. Merchant toggle for each service. |
| `eft_system_fees` | `lib/db/schema/recon.ts` | Platform-level fee defaults. Extend with `serviceName` column to support per-service fees. |
| `eft_merchant_fees` | `lib/db/schema/recon.ts` | Per-merchant fee overrides. Extend with `serviceName` column. Remove unique on merchantId, add unique on (merchantId, serviceName). |
| `eft_transactions` | `lib/db/schema/eft.ts` | Full transaction lifecycle. Extend with `paymentMethod`, `providerTransactionId`, `providerData` columns. |
| `eft_partner_fees` | `lib/db/schema/partner.ts` | Partner commissions. Extend with `serviceName` for per-service partner fees (later phase). |
| `platform_settings` | `lib/db/schema/settings.ts` | Key-value store. Can hold global provider toggles if needed. |

---

## New Tables

### `payment_services` — Platform service registry

The master definition of what services exist. Admin manages this. `user_services.serviceName` references codes from here.

```
payment_services
├── id: uuid (PK)
├── code: text (unique)          — 'eft_direct', 'card', 'card_direct', etc.
├── name: text                   — 'Pay by Bank (EFT)', 'Card Payments'
├── description: text            — Short description for dashboards
├── category: text               — 'eft', 'card', 'voucher', 'qr', 'crypto', 'wallet'
├── provider: text               — 'internal' or 'callpay'
├── providerConfig: jsonb        — { apiUrl, orgId, authToken, salt, paymentType, webhookIps }
├── icon: text                   — icon name for UI (e.g., 'CreditCard', 'Building2')
├── isActive: boolean            — platform-wide master switch
├── requiresSetup: boolean       — does merchant need extra config?
├── displayOrder: integer        — sort on payment page
├── metadata: jsonb              — extra (min/max amounts, currencies, etc.)
├── createdAt: timestamp
└── updatedAt: timestamp
```

**Seed data:**
| code | name | category | provider | isActive |
|------|------|----------|----------|----------|
| `eft_direct` | Pay by Bank (EFT) | eft | internal | true |
| `card` | Card Payments | card | callpay | false (until configured) |

---

## Modified Tables

### `eft_transactions` — Add payment method tracking

| New Column | Type | Description |
|------------|------|-------------|
| `paymentMethod` | text | Service code: `eft_direct`, `card`, etc. Default `eft_direct` |
| `providerTransactionId` | text | External provider's transaction ID (CallPay `gateway_transaction_id`) |
| `providerData` | jsonb | Provider-specific response data |

Existing EFT-specific columns (`eftBankId`, `customerBank`, etc.) stay null for non-EFT transactions. The `metadata` jsonb can hold method-specific extras.

### `eft_system_fees` — Add service awareness

| New Column | Type | Description |
|------------|------|-------------|
| `serviceName` | text | Service code. Default `eft_direct`. Existing row gets this value. |

Remove single-row assumption. One row per service. Add unique constraint on `serviceName`.

### `eft_merchant_fees` — Add service awareness

| New Column | Type | Description |
|------------|------|-------------|
| `serviceName` | text | Service code. Default `eft_direct`. |

Change unique constraint from `(merchantId)` to `(merchantId, serviceName)`. Existing rows get `serviceName = 'eft_direct'`.

---

## CallPay Integration Details

### Authentication
```
Headers:
  Auth-Token: SHA256(orgId + timestamp + salt)
  Org-Id: {organisation_id}
  Timestamp: {unix_timestamp}
```

### Payment Flow (Hosted Redirect — recommended, no PCI scope)
```
1. YetoPay server → POST https://services.callpay.com/api/v2/payment-key
   Body: { payment_type: "credit_card", amount, merchant_reference, success_url, error_url }
   Response: { key: "abc123", hosted_url: "https://services.callpay.com/hosted/abc123" }

2. Customer browser → Redirect to hosted_url
   CallPay handles card entry, 3DS, processing

3. On completion:
   a) CallPay → Redirect customer to success_url/error_url
   b) CallPay → POST webhook to YetoPay webhook endpoint (async)

4. YetoPay → GET /api/v2/gateway-transaction/{callpay_transaction_id}
   Verify status + amount, update transaction record
```

### Webhook Payload (from CallPay)
```
POST {
  success: 1|0,
  status: "approved"|"declined"|...,
  organisation_id: "...",
  amount: "10.00",
  callpay_transaction_id: "...",
  merchant_reference: "...",    ← maps to our transaction reference
  gateway_reference: "...",
  currency: "ZAR",
  payment_key: "..."
}
```

### Provider Config (stored in `payment_services.providerConfig`)
```json
{
  "apiUrl": "https://services.callpay.com/api/v2",
  "orgId": "123",
  "salt": "encrypted_salt_value",
  "webhookIps": ["54.72.191.28", "54.194.139.201"],
  "supportedPaymentTypes": ["credit_card"]
}
```

### CallPay Payment Types Available
credit_card, eft, snapscan, zapper, capitec_pay, ott_voucher, onevoucher, bluvoucher, mobicred, fasta, payflex, crypto, pay_just_now, and many more. Each can become its own service in `payment_services` as YetoPay expands.

---

## Phases

### Phase 1: Database & Service Foundation ✅ COMPLETE
**Goal:** Create service registry, extend existing tables. Zero breaking changes to current EFT flow.

- [x] Create `payment_services` table + schema in `lib/db/schema/services.ts`
- [x] Add `paymentMethod`, `providerTransactionId`, `providerData` columns to `eft_transactions`
- [x] Add `serviceName` column to `eft_system_fees` (default `eft_direct`, add unique constraint)
- [x] Add `serviceName` column to `eft_merchant_fees` (default `eft_direct`, change unique to merchantId+serviceName)
- [x] Write seed script (`lib/db/seed-services.ts`) for `eft_direct` and `card`
- [x] Seed existing merchants with `eft_direct` in `user_services`
- [x] Backfill `serviceName = 'eft_direct'` on existing fee rows
- [x] Backfill `paymentMethod = 'eft_direct'` on existing transactions
- [x] Export new schema from `lib/db/schema/index.ts`
- [x] Run `npm run db:push` — verified clean

### Phase 2: Admin — Service Management ✅ COMPLETE
**Goal:** Admin can manage the service registry, configure providers, toggle services.

- [x] Admin "Services" page — `/dashboard/admin/services`
  - Service cards with status toggle (active/inactive)
  - Configure provider credentials (CallPay org ID, salt)
  - Test connection button for external providers
  - Provider config modal with save/test
- [x] API: `GET /api/admin/services` — list all services
- [x] API: `POST /api/admin/services` — create new service
- [x] API: `GET/PATCH/DELETE /api/admin/services/[id]` — manage single service
- [x] Add "Services" to admin nav group in DashboardNav

### Phase 3: Admin — Per-Service Fee Management ✅ COMPLETE
**Goal:** Admin sets platform fees per service.

- [x] API: `GET /api/admin/services/[id]/fees` — platform fees for a service
- [x] API: `PUT /api/admin/services/[id]/fees` — set/create platform fees
- [x] Backward compat: existing `/api/admin/recon/fees` still works (returns eft_direct row)

### Phase 4: Merchant — Service Settings ✅ COMPLETE
**Goal:** Merchants can see and toggle their available services.

- [x] Merchant "Services" tab in dashboard settings (`PaymentMethodsSettings` component)
  - Grid of available services (only admin-enabled ones)
  - Enable/disable toggle per service (writes to `user_services`)
  - Shows fee info per service (read-only)
  - Status indicators
- [x] API: `GET /api/merchant/services` — available services + merchant status + fees
- [x] API: `PATCH /api/merchant/services/[serviceName]` — enable/disable
- [x] Added "Services" tab to settings page

### Phase 5: CallPay Provider Integration ✅ COMPLETE
**Goal:** Server-side integration with CallPay API.

- [x] `lib/providers/callpay.ts` — CallPay provider module
  - `generateAuthToken(salt, orgId, timestamp)` — SHA256 token gen
  - `createPaymentKey(config, params)` — POST to `/api/v2/payment-key`, returns `{ key, url, origin }`
  - `getTransaction(config, transactionId)` — GET `/api/v2/gateway-transaction/{id}` for verification
  - `verifyWebhookIp(ip, config)` — IP whitelist check (54.72.191.28, 54.194.139.201)
  - `mapCallPayStatus(status, success)` — maps CallPay status → YetoPay status
- [x] `lib/providers/index.ts` — Provider registry
  - `getProviderConfig(serviceCode)` — reads `payment_services` table for provider config
  - `asCallPayConfig(config)` — validates + types config object as `CallPayConfig`
- [x] API: `POST /api/webhooks/callpay` — handle CallPay webhooks
  - IP whitelist enforcement
  - Parses form-data payload
  - Finds transaction by `merchant_reference`
  - Verifies via CallPay API (amount match check)
  - Maps status and updates transaction + providerData
  - Idempotent (skips already completed/failed)
- [x] API: `POST /api/pay/[token]/initiate-card` — create CallPay payment key
  - Verifies payment token (expiry, revocation)
  - Creates payment key via CallPay API
  - Sets transaction to `paymentMethod: "card"`, `status: "initiated"`
  - Returns `redirectUrl` for frontend redirect

### Phase 6: Payment Page — Multi-Method Support ✅ COMPLETE
**Goal:** Payment page adapts based on merchant's enabled services.

- [x] Update `/api/eft/transactions/[token]/init` to return merchant's `availableServices` array
  - Queries `user_services` for merchant's enabled services
  - Cross-references with active `payment_services`
  - Returns `{ code, name, category, icon }[]` in response payload
- [x] Update `/app/pay/[token]/page.tsx`:
  - Extracts `availableServices` from init response
  - Extracts `card_status` from URL search params (CallPay return flow)
  - Passes both as props to PaymentInterface
  - **Single service → direct to flow** (current EFT behavior, no change)
  - **Multiple services → method picker first:**
    ```
    ┌────────────────────────────────────┐
    │  How would you like to pay?        │
    │                                    │
    │  ┌──────────┐    ┌──────────┐     │
    │  │ 🏦 Pay   │    │ 💳 Pay   │     │
    │  │ by Bank  │    │ by Card  │     │
    │  └──────────┘    └──────────┘     │
    └────────────────────────────────────┘
    ```
  - **EFT flow:** YetoPayEFT renders unchanged (bank selection → auth → complete)
  - **Card flow:** calls `/api/pay/[token]/initiate-card` → redirect to CallPay → return
- [x] Update PaymentInterface component as multi-method orchestrator
  - Method picker UI matching YetoPayEFT visual style (gradient header, merchant card)
  - Card payment initiation with loading/redirect state
  - Card error recovery (retry + back buttons)
  - Card return result screens (success/error/cancelled) with auto-redirect to merchant
  - Failed/cancelled card returns update transaction via complete endpoint
  - Success handled by CallPay webhook (avoids EFT signature requirement)
- [x] YetoPayEFT component completely untouched — zero risk to existing EFT flow
- [x] Unified result screens for card returns (success/pending/error)
- [x] Mobile-first responsive design (matches existing payment page styling)

### Phase 7: Reconciliation & Reporting Updates ✅ COMPLETE
**Goal:** Extend billing and reporting for multi-service.

- [x] Schema: added `serviceName` column to `eft_invoice_items` table
- [x] Invoice generation groups transactions by `paymentMethod`, resolves per-service fees, creates separate line items per service with correct fee calculations
- [x] Admin recon fees API (`GET/PATCH /api/admin/recon/fees`) — service-aware via `?serviceName` param, backward compatible
- [x] Admin merchant fees API (`GET/PUT/DELETE /api/admin/recon/merchant-fees/[id]`) — service-aware via `?serviceName` param and body field
- [x] Merchant transaction list — added "Method" column with color-coded badges (EFT blue, Card purple), payment method filter dropdown, CSV export includes method
- [x] Merchant transactions API — added `paymentMethod` filter parameter
- [x] Merchant analytics API — added `paymentMethodBreakdown` with per-method stats (count, revenue, success rate)
- [ ] Update partner fee calculations for multi-service (deferred — partners not yet earning on card)
- [x] API documentation updated to v2.0.0 (`docs/API_REFERENCE.md`) — multi-method support, `paymentMethod` field, migration guide, updated code examples (Node.js, Python, PHP)

### Phase 8: Future — Direct Card Processing
**Goal:** Build own card gateway (like EFT direct), bypassing CallPay.

- [ ] PCI DSS compliance assessment
- [ ] Direct card gateway integration
- [ ] Card tokenization
- [ ] 3D Secure flow
- [ ] `card_direct` service in registry — replaces or supplements `card`

---

## Payment Page UX Flow

### Single Service (Current — EFT Only)
```
/pay/[token] → Bank Selection (ABSA, FNB...) → EFT Service → Success/Failure
```
No change. If merchant only has EFT enabled, payment page works exactly as today.

### Multiple Services (New)
```
/pay/[token]
    │
    ▼
┌─────────────────────────────────────┐
│         How would you like to pay?  │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │  💳 Card    │  │  🏦 Pay by  │  │
│  │  Payment    │  │    Bank     │  │
│  └──────┬──────┘  └──────┬──────┘  │
└─────────┼────────────────┼─────────┘
          │                │
          ▼                ▼
   CallPay Hosted     Bank Selection
   (card form)        (existing EFT)
          │                │
          ▼                ▼
   Webhook + redirect  EFT Service
          │                │
          ▼                ▼
   ┌────────────────────────────────┐
   │      Unified Result Screen    │
   │   (Success / Pending / Error) │
   └────────────────────────────────┘
```

---

## Fee Model

### Three-Tier Fee Resolution (per service)
```
1. merchant fee override? → eft_merchant_fees WHERE merchantId AND serviceName
2. platform default?      → eft_system_fees WHERE serviceName
3. hardcoded fallback     → should never happen
```

### Invoice Example (Multi-Service)
```
Invoice #INV-2026-0042 — Example Store — May 2026

  Pay by Bank (EFT) — 42 transactions
    42 × R5.00 fixed fee = R210.00

  Card Payments (CallPay) — 18 transactions
    R18,000 volume × 2.5% = R450.00

  Subtotal: R660.00
  VAT (15%): R99.00
  Total Due: R759.00
```

---

## API Changes Summary

### New Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/admin/services` | List / create payment services |
| PATCH/DELETE | `/api/admin/services/[id]` | Manage single service |
| GET/PUT | `/api/admin/services/[id]/fees` | Platform fees for service |
| GET | `/api/merchant/services` | Merchant's available services |
| PATCH | `/api/merchant/services/[serviceName]` | Toggle service on/off |
| POST | `/api/webhooks/callpay` | CallPay webhook receiver |
| POST | `/api/pay/[token]/initiate-card` | Start card payment via provider |

### Modified Endpoints
| Endpoint | Change |
|----------|--------|
| `GET /api/eft/transactions/[token]/init` | Also return enabled services list |
| `POST /api/payment-links` | Accept optional `paymentMethod` param |
| `POST /api/eft/transactions/[token]/complete` | Handle card completions too |
| `GET /api/merchant/transactions` | Add paymentMethod filter |
| `GET/PATCH /api/admin/recon/fees` | Service-aware (backward compat kept) |
| `GET/PUT /api/admin/recon/merchant-fees/[id]` | Service-aware |

---

## Navigation Changes

### Admin Nav
```
Admin ▾
  ├── Merchants
  ├── Partners
  ├── Users
  ├── Services        ← NEW
  ├── Banks
  ├── Recon
  └── KYC
```

### Merchant Settings
```
Settings
  ├── Profile
  ├── Company
  ├── Payment Methods  ← NEW (toggle services)
  ├── Bank Accounts
  ├── EFT Settings
  ├── Notifications
  └── API Keys
```

---

## Migration Strategy

All phases are independently deployable. No big-bang migration.

1. **Phase 1** — new `payment_services` table + extend existing tables. Backfill defaults. Zero breaking changes.
2. **Phases 2-4** — admin + merchant can manage services. EFT auto-enabled for all. Existing fee endpoints still work.
3. **Phase 5** — CallPay backend ready. Admin configures credentials. No user-facing change yet.
4. **Phase 6** — Payment page update. Merchants who enable card see multi-method page. Others unchanged.
5. **Phase 7** — Reporting catches up. Multi-service invoicing..

---

## Security Considerations

- CallPay credentials encrypted at app level before storing in `providerConfig` jsonb
- CallPay webhook IP whitelist enforced (54.72.191.28, 54.194.139.201)
- Card data NEVER touches YetoPay servers (hosted redirect = CallPay handles PCI)
- Payment key generation is server-side only (salt/auth never exposed to frontend)
- Always verify transaction via CallPay API lookup — don't trust redirect params alone
- Rate limiting on webhook endpoints and payment key generation
- Service toggles require admin role for platform, merchant role for their own
