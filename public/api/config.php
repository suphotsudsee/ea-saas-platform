<?php
/**
 * EA SaaS Platform — Shared config for PHP API endpoints
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-License-Key');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Paths
define('DATA_DIR', __DIR__ . '/../data');
define('DB_PATH', DATA_DIR . '/prod.db');
define('USERS_FILE', DATA_DIR . '/users.json');
define('TOKENS_FILE', DATA_DIR . '/tokens.json');
define('PACKAGES_FILE', DATA_DIR . '/packages.json');

// Database connection (SQLite via PDO)
function getDB() {
    static $db = null;
    if ($db === null) {
        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }
    return $db;
}

// Get request body as JSON
function getRequestBody() {
    $body = file_get_contents('php://input');
    return $body ? json_decode($body, true) : [];
}

// Get current user from token
function getCurrentUser() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        return null;
    }

    $token = $m[1];

    // Check tokens.json
    if (file_exists(TOKENS_FILE)) {
        $tokens = json_decode(file_get_contents(TOKENS_FILE), true) ?: [];
        if (isset($tokens[$token])) {
            $data = $tokens[$token];
            if (strtotime($data['expiresAt']) > time()) {
                // Look up user in DB
                $db = getDB();
                $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
                $stmt->execute([$data['userId']]);
                return $stmt->fetch();
            }
        }
    }

    return null;
}

// Error response
function jsonError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// Success response
function jsonSuccess($data) {
    echo json_encode($data);
    exit;
}
