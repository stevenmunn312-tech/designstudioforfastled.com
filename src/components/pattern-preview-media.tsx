"use client";

import { Radio } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Pattern } from "@/lib/patterns";

type PreviewVariant = "card" | "hero" | "detail";

/** Cheap looping-clip preview for contexts with many patterns on screen at
 *  once (the gallery grid) — a captured video instead of a live evaluator
 *  per card. See PatternPreview for the live-evaluated version used where
 *  only one pattern renders at a time (hero, detail page). */
export function PatternPreviewMedia({
  pattern,
  variant = "card",
}: {
  pattern: Pattern;
  variant?: PreviewVariant;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // A gallery is twenty-odd of these, and `autoplay loop` keeps every decoder
  // running whether or not its card is anywhere near the viewport. Pause the
  // ones that are scrolled away, the same way LivePatternCanvas pauses its
  // render loop — and honour reduced-motion, which an autoplaying loop
  // otherwise ignores entirely.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      // Resume a little before it scrolls into view so there is no visible
      // pause on a stale frame.
      { rootMargin: "150px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`live-preview live-preview-${variant}`}>
      <div className="live-preview-bar">
        <span><i /> Live pattern preview</span>
        <strong>Looping capture</strong>
      </div>
      <div className="live-preview-screen">
        <video
          ref={videoRef}
          src={pattern.previewMediaUrl}
          autoPlay
          loop
          muted
          playsInline
          aria-label={`Animated preview of ${pattern.title}`}
        />
        <div className="preview-scanline" aria-hidden="true" />
      </div>
      <div className="live-preview-readout">
        <span><Radio size={11} /> Captured clip</span>
      </div>
    </div>
  );
}
