import { Radio } from "lucide-react";
import type { Pattern } from "@/lib/patterns";

/** Shown on a gallery card with neither a captured clip nor a pattern file to
 *  evaluate live (PatternPreviewCard) — a pattern whose stored file could not
 *  be signed. */
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
