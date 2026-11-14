# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: hobby LED makers who build rigs with Arduino- or ESP32-class boards and FastLED, and who would otherwise write the pattern code by hand in C++. They come to the site to decide whether the app is worth installing, to download it, to browse patterns other people made, and to share their own.

Secondary (served by the same site, not designed for first): performers who use Stage View and the music transport, and newcomers who start from the app's guided Start gallery.

## Product Purpose

The site is the public home of Design Studio for FastLED, a desktop app for designing LED patterns visually. It exists to get makers to download and try the app, and to host a library of patterns they can preview live in the browser, download, and build on. Success is a maker who arrives, understands what the app does, downloads it, and later comes back to browse or share patterns.

## Positioning

Patch a pattern visually and get real FastLED firmware out the other end. Nodes are wired into a graph, the LED matrix responds live while you edit, and the same graph produces C++ firmware or an exportable `.ino`; the graph evaluator and the code generator are designed together. Hand-written FastLED gives you code without the live visual loop; WLED-style tools give you presets without your own firmware.

## Operating Context

- **The published product** is the desktop beta, v0.7.0 at the time of writing, for Windows, macOS (Apple Silicon, plus a separate Intel build) and Linux. Builds are not yet code-signed or notarized, and must only be downloaded from the official GitHub release page. Version and URLs live in `src/lib/app-release.ts`.
- **The hardware workspaces** (Hardware, Graph, Upload and Build Diagram: board and parts selection, pin assignments, compile/flash over USB via a local helper, and printable wiring plans) are on the app's `main` branch; there is no separate Hardware branch. The site presents them without a preview label, as the next release will carry them. The "Learn the Studio" tutorials (`/tutorials`) are filmed on this version.
- **The pattern library** (`/patterns`) holds 62 published patterns, mostly first-party built-ins. Each pattern is a `.fastled-pattern.json` file. Detail pages evaluate the graph live in the browser, can be driven by local music or the room mic, and offer the file for download.
- **Sharing**: makers sign in, upload a pattern exported or shared from Design Studio, and a moderator approves it on the review bench before it is published.
- **Hosting**: Next.js 16 on Cloudflare Workers via OpenNext, with Supabase for auth, Postgres (RLS) and private storage.

## Capabilities and Constraints

- App facts the site may cite (from the app README at the commit noted in `docs/devel/hardware-site-content.md`): 232 modules, 73 included patterns, 16 transition styles, Stage View on F10. Refresh counts and screenshots together when the app changes.
- Hardware support claims belong in the linked beta support matrix. A passing preview or compile does not establish hardware support; untested configurations are experimental.
- Terminology: "pattern" is the shared file and gallery item; "project" is the full app document. The gallery is the **pattern library**: an included library that invites community uploads, not yet a community of many makers.
- Open: how a downloaded `.fastled-pattern.json` is opened in the app. Do not describe an import path until it is confirmed.

## Brand Commitments

- Name: "Design Studio for FastLED".
- LED-dot pixel wordmark: `public/brand/design-studio-wordmark.png`.
- Free, with an MIT-licensed core.
- Copy states concrete, checkable facts and plain caveats rather than marketing claims.

## Evidence on Hand

- App screenshots: `public/app/` and `public/app/hardware/` (Hardware-branch screenshots, copied from the app repo).
- Pattern motion: captured clips and live in-browser evaluation for every published pattern; `public/app/juggle-loop.{mp4,webm}`.
- Open-source badge: `public/badges/open-source-badge.png`. OG image: `public/og.png`.
- None of the following exist, so none may be invented: photos or video of physical LED builds, testimonials, user counts, press, or download counts beyond what the database records.

## Product Principles

- Show the light, don't describe it. The live, moving pattern is the strongest proof the product has.
- Lead with what a maker can use today: the published download.
- Every claim is checkable: counts come from the app, hardware support from the support matrix, community size from the database.
- Respect the maker's time: plain language first, toolchain detail when they ask for it.
