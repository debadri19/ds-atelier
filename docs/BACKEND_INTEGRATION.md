# Backend Integration — DS ATELIER

This repository remains a **standalone frontend** except for Phase 2 customer authentication. Phase 1 added a DS-specific PHP foundation under `backend/`. Catalog, cart, checkout and payments are **not** connected. Dashboard authentication is still a frontend demo.

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
| Catalog | Mock catalog in `js/catalog.js` |
| Cart | `cart.html` frontend demo (`js/commerce.js` localStorage); not a server cart |
| Checkout | `checkout.html` frontend demo; no payment gateway |
| Auth / account | Customer `auth.html` uses PHP/JSON against `ds_atelier_dev`. `account.html` remains a frontend demo. Password-reset email is not sent. |
| Wishlist | `wishlist.html` frontend demo |
| Orders | Demo orders in account UI only |
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

Map configured line items (including artwork references) to the existing cart/session model.

### Checkout

Reuse existing checkout, payment, tax, and order creation. Frontend must follow DS ATELIER pages (`checkout.css` later), not a legacy skin.

### Authentication / account

Customer `auth.html` posts to `backend/public/customer/*.php`. Keep Dashboard `dashboard/auth.html` separate. Do not treat the `account.html` demo session store as production account data.

### Wishlist

`wishlist.html` exists as a frontend demo; connect it to the existing wishlist backend if present.

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
