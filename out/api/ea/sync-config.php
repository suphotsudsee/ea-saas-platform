<?php
/**
 * POST /api/ea/sync-config.php
 * Sync strategy configuration — requires auth
 * Called by user/EA to get current strategy config
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

// Get strategy defaultConfig
$stmt = $db->prepare('SELECT defaultConfig, riskConfig, name, version FROM strategies WHERE id = ?');
$stmt->execute([$license['strategyId']]);
$strategy = $stmt->fetch();

if (!$strategy) {
    jsonError('Strategy not found for this license', 404);
}

$config = json_decode($strategy['defaultConfig'], true) ?: [];

jsonSuccess([
    'config' => $config,
    'riskConfig' => json_decode($strategy['riskConfig'], true) ?: [],
    'strategyName' => $strategy['name'],
    'strategyVersion' => $strategy['version'],
]);
