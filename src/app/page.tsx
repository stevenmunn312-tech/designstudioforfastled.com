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
  Network,
  NotebookPen,
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
import { appRelease, detectDownloadTarget, downloadTargets, hardwareDevelopment } from "@/lib/app-release";

const features = [
  {
    id: "start",
    kicker: "Start gallery",
    heading: ["Start with a spark,", "not a blank canvas."],
    body: "Start with Juggle, Fire, live audio, field warping, or a slideshow. Guided control patches show how a knob, button, or encoder reaches the LEDs through a visible cable. Each starter includes a note explaining what to try next.",
    points: [
      "Guided starters for patterns, shows, and physical controls",
      "Quick recipes drop whole audio-reactive chains on the canvas",
      "Blank canvas is always one click away",
    ],
    image: "/app/hardware/design-studio-start-gallery.webp",
    caption: "Start Gallery",
    alt: "The Hardware branch Start Gallery with guided patches for patterns, audio, fields, and shows",
  },
  {
    id: "canvas",
    kicker: "Live authoring",
    heading: ["Move a slider,", "see it immediately."],
    body: "Wire typed, colour-coded nodes into a patch and the matrix responds while you drag. Every frame-producing node carries its own preview, so you can read the signal at any point in the chain instead of guessing.",
    points: [
      { emoji: "⚡", label: "Live Signal Inspection", text: "Every frame-producing node shows its own local preview so you can debug signal flows instantly." },
      { emoji: "🔌", label: "Smart Cable Snap", text: "Drag a cable onto open canvas—only compatible input nodes appear." },
      { emoji: "🛡️", label: "Graph Health", text: "Check incomplete wiring, pin conflicts, board compatibility, and memory pressure before upload." },
    ],
    image: "/app/hardware/design-studio-patch.webp",
    caption: "Graph workspace",
    alt: "A Fire 2012 patch connected to an LED Matrix in the Graph workspace",
  },
  {
    id: "library",
    kicker: "Node library",
    heading: ["232 modules,", "room to experiment."],
    body: "Patterns, simulations, colour, fields, effects, audio, logic, show control, hardware input, and output. Turn any patch into a Group, save it to the Pattern Library, and reuse it in the next show.",
    points: [
      "73 included patterns to explore and adapt",
      "Custom shelves you can create, drag between, and remove",
      "Personal patterns mirrored to disk as shareable JSON",
    ],
    image: "/app/hardware/design-studio-pattern-library.webp",
    caption: "Pattern Library",
    alt: "The Pattern Library panel open beside a live Field Warp patch",
  },
  {
    id: "stage",
    kicker: "Performance",
    heading: ["Put the visuals", "centre stage."],
    body: "Press Stage View or F10 and the workspace becomes a clean performance view. The output matrix takes the room while spectrum, transport, frame rate, memory, and signal state stay in reach. Esc returns to the editor.",
    points: [
      "Live Focus, Control Deck, Stage View, and music transport",
      "16 transition styles and beat-driven particle bursts",
      "Toggle the 3D presentation or cycle spectrum styles live",
    ],
    image: "/app/design-studio-stage.png",
    caption: "Stage View",
    alt: "Stage View showing a full-screen live LED matrix with spectrum and transport controls",
  },
] as const;

