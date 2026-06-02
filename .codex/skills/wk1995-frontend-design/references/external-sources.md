# External Source Index

This skill distills ideas from public web design and quality skills. Use this file for attribution, upstream refreshes, or deciding which reference to consult. Do not paste large upstream passages into outputs; summarize and adapt to this repository.

## Sources

- Anthropic frontend design: `https://github.com/anthropics/skills/tree/main/skills/frontend-design`
  - Use for the core stance: choose a concrete aesthetic direction, avoid generic AI UI, and deliver production-ready frontend work.
- Vercel Labs web design guidelines: `https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines`
  - Wrapper skill that asks agents to fetch the latest Web Interface Guidelines from `https://github.com/vercel-labs/web-interface-guidelines`.
- antfu web design guidelines: `https://github.com/antfu/skills/tree/main/skills/web-design-guidelines`
  - Same operational pattern as the Vercel Labs skill at the time this reference was created.
- nexu-io Open Design entry: `https://github.com/nexu-io/open-design/tree/main/skills/web-design-guidelines`
  - Catalogue entry pointing users toward the upstream Vercel-style design guideline skill.
- GitHub Awesome Copilot web design reviewer: `https://github.com/github/awesome-copilot/tree/main/skills/web-design-reviewer`
  - Use for browser-based visual inspection, responsive checks, issue prioritization, fix, and re-verification workflow.
- Leonxlnx imagegen frontend web: `https://github.com/Leonxlnx/taste-skill/tree/main/skills/imagegen-frontend-web`
  - Use for stronger art direction, section rhythm, anti-generic visual checks, image/media direction, and composition variety.
- GoogleChrome modern web guidance: `https://github.com/GoogleChrome/modern-web-guidance/tree/main/skills/modern-web-guidance`
  - Use for current, searchable, framework-agnostic browser API and modern web implementation guidance.
- Addy Osmani web quality audit: `https://github.com/addyosmani/web-quality-skills/tree/main/skills/web-quality-audit`
  - Use for audit framing across Core Web Vitals, accessibility, SEO, security, and modern best practices.

## Refresh Procedure

When the user asks to update this skill from upstream sources, fetch the latest source files into `/tmp`, compare themes, and update the concise references here. Keep `SKILL.md` short; put details in the matching reference file.
