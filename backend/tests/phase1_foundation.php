<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

require_once dirname(__DIR__) . '/src/bootstrap.php';

$pass = 0;
$fail = 0;
$skip = 0;

function ds_test(string $name, bool $ok): void
{
    global $pass, $fail;
    if ($ok) {
        $pass++;
        fwrite(STDOUT, "PASS  $name\n");
        return;
    }
    $fail++;
    fwrite(STDOUT, "FAIL  $name\n");
}

function ds_skip(string $name, string $reason): void
{
    global $skip;
    $skip++;
    fwrite(STDOUT, "SKIP  $name ($reason)\n");
}

function ds_write_env(string $contents): string
{
    $path = tempnam(sys_get_temp_dir(), 'ds_atelier_env_');
    if ($path === false) {
        throw new RuntimeException('Unable to create temp env file.');
    }
    file_put_contents($path, $contents);
    return $path;
}

function ds_clear_env(): void
{
    $keys = [
        'DS_ATELIER_ENV',
        'DS_ATELIER_DB_HOST',
        'DS_ATELIER_DB_PORT',
        'DS_ATELIER_DB_NAME',
        'DS_ATELIER_DB_USER',
        'DS_ATELIER_DB_PASS',
        'DS_ATELIER_DB_CHARSET',
        'DS_ATELIER_APP_URL',
        'DS_ATELIER_SESSION_NAME',
        'DS_ATELIER_SESSION_SECURE',
        'DS_ATELIER_SESSION_SAMESITE',
        'DS_ATELIER_LOG_PATH',
    ];
    foreach ($keys as $key) {
        putenv($key);
        unset($_ENV[$key]);
    }
}

ds_clear_env();

$missingFailed = false;
try {
    ds_atelier_config(ds_write_env("DS_ATELIER_ENV=development\n"));
} catch (RuntimeException $e) {
    $missingFailed = str_contains($e->getMessage(), 'missing or incomplete');
}
ds_test('missing database credentials fail closed', $missingFailed);

ds_clear_env();
$moonauraBlocked = false;
try {
    ds_atelier_config(ds_write_env(
        "DS_ATELIER_ENV=development\n" .
        "DS_ATELIER_DB_NAME=moonaura\n" .
        "DS_ATELIER_DB_USER=ds_atelier\n" .
        "DS_ATELIER_DB_PASS=test-pass\n"
    ));
} catch (RuntimeException $e) {
    $moonauraBlocked = str_contains($e->getMessage(), 'MoonAura');
}
ds_test('MoonAura database names are rejected', $moonauraBlocked);

ds_clear_env();
$invalidEnv = false;
try {
    ds_atelier_config(ds_write_env(
        "DS_ATELIER_ENV=live\n" .
        "DS_ATELIER_DB_NAME=ds_atelier_dev\n" .
        "DS_ATELIER_DB_USER=ds_atelier\n" .
        "DS_ATELIER_DB_PASS=test-pass\n"
    ));
} catch (RuntimeException $e) {
    $invalidEnv = str_contains($e->getMessage(), 'DS_ATELIER_ENV');
}
ds_test('invalid DS_ATELIER_ENV fails closed', $invalidEnv);

ds_clear_env();
$noneInsecure = false;
try {
    ds_atelier_config(ds_write_env(
        "DS_ATELIER_ENV=development\n" .
        "DS_ATELIER_DB_NAME=ds_atelier_dev\n" .
        "DS_ATELIER_DB_USER=ds_atelier\n" .
        "DS_ATELIER_DB_PASS=test-pass\n" .
        "DS_ATELIER_SESSION_SAMESITE=None\n" .
        "DS_ATELIER_SESSION_SECURE=0\n"
    ));
} catch (RuntimeException $e) {
    $noneInsecure = str_contains($e->getMessage(), 'SameSite=None');
}
ds_test('SameSite=None without Secure fails closed', $noneInsecure);

ds_clear_env();
$valid = ds_atelier_config(ds_write_env(
    "DS_ATELIER_ENV=development\n" .
    "DS_ATELIER_DB_HOST=127.0.0.1\n" .
    "DS_ATELIER_DB_PORT=3306\n" .
    "DS_ATELIER_DB_NAME=ds_atelier_dev\n" .
    "DS_ATELIER_DB_USER=ds_atelier\n" .
    "DS_ATELIER_DB_PASS=test-pass\n" .
    "DS_ATELIER_SESSION_NAME=ds_atelier_session\n" .
    "DS_ATELIER_SESSION_SECURE=0\n" .
    "DS_ATELIER_SESSION_SAMESITE=Lax\n"
));
ds_test('valid development config loads', $valid['db']['name'] === 'ds_atelier_dev');
ds_test('session cookie is HttpOnly', $valid['session']['httponly'] === true);
ds_test('session SameSite defaults to Lax', $valid['session']['samesite'] === 'Lax');
ds_test('development session Secure is off unless requested', $valid['session']['secure'] === false);

$params = ds_atelier_session_cookie_params($valid);
ds_test('session cookie params include HttpOnly', $params['httponly'] === true);
ds_test('session cookie params include SameSite', $params['samesite'] === 'Lax');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$_SESSION = [];
$token = ds_atelier_csrf_token();
ds_test('CSRF token is issued', is_string($token) && strlen($token) >= 32);
ds_test('CSRF rejects missing token', ds_atelier_csrf_validate(null) === false);
ds_test('CSRF rejects empty token', ds_atelier_csrf_validate('') === false);
ds_test('CSRF rejects tampered token', ds_atelier_csrf_validate($token . 'x') === false);
ds_test('CSRF accepts matching token', ds_atelier_csrf_validate($token) === true);

$_SESSION = [];
ds_test('admin guard denies without session admin id', ds_atelier_admin_authenticated() === false);
$denied = ds_atelier_admin_require();
ds_test('admin require is fail-closed', $denied['ok'] === false && $denied['code'] === 403);

$redacted = ds_atelier_redact('DS_ATELIER_DB_PASS=super-secret-value extra');
ds_test('logs redact database passwords', !str_contains($redacted, 'super-secret-value'));

$files = ds_atelier_migration_files(dirname(__DIR__) . '/migrations');
ds_test('migration discovery finds tracker SQL', count($files) >= 1);
ds_test(
    'migration filenames follow YYYYMMDDHHMMSS_name.sql',
    isset($files[0]['filename']) && (bool) preg_match('/^\d{14}_[a-z0-9_]+\.sql$/', $files[0]['filename'])
);

$invalidDir = sys_get_temp_dir() . '/ds_atelier_bad_migrations_' . bin2hex(random_bytes(4));
mkdir($invalidDir, 0700, true);
file_put_contents($invalidDir . '/bad.sql', 'SELECT 1;');
$invalidName = false;
try {
    ds_atelier_migration_files($invalidDir);
} catch (RuntimeException $e) {
    $invalidName = str_contains($e->getMessage(), 'Invalid migration filename');
}
ds_test('invalid migration filenames are rejected', $invalidName);

if (!extension_loaded('pdo_mysql')) {
    ds_skip('PDO connection', 'pdo_mysql extension missing');
} else {
    $dbResult = ds_atelier_try_pdo($valid);
    if ($dbResult['ok']) {
        ds_test('PDO connection to ds_atelier_dev', true);
    } else {
        ds_skip('PDO connection', 'MySQL/ds_atelier_dev is not available');
    }
}

fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
exit($fail === 0 ? 0 : 1);
