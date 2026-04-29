<?php
/**
 * POST /api/auth/login.php
 * Login with email + password
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$email = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if (!$email || !$password) {
    jsonError('Email and password are required');
}

// Hash password same way as seed (SHA-256)
$passwordHash = hash('sha256', $password);

// Look up user in SQLite
$db = getDB();
$stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    jsonError('Invalid email or password', 401);
}

// Verify password
if ($user['passwordHash'] !== $passwordHash) {
    jsonError('Invalid email or password', 401);
}

// Check user status
if ($user['status'] !== 'ACTIVE') {
    jsonError('Account is ' . strtolower($user['status']), 403);
}

// Generate token (64 char hex)
$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d\TH:i:s\Z', time() + 86400 * 30); // 30 days

// Store token
$tokens = [];
if (file_exists(TOKENS_FILE)) {
    $tokens = json_decode(file_get_contents(TOKENS_FILE), true) ?: [];
}
$tokens[$token] = [
    'userId' => $user['id'],
    'expiresAt' => $expiresAt,
    'createdAt' => date('Y-m-d\TH:i:s\Z'),
];
file_put_contents(TOKENS_FILE, json_encode($tokens, JSON_PRETTY_PRINT));

// Return user + token
unset($user['passwordHash'], $user['twoFactorSecret']);

jsonSuccess([
    'success' => true,
    'token' => $token,
    'user' => $user,
]);
