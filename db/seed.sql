-- TradeCandle Seed Data

INSERT IGNORE INTO packages (id, name, description, priceCents, currency, billingCycle, maxAccounts, features, isActive, isTrial, trialDays, sortOrder, stripePriceId, createdAt, updatedAt) VALUES ('pkg_trial', '1-Month Free Trial', 'Full access to 1 trading account for 30 days. Validate and test the EA with no risk.', 0, 'USD', 'MONTHLY', 1, '["1 trading account","Email support","30-day trial","Kill switch"]', 1, 1, 30, 0, '', '2026-04-29T10:24:06.354421Z', '2026-04-29T10:24:06.354421Z');
INSERT IGNORE INTO packages (id, name, description, priceCents, currency, billingCycle, maxAccounts, features, isActive, isTrial, trialDays, sortOrder, stripePriceId, createdAt, updatedAt) VALUES ('pkg_starter', 'Starter', 'Single account with standard features. Best for personal traders.', 990, 'USD', 'MONTHLY', 1, '["1 trading account","Email support","Kill switch","Trade analytics"]', 1, 0, 0, 1, '', '2026-04-29T10:24:06.354421Z', '2026-04-29T10:24:06.354421Z');
INSERT IGNORE INTO packages (id, name, description, priceCents, currency, billingCycle, maxAccounts, features, isActive, isTrial, trialDays, sortOrder, stripePriceId, createdAt, updatedAt) VALUES ('pkg_pro', 'Professional', 'Multi-account with priority support. For serious traders.', 2490, 'USD', 'MONTHLY', 3, '["3 trading accounts","Priority support","Advanced analytics","Risk rules","Kill switch"]', 1, 0, 0, 2, '', '2026-04-29T10:24:06.354421Z', '2026-04-29T10:24:06.354421Z');
INSERT IGNORE INTO packages (id, name, description, priceCents, currency, billingCycle, maxAccounts, features, isActive, isTrial, trialDays, sortOrder, stripePriceId, createdAt, updatedAt) VALUES ('pkg_elite', 'Elite', 'Unlimited accounts with dedicated support. For professional fund managers.', 4990, 'USD', 'MONTHLY', 10, '["10 trading accounts","Dedicated support","All features","API access","Custom risk rules"]', 1, 0, 0, 3, '', '2026-04-29T10:24:06.354421Z', '2026-04-29T10:24:06.354421Z');
INSERT IGNORE INTO strategies (id, name, description, version, defaultConfig, riskConfig, isActive, createdAt, updatedAt) VALUES ('strat_xauusd_v12', 'PA/SMC Scalper v12', 'XAUUSD scalping strategy using price action and smart money concepts', '12.0', '{"lotSize":0.01,"maxPositions":1,"useTrailingStop":true,"trailingStopPips":150}', '{"maxDailyLossPercent":5,"maxConsecutiveLosses":3}', 1, '2026-04-29T10:24:06.354421Z', '2026-04-29T10:24:06.354421Z');

-- Demo user: e2e@tradecandle.net / E2ETest1234!
INSERT IGNORE INTO users (id, email, passwordHash, name, role, status, emailVerified, createdAt, updatedAt) VALUES 
('user_e2e_001', 'e2e@tradecandle.net', '$2b$10$QxmnlzN1a.U5fvuLgPt3l.ZOCTaebkpfukO/deDnIOICSXPLkLnA2', 'E2E Test', 'TRADER', 'ACTIVE', NOW(), NOW(), NOW());

-- Demo subscription (30-day trial)
INSERT IGNORE INTO subscriptions (id, userId, packageId, status, currentPeriodStart, currentPeriodEnd, createdAt, updatedAt) VALUES 
('sub_e2e_trial', 'user_e2e_001', 'pkg_trial', 'ACTIVE', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW());

-- Demo license
INSERT IGNORE INTO licenses (id, `key`, userId, subscriptionId, strategyId, status, expiresAt, maxAccounts, createdAt, updatedAt) VALUES 
('lic_e2e_001', 'TC-4EB7-3CCA-3C26-9270-AAF9', 'user_e2e_001', 'sub_e2e_trial', 'strat_xauusd_v12', 'ACTIVE', '2099-12-31 00:00:00', 1, NOW(), NOW());