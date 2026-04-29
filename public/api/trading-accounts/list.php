<?php
/**
 * GET /api/trading-accounts/list.php
 * List user's trading accounts
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
$stmt = $db->prepare('SELECT * FROM trading_accounts WHERE userId = ? ORDER BY createdAt DESC');
$stmt->execute([$user['id']]);
$accounts = $stmt->fetchAll();

jsonSuccess(['accounts' => $accounts]);
