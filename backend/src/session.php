<?php

declare(strict_types=1);

function ds_atelier_session_cookie_params(array $config): array
{
    return [
        'lifetime' => 0,
        'path' => '/',
        'secure' => (bool) $config['session']['secure'],
        'httponly' => true,
        'samesite' => $config['session']['samesite'],
    ];
}

function ds_atelier_session_start(array $config): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name($config['session']['name']);
    session_set_cookie_params(ds_atelier_session_cookie_params($config));
    session_start();
}

function ds_atelier_session_regenerate(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
}
