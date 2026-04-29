<?php
/**
 * POST /api/auth/register.php
 * Register new user account
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$email = trim($body['email'] ?? '');
$password = $body['password'] ?? '';
$name = trim($body['name'] ?? '');

if (!$email || !$password) {
    jsonError('Email and password are required');
}

if (strlen($password) < 8) {
    jsonError('Password must be at least 8 characters');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Invalid email format');
}

// Check if email already exists
$db = getDB();
$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError('Email already registered', 409);
}

// Create user
$userId = 'usr_' . bin2hex(random_bytes(12));
$passwordHash = hash('sha256', $password);
$now = date('Y-m-d\TH:i:s\Z');

$stmt = $db->prepare('INSERT INTO users (id, email, passwordHash, name, role, status, emailVerified, twoFactorSecret, autoLinkAccounts, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
$stmt->execute([$userId, $email, $passwordHash, $name ?: 'Trader', 'TRADER', 'ACTIVE', $now, '', true, $now, $now]);

// Create free trial subscription
$packageId = $body['packageId'] ?? 'pkg_trial';
$subId = 'sub_' . bin2hex(random_bytes(4));

$stmt = $db->prepare('INSERT INTO subscriptions (id, userId, packageId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, stripeSubscriptionId, stripeCustomerId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
$trialEnd = date('Y-m-d\TH:i:s\Z', time() + 86400 * 30); // 30 days
$stmt->execute([$subId, $userId, $packageId, 'ACTIVE', $now, $trialEnd, false, '', '', $now, $now]);

// Generate auth token
$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d\TH:i:s\Z', time() + 86400 * 30);

$tokens = [];
if (file_exists(TOKENS_FILE)) {
    $tokens = json_decode(file_get_contents(TOKENS_FILE), true) ?: [];
}
$tokens[$token] = [
    'userId' => $userId,
    'expiresAt' => $expiresAt,
    'createdAt' => $now,
];
file_put_contents(TOKENS_FILE, json_encode($tokens, JSON_PRETTY_PRINT));

// Return user + token
$user = $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();
unset($user['passwordHash'], $user['twoFactorSecret']);

jsonSuccess([
    'success' => true,
    'token' => $token,
    'user' => $user,
]);
