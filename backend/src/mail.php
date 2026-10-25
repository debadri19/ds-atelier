<?php

declare(strict_types=1);

const DS_ATELIER_MAIL_TRANSPORT_DISABLED = 'disabled';
const DS_ATELIER_MAIL_TRANSPORT_TEST = 'test';
const DS_ATELIER_MAIL_TRANSPORT_SMTP = 'smtp';
const DS_ATELIER_MAIL_STATUSES = ['pending', 'sending', 'sent', 'failed', 'cancelled'];
const DS_ATELIER_MAIL_MAX_ATTEMPTS = 5;
const DS_ATELIER_MAIL_EVENT_ORDER_PLACED = 'order_placed';
const DS_ATELIER_MAIL_EVENT_FULFILMENT = 'fulfilment_update';
const DS_ATELIER_MAIL_EVENT_CANCELLED = 'order_cancelled';
const DS_ATELIER_MAIL_EVENT_PASSWORD_RESET = 'password_reset';
const DS_ATELIER_MAIL_EVENT_PAYMENT_CAPTURED = 'payment_captured';

function ds_atelier_mail_settings(array $config): array
{
    $env = (string) ($config['env'] ?? 'development');
    $rawTransport = strtolower(trim((string) ds_atelier_env('DS_ATELIER_MAIL_TRANSPORT', '')));
    if ($rawTransport === '') {
        $rawTransport = $env === 'development' ? DS_ATELIER_MAIL_TRANSPORT_TEST : DS_ATELIER_MAIL_TRANSPORT_DISABLED;
    }

    $fromEmail = ds_atelier_normalize_email((string) ds_atelier_env('DS_ATELIER_MAIL_FROM', ''));
    $fromName = trim((string) ds_atelier_env('DS_ATELIER_MAIL_FROM_NAME', 'DS ATELIER'));
    $host = trim((string) ds_atelier_env('DS_ATELIER_MAIL_HOST', ''));
    $port = (int) (ds_atelier_env('DS_ATELIER_MAIL_PORT', '587') ?: '587');
    $encryption = strtolower(trim((string) ds_atelier_env('DS_ATELIER_MAIL_ENCRYPTION', 'tls')));
    $username = (string) (ds_atelier_env('DS_ATELIER_MAIL_USER', '') ?? '');
    $password = ds_atelier_env('DS_ATELIER_MAIL_PASS');
    $timeout = (int) (ds_atelier_env('DS_ATELIER_MAIL_TIMEOUT', '10') ?: '10');
    if ($timeout < 1 || $timeout > 60) {
        $timeout = 10;
    }
    if ($fromName === '' || mb_strlen($fromName) > 120) {
        $fromName = 'DS ATELIER';
    }
    if (!in_array($encryption, ['tls', 'ssl', 'none'], true)) {
        $encryption = 'tls';
    }

    $errors = [];
    if (!in_array($rawTransport, [
        DS_ATELIER_MAIL_TRANSPORT_DISABLED,
        DS_ATELIER_MAIL_TRANSPORT_TEST,
        DS_ATELIER_MAIL_TRANSPORT_SMTP,
    ], true)) {
        $errors[] = 'DS_ATELIER_MAIL_TRANSPORT must be disabled, test, or smtp.';
        $rawTransport = DS_ATELIER_MAIL_TRANSPORT_DISABLED;
    }
    if ($rawTransport === DS_ATELIER_MAIL_TRANSPORT_TEST && $env === 'production') {
        $errors[] = 'Test email transport is not allowed in production.';
        $rawTransport = DS_ATELIER_MAIL_TRANSPORT_DISABLED;
    }
    if ($rawTransport === DS_ATELIER_MAIL_TRANSPORT_SMTP) {
        if ($host === '' || $port < 1 || $port > 65535) {
            $errors[] = 'SMTP host and port are required.';
        }
        if ($fromEmail === '' || !ds_atelier_valid_email($fromEmail)) {
            $errors[] = 'A valid DS_ATELIER_MAIL_FROM address is required for SMTP.';
        }
        if ($encryption === 'none' && $env === 'production') {
            $errors[] = 'Unencrypted SMTP is not allowed in production.';
        }
        if ($password !== null && $password !== '' && $username === '') {
            $errors[] = 'SMTP username is required when a password is set.';
        }
    } elseif ($fromEmail !== '' && !ds_atelier_valid_email($fromEmail)) {
        $errors[] = 'DS_ATELIER_MAIL_FROM must be a valid email address.';
        $fromEmail = '';
    }

    $appUrl = ds_atelier_mail_app_url($config);
    $ready = $errors === [] && (
        $rawTransport === DS_ATELIER_MAIL_TRANSPORT_TEST
        || ($rawTransport === DS_ATELIER_MAIL_TRANSPORT_SMTP && $host !== '' && $fromEmail !== '')
    );

    return [
        'ok' => $errors === [],
        'ready' => $ready,
        'errors' => $errors,
        'transport' => $rawTransport,
        'real' => $rawTransport === DS_ATELIER_MAIL_TRANSPORT_SMTP,
        'from_email' => $fromEmail !== '' ? $fromEmail : 'noreply@localhost',
        'from_name' => $fromName,
        'from_configured' => $fromEmail !== '' && ds_atelier_valid_email($fromEmail),
        'host' => $host,
        'port' => $port,
        'encryption' => $encryption,
        'username' => $username,
        'password' => is_string($password) ? $password : '',
        'timeout' => $timeout,
        'app_url' => $appUrl,
        'max_attempts' => DS_ATELIER_MAIL_MAX_ATTEMPTS,
    ];
}

