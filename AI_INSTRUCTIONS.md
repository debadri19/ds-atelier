# AI Instructions — DS ATELIER

Permanent rules for any future AI or code agent working on this project.

Read this file before any UI work.
Read `docs/DESIGN_SYSTEM.md` before any CSS work.
Read `docs/UI_RULES.md` before modifying any public page.

---

## Project

**Name:** DS ATELIER  
**Tagline:** CREATE. PRINT. WEAR.

**Business:**

- Custom Apparel
- DTF Printing
- Sublimation Printing
- Custom Products
- Bulk Orders
- Dropshipping

---

## Core development principle

```
EXISTING BACKEND / FUNCTIONALITY
+
APPROVED DS ATELIER FRONTEND DESIGN
```

Not:

```
OLD MOONAURA UI
+
NEW BRANDING
```

The old MoonAura implementation is only a source of functional or backend logic where applicable. It is not a visual reference.

---

## Mandatory reads before work

| Before you… | Read |
|---|---|
| Touch any public page | `AI_INSTRUCTIONS.md`, `docs/UI_RULES.md` |
| Change CSS / tokens / components | `docs/DESIGN_SYSTEM.md` |
| Change catalog, product cards, or custom-print flow | `docs/PRODUCT_GUIDE.md` |
| Add pages or scripts | `docs/FRONTEND_ARCHITECTURE.md` |
| Connect PHP, cart, checkout, auth | `docs/BACKEND_INTEGRATION.md` |
| Need current scope | `PROJECT_STATUS.md` |

If requirements are unclear, stop and ask. Do not invent a new visual direction.

---

## Future agents MUST

- Follow the approved DS ATELIER mockups as the primary visual reference
- Reuse the global design system in `css/style.css`
- Reuse existing header, footer, buttons, cards, product cards, and forms
- Preserve light mode and dark mode as separately designed themes
- Use official logo image assets only
- Keep page CSS limited to genuinely page-specific layout
- Update relevant documentation in the same task when design, architecture, product flow, or integration changes

---

## Future agents MUST NOT

- Copy, restore, or approximate MoonAura visual design
- Restore MoonAura layout
- Restore purple/gold styling
- Use crystal-store, zodiac, astrology, healing, or gemstone visuals
- Invent alternative navigation
- Invent alternative button styles
- Redesign approved components without explicit instruction
- Replace official logo assets with HTML text, CSS drawing, or generated SVG logos
- Introduce a second visual design system
- Bypass product configuration by adding configurable products to cart from listing cards
- Treat frontend mock data as production database data
- Claim backend integration is complete

---

## Approved visual direction

The supplied DS ATELIER mockup images are the primary visual reference. They are not optional inspiration.

Direction:

- premium
- modern
- apparel-focused
- fashion-tech
- editorial
- spacious
- clean
- dark + warm off-white + orange

Future pages must belong to the same visual family.

---

## Brand assets

Official logos live in `assets/images/brand/` and are immutable.

Storefront images use `assets/images/{hero,categories,products,services,icons,miscellaneous}/`. Keep original filenames. Product images live under `products/<product-slug>/mockups/default/<color>/`. Future artwork belongs in `designs/<design-slug>/`.

| File | Use |
|---|---|
| `logo-full.png` | Footer; desktop/tablet brand lockup when a stacked mark is needed |
| `logo-icon.png` | Header D/DS mark, mobile compact branding, favicon |
| `logo-wordmark.png` | Header ATELIER wordmark beside the icon |

Do not redraw, restyle, stretch, or recreate these files.

Tagline `CREATE. PRINT. WEAR.` is official. Do not remove it unless explicitly instructed. Do not convert it into navigation links.

---

## Color system

| Token | Value |
|---|---|
| Primary | `#FF6A00` |
| Primary hover | `#E95F00` |
| Dark | `#0F1113` |
| Dark surface | `#171A1D` |
| Dark surface 2 | `#1D2125` |
| Warm light | `#F5F2EC` |
| White | `#FFFFFF` |
| Dark text | `#181818` |
| Muted | `#8F969F` |

MoonAura purple/gold is not part of DS ATELIER.

---

## Theme rule

The storefront must support Light and Dark.

**Light**

- Warm off-white page background `#F5F2EC`
- White content surfaces
- Dark text `#181818`
- Dark floating header (stays dark in light mode)
- Orange CTA

**Dark**

- Near-black page background `#0F1113`
- Charcoal surfaces `#171A1D` / `#1D2125`
- White text
- Orange accents

Do not implement dark mode as a crude inversion of light mode.

Mechanism: `html[data-theme="light"]` and `html[data-theme="dark"]`. Persistence is handled by `js/theme.js`. A blocking script in `<head>` applies the saved or system theme before first paint.

---

## Global CSS rule

`css/style.css` is the global design system.

It owns tokens, theme, typography, reset, containers, spacing, buttons, cards, forms (outlined floating labels), shared components, shared responsive rules, and reusable navigation/component styling.

Do not create another global override stylesheet.

Page CSS contains only page-specific layout:

- `home.css` — Home only
- `shop.css` — Shop only
- `product.css` — Product only
- `about.css` — About only
- `policy.css` — Policy only
- `support.css` — Support only
- and the same pattern for later pages

Do not duplicate global components inside page CSS.
Do not create competing CSS frameworks.

---

## Header rule

Approved header: floating pill, premium dark/glass surface, official DS ATELIER branding.

**Desktop**

Left: official D/DS icon + ATELIER wordmark  
Center: Home, Shop, Custom Order, Bulk Orders, Dropshipping, About, Support  
Right: Account, Cart, Theme Toggle

**Tablet**

Compact floating top pill. Official compact logo. Reduced spacing. Preserve actions.

**Mobile**

Minimal top branding using the official icon. Floating bottom navigation:

Home | Shop | Menu | Account | Cart

Menu reveals: Custom Order, Bulk Orders, Dropshipping, About, Support, FAQ, Policies, Contact.

Do not replace this with a generic full-width ecommerce header unless explicitly requested.

Respect `env(safe-area-inset-bottom)` so the bottom bar does not overlap content.

---

## Product card rule

Product cards must not add a configurable product directly to cart.

Primary action: **View Product**

The customer must open Product Details first. That page handles print type, fabric/color, size, quantity, design upload, print position, special instructions, Add to Cart, and Buy Now.

Do not bypass product configuration.

Home listing cards use View Product. When Shop/Product pages are built, keep this rule. Do not add configurable products to cart from listing cards.

---

## Mockup fidelity rule

Before declaring a UI task complete, compare the implementation against the approved mockup.

Verify layout, spacing, header, logo, typography, buttons, cards, hero, footer, light mode, dark mode, desktop, tablet, and mobile.

If the result still looks like MoonAura, or substantially changes the approved visual direction, it is not complete.

Do not make “creative improvements” without explicit instruction.

---

## Documentation maintenance

When a task changes the design system, component rules, page architecture, product flow, or integration architecture, update the relevant documentation in the same task.

Do not let documentation become outdated.
