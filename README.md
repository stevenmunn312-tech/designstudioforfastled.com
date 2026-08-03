# FastLED Community

A standalone community website for publishing, discovering, and remixing FastLED patterns. This repository is deliberately separate from the Design Studio application.

## Included

- Branded, responsive homepage
- Searchable and filterable pattern gallery
- Supabase email/password authentication flow
- Authenticated pattern upload with private Supabase Storage
- Moderation-ready Postgres schema and row-level security
- Cloudflare Workers deployment through OpenNext
- Pull-request validation on Linux

## Start locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

The public experience works with curated starter patterns before Supabase is connected. Sign-in and uploads explain that configuration is required instead of failing silently.

See [docs/SETUP.md](docs/SETUP.md) for Supabase, Cloudflare, security, and moderation setup.

## Project shape

```text
src/app/                 Next.js routes and server actions
src/components/          Shared interface components
src/lib/supabase/        Browser, server, and session clients
supabase/migrations/     Database, storage, and RLS policies
docs/                    Operator setup notes
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Next.js development |
| `npm run lint` | Source checks |
| `npm run build` | Production Next.js build |
| `npm run build:worker` | Cloudflare/OpenNext Worker build |
| `npm run preview` | Local Worker preview in a supported environment |
| `npm run deploy` | Deploy the Worker to Cloudflare |
