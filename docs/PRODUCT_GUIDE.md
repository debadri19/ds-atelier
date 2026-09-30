# Product Guide — DS ATELIER

Guide for future apparel catalog work.

This document describes **intended** catalog fields and the customization flow. It does not claim a live database.

Current catalog presentation uses a frontend-only mock catalog in `js/catalog.js` (`DSAtelier.catalog`). Home, Shop, and Product pages read from it. They are not production catalog data.

Routing: `product.html?id=<product-id>`. Missing or unknown `id` falls back to `oversized-graphic-tee`.

---

## Current mock fields

Present today in `js/catalog.js`:

- `id`
- `sku`
- `name`
- `price`
- `mrp`
- `rating`
- `reviews`
- `badge`
- `image`
- `alt`
- `category`
- `sizes`
- `color`
- `colors`
- `material`
- `availability`
- `popular`
- `weight`
- `gsm`
- `printTypes`
- `lead`
- `details`
- `images`

These are presentation placeholders. Shop filters use `category`, `sizes`, `color`, `material`, `availability`, and `popular`. PDP configuration uses `printTypes`, `colors`, `sizes`, and `images`.

---

## Planned catalog fields

Recommended for future Shop / Product / admin catalog:

| Field | Purpose |
|---|---|
| Product Name | Storefront title |
| SKU | Unique stock code |
| Category | T-shirt, hoodie, jersey, DTF, sublimation, gift, etc. |
| Price | Selling price |
| MRP | Compare-at price |
| Discount | Derived or stored offer |
| Images | Gallery, not a single placeholder |
| Description | Editorial copy |
| Size | Size set / selected size |
| Fabric | Cotton, blend, polyester, etc. |
| Color | Garment color |
| GSM | Fabric weight |
| Print Type | DTF, sublimation, etc. |
| Print Area | Chest, back, all-over, etc. |
| Stock | Availability |
| Care Instructions | Wash / dry |
| Customization options | Upload, position, notes |

---

## Future integration fields

To be mapped when the Core PHP backend is connected. Do not invent these as already existing:

- backend product IDs
- variant IDs
- inventory reservations
- tax class
- shipping class
- wishlist IDs
- order line custom JSON
- uploaded artwork file IDs
- print-ready file status

See `docs/BACKEND_INTEGRATION.md`.

---

## Customization flow

Customer path:

1. Select product
2. Select print type
3. Select fabric/color
4. Select size
5. Upload design
6. Select print position
7. Enter special instructions
8. Add to Cart

Product Details (`product.html?id=` / `js/product.js`) looks up the catalog entry, then handles quantity, Buy Now, and validation that required custom options are complete. Add to Cart stays disabled until print type, color, size, design file, and print position are selected. No backend submission yet.

---

## Product cards

Primary action: **View Product**

Cards must not add a configurable product directly to cart.

Card contents:

- image
- badge (optional)
- name
- price
- MRP
- rating
- View Product CTA

Reuse `.product-card` from the global system. Do not create a Home-only duplicate.

Home listing cards use **View Product**. Shop and Product pages must keep View Product → Configure → Add to Cart.

---

## Categories (approved Home set)

- Custom T-Shirts
- Oversized T-Shirts
- Hoodies
- Polo T-Shirts
- Sports Jerseys
- DTF Prints
- Sublimation
- Custom Gifts

---

## Print services

- **DTF:** high-opacity transfers, dark and light garments, short runs
- **Sublimation:** all-over dye-infused colour on suitable fabrics
- **Custom order:** upload artwork, garment choice, placement
- **Bulk:** uniforms, events, teams, brands, resellers
- **Dropshipping:** no inventory, branded fulfilment

Actual backend/catalog migration is documented separately and is not complete.
