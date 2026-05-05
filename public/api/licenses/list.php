<?php
/**
 * GET /api/licenses/list.php
 * List user's licenses
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
    SELECT l.*, s.name as strategyName, s.version as strategyVersion 
    FROM licenses l 
    LEFT JOIN strategies s ON l.strategyId = s.id 
    WHERE l.userId = ? 
    ORDER BY l.createdAt DESC
');
$stmt->execute([$user['id']]);
$licenses = $stmt->fetchAll();

jsonSuccess(['licenses' => $licenses]);
