# Staff Mission Control

Public GitHub Pages mission-control dashboard for Amalgyte staff briefings.

**Live Site:** https://amalgyte.github.io/staff-mission-control/

## Overview

This is a dark ops/mission-control themed dashboard displaying public briefings from staff stations:

- **THEO** — Research briefings (public)
- **POPPY** — YouTube/TikTok/news trend briefings (public)
- **CLARA** — Realistic second-income/passive-income ideas (public)
- **NORA, ROWAN, JULIAN** — Private channels (locked/in-chat status only)

## How to Update Briefings

1. Edit `data/briefings.json`
2. Commit to `main` branch
3. The site republishes automatically via GitHub Pages

No build step required — the site fetches `data/briefings.json` at runtime.

## Data Schema

```json
{
  "updated": "ISO 8601 timestamp with Europe/London offset",
  "briefings": [
    {
      "id": "unique-string",
      "staff": "theo" | "poppy" | "clara",
      "title": "Briefing title",
      "summary": "Brief description",
      "links": [
        { "label": "Link text", "url": "https://..." }
      ],
      "timestamp": "ISO 8601 with Europe/London offset"
    }
  ]
}
```

## Important Security Notes

**DO NOT add to this repository:**
- Secrets, tokens, or API keys
- Personal logs or journal content
- Health or psychological content
- Any private staff briefing content
- Content for NORA, ROWAN, or JULIAN stations

This is a **public** GitHub Pages site. All content is visible to anyone.

## Technical Details

- Static site: `index.html` + `styles.css` + `script.js`
- No build process or bundler
- Data fetched from `data/briefings.json` at runtime
- Responsive design for desktop and mobile
- GitHub Pages deployment from `main` branch, root folder

## License

Private repository — Amalgyte internal use.
