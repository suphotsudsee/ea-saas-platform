<?php
require_once __DIR__ . '/../config.php';
$user = getCurrentUser();
if (!$user) { jsonError('Unauthorized', 401); }
$db = getDB();
$subs = $db->query('SELECT s.*, u.email as userEmail, u.name as userName, p.name as packageName FROM subscriptions s LEFT JOIN users u ON s.userId = u.id LEFT JOIN packages p ON s.packageId = p.id ORDER BY s.createdAt DESC LIMIT 50')->fetchAll();
jsonSuccess(['subscriptions' => $subs]);
