# DS ATELIER Design System

Canonical visual system for the storefront.

Source of truth in code: `css/style.css`

Read this file before any CSS work. Do not introduce a second design system.

---

## Brand

- **Name:** DS ATELIER
- **Tagline:** CREATE. PRINT. WEAR.
- **Tone:** premium, modern, apparel-focused, fashion-tech, editorial, spacious, clean

Official assets in `assets/images/brand/`:

- `logo-full.png` — stacked DS + ATELIER mark
- `logo-icon.png` — standalone DS icon
- `logo-wordmark.png` — ATELIER wordmark

Do not recreate logos in HTML, CSS, or SVG.

Storefront images live under `assets/images/`: `hero/`, `categories/`, `products/<product-slug>/mockups/default/<color>/`, `services/`, `icons/`, `miscellaneous/`. Keep original filenames. Product images use catalog slugs; do not invent extra design or color folders without real assets.

---

## Color tokens

| Role | Value | CSS variable |
|---|---|---|
| Primary | `#FF6A00` | `--primary` |
| Primary hover | `#E95F00` | `--primary-hover` |
| Primary soft | `rgba(255, 106, 0, 0.12)` | `--primary-soft` |
| Dark | `#0F1113` | used as `--color-page-bg` in dark |
| Dark surface | `#171A1D` | `--color-surface` in dark |
| Dark surface 2 | `#1D2125` | `--color-surface-2` in dark |
| Warm light | `#F5F2EC` | `--color-page-bg` in light |
| White | `#FFFFFF` | `--color-surface` in light |
| Dark text | `#181818` | `--color-text` in light |
| Muted | `#8F969F` | `--color-text-muted` in dark |

MoonAura purple/gold is forbidden.

---

## Light mode

`html[data-theme="light"]`

- Page background: `#F5F2EC`
- Surfaces: `#FFFFFF`
- Surface 2: `#F0EBE3`
- Text: `#181818`
- Muted: `#6B7280`
- Border: `rgba(24, 24, 24, 0.10)`
- Floating header: dark glass (`rgba(15, 17, 19, 0.9)`), not a light bar
- CTAs: orange

The header remains dark in light mode to preserve brand identity.

---

## Dark mode

`html[data-theme="dark"]`

- Page background: `#0F1113`
- Surfaces: `#171A1D`
- Surface 2: `#1D2125`
- Text: `#FFFFFF`
- Muted: `#8F969F`
- Border: `rgba(255, 255, 255, 0.08)`
- Header: dark glass charcoal
- Accents: orange

Do not invert light mode. Design dark surfaces, contrast, and borders independently.

---

## Typography

| Role | Family | Variable |
|---|---|---|
| Display / headings | Syne | `--font-display` |
| Body / UI | DM Sans | `--font-body` |

Scale:

- `--fs-xs` 0.75rem
- `--fs-sm` 0.875rem
- `--fs-md` 1rem
- `--fs-lg` 1.125rem
- `--fs-xl` 1.25rem
- `--fs-2xl` 1.75rem
- `--fs-3xl` 2.5rem
- `--fs-4xl` 3.5rem
- `--fs-5xl` 4.75rem

Headings use tight tracking (`letter-spacing: -0.03em` to `-0.06em` on hero). Do not swap typefaces without approval.

---

## Spacing

`--space-1` through `--space-10`: 0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem, 3rem, 4rem, 6rem, 8rem.

Section padding uses `--space-8` on desktop, tightening at 992px and 576px.

---

## Radii

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 0.5rem | small chips |
| `--radius-md` | 0.75rem | compact surfaces |
| `--radius-lg` | 1rem | outlined form fields / textareas |
| `--radius-xl` | 1.5rem | cards |
| `--radius-2xl` | 2rem | promo panels |
| `--radius-pill` | 999px | header, buttons |

---

## Shadows

Restrained only.

- `--shadow-sm` — hairline lift
- `--shadow-md` — cards / floats
- `--shadow-lg` — hero media
- `--shadow-header` — floating pill

No heavy neon glow. No purple shadows.

---

## Buttons

Reuse global classes. Do not invent page-specific button skins.

| Class | Role |
|---|---|
| `.btn` | base |
| `.btn-primary` | orange CTA |
| `.btn-secondary` | surface + border |
| `.btn-ghost` | transparent + border |
| `.btn-invert` | inverse fill |
| `.btn-lg` / `.btn-sm` | sizes |
| `.btn-icon` | icon-only control |

Hierarchy: one primary CTA per cluster, then secondary/ghost.

---

## Cards

| Class | Role |
|---|---|
| `.card` | generic surface |
| `.feature-card` | USP / why cards |
| `.product-card` | catalog card |
| `.review-card` | testimonial |
| `.promo-panel` | large editorial panel |
| `.promo-dark` | inverse promotional panel |

Product cards include media, badge, name, price, MRP, rating, and a single CTA. Future listing CTA is **View Product** (see `PRODUCT_GUIDE.md`).

---

## Forms

Official standard: Material-style outlined fields with floating labels.

Live in `css/style.css`. Do not rebuild this system in page CSS.

| Class | Role |
|---|---|
| `.form-group` | stacked field group |
| `.form-field` | outlined field wrapper |
| `.form-label` | associated label; sits on the border, floats on focus/value |
| `.form-input` | text / email / search input |
| `.form-select` | select |
| `.form-textarea` | textarea |
| `.form-helper` | helper text |
| `.form-error` | error text |
| `.input-group` | field + button (newsletter) |

Legacy aliases `.input`, `.textarea`, `.select` still map to the same outlined treatment.

- Label remains associated via `for` / `id`. Do not replace labels with placeholders.
- Empty fields use a space placeholder (`placeholder=" "`) so the float state can detect value.
- Focus border and floated label use `--primary` (`#FF6A00`).
- Light: white field surface, dark text, muted rest label.
- Dark: dark field surface, light text, theme-aware muted rest label.

Do not create a second global override stylesheet. Brand form rules live in `css/style.css`.

---

## Icons

Font Awesome 6 for navigation and UI glyphs.

Brand marks are raster logo files, not icon fonts.

---

## Header

Floating pill. Dark glass in both themes.

Classes live in `css/style.css` (brand lockup) and `css/header.css` (structure).

See Header rule in `AI_INSTRUCTIONS.md`.

---

## Footer

Reusable classes in `css/footer.css`.

Must include official full logo, brand description, Quick Links, Shop, Support, Policies, Contact, social links, newsletter, payment badges, and copyright.

Supports both themes.

---

## Breakpoints

| Width | Intent |
|---|---|
| 1200px+ | desktop editorial |
| 1199px / 992px | compact nav, reduced grids |
| 768px | tablet; mobile bottom nav begins |
| 576px | single-column sections |
| 480px | tighter cards and containers |
| 360px | compact branding |

Mobile body padding includes `env(safe-area-inset-bottom)`.

---

## Motion

Honor `prefers-reduced-motion`. Default transitions are short (`180ms`).
