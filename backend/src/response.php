<?php

declare(strict_types=1);

function ds_atelier_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
}

function ds_atelier_fail_closed(string $publicMessage, Throwable $error, array $config, int $status = 500): array
{
    ds_atelier_log('error', $error::class . ': ' . $error->getMessage(), $config);

    return [
        'ok' => false,
        'error' => $publicMessage,
        'code' => $status,
    ];
}
