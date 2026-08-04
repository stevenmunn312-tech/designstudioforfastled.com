import { Radio } from "lucide-react";
import type { Pattern } from "@/lib/patterns";

/** Shown on a gallery card whose captured clip is missing.
 *
 *  The alternative — and what this replaces — was falling back to a live
 *  evaluator per card, which contradicts PatternPreviewMedia's own note that
 *  live evaluation is for contexts rendering one pattern at a time. Each live
 *  preview holds a WebGL context, and a page only gets ~16 before the browser
 *  starts force-losing the oldest, so a grid of clip-less cards would blank
 *  itself out (and, before the shader landed, pin the main thread). A clip is
 *  one moderator click away in /review's backfill section, so this state is
 *  meant to be temporary and visible rather than papered over. */
export function PatternPreviewPlaceholder({ pattern }: { pattern: Pattern }) {
  return (
    <div className="live-preview live-preview-card">
      <div className="live-preview-bar">
        <span><i className="is-idle" /> Live pattern preview</span>
        <strong>No capture yet</strong>
      </div>
      <div className="live-preview-screen">
        <div className="preview-placeholder" aria-label={`${pattern.title} has no preview clip yet`} role="img">
          <span />
        </div>
        <div className="preview-scanline" aria-hidden="true" />
      </div>
      <div className="live-preview-readout">
        <span><Radio size={11} /> Awaiting capture</span>
      </div>
    </div>
  );
}
