<?php
/**
 * GET /api/subscriptions/list.php
 * List available packages (public)
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

// Try SQLite first
try {
    $db = getDB();
    $packages = $db->query('SELECT * FROM packages WHERE isActive = 1 ORDER BY sortOrder ASC')->fetchAll();
    if ($packages) {
        jsonSuccess(['packages' => $packages]);
    }
} catch (Exception $e) {
    // Fall through to JSON fallback
}

// JSON fallback
if (file_exists(PACKAGES_FILE)) {
    $packages = json_decode(file_get_contents(PACKAGES_FILE), true) ?: [];
    jsonSuccess(['packages' => $packages]);
}

jsonSuccess(['packages' => []]);
