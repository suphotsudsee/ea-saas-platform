<?php
// GET /api/subscriptions/list
// List all active packages

require_once __DIR__ . '/../config.php';

try {
    $stmt = $pdo->prepare('
        SELECT 
            id,
            name,
            description,
            price_cents as priceCents,
            currency,
            billing_cycle as billingCycle,
            max_accounts as maxAccounts,
            features,
            is_active as isActive,
            is_trial as isTrial,
            trial_days as trialDays,
            sort_order as sortOrder
        FROM packages
        WHERE is_active = 1
        ORDER BY sort_order ASC
    ');
    $stmt->execute();
    $packages = $stmt->fetchAll();
    
    // Transform to match frontend expected format
    $result = array_map(function($pkg) {
        return [
            'id' => $pkg['id'],
            'name' => $pkg['name'],
            'description' => $pkg['description'],
            'priceCents' => (int)$pkg['priceCents'],
            'currency' => $pkg['currency'],
            'billingCycle' => $pkg['billingCycle'],
            'maxAccounts' => (int)$pkg['maxAccounts'],
            'features' => $pkg['features'],
            'isActive' => (bool)$pkg['isActive'],
            'isTrial' => (bool)$pkg['isTrial'],
            'trialDays' => (int)$pkg['trialDays'],
            'sortOrder' => (int)$pkg['sortOrder'],
        ];
    }, $packages);
    
    jsonResponse(['packages' => $result]);
    
} catch (PDOException $e) {
    jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
?>
