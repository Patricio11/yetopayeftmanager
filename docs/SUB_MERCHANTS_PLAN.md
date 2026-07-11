# Partner Sub-Merchants (Connector Merchants) — Build Plan

## Scenario
A partner (e.g. **ONEGATE**) is integrated via API/connector. Merchants on the
partner's platform (e.g. **Jabula Bet**) initiate payments there. When ONEGATE
calls YetoPay to create a payment link (key), it can pass **merchant info** in
the request. The transaction then belongs to that merchant — the payment page
shows the merchant's name/logo and the money goes to the **merchant's bank
account**, not the partner's.

If the merchant doesn't exist yet in YetoPay it is **auto-created silently**
(no invitation, no email required) as a partner-managed record used for recon,
analytics and invoicing. Merchant `name` is **unique per partner** — subsequent
calls can send just `merchant.name` and all stored details are reused. The
partner can later edit the record (add email, phone, bank details) and
optionally invite them to become a full YetoPay user.

## Design decisions
1. **Sub-merchants are real `users` rows** with `role: "merchant"`,
   `partnerId: <partner>`, `isActive: false`, and
   `metadata.managedByPartner: true`. No credential account → cannot log in.
   - Why: partner analytics/recon/dashboard/invoices all already join via
     `users.partnerId`, and the payment page already reads merchant display +
     bank details from `users` + `eftBankAccounts`. Everything downstream works
     with no query changes.
2. **Synthetic email** for records created without one (users.email is NOT NULL
   UNIQUE): `sub-<slug>-<shortid>@sub.yetopay.internal`. Replaced when the
   partner edits/invites.
3. **Name matching**: case-insensitive on `companyName` scoped to the partner
   (`partnerId = caller AND lower(companyName) = lower(name)`).
4. **Bank details required on first live use**: if the resolved sub-merchant is
   new (or has no primary bank account) and the partner account is in live
   mode, the create-key call must include `merchant.bankAccount` — otherwise
   the customer would hit "no bank account configured" at pay time. Clear 400
   at creation instead.
5. **Demo/live inheritance**: a new sub-merchant inherits the partner's
   `accountMode` so demo partners create demo transactions.
6. **Only partners** may send the `merchant` object. A normal merchant API key
   sending it gets a clear 403 error.
7. **Webhooks**: transactions belonging to a sub-merchant dispatch webhook
   events to the **partner's** webhook endpoints (the sub-merchant has none).
   Per-call `notifyUrl` continues to work as today.

## API — request example
```jsonc
POST /api/payment-links            // Authorization: Bearer yp_... (partner key)
{
  "amount": 150.00,
  "reference": "JB-889231",
  "description": "Wallet top-up",
  "merchant": {
    "name": "Jabula Bet",                 // required, unique per partner
    "email": "ops@jabulabet.com",         // optional
    "phone": "+264 81 000 0000",          // optional
    "logoUrl": "https://.../logo.png",    // optional
    "bankAccount": {                      // required first time (live)
      "accountHolderName": "Jabula Bet (Pty) Ltd",
      "accountNumber": "62123456789",
      "bankCode": "FNB",
      "branchCode": "250655",
      "accountType": "cheque"
    }
  }
}
```
Subsequent calls: `"merchant": { "name": "Jabula Bet" }` — everything reused.
Response includes `merchant: { id, name, created: true|false }` so the
connector can store the YetoPay merchant id.

## Phases

### Phase 1 — Sub-merchant resolver library
- [x] `lib/partners/sub-merchants.ts`
  - [x] `resolveSubMerchant(partnerId, input)` → find by (partnerId, name
        case-insensitive); create shadow user + primary bank account when new;
        update stored details when new info is supplied
  - [x] Synthetic email generator + slug helper
  - [x] Returns `{ merchant, created }`
- [x] Zod schema for the `merchant` payload (shared)

### Phase 2 — Extend payment-link creation
- [x] `app/api/payment-links/route.ts` POST:
  - [x] Accept optional `merchant` object
  - [x] Load caller user; if `merchant` present require `role === "partner"`
  - [x] Resolve/create sub-merchant; use its id as `transaction.merchantId`
  - [x] Live + no primary bank account → 400 with actionable message
  - [x] Demo flag from sub-merchant `accountMode`
  - [x] Duplicate-reference check against the sub-merchant (unchanged logic)
  - [x] URL fallbacks: per-call → sub-merchant defaults → partner defaults
  - [x] Response includes `merchant { id, name, created }`

### Phase 3 — Webhook routing for sub-merchant transactions
- [x] `lib/webhooks/dispatcher.ts`: when the transaction's merchant is
      partner-managed (or simply has no webhook endpoints and has a partnerId),
      dispatch to the partner's endpoints
- [x] Include `merchant: { id, name }` in event payloads for partner recon

### Phase 4 — Partner UI polish
- [x] Partner merchants list: "API-managed" badge for shadow merchants
      (`metadata.managedByPartner`), they already appear via partnerId
- [x] Merchant detail page: allow editing name/email/phone + bank account
- [x] "Invite to YetoPay" action (requires a real email) → existing partner
      invitation flow; accept-invitation already activates the user
- [x] Partner transactions/analytics: verify sub-merchant names render (they
      come from `users.companyName` — should be automatic)

### Phase 5 — Docs
- [x] Update `docs/API_REFERENCE_v2.md` + API docs page with the `merchant`
      object, first-call vs repeat-call examples, and error codes

### Phase 6 — Verification
- [x] `npx tsc --noEmit`
- [x] End-to-end walkthrough: partner key → create link with new merchant →
      pay page shows merchant name + merchant bank → recon/analytics grouping →
      repeat call with name only → same merchant reused
