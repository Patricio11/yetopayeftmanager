/**
 * URL Validation for SSRF Prevention
 *
 * Blocks webhook URLs that point to localhost, private IPs,
 * link-local addresses, and other internal network ranges.
 */

import { lookup } from 'dns/promises';

/**
 * Private/internal IP ranges that should be blocked
 */
const BLOCKED_IP_PATTERNS = [
  // IPv4 loopback
  /^127\./,
  // IPv4 private ranges
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  // IPv4 link-local
  /^169\.254\./,
  // IPv4 broadcast
  /^255\.255\.255\.255$/,
  // IPv4 "this" network
  /^0\./,
];

const BLOCKED_IPV6 = [
  '::1',        // loopback
  '::',         // unspecified
  'fe80::',     // link-local prefix check handled below
  'fc00::',     // unique local prefix check handled below
  'fd00::',     // unique local prefix check handled below
];

/**
 * Check if an IPv6 address is in a blocked range
 */
function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  // Link-local (fe80::/10)
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe80::')) return true;
  // Unique local (fc00::/7 = fc00:: to fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  return false;
}

/**
 * Check if an IPv4 address is in a blocked private/internal range
 */
function isBlockedIPv4(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some(pattern => pattern.test(ip));
}

/**
 * Blocked hostnames
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::1]',
  '[::0]',
];

/**
 * Validate a webhook URL to prevent SSRF attacks.
 *
 * Checks:
 * - Must be HTTPS (HTTP blocked in production)
 * - Hostname must not be localhost or similar
 * - Resolved IP must not be in private/internal ranges
 * - Must have a valid hostname (not just an IP in a blocked range)
 *
 * @returns { valid: true } or { valid: false, reason: string }
 */
export async function validateWebhookUrl(url: string): Promise<{ valid: true } | { valid: false; reason: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Must be HTTPS in production
  if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    return { valid: false, reason: 'Webhook URL must use HTTPS' };
  }

  // Only allow http/https protocols
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, reason: 'Only HTTP/HTTPS protocols are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block known localhost hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, reason: 'Webhook URL cannot point to localhost or internal addresses' };
  }

  // Block .local and .internal TLDs
  if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost')) {
    return { valid: false, reason: 'Webhook URL cannot point to local/internal domains' };
  }

  // Check if hostname is a raw IP address
  const ipv4Match = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (ipv4Match && isBlockedIPv4(hostname)) {
    return { valid: false, reason: 'Webhook URL cannot point to private or internal IP addresses' };
  }

  // Check bracketed IPv6
  const ipv6Match = hostname.match(/^\[(.+)\]$/);
  if (ipv6Match && isBlockedIPv6(ipv6Match[1])) {
    return { valid: false, reason: 'Webhook URL cannot point to private or internal IP addresses' };
  }

  // DNS resolution check - resolve hostname and verify the IP isn't private
  try {
    const addresses = await lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (addr.family === 4 && isBlockedIPv4(addr.address)) {
        return { valid: false, reason: 'Webhook URL resolves to a private or internal IP address' };
      }
      if (addr.family === 6 && isBlockedIPv6(addr.address)) {
        return { valid: false, reason: 'Webhook URL resolves to a private or internal IP address' };
      }
    }
  } catch {
    // DNS resolution failed - hostname doesn't resolve
    return { valid: false, reason: 'Webhook URL hostname could not be resolved' };
  }

  return { valid: true };
}
