/**
 * Client-side Device Fingerprinting
 * Generates a unique fingerprint for the user's device/browser
 * Used for tokenization security
 */

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  colorDepth?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  touchSupport?: boolean;
}

/**
 * Collect device information
 */
export function collectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      userAgent: 'server',
      platform: 'server',
      language: 'en',
      screenResolution: '0x0',
      timezone: 'UTC',
    };
  }

  const nav = window.navigator as any;
  const screen = window.screen;

  return {
    userAgent: nav.userAgent || 'unknown',
    platform: nav.platform || 'unknown',
    language: nav.language || nav.userLanguage || 'unknown',
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    colorDepth: screen.colorDepth,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    touchSupport: 'ontouchstart' in window || nav.maxTouchPoints > 0,
  };
}

/**
 * Generate device fingerprint hash
 * This creates a consistent hash based on device characteristics
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const info = collectDeviceInfo();
  
  // Combine key characteristics
  const components = [
    info.userAgent,
    info.platform,
    info.language,
    info.screenResolution,
    info.timezone,
    String(info.colorDepth || ''),
    String(info.hardwareConcurrency || ''),
    String(info.touchSupport || ''),
  ].join('|');

  // Use SubtleCrypto for hashing (browser-native)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(components);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.warn('SubtleCrypto not available, using fallback hash');
    }
  }

  // Fallback: simple hash function
  return simpleHash(components);
}

/**
 * Simple hash function (fallback for older browsers)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Check if device fingerprinting is supported
 */
export function isDeviceFingerprintingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.navigator &&
    window.screen &&
    (window.crypto?.subtle || true) // Fallback available
  );
}

/**
 * Get a human-readable device description
 */
export function getDeviceDescription(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  
  const info = collectDeviceInfo();
  const ua = info.userAgent.toLowerCase();
  
  // Detect device type
  let deviceType = 'Desktop';
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
    deviceType = 'Mobile';
  } else if (/tablet|ipad/.test(ua)) {
    deviceType = 'Tablet';
  }
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  }
  
  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('win')) {
    os = 'Windows';
  } else if (ua.includes('mac')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  }
  
  return `${deviceType} • ${browser} • ${os}`;
}

/**
 * Store device fingerprint in session storage
 */
export function storeDeviceFingerprint(fingerprint: string): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.setItem('yeto_device_fingerprint', fingerprint);
    } catch (error) {
      console.warn('Failed to store device fingerprint:', error);
    }
  }
}

/**
 * Retrieve stored device fingerprint
 */
export function getStoredDeviceFingerprint(): string | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return sessionStorage.getItem('yeto_device_fingerprint');
    } catch (error) {
      console.warn('Failed to retrieve device fingerprint:', error);
    }
  }
  return null;
}

/**
 * Get or generate device fingerprint (with caching)
 */
export async function getDeviceFingerprint(): Promise<string> {
  // Try to get from cache first
  const stored = getStoredDeviceFingerprint();
  if (stored) {
    return stored;
  }
  
  // Generate new fingerprint
  const fingerprint = await generateDeviceFingerprint();
  storeDeviceFingerprint(fingerprint);
  
  return fingerprint;
}
