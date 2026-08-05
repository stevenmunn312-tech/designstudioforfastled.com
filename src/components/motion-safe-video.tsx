"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

// An autoplaying looping clip that degrades to its poster frame when the
// visitor has asked for reduced motion.
//
// CSS alone cannot do this: `display: none` on a <video autoplay> hides it but
// most browsers still fetch and decode it, so the visitor pays for a clip they
// asked not to see. Deciding in JS is the only way to not emit the <video> at
// all.
//
// The server snapshot is `true` (reduced), so SSR and the no-JS case both
// render the poster image and only upgrade to video once the client confirms
// motion is welcome. Erring the other way would autoplay for one paint before
// hydration corrected it, which is the exact thing the preference forbids.

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => true;

export interface MotionSafeVideoProps {
  webm: string;
  mp4: string;
  poster: string;
  alt: string;
  width: number;
  height: number;
}

export function MotionSafeVideo({ webm, mp4, poster, alt, width, height }: MotionSafeVideoProps) {
  const prefersReducedMotion = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (prefersReducedMotion) {
    return <Image src={poster} alt={alt} width={width} height={height} loading="lazy" />;
  }

  return (
    <video
      // `muted` is not optional — every browser blocks autoplay without it.
      // The clips carry no audio track anyway.
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster={poster}
      width={width}
      height={height}
      aria-label={alt}
    >
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
