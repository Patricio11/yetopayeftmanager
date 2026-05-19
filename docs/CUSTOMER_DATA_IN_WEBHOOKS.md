# Customer Data in Merchant Webhooks

## What Changed

The EFT service returns customer banking details (name, account number, account type, bank, branch code) on completed transactions. Previously this data was ignored — the merchant webhook only included transaction-level fields like `reference`, `amount`, and `status`.

Now, customer data is:

1. **Saved to the transaction record** in dedicated columns (`customer_name`, `customer_account`, `customer_account_type`, `customer_bank`, `customer_branch_code`)
2. **Included in all merchant webhook payloads** — both the modern `dispatchWebhookEvent` system and the legacy `notifyUrl` callback

## New Schema Columns

| Column | Type | Description |
|--------|------|-------------|
| `customer_account` | text | Customer's bank account number |
| `customer_account_type` | text | Account type (e.g. "current", "savings") |
| `customer_bank` | text | Customer's bank code (e.g. "standard") |
| `customer_branch_code` | text | Branch code (e.g. "051001") |

The existing `customer_name` column is now populated from the EFT service response.

## Updated Webhook Payload

Merchant webhooks now include a `customer` object:

```json
{
  "event": "payment.completed",
  "data": {
    "id": "1e7a1228-...",
    "reference": "TEST-1779217914167-ESW06Z",
    "amount": 1,
    "status": "completed",
    "customerName": "prettygirl",
    "customer": {
      "name": "prettygirl",
      "account": "10210089782",
      "account_type": "current",
      "bank": "standard",
      "branch_code": "051001"
    },
    "bankName": "FNB",
    "metadata": { ... },
    "createdAt": "2026-05-19T19:11:55.702Z",
    "completedAt": "2026-05-19T19:14:10.000Z"
  }
}
```

## Files Modified

- `lib/db/schema/eft.ts` — Added `customerAccount`, `customerAccountType`, `customerBank`, `customerBranchCode` columns
- `app/api/eft/webhooks/route.ts` — Extracts `customer` from EFT service webhook, saves to DB, includes in merchant webhook payloads
- `app/api/eft/transactions/[token]/complete/route.ts` — Includes customer data in webhook event data and legacy notifyUrl payload

## Migration

Run `npm run db:push` to add the new columns to the database.
