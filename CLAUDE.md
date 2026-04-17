# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build
npm run lint      # ESLint validation
npm run preview   # Preview production build locally
```

## Configuration

Copy `.env.example` to `.env` and fill in:
- `VITE_CONTENTFUL_SPACE_ID` — required
- `VITE_CONTENTFUL_CDA_TOKEN` — Delivery API token, required
- `VITE_CONTENTFUL_CPA_TOKEN` — Preview API token, required
- `VITE_CONTENTFUL_ENVIRONMENT` — optional, defaults to `master`
- `VITE_SITE_PREVIEW_CONTENT_TYPE` — optional, pre-selects a content type in the Site Preview view

## Architecture

**Contentful Explorer** is a React + Vite admin UI for browsing a Contentful CMS space. It has four views: Content Model, Entries, Site Preview, and Learn.

### Data flow

1. `src/config/contentfulEnv.js` reads and validates env vars at startup
2. `src/App.jsx` owns all global state (active view, content types, entries, CDA/CPA toggle, errors) and orchestrates data fetching
3. `src/api/contentfulClient.js` (`cfFetch`) handles all HTTP calls to Contentful's CDA/CPA REST endpoints
4. Data flows down via props to view components; no external state library

### Key utilities (`src/contentful/`)

- `localized.js` — unwraps locale-keyed objects to a single value so the rest of the app is locale-agnostic
- `includedMaps.js` — resolves nested entry/asset links from Contentful's `includes` response structure; also provides asset URL helpers
- `helpers.js` — field type color mapping, status badges, rich text plain-text extraction
- `RichTextBody.jsx` — recursive rich text renderer (handles nested entries, assets, hyperlinks, all mark types)
- `RenderValue.jsx` — generic component that renders any Contentful field value in the explorer

### Styling

All component styling is inline React style objects. `src/styles/explorer.css` holds CSS custom properties for the theme (light/dark) and site preview layout rules. The app uses DM Sans for UI text and JetBrains Mono for code/JSON display.
