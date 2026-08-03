import Link from "next/link";
import { ArrowRight, CheckCircle2, FileJson2, GitFork, Radio, ScanLine, UploadCloud, Workflow } from "lucide-react";
import { PatternCard } from "@/components/pattern-card";
import { PatternPreview } from "@/components/pattern-preview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedPatterns } from "@/lib/published-patterns";

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
            <p className="studio-kicker"><span /> Community patch bay</p>
            <h1>Create. Share.<br /><em>Illuminate.</em></h1>
            <p>
              The home for projects made in Design Studio for FastLED—rendered live in your browser, reviewed, and ready to learn from.
            </p>
            <div className="hero-actions">
              <Link className="button button-gradient" href="/patterns">Browse patterns <ArrowRight size={17} /></Link>
              <Link className="button button-outline" href="/upload"><UploadCloud size={16} /> Upload project</Link>
            </div>
            <div className="hero-trust">
              <span><CheckCircle2 size={13} /> Reviewed before publishing</span>
              <span><Radio size={13} /> Animated in the browser</span>
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
