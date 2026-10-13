<?php

declare(strict_types=1);

function ds_atelier_env_path(): string
{
    return dirname(__DIR__) . '/.env';
}

function ds_atelier_load_env(?string $path = null, bool $reload = false): void
{
    static $loadedPath = null;

    $file = $path ?? ds_atelier_env_path();

    if (!$reload && $loadedPath === $file) {
        return;
    }

    $loadedPath = $file;

    if (!is_file($file) || !is_readable($file)) {
        return;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $cut = strpos($line, '=');
        if ($cut === false) {
            continue;
        }

        $name = trim(substr($line, 0, $cut));
        $value = trim(substr($line, $cut + 1));

        if ($name === '' || !str_starts_with($name, 'DS_ATELIER_')) {
            continue;
        }

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"'))
            || (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        if (getenv($name) === false) {
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
        }
    }
}

function ds_atelier_env(string $name, ?string $default = null): ?string
{
    if (!str_starts_with($name, 'DS_ATELIER_')) {
        throw new InvalidArgumentException('Only DS_ATELIER_ environment variables may be read.');
    }

    $value = getenv($name);
    if ($value === false) {
        if (array_key_exists($name, $_ENV) && is_string($_ENV[$name])) {
            return $_ENV[$name];
        }
        return $default;
    }

    return $value;
}
