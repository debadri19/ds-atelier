<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":false,"error":"Forbidden."}';
    exit;
}

require_once dirname(__DIR__) . '/src/bootstrap.php';

try {
    $config = ds_atelier_bootstrap();
    ds_atelier_catalog_seed_allowed($config);
    $result = ds_atelier_try_pdo($config);
    if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
        fwrite(STDERR, "Database unavailable.\n");
        exit(2);
    }

    $summary = ds_atelier_catalog_seed($result['pdo'], $config);
    fwrite(STDOUT, "ok=1\n");
    fwrite(STDOUT, 'categories=' . $summary['categories'] . "\n");
    fwrite(STDOUT, 'sizes=' . $summary['sizes'] . "\n");
    fwrite(STDOUT, 'colours=' . $summary['colours'] . "\n");
    fwrite(STDOUT, 'products_inserted=' . $summary['products_inserted'] . "\n");
    fwrite(STDOUT, 'products_skipped=' . $summary['products_skipped'] . "\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Catalog seed failed.\n");
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
