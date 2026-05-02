<?php
/**
 * GET /api/health.php
 * Health check endpoint — no auth required
 */
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

// Optionally verify DB connectivity
$dbStatus = 'ok';
try {
    $db = getDB();
    $db->query('SELECT 1');
} catch (Exception $e) {
    $dbStatus = 'error: ' . $e->getMessage();
}

jsonSuccess([
    'status'    => 'ok',
    'timestamp' => date('c'),
    'source'    => 'php',
    'database'  => $dbStatus,
]);
