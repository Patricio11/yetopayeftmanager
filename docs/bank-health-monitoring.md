# Bank Health Monitoring

Automatic detection of consecutive EFT bank failures with multi-channel alerting and auto-recovery.

---

## How It Works

After every transaction finalises, `checkBankHealth()` runs asynchronously (fire-and-forget). It inspects the last **10 finalized** transactions for the bank that processed the payment. If **all 10 are non-successful**, the bank is automatically disabled and alerts are dispatched.

```
Transaction finalises
        │
        ▼
checkBankHealth(bankId, newStatus)
        │
        ├─ status not finalized? → exit (no-op)
        ├─ bank already disabled? → exit (no-op)
        │
        ▼
Query last 10 finalized transactions for bankId
        │
        ├─ fewer than 10 results? → exit (not enough history)
        ├─ at least one "completed"? → exit (bank is healthy)
        │
        ▼
All 10 are failures → AUTO-DISABLE bank
        │
        ├─ UPDATE eft_banks SET enabled = false
        ├─ Append to platform_settings.bank_outages (JSON array)
        │
        ├─ Cooldown active (< 2 hours)? → exit (no alerts)
        │
        ▼
Set cooldown timestamp → send alerts
        │
        ├── Email (nodemailer)
        ├── SMS  (Twilio REST API)
        └── Slack (Incoming Webhook)
```

---

## Recovery

When an admin re-enables a bank via **Admin > Banks** (PATCH `/api/admin/banks/[id]`), `handleBankReenabled()` is called automatically:

1. Removes the bank from the `bank_outages` record in `platform_settings`
2. Clears the cooldown key so fresh alerts fire on the next failure cycle
3. Sends recovery notifications to all configured channels

---

## Dashboard Banner

The dashboard layout reads `bank_outages` from `platform_settings` on every server render. If any outages exist, a **red banner** is shown at the top of the dashboard for all users (admins and merchants), linking to the Banks page.

---

## Configuration

Navigate to **More > Settings > EFT > Monitoring** (admin only).

| Field | Description | Format |
|-------|-------------|--------|
| Email Alerts | Recipient addresses for alert/recovery emails | Comma-separated emails |
| SMS Alerts | Recipient numbers for Twilio SMS | Comma-separated E.164, e.g. `+27821234567` |
| Slack Webhook | Incoming webhook URL for Slack notifications | Full HTTPS URL |

Settings are stored in the `platform_settings` table:

| Key | Value |
|-----|-------|
| `alert_emails` | `admin@example.com, ops@example.com` |
| `alert_sms_numbers` | `+27821234567, +27831234567` |
| `alert_slack_webhook_url` | `https://hooks.slack.com/services/...` |

---

## Environment Variables

Add these to `.env.local` to enable SMS alerts via Twilio:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+27xxxxxxxxx
```

Email uses the existing SMTP configuration (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, etc.).
Slack requires no additional env vars — the webhook URL is stored in the database.

---

## Key Constants

Defined in `lib/monitoring/bank-health.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| `FAILURE_THRESHOLD` | `10` | Consecutive failures before auto-disable |
| `COOLDOWN_HOURS` | `2` | Hours between repeated alerts for the same bank |

---

## platformSettings Keys Used

| Key | Description |
|-----|-------------|
| `bank_outages` | JSON array of current outages `[{ bankId, bankCode, bankName, disabledAt }]` |
| `bank_alert_cooldown_<bankCode>` | ISO timestamp of last alert sent for this bank |
| `alert_emails` | Comma-separated alert email addresses |
| `alert_sms_numbers` | Comma-separated E.164 SMS numbers |
| `alert_slack_webhook_url` | Slack incoming webhook URL |

---

## Files

| File | Role |
|------|------|
| `lib/monitoring/bank-health.ts` | Core detection + alert dispatch engine |
| `lib/email.ts` | `sendBankAlertEmail`, `sendBankRecoveryEmail` templates |
| `app/api/admin/settings/platform/route.ts` | GET/PATCH for monitoring config keys |
| `app/api/eft/transactions/[token]/complete/route.ts` | Hooks `checkBankHealth` after status update |
| `app/api/eft/webhooks/route.ts` | Hooks `checkBankHealth` after webhook status update |
| `app/api/admin/banks/[id]/route.ts` | Hooks `handleBankReenabled` on re-enable |
| `app/dashboard/settings/components/MonitoringSettings.tsx` | Admin UI for alert channel config |
| `app/dashboard/settings/components/EftSuperTab.tsx` | Monitoring sub-tab (admin only) |
| `components/dashboard/BankOutageNotice.tsx` | Red outage banner component |
| `app/dashboard/layout.tsx` | Reads outages from DB, renders banner |
