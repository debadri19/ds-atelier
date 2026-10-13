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
} catch (Throwable $e) {
    fwrite(STDERR, "Configuration failed.\n");
    exit(1);
}

fwrite(STDOUT, "env=" . $config['env'] . "\n");
fwrite(STDOUT, "db_name=" . $config['db']['name'] . "\n");
fwrite(STDOUT, "db_host=" . $config['db']['host'] . "\n");
fwrite(STDOUT, "session_name=" . $config['session']['name'] . "\n");
fwrite(STDOUT, "session_secure=" . ($config['session']['secure'] ? '1' : '0') . "\n");
fwrite(STDOUT, "session_samesite=" . $config['session']['samesite'] . "\n");

if (in_array('--config-only', $argv, true)) {
    exit(0);
}

$result = ds_atelier_try_pdo($config);
if (!$result['ok']) {
    fwrite(STDOUT, "database=unavailable\n");
    exit(2);
}

fwrite(STDOUT, "database=ok\n");

try {
    $files = ds_atelier_migration_files($config['paths']['migrations']);
    fwrite(STDOUT, "migrations_discovered=" . count($files) . "\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Migration discovery failed.\n");
    exit(1);
}

exit(0);
