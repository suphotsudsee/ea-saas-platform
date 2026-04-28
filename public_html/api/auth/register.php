<?php
// POST /api/auth/register
// Register new user with trial

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = getJsonInput();

// Validation
$required = ['email', 'password', 'name'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        jsonResponse(['error' => "Missing required field: $field"], 400);
    }
}

$email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
$name = htmlspecialchars(trim($data['name']));
$password = $data['password'];
$packageId = $data['packageId'] ?? 'pkg_trial';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['error' => 'Invalid email format'], 400);
}

if (strlen($password) < 8) {
    jsonResponse(['error' => 'Password must be at least 8 characters'], 400);
}

try {
    $pdo->beginTransaction();
    
    // Check if email exists
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Email already registered'], 409);
    }
    
    // Check package exists
    $stmt = $pdo->prepare('SELECT id, name, max_accounts, trial_days FROM packages WHERE id = ? AND is_active = 1');
    $stmt->execute([$packageId]);
    $package = $stmt->fetch();
    if (!$package) {
        jsonResponse(['error' => 'Invalid package selected'], 400);
    }
    
    // Create user
    $userId = generateUUID();
    $passwordHash = hashPassword($password);
    
    $stmt = $pdo->prepare('
        INSERT INTO users (id, email, password_hash, name, role, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$userId, $email, $passwordHash, $name, 'TRADER', 'ACTIVE']);
    
    // Create trial subscription
    $subId = generateUUID();
    $now = date('Y-m-d H:i:s');
    $periodEnd = date('Y-m-d H:i:s', strtotime("+{$package['trial_days']} days"));
    
    $stmt = $pdo->prepare('
        INSERT INTO subscriptions (id, user_id, package_id, status, current_period_start, current_period_end)
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$subId, $userId, $packageId, 'TRIALING', $now, $periodEnd]);
    
    // Generate license key
    $licenseKey = strtoupper(substr(md5(uniqid()), 0, 16));
    $licenseId = generateUUID();
    $licenseExpiry = date('Y-m-d H:i:s', strtotime("+{$package['trial_days']} days"));
    
    $stmt = $pdo->prepare('
        INSERT INTO licenses (id, user_id, key, status, max_accounts, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$licenseId, $userId, $licenseKey, 'ACTIVE', $package['max_accounts'], $licenseExpiry]);
    
    $pdo->commit();
    
    jsonResponse([
        'success' => true,
        'user' => [
            'id' => $userId,
            'email' => $email,
            'name' => $name,
        ],
        'subscription' => [
            'packageId' => $packageId,
            'packageName' => $package['name'],
            'trialDays' => (int)$package['trial_days'],
            'expiresAt' => $periodEnd,
        ],
        'license' => [
            'key' => $licenseKey,
            'maxAccounts' => (int)$package['max_accounts'],
            'expiresAt' => $licenseExpiry,
        ],
    ], 201);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    jsonResponse(['error' => 'Registration failed: ' . $e->getMessage()], 500);
}
?>
