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
- Responsive header
- Mobile bottom navigation
- Official logo integration
- Header/footer correction pass
- Product card View Product CTA
- Documentation lock
- Frontend UI polish phase for the current six pages

### Header

- Mobile Search icon visibility (placeholder only; search is not implemented)
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

- Cart page
- Checkout page
- Header Search functionality (icon is a visual placeholder)
- Custom Order page
- Bulk Orders page
- Dropshipping page
- Backend integration
- Real product/catalog migration
- Final production QA

---

## Known issues / limitations

- No public preview tunnel is guaranteed in every environment; local static server is `python3 -m http.server 8000`
- Home listing cards use View Product; Product Details handles configuration and frontend-only Add to Cart / Buy Now
- Header/footer markup is inlined on all 6 pages and mirrored in `components/*.html`. Keep copies identical until PHP includes exist. Do not use a runtime JS loader. Support footer omits colliding `#support` / `#faq` ids.
- Apparel visuals on Home are SVG placeholders, not photography
- Storefront images live under `assets/images/{hero,categories,products,services,icons,miscellaneous}/`
- Product mockups live under `assets/images/products/<product-slug>/mockups/default/<color>/`
- Cart count is local DOM state only
- Mock product data in `js/catalog.js` only; Product Details uses `product.html?id=`

---

## Next phase

1. Cart and Checkout pages
2. Remaining content pages
3. PHP backend integration and catalog migration

Frontend UI polish for Home, Shop, Product, About, Policy, and Support is complete. The overall project remains in progress.

Do not claim backend integration, Cart, Checkout, or Search is complete.
