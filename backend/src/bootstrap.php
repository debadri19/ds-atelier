<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/log.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/admin-guard.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/error.php';
require_once __DIR__ . '/migrations.php';
require_once __DIR__ . '/customer-auth.php';
require_once __DIR__ . '/http.php';

function ds_atelier_bootstrap(?string $envFile = null): array
{
    $config = ds_atelier_config($envFile);
    ds_atelier_register_error_handlers($config);
    return $config;
}
