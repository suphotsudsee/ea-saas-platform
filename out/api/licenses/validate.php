<?php
/**
 * POST /api/licenses/validate.php
 * Validate a license key — called by MT5 EA
 * Headers: X-API-Key or X-License-Key
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

// Auth via X-API-Key header (MT5 EA sends this, not Bearer)
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
$licenseKey = $_SERVER['HTTP_X_LICENSE_KEY'] ?? '';

// Also check request body
$body = $licenseKey ? [] : getRequestBody();
$licenseKey = $licenseKey ?: ($body['licenseKey'] ?? $body['key'] ?? '');

if (!$licenseKey) {
    jsonError('License key is required');
}

$db = getDB();

// Look up license
$stmt = $db->prepare('SELECT l.*, u.email as userEmail, u.name as userName, u.status as userStatus, s.name as strategyName, s.version as strategyVersion, sub.packageId, p.name as packageName, p.maxAccounts as packageMaxAccounts FROM licenses l LEFT JOIN users u ON l.userId = u.id LEFT JOIN strategies s ON l.strategyId = s.id LEFT JOIN subscriptions sub ON l.subscriptionId = sub.id LEFT JOIN packages p ON sub.packageId = p.id WHERE l.key = ?');
$stmt->execute([$licenseKey]);
$license = $stmt->fetch();

if (!$license) {
    jsonError('License not found', 404);
}

// Check if active
if ($license['status'] !== 'ACTIVE') {
    jsonError('License is ' . strtolower($license['status']), 403);
}

// Check if expired
if (strtotime($license['expiresAt']) < time()) {
    jsonError('License has expired', 403);
}

// Check kill switch
if ($license['killSwitch']) {
    $reason = $license['killSwitchReason'] ?: 'License has been suspended by admin';
    jsonError($reason, 403);
}

// Check user status
if ($license['userStatus'] !== 'ACTIVE') {
    jsonError('User account is ' . strtolower($license['userStatus']), 403);
}

// Return validation result with strategy config
$result = [
    'success' => true,
    'valid' => true,
    'userId' => $license['userId'],
    'licenseId' => $license['id'],
    'subscriptionId' => $license['subscriptionId'],
    'strategyId' => $license['strategyId'],
    'strategyName' => $license['strategyName'],
    'strategyVersion' => $license['strategyVersion'],
    'packageId' => $license['packageId'],
    'packageName' => $license['packageName'],
    'maxAccounts' => $license['packageMaxAccounts'] ?? $license['maxAccounts'] ?? 1,
    'expiresAt' => $license['expiresAt'],
];

// Add strategy config if available
$stmt = $db->prepare('SELECT defaultConfig, riskConfig FROM strategies WHERE id = ?');
$stmt->execute([$license['strategyId']]);
$strategy = $stmt->fetch();
if ($strategy) {
    $result['strategyConfig'] = json_decode($strategy['defaultConfig'], true) ?: [];
    $result['riskConfig'] = json_decode($strategy['riskConfig'], true) ?: [];
}

jsonSuccess($result);
