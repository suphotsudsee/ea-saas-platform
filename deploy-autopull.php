<!DOCTYPE html>
<ht>
<head>
<title>Deploy TradeCandle</title>
<style>
body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;background:#0f172a;color:#fff}
h1{color:#22c55e} a{color:#fbbf24} .msg{padding:15px;margin:10px 0;border-radius:8px}
.err{background:#ef444420;border:1px solid #ef4444;color:#fca5a5}
.ok{background:#22c55e20;border:1px solid #22c55e;color:#86efac}
</style>
</head>
<body>
<h1>🔥 TradeCandle Deploy Tool</h1>

<?php
// TradeCandle Deploy - upload this to Hostinger via File Manager
// Then visit https://tradecandle.net/deploy.php

set_time_limit(600);
ini_set('memory_limit', '1024M');

$docroot = dirname(__FILE__);
$logFile = $docroot . '/deploy.log';

function logMsg($msg) {
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND);
    echo escapeHTML($line) . "<br>\n";
    flush();
}

function escapeHTML($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

// === ACTION: Update from GitHub ===
if (isset($_GET['action']) && $_GET['action'] === 'update') {
    echo "<pre>";
    logMsg("🚀 Starting auto-deploy...");
    
    // 1. Check if repo exists
    if (!is_dir($docroot . '/.git')) {
        logMsg("📦 No git repo found. Cloning...");
        exec("git clone https://github.com/suphotsudsee/ea-saas-platform.git . 2>&1", $out, $code);
        foreach ($out as $line) logMsg("  " . $line);
        if ($code !== 0) {
            logMsg("❌ Clone failed. Trying alternative...");
            // Download zip from GitHub instead
            exec("wget -q https://github.com/suphotsudsee/ea-saas-platform/archive/refs/heads/main.zip -O master.zip 2>&1 && unzip -q -o master.zip && cp -r ea-saas-platform-main/* . && rm -rf ea-saas-platform-main master.zip", $out, $code);
            logMsg("Download zip exit: $code");
        }
    } else {
        logMsg("🔄 Pulling latest code...");
        exec("git fetch origin main 2>&1 && git reset --hard origin/main 2>&1", $out, $code);
        foreach ($out as $line) logMsg("  " . $line);
    }
    
    logMsg("✅ Code updated!");
    logMsg("⚠️ Build step skipped (requires Node.js on server)");
    logMsg("📋 Next steps:");
    logMsg("  1. Check Hostinger Terminal to run: npm install && npm run build");
    logMsg("  2. Or download pre-built .tar.gz and extract");
    echo "</pre>";
    echo "<p><a href='?'>← Back</a></p>";
    exit;
}

// === ACTION: Self-destruct ===
if (isset($_GET['action']) && $_GET['action'] === 'done') {
    echo "<div class='msg ok'>✅ Deploy complete! This file will self-destruct...</div>";
    $self = __FILE__;
    exec("rm $self &>/dev/null &");
    exit;
}

// === ACTION: Restart ===
if (isset($_GET['action']) && $_GET['action'] === 'restart') {
    echo "<pre>";
    // Try to find and kill old server process
    exec("ps aux | grep -E 'server\.js|node.*next' | grep -v grep | awk '{print \$2}'", $pids);
    foreach ($pids as $pid) {
        if ($pid) {
            exec("kill -9 $pid 2>/dev/null");
            echo "Killed PID: $pid\n";
        }
    }
    
    // Try to start
    if (file_exists($docroot . '/server.js')) {
        exec("cd $docroot && nohup node server.js > app.log 2>&1 & echo \$!", $pidOut);
        echo "New PID: " . ($pidOut[0] ?? '?') . "\n";
    }
    echo "</pre>";
    echo "<p><a href='?'>← Back</a></p>";
    exit;
}

// === Main Page ===
$gitExists = is_dir($docroot . '/.git');
$buildExists = is_dir($docroot . '/.next/standalone');
$envExists = file_exists($docroot . '/.env.production') || file_exists($docroot . '/.env.local');

?&gt;

<h2>📊 System Status</h2>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr style="background:#1e293b">
    <td style="padding:10px;border:1px solid #334155">Git Repo</td>
    <td style="padding:10px;border:1px solid #334155"><?= $gitExists ? '✅' : '❌' ?></td>
</tr>
<tr style="background:#1e293b">
    <td style="padding:10px;border:1px solid #334155">Pre-built .next</td>
    <td style="padding:10px;border:1px solid #334155"><?= $buildExists ? '✅' : '❌' ?></td>
</tr>
<tr style="background:#1e293b">
    <td style="padding:10px;border:1px solid #334155">Environment File</td>
    <td style="padding:10px;border:1px solid #334155"><?= $envExists ? '✅' : '❌' ?></td>
</tr>
</table>

<h2>🚀 Quick Actions</h2>
<p>
<a href="?action=update" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#000;border-radius:8px;text-decoration:none;font-weight:bold;margin:5px 0">🔄 Update from GitHub</a>
</p>
<p>
<a href="?action=restart" style="display:inline-block;padding:12px 24px;background:#fbbf24;color:#000;border-radius:8px;text-decoration:none;font-weight:bold;margin:5px 0">🔁 Restart Server</a>
</p>
<p>
<a href="?action=done" style="display:inline-block;padding:12px 24px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;margin:5px 0">🗑️ Self-Destruct (cleanup)</a>
</p>

<p style="margin-top:40px;padding:15px;background:#1e293b;border-radius:8px">
<strong>💡 Note:</strong> Hostinger shared hosting may need manual build via Terminal or VPS plan.
</p>

<hr style="margin-top:40px;border-color:#334155">
<p style="color:#94a3b8;font-size:12px">TradeCandle EA SaaS Deploy Tool — v1.0</p>

</body>
</html>
