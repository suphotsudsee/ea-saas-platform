<?php
/**
 * TradeCandle EA SaaS — PHP Proxy to Node.js Standalone
 * Upload to public_html/ on Hostinger
 */

$nodeHost = '127.0.0.1';
$nodePort = 3000;
$target = "http://{$nodeHost}:{$nodePort}" . $_SERVER['REQUEST_URI'];

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);

$method = $_SERVER['REQUEST_METHOD'];
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

// Headers fallback for PHP-FPM / LiteSpeed
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (strncmp($name, 'HTTP_', 5) === 0) {
                $clean = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$clean] = $value;
            } elseif ($name === 'CONTENT_TYPE') {
                $headers['Content-Type'] = $value;
            } elseif ($name === 'CONTENT_LENGTH') {
                $headers['Content-Length'] = $value;
            }
        }
        return $headers;
    }
}

$headers = [];
foreach (getallheaders() as $key => $value) {
    $lk = strtolower($key);
    if ($lk === 'host') continue;
    if ($lk === 'connection') continue;
    if ($lk === 'accept-encoding') continue;
    if ($lk === 'transfer-encoding') continue;
    if ($lk === 'content-length') continue;
    $headers[] = "$key: $value";
}
$headers[] = "Host: localhost:{$nodePort}";
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
    $body = file_get_contents('php://input');
    if ($body !== '') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    echo '<!DOCTYPE html><html><head><title>TradeCandle Starting...</title><meta http-equiv="refresh" content="5"></head>';
    echo '<body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:40px;">';
    echo '<h1>🔥 TradeCandle EA SaaS</h1>';
    echo '<p>The server is warming up... Please wait.</p>';
    echo '<p><small>' . htmlspecialchars(curl_error($ch)) . '</small></p>';
    echo '</body></html>';
    curl_close($ch);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headerStr = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Forward status
http_response_code($httpCode);

// Forward headers
foreach (explode("\r\n", $headerStr) as $header) {
    $header = trim($header);
    if (empty($header)) continue;
    if (stripos($header, 'HTTP/') === 0) continue;
    $lk = strtolower(strtok($header, ':'));
    if ($lk === 'transfer-encoding') continue;
    if ($lk === 'content-length') continue;
    if ($lk === 'connection') continue;
    header($header, false);
}

echo $body;
