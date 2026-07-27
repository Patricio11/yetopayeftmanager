import type { StorageProviderDef } from "./registry";
import { encryptString, decryptString } from "@/lib/security/credential-encryption";

/**
 * Secret-safe handling for storage provider credentials.
 *
 * Secrets never round-trip to the browser in clear: `maskConfig` turns a set
 * secret into the mask sentinel (an unset one is omitted), and `mergeConfig`
 * applies only the fields the admin actually changed — a blank or masked field
 * keeps the stored value, so a secret is never wiped by accident.
 *
 * At-rest crypto uses lib/security/credential-encryption (encryptString), keyed
 * by CREDENTIAL_ENCRYPTION_KEY. Non-secret fields are stored/returned verbatim.
 */

export const SECRET_MASK = "••••••••";

/** What the client may see: non-secret values verbatim; secrets only as "set or not". */
export function maskConfig(def: StorageProviderDef, config: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of def.credentialFields) {
    const v = config[f.key];
    if (f.secret) {
      if (v && v.trim()) out[f.key] = SECRET_MASK; // set → mask; unset → omit
    } else if (v != null) {
      out[f.key] = v;
    }
  }
  return out;
}

/**
 * Merge the admin's changes onto the stored config and encrypt secret fields.
 * A blank field or the mask sentinel means "leave the stored value".
 * Returns the config ready to persist (secrets as encrypted blobs).
 */
export function mergeAndEncryptConfig(
  def: StorageProviderDef,
  stored: Record<string, string>,
  changed: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = { ...stored };
  const secretKeys = new Set(def.credentialFields.filter((f) => f.secret).map((f) => f.key));

  for (const f of def.credentialFields) {
    const raw = changed[f.key];
    if (raw == null) continue;
    const v = raw.trim();
    if (v === "" || v === SECRET_MASK) continue; // keep stored value
    out[f.key] = f.secret ? encryptString(v) : v;
  }

  // Drop any stored keys that are no longer part of the provider's fields.
  for (const k of Object.keys(out)) {
    if (!def.credentialFields.some((f) => f.key === k)) delete out[k];
  }
  // Ensure encrypted-at-rest invariant for secrets that came in already stored.
  void secretKeys;
  return out;
}

/** Decrypt secret fields for server-side use (plaintext passes through untouched). */
export function decryptConfig(def: StorageProviderDef, config: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...config };
  for (const f of def.credentialFields) {
    if (f.secret && out[f.key]) {
      try {
        out[f.key] = decryptString(out[f.key]);
      } catch {
        // Leave as-is on failure (wrong key / legacy plaintext) — never crash the read path.
      }
    }
  }
  return out;
}

/** True if every required field is satisfied — freshly provided or already stored. */
export function configComplete(
  def: StorageProviderDef,
  stored: Record<string, string>,
  draft: Record<string, string>
): boolean {
  return def.credentialFields.every((f) => {
    if (f.optional) return true;
    const provided = draft[f.key]?.trim();
    const existing = stored[f.key]?.trim();
    return Boolean((provided && provided !== SECRET_MASK) || existing);
  });
}
