<?php

declare(strict_types=1);

function ds_atelier_request_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return $_POST;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $_POST;
}

function ds_atelier_request_csrf(array $body): ?string
{
    if (isset($body['_csrf']) && is_string($body['_csrf'])) {
        return $body['_csrf'];
    }
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return is_string($header) && $header !== '' ? $header : null;
}

function ds_atelier_require_post(): bool
{
    return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? '')) === 'POST';
}

function ds_atelier_boot_customer_request(): array
{
    $config = ds_atelier_bootstrap();
    ds_atelier_session_start($config);
    return $config;
}

function ds_atelier_public_payload(array $result): array
{
    unset($result['code'], $result['token'], $result['issued'], $result['email']);
    if (array_key_exists('email_sent', $result) && $result['email_sent'] !== true) {
        $result['email_sent'] = false;
    }
    return $result;
}

function ds_atelier_send(array $result): void
{
    $code = (int) ($result['code'] ?? 200);
    ds_atelier_json(ds_atelier_public_payload($result), $code);
    exit;
}

function ds_atelier_require_csrf(array $body): void
{
    if (!ds_atelier_csrf_validate(ds_atelier_request_csrf($body))) {
        ds_atelier_send(['ok' => false, 'error' => 'Your session expired. Please refresh and try again.', 'code' => 403]);
    }
}
