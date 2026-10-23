# DS ATELIER Backend Foundation

Phase 1 scaffold, Phase 2 customer authentication, Phase 3 read-only product catalog, Phase 4 persistent cart/wishlist, and Phase 5 checkout/order creation. Storefront `.html` routes are unchanged. Payments, Newsletter, Meta Pixel, and Dashboard authentication are not implemented.

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
- `backend/tests/phase3_catalog.php` — catalog schema, filters, variants, and HTTP endpoint tests
- `backend/tests/phase4_cart.php` — guest/auth cart and wishlist, CSRF, merge, stock, isolation, and HTTP tests
- `backend/tests/phase5_checkout.php` — quote/place, pending payment, isolation, idempotency, CSRF, and HTTP tests
- `backend/public/catalog/` — read-only products, product detail, and categories JSON
- `backend/public/cart/` — CSRF-protected cart JSON
- `backend/public/wishlist/` — CSRF-protected wishlist JSON
- `backend/public/checkout/` — CSRF-protected quote/place and GET order JSON
- `backend/fixtures/catalog-data.php` — development-only mock catalog fixtures
- `backend/bin/seed-catalog.php` — insert fixtures into `ds_atelier_dev` without overwriting existing products

## Local setup

Copy `backend/.env.example` to `backend/.env` and set a dedicated development database named `ds_atelier_dev`. Do not use a MoonAura database.

PHP 8.2+ with PDO MySQL is required. MySQL/MariaDB is required only for a live connection test.

```bash
php -v
php backend/tests/phase1_foundation.php
php backend/bin/status.php --config-only
php backend/bin/migrate.php
php backend/bin/seed-catalog.php
php backend/tests/phase2_customer_auth.php
php backend/tests/phase3_catalog.php
php backend/tests/phase4_cart.php
php backend/tests/phase5_checkout.php
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

## Product catalog

Read-only same-origin JSON handlers live under `backend/public/catalog/`:

- `products.php` — listing with search, category/size/colour filters, price range, sorting, and pagination
- `product.php?id=<slug>` — product detail with active variants
- `categories.php` — category list

Unpublished products and inactive variants are excluded. Variant SKU, price, MRP, and stock are returned for storefront selection. Admin CRUD is not implemented.

Development fixtures copy the existing mock catalog from `js/catalog.js`. `php backend/bin/seed-catalog.php` inserts missing rows only and refuses to run outside development/`ds_atelier_dev`.

## Customer authentication

Same-origin JSON handlers live under `backend/public/customer/`. Passwords use `password_hash` / `password_verify`. Reset tokens are stored as SHA-256, expire in one hour, and are single-use. Public forgot-password JSON never includes the raw token.

SMTP is not configured. Forgot-password does not send email and reports `email_sent: false`.

## Cart and wishlist

Same-origin JSON handlers live under `backend/public/cart/` and `backend/public/wishlist/`. Guests are identified by HttpOnly cookie `ds_atelier_guest`; the raw token is never stored. Catalog variant price and stock are the source of truth. Quantity is capped at 20. Guest carts and wishlists merge into the customer account on login and register. Artwork files are not stored in this phase.

## Checkout and orders

Same-origin JSON handlers live under `backend/public/checkout/`. Quote and place require CSRF. Money is integer paise. Development demo shipping is ₹79, free at or above ₹999, and blocked in production. Tax policy `unconfigured` adds ₹0 with a notice and is blocked in production. `WELCOME10` is a development demo coupon. Orders are created as `pending_payment` / `pending`. Clients cannot set payment status or customer ownership. Idempotency keys are unique. The cart is cleared only after a successful place. Inventory is not decremented.

## Out of scope

Artwork file storage, payment capture, invoices/email, Newsletter, Meta Pixel/CAPI, Dashboard authentication, and admin catalog CRUD remain later phases.
