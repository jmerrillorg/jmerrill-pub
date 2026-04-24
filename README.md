# J Merrill Publishing — jmerrill.pub
## Division Site · J Merrill One · Canon v1

---

## Overview

This is the **Division 01 — Publishing** site for the J Merrill One enterprise platform.
It is governed by **JM1 Canon v1 + Addendum v1.1** and must conform to the parent architecture
defined at `jmerrill.one`.

**Stack:** Next.js 14+ (App Router) · TypeScript · Tailwind CSS · Azure Static Web Apps

---

## Project Structure

```
jmerrill-pub/
├── app/
│   ├── layout.tsx          # Root layout — JM1 parent bar, nav, footer
│   ├── page.tsx            # Homepage (all sections composed here)
│   ├── globals.css         # Base styles, tokens, utilities
│   ├── about/page.tsx      # About JMP + JM1 system
│   ├── services/page.tsx   # Full 95+ SKU catalog
│   ├── packages/page.tsx   # Package comparison + add-on guide
│   ├── join/page.tsx       # Author intake form
│   └── memberships/page.tsx# Membership tiers + comparison
├── components/
│   ├── layout/
│   │   ├── NavBar.tsx      # Fixed nav — scrolls solid
│   │   ├── Footer.tsx      # Full footer + JM1 cross-division links
│   │   ├── Cursor.tsx      # Custom cursor (client component)
│   │   └── ScrollReveal.tsx# IntersectionObserver reveal (client)
│   └── sections/
│       ├── HeroSection.tsx # Split hero — text + visual panel
│       └── index.tsx       # All other homepage sections
├── lib/
│   └── tokens.ts           # ALL brand tokens, division data, catalog data
├── tailwind.config.ts      # JM1 design tokens as Tailwind theme
├── next.config.ts          # Azure output, image domains, redirects, headers
├── tsconfig.json           # Path aliases (@/*)
└── package.json
```

---

## Design System

### Colors (from `lib/tokens.ts`)
| Token | Value | Role |
|-------|-------|------|
| `pub.primary` | `#1E90FF` | Dodger Blue — primary |
| `pub.secondary` | `#6A5ACD` | Slate Blue — secondary |
| `pub.accent` | `#A3C4DC` | Sky Blue — JM1 accent |
| `pub.charcoal` | `#111111` | Text |
| `pub.ink` | `#0D0D10` | Dark backgrounds |
| `pub.darkBg` | `#0F1C2E` | Section dark backgrounds |

### Typography
| Role | Font | Usage |
|------|------|-------|
| Display | Libre Baskerville | All headings, editorial |
| Body | Outfit | All body copy, UI |
| Mono | DM Mono | SKU codes, labels, kickers |

### JM1 Governance
- **Parent controls:** Domain structure, master palette, typography, canonical copy
- **Division controls:** Service catalog, pricing, marketing execution, division copy
- The **top bar** (`Division 01 · Publishing ← J Merrill One ↗`) is required on every page per Canon v1

---

## Pages Built

| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Complete | Full homepage — all 10 sections |
| `/services` | ✅ Complete | Full 95+ SKU catalog with anchored categories |
| `/packages` | ✅ Complete | Package cards + full comparison matrix + add-on guide |
| `/about` | ✅ Complete | Mission, values, JM1 system context |
| `/join` | ✅ Complete | Author intake form — wire to Power Automate |
| `/memberships` | ✅ Complete | 4 tiers + full comparison table |
| `/books` | 🔲 Pending | Author/title catalog — connect to Dataverse |
| `/authors/[slug]` | 🔲 Pending | Individual author profile pages |
| `/privacy` | 🔲 Pending | Privacy policy |
| `/terms` | 🔲 Pending | Terms of service |

---

## Getting Started

```bash
# Install
npm install

# Development
npm run dev

# Build
npm run build

# Type check
npm run type-check
```

Visit `http://localhost:3000`

### Local runtime note

If `npm run dev` launches under a Node runtime that cannot load the local SWC binary on macOS, use the working local fallback path:

```bash
/opt/homebrew/bin/node node_modules/next/dist/bin/next dev
```

This project was browser-QA'd successfully with that launch path when the default shell runtime produced a native SWC team-ID/code-signature mismatch.

---

## Remaining Build Tasks

### High Priority
1. **`/books` page** — Author catalog pulling from Dataverse `jm1_title` table
2. **`/authors/[slug]`** — Individual author profile pages (dynamic route)
3. **`/api/join` route** — Wire intake form to Power Automate HTTP trigger
4. **Books catalog in Dataverse** — Populate `jm1_title` table from existing ISBN records

### Medium Priority
5. **OG images** — Add `/public/og-image.png` (1200×630)
6. **Favicon** — Add `/public/favicon.ico` and `/public/icon.png`
7. **Analytics** — Add Microsoft Clarity or Azure App Insights
8. **Sitemap** — Add `app/sitemap.ts` for SEO