const hardwareCards = [
  {
    icon: Cpu,
    title: "Hardware",
    body: "Choose the exact board and add your parts from the Hardware shelf. Inspect physical modules, board-aware GPIO choices, and the rig at a shared scale.",
  },
  {
    icon: Network,
    title: "Graph",
    body: "Connect patterns, effects, and hardware signals. Wire buttons, knobs, and sensors into the same graph that drives your LED output.",
  },
  {
    icon: Usb,
    title: "Upload",
    body: "Resolve Graph Health issues, check capacity, select a serial port, and flash firmware. Follow progress in the embedded Output/Serial console.",
  },
  {
    icon: NotebookPen,
    title: "Build Diagram",
    body: "Take the wiring plan to the bench: real controller pin maps, power distribution, fuse blocks, CSV parts and connection lists, and printable assembly sheets.",
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
            <p className="studio-kicker"><span /> Hardware branch · development preview</p>
            <h1>Design the light.<br /><em>Build the rig.</em></h1>
            <p>
              Choose your board and parts, connect the signals, and turn your LED design into firmware and a wiring plan. One project, from the first pattern to the physical build.
            </p>
            <div className="hero-actions">
              <a className="button button-gradient" href={hardwareDevelopment.setupUrl} target="_blank" rel="noreferrer">Try the Hardware branch <ArrowRight size={17} /></a>
              <a className="button button-outline" href="#hardware">Explore the workspaces</a>
            </div>
            <a className="studio-text-link" href="#download">Published beta downloads <Download size={14} /></a>
            <div className="hero-trust">
              <span><CheckCircle2 size={13} /> Free · MIT core</span>
              <span><Boxes size={13} /> 232 modules</span>
              <span><Monitor size={13} /> Windows · macOS · Linux</span>
            </div>
          </div>

          <div className="studio-hero-preview">
            <figure className="app-shot app-shot-hero">
              <figcaption>
                <i /> Design Studio for FastLED <strong>Hardware branch</strong>
              </figcaption>
              <Image
                src="/app/hardware/design-studio-overview.webp"
                alt="A Field Warp patch running in the Hardware branch of Design Studio for FastLED"
                width={1600}
                height={900}
                preload
              />
            </figure>
            <div className="hero-project-chip">
              <span>One project</span>
              <strong>Four workspaces</strong>
              <small>parts · signals · firmware · wiring</small>
            </div>
          </div>
        </section>

        <div className="studio-signal-strip" aria-hidden="true">
          <span className="rail-lime" /> INPUT <i /> AUDIO <span className="rail-green" /> SIGNALS <i /> COLOR <span className="rail-cyan" /> PATTERNS <i /> FIELDS <span className="rail-blue" /> EFFECTS <i /> SHOW <span className="rail-magenta" /> OUTPUT
        </div>

        <section className="graph-section" id="hardware">
          <div className="shell">
            <div className="studio-section-heading graph-heading">
              <div>
                <p className="studio-kicker"><span /> Hardware · Graph · Upload · Build Diagram</p>
                <h2>Four workspaces.<br /><em>One physical build.</em></h2>
              </div>
              <p>The Board owns brightness, power cap, and controller settings. The LED output owns dimensions, layout, and colour correction. Their wiring and signals stay connected across the project.</p>
            </div>
            <figure className="app-shot hardware-workspace-shot">
              <figcaption>
                <i /> Hardware workspace <strong>Board · parts · wiring</strong>
              </figcaption>
              <Image
                src="/app/hardware/design-studio-hardware.webp"
                alt="The Hardware shelf beside an ESP32 board connected to a 16 by 16 LED matrix at a shared physical scale"
                width={1600}
                height={900}
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
                Check capacity compiles for the selected board without flashing and reports measured flash/RAM use when the toolchain provides it. Flash Wiring Test checks the physical LEDs; Flash Stream Receiver and Live Stream send preview frames over USB. A passing preview or compile does not establish hardware support. See the <a href={hardwareDevelopment.supportUrl} target="_blank" rel="noreferrer">Hardware branch support matrix</a> for exact validated combinations; other configurations remain experimental.
              </p>
            </div>
            <div className="hardware-guides">
              <a className="studio-text-link" href={hardwareDevelopment.firstProjectUrl} target="_blank" rel="noreferrer">Build your first project <ArrowRight size={14} /></a>
              <a className="studio-text-link" href={hardwareDevelopment.guideUrl} target="_blank" rel="noreferrer">Read the hardware guide <ArrowRight size={14} /></a>
            </div>
          </div>
        </section>

        <section className="studio-section download-section shell" id="download">
          <div className="studio-section-heading">
            <div>
              <p className="studio-kicker"><span /> Published desktop beta</p>
              <h2>Download v{appRelease.version}.<br /><em>Or build what’s next.</em></h2>
              <p className="download-description">The portable v{appRelease.version} release is separate from the Hardware branch shown here. Use the source setup for the four-workspace experience.</p>
              {detectedTarget && (
                <div className="download-primary">
                  <a className="button button-gradient" href={detectedTarget.url}>
                    <Download size={17} /> v{appRelease.version} for {detectedTarget.label}
                  </a>
                  <span>v{appRelease.version} · {detectedTarget.detail}</span>
                </div>
              )}
              <div className="download-platforms" aria-label="All desktop beta downloads">
                {downloadTargets.map((target) => (
                  <div key={target.id}>
                    <a href={target.url}>{target.label} <span>{target.detail}</span></a>
                    {"secondary" in target && <a href={target.secondary.url}>{target.secondary.label}</a>}
                  </div>
                ))}
              </div>
              <a className="studio-text-link" href={appRelease.releaseUrl} target="_blank" rel="noreferrer">Read v{appRelease.version} release notes <ArrowRight size={14} /></a>
            </div>
            <div className="release-spotlight">
              <p className="studio-kicker"><span /> Active development</p>
              <h3>Get the Hardware workspace from source.</h3>
              <p>
                The Hardware branch brings the physical rig into the project: exact boards, parts, pin assignments, and assembly plans. It is a development build; hardware support depends on the exact tested configuration.
              </p>
              <ul className="release-highlights">
                <li><CheckCircle2 size={14} /> Browser authoring, preview, and code export work without the local helper.</li>
                <li><CheckCircle2 size={14} /> Compilation, USB upload, serial monitoring, and live streaming require the helper.</li>
                <li><CheckCircle2 size={14} /> Follow the branch setup guide for Node.js, Python, and build tools.</li>
              </ul>
              <div className="release-spotlight-links">
                <a className="studio-text-link" href={hardwareDevelopment.setupUrl} target="_blank" rel="noreferrer">Set up the Hardware branch <ArrowRight size={14} /></a>
                <a className="studio-text-link" href={hardwareDevelopment.helperUrl} target="_blank" rel="noreferrer">Set up the upload helper <ArrowRight size={14} /></a>
              </div>
            </div>
          </div>
          <p className="download-note">
            Public beta archives are not yet code-signed or notarized. Only run builds downloaded from the <a href={appRelease.releasesUrl} target="_blank" rel="noreferrer">official release page</a>. <a href={hardwareDevelopment.sourceUrl} target="_blank" rel="noreferrer">Browse the Hardware branch source</a>.
          </p>
        </section>

        <section className="studio-section feature-section shell" id="features">
          <div className="studio-section-heading">
            <div>
              <p className="studio-kicker"><span /> Inside the app</p>
              <h2>Everything between<br /><em>idea and LEDs.</em></h2>
              <p>Design, preview, and prepare firmware in one project. The graph evaluator and C++ generator are designed together; check the support matrix for combinations validated on real hardware.</p>
            </div>
            <ul className="feature-value-props">
              <li><Cpu size={20} aria-hidden="true" /> <span><strong>Your physical rig:</strong> Board profiles, parts, and pin assignments belong to the project.</span></li>
              <li><Radio size={20} aria-hidden="true" /> <span><strong>Visible control paths:</strong> Connect buttons, knobs, sensors, and audio to the design.</span></li>
              <li><FileCode2 size={20} aria-hidden="true" /> <span><strong>Portable output:</strong> Inspect generated code or export an .ino to build yourself.</span></li>
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
                  <Image src={feature.image} alt={feature.alt} width={feature.id === "stage" ? 1440 : 1600} height={900} loading="lazy" />
                </figure>
              </article>
            ))}
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
            <h2>From a first pattern<br /><em>to your next build.</em></h2>
          </div>
          <div>
            <Sparkles size={28} />
            <p>Start with a guided patch, choose the parts on your bench, and follow the project through to firmware. Free and MIT-licensed at its core. Share your patterns with the community as you build.</p>
            <a className="button button-gradient" href={hardwareDevelopment.setupUrl} target="_blank" rel="noreferrer">Try the Hardware branch <ArrowRight size={17} /></a>
            <Link className="studio-text-link" href="/upload">Share a project instead <ArrowRight size={14} /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
