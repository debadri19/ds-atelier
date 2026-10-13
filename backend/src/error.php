<?php

declare(strict_types=1);

function ds_atelier_register_error_handlers(array $config): void
{
    ini_set('display_errors', '0');
    error_reporting(E_ALL);

    set_error_handler(static function (int $severity, string $message, string $file, int $line) use ($config): bool {
        if ((error_reporting() & $severity) === 0) {
            return false;
        }
        ds_atelier_log('error', $message . ' in ' . basename($file) . ':' . $line, $config);
        return true;
    });

    set_exception_handler(static function (Throwable $e) use ($config): void {
        ds_atelier_log('error', $e::class . ': ' . $e->getMessage(), $config);
        if (PHP_SAPI !== 'cli' && !headers_sent()) {
            ds_atelier_json(['ok' => false, 'error' => 'Something went wrong. Please try again later.'], 500);
        }
    });
}
