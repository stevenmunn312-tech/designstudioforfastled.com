import { Radio } from "lucide-react";
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
  return (
    <div className={`live-preview live-preview-${variant}`}>
      <div className="live-preview-bar">
        <span><i /> Live pattern preview</span>
        <strong>Looping capture</strong>
      </div>
      <div className="live-preview-screen">
        <video
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
        <span>{pattern.ledCount.toLocaleString()} LEDs</span>
        <span><Radio size={11} /> Captured clip</span>
      </div>
    </div>
  );
}
