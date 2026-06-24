# Page Patterns Reference

Use this when adding or redesigning concrete page families in the repository.

## Home

- First viewport should communicate WK1995, AI x Android, and the main actions without reading a long explainer.
- Keep hero actions connected to real destinations such as chat, blog, models, apps, or contact.
- Use sections as signal layers: identity, current work, model watch, GitHub radar, recent writing, and contact.
- Avoid generic startup hero language and unsourced vanity metrics.

## Blog Index And Articles

- Blog index should prioritize scanability: title, date, tags, summary, and clear article link.
- Article pages should prioritize reading comfort: constrained measure, clear heading hierarchy, strong contrast, and code/list/quote styles that do not feel like cards inside cards.
- Keep article chrome quiet. Header controls should not compete with the text.
- Ensure `data-page` and translation keys map to the matching article entry in `assets/site.js`.

## Catalog Pages

- Start with the functional surface: title, short context, search/filter, count, current selection, and item grid.
- Keep model/app/package cards dense and comparable. Align provider, platform, version, score, updated date, and actions.
- Use stable card dimensions and `min-width: 0` patterns so long model names, versions, and package paths wrap or truncate cleanly.
- Empty, loading, error, and no-result states should be visually distinct and actionable.

## Chat And Feedback Tools

- Put inputs, selected model/key state, and recovery controls where users expect to act.
- Show trust cues for local storage, API key state, model selection, feedback target, and destructive actions.
- Keep drawer, modal, and composer states keyboard-accessible with visible focus and no scroll traps.
- Buttons should name specific actions: "Save Key", "Clear Conversation", "Export Backup".

## Music Or Media Tools

- Treat the waveform/editor area as the primary canvas.
- Toolbars should be compact, stable, and grouped by mode, scope, zoom, pan, edit, and export.
- Numeric time, zoom, and track metadata should use tabular numerals.
- Empty/loading/error states must explain the next action without needing external instructions.
