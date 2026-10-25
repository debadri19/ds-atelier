# Backend Integration — DS ATELIER

This repository remains a **standalone frontend** except for Phase 2 customer authentication, Phase 3 read-only catalog APIs, Phase 4 persistent cart/wishlist, Phase 5 checkout/order creation, Phase 6A customer order history, Phase 6B inventory reservation, Phase 6C fulfilment/invoices, and Phase 6D transactional email. Phase 1 added a DS-specific PHP foundation under `backend/`. Payments are **not** connected. Dashboard authentication is still a frontend demo.

Do not treat `js/main.js` mock products as production database data.

---

## Principle

Keep approved DS ATELIER frontend design.

Reuse existing backend behaviour where it already exists:

- product queries
- cart
- checkout
- payment
- authentication
- sessions
- orders
- tax
- wishlist
- admin

Do not restyle the storefront to match any previous MoonAura UI while wiring PHP.

---

## Current frontend state

| Area | Now |
|---|---|
| Catalog | Shop, Home, and Product read `backend/public/catalog/*.php`. `js/catalog.js` keeps mock products for development/demo fallback only. |
| Cart | `cart.html` plus `js/commerce.js` against `backend/public/cart/*.php`; guest cookie or customer session |
| Checkout | `checkout.html` plus `js/checkout.js` against `backend/public/checkout/*.php`; pending-payment orders only |
| Auth / account | Customer `auth.html` uses PHP/JSON against `ds_atelier_dev`. `account.html` profile/addresses remain a frontend demo; order history is Phase 6A. Password-reset email is not sent. |
| Wishlist | `wishlist.html` plus `js/commerce.js` against `backend/public/wishlist/*.php` |
| Orders | Phase 5 pending-payment rows in `ds_atelier_dev`; Phase 6A owned list/detail on Account and order confirmation; Phase 6B reserves in-stock units at place; Phase 6C adds owned fulfilment/invoice fields |
| Payments | Badge labels in footer; checkout does not capture payment |
| Custom options | Frontend configuration on Product page only |
| Dashboard | Frontend demo modules; Orders/Customers/Discounts/Settings are placeholders |

---

## Future integration points

### Product listing

Replace mock grid with PHP product queries. Keep `.product-card`. CTA is View Product, linking to product details. Do not add configurable items to cart from the listing.

### Product details

Server-rendered product with variants. Collect:

- print type
- fabric/color
- size
- quantity
- design upload
- print position
- special instructions

Then Add to Cart / Buy Now against the real cart API.

### Cart

Configured PDP lines (print type, colour, size, quantity, print position, artwork id/name) post to `backend/public/cart/add.php`. Catalog prices and stock are the source of truth. Artwork files are not stored until a later checkout phase.

### Checkout

`checkout.html` posts quote/place to `backend/public/checkout/{quote,place}.php`. Orders are `pending_payment` / `pending`. Shipping and tax policies fail closed in production when unconfigured. Payment capture is not implemented. Frontend must follow DS ATELIER pages, not a legacy skin.

### Authentication / account

Customer `auth.html` posts to `backend/public/customer/*.php`. Keep Dashboard `dashboard/auth.html` separate. Do not treat the `account.html` demo session store as production profile data. Order history reads owned rows from `backend/public/customer/orders.php`.

### Wishlist

`wishlist.html` reads `backend/public/wishlist/get.php`. Toggle/add/remove are CSRF-protected. Unpublished products are excluded.

### Order tracking

Account order history consumes owned Phase 5 records plus Phase 6C fulfilment/invoice fields. Admin fulfilment writes remain fail-closed until `_ds_atelier_admin_id` exists.

### Custom product options

Store print configuration and uploaded files with the line item. Exact schema is backend work and is not defined in this frontend repo.

---

## What not to do

- Do not hardcode production prices or SKUs into JS as if they were the catalog.
- Do not claim integration is complete after copying mock JSON.
- Do not rebuild MoonAura templates “because the PHP still outputs them.” Adapt output to DS ATELIER components.