function ds_atelier_mail_app_url(array $config): string
{
    $raw = rtrim((string) ($config['app_url'] ?? ''), '/');
    if ($raw === '') {
        return '';
    }
    if (filter_var($raw, FILTER_VALIDATE_URL) === false) {
        return '';
    }
    $parts = parse_url($raw);
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    if ($scheme !== 'https' && $scheme !== 'http') {
        return '';
    }
    if ($config['env'] === 'production' && $scheme !== 'https') {
        return '';
    }
    $host = strtolower((string) ($parts['host'] ?? ''));
    if ($host === '') {
        return '';
    }
    return $raw;
}

function ds_atelier_mail_public_url(array $config, string $path, array $query = [], string $hash = ''): string
{
    $base = ds_atelier_mail_app_url($config);
    if ($base === '') {
        return '';
    }
    $path = '/' . ltrim($path, '/');
    $url = $base . $path;
    if ($query !== []) {
        $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }
    if ($hash !== '') {
        $url .= '#' . ltrim($hash, '#');
    }
    return $url;
}

function ds_atelier_mail_status_summary(array $config): array
{
    $mail = ds_atelier_mail_settings($config);
    return [
        'transport' => $mail['transport'],
        'ready' => $mail['ready'] ? 1 : 0,
        'from_configured' => $mail['from_configured'] ? 1 : 0,
        'smtp_configured' => ($mail['transport'] === DS_ATELIER_MAIL_TRANSPORT_SMTP && $mail['host'] !== '') ? 1 : 0,
        'real' => $mail['real'] ? 1 : 0,
        'app_url_configured' => $mail['app_url'] !== '' ? 1 : 0,
        'ok' => $mail['ok'] ? 1 : 0,
    ];
}

function ds_atelier_mail_test_inbox(?array $message = null, bool $reset = false): array
{
    static $inbox = [];
    if ($reset) {
        $inbox = [];
        return $inbox;
    }
    if ($message !== null) {
        $inbox[] = $message;
    }
    return $inbox;
}

function ds_atelier_mail_test_store_path(array $config): string
{
    $dir = (string) ($config['paths']['private'] ?? dirname(__DIR__) . '/storage/private');
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    return $dir . '/mail-test.jsonl';
}

function ds_atelier_mail_redact_error(string $text): string
{
    $text = ds_atelier_redact($text);
    $text = preg_replace('/[a-f0-9]{64}/i', '[redacted-token]', $text) ?? $text;
    $text = preg_replace('~https?://[^\s]+token=[^\s&]+~i', '[redacted-url]', $text) ?? $text;
    $text = preg_replace('/\b(?:PASS|password|secret|token)=[^\s]+/i', '[redacted]', $text) ?? $text;
    return mb_substr($text, 0, 240);
}

function ds_atelier_mail_backoff_seconds(int $attempts): int
{
    if ($attempts < 1) {
        $attempts = 1;
    }
    $seconds = 60 * (5 ** min($attempts - 1, 4));
    return min($seconds, 21600);
}

function ds_atelier_mail_is_retryable(string $error, int $smtpCode = 0): bool
{
    if ($smtpCode >= 500) {
        return false;
    }
    if ($smtpCode >= 400) {
        return true;
    }
    $needle = strtolower($error);
    foreach (['timeout', 'timed out', 'connection', 'temporarily', '4.'] as $part) {
        if (str_contains($needle, $part)) {
            return true;
        }
    }
    return false;
}

