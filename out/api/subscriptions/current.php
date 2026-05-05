<?php
/**
 * GET /api/subscriptions/current.php
 * Get current user's subscription
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = getCurrentUser();
if (!$user) {
    jsonError('Unauthorized', 401);
}

$db = getDB();
$stmt = $db->prepare('
    SELECT s.*, p.name as packageName, p.description as packageDescription, p.priceCents, p.currency, p.maxAccounts as packageMaxAccounts, p.features
    FROM subscriptions s 
    LEFT JOIN packages p ON s.packageId = p.id 
    WHERE s.userId = ? AND s.status = ?
    ORDER BY s.createdAt DESC LIMIT 1
');
$stmt->execute([$user['id'], 'ACTIVE']);
$subscription = $stmt->fetch();

if (!$subscription) {
    jsonSuccess(['subscription' => null]);
}

jsonSuccess(['subscription' => $subscription]);
