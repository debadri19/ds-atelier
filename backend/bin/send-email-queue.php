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
    $mail = ds_atelier_mail_status_summary($config);
    if (in_array('--status', $argv, true)) {
        fwrite(STDOUT, 'mail_transport=' . $mail['transport'] . "\n");
        fwrite(STDOUT, 'mail_ready=' . $mail['ready'] . "\n");
        fwrite(STDOUT, 'mail_real=' . $mail['real'] . "\n");
        fwrite(STDOUT, 'mail_from_configured=' . $mail['from_configured'] . "\n");
        fwrite(STDOUT, 'mail_smtp_configured=' . $mail['smtp_configured'] . "\n");
        fwrite(STDOUT, 'mail_app_url_configured=' . $mail['app_url_configured'] . "\n");
        fwrite(STDOUT, "queue_worker=manual\n");
        exit($mail['ok'] === 1 ? 0 : 1);
    }

    $result = ds_atelier_try_pdo($config);
    if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
        fwrite(STDERR, "Database unavailable.\n");
        exit(2);
    }

    $limit = 20;
    foreach ($argv as $arg) {
        if (str_starts_with($arg, '--limit=')) {
            $limit = max(1, min(50, (int) substr($arg, 8)));
        }
    }

    $processed = ds_atelier_mail_process_queue($result['pdo'], $config, $limit);
    fwrite(STDOUT, 'claimed=' . (int) $processed['claimed'] . "\n");
    fwrite(STDOUT, 'sent=' . (int) $processed['sent'] . "\n");
    fwrite(STDOUT, 'failed=' . (int) $processed['failed'] . "\n");
    fwrite(STDOUT, "accepted_not_inbox_proof=1\n");
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Email queue worker failed.\n");
    exit(1);
}
