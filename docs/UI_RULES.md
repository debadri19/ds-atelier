# UI Rules — DS ATELIER

Explicit rules for any public page. Read before modifying UI.

---

## Design system

- Use `css/style.css` as the global design system.
- Put only page-specific layout in page CSS (`home.css`, `shop.css`, `product.css`, etc.).
- Do not create a second design system.
- Do not duplicate buttons, cards, product cards, forms, header, or footer inside page CSS.
- Existing forms use the global floating-label outlined field system. Do not leave page-specific input skins.
- Do not use inline CSS.

---

## Components

- Reuse `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`.
- Reuse `.card`, `.feature-card`, `.product-card`, `.review-card`, `.promo-panel`.
- Reuse `.form-field`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`.
- Reuse header and footer markup/classes from `components/` and `css/header.css` / `css/footer.css`.
- Edit `components/header.html` and `components/footer.html` first, then copy into all 6 pages. Do not load those files with `fetch()`.
- Preserve CTA hierarchy: primary orange, then secondary/ghost.
- Preserve the floating pill header and the approved footer.

---

## Brand

- Use official files in `assets/images/brand/` only.
- Place new images in `assets/images/{hero,categories,products,services,icons,miscellaneous}/`. Product images use `products/<product-slug>/mockups/default/<color>/`.
- Header: DS icon + ATELIER wordmark (compact icon on mobile).
- Footer: full logo.
- Favicon: DS icon.
- Do not recreate the logo with text, CSS, or generated SVG.
- Do not stretch or crop logos out of proportion.
- Keep tagline `CREATE. PRINT. WEAR.` unless explicitly told to remove it.
- Do not turn the tagline into nav links.

---

## Color and type

- No arbitrary colors. Use tokens.
- No MoonAura purple/gold.
- No crystal, zodiac, astrology, healing, or gemstone visuals.
- No arbitrary typography changes. Syne for display, DM Sans for body.

---

## Theme

- Light and dark must both be designed.
- Light mode keeps a **dark floating header**.
- Dark mode uses charcoal surfaces, not inverted cream.
- Theme switching uses `html[data-theme]` via `js/theme.js`.
- Keep the pre-paint theme script in `<head>` on every page so Dark does not flash Light on load.

---

## Navigation

Do not invent alternative navigation.

Desktop: Home, Shop, Custom Order, Bulk Orders, Dropshipping, About, Support, plus Account, Cart, Theme Toggle.

Mobile bottom bar: Home, Shop, Menu, Account, Cart.

Menu contents: Custom Order, Bulk Orders, Dropshipping, About, Support, FAQ, Policies, Contact.

---

## Product UI

- Listing cards: **View Product** as the primary action once Shop/Product exist.
- Do not add configurable products to cart from a card.
- Configuration happens on the Product page.

---

## Fidelity

- Follow approved DS ATELIER mockups. They are not optional inspiration.
- Do not redesign without explicit approval.
- Before completion, check desktop, tablet, mobile, light, and dark against the mockup.
- If it still looks like MoonAura, it is not done.

---

## Accessibility

- Semantic HTML
- Image alt text
- Visible keyboard focus
- Sufficient contrast
- Every form field keeps an associated `<label>`
- `prefers-reduced-motion`
- `env(safe-area-inset-bottom)` for the mobile bar
