# Backend Integration — DS ATELIER

This repository is a **standalone frontend**.

It will later be integrated with the existing Core PHP backend. That work is **not done**.

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
| Catalog | Hardcoded JS array on Home |
| Cart | Client-side counter only |
| Checkout | Not built |
| Auth / account | Anchor placeholders |
| Wishlist | Not built |
| Orders | Not built |
| Payments | Badge labels in footer only |
| Custom options | Frontend configuration on Product page only |

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

Wire Account header action to existing session/auth. Do not invent a parallel user store in the static frontend.

### Wishlist

Connect only after the page exists; use existing wishlist backend if present.

### Order tracking

Support/account area later; consume existing order records.

### Custom product options

Store print configuration and uploaded files with the line item. Exact schema is backend work and is not defined in this frontend repo.

---

## What not to do

- Do not hardcode production prices or SKUs into JS as if they were the catalog.
- Do not claim integration is complete after copying mock JSON.
- Do not rebuild MoonAura templates “because the PHP still outputs them.” Adapt output to DS ATELIER components.

When integration starts, update this file and `PROJECT_STATUS.md` in the same task.
