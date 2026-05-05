<?php
/**
 * POST /api/auth/login.php — Login with email + password (MySQL)
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

try {
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Invalid email or password', 401);
    }

    if (!password_verify($password, $user['passwordHash'])) {
        jsonError('Invalid email or password', 401);
    }

    if ($user['status'] !== 'ACTIVE') {
        jsonError('Account is ' . strtolower($user['status']), 403);
    }
} catch (Exception $e) {
    jsonError('Database error: ' . $e->getMessage(), 500);
}

// Generate token and save to MySQL
$token = generateToken();
$expiresAt = date('Y-m-d\TH:i:s\Z', time() + 86400 * 30);
saveToken($user['id'], $token, $expiresAt);

unset($user['passwordHash'], $user['twoFactorSecret']);

jsonSuccess([
    'success' => true,
    'token' => $token,
    'user' => $user,
]);
