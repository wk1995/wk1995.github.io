# Web Quality Review Reference

Use this before finishing UI changes, when reviewing pages, and when the user asks for accessibility, responsive, performance, SEO, or design-quality fixes.

For final review responses, use `review-output-format.md`. For concrete commands, use `verification-commands.md`.

## Review Workflow

1. Confirm the page or scope. For this repository, direct static pages usually live at `index.html`, `blog/`, `apps/`, `models/`, `chat/`, `feedback/`, `music/`, and `apps/packages/`.
2. Identify the implementation surface: inline page CSS, `assets/site.css`, `assets/catalog-pages.css`, `assets/site.js`, or page-specific JS.
3. Preview the page when feasible. Capture or inspect at mobile around 360px, tablet around 768px, and desktop around 1280px.
4. Prioritize issues:
   - P1: broken layout, overlap, inaccessible controls, unusable mobile flow, missing critical content.
   - P2: degraded scanability, weak focus/hover states, inconsistent spacing, poor empty/error/loading states.
   - P3: minor polish, copy consistency, non-blocking visual rhythm issues.
5. Fix with the smallest change that matches local patterns, then re-check the affected viewport and one nearby page if shared CSS/JS changed.
6. Run `python3 .codex/skills/wk1995-frontend-design/scripts/check_site_quality.py --root .` unless the change is documentation-only.

## Interface Checklist

- Use semantic elements: links for navigation, buttons for actions, labels for controls, headings in order.
- Give icon-only controls accessible names; mark decorative SVGs with `aria-hidden="true"`.
- Keep focus visible. Do not remove outlines unless replacing them with an equivalent `:focus-visible` style.
- Make hover, active, disabled, loading, empty, error, and success states explicit when the component can enter those states.
- Ensure text containers handle long Chinese, English, URLs, model names, package names, and version strings without overflow.
- Use stable dimensions for cards, QR/package blocks, icon buttons, filter chips, and metric rows.
- Avoid duplicate IDs, invalid nesting, broken relative paths, and controls without hit targets.

## Forms And Interaction

- Inputs need labels or accessible names, useful `type`, `name`, and `autocomplete` where applicable.
- Do not block paste. Do not disable zoom with viewport settings.
- Error text should describe the fix or next action, not only the failure.
- Stateful filters, tabs, selected model/app, or expanded panels should preserve or reflect state when the existing page pattern already does so.
- Touch targets should be comfortable on mobile; keep spacing sufficient around language/theme controls and catalog actions.

## Performance, SEO, And Modern Web

- For images, set dimensions or stable aspect ratios. Lazy-load below-fold media; prioritize above-fold critical media only when useful.
- Avoid `transition: all`; animate specific compositor-friendly properties such as opacity and transform.
- Honor `prefers-reduced-motion` for non-essential animation.
- Keep JavaScript cheap for catalog search/filter interactions; avoid repeated layout reads inside hot paths.
- Use one clear `<h1>`, useful `<title>`, page-specific meta description, and descriptive link text.
- Prefer `Intl.DateTimeFormat` and `Intl.NumberFormat` for user-visible date, time, currency, and number formatting.
- For modern browser API or performance decisions, query GoogleChrome guidance first when network is available:

```sh
npx -y modern-web-guidance@latest search "<what you want to implement>"
npx -y modern-web-guidance@latest retrieve "<guide-id>"
```

Adapt retrieved guidance to static HTML/CSS/JS and this repository's browser support assumptions. If a feature is not broadly available, use progressive enhancement or a lightweight fallback.

## Static Site Verification

- Direct file preview is usually enough, but use a local server if fetches, relative paths, or browser security rules require it.
- If `assets/site.css` changes, sample home/blog and at least one catalog page.
- If `assets/site.js` changes, verify language switching, theme switching, and all added translation keys in both `zh` and `en`.
- If catalog CSS/JS changes, verify `apps/index.html`, `models/index.html`, and long model/app/package strings.
- Treat warnings from `scripts/check_site_quality.py` as review items. Fix them when they are in the touched surface; report them as residual risk when they are existing unrelated issues.
