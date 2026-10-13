<?php

declare(strict_types=1);

function ds_atelier_pdo(array $config): PDO
{
    $db = $config['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'],
        $db['port'],
        $db['name'],
        $db['charset']
    );

    return new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function ds_atelier_try_pdo(array $config): array
{
    try {
        $pdo = ds_atelier_pdo($config);
        $pdo->query('SELECT 1');
        return ['ok' => true, 'pdo' => $pdo, 'error' => null];
    } catch (Throwable $e) {
        ds_atelier_log('error', 'Database connection failed: ' . $e->getMessage(), $config);
        return ['ok' => false, 'pdo' => null, 'error' => 'Database unavailable.'];
    }
}
