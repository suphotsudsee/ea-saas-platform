<?php
// API Configuration and Database Connection
// Uses SQLite for shared hosting compatibility

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database path (outside web root for security)
$DB_PATH = __DIR__ . '/../data/prod.db';

// Ensure data directory exists
if (!is_dir(dirname($DB_PATH))) {
    mkdir(dirname($DB_PATH), 0755, true);
}

// Initialize SQLite database with required tables
function initDatabase($db) {
    $db->exec('
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            name TEXT,
            role TEXT DEFAULT "USER",
            status TEXT DEFAULT "ACTIVE",
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    ');
    
    $db->exec('
        CREATE TABLE IF NOT EXISTS packages (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price_cents INTEGER DEFAULT 0,
            currency TEXT DEFAULT "USD",
            billing_cycle TEXT DEFAULT "MONTHLY",
            max_accounts INTEGER DEFAULT 1,
            features TEXT,
            is_active INTEGER DEFAULT 1,
            is_trial INTEGER DEFAULT 0,
            trial_days INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active, sort_order);
    ');
    
    $db->exec('
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            package_id TEXT NOT NULL,
            status TEXT DEFAULT "ACTIVE",
            current_period_start TEXT,
            current_period_end TEXT,
            cancel_at_period_end INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (package_id) REFERENCES packages(id)
        );
        CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id, status);
    ');
    
    $db->exec('
        CREATE TABLE IF NOT EXISTS licenses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT "ACTIVE",
            max_accounts INTEGER DEFAULT 1,
            expires_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ');
    
    // Seed packages if empty
    $stmt = $db->query('SELECT COUNT(*) FROM packages');
    if ($stmt->fetchColumn() == 0) {
        seedPackages($db);
    }
}

function seedPackages($db) {
    $packages = [
        [
            'id' => 'pkg_trial',
            'name' => '1-Month Free Trial',
            'description' => 'Trial TradeCandle Gold Scalper v12 Free 30 days',
            'price_cents' => 0,
            'currency' => 'USD',
            'billing_cycle' => 'MONTHLY',
            'max_accounts' => 1,
            'features' => '{"strategyIds":["strat_v12"],"priority":1,"emailSupport":true,"dashboard":true}',
            'is_active' => 1,
            'is_trial' => 1,
            'trial_days' => 30,
            'sort_order' => 0,
        ],
        [
            'id' => 'pkg_starter',
            'name' => 'Starter',
            'description' => 'For Beginner Traders 1 MT5 Accounts',
            'price_cents' => 999,
            'currency' => 'USD',
            'billing_cycle' => 'MONTHLY',
            'max_accounts' => 1,
            'features' => '{"strategyIds":["strat_v12"],"priority":1,"emailSupport":true,"dashboard":true}',
            'is_active' => 1,
            'is_trial' => 0,
            'trial_days' => 0,
            'sort_order' => 1,
        ],
        [
            'id' => 'pkg_pro',
            'name' => 'Pro',
            'description' => 'For Serious Traders 3 Accounts',
            'price_cents' => 1999,
            'currency' => 'USD',
            'billing_cycle' => 'MONTHLY',
            'max_accounts' => 3,
            'features' => '{"strategyIds":["strat_v12"],"priority":2,"emailSupport":true,"dashboard":true,"killSwitch":true}',
            'is_active' => 1,
            'is_trial' => 0,
            'trial_days' => 0,
            'sort_order' => 2,
        ],
        [
            'id' => 'pkg_elite',
            'name' => 'Elite',
            'description' => 'For Professional Traders 5 Accounts',
            'price_cents' => 3999,
            'currency' => 'USD',
            'billing_cycle' => 'MONTHLY',
            'max_accounts' => 5,
            'features' => '{"strategyIds":["strat_v12"],"priority":3,"emailSupport":true,"dashboard":true}',
            'is_active' => 1,
            'is_trial' => 0,
            'trial_days' => 0,
            'sort_order' => 3,
        ],
    ];
    
    $stmt = $db->prepare('
        INSERT INTO packages (id, name, description, price_cents, currency, billing_cycle, max_accounts, features, is_active, is_trial, trial_days, sort_order)
        VALUES (:id, :name, :description, :price_cents, :currency, :billing_cycle, :max_accounts, :features, :is_active, :is_trial, :trial_days, :sort_order)
    ');
    
    foreach ($packages as $pkg) {
        $stmt->execute($pkg);
    }
}

// Generate UUID v4
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Send JSON response
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Get JSON input from request body
function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}

// Hash password (compatible with bcrypt)
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Initialize DB
try {
    $pdo = new PDO("sqlite:$DB_PATH");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    initDatabase($pdo);
} catch (PDOException $e) {
    jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
}
?>
