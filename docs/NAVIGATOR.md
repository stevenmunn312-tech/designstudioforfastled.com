# Documentation navigator

## Setting up

- [Setup](SETUP.md) — local development, Supabase migrations, environment
  variables, and the Cloudflare deploy that runs on every push to `main`.

## Site assets

- [Rendering the "Live authoring" hero loop](devel/hero-loop-render.md) —
  regenerating the seamless Juggle clip on the home page: why it is rendered
  frame-by-frame rather than screen-recorded, how the seam is verified, and
  the ffmpeg and embed steps.

## Patterns and previews

- [Syncing patterns and previews from the app](devel/app-sync.md) — the script
  that pulls the app's built-in library, evaluator and LED renderers into the
  site, what it writes, and how the gallery and detail pages use it.

## Development plans

- [Live preview: remaining work](devel/plans/live-preview-remaining-work.md)
  — handoff for the live-evaluation/gallery-preview feature: what's shipped,
  what's next (audio input, automated ratings, the app release, and the
  evaluator's vendored-copy debt).
