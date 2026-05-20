import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { platformSettings } from '@/lib/db/schema';

const ALLOWED_KEYS = [
  'eft_tc_enabled',
  'eft_tc_title',
  'eft_tc_content',
  'alert_emails',
  'alert_sms_numbers',
  'alert_slack_webhook_url',
  'allowed_iframe_domains',
  'registration_notification_emails',
] as const;

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const rows = await db
      .select()
      .from(platformSettings);

    const result = Object.fromEntries(
      rows
        .filter(r => (ALLOWED_KEYS as readonly string[]).includes(r.settingKey))
        .map(r => [r.settingKey, r.settingValue ?? ''])
    );

    return NextResponse.json({ success: true, settings: result });
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const adminId = auth.session.user.id;

    const updates: { key: string; value: string }[] = [];

    // T&C settings
    if (body.eft_tc_enabled !== undefined) updates.push({ key: 'eft_tc_enabled', value: body.eft_tc_enabled ? 'true' : 'false' });
    if (body.eft_tc_title !== undefined) updates.push({ key: 'eft_tc_title', value: body.eft_tc_title });
    if (body.eft_tc_content !== undefined) updates.push({ key: 'eft_tc_content', value: body.eft_tc_content });

    // Monitoring/alert settings
    if (body.alert_emails !== undefined) updates.push({ key: 'alert_emails', value: body.alert_emails });
    if (body.alert_sms_numbers !== undefined) updates.push({ key: 'alert_sms_numbers', value: body.alert_sms_numbers });
    if (body.alert_slack_webhook_url !== undefined) updates.push({ key: 'alert_slack_webhook_url', value: body.alert_slack_webhook_url });

    // Registration notification emails
    if (body.registration_notification_emails !== undefined) updates.push({ key: 'registration_notification_emails', value: body.registration_notification_emails });

    // Iframe domain whitelist (comma-separated domains for payment page embedding)
    if (body.allowed_iframe_domains !== undefined) updates.push({ key: 'allowed_iframe_domains', value: body.allowed_iframe_domains });

    for (const { key, value } of updates) {
      await db
        .insert(platformSettings)
        .values({ settingKey: key, settingValue: value, updatedBy: adminId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: platformSettings.settingKey,
          set: { settingValue: value, updatedBy: adminId, updatedAt: new Date() },
        });
    }

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Error saving platform settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
