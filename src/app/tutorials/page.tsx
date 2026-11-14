import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TutorialPlayer } from "@/components/tutorial-player";
import { tutorialChannel, tutorials } from "@/lib/tutorials";

export const metadata: Metadata = {
  title: "Learn the Studio",
  description: "Learn the Studio: ten short video tutorials that take you from your first node graph to a wired, powered LED build with Design Studio for FastLED.",
};

export default function TutorialsPage() {
  return (
    <>
      <SiteHeader />
      <main className="shell tutorials-page">
        <div className="page-masthead">
          <h1>Learn the Studio. <em>Ten short episodes, graph to bench.</em></h1>
          <div className="tutorials-lede">
            <p>
              Start with a first pattern, learn to read the graph, shape colour, motion and sound, then wire a real board and power it safely. Each episode runs about two to three minutes.
            </p>
            <a className="text-link" href={tutorialChannel.url} target="_blank" rel="noreferrer">
              Watch on YouTube <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>

        <ol className="tutorial-list">
          {tutorials.map((tutorial) => (
            <li className="tutorial" id={`episode-${tutorial.number}`} key={tutorial.videoId}>
              <div className="tutorial-copy">
                <span className="tutorial-number" aria-hidden="true">{tutorial.number}</span>
                <h2><span className="sr-only">Episode {tutorial.number}: </span>{tutorial.title}</h2>
                <p className="tutorial-tagline">{tutorial.tagline}</p>
                <p>{tutorial.summary}</p>
                <h3>You&apos;ll learn</h3>
                <ul>
                  {tutorial.learn.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <TutorialPlayer tutorial={tutorial} />
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