## Phase 1 foundation (2026-10-11)

Added under `backend/`, separate from UI assets:

- Environment-based `DS_ATELIER_*` config (`backend/.env.example`)
- PDO factory targeting dedicated `ds_atelier_dev` only
- Session cookie helpers (HttpOnly, SameSite, Secure policy)
- CSRF token helpers
- Fail-closed Dashboard/admin guard (no admin session is created in this phase)
- Migration filename convention and `ds_atelier_schema_migrations` tracker SQL
- Local setup notes in `backend/README.md`

Same-origin PHP/JSON handlers are the intended later integration style. Existing `.html` routes were not migrated.

This phase does not implement customer login, catalog queries, cart, checkout, payments, Newsletter, or Meta Pixel/CAPI.

## Phase 2 customer authentication (2026-10-13)

Applied against dedicated `ds_atelier_dev` only:

- `customers` and `customer_password_resets` migrations
- Same-origin JSON handlers: `backend/public/customer/{csrf,session,register,login,logout,forgot,reset}.php`
- `js/auth.js` posts login/register/forgot/reset/logout to those handlers
- Passwords use `password_hash` / `password_verify`; reset tokens store SHA-256 only
- Public forgot-password JSON never includes the raw token and reports `email_sent: false`
- SMTP delivery is not verified; Phase 6D may queue a reset email. Public JSON still reports `email_sent: false`

Out of this phase: catalog, cart, wishlist, checkout, payments, Newsletter, Meta Pixel/CAPI, Dashboard authentication.

## Phase 3 product catalog (2026-10-21)

Applied against dedicated `ds_atelier_dev` only:

- Additive catalog tables: `categories`, `sizes`, `colours`, `products`, `product_print_types`, `product_media`, `product_variants`
- Development seeder copies the existing mock products without overwriting rows that already exist
- Same-origin JSON handlers: `backend/public/catalog/{products,product,categories}.php`
- `js/catalog.js`, `js/shop.js`, `js/product.js`, and Home featured products consume those handlers
- Unpublished products and inactive variants are excluded; unavailable variants cannot be purchased
- Static mock-data fallback is limited to `file:` pages or explicit `?demo=1` / `ds-atelier-demo-catalog=1`

Out of this phase: admin CRUD, persistent cart/wishlist, checkout, orders, payments, Newsletter, Meta Pixel/CAPI, Dashboard authentication.

## Phase 4 persistent cart and wishlist (2026-10-22)

Applied against dedicated `ds_atelier_dev` only:

- Additive tables: `carts`, `cart_items`, `wishlists`, `wishlist_items`
- Guest identity: HttpOnly cookie `ds_atelier_guest` (64-hex raw, SHA-256 stored)
- Same-origin JSON: `backend/public/cart/{get,add,update,remove,clear,migrate}.php` and `backend/public/wishlist/{get,add,remove,toggle,migrate}.php`
- CSRF required on mutating endpoints; directory `index.php` files return 403
- Line identity: `slug|colour|size|printType|printPosition|artworkId`; add increments qty; migrate uses max qty
- Guest cart/wishlist merge into the customer account on login and register
- `js/commerce.js` hydrates from the server and migrates localStorage once (`ds-atelier-cart-migrated` / `ds-atelier-wishlist-migrated`)

Out of this phase: checkout, orders, payments, artwork file storage, Newsletter, Meta Pixel/CAPI, Dashboard authentication, admin catalog CRUD.

## Phase 5 checkout and order creation (2026-10-23)

Applied against dedicated `ds_atelier_dev` only:

- Additive tables: `orders`, `order_items`
- Same-origin JSON: `backend/public/checkout/{quote,place,order}.php`
- CSRF required on quote and place; directory `index.php` returns 403
- Money in integer paise; shipping `development_demo` ₹79 / free ≥ ₹999 (blocked in production); tax `unconfigured` = ₹0 with notice (blocked in production)
- `WELCOME10` is a development demo coupon
- Orders are `pending_payment` / `pending`; clients cannot set payment status or customer ownership
- Idempotency key unique; cart cleared only after successful place; inventory is not decremented
- `js/checkout.js` and `js/order-success.js` quote/place/load the server order without a visual redesign

