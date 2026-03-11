# Partner System, Iframe Management & Platform Enhancements

## Overview

This changelog covers the full partner management system, dynamic iframe domain whitelisting, proxy migration, and domain collection across the platform.

---

## 1. Partner System

### Database Schema
- **`lib/db/schema/users.ts`** — Added `"partner"` role to user enum, added `partnerId` field for merchant-to-partner relationship, added `showTermsAndConditions` to `eftSettings` JSONB
- **`lib/db/schema/partner.ts`** (NEW) — Three new tables:
  - `eftPartnerFees` — Commission configuration (mode: `handle_outside` or `commission`, fee types: fixed/percentage/volume)
  - `eftPartnerInvoices` — Partner commission invoices with `merchantBreakdown` JSONB
  - `eftPartnerInvoiceItems` — Invoice line items with optional merchantId

### Authorization
- **`lib/auth/authorization.ts`** — Added `requirePartner()` and `isPartner()` helpers
- **`lib/auth-server.ts`** — Updated `requireRole()` to accept `"partner"`

### Email Templates
- **`lib/email.ts`** — Added:
  - `sendPartnerInvitationEmail()` — Purple-themed invitation
  - `sendMerchantInvitedByPartnerEmail()` — Green-themed merchant invitation from partner
  - `sendPartnerActionNotificationEmail()` — Amber alert for admin notifications on partner actions

### Admin Partner Management APIs
- **`app/api/admin/partners/route.ts`** — GET (list partners), POST (create via invitation)
- **`app/api/admin/partners/[id]/route.ts`** — GET (detail + stats), PATCH (update), DELETE (soft-delete)
- **`app/api/admin/partners/[id]/commission/route.ts`** — GET/PUT commission config
- **`app/api/admin/partners/[id]/merchants/route.ts`** — GET merchants belonging to partner

### Partner Dashboard APIs
- **`app/api/partner/dashboard/route.ts`** — Summary stats (merchant counts, monthly transactions)
- **`app/api/partner/merchants/route.ts`** — GET (list with search/filter/pagination), POST (create merchant + admin notification)
- **`app/api/partner/merchants/[id]/route.ts`** — GET (merchant detail scoped to partner), PATCH (limited settings update + admin notification + audit log)
- **`app/api/partner/merchants/invite/route.ts`** — POST dedicated invite endpoint
- **`app/api/partner/transactions/route.ts`** — GET cross-merchant transactions with filters
- **`app/api/partner/analytics/route.ts`** — GET aggregated analytics with per-merchant breakdown
- **`app/api/partner/invoices/route.ts`** — GET partner commission invoices

### Admin Partner Pages
- **`app/dashboard/admin/partners/page.tsx`** — Partner list with search, stats cards, invite modal
- **`app/dashboard/admin/partners/[id]/page.tsx`** — Partner detail with 4 tabs: Overview, Merchants, Commission, Invoices

### Partner Dashboard Pages
- **`app/dashboard/partner/page.tsx`** — Partner dashboard home
- **`app/dashboard/partner/merchants/page.tsx`** — Merchant list with invite functionality
- **`app/dashboard/partner/merchants/[id]/page.tsx`** — Merchant detail/settings (with website field)
- **`app/dashboard/partner/transactions/page.tsx`** — Cross-merchant transactions
- **`app/dashboard/partner/analytics/page.tsx`** — Aggregated analytics
- **`app/dashboard/partner/invoices/page.tsx`** — Commission invoices

### Navigation
- **`components/dashboard/DashboardNav.tsx`** — Added partner nav group (Merchants, Transactions, Analytics, Invoices) and "Partners" link for admin

---

## 2. Dynamic Iframe Domain Whitelisting

### Problem
Previously, iframe `frame-ancestors` CSP was hardcoded. Adding a new partner domain required a code change and redeployment.

### Solution
Admin-managed domain whitelist stored in `platformSettings` table, read dynamically by proxy with 60-second cache.

### Files
- **`app/api/internal/iframe-policy/route.ts`** (NEW) — Internal endpoint returning allowed domains from DB
- **`app/api/admin/settings/platform/route.ts`** — Added `allowed_iframe_domains` to allowed keys
- **`proxy.ts`** (NEW, renamed from `middleware.ts`) — Fetches domains from internal API, sets `frame-ancestors` CSP header dynamically
- **`next.config.ts`** — Removed static CSP from `/pay/:token*` route (now handled by proxy)

### Admin UI
- **`app/dashboard/admin/settings/page.tsx`** — Full admin settings page with:
  - Iframe domain whitelist management (add/remove with validation, wildcard support)
  - Terms & Conditions editor (toggle, title, markdown content)
  - Alert notification settings (email, SMS, Slack webhook)

---

## 3. Proxy Migration (Next.js 16)

- Renamed `middleware.ts` → `proxy.ts`
- Exported function renamed from `middleware` to `proxy`
- Eliminates Next.js 16 deprecation warning
- Build output now shows `ƒ Proxy (Middleware)` cleanly

---

## 4. Website/Domain Collection

### Registration
- **`app/auth/register/page.tsx`** — Added optional website URL field with Globe icon and URL format validation
- **`app/api/auth/complete-registration/route.ts`** — Accepts `website` field, stores in `metadata.website`

### Merchant Settings
- **`app/dashboard/settings/components/CompanySettings.tsx`** — Already had website field (no changes needed)
- **`app/api/merchant/settings/route.ts`** — Already handles `website` in metadata JSONB (no changes needed)

### Partner Merchant Settings
- **`app/api/partner/merchants/[id]/route.ts`** — Added `website` to update schema with URL validation, stores in `metadata`
- **`app/dashboard/partner/merchants/[id]/page.tsx`** — Added website input field, fixed EFT settings to use nested `eftSettings` object

---

## 5. Registration Flow Fix

### Problem
`PATCH /api/merchant/settings` returned 401 after sign-up because Better Auth with `requireEmailVerification: true` doesn't create a session on sign-up.

### Solution
- **`app/api/auth/complete-registration/route.ts`** (NEW) — Dedicated endpoint accepting `userId` directly without session. Only updates unverified users for security.
- **`app/auth/register/page.tsx`** — Changed from PATCH `/api/merchant/settings` to POST `/api/auth/complete-registration`

---

## Database Migrations Required

Run after deployment:
```bash
npx drizzle-kit push
```

This creates:
- `eft_partner_fees` table
- `eft_partner_invoices` table
- `eft_partner_invoice_items` table
- Adds `partner_id` column to `user` table
- Updates `role` enum to include `"partner"`
