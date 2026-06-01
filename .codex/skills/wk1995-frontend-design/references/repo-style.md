# Repository Frontend Reference

## Site Shape

- The site is static and deployed from the repository root through GitHub Pages.
- Main entry points include `index.html`, `blog/`, `apps/`, `models/`, `chat/`, `feedback/`, `music/`, and `apps/packages/`.
- Shared behavior lives mainly in `assets/site.js`; shared styles live in `assets/site.css`.
- Catalog-style pages use `assets/catalog-pages.css` plus page-specific JS such as `assets/personal-apps.js`, `assets/model-catalog.js`, and `assets/app-detail.js`.

## Existing Contracts

- Preserve `data-page` values because `assets/site.js` selects translations and behavior from them.
- Preserve `data-i18n`, `data-i18n-aria`, and page-specific text attributes such as `data-app-text` and `data-model-text`.
- When adding translatable copy, update both `zh` and `en` branches in `assets/site.js` or the relevant page script.
- Theme state uses `html[data-theme="light"]` and dark defaults. New page-specific variables should include both dark and light values when the page supports theme switching.
- This repository uses inline SVG icons in many controls. Reuse the local pattern unless introducing a dependency is explicitly requested.

## Visual Direction

- The current site leans dark, glassy, blue/violet, and AI-lab oriented. Treat that as the baseline, not a limit.
- Make page families distinct:
  - Home: editorial technical identity and AI x Android signal.
  - Blog/articles: readable long-form layout with restrained atmosphere and strong hierarchy.
  - Catalog pages: dense, scannable, operational interfaces for selecting apps or models.
  - Chat/feedback: tool-like surfaces with clear state, inputs, and trust cues.
- Use sharper page-specific accents when useful: Android greens, terminal/data neutrals, model-evaluation amber, or hardware graphite. Avoid turning every page into the same purple gradient.
- Cards may exist for repeated items, but avoid nested cards and decorative card shells around whole page sections.

## Responsive And Interaction Notes

- Test at narrow mobile widths around 360px and desktop widths around 1280px.
- Navigation, language controls, theme controls, catalog filters, chips, and CTA buttons must wrap cleanly without text overlap.
- Prefer stable dimensions for repeated item grids, icon buttons, QR/package cards, and model/app cards so translated text does not cause layout shift.
- Hover states should have keyboard-visible focus equivalents.
- Animations should not hide core content or make static GitHub Pages rendering dependent on JavaScript timing.

## Verification Hints

- For static previews, direct file opening is usually enough. Use a local server only when relative fetches, module loading, or browser security rules require it.
- If shared CSS variables change, inspect at least `index.html`, `blog/index.html`, `apps/index.html`, and `models/index.html`.
- If translation keys change, search with `rg "key.name"` and verify both language branches have matching keys.
