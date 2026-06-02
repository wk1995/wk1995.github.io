---
name: wk1995-frontend-design
description: Create or refine distinctive, production-ready frontend UI for the wk1995.github.io static site. Use when changing this repository's pages, visual design, interaction states, responsive layout, bilingual copy wiring, theme tokens, catalog pages, blog pages, chat pages, or any HTML/CSS/JS interface work where the result should feel intentionally designed rather than generic.
---

# WK1995 Frontend Design

## Core Approach

Use this skill for frontend work in `wk1995.github.io`. Build on public frontend-design and web-quality skills while adapting them to this repository's static site architecture.

Always read `references/repo-style.md` before editing UI. Then load only the extra reference that matches the task:

- New page, redesign, visual polish, hero/section composition: read `references/design-direction.md`.
- Review, audit, bug fix, accessibility, performance, responsive QA: read `references/web-quality-review.md`.
- Need attribution or upstream context for the external skills distilled here: read `references/external-sources.md`.

## Workflow

1. Inspect the target page, its linked CSS, and any page entry in `assets/site.js`.
2. Identify the user's actual surface: home, blog, article, chat, model catalog, app catalog, feedback, music, or package listing.
3. Choose a concrete design direction that fits AI x Android, personal technical publishing, or operational catalog usage. Keep the direction specific enough to guide typography, density, color, motion, and hierarchy.
4. Implement working static HTML/CSS/JS. Preserve existing page contracts: `data-page`, `data-i18n`, theme toggles, language persistence, and no-build GitHub Pages deployment.
5. Review the result against `references/web-quality-review.md` when the change touches interaction, layout, media, forms, SEO, accessibility, or performance.
6. Verify desktop and mobile layouts. Check both light and dark themes when a page supports them, and confirm text does not overflow buttons, cards, nav, filters, or metadata rows.

## Design Rules

- Favor a memorable, context-specific interface over generic gradients, interchangeable cards, and default component layouts.
- Keep AI x Android as the conceptual anchor: signal engineering craft, mobile intelligence, model operations, and technical writing rather than SaaS marketing.
- Use repository tokens first. Add new CSS custom properties only when the page needs a real new semantic color, spacing, or surface role.
- Avoid one-note purple/blue visuals. Existing blue and violet tokens are allowed, but pair them with neutral structure, data-like accents, or page-specific secondary colors.
- Preserve bilingual behavior. Any visible copy added to pages controlled by `assets/site.js` must have zh and en translations, or be intentionally static and justified by surrounding code.
- Preserve accessibility: semantic headings, usable focus states, adequate contrast, labels for controls, and reduced-motion-friendly animation.
- Use motion for meaningful state changes and page atmosphere. Keep it CSS-only unless an existing JS pattern already handles the interaction.
- Do not introduce frameworks, package managers, or build steps unless the user explicitly asks; this site is designed to work as static files.
- When modern browser APIs or performance patterns are relevant and network is available, use GoogleChrome `modern-web-guidance` via `npx` as described in `references/web-quality-review.md`, then adapt the retrieved guidance conservatively.

## Implementation Checks

Before finishing, run the narrowest useful checks for the change:

- Static syntax: inspect edited HTML/CSS/JS for malformed tags, duplicated IDs, missing translation keys, and broken relative paths.
- Visual preview: open the changed page locally when feasible and inspect at mobile and desktop widths.
- Repository hygiene: keep unrelated files untouched, especially generated packages and user-local files.

If a change affects shared controls in `assets/site.css` or `assets/site.js`, sample at least one page from each affected family: home/blog, catalog, and chat or feedback.
