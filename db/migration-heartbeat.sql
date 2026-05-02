-- TradeCandle Migration: Heartbeat + HMAC + Payment Flow Support
-- Run: mysql -u u175893330_usrP4n -p'h=0Zx5V^' u175893330_dbA7k9 < migration-heartbeat.sql

-- Add hmacSecret to licenses table (for HMAC-signed EA requests)
ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS hmacSecret VARCHAR(64) NOT NULL DEFAULT '';

-- Add heartbeat tracking columns to trading_accounts
ALTER TABLE trading_accounts
  ADD COLUMN IF NOT EXISTS currentEquity DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currentBalance DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currentMarginLevel DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS openPositions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heartbeatTimeoutMinutes INT DEFAULT 15;

-- Create heartbeat_events table
CREATE TABLE IF NOT EXISTS heartbeat_events (
  id VARCHAR(36) PRIMARY KEY,
  accountId VARCHAR(36) NOT NULL,
  licenseId VARCHAR(36),
  equity DECIMAL(15,2),
  balance DECIMAL(15,2),
  marginLevel DECIMAL(10,2),
  openPositions INT DEFAULT 0,
  createdAt DATETIME NOT NULL,
  INDEX idx_heartbeat_account (accountId),
  INDEX idx_heartbeat_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index on payments for faster deposit lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(userId, status);
