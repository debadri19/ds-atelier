<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

function ds_atelier_config(?string $envFile = null): array
{
    ds_atelier_load_env($envFile);

    $env = strtolower((string) ds_atelier_env('DS_ATELIER_ENV', 'development'));
    if (!in_array($env, ['development', 'staging', 'production'], true)) {
        throw new RuntimeException('DS_ATELIER_ENV must be development, staging, or production.');
    }

    $dbName = trim((string) ds_atelier_env('DS_ATELIER_DB_NAME', ''));
    $dbUser = trim((string) ds_atelier_env('DS_ATELIER_DB_USER', ''));
    $dbPass = ds_atelier_env('DS_ATELIER_DB_PASS');

    if ($dbName === '' || $dbUser === '' || $dbPass === null || $dbPass === '') {
        throw new RuntimeException('Database configuration is missing or incomplete.');
    }

    if (preg_match('/moonaura/i', $dbName) === 1) {
        throw new RuntimeException('MoonAura databases are not allowed for DS ATELIER.');
    }

    $sameSite = ds_atelier_env('DS_ATELIER_SESSION_SAMESITE', 'Lax') ?? 'Lax';
    if (!in_array($sameSite, ['Lax', 'Strict', 'None'], true)) {
        throw new RuntimeException('DS_ATELIER_SESSION_SAMESITE must be Lax, Strict, or None.');
    }

    $secureRaw = ds_atelier_env('DS_ATELIER_SESSION_SECURE', $env === 'production' ? '1' : '0');
    $secure = $secureRaw === '1' || strtolower((string) $secureRaw) === 'true';
    if ($sameSite === 'None' && !$secure) {
        throw new RuntimeException('SameSite=None requires a Secure session cookie.');
    }

    $logPath = ds_atelier_env('DS_ATELIER_LOG_PATH');
    if ($logPath === null || $logPath === '') {
        $logPath = dirname(__DIR__) . '/storage/logs/app.log';
    }

    return [
        'env' => $env,
        'app_url' => rtrim((string) ds_atelier_env('DS_ATELIER_APP_URL', ''), '/'),
        'db' => [
            'host' => ds_atelier_env('DS_ATELIER_DB_HOST', '127.0.0.1') ?: '127.0.0.1',
            'port' => (int) (ds_atelier_env('DS_ATELIER_DB_PORT', '3306') ?: '3306'),
            'name' => $dbName,
            'user' => $dbUser,
            'pass' => $dbPass,
            'charset' => ds_atelier_env('DS_ATELIER_DB_CHARSET', 'utf8mb4') ?: 'utf8mb4',
        ],
        'session' => [
            'name' => ds_atelier_env('DS_ATELIER_SESSION_NAME', 'ds_atelier_session') ?: 'ds_atelier_session',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $sameSite,
        ],
        'paths' => [
            'root' => dirname(__DIR__),
            'migrations' => dirname(__DIR__) . '/migrations',
            'logs' => $logPath,
            'private' => dirname(__DIR__) . '/storage/private',
        ],
    ];
}
