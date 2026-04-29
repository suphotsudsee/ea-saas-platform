<?php
/**
 * GET /api/auth/me.php
 * Get current user profile
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = getCurrentUser();
if (!$user) {
    jsonError('Unauthorized', 401);
}

unset($user['passwordHash'], $user['twoFactorSecret']);

jsonSuccess([
    'success' => true,
    'user' => $user,
]);
