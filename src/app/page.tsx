import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Cpu,
  Download,
  FileCode2,
  Gauge,
  Monitor,
  Radio,
  Sparkles,
  UploadCloud,
  Usb,
} from "lucide-react";
import { PatternCard } from "@/components/pattern-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { headers } from "next/headers";
import { getPublishedPatterns } from "@/lib/published-patterns";
import { appRelease, detectDownloadTarget, downloadTargets } from "@/lib/app-release";

const features = [
  {
    id: "start",
    kicker: "Start gallery",
    heading: ["Start with a spark,", "not a blank canvas."],
    body: "Guided patches for Juggle, Fire, scrolling text, live audio, field warping, generative shows, and music-synced SD playback. Each starter opens with an editable Comment node telling you what to try next.",
    points: [
      "Eight ready-made starting points",
      "Quick recipes drop whole audio-reactive chains on the canvas",
      "Blank canvas is always one click away",
    ],
    image: "/app/design-studio-start-gallery.png",
    caption: "Start Gallery",
    alt: "The Design Studio Start Gallery showing beginner, audio, field, and show starter patches",
  },
  {
    id: "canvas",
    kicker: "Live authoring",
    heading: ["Move a slider,", "see it immediately."],
    body: "Wire typed, colour-coded nodes into a patch and the matrix responds while you drag. Every frame-producing node carries its own preview, so you can read the signal at any point in the chain instead of guessing.",
    points: [
      { emoji: "⚡", label: "Live Signal Inspection", text: "Every frame-producing node shows its own local preview so you can debug signal flows instantly." },
      { emoji: "🔌", label: "Smart Cable Snap", text: "Drag a cable onto open canvas—only compatible input nodes appear." },
      { emoji: "🛡️", label: "Built-in Safety Checks", text: "Real-time Graph Health alerts you to power limits, pin conflicts, and memory usage before you flash." },
    ],
    image: "/app/design-studio-patch.png",
    caption: "Patch editor",
    alt: "A Juggle pattern wired into Matrix Output with the live LED preview beside it",
  },
  {
    id: "library",
    kicker: "Node library",
    heading: ["151 modules,", "kept on your shelves."],
    body: "Patterns, simulations, colour, fields, effects, audio, logic, show control, hardware input, and output. Turn any patch into a Group, save it to the Pattern Library, and reuse it in the next show.",
    points: [
      "20 curated audio-reactive patterns built in",
      "Custom shelves you can create, drag between, and remove",
      "Personal patterns mirrored to disk as shareable JSON",
    ],
    image: "/app/design-studio-pattern-library.png",
    caption: "Pattern Library",
    alt: "The Pattern Library panel open beside a live Field Warp patch",
  },
  {
    id: "stage",
    kicker: "Performance",
    heading: ["Put the visuals", "centre stage."],
    body: "Press Stage or F10 and the workspace becomes a clean performance view. The output matrix takes the room while spectrum, transport, frame rate, memory, and signal state stay in reach. Esc returns to the editor.",
    points: [
      "Stage Mode, Performance Deck, and music transport",
      "16 transition styles and beat-driven particle bursts",
      "Toggle the 3D presentation or cycle spectrum styles live",
    ],
    image: "/app/design-studio-stage.png",
    caption: "Stage Mode",
    alt: "Stage Mode showing a full-screen live LED matrix with spectrum and transport controls",
  },
] as const;

const hardwareCards = [
  {
    icon: Cpu,
    title: "Upload",
    body: "Compile and flash a standalone FastLED sketch straight from Matrix Output.",
  },
  {
    icon: Radio,
    title: "Flash Wiring Test",
    body: "Check colour order, brightness, orientation, tiles, and pixel order before the graph is finished.",
  },
  {
    icon: Usb,
    title: "Live Stream",
    body: "Flash the receiver once, then send preview frames over USB without recompiling after every edit.",
  },
  {
    icon: FileCode2,
    title: "Export .ino",
    body: "Read, modify, or build the generated sketch yourself — the code is yours either way.",
  },
] as const;

export const dynamic = "force-dynamic";

