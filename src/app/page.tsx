import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Download,
  FileJson2,
  GitFork,
  Monitor,
  ScanLine,
  Terminal,
  UploadCloud,
  Workflow,
} from "lucide-react";
import { PatternCard } from "@/components/pattern-card";
import { PatternPreview } from "@/components/pattern-preview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedPatterns } from "@/lib/published-patterns";
import { appRelease, downloadTargets } from "@/lib/app-release";

const downloadIcons = { windows: Monitor, macos: Apple, linux: Terminal } as const;

export const dynamic = "force-dynamic";

export default async function Home() {
  const patterns = await getPublishedPatterns(4);
  const featured = patterns[0];

  return (
    <>
      <SiteHeader />
      <main className="studio-home">
        <section className="studio-hero shell">
          <div className="studio-hero-copy">
            <p className="studio-kicker"><span /> Free · node-based LED design</p>
            <h1>Design LED shows.<br /><em>Flash real hardware.</em></h1>
            <p>
              Design Studio for FastLED is a live, node-based creative environment for LED strips, matrices, and panels. Wire up patterns, palettes, audio, and effects, watch the result move instantly, then generate the same design as FastLED C++ and flash it to your controller.
            </p>
            <div className="hero-actions">
              <a className="button button-gradient" href="#download">Download the app <Download size={17} /></a>
              <Link className="button button-outline" href="/patterns">Browse community patterns</Link>
            </div>
            <div className="hero-trust">
              <span><CheckCircle2 size={13} /> Public beta</span>
              <span><Boxes size={13} /> 151 modules</span>
              <span><Monitor size={13} /> Windows · macOS · Linux</span>
            </div>
          </div>

          <div className="studio-hero-preview">
            <div className="preview-node-tab"><i /> OUTPUT BAY <strong>{featured.title}</strong></div>
            <PatternPreview pattern={featured} variant="hero" controls />
            <div className="preview-cable cable-cyan" aria-hidden="true" />
            <div className="preview-cable cable-magenta" aria-hidden="true" />
            <div className="hero-project-chip">
              <span>Featured project</span>
              <strong>{featured.title}</strong>
              <small>by {featured.author}</small>
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
            </div>
            <div>
              <p>Pick an archive for your operating system, extract it, and launch Design Studio for FastLED—no install, no Node.js or Python required.</p>
              <a className="studio-text-link" href={appRelease.releasesUrl} target="_blank" rel="noreferrer">All releases &amp; source <ArrowRight size={14} /></a>
            </div>
          </div>
          <div className="download-grid">
            {downloadTargets.map((target) => {
              const Icon = downloadIcons[target.id];
              return (
                <article className="download-card" key={target.id}>
                  <div className="download-card-icon"><Icon size={22} /></div>
                  <h3>{target.label}</h3>
                  <p>{target.detail}</p>
                  <a className="button button-outline" href={target.url}>
                    <Download size={15} /> Download v{appRelease.version}
                  </a>
                  {"secondary" in target && target.secondary && (
                    <a className="download-secondary" href={target.secondary.url}>{target.secondary.label}</a>
                  )}
                </article>
              );
            })}
          </div>
          <p className="download-note">
            Public beta archives are not yet code-signed or notarized—only run builds downloaded from the official release page above. Prefer to build it yourself? <a href={appRelease.sourceUrl} target="_blank" rel="noreferrer">Run from source on GitHub</a>.
          </p>
        </section>

        <section className="studio-section shell">
          <div className="studio-section-heading">
            <div>
              <p className="studio-kicker"><span /> Pattern library</p>
              <h2>Fresh from the<br /><em>community graph.</em></h2>
            </div>
            <div>
              <p>These are moving project previews—not screenshots. Open one to inspect its details and download the approved source.</p>
              <Link className="studio-text-link" href="/patterns">View the library <ArrowRight size={14} /></Link>
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

        <section className="graph-section">
          <div className="shell">
            <div className="studio-section-heading graph-heading">
              <div>
                <p className="studio-kicker"><span /> The important difference</p>
                <h2>The project file<br /><em>drives the preview.</em></h2>
              </div>
              <p>The renderer reads the uploaded Design Studio graph—effect, speed, shape, copies, rotation and connections—then turns that data into a live matrix output.</p>
            </div>
            <div className="preview-pipeline">
              <article className="pipeline-node node-lime">
                <div><FileJson2 size={19} /><span>IN</span></div>
                <small>01 · SOURCE</small>
                <h3>Studio project</h3>
                <p>The approved JSON stays the source of truth.</p>
              </article>
              <div className="pipeline-link link-green"><i /><i /><i /></div>
              <article className="pipeline-node node-blue">
                <div><Workflow size={19} /><span>CMP</span></div>
                <small>02 · GRAPH</small>
                <h3>Patch reader</h3>
                <p>Nodes and settings shape the browser composition.</p>
              </article>
              <div className="pipeline-link link-blue"><i /><i /><i /></div>
              <article className="pipeline-node node-magenta">
                <div><ScanLine size={19} /><span>OUT</span></div>
                <small>03 · OUTPUT</small>
                <h3>Live matrix</h3>
                <p>A moving preview before anyone downloads.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="studio-cta shell">
          <div>
            <p className="studio-kicker"><span /> Send a new signal</p>
            <h2>Built something<br /><em>worth sharing?</em></h2>
          </div>
          <div>
            <GitFork size={28} />
            <p>Publish the project, show it moving, and give the next maker a better starting point.</p>
            <Link className="button button-gradient" href="/upload">Upload to the review bench <ArrowRight size={17} /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