### Integration
9. **Power Automate** — Replace `/api/join` placeholder with HTTP trigger URL
10. **Dataverse intake** — Author records created on form submission
11. **Microsoft Bookings** — Scheduling link already wired; confirm Bookings page setup

---

## Join Form Integration (Power Automate)

In `app/join/page.tsx`, replace:
```tsx
action="/api/join"
```
With your Power Automate HTTP trigger URL:
```tsx
action="https://prod-XX.eastus.logic.azure.com/workflows/..."
```

Or create `app/api/join/route.ts` as a Next.js API route that calls the Power Automate endpoint server-side.

---

## Reader Funnel + Imprint Discovery

The site now includes a reader-funnel foundation built for website-first audience capture and imprint-based segmentation.

### New routes

- `/readers` — reader signup funnel with imprint-interest selection
- `/imprints/[slug]` — scalable imprint discovery/detail pages
- `/api/readers` — server route for reader-funnel submissions

### New config structure

- `data/imprints.ts` is the source of truth for:
  - imprint label
  - slug
  - audience summary
  - primary platforms
  - secondary platforms
  - recommended CTA emphasis
  - imprint positioning and assignment rule

Book cards and title pages now use this config to send readers into `/readers` with imprint context already selected.

### Live integration seam

`/api/readers` is prepared for Power Automate wiring.

Supported environment variables:

- `POWER_AUTOMATE_READER_SIGNUP_URL` — preferred dedicated reader-funnel endpoint
- `POWER_AUTOMATE_NEWSLETTER_URL` — optional fallback if you want reader signups to flow through the existing newsletter automation

### `/api/readers` backend contract

Endpoint:

- `POST /api/readers`

Primary environment variable:

- `POWER_AUTOMATE_READER_SIGNUP_URL`

Fallback environment variable:

- `POWER_AUTOMATE_NEWSLETTER_URL`

Expected payload fields:

- `firstName`
- `email`
- `imprintInterest`
- `source`
- `submittedAt`

Additional context currently sent by the website:

- `imprintLabel`
- `audienceSummary`
- `ctaEmphasis`
- `contextBookId`
- `contextTitle`

Recommended Dataverse table:

- `jm1pub_reader`

Recommended Dataverse fields:

- `jm1_firstname`
- `jm1_email`
- `jm1_imprintinterest`
- `jm1_source`
- `jm1_submittedat`
- `jm1_subscriptionstatus`
- `jm1_consentstatus`
- `jm1_consenttimestamp`

Recommended flow behavior:

1. Receive the `/api/readers` payload in Power Automate.
2. Create or upsert a `jm1pub_reader` record.
3. Map `payload.firstName` → `jm1_firstname`.
4. Map `payload.email` → `jm1_email`.
5. Map `payload.imprintInterest` → `jm1_imprintinterest`.
6. Map `source` → `jm1_source`.
7. Map `submittedAt` → `jm1_submittedat`.
8. Set subscription and consent fields according to your opt-in policy and timestamping standard.
9. Return HTTP 200 to the website after the intake is accepted.

Current behavior:

- If one of the automation URLs is configured, `/api/readers` forwards the signup payload there.
- If no automation URL is configured:
  - development returns a stub success and logs the payload
  - production returns a `503` so the site does not falsely claim a subscriber was captured

### Future Dataverse / Power Automate work

Recommended downstream path:

1. Receive `/api/readers` payload in Power Automate
2. Create or upsert a reader/contact record
3. Store imprint interest and source = `Book CTA`
4. Trigger imprint-specific email segmentation or list membership
5. Return HTTP 200 to the website

---

## Azure Deployment

The project is configured for **Azure Static Web Apps** via `output: 'standalone'` in `next.config.ts`.

Deploy via Azure Static Web Apps GitHub Action or Azure DevOps pipeline per JM1 infrastructure standards.

---

## JM1 Canon Compliance Checklist

- [x] JM1 parent top bar on every page (Division 01 + back-link to jmerrill.one)
- [x] Correct brand colors (Dodger Blue primary, Slate Blue secondary, Sky Blue accent)
- [x] Typography: Libre Baskerville display, Outfit body, DM Mono mono
- [x] Canonical copy: "Helping Authors Help Themselves" / "What you write should not disappear"
- [x] Cross-division links in footer (Financial, Foundation, Productions)
- [x] "A J Merrill One Company" attribution in footer
- [x] JM1 enterprise section in About page
- [x] Division number (01) in system badge
- [ ] Connect to JM1 Dataverse (jm1_title, jm1_author tables)
- [ ] Power Automate intake form routing
- [ ] Cross-division opportunity routing (Publishing → Financial)

---

*J Merrill One · Division 01 — Publishing · jmerrill.pub*
*Governed by JM1 Canon v1 + Addendum v1.1*
