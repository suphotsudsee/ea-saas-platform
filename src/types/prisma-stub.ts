// ─── Prisma Client Stub ──────────────────────────────────────────────────────
// Replaces @prisma/client for JSON-DB-only deployments
// No real Prisma engine required
// ─────────────────────────────────────────────────────────────────────────────

export class PrismaClient {
  constructor() {}
  async $connect() {}
  async $disconnect() {}
  async $transaction(fn: any) { return fn(this); }
  [key: string]: any;
}

export const Prisma = {
  TransactionIsolationLevel: { Serializable: 'Serializable' },
};

// Enums
export const UserRole = { USER: 'USER', ADMIN: 'ADMIN', SUPER_ADMIN: 'SUPER_ADMIN' };
export const UserStatus = { ACTIVE: 'ACTIVE', PENDING: 'PENDING', SUSPENDED: 'SUSPENDED', DEACTIVATED: 'DEACTIVATED' };
export const SubscriptionStatus = { ACTIVE: 'ACTIVE', TRIALING: 'TRIALING', PAST_DUE: 'PAST_DUE', CANCELLED: 'CANCELLED', EXPIRED: 'EXPIRED', PENDING: 'PENDING' };
export const LicenseStatus = { ACTIVE: 'ACTIVE', REVOKED: 'REVOKED', EXPIRED: 'EXPIRED', PENDING: 'PENDING' };
export const BillingCycle = { MONTHLY: 'MONTHLY', QUARTERLY: 'QUARTERLY', YEARLY: 'YEARLY', LIFETIME: 'LIFETIME' };
export const AdminRole = { ADMIN: 'ADMIN', SUPER_ADMIN: 'SUPER_ADMIN' };
export const PaymentStatus = { PENDING: 'PENDING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', REFUNDED: 'REFUNDED' };
export const PaymentMethod = { CARD: 'CARD', USDT: 'USDT' };
export const NotificationType = { SYSTEM: 'SYSTEM', BILLING: 'BILLING', SECURITY: 'SECURITY', TRADE: 'TRADE' };
export const RiskSeverity = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };
export const AuditAction = {
  LOGIN: 'LOGIN', LOGOUT: 'LOGOUT',
  CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE',
  REVOKE: 'REVOKE', ACTIVATE: 'ACTIVATE',
};
