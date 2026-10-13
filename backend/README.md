# DS ATELIER Backend Foundation

Phase 1 scaffold plus Phase 2 customer authentication. Storefront `.html` routes are unchanged. Catalog, cart, checkout, payments, Newsletter, Meta Pixel, and Dashboard authentication are not implemented.

## Layout

- `backend/.env.example` — required `DS_ATELIER_*` variables, no secrets
- `backend/.env` — local secrets; never commit
- `backend/src/` — config, PDO, session, CSRF, admin guard, logging, migrations
- `backend/migrations/` — DS-specific SQL, named `YYYYMMDDHHMMSS_description.sql`
- `backend/storage/logs/` — application logs
- `backend/storage/private/` — non-public files
- `backend/bin/status.php` — config/status check (no credentials printed)
- `backend/tests/phase1_foundation.php` — helper tests
- `backend/tests/phase2_customer_auth.php` — live `ds_atelier_dev` register/login/CSRF/reset tests

## Local setup

Copy `backend/.env.example` to `backend/.env` and set a dedicated development database named `ds_atelier_dev`. Do not use a MoonAura database.

PHP 8.2+ with PDO MySQL is required. MySQL/MariaDB is required only for a live connection test.

```bash
php -v
php backend/tests/phase1_foundation.php
php backend/bin/status.php --config-only
php backend/bin/migrate.php
php backend/tests/phase2_customer_auth.php
```

`status.php` without `--config-only` attempts PDO. If MySQL is absent it reports `database=unavailable` and exits 2. It does not print passwords.

## Security defaults

- Environment-only credentials under `DS_ATELIER_*`
- Missing/invalid config fails closed
- Session cookies: HttpOnly, SameSite=Lax, Secure in production
- CSRF helper uses `hash_equals`
- Dashboard/admin guard denies until a later phase sets `_ds_atelier_admin_id`
- Logs redact password/secret values
- No public diagnostic endpoint

## Migrations

Apply against dedicated `ds_atelier_dev` only:

```bash
php backend/bin/migrate.php
```

Filenames must match `YYYYMMDDHHMMSS_name.sql`. MySQL/MariaDB implicit-commits DDL, so the applier does not wrap `CREATE TABLE` in a transaction.

## Customer authentication

Same-origin JSON handlers live under `backend/public/customer/`. Passwords use `password_hash` / `password_verify`. Reset tokens are stored as SHA-256, expire in one hour, and are single-use. Public forgot-password JSON never includes the raw token.

SMTP is not configured. Forgot-password does not send email and reports `email_sent: false`.

## Out of scope

Catalog, variants, artwork, cart, wishlist, checkout, orders, tax, payments, Newsletter, Meta Pixel/CAPI, and Dashboard authentication remain later phases.
