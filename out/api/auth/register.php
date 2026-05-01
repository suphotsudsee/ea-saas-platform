<?php
/**
 * POST /api/auth/register.php — Register new user (MySQL)
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$email = trim($body['email'] ?? '');
$password = $body['password'] ?? '';
$name = trim($body['name'] ?? '');

if (!$email || !$password) jsonError('Email and password are required');
if (strlen($password) < 8) jsonError('Password must be at least 8 characters');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Invalid email format');

try {
    $db = getDB();

    // Check duplicate
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) jsonError('Email already registered', 409);

    // Create user
    $userId = 'usr_' . bin2hex(random_bytes(12));
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $now = date('Y-m-d H:i:s');

    $db->prepare('INSERT INTO users (id, email, passwordHash, name, role, status, emailVerified, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)')
       ->execute([$userId, $email, $passwordHash, $name ?: 'Trader', 'TRADER', 'ACTIVE', $now, $now, $now]);

    // Create trial subscription
    $packageId = $body['packageId'] ?? 'pkg_trial';
    $subId = 'sub_' . bin2hex(random_bytes(4));
    $trialEnd = date('Y-m-d H:i:s', time() + 86400 * 30);

    $db->prepare('INSERT INTO subscriptions (id, userId, packageId, status, currentPeriodStart, currentPeriodEnd, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)')
       ->execute([$subId, $userId, $packageId, 'ACTIVE', $now, $trialEnd, $now, $now]);

    // Generate auth token
    $token = generateToken();
    $expiresAt = date('Y-m-d\TH:i:s\Z', time() + 86400 * 30);
    saveToken($userId, $token, $expiresAt);

    // Return user
    $user = $db->prepare('SELECT * FROM users WHERE id = ?')->execute([$userId])->fetch();
    unset($user['passwordHash'], $user['twoFactorSecret']);

    jsonSuccess(['success' => true, 'token' => $token, 'user' => $user]);
} catch (Exception $e) {
    jsonError('Registration failed: ' . $e->getMessage(), 500);
}
