import Link from "next/link";
import { ArrowRight, CircuitBoard, Code2, Radio, UploadCloud } from "lucide-react";
import { LedField } from "@/components/led-field";
import { PatternCard } from "@/components/pattern-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { starterPatterns } from "@/lib/patterns";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Built for the FastLED community</p>
            <h1>Share the light.<br /><em>Ship better patterns.</em></h1>
            <p className="hero-intro">
              A home for LED makers to publish, remix, and learn from patterns that already work in the real world.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/patterns">Explore patterns <ArrowRight size={17} /></Link>
              <Link className="button button-outline" href="/upload">Share yours</Link>
            </div>
            <div className="hero-proof">
              <div><strong>1,280+</strong><span>community patterns</span></div>
              <div><strong>42</strong><span>controllers tested</span></div>
              <div><strong>Open</strong><span>to every maker</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-halo" />
            <LedField />
            <div className="signal-tag signal-top"><Radio size={13} /> SIGNAL STABLE</div>
            <div className="signal-tag signal-bottom">FASTLED 3.10+</div>
          </div>
        </section>

        <div className="signal-tape" aria-hidden="true">
          <div>
            {Array.from({ length: 2 }, (_, group) => (
              <span key={group}>NOISE &amp; FIRE <i /> AUDIO REACTIVE <i /> MATRICES <i /> RGBW <i /> ART INSTALLATIONS <i /> HOME LIGHTING <i /></span>
            ))}
          </div>
        </div>

        <section className="section shell">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow"><span /> Fresh signals</p>
              <h2>Patterns worth<br />switching on.</h2>
            </div>
            <div>
              <p>Tested by their makers, tagged by hardware, and ready to become your next starting point.</p>
              <Link className="text-link" href="/patterns">Browse the full gallery <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="pattern-grid featured-grid">
            {starterPatterns.slice(0, 3).map((pattern) => <PatternCard key={pattern.id} pattern={pattern} compact />)}
          </div>
        </section>

        <section className="community-band">
          <div className="shell community-inner">
            <div className="community-title">
              <p className="eyebrow light"><span /> Made to be remixed</p>
              <h2>From first pixel<br />to finished piece.</h2>
            </div>
            <div className="steps">
              <article>
                <div className="step-icon"><UploadCloud size={21} /></div>
                <h3>Publish the recipe</h3>
                <p>Share the pattern file, wiring notes, LED count, and controller in one useful package.</p>
              </article>
              <article>
                <div className="step-icon"><CircuitBoard size={21} /></div>
                <h3>Prove it on hardware</h3>
                <p>Help other makers choose patterns that fit the board and strip already on their bench.</p>
              </article>
              <article>
                <div className="step-icon"><Code2 size={21} /></div>
                <h3>Fork the good ideas</h3>
                <p>Credit the source, tune the palette, and publish a version that pushes the effect further.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="final-cta shell">
          <div className="cta-pixels" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} />)}</div>
          <p className="eyebrow"><span /> Your bench is calling</p>
          <h2>Built something<br /><em>brilliant?</em></h2>
          <p>Put it where the next curious maker can find it.</p>
          <Link className="button button-primary" href="/upload">Share a pattern <ArrowRight size={17} /></Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
