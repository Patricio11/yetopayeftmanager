# Admin Impersonation

Allows admin users to view the platform as any merchant or partner, seeing exactly what they see.

## How It Works

1. **Cookie-based** — A httpOnly cookie (`yp_impersonate`) stores the target user ID. No auth sessions are modified.
2. **Session swap** — `getSession()` detects the cookie and swaps the session user context to the target user. The real admin session remains intact.
3. **Admin endpoints protected** — `requireAdmin()` uses `getRealSession()` which bypasses impersonation, so admin APIs still work while impersonating.
4. **Auto-expires** — The cookie has a 1-hour maxAge. Impersonation ends automatically after that.

## API Endpoint

`/api/admin/impersonate`

| Method | Action | Body |
|--------|--------|------|
| GET | Check impersonation status | — |
| POST | Start impersonation | `{ userId: string }` |
| DELETE | Stop impersonation | — |

### Constraints

- Only admin users can impersonate.
- Cannot impersonate another admin (returns 403).
- Target user must exist.

## Key Files

| File | Purpose |
|------|---------|
| `app/api/admin/impersonate/route.ts` | API endpoint (GET/POST/DELETE) |
| `lib/auth-server.ts` | `getSession()` with impersonation awareness, `getRealSession()` bypass |
| `lib/auth/authorization.ts` | `requireAdmin()` uses `getRealSession()` |
| `components/dashboard/ImpersonationBanner.tsx` | Purple banner shown during impersonation |
| `app/dashboard/layout.tsx` | Conditionally renders the banner |
| `lib/audit.ts` | Audit log actions: `impersonate_start`, `impersonate_stop` |

## Session Functions

- **`getSession()`** — Returns the impersonated user's context if impersonation is active. Use this for all user-facing logic.
- **`getRealSession()`** — Always returns the real admin session. Use this for admin authorization checks.

## UI

- **Merchants page** (`/dashboard/admin/merchants`) — "Impersonate" button on each merchant row.
- **Partners page** (`/dashboard/admin/partners`) — "Impersonate" button on each partner row.
- **Impersonation Banner** — Sticky purple bar at the top showing who you're viewing as, with a "Stop Impersonating" button.

## Audit Trail

Every impersonation start and stop is logged to the `audit_logs` table with:
- Admin user ID
- Action (`impersonate_start` / `impersonate_stop`)
- Target user ID
- IP address and user agent
