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

## Vision & Positioning

**What problem does Tripos Press solve?**

University lecturers spend hundreds of hours writing lecture notes, slides, problem sheets. Today's options all have tradeoffs:

- **Canvas / Blackboard:** Bloated LMS. Bury content in folders. Gradebook overhead. Institutional lock-in.
- **Google Drive / OneDrive:** No public web presence. Friction for students to access.
- **Obsidian Publish:** Single author. No multi-course organization. $8/month per vault. No enrollment/discovery.
- **Hugo / Jekyll:** Own your domain. Great for blogs. Friction: git CLI, build step, no admin UI. No course model.

**Tripos Press splits the difference:**

- ✍️ **Write* in markdown.** Paste into the browser editor or keep files in git/local folder.
- 📊 **Render slides & notes from the same source.** Same `---` separators become reveal.js slides.
- 📐 **LaTeX first-class.** KaTeX renders server-side. Readers get plain HTML. No mathjax.js bloat.
- 📚 **Course-centric, not personal.** Multiple courses, hierarchical organization, institutional scoping.
- 🔗 **Local-first.** Your markdown lives on your machine or in git. Tripos Press is just the renderer.
- 👥 **Student discovery.** Phase 6: students find courses, enroll, see updates. No LMS-style bureacracy.
- 🚀 **Frictionless deployment.** Deploy to Vercel (5 min). Use your institution's login (Phase 6b).

**Not a replacement for:**
- Gradebook / assignment submission (use an LMS side-by-side)
- Collaborative real-time editing (use Google Docs or Overleaf for that)
- Video hosting (link out to YouTube/Kaltura)

**Compare to alternatives:**

| Feature | Canvas | Obsidian Publish | Hugo | Tripos Press |
|---------|--------|------------------|------|--------------|
| Write in markdown | ❌ | ✅ | ✅ | ✅ |
| LaTeX support | ⚠️ (Mathjax) | ⚠️ (Plugin) | ⚠️ (Manual) | ✅ (KaTeX, native) |
| Slides from markdown | ❌ | ❌ | ❌ | ✅ |
| Multi-course | ✅ | ❌ | ❌ | ✅ |
| Student enrollment | ✅ | ❌ | ❌ | ✅ (Phase 6) |
| Local-first (git) | ❌ | ❌ | ✅ | ✅ (Phase 7) |
| Free tier | ❌ | ❌ | ✅ | ✅ |
| Owned data | ❌ | ❌ | ✅ | ✅ |
| Browser editor | ⚠️ (clunky) | ✅ | ❌ | ✅ |
| Institutional SSO | ✅ | ❌ | ❌ | ✅ (Phase 6b) |

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

### Course structure and ordering

Courses can be organized via an optional `course.yaml` manifest file (used in Phase 7). This
file lives in the course folder alongside the `.md` files and specifies the course metadata,
section grouping, and post ordering:

```yaml
# course.yaml
title: "Part II Methods"
description: "Advanced analysis and PDEs"
institution: "University of Cambridge"  # optional

# Flat list (simpler)
posts:
  - lecture-01
  - lecture-02
  - lecture-03
  - problem-sheet-01

# Or hierarchical with sections
sections:
  - title: "Unit 1: Fourier Series"
    posts:
      - lecture-01
      - lecture-02
      - lecture-03
  - title: "Unit 2: Fourier Transforms"
    posts:
      - lecture-04
      - lecture-05
      - problem-sheet-01
  - title: "Problem sets"
    posts:
      - problem-sheet-02
```

The `order` field on each post in the database is populated from this manifest. On publish,
section structure can be used to organize the course landing page and TOC.

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
- ⚠️ **Limitation:** Images not yet supported. Workaround: embed as base64 data URIs in markdown. Phase 7 will support local image files.
- ⚠️ **Note:** Source markdown is stored in the database. Add export/download feature before production so professors can back up their sources.

### Phase 6 — Student enrollment and course discovery
**MVP:** Join links for independent adoption. **Phase 6+:** Institutional SSO for university-wide rollout.

#### Phase 6a — Join links (MVP pathway)
- TODO: Join links — professor shares `/:username/:course/join?token=xyz`, auto-enrolls student
  - Generate short-lived (7 day) enrollment tokens on demand
  - Unauthenticated students redirected to sign in first, then auto-enroll on return
- TODO: Student dashboard at `/student/dashboard`
  - List of enrolled courses with course cover / description
  - "Recent posts" feed: latest posts from enrolled courses, sorted by `publishedAt` desc
  - For each post: title, type (Post/Slides), published date, link to view
- TODO: Course landing page at `/:username/:course` (when ENROLLED course or has public posts)
  - Course title, description, enrollment status
  - Syllabus: all posts in course ordered by `Post.order`
  - Each post shows title, type, published date, prereq status (draft vs published)
- TODO: Enrollment model: add `enrollmentToken` field (hashed + expiry) for join links
- TODO: Add `/api/enroll` endpoint — consume token, create or verify enrollment

#### Phase 6b — Institutional SSO (Phase 7)
Long-term, institutional login is primary. Join links become optional/fallback.
- TODO: SAML 2.0 / OIDC support via university IdP
  - Set `SAML_METADATA_URL` or `OIDC_DISCOVERY_URL` env vars
  - Auto-create user accounts from institutional email
  - Extract institution affiliation (`@cam.ac.uk` → "University of Cambridge")
- TODO: Auto-enrollment via email domain matching
  - Professor sets course visibility to `ENROLLED`
  - Students with `@cam.ac.uk` email auto-enroll on first login
- TODO: Institutional profile page (`/institution/cambridge`) showing all public courses

### Phase 7 — Local-first enhancements (planned)
This phase realizes the "local-first" design — professors keep authoritative copies on their machines.
- TODO: Image upload & storage
  - Set up S3/R2 bucket for asset storage
  - Add image upload UI to editor (drag-drop or file picker)
  - Generate signed URLs, cache invalidation
- TODO: Markdown export/download endpoint (`GET /api/posts/:id/markdown`) so professors can back up sources
- TODO: File System Access API — editor button to open local folder, reads/writes files directly
  - Track changes via `.tripos-press.json` metadata file (stores SHA256 hashes of each post)
  - On folder open, compute hashes and compare; only upload modified files
  - Support local image file references in markdown (e.g., `![](./figures/fig-01.png)`)
    - On publish, copy images to S3/R2, rewrite URLs in rendered HTML
  - After successful publish, store new hashes to avoid re-uploading
- TODO: Drag-to-reorder posts on dashboard (when folder is open via File System Access API)
  - Reorder updates `course.yaml` and/or `Post.order` field
  - Visual feedback (drag handle, drop zones)
- TODO: Bulk import — upload a folder of `.md` files + images, auto-create posts
- TODO: CLI: `tripos-press publish ./my-course/` (extracted from `content-pipeline` package)
  - Use `git status` / `git diff` to detect modified files (assumes course is a git repo)
  - Upload images alongside markdown
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

### Performance — Incremental Static Regeneration (ISR)

Published posts and slides use **Incremental Static Regeneration**: the page HTML is cached for 1 hour, then regenerated on-demand. This means:

- ✅ Published content serves from Vercel's Edge Network (sub-100ms globally)
- ✅ Database queries happen only once per hour (not per request)
- ⏱️ Author updates appear within ~60 seconds on next request
- 🔐 **Note:** ISR caching is safe for PUBLIC posts. When Phase 6 adds ENROLLED courses, tag-based revalidation may be needed.

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
| Asset storage (Phase 7) | S3 / Cloudflare R2 | Object storage for images; CDN delivery |
