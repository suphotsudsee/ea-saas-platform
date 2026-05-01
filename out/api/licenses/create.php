<?php
require_once __DIR__ . '/../config.php';
$user = getCurrentUser();
if (!$user) { jsonError('Unauthorized', 401); }
// Create license stub
jsonSuccess(['success' => true, 'license' => ['id' => 'lic_new', 'key' => 'TC-NEW-0000', 'status' => 'ACTIVE']]);
