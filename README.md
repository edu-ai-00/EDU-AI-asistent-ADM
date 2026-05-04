# EDU-AI Admin

Next.js 14 admin application for authoring and managing educational courses, blocks, and lessons used by the EDU-AI platform. Provides a course tree, rich block editor (Markdown + KaTeX), and APIs that talk to the EDU-AI API backend.

## Tech stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS, tailwind-merge, shadcn-style primitives (Radix UI)
- **Data**: TanStack Query 5
- **Content**: react-markdown + remark-gfm + remark-math + rehype-katex (KaTeX)
- **Validation**: Zod
- **Icons**: lucide-react

## Project structure

```
src/
  app/
    admin/          # admin dashboard pages
    api/            # Next.js route handlers
    docs/           # in-app documentation routes
    login/          # auth screen
    _components/    # page-local components (course tree, editor panel, ...)
  components/
    ui/             # shadcn-style primitives
    editors/        # block editors
    admin/          # admin-specific composites
    providers/      # React context providers (Query client, theme)
  hooks/            # reusable React hooks
  lib/
    api/            # client-side API helpers
    server/         # server-only utilities
  types/            # shared TypeScript types
public/             # static assets, images, design-token docs
demo/               # demo course / block JSON fixtures
docs/               # markdown specs (e.g. flutter-block-v2-spec.md)
```

## Prerequisites

- Node.js 20+
- npm 10+

## Local development

```bash
cp .env.example .env.local   # adjust values
npm install
npm run dev                  # http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000).

## Run with Docker

A Dockerfile is not yet committed; until one is added, run the dev server inside a container using the official Node image:

```bash
docker run --rm -it \
  -p 3000:3000 \
  -v "$PWD":/app -w /app \
  node:20-alpine \
  sh -c "npm install && npm run dev -- --hostname 0.0.0.0"
```

Production build + serve:

```bash
docker run --rm -it \
  -p 3000:3000 \
  -v "$PWD":/app -w /app \
  node:20-alpine \
  sh -c "npm ci && npm run build && npm run start -- --hostname 0.0.0.0"
```

## Environment

Configure via `.env.local` (see `.env.example`). Typical variables: API base URL, auth secrets, feature flags.

## Demo data

Sample JSON files live in `demo/`:

- `Course 79 Export Format.json` — full course with lectures
- `EDU Block Design.json` — simple block format
- `PedF Block Definition v3.json` — advanced block schema with AI support
- `CourseV2 Example.json`, `Demo - Zlomky pro ZŠ (V2 Format).json`, `demo_zlomky_v6.json`

## Useful scripts

| Command          | Purpose                       |
|------------------|-------------------------------|
| `npm run dev`    | Start dev server with HMR     |
| `npm run build`  | Production build              |
| `npm run start`  | Serve production build        |
| `npm run lint`   | Run Next.js / ESLint checks   |

## Related

- **EDU-AI-asistent-API** — Laravel backend (separate repository)
- **EDU-AI-asistent-APP** — Flutter mobile/web client (separate repository)

## License

See `LICENSE`.
