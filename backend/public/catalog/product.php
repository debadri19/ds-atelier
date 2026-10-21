<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/src/bootstrap.php';

$config = ds_atelier_bootstrap();
if (!ds_atelier_require_get()) {
    ds_atelier_send(['ok' => false, 'error' => 'Method not allowed.', 'code' => 405]);
}

$params = ds_atelier_query_params();
$slug = trim((string) ($params['id'] ?? $params['slug'] ?? ''));
ds_atelier_send(ds_atelier_catalog_handle_product($config, $slug));
