# Design Studio for FastLED setup

This project is intentionally separate from the Design Studio application. It owns only the public community experience, member authentication, shared pattern metadata, and pattern-file uploads.

## 1. Local development

Requirements:

- Node.js 24
- npm 11 or newer
- A Supabase project (optional for browsing the starter gallery; required for sign-in and uploads)

Install and start the site:

```bash
npm install
copy .env.example .env.local
npm run dev
```

The homepage and gallery use curated starter content until Supabase is configured. This makes design review possible without sharing credentials.

## 2. Supabase

1. Open the existing `Design-Studio-for-FastLED` Supabase project.
2. Open the SQL editor and run `supabase/migrations/202608030001_initial_community_schema.sql`.
3. In **Project settings → API**, copy the project URL and publishable key into `.env.local`.
4. In **Authentication → URL configuration**, add:
   - `http://localhost:3000/auth/callback`
   - the production callback, such as `https://designstudioforfastled.com/auth/callback`
5. Keep email confirmation enabled for production.

The migration creates:

- member profiles linked to Supabase Auth;
- pattern metadata with moderation state;
- a private `pattern-files` Storage bucket;
- row-level security so members can only write their own records and files.

Never expose a Supabase secret or service-role key to the browser. This scaffold only uses the publishable key and relies on row-level security.

## 3. Cloudflare Workers with OpenNext

The project includes `wrangler.jsonc`, `open-next.config.ts`, and Worker scripts. OpenNext builds should run on Linux or macOS; on Windows, use WSL or let GitHub Actions/Cloudflare build the branch.

The session-refresh layer deliberately uses the legacy `middleware.ts` filename. Next.js 16 normally prefers `proxy.ts`, but OpenNext currently supports Edge middleware and not the newer Node middleware output. This compatibility shim can move back to `proxy.ts` when OpenNext adds support.

To preview the Worker build in a supported environment:

```bash
copy .dev.vars.example .dev.vars
npm run preview
```

To deploy from a supported environment:

```bash
npx wrangler login
npm run deploy
```

For a Git-connected Cloudflare deployment, use:

- Build command: `npm run build:worker`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Node version: `24`

Add these environment variables in Cloudflare rather than committing them:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

## 4. Moderation workflow

New uploads are created with `status = 'pending'` and `published = false`. A future moderator surface or trusted server process should set `status = 'approved'` and `published = true` after inspecting the pattern file and description. Do not put a service-role key into this web application merely to approve records.

## 5. Checks

```bash
npm run lint
npm run build
```

Pull requests also run a Linux OpenNext Worker build through GitHub Actions.
