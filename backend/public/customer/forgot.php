<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/bootstrap.php';

$config = ds_atelier_boot_customer_request();
if (!ds_atelier_require_post()) {
    ds_atelier_send(['ok' => false, 'error' => 'Method not allowed.', 'code' => 405]);
}

$body = ds_atelier_request_json();
ds_atelier_require_csrf($body);

$email = ds_atelier_normalize_email((string) ($body['email'] ?? ''));
if ($email === '') {
    ds_atelier_send([
        'ok' => false,
        'error' => 'Check the highlighted fields and try again.',
        'fields' => ['email' => 'Enter your email.'],
        'code' => 422,
    ]);
}

$result = ds_atelier_try_pdo($config);
if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
    ds_atelier_send(['ok' => false, 'error' => 'Something went wrong. Please try again later.', 'code' => 503]);
}

try {
    $out = ds_atelier_create_password_reset($result['pdo'], $email);
    ds_atelier_log('info', 'Password reset requested', $config);
    ds_atelier_send($out);
} catch (Throwable $e) {
    ds_atelier_send(ds_atelier_fail_closed('Something went wrong. Please try again later.', $e, $config));
}
