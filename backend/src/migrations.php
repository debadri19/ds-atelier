<?php

declare(strict_types=1);

function ds_atelier_migration_files(string $directory): array
{
    if (!is_dir($directory)) {
        return [];
    }

    $files = glob($directory . '/*.sql') ?: [];
    $files = array_values(array_filter($files, 'is_file'));
    sort($files, SORT_STRING);

    $out = [];
    foreach ($files as $path) {
        $name = basename($path);
        if (!preg_match('/^\d{14}_[a-z0-9_]+\.sql$/', $name)) {
            throw new RuntimeException('Invalid migration filename: ' . $name);
        }
        $out[] = [
            'filename' => $name,
            'path' => $path,
            'checksum' => hash_file('sha256', $path) ?: '',
        ];
    }

    return $out;
}

function ds_atelier_migration_tracking_sql(): string
{
    return <<<SQL
CREATE TABLE IF NOT EXISTS ds_atelier_schema_migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    checksum CHAR(64) NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL;
}

function ds_atelier_applied_migrations(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT filename, checksum, applied_at FROM ds_atelier_schema_migrations ORDER BY filename ASC');
    if ($stmt === false) {
        return [];
    }
    return $stmt->fetchAll();
}

function ds_atelier_ensure_migration_table(PDO $pdo): void
{
    $pdo->exec(ds_atelier_migration_tracking_sql());
}

function ds_atelier_apply_migrations(PDO $pdo, string $directory): array
{
    ds_atelier_ensure_migration_table($pdo);

    $appliedRows = ds_atelier_applied_migrations($pdo);
    $applied = [];
    foreach ($appliedRows as $row) {
        $applied[$row['filename']] = $row['checksum'];
    }

    $appliedNow = [];
    $skipped = [];

    foreach (ds_atelier_migration_files($directory) as $file) {
        $name = $file['filename'];
        if (isset($applied[$name])) {
            if ($applied[$name] !== $file['checksum']) {
                throw new RuntimeException('Migration checksum mismatch: ' . $name);
            }
            $skipped[] = $name;
            continue;
        }

        $sql = file_get_contents($file['path']);
        if (!is_string($sql) || trim($sql) === '') {
            throw new RuntimeException('Empty migration: ' . $name);
        }

        try {
            $pdo->exec($sql);
            $stmt = $pdo->prepare(
                'INSERT INTO ds_atelier_schema_migrations (filename, checksum) VALUES (?, ?)'
            );
            $stmt->execute([$name, $file['checksum']]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $appliedNow[] = $name;
    }

    return [
        'applied' => $appliedNow,
        'skipped' => $skipped,
    ];
}
