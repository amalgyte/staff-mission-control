# Staff Mission Control

Public GitHub Pages mission-control dashboard for Amalgyte projects and staff briefings.

**Live Site:** https://amalgyte.github.io/staff-mission-control/

## Overview

A dark ops/mission-control themed dashboard with three main sections:

### Navigation

- **Dashboard** (Home) — Project overview with status, progress, staff, and token usage
- **Projects** — Full list of all projects with links to detail pages
- **Staff Briefings** — Feed of briefings from Theo, Poppy, and Clara

### Project Pages

Individual project detail pages at `/projects/{project-id}.html`:

- `/projects/pet-care.html` — Pet Care Portal
- `/projects/amalgyte.html` — Amalgyte Software Agency
- `/projects/studio.html` — Studio Research

### Staff

**Public briefing stations:**
- **THEO** — Research briefings
- **POPPY** — YouTube/TikTok/news trend briefings
- **CLARA** — Realistic second-income/passive-income ideas

**Private channels (locked):**
- NORA, ROWAN, JULIAN — Private (in-chat status only, no public content)

## How to Update

### Update Project Data

1. Edit `data/projects.json`
2. Commit to `main` branch
3. Site republishes automatically via GitHub Pages

### Update Spend/Investment Tracking

1. Edit `data/spend.json`
2. Update token counts, estimated hours per staff/project/period
3. Commit to `main` branch

**Important:** Do NOT invent dollar/GBP costs. Use `"untracked"` or `0` until real numbers exist.

### Update Staff Briefings

1. Edit `data/briefings.json`
2. Add new briefing entries for Theo, Poppy, or Clara
3. Commit to `main` branch

No build step required — the site fetches all JSON at runtime using relative paths.

## Data Schemas

### data/projects.json

```json
{
  "updated": "ISO 8601 timestamp with Europe/London offset",
  "projects": [
    {
      "id": "unique-slug",
      "name": "Project Name",
      "tagline": "Short description",
      "domain": "example.com",
      "repo": "owner/repo-name",
      "repoUrl": "https://github.com/owner/repo-name",
      "stack": ["React", "Firebase"],
      "demoUrl": "https://...",
      "status": {
        "phase": "demo|early|ongoing",
        "label": "Human-readable status",
        "progress": 35,
        "summary": "Current status description"
      },
      "nextMilestone": {
        "title": "Next milestone description",
        "targetDate": null
      },
      "roadmap": [
        { "phase": "Phase Name", "status": "complete|in-progress|ongoing|pending" }
      ],
      "staff": [
        { "id": "staff-id", "name": "Name", "role": "Role" }
      ],
      "color": "#00d4ff"
    }
  ],
  "privateStaff": [
    { "id": "nora", "name": "Nora", "status": "private — in chat" }
  ]
}
```

### data/spend.json

```json
{
  "updated": "ISO 8601 timestamp with Europe/London offset",
  "periods": [
    {
      "id": "2026-09",
      "label": "September 2026",
      "startDate": "2026-09-01",
      "endDate": "2026-09-30"
    }
  ],
  "spend": [
    {
      "projectId": "pet-care",
      "staffId": "holly",
      "periodId": "2026-09",
      "tokens": 0,
      "estimatedHours": "untracked",
      "currencyNote": "No currency costs tracked"
    }
  ],
  "totals": {
    "byProject": { "pet-care": { "tokens": 0, "estimatedHours": "untracked" } },
    "overall": { "tokens": 0, "estimatedHours": "untracked" }
  }
}
```

### data/briefings.json

```json
{
  "updated": "ISO 8601 timestamp with Europe/London offset",
  "briefings": [
    {
      "id": "unique-string",
      "staff": "theo|poppy|clara",
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
- Invented dollar/GBP costs (use "untracked" instead)

This is a **public** GitHub Pages site. All content is visible to anyone.

## File Structure

```
/
├── index.html              # Dashboard (home)
├── projects.html           # Projects list
├── briefings.html          # Staff briefings feed
├── script.js               # Shared JavaScript
├── styles.css              # Shared styles
├── .nojekyll               # Disable Jekyll processing
├── data/
│   ├── projects.json       # Project data
│   ├── spend.json          # Investment/spend tracking
│   └── briefings.json      # Staff briefings
├── projects/
│   ├── pet-care.html       # Pet Care Portal detail
│   ├── amalgyte.html       # Amalgyte Agency detail
│   └── studio.html         # Studio Research detail
└── .github/
    └── workflows/
        └── pages.yml       # GitHub Pages deployment
```

## Timestamps

All timestamps use ISO 8601 format with Europe/London timezone offset:
- Summer (BST): `2026-09-01T16:30:00+01:00`
- Winter (GMT): `2026-01-15T09:00:00+00:00`

## Technical Details

- Static site: HTML + CSS + vanilla JavaScript
- No build process or bundler
- Data fetched from JSON files at runtime (relative paths)
- Responsive design for desktop and mobile
- GitHub Pages deployment from `main` branch, root folder
- HUD/ops aesthetic with dark theme

## License

Private repository — Amalgyte internal use.