function ds_atelier_mail_build_mime(array $mail, array $message): string
{
    $boundary = 'ds=' . bin2hex(random_bytes(12));
    $fromName = addcslashes((string) $mail['from_name'], '"\\');
    $headers = [
        'From: "' . $fromName . '" <' . $mail['from_email'] . '>',
        'To: ' . $message['to'],
        'Subject: ' . ds_atelier_mail_encode_subject((string) $message['subject']),
        'MIME-Version: 1.0',
        'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000',
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@ds-atelier>',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'X-Mailer: DS-ATELIER',
    ];
    $text = ds_atelier_mail_crlf((string) $message['text']);
    $html = ds_atelier_mail_crlf((string) $message['html']);
    $body = '--' . $boundary . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n"
        . $text . "\r\n"
        . '--' . $boundary . "\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n"
        . $html . "\r\n"
        . '--' . $boundary . "--\r\n";
    return implode("\r\n", $headers) . "\r\n\r\n" . $body;
}

function ds_atelier_mail_encode_subject(string $subject): string
{
    $subject = trim(preg_replace('/[\r\n]+/', ' ', $subject) ?? '');
    if ($subject === '') {
        return 'DS ATELIER';
    }
    if (preg_match('/^[\x20-\x7E]+$/', $subject) === 1) {
        return $subject;
    }
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}

function ds_atelier_mail_crlf(string $value): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = str_replace("\n", "\r\n", $value);
    $value = preg_replace('/^\./m', '..', $value) ?? $value;
    return $value;
}

function ds_atelier_mail_send(array $config, array $message): array
{
    $mail = ds_atelier_mail_settings($config);
    $to = ds_atelier_normalize_email((string) ($message['to'] ?? ''));
    if (!ds_atelier_valid_email($to)) {
        return ['ok' => false, 'accepted' => false, 'real' => false, 'retryable' => false, 'error' => 'Invalid recipient.'];
    }
    if ($mail['ok'] !== true || $mail['ready'] !== true) {
        $error = $mail['errors'][0] ?? 'Email transport is not configured.';
        return ['ok' => false, 'accepted' => false, 'real' => false, 'retryable' => false, 'error' => $error];
    }
    $message['to'] = $to;
    $message['subject'] = (string) ($message['subject'] ?? 'DS ATELIER');
    $message['text'] = (string) ($message['text'] ?? '');
    $message['html'] = (string) ($message['html'] ?? '');
    if ($mail['transport'] === DS_ATELIER_MAIL_TRANSPORT_TEST) {
        return ds_atelier_mail_send_test($config, $mail, $message);
    }
    if ($mail['transport'] === DS_ATELIER_MAIL_TRANSPORT_SMTP) {
        return ds_atelier_mail_send_smtp($mail, $message);
    }
    return ['ok' => false, 'accepted' => false, 'real' => false, 'retryable' => false, 'error' => 'Email transport is disabled.'];
}

function ds_atelier_mail_send_test(array $config, array $mail, array $message): array
{
    $to = (string) $message['to'];
    if (str_ends_with($to, '@fail.example.test') || $to === 'fail@example.test') {
        return [
            'ok' => false,
            'accepted' => false,
            'real' => false,
            'retryable' => true,
            'error' => 'Test transport rejected the recipient.',
        ];
    }
    $record = [
        'to' => $to,
        'from' => $mail['from_email'],
        'subject' => $message['subject'],
        'text' => $message['text'],
        'html' => $message['html'],
        'real' => false,
        'accepted_at' => gmdate('c'),
    ];
    ds_atelier_mail_test_inbox($record);
    $line = json_encode([
        'to' => $to,
        'from' => $mail['from_email'],
        'subject' => $message['subject'],
        'accepted_at' => $record['accepted_at'],
        'real' => false,
    ], JSON_UNESCAPED_SLASHES);
    if (is_string($line)) {
        file_put_contents(ds_atelier_mail_test_store_path($config), $line . "\n", FILE_APPEND | LOCK_EX);
    }
    return ['ok' => true, 'accepted' => true, 'real' => false, 'retryable' => false, 'error' => null];
}

function ds_atelier_mail_smtp_read($fp, int $timeout): array
{
    stream_set_timeout($fp, $timeout);
    $data = '';
    $code = 0;
    while (!feof($fp)) {
        $line = fgets($fp, 2048);
        if ($line === false) {
            break;
        }
        $data .= $line;
        if (preg_match('/^(\d{3})([\s-])/', $line, $m) === 1) {
            $code = (int) $m[1];
            if ($m[2] === ' ') {
                break;
            }
        }
    }
    return ['code' => $code, 'data' => $data];
}

function ds_atelier_mail_smtp_cmd($fp, string $command, int $timeout, array $expect): array
{
    if ($command !== '') {
        fwrite($fp, $command . "\r\n");
    }
    $read = ds_atelier_mail_smtp_read($fp, $timeout);
    if (!in_array($read['code'], $expect, true)) {
        return [
            'ok' => false,
            'code' => $read['code'],
            'error' => 'SMTP ' . $read['code'],
        ];
    }
    return ['ok' => true, 'code' => $read['code'], 'error' => null];
}

