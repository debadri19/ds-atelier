<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/bootstrap.php';

$config = ds_atelier_boot_customer_request();
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'GET' && $method !== 'HEAD') {
    ds_atelier_send(['ok' => false, 'error' => 'Method not allowed.', 'code' => 405]);
}

$result = ds_atelier_try_pdo($config);
if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
    ds_atelier_send(['ok' => false, 'error' => 'Something went wrong. Please try again later.', 'code' => 503]);
}

$customer = ds_atelier_customer_from_session($result['pdo']);
ds_atelier_json([
    'ok' => true,
    'csrf' => ds_atelier_csrf_token(),
    'authenticated' => $customer !== null,
    'customer' => $customer ? ds_atelier_customer_public($customer) : null,
]);
