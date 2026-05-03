<?php
/**
 * EA SaaS Platform — Hostinger Deploy Script
 * Upload via SFTP, then visit this file via browser to extract & start
 **/

$dir = __DIR__ . '/ea-saas-platform';
$tar = $dir . '/deploy-hostinger.tar.gz';

if (!file_exists($tar)) {
    die("❌ Tarball not found at: $tar\n");
}

echo "📦 Found tarball: " . basename($tar) . " (" . round(filesize($tar)/1024/1024, 1) . " MB)\n\n";

// Extract
echo "🗜️  Extracting...\n";
exec("cd $dir && tar xzf deploy-hostinger.tar.gz 2>&1", $out, $code);
if ($code !== 0) {
    die("❌ Extract failed:\n" . implode("\n", $out) . "\n");
}
echo "✅ Extracted!\n";

// Create .env.local if not exists
$envFile = $dir . '/.env.local';
$envProd = $dir . '/.env.production';
if (!file_exists($envFile) && file_exists($envProd)) {
    copy($envProd, $envFile);
    echo "✅ Created .env.local from .env.production\n";
}

// Create data dir
if (!is_dir($dir . '/data')) {
    mkdir($dir . '/data', 0755, true);
    echo "✅ Created data/ directory\n";
}

// Create start script
$startScript = $dir . '/start.sh';
file_put_contents($startScript, "#!/bin/bash\nexport NODE_ENV=production\nexport PORT=3000\ncd $dir\nnohup node .next/standalone/server.js > app.log 2>&1 &\necho \$! > app.pid\n");
chmod($startScript, 0755);
echo "✅ Created start.sh\n";

// Check if Node.js available (unlikely on shared hosting)
exec('which node 2>/dev/null', $nodeCheck);
if (empty($nodeCheck)) {
    echo "\n⚠️  WARNING: Node.js not detected on this server.\n";
    echo "   This is a shared hosting account - you need Node.js support.\n";
    echo "\n   Options:\n";
    echo "   1. Upgrade to Hostinger VPS (Node.js supported)\n";
    echo "   2. Use Hostinger's Node.js hosting plan\n";
    echo "   3. Deploy via Railway/Render/Vercel instead\n";
    echo "\n📁 Files are ready at: $dir/\n";
    echo "   You can start manually if Node.js is available elsewhere.\n";
    exit(0);
}

// Try to start
echo "\n🚀 Starting server...\n";
exec("bash $startScript 2>&1", $startOut, $startCode);

sleep(2);

// Check if running
$pidFile = $dir . '/app.pid';
if (file_exists($pidFile)) {
    $pid = trim(file_get_contents($pidFile));
    exec("kill -0 $pid 2>&1", $_, $running);
    if ($running === 0) {
        echo "✅ Server running! PID: $pid\n";
        echo "📝 Log: $dir/app.log\n";
        echo "🌐 Visit: https://" . $_SERVER['HTTP_HOST'] . "/ea-saas-platform/\n";
    } else {
        echo "❌ Server failed to start\n";
        echo "📋 Last log:\n";
        if (file_exists($dir . '/app.log')) {
            $log = file_get_contents($dir . '/app.log');
            echo implode("\n", array_slice(explode("\n", $log), -20)) . "\n";
        }
    }
} else {
    echo "❌ Failed to create PID file\n";
}
