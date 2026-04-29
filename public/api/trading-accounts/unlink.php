<?php
require_once __DIR__ . '/../config.php';
$user = getCurrentUser();
if (!$user) { jsonError('Unauthorized', 401); }
jsonSuccess(['success' => true, 'message' => 'Account unlinked']);
