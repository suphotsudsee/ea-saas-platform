<?php
/**
 * POST /api/payments/verify.php
 * Verify a USDT deposit and activate the subscription + license
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = getCurrentUser();
if (!$user) {
    jsonError('Unauthorized', 401);
}

$body = getRequestBody();
$paymentId = $body['paymentId'] ?? '';
$txHash = $body['txHash'] ?? '';
$fromAddress = $body['fromAddress'] ?? '';

if (!$paymentId || !$txHash) {
    jsonError('paymentId and txHash are required');
}

$db = getDB();

// 1. Find payment by id + userId → check PENDING, not expired
$stmt = $db->prepare('SELECT * FROM payments WHERE id = ? AND userId = ?');
$stmt->execute([$paymentId, $user['id']]);
$payment = $stmt->fetch();

if (!$payment) {
    jsonError('Payment not found', 404);
}

if ($payment['status'] !== 'PENDING') {
    jsonError('Payment is already ' . strtolower($payment['status']));
}

if (strtotime($payment['expiresAt']) < time()) {
    jsonError('Payment has expired');
}

// 2. Find PENDING_PAYMENT subscription
$stmt = $db->prepare('SELECT * FROM subscriptions WHERE id = ? AND userId = ? AND status = ?');
$stmt->execute([$payment['subscriptionId'], $user['id'], 'PENDING_PAYMENT']);
$subscription = $stmt->fetch();

if (!$subscription) {
    jsonError('Subscription not found or not in pending state', 404);
}

// 3. Get package from subscription
$stmt = $db->prepare('SELECT * FROM packages WHERE id = ?');
$stmt->execute([$subscription['packageId']]);
$package = $stmt->fetch();

if (!$package) {
    jsonError('Package not found', 404);
}

$maxAccounts = (int)$package['maxAccounts'];
$trialDays = (int)$package['trialDays'];
$priceCents = (int)$package['priceCents'];

// 4. Update payment: status='COMPLETED', txHash, fromAddress, verifiedAt=now
$now = date('Y-m-d H:i:s');
$stmt = $db->prepare('
    UPDATE payments SET status = ?, txHash = ?, fromAddress = ?, verifiedAt = ?, updatedAt = ?
    WHERE id = ?
');
$stmt->execute(['COMPLETED', $txHash, $fromAddress, $now, $now, $paymentId]);

// 5. Update subscription: status='ACTIVE', currentPeriodStart/End (30 days)
$periodStart = $now;
$periodEnd = date('Y-m-d H:i:s', time() + 86400 * 30);
$stmt = $db->prepare('
    UPDATE subscriptions SET status = ?, currentPeriodStart = ?, currentPeriodEnd = ?, updatedAt = ?
    WHERE id = ?
');
$stmt->execute(['ACTIVE', $periodStart, $periodEnd, $now, $subscription['id']]);

// 6. Generate license key and HMAC secret
$licenseKey = 'TC-' . strtoupper(implode('-', [
    substr(bin2hex(random_bytes(2)), 0, 4),
    substr(bin2hex(random_bytes(2)), 0, 4),
    substr(bin2hex(random_bytes(2)), 0, 4),
    substr(bin2hex(random_bytes(2)), 0, 4),
    substr(bin2hex(random_bytes(2)), 0, 4),
]));
$hmacSecret = bin2hex(random_bytes(16));
$licenseId = bin2hex(random_bytes(16));
$expiresAt = date('Y-m-d H:i:s', time() + 86400 * 365); // 1 year from now

// Get first active strategy
$stmt = $db->prepare('SELECT id FROM strategies WHERE isActive = 1 ORDER BY createdAt ASC LIMIT 1');
$stmt->execute();
$strategy = $stmt->fetch();
$strategyId = $strategy ? $strategy['id'] : '';

// 7. INSERT into licenses
$stmt = $db->prepare('
    INSERT INTO licenses (id, `key`, hmacSecret, userId, subscriptionId, strategyId, maxAccounts, expiresAt, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');
$stmt->execute([
    $licenseId,
    $licenseKey,
    $hmacSecret,
    $user['id'],
    $subscription['id'],
    $strategyId,
    $maxAccounts,
    $expiresAt,
    'ACTIVE',
    $now,
]);

// 8. Return response
jsonSuccess([
    'license' => [
        'key'        => $licenseKey,
        'hmacSecret' => $hmacSecret,
        'maxAccounts' => $maxAccounts,
    ],
    'subscription' => [
        'id'     => $subscription['id'],
        'status' => 'ACTIVE',
    ],
]);
