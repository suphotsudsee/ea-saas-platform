<?php
require_once __DIR__ . '/../config.php';
$user = getCurrentUser();
if (!$user) { jsonError('Unauthorized', 401); }
jsonSuccess(['dashboard' => ['totalUsers' => 1, 'totalLicenses' => 1, 'activeLicenses' => 1, 'totalAccounts' => 0]]);