function ds_atelier_mail_send_smtp(array $mail, array $message): array
{
    $timeout = (int) $mail['timeout'];
    $host = (string) $mail['host'];
    $port = (int) $mail['port'];
    $encryption = (string) $mail['encryption'];
    $remote = ($encryption === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $errno = 0;
    $errstr = '';
    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'allow_self_signed' => false,
            'crypto_method' => STREAM_CRYPTO_METHOD_TLS_CLIENT,
        ],
    ]);
    $fp = @stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
    if (!is_resource($fp)) {
        return [
            'ok' => false,
            'accepted' => false,
            'real' => true,
            'retryable' => true,
            'error' => 'SMTP connection failed.',
        ];
    }

    try {
        $hello = ds_atelier_mail_smtp_cmd($fp, '', $timeout, [220]);
        if ($hello['ok'] !== true) {
            return ds_atelier_mail_smtp_fail($hello, true);
        }
        $ehlo = ds_atelier_mail_smtp_cmd($fp, 'EHLO ds-atelier', $timeout, [250]);
        if ($ehlo['ok'] !== true) {
            return ds_atelier_mail_smtp_fail($ehlo, true);
        }
        if ($encryption === 'tls') {
            $start = ds_atelier_mail_smtp_cmd($fp, 'STARTTLS', $timeout, [220]);
            if ($start['ok'] !== true) {
                return ds_atelier_mail_smtp_fail($start, true);
            }
            $crypto = @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if ($crypto !== true) {
                return [
                    'ok' => false,
                    'accepted' => false,
                    'real' => true,
                    'retryable' => true,
                    'error' => 'SMTP TLS negotiation failed.',
                ];
            }
            $ehlo = ds_atelier_mail_smtp_cmd($fp, 'EHLO ds-atelier', $timeout, [250]);
            if ($ehlo['ok'] !== true) {
                return ds_atelier_mail_smtp_fail($ehlo, true);
            }
        }
        if ($mail['username'] !== '') {
            $auth = ds_atelier_mail_smtp_cmd($fp, 'AUTH LOGIN', $timeout, [334]);
            if ($auth['ok'] !== true) {
                return ds_atelier_mail_smtp_fail($auth, false);
            }
            $user = ds_atelier_mail_smtp_cmd($fp, base64_encode((string) $mail['username']), $timeout, [334]);
            if ($user['ok'] !== true) {
                return ds_atelier_mail_smtp_fail($user, false);
            }
            $pass = ds_atelier_mail_smtp_cmd($fp, base64_encode((string) $mail['password']), $timeout, [235]);
            if ($pass['ok'] !== true) {
                return ds_atelier_mail_smtp_fail($pass, false);
            }
        }
        $from = ds_atelier_mail_smtp_cmd($fp, 'MAIL FROM:<' . $mail['from_email'] . '>', $timeout, [250]);
        if ($from['ok'] !== true) {
            return ds_atelier_mail_smtp_fail($from, ds_atelier_mail_is_retryable('', (int) $from['code']));
        }
        $rcpt = ds_atelier_mail_smtp_cmd($fp, 'RCPT TO:<' . $message['to'] . '>', $timeout, [250, 251]);
        if ($rcpt['ok'] !== true) {
            return ds_atelier_mail_smtp_fail($rcpt, ds_atelier_mail_is_retryable('', (int) $rcpt['code']));
        }
        $data = ds_atelier_mail_smtp_cmd($fp, 'DATA', $timeout, [354]);
        if ($data['ok'] !== true) {
            return ds_atelier_mail_smtp_fail($data, true);
        }
        $mime = ds_atelier_mail_build_mime($mail, $message);
        fwrite($fp, $mime . "\r\n.\r\n");
        $done = ds_atelier_mail_smtp_cmd($fp, '', $timeout, [250]);
        ds_atelier_mail_smtp_cmd($fp, 'QUIT', $timeout, [221, 250]);
        if ($done['ok'] !== true) {
            return ds_atelier_mail_smtp_fail($done, ds_atelier_mail_is_retryable('', (int) $done['code']));
        }
        return ['ok' => true, 'accepted' => true, 'real' => true, 'retryable' => false, 'error' => null];
    } finally {
        fclose($fp);
    }
}

function ds_atelier_mail_smtp_fail(array $result, bool $retryable): array
{
    return [
        'ok' => false,
        'accepted' => false,
        'real' => true,
        'retryable' => $retryable,
        'error' => 'SMTP delivery was not accepted.',
        'smtp_code' => (int) ($result['code'] ?? 0),
    ];
}
