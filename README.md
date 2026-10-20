# Golden Mile Chrysler — Collision Centre page

Static page built to match the *Number 7 Repair / Golden Mile* brochure (G1815, GREY).
No build step, no dependencies — open `index.html`, or drop the folder on any host.

```
index.html      markup
styles.css      all styling (design tokens at the top)
assets/         photography cropped from the brochure artwork
```

## Where the design came from

| Token | Value | Source |
|---|---|---|
| `--orange` | `#e8762b` | brochure orange, CMYK 6/69/100/0, read from the PDF content stream |
| `--grey-panel-dk` | `#6e7073` | the grey "Collision Repair Experts" column |
| `--ink` / `--ink-deep` | `#2f2f2f` / `#1d1d1d` | brochure body + dark panels |
| `--mopar` | `#0a5ea8` | Mopar certification mark blue |

Type is Archivo (headings) + Barlow (body) from Google Fonts — the closest free pairing
to the brochure's Museo-style sans. Corners are square (`--radius: 2px`) to match the print piece.

All copy is lifted verbatim from the two brochure panels: Our Promise, About Us, What We Do,
Why Choose Us, We Care About You, the testimonial, and the contact block.

## Logo

Both logo files come from `All Logos/GoldenMileChryslerDodgeJeepRam LOGO.gif`, with the white
background keyed out. The key is a flood fill from the image border rather than a plain
white-to-alpha swap — the lockup contains white *inside* it (the "MILE" wordmark, the sky
behind the tree, the skyline), and a global key would have punched holes through those.
Edge pixels are un-premultiplied against white so there is no halo on dark backgrounds.

- `assets/logo-gmc.png` — header. The Chrysler/Dodge/Jeep/Ram row is cropped off so the
  lockup is wider and the wordmark reads at header size.
- `assets/logo-gmc-full.png` — footer, full lockup including the four make logos.

The footer sits on near-black, where the navy "CHRYSLER" wordmark and the black make logos
would disappear, so the footer logo is placed on a white tile matching the Mopar badge beside it.
If you ever get a white/knockout version of the lockup, you can drop the tile (`.footer__logo`).

## Before this goes live

1. **Mopar mark.** The footer Mopar badge (`.mopar`) is still a CSS stand-in — swap it for
   the official "Certified Collision Repair Facility" artwork when you have it.
   The Golden Mile Chrysler logo *is* the real artwork (see below).
2. **Photography.** `hero-collage.jpg`, `about-shop.jpg`, `car-detail.jpg` and
   `testimonial.jpg` were cropped out of the brochure's flattened artwork, so they top out
   around 700–1400px wide — fine at the sizes used here, but not retina-sharp. If you have
   the original stock files, or shots of the actual Eglinton Ave shop, drop them in at the
   same filenames. `high-five.jpg` is a supplied image, converted to greyscale to match the
   brochure's black-and-white treatment.
3. **Contrast.** Everything clears WCAG AA **except** white text on the brochure orange
   (2.98:1 — below the 4.5:1 minimum). That is the brochure's own treatment, so it was kept
   rather than changed silently. To make every orange-filled surface compliant in one edit,
   set `--orange-fill: #b25518;` in `styles.css`. Orange *text* on light backgrounds already
   uses a darker accessible tint (`--orange-text`); the brand orange is untouched everywhere else.
4. **No contact form.** The estimate form was removed at your request; the Contact section
   is details only. The header CTA, hero button and "Get in touch" link all scroll to
   `#contact`. If a form is ever wanted back, it lived in `.contact__form` / `.form*`.
5. **Add if wanted.** Hours of operation, a Google Maps embed, insurer logos, and a
   repair-process timeline were not in the brochure, so nothing was invented for them.

## Checked

Rendered in Chrome at 1440px and 390px: no broken images, no console errors, no 404s.
Mobile menu opens and closes; every in-page anchor resolves; `prefers-reduced-motion` and a
print stylesheet are handled.

## Pasting into WordPress

`index.html` is a standalone page. Dropping its markup into a WordPress page does
not work on its own: the `<link rel="stylesheet">` does not resolve, the relative
`assets/` paths break, and `#main` collides with the theme's own `#main`.

`wordpress-embed.html` is the version to paste. One file, built from the other two
by `node build-wordpress-embed.js`. Rerun that after any edit to `index.html` or
`styles.css` — do not hand-edit the embed.

What the build changes:

- inlines `styles.css` into a `<style>` block and scopes every selector under
  `#gmcc`, so nothing reaches the theme. `:root`, `html` and `body` collapse onto
  the wrapper div.
