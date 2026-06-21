# Review Output Format

Use this when the user asks to review, audit, inspect, or critique a page. Findings must come before summary.

## Format

```markdown
**Findings**
- `P1` [file:line] Short title
  Impact and concrete fix.
- `P2` [file:line] Short title
  Impact and concrete fix.

**Open Questions**
- Question only if it blocks the fix or affects product direction.

**Summary**
Brief note on what was reviewed, what was fixed if changes were made, and what remains.

**Verification**
- Command or browser check run.
- Any check not run and why.
```

## Priority

- `P1`: broken functionality, layout overlap, inaccessible primary action, mobile unusable, missing critical content.
- `P2`: meaningful UX degradation, inconsistent interactive state, poor responsive behavior, missing error/empty/loading state.
- `P3`: polish, spacing, copy, minor consistency, non-blocking performance/SEO suggestion.

## Rules

- Include file and line whenever the issue is tied to code.
- Do not bury findings under a long preamble.
- If no issues are found, say that clearly and list residual risk or untested areas.
- When asked to fix after review, keep the final answer focused on fixed findings and verification.
