import { db } from "@/lib/db";
import { eftBanks, eftTransactions, platformSettings } from "@/lib/db/schema";
import { eq, and, desc, inArray, gte } from "drizzle-orm";
import { sendBankAlertEmail, sendBankRecoveryEmail } from "@/lib/email";

const FAILURE_THRESHOLD = 10;
const COOLDOWN_HOURS = 2;

const FINALIZED_STATUSES = [
  "completed",
  "failed",
  "aborted",
  "cancelled",
  "expired",
] as const;

// ─── platformSettings helpers ─────────────────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.settingKey, key),
  });
  return row?.settingValue ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(platformSettings)
    .values({ settingKey: key, settingValue: value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.settingKey,
      set: { settingValue: value, updatedAt: new Date() },
    });
}

// ─── Alert config ──────────────────────────────────────────────────────────────

async function getAlertConfig(): Promise<{
  emails: string[];
  smsNumbers: string[];
  slackWebhookUrl: string | null;
}> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(
      inArray(platformSettings.settingKey, [
        "alert_emails",
        "alert_sms_numbers",
        "alert_slack_webhook_url",
      ])
    );

  const map = Object.fromEntries(rows.map((r) => [r.settingKey, r.settingValue ?? ""]));

  return {
    emails: map["alert_emails"]
      ? map["alert_emails"].split(",").map((e) => e.trim()).filter(Boolean)
      : [],
    smsNumbers: map["alert_sms_numbers"]
      ? map["alert_sms_numbers"].split(",").map((n) => n.trim()).filter(Boolean)
      : [],
    slackWebhookUrl: map["alert_slack_webhook_url"] || null,
  };
}

// ─── SMS via Twilio ────────────────────────────────────────────────────────────

