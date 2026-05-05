<?php
/**
 * GET /api/trade-events/list.php
 * List user's trade events
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

// Pagination
$page = max(1, (int)($_GET['page'] ?? 1));
$pageSize = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
$offset = ($page - 1) * $pageSize;

$stmt = $db->prepare('SELECT count(*) as total FROM trade_events WHERE userId = ?');
$stmt->execute([$user['id']]);
$total = (int)$stmt->fetch()['total'];

$stmt = $db->prepare('SELECT * FROM trade_events WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?');
$stmt->execute([$user['id'], $pageSize, $offset]);
$trades = $stmt->fetchAll();

jsonSuccess([
    'trades' => $trades,
    'pagination' => ['page' => $page, 'pageSize' => $pageSize, 'total' => $total],
]);
