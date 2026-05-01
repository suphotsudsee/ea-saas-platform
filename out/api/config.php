<?php
/**
 * EA SaaS Platform — Shared config for PHP API endpoints (MySQL via PDO)
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

// ─── MySQL Configuration ──────────────────────────────────
// Use environment variables or defaults for Hostinger
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'u175893330_dbA7k9');
define('DB_USER', getenv('DB_USER') ?: 'u175893330_usrP4n');
define('DB_PASS', getenv('DB_PASS') ?: 'h=0Zx5V^');

// Legacy paths (keep for reference)
define('DATA_DIR', __DIR__ . '/../data');
define('TOKENS_FILE', DATA_DIR . '/tokens.json');

// ─── Database connection (MySQL via PDO) ─────────────────
function getDB() {
    static $db = null;
    if ($db === null) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $db = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $db;
}

// ─── Request helpers ────────────────────────────────────
function getRequestBody() {
    $body = file_get_contents('php://input');
    return $body ? json_decode($body, true) : [];
}

// ─── Auth helpers ───────────────────────────────────────
function generateToken() {
    return bin2hex(random_bytes(32));
}

function getCurrentUser() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        return null;
    }

    $token = $m[1];

    // Lookup token in MySQL
    try {
        $db = getDB();
        $stmt = $db->prepare('SELECT userId, expiresAt FROM auth_tokens WHERE token = ?');
        $stmt->execute([$token]);
        $tokenData = $stmt->fetch();
        
        if (!$tokenData || strtotime($tokenData['expiresAt']) < time()) {
            return null;
        }

        $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$tokenData['userId']]);
        return $stmt->fetch();
    } catch (Exception $e) {
        // Fallback to JSON tokens (migration period)
        if (file_exists(TOKENS_FILE)) {
            $tokens = json_decode(file_get_contents(TOKENS_FILE), true) ?: [];
            if (isset($tokens[$token]) && strtotime($tokens[$token]['expiresAt']) > time()) {
                try {
                    $db = getDB();
                    $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
                    $stmt->execute([$tokens[$token]['userId']]);
                    return $stmt->fetch();
                } catch (Exception $e2) {}
            }
        }
        return null;
    }
}

function saveToken($userId, $token, $expiresAt) {
    $db = getDB();
    $stmt = $db->prepare('INSERT INTO auth_tokens (token, userId, expiresAt, createdAt) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE expiresAt = VALUES(expiresAt), createdAt = NOW()');
    $stmt->execute([$token, $userId, $expiresAt]);
}

// ─── Response helpers ───────────────────────────────────
function jsonError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

function jsonSuccess($data) {
    echo json_encode($data);
    exit;
}
