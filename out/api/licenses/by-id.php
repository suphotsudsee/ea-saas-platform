<?php
require_once __DIR__ . '/../config.php';
$user = getCurrentUser();
if (!$user) { jsonError('Unauthorized', 401); }
$id = $_GET['id'] ?? '';
if (!$id) { jsonError('License ID required'); }
$db = getDB();
$stmt = $db->prepare('SELECT * FROM licenses WHERE id = ?');
$stmt->execute([$id]);
$license = $stmt->fetch();
jsonSuccess(['license' => $license]);
