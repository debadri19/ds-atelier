<?php

declare(strict_types=1);

function ds_atelier_csrf_token(): string
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        throw new RuntimeException('A session is required before issuing a CSRF token.');
    }

    $token = $_SESSION['_ds_atelier_csrf'] ?? null;
    if (!is_string($token) || strlen($token) < 32) {
        $token = bin2hex(random_bytes(32));
        $_SESSION['_ds_atelier_csrf'] = $token;
    }

    return $token;
}

function ds_atelier_csrf_validate(?string $token): bool
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return false;
    }

    $expected = $_SESSION['_ds_atelier_csrf'] ?? null;
    if (!is_string($expected) || $expected === '' || !is_string($token) || $token === '') {
        return false;
    }

    return hash_equals($expected, $token);
}
