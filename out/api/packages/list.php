<?php
/**
 * GET /api/packages/list.php
 * List all active packages — no auth required
 */
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$db = getDB();
$stmt = $db->prepare('
    SELECT id, name, description, priceCents, currency, billingCycle, 
           maxAccounts, features, isActive, isTrial, trialDays, sortOrder
    FROM packages 
    WHERE isActive = 1 
    ORDER BY sortOrder ASC, createdAt ASC
');
$stmt->execute();
$packages = $stmt->fetchAll();

// Cast numeric/boolean fields
foreach ($packages as &$pkg) {
    $pkg['priceCents'] = (int)$pkg['priceCents'];
    $pkg['maxAccounts'] = (int)$pkg['maxAccounts'];
    $pkg['isActive'] = (bool)$pkg['isActive'];
    $pkg['isTrial'] = (bool)$pkg['isTrial'];
    $pkg['trialDays'] = (int)$pkg['trialDays'];
    $pkg['sortOrder'] = (int)$pkg['sortOrder'];
}
unset($pkg);

jsonSuccess(['packages' => $packages]);
