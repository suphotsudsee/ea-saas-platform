<?php
/**
 * PHP Proxy — forwards requests to Node.js standalone server
 * Only reached when URL doesn't match static files, .php API, or .html pages
 */
$target = 'http://127.0.0.1:3000' . $_SERVER['REQUEST_URI'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $target);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Forward request body
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $body = file_get_contents('php://input');
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

// Forward headers
$headers = ['Host: localhost:3000'];
$skipHeaders = ['host', 'connection', 'accept-encoding', 'transfer-encoding', 'content-length'];
foreach (getallheaders() as $key => $value) {
    if (!in_array(strtolower($key), $skipHeaders)) {
        $headers[] = "$key: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(502);
    echo 'Backend unavailable: ' . curl_error($ch);
    curl_close($ch);
    exit;
}

$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header_str = substr($response, 0, $header_size);
$body = substr($response, $header_size);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);

foreach (explode("\r\n", $header_str) as $header) {
    $header = trim($header);
    if (empty($header) || stripos($header, 'HTTP/') === 0) continue;
    if (stripos($header, 'Transfer-Encoding:') === false
        && stripos($header, 'Content-Length:') === false) {
        header($header, false);
    }
}

echo $body;
