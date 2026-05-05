<?php
require_once __DIR__ . '/../config.php';
$user = getCurrentUser();
if (!$user) { jsonError('Unauthorized', 401); }
$db = getDB();
$users = $db->query('SELECT id, email, name, role, status, createdAt FROM users ORDER BY createdAt DESC LIMIT 50')->fetchAll();
jsonSuccess(['users' => $users]);
