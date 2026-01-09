# LitLearn - Architecture Decisions

## Confirmed Decisions (2025-01-09)

### Platform & Storage
- **Browser-based** with File System Access API (Chrome/Edge)
- **Local JSON files** in `/data` folder
- **PDFs copied** into tool (no linking to external locations)

### AI Integration
- **Provider options:** OpenAI GPT-4o-mini / Gemini Flash (cheap but good)
- **Batch requests** while user does manual work (no waiting)
- **Validate API key** on first use, not on save

### Spaced Repetition Rules
- **Max 3 reviews per day** - others stay frozen (no Fibonacci change)
- **Expired = removed** permanently from review queue
- **Fibonacci reset** on "Nicht gewusst" (back to index 0)

### CSV Import
- **Skip duplicates silently** (by DOI)
- **Validate dates** and show errors for user to fix

### Reading Session
- **One paper at a time** (only one "reading" status)
- **Session state saved** on auto-save (can resume)
- **Resizable split view** (PDF left, form right)

### UI/UX
- **Desktop only** (no responsive/mobile)
- **No keyboard shortcuts** in MVP
- **Clear error handling** with manual retry option

### Deferred to Later
- Schema versioning (Phase 12)
- DOI resolver, BibTeX export, statistics, multi-user, browser extension

## Tech Stack
- React 18 + Vite
- Tailwind CSS
- React Router v6
- PDF.js
- PapaParse (CSV)
- date-fns
- uuid
