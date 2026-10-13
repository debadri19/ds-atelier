<?php

declare(strict_types=1);

function ds_atelier_redact(string $text): string
{
    $patterns = [
        '/(DS_ATELIER_[A-Z0-9_]*(?:PASS|PASSWORD|SECRET|TOKEN|KEY)[A-Z0-9_]*)\s*=\s*\S+/i',
        '/("?(?:pass|password|secret|token|api_key|authorization)"?\s*[=:]\s*)\S+/i',
    ];

    $redacted = preg_replace($patterns, '$1 [redacted]', $text);
    return is_string($redacted) ? $redacted : '[unloggable]';
}

function ds_atelier_log(string $level, string $message, array $config): void
{
    $path = $config['paths']['logs'] ?? '';
    if ($path === '') {
        return;
    }

    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }

    $line = sprintf(
        "[%s] %s %s\n",
        gmdate('Y-m-d\TH:i:s\Z'),
        strtoupper($level),
        ds_atelier_redact($message)
    );

    file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
}
