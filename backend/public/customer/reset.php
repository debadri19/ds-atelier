<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/bootstrap.php';

$config = ds_atelier_boot_customer_request();
if (!ds_atelier_require_post()) {
    ds_atelier_send(['ok' => false, 'error' => 'Method not allowed.', 'code' => 405]);
}

$body = ds_atelier_request_json();
ds_atelier_require_csrf($body);

$result = ds_atelier_try_pdo($config);
if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
    ds_atelier_send(['ok' => false, 'error' => 'Something went wrong. Please try again later.', 'code' => 503]);
}

try {
    ds_atelier_send(ds_atelier_reset_password($result['pdo'], $body));
} catch (Throwable $e) {
    ds_atelier_send(ds_atelier_fail_closed('Unable to update the password. Please try again later.', $e, $config));
}
