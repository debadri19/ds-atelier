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
    $out = ds_atelier_register_customer($result['pdo'], $body);
    if (!empty($out['ok'])) {
        $out['csrf'] = ds_atelier_csrf_token();
    }
    ds_atelier_send($out);
} catch (Throwable $e) {
    ds_atelier_send(ds_atelier_fail_closed('Unable to create the account. Please try again later.', $e, $config));
}
