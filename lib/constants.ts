// Permissions
export const PERMISSIONS = {
  // Admin permissions
  ADMIN_VIEW_ALL_MERCHANTS: 'admin:view_all_merchants',
  ADMIN_MANAGE_MERCHANTS: 'admin:manage_merchants',
  ADMIN_VIEW_ALL_TRANSACTIONS: 'admin:view_all_transactions',
  ADMIN_MANAGE_BANKS: 'admin:manage_banks',
  ADMIN_VIEW_SYSTEM_LOGS: 'admin:view_system_logs',
  ADMIN_MANAGE_SETTINGS: 'admin:manage_settings',
  
  // Merchant owner permissions
  MERCHANT_VIEW_TRANSACTIONS: 'merchant:view_transactions',
  MERCHANT_CREATE_PAYMENT_LINKS: 'merchant:create_payment_links',
  MERCHANT_MANAGE_BANK_ACCOUNTS: 'merchant:manage_bank_accounts',
  MERCHANT_MANAGE_TEAM: 'merchant:manage_team',
  MERCHANT_VIEW_API_CREDENTIALS: 'merchant:view_api_credentials',
  MERCHANT_MANAGE_WEBHOOKS: 'merchant:manage_webhooks',
  MERCHANT_EXPORT_DATA: 'merchant:export_data',
  
  // Merchant user permissions (granular)
  USER_VIEW_TRANSACTIONS: 'user:view_transactions',
  USER_CREATE_PAYMENT_LINKS: 'user:create_payment_links',
  USER_VIEW_BANK_ACCOUNTS: 'user:view_bank_accounts'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(PERMISSIONS),
  merchant_owner: [
    PERMISSIONS.MERCHANT_VIEW_TRANSACTIONS,
    PERMISSIONS.MERCHANT_CREATE_PAYMENT_LINKS,
    PERMISSIONS.MERCHANT_MANAGE_BANK_ACCOUNTS,
    PERMISSIONS.MERCHANT_MANAGE_TEAM,
    PERMISSIONS.MERCHANT_VIEW_API_CREDENTIALS,
    PERMISSIONS.MERCHANT_MANAGE_WEBHOOKS,
    PERMISSIONS.MERCHANT_EXPORT_DATA
  ],
  merchant_user: [] // Assigned individually
};

// Transaction statuses
export const TRANSACTION_STATUS = {
  NOT_STARTED: 'not_started',
  INITIATED: 'initiated',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABORTED: 'aborted',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
} as const;

// Webhook events
export const WEBHOOK_EVENTS = {
  TRANSACTION_INITIATED: 'transaction.initiated',
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_FAILED: 'transaction.failed',
  TRANSACTION_CANCELLED: 'transaction.cancelled',
  TRANSACTION_EXPIRED: 'transaction.expired'
} as const;

// Payment token settings
export const PAYMENT_TOKEN_CONFIG = {
  DEFAULT_EXPIRY_HOURS: 24,
  MAX_EXPIRY_HOURS: 168, // 7 days
  MAX_ACCESS_ATTEMPTS: 10,
  TOKEN_LENGTH: 32 // bytes
} as const;

// API rate limits
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 100,
  WEBHOOK_RETRIES: 3,
  WEBHOOK_RETRY_BACKOFF: 2 // multiplier
} as const;
