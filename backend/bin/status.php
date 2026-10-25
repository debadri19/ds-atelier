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

$mail = ds_atelier_mail_status_summary($config);
fwrite(STDOUT, "mail_transport=" . $mail['transport'] . "\n");
fwrite(STDOUT, "mail_ready=" . $mail['ready'] . "\n");
fwrite(STDOUT, "mail_real=" . $mail['real'] . "\n");
fwrite(STDOUT, "mail_from_configured=" . $mail['from_configured'] . "\n");
fwrite(STDOUT, "mail_smtp_configured=" . $mail['smtp_configured'] . "\n");
fwrite(STDOUT, "mail_app_url_configured=" . $mail['app_url_configured'] . "\n");

$pay = ds_atelier_payment_status_summary($config);
fwrite(STDOUT, "payment_provider=" . $pay['provider'] . "\n");
fwrite(STDOUT, "payment_configured=" . $pay['configured'] . "\n");
fwrite(STDOUT, "payment_ready=" . $pay['ready'] . "\n");
fwrite(STDOUT, "payment_live=" . $pay['live'] . "\n");
fwrite(STDOUT, "payment_webhook_configured=" . $pay['webhook_configured'] . "\n");

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
