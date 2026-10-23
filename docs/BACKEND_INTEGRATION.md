# Backend Integration — DS ATELIER

This repository remains a **standalone frontend** except for Phase 2 customer authentication, Phase 3 read-only catalog APIs, Phase 4 persistent cart/wishlist, and Phase 5 checkout/order creation. Phase 1 added a DS-specific PHP foundation under `backend/`. Payments are **not** connected. Dashboard authentication is still a frontend demo.

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
| Auth / account | Customer `auth.html` uses PHP/JSON against `ds_atelier_dev`. `account.html` remains a frontend demo. Password-reset email is not sent. |
| Wishlist | `wishlist.html` plus `js/commerce.js` against `backend/public/wishlist/*.php` |
| Orders | Phase 5 pending-payment rows in `ds_atelier_dev`; `account.html` history remains a frontend demo |
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

Customer `auth.html` posts to `backend/public/customer/*.php`. Keep Dashboard `dashboard/auth.html` separate. Do not treat the `account.html` demo session store as production account data.

### Wishlist

`wishlist.html` reads `backend/public/wishlist/get.php`. Toggle/add/remove are CSRF-protected. Unpublished products are excluded.

### Order tracking

Support/account area later; consume existing order records.

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
- SMTP is not configured; no reset email is sent

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
