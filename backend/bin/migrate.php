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
    $result = ds_atelier_try_pdo($config);
    if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
        fwrite(STDERR, "Database unavailable.\n");
        exit(2);
    }

    $summary = ds_atelier_apply_migrations($result['pdo'], $config['paths']['migrations']);
    fwrite(STDOUT, 'applied=' . count($summary['applied']) . "\n");
    fwrite(STDOUT, 'skipped=' . count($summary['skipped']) . "\n");
    foreach ($summary['applied'] as $name) {
        fwrite(STDOUT, "applied_file={$name}\n");
    }
    exit(0);
    } catch (Throwable $e) {
    fwrite(STDERR, "Migration failed.\n");
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
