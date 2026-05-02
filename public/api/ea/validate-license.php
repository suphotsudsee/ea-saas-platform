<?php
/**
 * POST /api/ea/validate-license.php
 * Validate a license key — called by MT5 EA (no auth required)
 * Supports optional HMAC signature verification
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$rawBody = file_get_contents('php://input');
$body = $rawBody ? json_decode($rawBody, true) : [];
$licenseKey = $body['licenseKey'] ?? $body['key'] ?? '';
$accountNumber = $body['accountNumber'] ?? '';
$clientSignature = $body['hmacSignature'] ?? '';
$timestamp = $body['timestamp'] ?? '';

if (!$licenseKey) {
    jsonSuccess(['valid' => false, 'reason' => 'License key is required']);
}

$db = getDB();

// 1. Find license by key
$stmt = $db->prepare('
    SELECT l.*, s.name as strategyName, s.version as strategyVersion, s.defaultConfig as strategyDefaultConfig,
           s.riskConfig as strategyRiskConfig
    FROM licenses l
    LEFT JOIN strategies s ON l.strategyId = s.id
    WHERE l.`key` = ?
');
$stmt->execute([$licenseKey]);
$license = $stmt->fetch();

if (!$license) {
    jsonSuccess(['valid' => false, 'reason' => 'License not found']);
}

// 2. Check status='ACTIVE', not expired, killSwitch=0
if ($license['status'] !== 'ACTIVE') {
    jsonSuccess(['valid' => false, 'reason' => 'License is ' . strtolower($license['status'])]);
}

if (strtotime($license['expiresAt']) < time()) {
    jsonSuccess(['valid' => false, 'reason' => 'License has expired']);
}

if ($license['killSwitch']) {
    $reason = $license['killSwitchReason'] ?: 'License has been suspended';
    jsonSuccess(['valid' => false, 'reason' => $reason]);
}

// 3. HMAC verification (if signature provided)
if ($clientSignature && $license['hmacSecret']) {
    $payload = "POST\n/api/ea/validate-license.php\n$timestamp\n" . $rawBody;
    $expected = hash_hmac('sha256', $payload, $license['hmacSecret']);
    if (!hash_equals($expected, $clientSignature)) {
        jsonSuccess(['valid' => false, 'reason' => 'HMAC signature verification failed']);
    }
}

// 4. Auto-link account: check for existing trading account
$accountLinked = false;
if ($accountNumber) {
    $stmt = $db->prepare('SELECT id FROM trading_accounts WHERE licenseId = ? AND accountNumber = ?');
    $stmt->execute([$license['id'], $accountNumber]);
    $existing = $stmt->fetch();

    if (!$existing) {
        // Check maxAccounts limit
        $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM trading_accounts WHERE licenseId = ? AND status != ?');
        $stmt->execute([$license['id'], 'UNLINKED']);
        $countRow = $stmt->fetch();
        $currentCount = (int)$countRow['cnt'];

        if ($currentCount < (int)$license['maxAccounts']) {
            $accountId = bin2hex(random_bytes(16));
            $now = date('Y-m-d H:i:s');
            $stmt = $db->prepare('
                INSERT INTO trading_accounts (id, userId, licenseId, accountNumber, brokerName, platform, status, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $accountId,
                $license['userId'],
                $license['id'],
                $accountNumber,
                'Auto-detected',
                'MT5',
                'ACTIVE',
                $now,
            ]);
            $accountLinked = true;
        }
    } else {
        $accountLinked = true;
    }
}

// 5. Count linked accounts
$stmt = $db->prepare('SELECT COUNT(*) as cnt FROM trading_accounts WHERE licenseId = ? AND status != ?');
$stmt->execute([$license['id'], 'UNLINKED']);
$countRow = $stmt->fetch();
$accountCount = (int)$countRow['cnt'];

// 6. Build response
$result = [
    'valid' => true,
    'license' => [
        'key'          => $license['key'],
        'expiresAt'    => $license['expiresAt'],
        'maxAccounts'  => (int)$license['maxAccounts'],
        'accountCount' => $accountCount,
        'accountLinked' => $accountLinked,
    ],
    'strategy' => [
        'id'            => $license['strategyId'],
        'name'          => $license['strategyName'],
        'version'       => $license['strategyVersion'],
        'defaultConfig' => json_decode($license['strategyDefaultConfig'], true) ?: [],
    ],
];

jsonSuccess($result);
