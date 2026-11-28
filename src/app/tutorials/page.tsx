import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TutorialPlayer } from "@/components/tutorial-player";
import { hardwareBuilds, quickStart, tutorialChannel, tutorialName, tutorials, type TutorialVideo } from "@/lib/tutorials";

export const metadata: Metadata = {
  title: "Learn the Studio",
  description: "A one-minute quick start, then Learn the Studio: twelve short video tutorials that take you from your first node graph to a wired, powered LED build on stage with Design Studio for FastLED, and quick builds from the Hardware shelf.",
};

/** A video's notes: its slate mark, title, tagline, summary and learn list. */
function TutorialCopy({ video, mark, heading, listTitle }: { video: TutorialVideo; mark: ReactNode; heading: ReactNode; listTitle: string }) {
  return (
    <div className="tutorial-copy">
      {mark}
      <h2>{heading}</h2>
      <p className="tutorial-tagline">{video.tagline}</p>
      <p>{video.summary}</p>
      <h3>{listTitle}</h3>
      <ul>
        {video.learn.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

export default function TutorialsPage() {
  return (
    <>
      <SiteHeader />
      <main className="shell tutorials-page">
        <div className="page-masthead">
          <h1>Learn the Studio. <em>Twelve short episodes, graph to stage.</em></h1>
          <div className="tutorials-lede">
            <p>
              Start with a first pattern, learn to read the graph, shape colour, motion and sound, wire a real board and power it safely, then upload, save, share and perform. Each episode runs about two to three minutes.
            </p>
            <a className="text-link" href={tutorialChannel.url} target="_blank" rel="noreferrer">
              Watch on YouTube <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>

        <section className="tutorial" id="quick-start" aria-labelledby="quick-start-title">
          <TutorialCopy
            video={quickStart}
            mark={<span className="tutorial-eyebrow">Start here · under a minute</span>}
            heading={<span id="quick-start-title">{quickStart.title}</span>}
            listTitle="In this video"
          />
          <TutorialPlayer video={quickStart} name={`${quickStart.title} · Design Studio for FastLED`} />
        </section>

        <ol className="tutorial-list" aria-label="Learn the Studio episodes">
          {tutorials.map((tutorial) => (
            <li className="tutorial" id={`episode-${tutorial.number}`} key={tutorial.videoId}>
              <TutorialCopy
                video={tutorial}
                mark={<span className="tutorial-number" aria-hidden="true">{tutorial.number}</span>}
                heading={<><span className="sr-only">Episode {tutorial.number}: </span>{tutorial.title}</>}
                listTitle="You'll learn"
              />
              <TutorialPlayer video={tutorial} name={tutorialName(tutorial)} />
            </li>
          ))}
        </ol>

        <section className="tutorial" id="hardware-shelf" aria-labelledby="hardware-shelf-title">
          <TutorialCopy
            video={hardwareBuilds}
            mark={<span className="tutorial-eyebrow">Going further · about seven minutes</span>}
            heading={<span id="hardware-shelf-title">{hardwareBuilds.title}</span>}
            listTitle="In this video"
          />
          <TutorialPlayer video={hardwareBuilds} name={`${hardwareBuilds.title} · Design Studio for FastLED`} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
