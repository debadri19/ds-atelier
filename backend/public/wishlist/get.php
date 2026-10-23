<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/bootstrap.php';

$config = ds_atelier_boot_customer_request();
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'GET' && $method !== 'HEAD') {
    ds_atelier_send(['ok' => false, 'error' => 'Method not allowed.', 'code' => 405]);
}

ds_atelier_send(ds_atelier_commerce_handle($config, static function (PDO $pdo) use ($config): array {
    return ds_atelier_wishlist_get($pdo, $config);
}));
