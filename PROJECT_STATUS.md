# Project Status — DS ATELIER

Version: v0.1.5  
Status: Alpha — Standalone Frontend (in progress)

Truthful snapshot. Do not treat planned work as done.

The standalone frontend is not yet integrated with the Core PHP backend.

---

## Completed

- Global design system
- Light/Dark mode
- Home page
- Shop page
- Product page
- About page
- Policy page
- Support page
- Customer account dashboard (`account.html`) — frontend demo
- Cart, Checkout, Wishlist, Designs — frontend demo pages
- Customer authentication (`auth.html`) — frontend demo; `#login` `#register` `#forgot-password` `#reset-password`; legacy redirects retained
- Studio Dashboard (`dashboard/index.html`, categories, products, designs, media) — frontend demo
- Dashboard authentication (`dashboard/auth.html`) — frontend demo; separate from customer auth; legacy `dashboard/login.html` redirect retained
- Responsive header
- Mobile bottom navigation
- Official logo integration
- Header/footer correction pass
- Product card View Product CTA
- Documentation lock
- Frontend UI polish phase for the current six pages

### Header

- Mobile Search icon visibility; Header Search is a frontend modal against mock catalog data (not a backend search API)
- Mobile utility alignment and right-side spacing

### Footer

- Dual logo lockup (`logo-icon.png` + `logo-wordmark.png`)
- Footer brand spacing optimization

### Shop

- Filters
- Sort
- Pagination
- Mobile filter sheet
- Mobile sort sheet

### PDP

- Dynamic Front/Back upload flow
- Upload preview inside the upload area
- Size Guide modal
- Lightbox
- Mobile layout corrections
- CTA hierarchy (`Buy Now` / `Add to Cart`)
- Scrollbar breathing room

### Catalog / assets

- Product image architecture
- Asset folder restructure
- Catalog color cleanup

### Home

- Mobile USP card spacing optimization

---

## Pending

- Core PHP/MySQL backend integration (catalog, auth, cart, checkout, payment, orders, wishlist, admin)
- Real product/catalog and artwork migration (replace `js/catalog.js` / `js/artworks.js` mocks)
- Dashboard production persistence (Categories/Products/Designs/Media) and placeholder modules (Orders, Customers, Discounts, Settings)
- Dedicated Custom Order / Bulk Orders / Dropshipping PHP pages — **Needs Verification** against the backend repo (Home sections exist here; dedicated PHP files do not)
- Production end-to-end QA after backend work
- Git commit/push of local authentication rename (`auth.html`, `dashboard/auth.html`) — uncommitted as of 2026-10-11; HEAD remains `555d395`

See `docs/PROJECT_AUDIT_PENDING.md` for evidence and status labels.

---

## Known issues / limitations

- No public preview tunnel is guaranteed in every environment; local static server is `python3 -m http.server 8000`
- Home listing cards use View Product; Product Details handles configuration and frontend-only Add to Cart / Buy Now
- Header/footer markup is inlined on all 6 pages and mirrored in `components/*.html`. Keep copies identical until PHP includes exist. Do not use a runtime JS loader. Support footer omits colliding `#support` / `#faq` ids.
- Apparel visuals on Home are SVG placeholders, not photography
- Storefront images live under `assets/images/{hero,categories,products,services,icons,miscellaneous}/`
- Product mockups live under `assets/images/products/<product-slug>/mockups/default/<color>/`
- Cart, Checkout, Account, Wishlist, and Auth persist in the browser only (`localStorage` / `sessionStorage`); they are not server sessions
- Mock product data in `js/catalog.js` only; Product Details uses `product.html?id=`
- Canonical customer auth in this working tree is `auth.html`; that rename is not in commit `555d395`

---

## Next phase

1. Safely commit/push the local authentication route rename when the owner approves
2. PHP backend integration and production catalog migration
3. Persistent Dashboard modules/media and real commerce/payment processing
4. Production end-to-end QA

Frontend pages for Home, Shop, Product, About, Policy, Support, Account, Cart, Checkout, Wishlist, Designs, and Auth exist. Backend integration, production catalog, and production QA are not complete.

Do not claim backend integration, payments, or production search is complete. Do not describe Cart or Checkout pages as unbuilt.
