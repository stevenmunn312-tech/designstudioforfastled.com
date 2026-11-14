import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { headers } from "next/headers";
import { MotionSafeVideo } from "@/components/motion-safe-video";
import { PatternCard } from "@/components/pattern-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedPatterns } from "@/lib/published-patterns";
import { appRelease, detectDownloadTarget, downloadTargets, hardwareDevelopment } from "@/lib/app-release";

/** The four steps from graph to light. Stills are frames from the "Learn the
 *  Studio" series; step 03 is drawn as a diagram so its labels stay legible. */
const steps = [
  {
    number: "01",
    title: "Patch nodes",
    body: "Drag nodes onto the canvas and wire them together: noise, fields, palettes, audio, effects. Every node that makes frames shows its own preview, so you can read the signal anywhere in the chain.",
    image: "/home/step-patch.webp",
    alt: "Three Field Noise nodes wired through a Field Transform into an LED Matrix node, each showing a live preview",
  },
  {
    number: "02",
    title: "Watch it run",
    body: "The matrix answers while you drag a slider. What the Studio previews is what the board will show, frame for frame.",
    image: "/home/step-preview.webp",
    alt: "The Studio preview and a real 16 by 16 matrix showing the same rainbow pattern side by side",
  },
  {
    number: "03",
    title: "Compile and flash",
    body: "The Studio writes the FastLED code, the build tools compile it, and USB carries it to your board. Prefer to build it yourself? Export the sketch instead.",
    image: null,
    alt: "",
  },
  {
    number: "04",
    title: "Light the rig",
    body: "Strips, rings, matrices and HUB75 panels. The pattern leaves your screen and runs on its own.",
    image: "/home/step-rig.webp",
    alt: "A lit LED strip, a 16 by 16 matrix and an LED ring, each running a colourful pattern",
  },
] as const;

export const dynamic = "force-dynamic";