export default async function Home() {
  const patterns = await getPublishedPatterns(4);
  const userAgent = (await headers()).get("user-agent");
  const detectedTargetId = detectDownloadTarget(userAgent);
  const detectedTarget = downloadTargets.find((target) => target.id === detectedTargetId) ?? null;

  return (
    <>
      <SiteHeader />
      <main className="studio-home">
        <section className="studio-hero shell">
          <div className="studio-hero-copy">
            <p className="studio-kicker"><span /> Free · node-based LED design</p>
            <h1>Wire the Nodes.<br /><em>Light Up the Room.</em></h1>
            <p>
              The visual, node-based workspace for makers, lighting designers, and Arduino/ESP32 developers.
            </p>
            <div className="hero-actions">
              <a className="button button-gradient" href="#download">Download the app <Download size={17} /></a>
              <a className="button button-outline" href="#features">See what it does</a>
            </div>
            <div className="hero-trust">
              <span><CheckCircle2 size={13} /> Public beta</span>
              <span><Boxes size={13} /> 151 modules</span>
              <span><Monitor size={13} /> Windows · macOS · Linux</span>
            </div>
          </div>

          <div className="studio-hero-preview">
            <figure className="app-shot app-shot-hero">
              <figcaption>
                <i /> Design Studio for FastLED <strong>v{appRelease.version}</strong>
              </figcaption>
              <Image
                src="/app/design-studio-overview.png"
                alt="An audio-reactive spectrum patch running in Design Studio for FastLED, with the mic-to-FFT-to-matrix node chain and live LED preview visible"
                width={1440}
                height={900}
                priority
              />
            </figure>
            <div className="hero-project-chip">
              <span>Desktop beta</span>
              <strong>v{appRelease.version}</strong>
              <small>portable · no install</small>
            </div>
          </div>
        </section>

        <div className="studio-signal-strip" aria-hidden="true">
          <span className="rail-lime" /> INPUT <i /> AUDIO <span className="rail-green" /> SIGNALS <i /> COLOR <span className="rail-cyan" /> PATTERNS <i /> FIELDS <span className="rail-blue" /> EFFECTS <i /> SHOW <span className="rail-magenta" /> OUTPUT
        </div>

        <section className="studio-section download-section shell" id="download">
          <div className="studio-section-heading">
            <div>
              <p className="studio-kicker"><span /> Get the app</p>
              <h2>Portable desktop<br /><em>beta, free to run.</em></h2>
              {detectedTarget && (
                <div className="download-primary">
                  <a className="button button-gradient" href={detectedTarget.url}>
                    <Download size={17} /> Download for {detectedTarget.label}
                  </a>
                  <span>v{appRelease.version} · {detectedTarget.detail}</span>
                </div>
              )}
            </div>
            <div className="download-oss-badge">
              <Image
                src="/badges/open-source-badge.png"
                alt="Open Source Software"
                width={1536}
                height={1024}
              />
              <a className="studio-text-link download-oss-badge-link" href={appRelease.releasesUrl} target="_blank" rel="noreferrer">All releases &amp; source <ArrowRight size={14} /></a>
            </div>
          </div>
          <p className="download-note">
            Public beta archives are not yet code-signed or notarized—only run builds downloaded from the official release page above. Prefer to build it yourself? <a href={appRelease.sourceUrl} target="_blank" rel="noreferrer">Run from source on GitHub</a>.
          </p>
        </section>

        <section className="studio-section feature-section shell" id="features">
          <div className="studio-section-heading">
            <div>
              <p className="studio-kicker"><span /> Inside the app</p>
              <h2>Everything between<br /><em>idea and LEDs.</em></h2>
              <p>Design, preview, and deploy from a single window. Our real-time graph evaluator and C++ generator stay 1:1 in sync&mdash;ensuring what you see on screen is exactly what flashes to your microcontroller.</p>
            </div>
            <ul className="feature-value-props">
              <li><span aria-hidden="true">⚡</span> <span><strong>Unified Workflow:</strong> No switching between IDEs, compilers, and previewers.</span></li>
              <li><span aria-hidden="true">🔄</span> <span><strong>1:1 Code Sync:</strong> Live evaluator directly mirrors generated C++ output.</span></li>
              <li><span aria-hidden="true">🎯</span> <span><strong>Hardware-Aware:</strong> Built specifically for FastLED on ESP32, Arduino, and more.</span></li>
            </ul>
          </div>

          <div className="feature-rows">
            {features.map((feature, index) => (
              <article className={`feature-row ${index % 2 === 1 ? "is-flipped" : ""}`} key={feature.id}>
                <div className="feature-copy">
                  <p className="studio-kicker"><span /> {feature.kicker}</p>
                  <h3>{feature.heading[0]}<br /><em>{feature.heading[1]}</em></h3>
                  <p>{feature.body}</p>
                  <ul className="feature-points">
                    {feature.points.map((point) => (
                      typeof point === "string" ? (
                        <li key={point}><CheckCircle2 size={14} /> {point}</li>
                      ) : (
                        <li key={point.label} className="feature-point-emphasis">
                          <span aria-hidden="true">{point.emoji}</span>
                          <span><strong>{point.label}:</strong> {point.text}</span>
                        </li>
                      )
                    ))}
                  </ul>
                </div>
                <figure className="app-shot">
                  <figcaption><i /> {feature.caption}</figcaption>
                  <Image src={feature.image} alt={feature.alt} width={1440} height={900} loading="lazy" />
                </figure>
              </article>
            ))}
          </div>
        </section>

        <section className="graph-section" id="hardware">
          <div className="shell">
            <div className="studio-section-heading graph-heading">
              <div>
                <p className="studio-kicker"><span /> From preview to hardware</p>
                <h2>The same design,<br /><em>running on the strip.</em></h2>
              </div>
              <p>Set the controller, size, chipset, colour order, pins, brightness, layout, and power cap on Matrix Output, then pick the route that fits the moment.</p>
            </div>
            <figure className="app-shot node-to-code-shot">
              <figcaption>
                <i /> Graph → generated sketch <strong>ESP32-S3 · 16 × 16</strong>
              </figcaption>
              <Image
                src="/app/design-studio-node-to-code.webp"
                alt="A live microphone, FFT, and palette graph wired into Matrix Output, with the FastLED C++ sketch it generates printing out beside it"
                width={1561}
                height={1007}
                loading="lazy"
              />
            </figure>
            <div className="hardware-grid">
              {hardwareCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article className="hardware-card" key={card.title}>
                    <div><Icon size={19} /></div>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </article>
                );
              })}
            </div>
            <div className="hardware-note">
              <Gauge size={18} />
              <p>
                Graph Health runs continuously, and the controller-capacity meter performs a real compile-only check against the selected board to report measured flash and RAM use. Hardware support is deliberately narrow during the beta—see the <a href={`${appRelease.sourceUrl}/blob/main/docs/release/beta-support-matrix.md`} target="_blank" rel="noreferrer">beta support matrix</a> for the combinations validated end to end.
              </p>
            </div>
          </div>
        </section>

        {patterns.length > 0 && (
          <section className="studio-section shell">
            <div className="studio-section-heading">
              <div>
                <p className="studio-kicker"><span /> Made with the app</p>
                <h2>Projects from<br /><em>the community.</em></h2>
              </div>
              <div>
                <p>These are moving previews rendered from real Design Studio project files. Open one to inspect it, then download the source and keep building.</p>
                <Link className="studio-text-link" href="/patterns">Browse the library <ArrowRight size={14} /></Link>
              </div>
            </div>
            <div className={`pattern-grid studio-pattern-grid ${patterns.length === 1 ? "single-pattern" : ""}`}>
              {patterns.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} compact />)}
              {patterns.length === 1 && (
                <article className="library-invitation">
                  <UploadCloud size={24} />
                  <span>Open slot</span>
                  <h3>Your project could be next.</h3>
                  <p>Share a Design Studio project and send it through the review bench.</p>
                  <Link href="/upload">Upload a project <ArrowRight size={14} /></Link>
                </article>
              )}
            </div>
          </section>
        )}

        <section className="studio-cta shell">
          <div>
            <p className="studio-kicker"><span /> Ready when you are</p>
            <h2>Download it and<br /><em>light something up.</em></h2>
          </div>
          <div>
            <Sparkles size={28} />
            <p>Free, MIT-licensed at its core, and portable—extract the archive and the Studio opens on its first patch. Built something good? Send it to the community library.</p>
            <a className="button button-gradient" href="#download">Download v{appRelease.version} <Download size={17} /></a>
            <Link className="studio-text-link" href="/upload">Share a project instead <ArrowRight size={14} /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
