# DS ATELIER Backend Foundation

Phase 1 scaffold, Phase 2 customer authentication, Phase 3 read-only product catalog, Phase 4 persistent cart/wishlist, Phase 5 checkout/order creation, Phase 6A customer order history, Phase 6B inventory reservation, Phase 6C fulfilment/invoices, and Phase 6D transactional email queue. Storefront `.html` routes are unchanged. Payments, Newsletter, Meta Pixel, and Dashboard authentication are not implemented.

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
- `backend/tests/phase6a_order_management.php` — owned order list/detail, guest isolation, pending-payment presentation, and HTTP tests
- `backend/tests/phase6b_inventory.php` — reservation, available-to-sell, no oversell, expiry, commit/release, made-to-order, and fail-closed admin tests
- `backend/tests/phase6c_fulfilment_invoices.php` — fulfilment transitions, fail-closed admin writes, invoice uniqueness, ownership, and download headers
- `backend/tests/phase6d_email.php` — mail config fail-closed, test vs SMTP transport, templates, outbox idempotency, and worker claim behaviour
- `backend/bin/send-email-queue.php` — manual outbox worker (`--status` does not send)
- `backend/public/catalog/` — read-only products, product detail, and categories JSON
- `backend/public/cart/` — CSRF-protected cart JSON
- `backend/public/wishlist/` — CSRF-protected wishlist JSON
- `backend/public/checkout/` — CSRF-protected quote/place and GET order JSON
- `backend/public/customer/orders.php` — owned customer/guest order list JSON
- `backend/public/customer/invoice.php` — owned invoice JSON
- `backend/public/customer/invoice-download.php` — owned HTML invoice attachment
- `backend/public/admin/fulfilment.php` — fail-closed admin fulfilment POST
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
php backend/tests/phase6a_order_management.php
php backend/tests/phase6b_inventory.php
php backend/tests/phase6c_fulfilment_invoices.php
php backend/tests/phase6d_email.php
php backend/bin/send-email-queue.php --status
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

Unpublished products and inactive variants are excluded. Variant SKU, price, MRP, and stock are returned for storefront selection. After Phase 6B, `stock` is available-to-sell (on-hand minus reserved minus committed). Admin CRUD is not implemented.

Development fixtures copy the existing mock catalog from `js/catalog.js`. `php backend/bin/seed-catalog.php` inserts missing rows only and refuses to run outside development/`ds_atelier_dev`.

## Customer authentication

Same-origin JSON handlers live under `backend/public/customer/`. Passwords use `password_hash` / `password_verify`. Reset tokens are stored as SHA-256, expire in one hour, and are single-use. Public forgot-password JSON never includes the raw token.

Forgot-password still reports `email_sent: false` on the public JSON. A reset message is queued when the outbox table and `DS_ATELIER_APP_URL` are available; it is not sent during the HTTP request. Public JSON never includes the raw token.

## Transactional email

Copy placeholders from `backend/.env.example`. Do not commit `backend/.env`.

- `DS_ATELIER_MAIL_TRANSPORT`: `disabled`, `test`, or `smtp`. Development defaults to `test`. Production rejects `test`.
- SMTP: `DS_ATELIER_MAIL_HOST`, `DS_ATELIER_MAIL_PORT`, `DS_ATELIER_MAIL_ENCRYPTION` (`tls`/`ssl`/`none`; `none` blocked in production), `DS_ATELIER_MAIL_USER`, `DS_ATELIER_MAIL_PASS`, `DS_ATELIER_MAIL_FROM`, `DS_ATELIER_MAIL_FROM_NAME`, `DS_ATELIER_MAIL_TIMEOUT`
- `php backend/bin/status.php --config-only` and `php backend/bin/send-email-queue.php --status` report readiness without printing credentials or sending
- Process the outbox: `php backend/bin/send-email-queue.php` (`--limit=20`). No scheduler is configured; do not claim background delivery is active
- Test transport never claims a real send. SMTP acceptance is not inbox proof. PHP `mail()` is not used and no Composer mailer is installed

## Cart and wishlist

Same-origin JSON handlers live under `backend/public/cart/` and `backend/public/wishlist/`. Guests are identified by HttpOnly cookie `ds_atelier_guest`; the raw token is never stored. Catalog variant price and available-to-sell are the source of truth. Quantity is capped at 20. Guest carts and wishlists merge into the customer account on login and register. Artwork files are not stored in this phase.

## Checkout and orders

Same-origin JSON handlers live under `backend/public/checkout/`. Quote and place require CSRF. Money is integer paise. Development demo shipping is ₹79, free at or above ₹999, and blocked in production. Tax policy `unconfigured` adds ₹0 with a notice and is blocked in production. `WELCOME10` is a development demo coupon. Orders are created as `pending_payment` / `pending`. Clients cannot set payment status or customer ownership. Idempotency keys are unique. The cart is cleared only after a successful place. Phase 6B reserves in-stock units at place; `product_variants.stock` remains on-hand. Phase 6A lists owned orders for the current guest cookie or customer session. Phase 6C adds owned fulfilment/invoice fields and HTML invoice download. Admin fulfilment POST is fail-closed until `_ds_atelier_admin_id` exists. Phase 6D queues order/fulfilment/reset email in the same transaction; a worker must be run to attempt delivery.

## Out of scope

Artwork file storage, payment capture, production tax invoices, Newsletter, Meta Pixel/CAPI, Dashboard authentication, admin order management, admin inventory CRUD, and admin catalog CRUD remain later phases. Real SMTP delivery is not verified in this environment.
