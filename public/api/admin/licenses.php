<?php
/**
 * GET|POST|PUT|DELETE /api/admin/licenses.php
 * Admin license management stub
 */
require_once __DIR__ . '/../config.php';

$user = getCurrentUser();
if (!$user) { jsonError('Unauthorized', 401); }

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($method === 'GET') {
    $licenses = $db->query('SELECT * FROM licenses ORDER BY createdAt DESC LIMIT 50')->fetchAll();
    jsonSuccess(['licenses' => $licenses]);
}

jsonSuccess(['success' => true, 'message' => "$method licenses ok"]);
