---
name: Design Studio for FastLED
description: Hardware sitting in darkness, lit only by the pattern it runs.
colors:
  tungsten-amber: "#ffb347"
  tungsten-amber-hot: "#ffc977"
  tungsten-ink: "#2e1a00"
  ember: "#ff6a3d"
  studio-black: "#0b0e12"
  footage-black: "#000000"
  studio-rule: "#1f242b"
  quiet-edge: "#39342d"
  unlit-filament: "#3a3128"
  studio-bright: "#f7f3ec"
  studio-text: "#d3cdc4"
  studio-soft: "#b9b2a8"
  studio-muted: "#948c82"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(44px, 4.8vw, 76px)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(32px, 3.6vw, 52px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(26px, 2.4vw, 34px)"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0.04em"
  numeral:
    fontFamily: "Audiowide, sans-serif"
    fontSize: "clamp(76px, 8vw, 116px)"
    fontWeight: 400
    lineHeight: 1
  closing:
    fontFamily: "Audiowide, sans-serif"
    fontSize: "clamp(38px, 6vw, 88px)"
    fontWeight: 400
    lineHeight: 1.05
rounded:
  rule: "3px"
  tag: "8px"
  control: "12px"
spacing:
  gutter: "32px"
  gutter-mobile: "20px"
  container: "1240px"
  section: "112px"
  section-mobile: "80px"
  step-gap: "104px"
components:
  button-primary:
    backgroundColor: "{colors.tungsten-amber}"
    textColor: "{colors.tungsten-ink}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.tungsten-amber-hot}"
  button-quiet:
    textColor: "{colors.studio-bright}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "52px"
  text-link:
    textColor: "{colors.tungsten-amber}"
  preview-tag:
    textColor: "{colors.ember}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "6px 10px"
  slate-rule:
    backgroundColor: "{colors.tungsten-amber}"
    rounded: "{rounded.rule}"
    width: "72px"
    height: "5px"
  pattern-card:
    backgroundColor: "{colors.studio-black}"
    rounded: "{rounded.control}"
---

# Design System: Design Studio for FastLED

## Overview

**Creative North Star: "The Lit Bench"**

The site is the home of the "Learn the Studio" series: an LED matrix and its board on a bench in a dark room, with the only light coming from the pattern running on them. Everything else is studio black and warm neutral type. The one designed light is tungsten amber, which marks what to do (the download), where you are in the story (slate numerals and rules), and what you can follow (links). Footage, stills and live pattern previews supply all the other colour, and none of it belongs to the palette.

Density is low and cinematic: one idea per section, long vertical spacing, stills set straight on the dark with feathered edges rather than in frames or panels. Type does the structure. Inter carries headlines and reading, JetBrains Mono carries facts and captions, and Audiowide, the series' slate face, appears only on step numerals and the closing line.

Motion is light, not movement. As a section enters view, its light comes up once from an already readable state, and reduced motion shows the lit state straight away. The world rejects the split hero (copy beside an app screenshot) with a feature-card grid below, and it rejects glass, panels and decorative gradient fills.

**Current scope.** The whole public site is on this system: the home page, the shared header and footer, the pattern library (`/patterns`), pattern detail (`/patterns/[id]`), upload and sign-in. The tokens live on `:root` in `globals.css`, and the site loads only the three series faces. The one exception is the moderator review bench (`/review`), which is not a public page: it reads the legacy token names (`--ink`, `--cyan`, `--font-display` and the rest), which now resolve to the studio palette and faces, but keeps its older workbench panels and kicker labels.

**Key Characteristics:**
- Studio-black ground; colour comes from footage and live previews, not from surfaces.
- One accent, tungsten amber, rationed to actions, numerals, slate rules and links.
- Stills unframed, feathered into the dark by masks.
- Sections separated by thin rules and space, never by boxes.
- Glow (soft amber text-shadow) is the one depth effect, reserved for lit elements.

## Colors

A near-black studio with warm off-white type and a single tungsten filament of colour.

### Primary
- **Tungsten Amber** (`--accent`): the primary button fill, step numerals, slate rules, the hero headline's second line, text links, list markers in release notes, the dotted signal links in the step 03 flow, and the recoloured LED-dot wordmark and favicon. Also tints the hero facts line (mixed 72% with Studio Muted).
- **Hot Filament** (`--accent-strong`): primary button hover only.
- **Tungsten Ink** (`--accent-ink`): text on the amber button.

### Secondary
- **Ember** (`--ember`): the Hardware preview status tag only (text plus a 45% ember border). It marks "not the published release"; it is never a second decorative accent.

### Neutral
- **Studio Black**: the page ground for every section.
- **Footage Black**: behind the hero loop and inside live pattern previews, so footage edges dissolve.
- **Studio Rule**: 1px section dividers, download-list rules and pattern card borders.
- **Quiet Edge**: the 1px border of the quiet button.
- **Unlit Filament**: the dark starting colour of numerals and rules before they light up.
- **Studio Bright**: headlines, titles, platform names.
- **Studio Text**: default body text.
- **Studio Soft**: secondary paragraphs, step copy, flow sublabels.
- **Studio Muted**: captions, credits, notes, card metadata.

### Named Rules
**The One Filament Rule.** Tungsten amber is the only designed light. It marks the action, the slate (numeral plus rule), links, and the headline's promise line. Nothing else is amber, and no other hue is added to the palette; colour beyond that comes from footage and live previews.

**The Amber Is the Link Rule.** On the dark, amber text is a link and needs no other device at rest; underline appears on hover. Plain text is never amber unless it is a numeral, a headline promise or the facts line.

**The Ember Means Preview Rule.** Ember appears only on preview or status tags that separate unreleased work from the published download.

## Typography

**Display Font:** Inter (with system-ui, sans-serif)
**Body Font:** Inter (with system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with monospace)
**Slate Font:** Audiowide (with sans-serif)

**Character:** Heavy, tightly tracked Inter headlines read like episode titles; mono captions read like on-screen data; Audiowide appears only where the series puts it, on slate numerals and the sign-off.

### Hierarchy
- **Display** (Inter 800, clamp 44-76px, line-height 1.02, -0.035em): the hero headline only, max 10em wide, balanced. Its second line is set in amber with a soft glow. On mobile, clamp 36-56px.
- **Headline** (Inter 700, clamp 32-52px, line-height 1.08, -0.025em): section titles, balanced.
- **Title** (Inter 700, clamp 26-34px, -0.02em): step titles. Smaller titles (release heading 20px/600, card names 18px/700, platform names 18px/600) follow the same face.
- **Body** (Inter 400, 17px, line-height 1.65): step and section copy at 40-52ch; hero lede 18px/1.6 at 44ch; notes 14-15px/1.6.
- **Label** (JetBrains Mono 400, 12-13px): captions, footage credit, flow sublabels, card metadata (11px), the preview tag (0.08em). The hero facts line is the one uppercase use: 12px, 0.2em tracking, tinted amber.
- **Numeral** (Audiowide 400, clamp 76-116px, line-height 1): step numerals 01-04, amber with glow.
- **Closing** (Audiowide 400, clamp 38-88px, line-height 1.05): the single sign-off line before the footer, Studio Bright with amber glow.

### Named Rules
**The Slate Face Rule.** Audiowide is for numerals and the one closing line. It never sets headlines, body, buttons or labels.

**The Mono Is Data Rule.** JetBrains Mono sets facts, captions, credits and metadata only, never reading paragraphs or headlines.

## Layout

A single centred column, `min(1240px, 100% - 64px)` wide (20px gutters under 820px). Sections stack full width on the same black, separated by 1px Studio Rule borders and generous vertical padding: 112-150px on desktop, 80-104px on mobile.

The hero is full-bleed and at most `min(100svh - 76px, 880px)` tall. The footage occupies the right two-thirds (inset from 34%), masked to fade in from the left, and the copy sits in the dark left third. Under 820px the footage stacks on top at 16:10, fading out at the bottom, and both hero buttons go full width.

Two-column sections use asymmetric fractions: steps 4fr / 7fr (copy, still), download and hardware 7fr / 5fr, section heads 1fr / 1fr aligned to the baseline. Steps sit 104px apart (72px on mobile). Everything collapses to one column at 980px (two-column grids) and 820px (steps, flow). The pattern strip is 4 columns, then 2 at 980px, then 1 at 560px.

## Elevation & Depth

Flat. There are no panels, glass or drop shadows on surfaces, and the home world removes the legacy card shadows. Depth comes from light: a soft amber glow on lit elements, and masks that feather footage and stills into the black.

### Shadow Vocabulary
- **Lit glyph** (`text-shadow: 0 0 38-46px rgba(255,179,71,.38)`): step numerals, the amber headline line and the closing line.
- **Lit rule** (`box-shadow: 0 0 18px rgba(255,179,71,.6)`): slate rules only.

### Named Rules
**The Only Light Rule.** Glow belongs to things that are lit: amber numerals, slate rules, the headline promise and the closing line. Boxes, cards and buttons never cast shadows.

**The Feathered Still Rule.** Stills and footage have no frame, border or radius. They fade into the ground through linear-gradient masks: about 9% at the sides and 11% at top and bottom for stills, a left-to-right fade for the hero.

## Shapes

Soft but restrained: 12px corners on buttons and pattern cards, 8px on the preview tag, 3px on the 72 x 5px slate rule. Lines are 1px rules in Studio Rule. Live previews inside cards are square-edged on footage black. Stills are never clipped to a shape.

## Components

### Buttons
Confident and few: one amber action and one quiet companion.
- **Shape:** gently rounded (12px), 52px minimum height, 22px horizontal padding, Inter 600 16px, icon gap 10px.
- **Primary:** Tungsten Amber fill with Tungsten Ink text, a download icon leading. One primary per view.
- **Hover / Focus:** primary moves to Hot Filament; quiet button's border turns amber. Transitions on background, border and colour, 0.2s ease.
- **Quiet:** Studio Bright text on translucent studio black (66%) with a 1px Quiet Edge border, trailing arrow.

### Text Links
- Amber, Inter 600, trailing 15px arrow, underline on hover (4px offset). Grouped in rows with 14px / 32px gaps.

### Cards / Containers
- **Pattern card:** the shared library card, the same on the home strip and in the gallery: Studio Black background, Studio Rule border, 12px corners, no shadow; hover turns the border amber at 45%. The live preview fills the top edge to edge on footage black with its chrome hidden; title in Inter 18/700, metadata in mono 11px Studio Muted. The read-only star rating is neutral (Studio Text on a Quiet Edge track) because it is data.
- No other containers; content sits on the ground. Notices (account required, the app handoff receipt, the gallery invitation) are rows between rules, not boxes.

### Navigation
- **Header:** full-bleed studio black with a 1px Studio Rule along the bottom, and its content held to the 1240px column. The wordmark sits on the left, route links are centred (Inter 15/500, Studio Soft, Studio Bright on hover) and a 40px quiet "Sign in" button sits on the right. The current page is marked by a 2px amber rule drawn on the header's own line, which is the one place nav uses amber. Below 980px the links fold into a disclosure panel on the same black, separated by rules, with the current page in amber.
- **Footer:** full-bleed top rule; the wordmark and a one-line description on the left, route links in Studio Soft (amber on hover), and the mono sign-off line on the right.
- **Where-you-are indicator:** the same 2px amber rule under the active label marks the current page in the header, the active gallery filter and the selected sign-in tab.

### Page Heads
On every page below the home hero, a Headline-sized title and its lede sit side by side on the baseline (1fr / 1fr), as the home section heads do. The title's second line is set in Studio Soft, unlit, because amber belongs to the home hero's promise line alone. Pages have no kicker labels.

### Forms
- **Fields:** transparent on the ground with a 1px Quiet Edge border, 12px corners, 48-52px tall, Inter 16px in Studio Bright, and a Studio Muted placeholder. The border turns amber on focus and an amber outline marks keyboard focus. Labels are Inter 14/600 in Studio Text; mono is never used for labels.
- **Form steps:** numbered form sections use the slate numeral at 40px (Audiowide, amber, lit glyph).
- **Drop zone:** a 1px dashed Quiet Edge outline with 12px corners, which turns solid once a file is attached.
- **Status messages:** form, rating and transport results use two status tones, error `#ff9aa9` and success `#7fdcb4`, as text inside a 1px 40% outline. They are status, not palette, and appear nowhere else.

### Pattern Stage
The detail page's Stage layout (matrix left, deck right) sits between 1px rules, with a vertical rule between its columns and no panels. The matrix is square-edged on footage black. Instrument captions ("Output matrix", "Spectrum", "Transport") and readouts are mono Studio Muted. Transport controls are 40px quiet squares with 12px corners. Play is filled Studio Bright rather than amber, because the page's single amber action is Download. The played part of the progress bar is the one amber element on the deck. Facts, the rating input (chosen stars light amber) and Download sit beneath the deck, each separated by a rule.

### Slate (Signature Component)
A step numeral in Audiowide amber, title, body, and a 72 x 5px amber rule closing the copy. As it enters view, the numeral and rule fade from Unlit Filament to amber with glow (scroll-driven `view()` timeline, entry 0% to cover 35%). Without support or with reduced motion they show lit. The same rule, without animation, closes the release notes in the download section.

### Signal Flow
A labelled diagram (source, link, stage, link, destination) used in place of a still when the labels must stay legible. Stages are Inter 700 Studio Bright with a mono sublabel; links are a dotted amber cable (1.5px dots every 10px) with a mono caption above. It runs horizontally on desktop and vertically under 820px.

### Download List
Platform rows of at least 60px between 1px Studio Rule lines: platform name in Studio Bright (amber on hover), details in mono Studio Muted, an alternate build as an amber mono link on the right.

### Preview Tag
An Ember mono label (12px, 0.08em) in a 1px 45% ember outline with 8px corners, beneath the hardware headline.

## Do's and Don'ts

### Do:
- **Do** set every section on Studio Black, separated by 1px Studio Rule lines and 80-150px of space.
- **Do** let footage and live previews supply colour; feather stills into the dark with masks.
- **Do** keep amber to the action, slate numerals and rules, links, the headline promise line, and the dotted signal cable.
- **Do** use Audiowide only for slate numerals and the closing line.
- **Do** bring light up once per section from a readable state, and show the lit state under reduced motion.
- **Do** mark unreleased work with the Ember preview tag.

### Don't:
- **Don't** add a second accent hue, or recolour the series' per-episode hues back in; the scheme is one tungsten accent.
- **Don't** box stills or footage in frames, borders, radii or device mockups.
- **Don't** use panels, glass, decorative gradient fills or drop shadows on cards and buttons; gradients exist only as feathering masks and the dotted cable.
- **Don't** build a split hero of copy beside an app screenshot with a feature-card grid below.
- **Don't** put eyebrow or kicker labels above headlines; mono is for facts and captions only.
- **Don't** use amber for plain emphasis in running text; on this ground amber means a link.