async function sendSmsAlert(to: string, message: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.warn("⚠️ Twilio not configured — skipping SMS alert to", to);
    return;
  }

  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio SMS failed (${response.status}): ${text}`);
  }
}

// ─── Slack via Incoming Webhook ────────────────────────────────────────────────

async function sendSlackAlert(
  webhookUrl: string,
  bankName: string,
  bankCode: string,
  isRecovery: boolean
): Promise<void> {
  const color = isRecovery ? "#16a34a" : "#dc2626";
  const title = isRecovery
    ? `✅ Bank Recovered: ${bankName}`
    : `🚨 Bank Auto-Disabled: ${bankName}`;
  const text = isRecovery
    ? `*${bankName}* (\`${bankCode}\`) has been re-enabled by an admin. Monitoring has resumed.`
    : `*${bankName}* (\`${bankCode}\`) was automatically disabled after ${FAILURE_THRESHOLD} consecutive failed transactions. Please investigate immediately.`;

  const payload = {
    attachments: [
      {
        color,
        title,
        text,
        footer: "OneGate EFT Bank Health Monitor",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Slack webhook failed (${response.status}): ${text}`);
  }
}

// ─── Fan-out alerts ────────────────────────────────────────────────────────────

async function sendAlerts(
  bankName: string,
  bankCode: string,
  isRecovery: boolean
): Promise<void> {
  const { emails, smsNumbers, slackWebhookUrl } = await getAlertConfig();

  if (emails.length === 0 && smsNumbers.length === 0 && !slackWebhookUrl) {
    console.warn("⚠️ No alert recipients configured — monitoring alerts suppressed");
    return;
  }

  const smsBody = isRecovery
    ? `[OneGate EFT] RECOVERED: ${bankName} bank is back online. Monitoring resumed.`
    : `[OneGate EFT] ALERT: ${bankName} bank disabled after ${FAILURE_THRESHOLD} consecutive failures. Login to investigate.`;

  const alertTasks: Promise<void>[] = [
    ...( emails.length
      ? [isRecovery
          ? sendBankRecoveryEmail(bankName, bankCode, emails)
          : sendBankAlertEmail(bankName, bankCode, FAILURE_THRESHOLD, emails)]
      : []),
    ...smsNumbers.map((num) => sendSmsAlert(num, smsBody)),
    ...(slackWebhookUrl
      ? [sendSlackAlert(slackWebhookUrl, bankName, bankCode, isRecovery)]
      : []),
  ];

  const results = await Promise.allSettled(alertTasks);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`❌ Alert channel [${i}] failed:`, r.reason);
    }
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Called (fire-and-forget) after each transaction status update.
 * If the last FAILURE_THRESHOLD finalized transactions for this bank are all
 * non-completed, the bank is auto-disabled and alerts are dispatched.
 */
export async function checkBankHealth(
  bankId: string | null | undefined,
  newStatus: string
): Promise<void> {
  if (!bankId) return;

  // Only act when a finalized status was just recorded
  if (!(FINALIZED_STATUSES as readonly string[]).includes(newStatus)) return;

  const bank = await db.query.eftBanks.findFirst({
    where: eq(eftBanks.id, bankId),
  });

  if (!bank || !bank.enabled) return; // Already disabled — nothing more to do

  // Check if this bank was recently re-enabled — only count transactions
  // after the re-enable timestamp so old failures don't cause instant re-disable
  const reenableKey = `bank_reenabled_at_${bankId}`;
  const reenableRaw = await getSetting(reenableKey);
  const reenableDate = reenableRaw ? new Date(reenableRaw) : null;

  // Build query conditions
  const conditions = [
    eq(eftTransactions.eftBankId, bankId),
    inArray(eftTransactions.status, [...FINALIZED_STATUSES]),
  ];

  // Only consider transactions after the bank was re-enabled
  if (reenableDate && !isNaN(reenableDate.getTime())) {
    conditions.push(gte(eftTransactions.updatedAt, reenableDate));
  }

  // Fetch last FAILURE_THRESHOLD finalized transactions for this bank
  const recent = await db.query.eftTransactions.findMany({
    where: and(...conditions),
    orderBy: [desc(eftTransactions.updatedAt)],
    limit: FAILURE_THRESHOLD,
  });

  if (recent.length < FAILURE_THRESHOLD) return; // Not enough history yet

  const allFailed = recent.every((t) => t.status !== "completed");
  if (!allFailed) return; // At least one success — bank is healthy

  // ── 10 consecutive non-completed → auto-disable ──────────────────────────
  console.error(
    `🚨 Bank ${bank.bankName} (${bank.code}) auto-disabled after ${FAILURE_THRESHOLD} consecutive failures`
  );

  await db
    .update(eftBanks)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(eftBanks.id, bankId));

  // Record outage
  const outagesRaw = await getSetting("bank_outages");
  const outages: Array<{
    bankId: string;
    bankCode: string;
    bankName: string;
    disabledAt: string;
  }> = outagesRaw ? JSON.parse(outagesRaw) : [];

  if (!outages.some((o) => o.bankId === bankId)) {
    outages.push({
      bankId,
      bankCode: bank.code,
      bankName: bank.bankName,
      disabledAt: new Date().toISOString(),
    });
    await setSetting("bank_outages", JSON.stringify(outages));
  }

  // Cooldown — suppress duplicate alerts for COOLDOWN_HOURS per bank
  const cooldownKey = `bank_alert_cooldown_${bank.code}`;
  const lastAlertAt = await getSetting(cooldownKey);
  if (lastAlertAt) {
    const elapsed = Date.now() - new Date(lastAlertAt).getTime();
    if (elapsed < COOLDOWN_HOURS * 60 * 60 * 1000) {
      console.log(`⏱️ Alert cooldown active for ${bank.bankName} — skipping`);
      return;
    }
  }

  await setSetting(cooldownKey, new Date().toISOString());

  // Fire-and-forget alert dispatch
  sendAlerts(bank.bankName, bank.code, false).catch((err) => {
    console.error("❌ Bank alert dispatch error:", err);
  });
}

/**
 * Called when an admin re-enables a bank via PATCH /api/admin/banks/[id].
 * Clears the outage record and sends recovery notifications.
 */
export async function handleBankReenabled(bankId: string): Promise<void> {
  const bank = await db.query.eftBanks.findFirst({
    where: eq(eftBanks.id, bankId),
  });

  if (!bank) return;

  // Remove from outages list
  const outagesRaw = await getSetting("bank_outages");
  if (outagesRaw) {
    const updated = JSON.parse(outagesRaw).filter((o: any) => o.bankId !== bankId);
    await setSetting("bank_outages", JSON.stringify(updated));
  }

  // Clear cooldown so next failure cycle triggers fresh alerts
  const cooldownKey = `bank_alert_cooldown_${bank.code}`;
  await setSetting(cooldownKey, "");

  // Record the re-enable timestamp so checkBankHealth only counts
  // transactions AFTER this point — prevents instant re-disable from
  // old failed transactions still in the query window.
  const reenableKey = `bank_reenabled_at_${bankId}`;
  await setSetting(reenableKey, new Date().toISOString());

  console.log(`✅ Bank ${bank.bankName} re-enabled — sending recovery alerts`);

  sendAlerts(bank.bankName, bank.code, true).catch((err) => {
    console.error("❌ Bank recovery alert dispatch error:", err);
  });
}
