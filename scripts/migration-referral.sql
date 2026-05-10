-- Referral System Migration
-- Run on MySQL to add referral support

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS referralCode VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS referredBy VARCHAR(36),
  ADD COLUMN IF NOT EXISTS referralEarnings INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS referral_rewards (
  id VARCHAR(36) PRIMARY KEY,
  referrerId VARCHAR(36) NOT NULL,
  referredUserId VARCHAR(36) NOT NULL,
  level INT DEFAULT 1,
  rewardType VARCHAR(20) DEFAULT 'DISCOUNT',
  rewardValue FLOAT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'PENDING',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  claimedAt DATETIME,
  FOREIGN KEY (referrerId) REFERENCES users(id),
  FOREIGN KEY (referredUserId) REFERENCES users(id)
);
