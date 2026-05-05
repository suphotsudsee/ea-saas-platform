<?php
/**
 * POST /api/ea/heartbeat.php
 * Receive heartbeat from MT5 EA — no auth required
 * Tracks equity, balance, margin, positions. Handles stale-account timeouts.
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$licenseKey = $body['licenseKey'] ?? '';
$accountNumber = $body['accountNumber'] ?? '';
$equity = $body['equity'] ?? null;
$balance = $body['balance'] ?? null;
$marginLevel = $body['marginLevel'] ?? null;
$openPositions = $body['openPositions'] ?? 0;

if (!$licenseKey || !$accountNumber) {
    jsonError('licenseKey and accountNumber are required');
}

$db = getDB();

// 1. Validate license
$stmt = $db->prepare('SELECT * FROM licenses WHERE `key` = ? AND status = ? AND killSwitch = 0');
$stmt->execute([$licenseKey, 'ACTIVE']);
$license = $stmt->fetch();

if (!$license) {
    jsonError('License not found or not active', 404);
}

if (strtotime($license['expiresAt']) < time()) {
    jsonError('License has expired', 403);
}

// 2. Find trading_account
$stmt = $db->prepare('SELECT * FROM trading_accounts WHERE licenseId = ? AND accountNumber = ?');
$stmt->execute([$license['id'], $accountNumber]);
$account = $stmt->fetch();

if (!$account) {
    jsonError('Trading account not found. Validate license first.', 404);
}

if ($account['status'] === 'UNLINKED') {
    jsonError('Trading account has been unlinked', 403);
}

// 3. INSERT heartbeat event
$heartbeatId = bin2hex(random_bytes(16));
$now = date('Y-m-d H:i:s');
$stmt = $db->prepare('
    INSERT INTO heartbeat_events (id, tradingAccountId, licenseId, equity, balance, marginLevel, openPositions, receivedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
');
$stmt->execute([
    $heartbeatId,
    $account['id'],
    $license['id'],
    $equity,
    $balance,
    $marginLevel,
    (int)$openPositions,
    $now,
]);

// 4. UPDATE trading_accounts: lastHeartbeatAt, equity, balance, margin, positions
$stmt = $db->prepare('
    UPDATE trading_accounts
    SET lastHeartbeatAt = ?, currentEquity = ?, currentBalance = ?, currentMarginLevel = ?, openPositions = ?, status = ?, updatedAt = ?
    WHERE id = ?
');
$stmt->execute([
    $now,
    $equity,
    $balance,
    $marginLevel,
    (int)$openPositions,
    'ACTIVE',
    $now,
    $account['id'],
]);

// 5. Check for stale accounts: heartbeat older than heartbeatTimeoutMinutes
$timeoutMinutes = (int)($account['heartbeatTimeoutMinutes'] ?? 15);
$stmt = $db->prepare("
    UPDATE trading_accounts
    SET status = 'TIMEOUT_KILLED', updatedAt = ?
    WHERE licenseId = ? AND status = 'ACTIVE'
      AND lastHeartbeatAt < DATE_SUB(NOW(), INTERVAL ? MINUTE)
");
$stmt->execute([$now, $license['id'], $timeoutMinutes]);

// 6. If ALL active accounts for license are dead → set licenses.killSwitch = 1
$stmt = $db->prepare("
    SELECT COUNT(*) as cnt FROM trading_accounts
    WHERE licenseId = ? AND status = 'ACTIVE'
");
$stmt->execute([$license['id']]);
$activeRow = $stmt->fetch();
$activeCount = (int)$activeRow['cnt'];

if ($activeCount === 0) {
    $stmt = $db->prepare('
        UPDATE licenses SET killSwitch = 1, killSwitchReason = ?, killSwitchAt = ?, updatedAt = ?
        WHERE id = ?
    ');
    $stmt->execute(['All trading accounts timed out', $now, $now, $license['id']]);
}

// 7. Count alive accounts
$stmt = $db->prepare("
    SELECT COUNT(*) as cnt FROM trading_accounts
    WHERE licenseId = ? AND status = 'ACTIVE'
");
$stmt->execute([$license['id']]);
$aliveRow = $stmt->fetch();
$accountsAlive = (int)$aliveRow['cnt'];

jsonSuccess([
    'received'      => true,
    'accountsAlive' => $accountsAlive,
]);
