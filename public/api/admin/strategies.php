<?php
require_once __DIR__ . '/../config.php';
$user = getCurrentUser();
if (!$user) { jsonError('Unauthorized', 401); }
$db = getDB();
$strategies = $db->query('SELECT * FROM strategies ORDER BY createdAt DESC')->fetchAll();
jsonSuccess(['strategies' => $strategies]);
