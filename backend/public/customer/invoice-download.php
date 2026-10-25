<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/bootstrap.php';

$config = ds_atelier_boot_customer_request();
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'GET' && $method !== 'HEAD') {
    ds_atelier_send(['ok' => false, 'error' => 'Method not allowed.', 'code' => 405]);
}

$result = ds_atelier_commerce_handle(
    $config,
    static function (PDO $pdo) use ($config): array {
        return ds_atelier_invoice_owned_payload($pdo, $config, ds_atelier_query_params());
    },
    'Unable to download this invoice. Please try again later.'
);

if (($result['ok'] ?? false) !== true) {
    ds_atelier_send($result);
}

$public = is_array($result['invoice'] ?? null) ? $result['invoice'] : [];
$snapshot = is_array($public['snapshot'] ?? null) ? $public['snapshot'] : [];
if ($snapshot === []) {
    ds_atelier_send(['ok' => false, 'error' => 'Invoice not found.', 'code' => 404]);
}

ds_atelier_invoice_send_download([
    'public_number' => (string) ($public['number'] ?? ''),
    'issued_at' => (string) ($public['issuedAt'] ?? ''),
    'document_kind' => (string) ($public['kind'] ?? ''),
], $snapshot);