- prepends a low-specificity reset inside `#gmcc`, so the theme does not reach *in*
  either (img borders, list bullets, blockquote decoration, uppercase headings).
- renames every class with a `gm-` prefix. Scoping stops our CSS reaching the
  theme but not the theme reaching us, and `.header`, `.nav`, `.hero`, `.btn`,
  `.section` and `.wrap` are exactly what a dealership theme calls its own
  furniture. A theme rule that is more specific, or uses `!important`, wins
  against ours. Renaming means none of its rules can match our markup at all.
- pins the four sized svg classes with `!important`. An inline `<svg>` has no
  intrinsic size, so a theme rule as ordinary as `svg { width: 100% }` resizes
  every icon on the page.
- resolves all 148 `rem` values to px. A `rem` is relative to the **root**
  element, and the root is the theme's `<html>`, which a page cannot set.
  `styles.css` never sets one either, so standalone every `rem` is the 16px
  browser default — but a theme with `html { font-size: 18px }` (or `62.5%`, or
  `112.5%`) silently rescales the entire design. `em` is left alone: it resolves
  against the element's own font-size, which we do control.
- marks `font-size` and `font-family` `!important`, and pins the inheriting
  elements to `font-size: inherit !important`. Namespacing has no answer to an
  `!important` on a plain element selector, and page-builder themes emit rules
  like `#main p { font-size: 24px !important }` from their typography settings.
- prefixes every id — `#main` becomes `#gmcc-main`, and so on.
- gives each inline `<svg>` explicit `width`/`height`. Without them an svg with only
  a `viewBox` has no intrinsic size and expands to fill its container if the CSS
  ever fails to load.
- points the seven images at jsDelivr, serving this repo. **This only works while
  the repo is public.** Upload them to the Media Library and swap the urls for a
  permanent setup.
- removes our own header — logo, nav and phone. The site already has a header
  and a nav, and two of each on one page reads as a page inside a page. The
  mobile nav toggle and burger live inside it and go with it. `index.html`
  keeps its header: standalone there is no other chrome.
- removes the dark contact strip above it too (address, 24/7 number). Both
  details still appear in the Contact section and in the footer, so nothing is
  lost. The embeds open on the hero.

Paste it into **one Custom HTML block** (block editor) or the **Text** tab of the
Classic editor. The visual editor rewrites markup and will break the layout.

Use a **full-width page template**. The block bleeds out of the theme's content
column to full viewport width; a sidebar will overlap it. To keep it inside the
column instead, delete the single line marked `FULL-BLEED` in the `<style>` block —
the script at the bottom checks that rule and follows suit.

Checked against a deliberately hostile test theme: uppercase headings, bulleted
lists, bordered images, decorated blockquotes, a page-wide `* { font-family }`,
`svg { width: 300px !important }`, and `!important` rules on `.header`, `.nav`,
`.hero`, `.btn`, `.section`, `.wrap`, `.footer` and a dozen more of our own class
names, at four different root font sizes (62.5%, 10px, 20px, 24px). 43 elements
measured across 24 computed properties at 390, 600, 900, 1100 and 1440px: zero
differences from the standalone page, and zero changes to the theme's own markup.

### wordpress-embed-isolated.html

The same page, rendered inside a **shadow root**. Everything in the plain embed is
a fight over one shared cascade — our rules and the theme's rules in one document,
and we win only where we out-specify it. There is always a theme rule specific
enough to beat us: `#main div { display: block !important }` collapses every grid
in the design, and no amount of scoping or namespacing answers it.

Theme CSS cannot select into a shadow root at all. The only thing that still
crosses the boundary is inherited properties, which `:host { all: initial }`
clears. Two things come free with it:

- the markup sits in a `<template>` on a single line, so `wpautop` has no blank
  line to split on and cannot insert `<p>` tags into our grids,
- our CSS cannot escape either, so the defensive reset and the `!important` work
  become belt and braces rather than load-bearing.

`rem` still resolves against the document root inside a shadow tree, so the px
conversion is still doing real work.

Trade-offs: it needs JavaScript, and the text lives in the shadow tree rather than
the page's own DOM. Google renders with Chrome and indexes shadow content, but if
this page has to rank, the plain embed keeps the copy in the light DOM.

Measured against a theme carrying `#main div, #main section, #main ul, #main dl
{ display: block !important }` plus everything the plain embed already survives:
the plain embed shows 101 differences at 1440px, the isolated build shows zero.
