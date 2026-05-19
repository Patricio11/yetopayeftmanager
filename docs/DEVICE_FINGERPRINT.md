# Device Fingerprint for Fraud Detection

## What Changed

A device fingerprint is now persisted on each transaction record for fraud detection and device identification. The fingerprint was already being collected on the frontend (user agent, screen resolution, timezone, language, platform, hardware concurrency, etc.) but was only stored transiently in metadata.

Now it is saved to a dedicated `device_fingerprint` column on the `eft_transactions` table, making it queryable and indexable for fraud analysis.

## How It Works

1. **Collection** — When the payment page loads, `getDeviceFingerprint()` generates a SHA-256 hash from browser characteristics (user agent, screen resolution, timezone, language, platform, hardware concurrency, device memory, touch support, color depth)
2. **Transmission** — The fingerprint is sent along with the transaction completion request to `/api/eft/transactions/[token]/complete`
3. **Storage** — The complete route saves the fingerprint to the `device_fingerprint` column on the transaction record

## New Schema Column

| Column | Type | Description |
|--------|------|-------------|
| `device_fingerprint` | text | SHA-256 hash of browser/device characteristics |

## Use Cases

- **Fraud detection**: Flag transactions from the same device using different identities
- **Device tracking**: Identify repeat customers across sessions
- **Risk scoring**: Correlate device fingerprints with failed/disputed transactions
- **Velocity checks**: Detect rapid-fire transactions from the same device

## Files Modified

- `lib/db/schema/eft.ts` — Added `deviceFingerprint` column
- `app/api/eft/transactions/[token]/complete/route.ts` — Accepts and saves `deviceFingerprint` from request body
- `components/payment/EftServiceTheme/YetoPayEFT.tsx` — Sends `deviceFingerprint` in the completion payload

## Migration

Run `npm run db:push` to add the new column to the database.
