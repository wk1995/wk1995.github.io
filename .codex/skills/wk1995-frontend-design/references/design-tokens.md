# Design Tokens Reference

Use this when changing shared CSS variables, adding a page theme, or deciding whether a new visual value belongs in the repository.

## Token Families

- Core site pages use `--bg`, `--bg-glow`, `--fg`, `--fg-muted`, `--primary`, `--accent`, `--card-bg`, `--border`, `--control-bg`, `--control-border`, and sometimes `--cta-shadow`.
- Catalog pages add `--catalog-bg`, `--catalog-surface`, `--catalog-surface-muted`, `--catalog-text`, `--catalog-muted`, `--catalog-border`, `--catalog-primary`, `--catalog-accent`, `--catalog-good`, and `--catalog-shadow`.
- Chat pages use their own tool-surface tokens in `assets/chat-page.css`; keep chat-specific decisions there unless a control is shared by multiple page families.
- Music and stock-like tools may use page-specific token prefixes. Keep those prefixes when the page behaves like a separate tool surface.

## Adding Tokens

- Add a token only for a semantic role, not a one-off color. Prefer names like `--catalog-warning`, `--surface-strong`, or `--android-accent` over `--green-1`.
- Define both dark and light values when the page participates in theme switching.
- Keep token scope narrow: page inline styles for one-off pages, shared CSS for controls or page families, prefixed tokens for tool-specific surfaces.
- Before introducing a new color, check whether an existing role can be reused with adjusted opacity.

## Current Visual Baseline

- Dark baseline: near-black blue backgrounds, muted blue-gray text, glassy cards, fine borders.
- Light baseline: pale blue backgrounds, white translucent surfaces, blue primary actions.
- Catalog baseline: more operational, less atmospheric, with teal and warm accent options.
- Recommended accent expansion: Android green for mobile/app surfaces, amber for model evaluation and warnings, graphite for device/tool panels, cyan for data or waveform states.

## Sizing And Shape

- Use `8px` radius for operational controls and cards unless matching an existing page family that already uses larger radii.
- Keep icon buttons square or near-square with stable dimensions.
- Keep repeated cards, QR blocks, model cards, and package rows on stable grid tracks.
- Avoid viewport-width font scaling. Use `clamp()` only with sensible min/max values for page-level headings.

## Motion Tokens

- Prefer durations around `150ms` to `250ms` for controls, `250ms` to `420ms` for page-level reveal.
- Animate `opacity` and `transform`; avoid layout-affecting animation.
- Provide a reduced-motion path for decorative motion.
