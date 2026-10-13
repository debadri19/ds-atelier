<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/bootstrap.php';

$config = ds_atelier_boot_customer_request();
if (!ds_atelier_require_post()) {
    ds_atelier_send(['ok' => false, 'error' => 'Method not allowed.', 'code' => 405]);
}

$body = ds_atelier_request_json();
ds_atelier_require_csrf($body);
ds_atelier_customer_session_clear();
ds_atelier_send(['ok' => true, 'csrf' => ds_atelier_csrf_token(), 'code' => 200]);