Out of this phase: payment capture, invoices/email, inventory decrement, admin order dashboard, Newsletter, Meta Pixel/CAPI, Dashboard authentication, admin catalog CRUD.

## Phase 6A customer order management (2026-10-23)

Applied against dedicated `ds_atelier_dev` only:

- Same-origin JSON: `backend/public/customer/orders.php` and `backend/public/checkout/orders.php`
- List/detail are ownership-scoped to the current customer session or guest cookie
- `js/account.js` renders the server order list; demo seeded orders are removed
- `js/order-success.js` loads only the requested server order; API failure or unmatched ref shows empty
- Pending-payment presentation is unchanged; clients still cannot set payment status
- Admin order endpoints are not public; `ds_atelier_admin_require()` remains fail-closed

Out of this phase: payment capture, invoices/email, inventory decrement, admin order dashboard, Newsletter, Meta Pixel/CAPI, Dashboard authentication, admin catalog CRUD.

## Phase 6B inventory reservation (2026-10-24)

Applied against dedicated `ds_atelier_dev` only:

- Additive tables: `inventory_reservations`, `inventory_movements`
- `product_variants.stock` remains on-hand; available-to-sell = on-hand − reserved − committed
- Catalog, cart, and checkout use available-to-sell; made-to-order is not qty-capped by on-hand
- Checkout place reserves in-stock units in the same transaction; concurrent place cannot oversell
- Commit, release, expiry, and a stock-safety return do not decrement on-hand
- No public admin inventory endpoints; `ds_atelier_admin_require()` remains fail-closed
- CLI helper: `php backend/bin/expire-inventory.php`

Out of this phase: payment capture, invoices/email, admin inventory CRUD, Newsletter, Meta Pixel/CAPI, Dashboard authentication, admin catalog CRUD.

## Phase 6C fulfilment and invoices (2026-10-24)

Applied against dedicated `ds_atelier_dev` only:

- Additive tables: `shipments`, `shipment_events`, `invoices`
- Checkout place creates an unfulfilled shipment and a unique development/test invoice from persisted snapshots
- Customer order JSON includes `fulfilment` and `invoice`; Account/order-success show tracking only when stored
- Invoice download: `backend/public/customer/invoice-download.php` is ownership-scoped HTML. No PDF library is present
- `backend/public/admin/fulfilment.php` requires CSRF and `ds_atelier_admin_require()`; unauthenticated writes return 403
- Payment status remains independent of shipment status; pending-payment orders cannot be dispatched
- Seller GST/legal details remain unconfigured; invoices are marked development/test

Out of this phase: payment capture/webhooks, production tax invoices, courier APIs, SMTP, Dashboard authentication, admin catalog CRUD.

## Phase 6D transactional email (2026-10-25)

Implemented against dedicated `ds_atelier_dev` only. Live MySQL was unavailable in this environment, so the outbox migration is present and not applied here.

- Additive table: `email_outbox` (`backend/migrations/20261025160000_create_email_outbox.sql`)
- Transports: `disabled`, `test`, `smtp` via `DS_ATELIER_MAIL_*`. Development defaults to `test`. Production rejects `test`. PHP `mail()` is not used
- Checkout place queues `order_placed` in the same transaction. Fulfilment transitions queue `fulfilment_update` or `order_cancelled`. Password reset queues `password_reset` after a valid hashed token is stored
- Templates include HTML plus plain text. Order placed copy stays pending payment. Invoice links use `backend/public/customer/invoice-download.php`
- Worker: `php backend/bin/send-email-queue.php`. `--status` does not send. No cron/scheduler is configured
- Admin fulfilment writes remain fail-closed; unauthorized transitions cannot queue notifications
- Real SMTP credentials and inbox delivery are not verified

Out of this phase: payment capture/webhooks, Newsletter/marketing email, Meta Pixel/CAPI, Dashboard authentication, courier APIs.
