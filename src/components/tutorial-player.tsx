"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { IconPlay } from "@/components/player-icons";
import { chapterSeconds, type Tutorial } from "@/lib/tutorials";

/** Window event a player sends when it starts, naming its video id. */
const PLAY_EVENT = "tutorial-play";

/**
 * One episode's video, with its chapters underneath.
 *
 * The page shows every episode, so it does not load a YouTube player for each
 * up front: each starts as the episode's thumbnail and a play button, and only a
 * click swaps in the embed (from youtube-nocookie.com, so no YouTube cookies
 * are set until the visitor chooses to watch). A chapter click loads or
 * reloads the embed at that chapter's offset. Starting one episode returns any
 * other playing episode to its thumbnail, so two videos never play at once.
 */
export function TutorialPlayer({ tutorial }: { tutorial: Tutorial }) {
  const { number, videoId, title, chapters } = tutorial;
  const name = `Learn the Studio ${number} · ${title}`;
  // Seconds to start from once the visitor has asked to watch; null until then.
  const [start, setStart] = useState<number | null>(null);

  useEffect(() => {
    const onPlay = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== videoId) setStart(null);
    };
    window.addEventListener(PLAY_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_EVENT, onPlay);
  }, [videoId]);

  const play = (seconds: number) => {
    setStart(seconds);
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: videoId }));
  };

  return (
    <div className="tutorial-player">
      <div className="tutorial-screen">
        {start === null ? (
          <button className="tutorial-facade" type="button" onClick={() => play(0)}>
            <Image
              src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
              alt=""
              width={1280}
              height={720}
              loading="lazy"
            />
            <span className="tutorial-play" aria-hidden="true"><IconPlay size={30} /></span>
            <span className="sr-only">Play {name}</span>
          </button>
        ) : (
          <iframe
            key={start}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&start=${start}`}
            title={name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      <ol className="tutorial-chapters" aria-label={`Chapters in episode ${number}`}>
        {chapters.map((chapter) => (
          <li key={chapter.at}>
            <button type="button" onClick={() => play(chapterSeconds(chapter.at))}>
              <span className="sr-only">Play from </span>
              <span className="tutorial-chapter-time">{chapter.at}</span> {chapter.label}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
