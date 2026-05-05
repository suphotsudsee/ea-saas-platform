<?php
/**
 * POST /api/ea/kill-switch.php
 * Activate kill switch for a license — requires auth
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
$licenseKey = $body['licenseKey'] ?? '';
$reason = $body['reason'] ?? 'Kill switch activated by user';

if (!$licenseKey) {
    jsonError('licenseKey is required');
}

$db = getDB();

// Find license
$stmt = $db->prepare('SELECT * FROM licenses WHERE `key` = ? AND userId = ?');
$stmt->execute([$licenseKey, $user['id']]);
$license = $stmt->fetch();

if (!$license) {
    jsonError('License not found', 404);
}

if ($license['killSwitch']) {
    jsonSuccess(['killed' => true, 'message' => 'Kill switch was already active']);
}

// Set kill switch
$now = date('Y-m-d H:i:s');
$stmt = $db->prepare('
    UPDATE licenses SET killSwitch = 1, killSwitchReason = ?, killSwitchAt = ?, updatedAt = ?
    WHERE id = ?
');
$stmt->execute([$reason, $now, $now, $license['id']]);

jsonSuccess(['killed' => true]);
