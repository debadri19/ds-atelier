<?php

declare(strict_types=1);

function ds_atelier_admin_authenticated(): bool
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return false;
    }

    $adminId = $_SESSION['_ds_atelier_admin_id'] ?? null;
    if (is_string($adminId) && ctype_digit($adminId)) {
        $adminId = (int) $adminId;
    }
    return is_int($adminId) && $adminId > 0;
}

function ds_atelier_admin_deny(): array
{
    return [
        'ok' => false,
        'error' => 'Forbidden.',
        'code' => 403,
    ];
}

function ds_atelier_admin_require(): array
{
    if (!ds_atelier_admin_authenticated()) {
        return ds_atelier_admin_deny();
    }

    return ['ok' => true, 'code' => 200];
}
