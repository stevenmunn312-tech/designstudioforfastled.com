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
2. Open the SQL editor and run the files in `supabase/migrations/` in filename order.
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

### Deployment

Every push to `main` builds and deploys the Worker through the `deploy` job in
`.github/workflows/ci.yml`, after `validate` passes. There is nothing to run by
hand, and the Windows caveat above stops mattering — the deploy runs on Linux.

The job needs four values on the repository, none of which are committed:

| Name | Kind | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Actions **variable** | Inlined into the bundle at build time |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Actions **variable** | Inlined into the bundle at build time |
| `CLOUDFLARE_API_TOKEN` | Actions **secret** | Authenticates `wrangler` |
| `CLOUDFLARE_ACCOUNT_ID` | Actions **secret** | Selects the account to deploy into |

The two Supabase values are variables rather than secrets on purpose. Both are
public — they are inlined into a bundle anyone can read — so masking them in
the build log buys nothing and makes a failed build harder to read. The
Cloudflare pair are real credentials and stay secrets.

If either Supabase variable is missing the deploy fails on a guard step before
building. That is deliberate: `getSupabaseConfig()` reads them from the bundle,
so a build without them produces a site whose gallery is empty and whose
sign-in is dead, with nothing in any log to say why.

Deploys are serialised through a `deploy-production` concurrency group, so two
merges in quick succession queue instead of racing each other onto the domain.

To deploy by hand anyway — a rollback, or a Cloudflare-side outage in Actions:

```bash
npx wrangler login
npm run deploy
```

`NEXT_PUBLIC_SITE_URL` is deliberately absent from the table. It is a public
value with one correct production setting, so it lives in the committed
`.env.production`.

### Why the site URL is committed

Every `NEXT_PUBLIC_*` value is inlined into the bundle when the site is built,
and Next.js loads `.env.local` during a production build as well as in
development. A site URL left in `.env.local` therefore outranks
`.env.production` and ships to the deployed site, where it breaks OG and
Twitter image URLs (`metadataBase`) and the Supabase signup confirmation
redirect.

If your dev server runs on a non-default host or port, put the override in
`.env.development.local`. That file is only read when `NODE_ENV=development`,
so `next build` cannot pick it up.

## 4. Moderation workflow

New uploads are created with `status = 'pending'` and `published = false`. The second migration adds the protected `/review` workbench and a database function that changes only moderation fields.

Assign a reviewer by email in the Supabase SQL editor:

```sql
insert into public.moderators (user_id)
select id from auth.users where email = 'reviewer@example.com'
on conflict (user_id) do nothing;
```

Replace the example address with the account that should review patterns. Reviewers can inspect private files, approve a pattern for immediate publication, or reject it. Regular uploaders cannot grant themselves moderator access or publish their own submissions. No secret or service-role key is used by the website.

The third migration allows public downloads only when the matching pattern is both approved and published. Detail pages create short-lived signed links; pending and rejected files remain private.

### Managing published patterns

`202608030008_moderator_pattern_management.sql` adds an **All patterns** section to `/review`, covering every pattern in any state:

- **Edit** — title, description, controller, LED count, tags, preview colours, Studio Score, status and published flag. Likes, downloads and the uploaded source file are deliberately not editable: the counters are community-earned, and the file is the maker's artefact.
- **Archive** — reversible. Sets `archived = true`, which removes the pattern from the gallery, its detail page and public file downloads. Both storage gates (`is_published_pattern_file`, `is_published_pattern_preview`) check the flag, so an archived pattern's source file and clip stop being fetchable even by object path.
- **Purge** — permanent, and only offered once a pattern is archived. `purge_pattern()` rejects any pattern that is not archived, so the two-step holds even if the RPC is called directly. The server action removes both storage objects before deleting the row, because the row is the only record of where those objects live.

Deploy order matters: apply this migration **before** deploying the code that uses it. The gallery, detail pages and `/review` all filter on `archived`, and querying a column the database does not have yet will fail those pages. Since `main` deploys itself, "before deploying" now means before the merge, not after it.

## 5. Checks

```bash
npm run lint
npm run build
```

Pull requests also run a Linux OpenNext Worker build through GitHub Actions. On
`main` that same check gates the deploy described in section 3.
