#!/bin/sh
# One-shot: seed subscription packages directly into MySQL via docker exec
# Run this on the Coolify server after connecting via global terminal

DB_HOST="nh0992vyh996he1svo5ikxmp"
DB_USER="mysql"
DB_PASS="QvDnbrWZ1F8xo05ax9RlMIHLNTGpQWuSWoZS68FeBk4Llg18Y0O2WWI5QU9tlpFS"
DB_NAME="default"

mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << 'SQL'
-- Seed SubscriptionPackages
INSERT IGNORE INTO SubscriptionPackage (id, code, name, description, price, billingCycle, maxAccounts, isTrial, trialDays, features, isActive, createdAt, updatedAt)
VALUES
  (UUID(), 'free_trial', 'Free Trial', '1-Month Free Trial — 1 MT5 Account', 0.00, 'MONTHLY', 1, TRUE, 30, '["3-Wave Cashout","6 Smart Money Filters","Time Filter","Dashboard","Email Support"]', TRUE, NOW(), NOW()),
  (UUID(), 'starter', 'Starter', '1 MT5 Account — Best for beginners', 9.90, 'MONTHLY', 1, FALSE, 0, '["3-Wave Cashout","6 Smart Money Filters","Time Filter","Dashboard","Kill Switch","Email Support"]', TRUE, NOW(), NOW()),
  (UUID(), 'professional', 'Professional', '3 MT5 Accounts — For serious traders', 24.90, 'MONTHLY', 3, FALSE, 0, '["Everything in Starter","Priority Support","Line Support","Advanced Risk Mgmt"]', TRUE, NOW(), NOW()),
  (UUID(), 'elite', 'Elite', '10 MT5 Accounts — For professionals', 49.90, 'MONTHLY', 10, FALSE, 0, '["Everything in Pro","VIP Line Support","1-on-1 Setup Call","Custom Config"]', TRUE, NOW(), NOW());

SELECT COUNT(*) AS package_count FROM SubscriptionPackage;
SQL
