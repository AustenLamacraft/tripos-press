# Tripos Press

A multitenant platform for publishing university lecture notes and slides. Professors write
Markdown with LaTeX and publish to the web. Content renders server-side with KaTeX and
reveal.js — readers get fast, dependency-free HTML.

## Design principles

- **Local-first publishing** — the authoritative copy of content lives with the professor (local
  folder or git repo). The platform is a render target, not the source of truth.
- **Markdown + LaTeX** — all content is Markdown with YAML frontmatter. Math renders via KaTeX
  at publish time; readers need no JavaScript for equations.
- **Two content types** — `type: post` renders as a prose article; `type: slides` renders as a
  reveal.js presentation at `/present/:user/:course/:slug`.
- **Access control** — content is `PUBLIC` or `ENROLLED`. Enrolled-only content requires an
  active enrollment record; institutional SSO can be wired in later.
- **Multitenant** — each professor has a username-rooted namespace:
  `/:username/:course/:slug`.

---

## Project structure

```
tripos-press/
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml
│
├── packages/
│   └── content-pipeline/          # Shared rendering logic (reusable by a future CLI)
│       └── src/
│           ├── render-post.ts     # markdown → HTML  (KaTeX + syntax highlight)
│           └── render-slides.ts   # markdown → [slide HTML, …] (KaTeX + syntax highlight)
│
└── apps/
    └── web/                       # Next.js 15 application
        ├── prisma/
        │   └── schema.prisma      # PostgreSQL schema: User, Course, Post, Enrollment
        └── src/
            ├── lib/
            │   ├── auth.ts        # Auth.js v5 — GitHub OAuth + Prisma adapter
            │   └── db.ts          # Prisma client singleton
            ├── types/
            │   └── next-auth.d.ts # Session type extension (id, username)
            ├── components/
            │   ├── editor/
            │   │   └── editor-client.tsx   # CodeMirror 6 split-pane editor
            │   └── slides/
            │       └── reveal-slides.tsx   # Client component: reveal.js deck
            └── app/
                ├── (app)/                  # Root layout: nav header + Tailwind prose
                │   ├── layout.tsx
                │   ├── page.tsx            # Landing page
                │   ├── dashboard/
                │   │   ├── page.tsx        # Course + post list
                │   │   └── editor/
                │   │       └── page.tsx    # Editor page (?postId= for existing posts)
                │   └── [username]/[course]/[slug]/
                │       └── page.tsx        # Post viewer (enforces visibility)
                ├── (slides)/               # Separate root layout: bare HTML for reveal.js
                │   └── present/[username]/[course]/[slug]/
                │       └── page.tsx        # Slides viewer
                └── api/
                    ├── auth/[...nextauth]/route.ts
                    ├── publish/route.ts    # POST: render + upsert post
                    └── preview/route.ts   # POST: render markdown for live preview
```

### URL scheme

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/dashboard` | Professor's post and course list |
| `/dashboard/editor` | New post |
| `/dashboard/editor?postId=<id>` | Edit existing post |
| `/:username/:course/:slug` | Published post (prose) |
| `/present/:username/:course/:slug` | Published slides (reveal.js, full-screen) |

### Content format

Every post is a Markdown file with YAML frontmatter:

```markdown
---
title: "Lecture 3: Fourier Series"
type: post          # or: slides
date: 2026-01-20
published: true
---

## Introduction

The Fourier series of $f(x)$ is...

