<?php
/**
 * GET /api/trade-events/stats.php
 * Get trade statistics for user
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = getCurrentUser();
if (!$user) {
    jsonError('Unauthorized', 401);
}

// Return empty stats if no data yet
jsonSuccess([
    'stats' => [
        'totalTrades' => 0,
        'winRate' => 0,
        'totalProfit' => 0,
        'avgWin' => 0,
        'avgLoss' => 0,
        'profitFactor' => 0,
        'maxDrawdown' => 0,
    ]
]);