export default async function Home() {
  const patterns = await getPublishedPatterns(4);
  const userAgent = (await headers()).get("user-agent");
  const detectedTargetId = detectDownloadTarget(userAgent);
  const detectedTarget = downloadTargets.find((target) => target.id === detectedTargetId) ?? null;
  const version = appRelease.version;

  return (
    <>
      <SiteHeader />
      <main className="home">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-footage">
            <MotionSafeVideo
              webm="/home/workbench-loop.webm"
              mp4="/home/workbench-loop.mp4"
              poster="/home/workbench-poster.jpg"
              alt="An ESP32-S3 board on a dark workbench, wired to a WS2812B LED strip that runs a rainbow chase, with a 32 by 32 LED matrix glowing slightly out of focus behind it"
              width={1800}
              height={1200}
              preload
            />
          </div>
          <div className="home-hero-copy">
            <h1 id="home-title">Build LED patterns with nodes. <span>Send them to real lights.</span></h1>
            <p>
              Design Studio for FastLED is a free desktop app. Wire nodes into a graph, watch the matrix answer live, then flash real FastLED firmware to your board.
            </p>
            <div className="home-actions">
              {detectedTarget ? (
                <a className="button button-primary" href={detectedTarget.url}>
                  <Download size={18} aria-hidden="true" /> Download v{version} for {detectedTarget.label}
                </a>
              ) : (
                <a className="button button-primary" href="#download">
                  <Download size={18} aria-hidden="true" /> Download v{version}
                </a>
              )}
              <Link className="button button-quiet" href="/patterns">
                Browse patterns <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <p className="home-facts">v{version} beta · Windows · macOS · Linux · free, MIT core</p>
          </div>
          <p className="home-credit">ESP32-S3, WS2812B strip and a 32×32 matrix, rendered in Blender</p>
        </section>

        <section className="home-steps" aria-labelledby="home-steps-title">
          <div className="shell">
            <h2 id="home-steps-title" className="home-section-title">From graph to light, in four steps.</h2>
            <ol className="home-step-list">
              {steps.map((step) => (
                <li className="home-step" key={step.number}>
                  <div className="home-step-copy">
                    <span className="home-step-number" aria-hidden="true">{step.number}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                  {step.image ? (
                    <figure className="home-step-still">
                      <Image src={step.image} alt={step.alt} width={1280} height={720} loading="lazy" />
                    </figure>
                  ) : (
                    <ol className="home-flow" aria-label="How a pattern reaches the board">
                      <li><strong>The Studio</strong><span>writes the code</span></li>
                      <li className="home-flow-link" aria-hidden="true"><span>FastLED code</span></li>
                      <li><strong>Build tools</strong><span>compile it</span></li>
                      <li className="home-flow-link" aria-hidden="true"><span>USB</span></li>
                      <li><strong>Your board</strong><span>runs it</span></li>
                    </ol>
                  )}
                </li>
              ))}
            </ol>
            <p className="home-steps-note">
              Stills from the Learn the Studio series, filmed on the Hardware preview. The published v{version} app compiles and flashes from its Matrix Output node.
            </p>
          </div>
        </section>

        {patterns.length > 0 && (
          <section className="home-patterns" aria-labelledby="home-patterns-title">
            <div className="shell">
              <div className="home-section-head">
                <h2 id="home-patterns-title" className="home-section-title">Patterns from the library.</h2>
                <p>Each one is a real Design Studio file running live in your browser. Open one to step through it, then download it and keep building.</p>
              </div>
              <div className="pattern-grid home-pattern-grid">
                {patterns.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} compact />)}
              </div>
              <div className="home-links">
                <Link className="text-link" href="/patterns">Browse the whole library <ArrowRight size={15} aria-hidden="true" /></Link>
                <Link className="text-link" href="/upload">Share one of yours <ArrowRight size={15} aria-hidden="true" /></Link>
              </div>
            </div>
          </section>
        )}

        <section className="home-download" id="download" aria-labelledby="home-download-title">
          <div className="shell home-download-grid">
            <div>
              <h2 id="home-download-title" className="home-section-title">Download v{version}.</h2>
              <p className="home-download-lede">Released {appRelease.releasedOn}. Portable builds: unpack and run, no installer.</p>
              {detectedTarget && (
                <a className="button button-primary" href={detectedTarget.url}>
                  <Download size={18} aria-hidden="true" /> v{version} for {detectedTarget.label}
                </a>
              )}
              <ul className="home-platforms" aria-label="All downloads">
                {downloadTargets.map((target) => (
                  <li key={target.id}>
                    <a href={target.url}><strong>{target.label}</strong> <span>{target.detail}</span></a>
                    {"secondary" in target && <a className="home-platform-alt" href={target.secondary.url}>{target.secondary.label}</a>}
                  </li>
                ))}
              </ul>
              <p className="home-download-note">
                These beta builds are not yet code-signed or notarized, so your system may warn before opening them. Only run builds from the <a href={appRelease.releasesUrl} target="_blank" rel="noreferrer">official release page</a>.
              </p>
            </div>
            <div className="home-release">
              <h3>New in v{version}</h3>
              <ul>
                {appRelease.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
              </ul>
              <span className="home-rule" aria-hidden="true" />
              <a className="text-link" href={appRelease.releaseUrl} target="_blank" rel="noreferrer">Read the release notes <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section className="home-hardware" id="hardware" aria-labelledby="home-hardware-title">
          <div className="shell home-hardware-grid">
            <figure className="home-hardware-still">
              <Image
                src="/home/hardware-board.webp"
                alt="Close-up of an ESP32 board in warm light: gold-plated pin pads numbered 0 and 35 to 38 along its edge"
                width={1600}
                height={900}
                loading="lazy"
              />
            </figure>
            <div className="home-hardware-copy">
              <h2 id="home-hardware-title" className="home-section-title">Boards, pins and wiring plans, in the works.</h2>
              <p className="home-preview-tag">Hardware preview · built from source</p>
              <p>
                The Hardware branch adds four workspaces to one project: pick the exact board and parts, wire the graph, compile and upload over USB, and print a build diagram with pin maps and power.
              </p>
              <p>
                It is a development build, separate from v{version}. Setup needs Node.js, Python and build tools, and uploading needs a small local helper. A passing preview or compile does not establish hardware support: see the <a href={hardwareDevelopment.supportUrl} target="_blank" rel="noreferrer">support matrix</a> for validated combinations.
              </p>
              <div className="home-links">
                <a className="text-link" href={hardwareDevelopment.setupUrl} target="_blank" rel="noreferrer">Set up the Hardware branch <ArrowRight size={15} aria-hidden="true" /></a>
                <a className="text-link" href={hardwareDevelopment.firstProjectUrl} target="_blank" rel="noreferrer">Build your first project <ArrowRight size={15} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
        </section>

        <section className="home-close" aria-labelledby="home-close-title">
          <div className="shell">
            <h2 id="home-close-title">Send it to real lights.</h2>
            <div className="home-actions">
              <a className="button button-primary" href={detectedTarget?.url ?? "#download"}>
                <Download size={18} aria-hidden="true" /> Download v{version}{detectedTarget ? ` for ${detectedTarget.label}` : ""}
              </a>
              <Link className="button button-quiet" href="/patterns">Browse patterns <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
