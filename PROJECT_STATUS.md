# Project Status — DS ATELIER

Version: v0.1.4  
Status: Alpha — Standalone Frontend

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

---

## Pending

- Cart page
- Checkout page
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
- Cart count is local DOM state only
- Mock product data in `js/catalog.js` only; Product Details uses `product.html?id=`

---

## Next phase

1. Cart and Checkout pages
2. Remaining content pages
3. PHP backend integration and catalog migration

Do not claim backend integration is complete.