$$f(x) = \frac{a_0}{2} + \sum_{n=1}^{\infty} a_n \cos(nx) + b_n \sin(nx)$$
```

For slides, `---` separates horizontal slides; `--` separates vertical sub-slides within a
horizontal section.

### Local-first publishing

Professors can work entirely with local files:

1. Write `.md` files in any editor (VS Code, Obsidian, Emacs…)
2. Keep them in a git repo for version control and backups
3. Use the in-browser editor's **File System Access API** (planned) to open the folder and
   publish directly, or paste content into the editor

The platform stores the *rendered* HTML and the source Markdown. If the platform disappeared,
every source file would still be on the professor's machine.

---

## MVP build order

### Phase 1 — Content pipeline ✅
- `packages/content-pipeline`: `renderPost` and `renderSlides`
- Unified/remark/rehype chain: GFM + remark-math + rehype-katex + rehype-highlight
- Slide splitting on `---` / `--` separators

### Phase 2 — Auth + multitenancy ✅
- Auth.js v5 with GitHub OAuth and Prisma adapter
- `User.username` set from GitHub login → used in public URLs
- PostgreSQL schema: User, Course, Post, Enrollment, Account, Session

### Phase 3 — Publish & preview APIs ✅
- `POST /api/publish` — render, upsert post, return public URL
- `POST /api/preview` — render markdown for live editor preview (debounced)
- Course auto-creation on first publish

### Phase 4 — In-browser editor ✅
- CodeMirror 6 with markdown language support (loaded dynamically)
- Split-pane: editor left, live preview right
- Toolbar: title, type selector, course selector, slug field, Save/Publish

### Phase 5 — Viewers ✅
- Prose post viewer at `/:username/:course/:slug` with access control
- Reveal.js slides viewer at `/present/:username/:course/:slug`
- Separate root layout for slides (no nav chrome)
- ⚠️ **Note:** Source markdown is stored in the database. Add export/download feature before production so professors can back up their sources.

### Phase 6 — Access control (next)
- Enrollment model in place; enforcement in place at viewer level
- TODO: enrollment management UI (professor invites students)
- TODO: institutional email domain matching (e.g. `@cam.ac.uk` → auto-enroll)
- TODO: institutional SSO (SAML / OIDC via university IdP)

### Phase 7 — Local-first enhancements (planned)
This phase realizes the "local-first" design — professors keep authoritative copies on their machines.
- TODO: Markdown export/download endpoint (`GET /api/posts/:id/markdown`) so professors can back up sources
- TODO: File System Access API — editor button to open local folder, reads/writes files directly
  - Track changes via `.tripos-press.json` metadata file (stores SHA256 hashes of each post)
  - On folder open, compute hashes and compare; only upload modified files
  - After successful publish, store new hashes to avoid re-uploading
- TODO: Bulk import — upload a folder of `.md` files, auto-create posts
- TODO: CLI: `tripos-press publish ./my-course/` (extracted from `content-pipeline` package)
  - Use `git status` / `git diff` to detect modified files (assumes course is a git repo)
- TODO: Git remote integration — `git push tripos main` triggers publish

### Phase 8 — Quality of life (planned)
- PDF export via Puppeteer (headless Chrome prints the slides page)
- Course landing pages at `/:username/:course`
- Professor profile pages at `/:username`
- Custom domains per institution
- Image upload (S3/R2)

---

## Getting started

### Prerequisites

- Node.js 20+, pnpm 9+
- PostgreSQL database (use [Neon](https://neon.tech) for managed hosting — free tier works)
- GitHub OAuth app ([create one here](https://github.com/settings/developers))

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env with your DATABASE_URL, AUTH_SECRET, and GitHub OAuth credentials

# Push schema to the database
pnpm db:push

# Start dev server
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Deployment (Vercel + Neon)

1. Push to GitHub
2. Import the repo in Vercel; set the **Root Directory** to `apps/web`
3. Add environment variables from `.env.example`
4. Set `NEXTAUTH_URL` to your production URL

---

## Tech stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Next.js 15 (App Router) | Server Components, multitenancy routing, API routes |
| Database | PostgreSQL via Prisma | Relational model suits course/post/enrollment hierarchy |
| Auth | Auth.js v5 + GitHub | Academics already have GitHub; institutional SSO can be added |
| Editor | CodeMirror 6 | Best-in-class extensible browser editor |
| Math | KaTeX (server-side via rehype-katex) | Fast, no client JS needed in published pages |
| Slides | reveal.js v5 | De-facto standard for HTML presentations |
| Markdown | unified / remark / rehype | Composable pipeline; same code for web + future CLI |
| Styling | Tailwind CSS + @tailwindcss/typography | Rapid UI; `prose` class for post content |
| Hosting | Vercel (web) + Neon (DB) | Zero-config deployment; generous free tiers |
